import { withOwnerContext } from "../../../db/client";
import { createModuleLogger } from "../../../logs";
import type { AiTransactionItem, AiChatExtractionResult } from "../../../adapters/ai/types";
import type { ChannelOwnerResolution } from "./owner-resolver";
import type { InboundMessageInput } from "../chat.schema";

const chatLogger = createModuleLogger("chat-bookkeeping-persister");

export class BookkeepingPersister {
  /**
   * Mengumpulkan dan membukukan transaksi keuangan jika pesan diproses oleh persona 'assistant'
   * dan memiliki skema transaksi yang valid.
   * Multi-tenant RLS: Eksekusi wajib dibungkus withOwnerContext(owner_id, user_id).
   */
  static async persistTransactions(
    owner: ChannelOwnerResolution,
    payload: InboundMessageInput,
    persona: "assistant" | "admin",
    aiResult: AiChatExtractionResult
  ): Promise<number> {
    const transactionsToRecord: AiTransactionItem[] = [];

    if (persona === "assistant" && aiResult.schema_valid) {
      if (Array.isArray(aiResult.transactions) && aiResult.transactions.length > 0) {
        transactionsToRecord.push(...aiResult.transactions);
      } else if (aiResult.transaction) {
        transactionsToRecord.push(aiResult.transaction);
      }
    }

    if (transactionsToRecord.length === 0) {
      return 0;
    }

    await withOwnerContext(owner.owner_id, owner.user_id, async (tx) => {
      const cashAccounts = await tx<{ id: string }[]>`
        SELECT id FROM accounts
        WHERE owner_id = ${owner.owner_id} AND is_cash = true AND active = true
        ORDER BY code ASC LIMIT 1;
      `;

      const cashAcc = cashAccounts[0];
      if (!cashAcc) {
        chatLogger.warn(`Akun kas tidak ditemukan untuk owner ${owner.owner_id}`);
        return;
      }

      const txDate = new Date().toISOString().slice(0, 10);

      for (const item of transactionsToRecord) {
        const targetType = item.type === "expense" ? "expense" : "revenue";
        const targetAccounts = await tx<{ id: string }[]>`
          SELECT id FROM accounts
          WHERE owner_id = ${owner.owner_id} AND type = ${targetType} AND active = true
          ORDER BY code ASC LIMIT 1;
        `;

        const targetAcc = targetAccounts[0];
        if (!targetAcc) continue;

        let lines: Array<{
          account_id: string;
          debit: number;
          credit: number;
          memo: string;
        }> = [];

        if (item.type === "expense") {
          lines = [
            {
              account_id: targetAcc.id,
              debit: item.amount,
              credit: 0,
              memo: item.notes,
            },
            {
              account_id: cashAcc.id,
              debit: 0,
              credit: item.amount,
              memo: `Kas keluar: ${item.notes}`,
            },
          ];
        } else {
          lines = [
            {
              account_id: cashAcc.id,
              debit: item.amount,
              credit: 0,
              memo: `Kas masuk: ${item.notes}`,
            },
            {
              account_id: targetAcc.id,
              debit: 0,
              credit: item.amount,
              memo: item.notes,
            },
          ];
        }

        const description = item.notes || `${item.type}: ${item.category}`;
        const [newJournal] = await tx<{ id: string }[]>`
          INSERT INTO jurnal_umum (
            owner_id, tx_date, description, source, source_ref, kind, created_by
          )
          VALUES (
            ${owner.owner_id},
            ${txDate},
            ${description},
            'text',
            ${payload.external_message_id},
            'normal',
            ${owner.user_id}
          )
          RETURNING id;
        `;

        for (const line of lines) {
          await tx`
            INSERT INTO jurnal_baris (
              journal_id, owner_id, account_id, debit, credit, memo
            )
            VALUES (
              ${newJournal.id},
              ${owner.owner_id},
              ${line.account_id},
              ${line.debit},
              ${line.credit},
              ${line.memo}
            );
          `;
        }

        chatLogger.info(`Transaksi ${item.type} sebesar Rp${item.amount} berhasil dibukukan`, {
          ownerId: owner.owner_id,
          channel: payload.channel,
          amount: item.amount,
          type: item.type,
        });
      }
    });

    return transactionsToRecord.length;
  }
}
