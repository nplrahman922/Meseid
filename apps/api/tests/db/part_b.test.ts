import { describe, it, expect, beforeAll } from "bun:test";
import {
  adminSql,
  appSql,
  withContext,
  withOwnerContext,
  withAdminContext,
} from "../../src/db/client";
import { runSeed } from "../../src/db/seed";

interface UserRow {
  id: string;
  email: string;
  role: string;
}

interface OwnerRow {
  id: string;
  user_id: string;
  business_name: string;
}

interface AccountRow {
  id: string;
  code: string;
  name: string;
  type: string;
  normal_balance: string;
  is_cash: boolean;
}

describe("Part B: Finance Core (Jurnal Umum, Buku Besar, Neraca Saldo, Buku Kas, Buku Pembantu)", () => {
  let userA: UserRow;
  let ownerA: OwnerRow;
  let userB: UserRow;
  let ownerB: OwnerRow;
  let adminUser: UserRow;

  let accKasA: AccountRow;
  let accPiutangA: AccountRow;
  let accPersediaanA: AccountRow;
  let accHppA: AccountRow;
  let accModalA: AccountRow;
  let accPendapatanA: AccountRow;
  let accListrikA: AccountRow;

  beforeAll(async () => {
    // 1. Reseed database
    await runSeed();

    // Clean up test financial data for idempotency across test runs using PDP purge flag
    await adminSql.begin(async (tx) => {
      await tx`SET LOCAL app.allow_pdp_purge = 'on';`;
      await tx`DELETE FROM buku_pembantu;`;
      await tx`DELETE FROM pending_actions;`;
      await tx`DELETE FROM jurnal_baris;`;
      await tx`DELETE FROM jurnal_umum;`;
      await tx`DELETE FROM parties;`;
    });

    // 2. Load owners
    const [u1] = await adminSql<UserRow[]>`
      SELECT id, email, role FROM users WHERE email = 'budi@warkopnusantara.id';
    `;
    const [o1] = await adminSql<OwnerRow[]>`
      SELECT id, user_id, business_name FROM owners WHERE user_id = ${u1.id};
    `;

    const [u2] = await adminSql<UserRow[]>`
      SELECT id, email, role FROM users WHERE email = 'siti@tokoberkahjaya.id';
    `;
    const [o2] = await adminSql<OwnerRow[]>`
      SELECT id, user_id, business_name FROM owners WHERE user_id = ${u2.id};
    `;

    const [adm] = await adminSql<UserRow[]>`
      SELECT id, email, role FROM users WHERE email = 'admin@meseid.id';
    `;

    userA = u1;
    ownerA = o1;
    userB = u2;
    ownerB = o2;
    adminUser = adm;

    // 3. Load Owner A accounts (seeded by default trigger)
    const accountsA = await adminSql<AccountRow[]>`
      SELECT id, code, name, type, normal_balance, is_cash
      FROM accounts
      WHERE owner_id = ${ownerA.id};
    `;

    accKasA = accountsA.find((a) => a.code === "1101")!;
    accPiutangA = accountsA.find((a) => a.code === "1103")!;
    accPersediaanA = accountsA.find((a) => a.code === "1104")!;
    accModalA = accountsA.find((a) => a.code === "3101")!;
    accPendapatanA = accountsA.find((a) => a.code === "4101")!;
    accHppA = accountsA.find((a) => a.code === "5101")!;
    accListrikA = accountsA.find((a) => a.code === "6103")!;

    expect(accKasA).toBeDefined();
    expect(accModalA).toBeDefined();
    expect(accPendapatanA).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // TC-10: Unbalanced Journal Rejected (Constraint Trigger)
  // --------------------------------------------------------------------------
  describe("TC-10: Journal balance constraints", () => {
    it("rejects an unbalanced journal where debit != credit", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          const [j] = await tx<{ id: string }[]>`
            INSERT INTO jurnal_umum (owner_id, description, source)
            VALUES (${ownerA.id}, 'Unbalanced Test', 'manual')
            RETURNING id;
          `;

          await tx`
            INSERT INTO jurnal_baris (journal_id, owner_id, account_id, debit, credit)
            VALUES 
              (${j.id}, ${ownerA.id}, ${accKasA.id}, 100000.00, 0.00),
              (${j.id}, ${ownerA.id}, ${accPendapatanA.id}, 0.00, 50000.00);
          `;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/is unbalanced|debit.*!=.*credit/i);
      }
      expect(threw).toBe(true);
    });

    it("rejects a journal with less than 2 lines at commit time", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          const [j] = await tx<{ id: string }[]>`
            INSERT INTO jurnal_umum (owner_id, description, source)
            VALUES (${ownerA.id}, 'Single Line Test', 'manual')
            RETURNING id;
          `;

          await tx`
            INSERT INTO jurnal_baris (journal_id, owner_id, account_id, debit, credit)
            VALUES (${j.id}, ${ownerA.id}, ${accKasA.id}, 100000.00, 0.00);
          `;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/must have at least 2 lines/i);
      }
      expect(threw).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TC-11: Fixed 5 Transactions Verification (Single Source of Truth)
  // --------------------------------------------------------------------------
  describe("TC-11: Ledger balance after 5 fixed transactions equals hand-computed value", () => {
    let customerPartyId: string;
    let tx5JournalId: string;

    beforeAll(async () => {
      // 1. Create a customer party for subledger tracking
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const [party] = await tx<{ id: string }[]>`
          INSERT INTO parties (owner_id, type, name, phone)
          VALUES (${ownerA.id}, 'customer', 'PT Langganan Sejati', '628111222333')
          RETURNING id;
        `;
        customerPartyId = party.id;
      });

      // 2. Post Transaction 1: Setoran Modal Awal Rp 5.000.000
      // Debit: Kas (1101) 5.000.000, Credit: Modal Pemilik (3101) 5.000.000
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        await tx`
          SELECT fn_post_journal(
            ${ownerA.id},
            ${appSql.json({
              description: "Setoran Modal Awal Pemilik",
              source: "manual",
            })},
            ${appSql.json([
              { account_id: accKasA.id, debit: 5000000, credit: 0, memo: "Kas masuk modal" },
              { account_id: accModalA.id, debit: 0, credit: 5000000, memo: "Modal disetor" },
            ])}
          );
        `;
      });

      // 3. Post Transaction 2: Beli Bahan Baku Tunai Rp 1.500.000
      // Debit: HPP / Bahan Baku (5101) 1.500.000, Credit: Kas (1101) 1.500.000
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        await tx`
          SELECT fn_post_journal(
            ${ownerA.id},
            ${appSql.json({
              description: "Pembelian Bahan Baku Kopi Robusta",
              source: "ocr",
            })},
            ${appSql.json([
              { account_id: accHppA.id, debit: 1500000, credit: 0, memo: "Beli biji kopi" },
              { account_id: accKasA.id, debit: 0, credit: 1500000, memo: "Bayar tunai" },
            ])}
          );
        `;
      });

      // 4. Post Transaction 3: Penjualan Tunai Rp 2.500.000
      // Debit: Kas (1101) 2.500.000, Credit: Pendapatan Usaha (4101) 2.500.000
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        await tx`
          SELECT fn_post_journal(
            ${ownerA.id},
            ${appSql.json({
              description: "Penjualan Kopi dan Makanan Tunai",
              source: "text",
            })},
            ${appSql.json([
              { account_id: accKasA.id, debit: 2500000, credit: 0, memo: "Penerimaan kas penjualan" },
              { account_id: accPendapatanA.id, debit: 0, credit: 2500000, memo: "Penjualan harian" },
            ])}
          );
        `;
      });

      // 5. Post Transaction 4: Penjualan Kredit Rp 1.000.000 (Buku Pembantu Piutang)
      // Debit: Piutang Usaha (1103) 1.000.000, Credit: Pendapatan Usaha (4101) 1.000.000
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        await tx`
          SELECT fn_post_journal(
            ${ownerA.id},
            ${appSql.json({
              description: "Pesanan Katering Kantor Tempo 14 Hari",
              source: "manual",
            })},
            ${appSql.json([
              {
                account_id: accPiutangA.id,
                debit: 1000000,
                credit: 0,
                memo: "Piutang katering",
                party_id: customerPartyId,
                due_date: "2026-11-01",
              },
              { account_id: accPendapatanA.id, debit: 0, credit: 1000000, memo: "Pendapatan katering" },
            ])}
          );
        `;
      });

      // 6. Post Transaction 5: Bayar Beban Listrik Rp 300.000
      // Debit: Beban Listrik (6103) 300.000, Credit: Kas (1101) 300.000
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const [res] = await tx<{ fn_post_journal: string }[]>`
          SELECT fn_post_journal(
            ${ownerA.id},
            ${appSql.json({
              description: "Pembayaran Tagihan Listrik PLN Bulan Ini",
              source: "manual",
            })},
            ${appSql.json([
              { account_id: accListrikA.id, debit: 300000, credit: 0, memo: "PLN pascabayar" },
              { account_id: accKasA.id, debit: 0, credit: 300000, memo: "Kas keluar listrik" },
            ])}
          );
        `;
        tx5JournalId = res.fn_post_journal;
      });
    });

    it("neraca_saldo balances match exact hand-computed values", async () => {
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const rows = await tx<{
          account_code: string;
          total_debit: string;
          total_credit: string;
          ending_balance: string;
        }[]>`
          SELECT account_code, total_debit, total_credit, ending_balance
          FROM neraca_saldo
          WHERE ending_balance <> 0
          ORDER BY account_code;
        `;

        const balances = new Map(rows.map((r) => [r.account_code, parseFloat(r.ending_balance)]));

        // Kas (1101): 5.000.000 - 1.500.000 + 2.500.000 - 300.000 = 5.700.000
        expect(balances.get("1101")).toBe(5700000.0);

        // Piutang Usaha (1103): 1.000.000
        expect(balances.get("1103")).toBe(1000000.0);

        // Modal Pemilik (3101): 5.000.000 (credit normal balance)
        expect(balances.get("3101")).toBe(5000000.0);

        // Pendapatan Usaha (4101): 2.500.000 + 1.000.000 = 3.500.000 (credit normal balance)
        expect(balances.get("4101")).toBe(3500000.0);

        // HPP / Bahan Baku (5101): 1.500.000 (debit normal balance)
        expect(balances.get("5101")).toBe(1500000.0);

        // Beban Listrik (6103): 300.000 (debit normal balance)
        expect(balances.get("6103")).toBe(300000.0);
      });
    });

    it("buku_kas ending running balance strictly equals Rp 5.700.000", async () => {
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const rows = await tx<{ cash_balance: string }[]>`
          SELECT cash_balance
          FROM buku_kas
          WHERE cash_account_code = '1101'
          ORDER BY created_at ASC;
        `;

        expect(rows.length).toBe(4); // 4 transactions affected cash
        const lastRow = rows[rows.length - 1];
        expect(parseFloat(lastRow.cash_balance)).toBe(5700000.0);
      });
    });

    it("subledger_aging captures outstanding receivable of Rp 1.000.000", async () => {
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const [aging] = await tx<{
          party_name: string;
          outstanding_amount: string;
          status: string;
        }[]>`
          SELECT party_name, outstanding_amount, status
          FROM subledger_aging
          WHERE party_id = ${customerPartyId};
        `;

        expect(aging).toBeDefined();
        expect(aging.party_name).toBe("PT Langganan Sejati");
        expect(parseFloat(aging.outstanding_amount)).toBe(1000000.0);
        expect(aging.status).toBe("unpaid");
      });
    });

    it("fn_income_statement reflects net profit of Rp 1.700.000", async () => {
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        const rows = await tx<{ account_type: string; amount: string }[]>`
          SELECT account_type, amount
          FROM fn_income_statement(${ownerA.id}, '2020-01-01', '2030-12-31')
          WHERE amount > 0;
        `;

        const revenue = rows.filter((r) => r.account_type === "revenue").reduce((sum, r) => sum + parseFloat(r.amount), 0);
        const expenses = rows.filter((r) => r.account_type === "expense").reduce((sum, r) => sum + parseFloat(r.amount), 0);

        expect(revenue).toBe(3500000.0);
        expect(expenses).toBe(1800000.0); // 1.500.000 + 300.000
        expect(revenue - expenses).toBe(1700000.0);
      });
    });
  });

  // --------------------------------------------------------------------------
  // TC-13: Mid-Posting Failure Rolls Back Everything (Atomicity)
  // --------------------------------------------------------------------------
  it("TC-13: Mid-posting failure completely rolls back header, lines, and subledger", async () => {
    let initialJournalCount = 0;
    let initialLineCount = 0;

    await withOwnerContext(ownerA.id, userA.id, async (tx) => {
      const [jc] = await tx<{ count: string }[]>`SELECT count(*) FROM jurnal_umum;`;
      const [lc] = await tx<{ count: string }[]>`SELECT count(*) FROM jurnal_baris;`;
      initialJournalCount = parseInt(jc.count, 10);
      initialLineCount = parseInt(lc.count, 10);
    });

    let threw = false;
    try {
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        // Line 2 intentionally passes a non-existent account UUID to simulate failure mid-execution
        await tx`
          SELECT fn_post_journal(
            ${ownerA.id},
            ${appSql.json({
              description: "Will Fail Mid-way",
              source: "manual",
            })},
            ${appSql.json([
              { account_id: accKasA.id, debit: 100000, credit: 0 },
              { account_id: "00000000-0000-0000-0000-000000000000", debit: 0, credit: 100000 },
            ])}
          );
        `;
      });
    } catch (err: any) {
      threw = true;
      expect(err.message).toMatch(/does not belong to owner|does not exist/i);
    }
    expect(threw).toBe(true);

    // Verify atomic rollback
    await withOwnerContext(ownerA.id, userA.id, async (tx) => {
      const [jc] = await tx<{ count: string }[]>`SELECT count(*) FROM jurnal_umum;`;
      const [lc] = await tx<{ count: string }[]>`SELECT count(*) FROM jurnal_baris;`;
      expect(parseInt(jc.count, 10)).toBe(initialJournalCount);
      expect(parseInt(lc.count, 10)).toBe(initialLineCount);
    });
  });

  // --------------------------------------------------------------------------
  // Immutability of Posted Journals
  // --------------------------------------------------------------------------
  describe("Immutability: UPDATE/DELETE on posted journals rejected", () => {
    it("UPDATE on posted jurnal_umum is blocked by trigger", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          const [first] = await tx<{ id: string }[]>`SELECT id FROM jurnal_umum LIMIT 1;`;
          expect(first).toBeDefined();
          await tx`
            UPDATE jurnal_umum SET description = 'Tampered' WHERE id = ${first.id};
          `;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/(permission denied for table|immutable)/i);
      }
      expect(threw).toBe(true);
    });

    it("DELETE on posted jurnal_umum is blocked by trigger or revoked grant", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          const [first] = await tx<{ id: string }[]>`SELECT id FROM jurnal_umum LIMIT 1;`;
          expect(first).toBeDefined();
          await tx`
            DELETE FROM jurnal_umum WHERE id = ${first.id};
          `;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/(permission denied for table|immutable)/i);
      }
      expect(threw).toBe(true);
    });

    it("UPDATE or DELETE on posted jurnal_baris is blocked by trigger or revoked grant", async () => {
      let threw = false;
      try {
        await withOwnerContext(ownerA.id, userA.id, async (tx) => {
          const [first] = await tx<{ id: string }[]>`SELECT id FROM jurnal_baris LIMIT 1;`;
          expect(first).toBeDefined();
          await tx`
            DELETE FROM jurnal_baris WHERE id = ${first.id};
          `;
        });
      } catch (err: any) {
        threw = true;
        expect(err.message).toMatch(/(permission denied for table|immutable)/i);
      }
      expect(threw).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Reversal Journal (fn_reverse_journal)
  // --------------------------------------------------------------------------
  it("fn_reverse_journal creates inverted correcting entry and adjusts balances", async () => {
    let targetJournalId: string = "";
    let initialCash: number = 0;

    await withOwnerContext(ownerA.id, userA.id, async (tx) => {
      // Find the listrik transaction (Tx 5)
      const [j] = await tx<{ id: string }[]>`
        SELECT id FROM jurnal_umum 
        WHERE description LIKE '%Listrik%' AND owner_id = ${ownerA.id}
        LIMIT 1;
      `;
      expect(j).toBeDefined();
      targetJournalId = j.id;

      const [ns] = await tx<{ ending_balance: string }[]>`
        SELECT ending_balance FROM neraca_saldo WHERE account_code = '1101';
      `;
      initialCash = parseFloat(ns.ending_balance);
    });

    // Post reversal
    await withOwnerContext(ownerA.id, userA.id, async (tx) => {
      await tx`
        SELECT fn_reverse_journal(${ownerA.id}, ${targetJournalId}, 'Salah catat rekening listrik');
      `;
    });

    // Verify cash balance adjusted back by +300.000
    await withOwnerContext(ownerA.id, userA.id, async (tx) => {
      const [ns] = await tx<{ ending_balance: string }[]>`
        SELECT ending_balance FROM neraca_saldo WHERE account_code = '1101';
      `;
      expect(parseFloat(ns.ending_balance)).toBe(initialCash + 300000.0);
    });

    // Verify cannot reverse the same journal twice
    let doubleReverseThrew = false;
    try {
      await withOwnerContext(ownerA.id, userA.id, async (tx) => {
        await tx`
          SELECT fn_reverse_journal(${ownerA.id}, ${targetJournalId}, 'Re-reverse');
        `;
      });
    } catch (err: any) {
      doubleReverseThrew = true;
      expect(err.message).toMatch(/already been reversed/i);
    }
    expect(doubleReverseThrew).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Pending Actions Flow (fn_confirm_pending_action)
  // --------------------------------------------------------------------------
  it("fn_confirm_pending_action is idempotent and posts journal upon confirmation", async () => {
    let actionId: string = "";

    await withOwnerContext(ownerA.id, userA.id, async (tx) => {
      const [action] = await tx<{ id: string }[]>`
        INSERT INTO pending_actions (owner_id, type, payload)
        VALUES (
          ${ownerA.id},
          'post_journal',
          ${appSql.json({
            header: { description: "Beli Alat Tulis Kantor", source: "text" },
            lines: [
              { account_id: accHppA.id, debit: 50000, credit: 0, memo: "Kertas kasir" },
              { account_id: accKasA.id, debit: 0, credit: 50000, memo: "Kas" },
            ],
          })}
        )
        RETURNING id;
      `;
      actionId = action.id;

      // 1. First confirmation
      const [confirmRes] = await tx<{ fn_confirm_pending_action: { status: string; journal_id: string } }[]>`
        SELECT fn_confirm_pending_action(${actionId});
      `;
      expect(confirmRes.fn_confirm_pending_action.status).toBe("confirmed");
      expect(confirmRes.fn_confirm_pending_action.journal_id).toBeDefined();

      // 2. Second confirmation (Idempotent call)
      const [secondConfirm] = await tx<{ fn_confirm_pending_action: { status: string } }[]>`
        SELECT fn_confirm_pending_action(${actionId});
      `;
      expect(secondConfirm.fn_confirm_pending_action.status).toBe("already_confirmed");
    });
  });

  // --------------------------------------------------------------------------
  // Cross-Tenant Isolation in Views (Security Invoker Verification)
  // --------------------------------------------------------------------------
  describe("Security Invoker Views: Owner B cannot read Owner A financial records", () => {
    it("buku_besar: Owner B sees ZERO rows belonging to Owner A", async () => {
      await withOwnerContext(ownerB.id, userB.id, async (tx) => {
        const rows = await tx`SELECT * FROM buku_besar;`;
        for (const row of rows) {
          expect(row.owner_id).toBe(ownerB.id);
          expect(row.owner_id).not.toBe(ownerA.id);
        }
      });
    });

    it("neraca_saldo: Owner B sees ONLY Owner B accounts with 0 activity from Owner A", async () => {
      await withOwnerContext(ownerB.id, userB.id, async (tx) => {
        const rows = await tx`SELECT * FROM neraca_saldo;`;
        for (const row of rows) {
          expect(row.owner_id).toBe(ownerB.id);
        }
      });
    });

    it("buku_kas: Owner B sees ZERO cash transactions of Owner A", async () => {
      await withOwnerContext(ownerB.id, userB.id, async (tx) => {
        const rows = await tx`SELECT * FROM buku_kas;`;
        expect(rows.length).toBe(0);
      });
    });

    it("subledger_aging: Owner B sees ZERO receivables or payables of Owner A", async () => {
      await withOwnerContext(ownerB.id, userB.id, async (tx) => {
        const rows = await tx`SELECT * FROM subledger_aging;`;
        expect(rows.length).toBe(0);
      });
    });
  });

  // --------------------------------------------------------------------------
  // Admin Context Access Boundary
  // --------------------------------------------------------------------------
  describe("Admin context cannot access financial records", () => {
    it("Admin is denied access to jurnal_umum", async () => {
      let threwJurnal = false;
      try {
        await withAdminContext(adminUser.id, async (tx) => {
          await tx`SELECT * FROM jurnal_umum;`;
        });
      } catch (err: any) {
        threwJurnal = true;
        expect(err.message).toMatch(/permission denied for table jurnal_umum/i);
      }
      expect(threwJurnal).toBe(true);
    });

    it("Admin is denied access to buku_besar view", async () => {
      let threwLedger = false;
      try {
        await withAdminContext(adminUser.id, async (tx) => {
          await tx`SELECT * FROM buku_besar;`;
        });
      } catch (err: any) {
        threwLedger = true;
        expect(err.message).toMatch(/permission denied/i);
      }
      expect(threwLedger).toBe(true);
    });
  });
});
