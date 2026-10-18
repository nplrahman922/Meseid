# Meseid Database Architecture & Security Specification

This document details the multi-tenant PostgreSQL 16 database architecture for **Meseid**, including the connection role topology, session context mechanism, Row-Level Security (RLS) matrix, live table grants, triggers, functions, procedures, and views. Generated directly from the live database catalog.

---

## 1. Role Topology & Principle of Least Privilege

Meseid enforces zero-trust tenant isolation directly in the database engine using PostgreSQL roles, Row-Level Security (RLS), and session-bound authorization contexts.

```text
                        ┌────────────────────────┐
                        │   POSTGRES_USER / DDL  │
                        │    (postgres/meseid)   │
                        └───────────┬────────────┘
                                    │ (migrations only)
                                    ▼
                        ┌────────────────────────┐
                        │       meseid_app       │ (LOGIN, NOINHERIT, NOSUPERUSER, NOBYPASSRLS)
                        │   Elysia API Runtime   │
                        └───────────┬────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       │ (SET LOCAL ROLE)           │ (SET LOCAL ROLE)           │ (SET LOCAL ROLE)
       ▼                            ▼                            ▼
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│   meseid_owner_ctx   │   │   meseid_admin_ctx   │   │  meseid_system_ctx   │
│ (Tenant RLS context) │   │ (Metadata & Ops Only │   │ (Ingestion, Quota &  │
│                      │   │  No Content Access)  │   │  Background Jobs)    │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
```

1. **`meseid_app` (LOGIN)**:
   - The single login role used by the Elysia backend connection pool.
   - Configured with `NOINHERIT`, `NOSUPERUSER`, `NOBYPASSRLS`.
   - Granted membership into `meseid_owner_ctx`, `meseid_admin_ctx`, and `meseid_system_ctx`.
   - Has direct table privileges revoked on all tenant content tables. All operations must transition into a specific context role.
2. **`meseid_owner_ctx` (NOLOGIN)**:
   - Context role for authenticated tenant owners.
   - Enforces strict tenant isolation via RLS policies (`USING (owner_id = app_owner_id())`).
   - Append-only on financial ledgers (`jurnal_umum`, `jurnal_baris` have UPDATE and DELETE revoked).
   - Read-only access to tenant audit log (`audit_log`).
3. **`meseid_admin_ctx` (NOLOGIN)**:
   - Context role for platform administrators.
   - Granted read access to metadata tables (`users`, `owners`, `plans`, `plan_prices`, `topup_packages`, `subscriptions`), administrative views, `system_logs`, and `alerts`.
   - Read-only access to tenant-level `audit_log`.
   - Append-only access to `admin_audit_log` (SELECT, INSERT only; UPDATE and DELETE forbidden).
   - **Strictly denied read/write access to tenant content tables** (`jurnal_umum`, `jurnal_baris`, `accounts`, `parties`, `buku_pembantu`, `documents`, `chat_logs`, etc.).
   - Explicitly revoked from calling UU PDP erasure (`delete_owner_data`).
4. **`meseid_system_ctx` (NOLOGIN)**:
   - Context role for automated background workers, webhooks, message ingestion pipelines, and lazy quota rollover.
   - Access to `inbound_messages`, `token_usage_logs`, `quota_counters`, and `pending_actions` expiration.
5. **`postgres` / `meseid` (SUPERUSER)**:
   - Used exclusively during automated migrations and schema initialization.

---

## 2. Session Context Mechanism

Session identity is managed via PostgreSQL configuration parameters (`app.owner_id` and `app.user_id`) scoped strictly to the current database transaction (`is_local = true`).

### Session Variable Accessors
- **`app_owner_id()`**: Extracts `current_setting('app.owner_id', true)::uuid`. Returns `NULL` if unset or invalid.
- **`app_user_id()`**: Extracts `current_setting('app.user_id', true)::uuid`. Returns `NULL` if unset or invalid.

### TypeScript Unified Helper (`withContext`)
Located in [apps/api/src/db/client.ts](../apps/api/src/db/client.ts):

```typescript
export async function withContext<T>(
  options: { role: ContextRole; ownerId?: string; userId?: string },
  fn: (tx: Tx) => Promise<T>
): Promise<T>
```

When invoked:
1. `tx.unsafe("SET LOCAL ROLE meseid_<role>_ctx")` transitions the connection for the duration of the transaction.
2. `tx.unsafe("SELECT set_config('app.owner_id', ..., true)")` sets the tenant scope.
3. `tx.unsafe("SELECT set_config('app.user_id', ..., true)")` sets the acting user scope.
4. On transaction commit or rollback, the role and session variables revert automatically to default.

---

## 3. Row-Level Security (RLS) & Role Grant Matrix

The following matrix documents table RLS enforcement and live PostgreSQL role privileges:

| Table | RLS Status | `meseid_owner_ctx` | `meseid_admin_ctx` | `meseid_system_ctx` |
| :--- | :--- | :--- | :--- | :--- |
| **accounts** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | **DENIED** |
| **admin_audit_log** | Enabled & Forced | **DENIED** | INSERT, SELECT | **DENIED** |
| **ai_models** | Enabled & Forced | **DENIED** | **DENIED** | **DENIED** |
| **alerts** | Enabled & Forced | **DENIED** | DELETE, INSERT, SELECT, UPDATE | DELETE, INSERT, SELECT, UPDATE |
| **audit_log** | Enabled & Forced | SELECT | SELECT | **DENIED** |
| **bookings** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | DELETE, INSERT, SELECT, UPDATE |
| **bot_configs** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | SELECT |
| **buku_pembantu** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | **DENIED** |
| **channel_connections** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | SELECT |
| **chat_logs** | Enabled & Forced | SELECT | **DENIED** | DELETE, INSERT, SELECT, UPDATE |
| **default_accounts_template** | Disabled | **DENIED** | **DENIED** | **DENIED** |
| **document_versions** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | **DENIED** |
| **documents** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | **DENIED** |
| **google_connections** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | **DENIED** |
| **inbound_messages** | Enabled & Forced | SELECT | **DENIED** | DELETE, INSERT, SELECT, UPDATE |
| **jurnal_baris** | Enabled & Forced | INSERT, SELECT | **DENIED** | **DENIED** |
| **jurnal_umum** | Enabled & Forced | INSERT, SELECT | **DENIED** | **DENIED** |
| **knowledge_base** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | SELECT |
| **owners** | Enabled & Forced | DELETE, SELECT, UPDATE | SELECT | SELECT |
| **parties** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | **DENIED** |
| **payment_history** | Enabled & Forced | SELECT | SELECT | DELETE, INSERT, SELECT, UPDATE |
| **pending_actions** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | INSERT, SELECT, UPDATE |
| **plan_prices** | Disabled | SELECT | SELECT | DELETE, INSERT, SELECT, UPDATE |
| **plans** | Enabled & Forced | SELECT | SELECT | DELETE, INSERT, SELECT, UPDATE |
| **quota_counters** | Enabled & Forced | SELECT | **DENIED** | DELETE, INSERT, SELECT, UPDATE |
| **reminders** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | DELETE, INSERT, SELECT, UPDATE |
| **schedules** | Enabled & Forced | DELETE, INSERT, SELECT, UPDATE | **DENIED** | DELETE, INSERT, SELECT, UPDATE |
| **schema_migrations** | Disabled | **DENIED** | **DENIED** | **DENIED** |
| **subscriptions** | Enabled & Forced | SELECT | SELECT | DELETE, INSERT, SELECT, UPDATE |
| **system_logs** | Enabled & Forced | **DENIED** | SELECT | DELETE, INSERT, SELECT, UPDATE |
| **token_topups** | Enabled & Forced | SELECT | **DENIED** | DELETE, INSERT, SELECT, UPDATE |
| **token_usage_logs** | Enabled & Forced | SELECT | **DENIED** | DELETE, INSERT, SELECT, UPDATE |
| **topup_packages** | Disabled | SELECT | SELECT | DELETE, INSERT, SELECT, UPDATE |
| **unanswered_questions** | Enabled & Forced | DELETE, SELECT, UPDATE | **DENIED** | DELETE, INSERT, SELECT, UPDATE |
| **users** | Enabled & Forced | SELECT, UPDATE | SELECT | SELECT |

---

## 4. Comprehensive Inventory of Database Objects

### Stored Procedures
Total Procedures: **4**

1. **`sp_expire_pending_actions()`**
   - **Type:** `PROCEDURE` (`SECURITY INVOKER`, `VOLATILE`)

2. **`sp_purge_old_logs(IN p_retention_days integer)`**
   - **Type:** `PROCEDURE` (`SECURITY INVOKER`, `VOLATILE`)

3. **`util_apply_tenant_defaults(IN p_table regclass)`**
   - **Type:** `PROCEDURE` (`SECURITY INVOKER`, `VOLATILE`)

4. **`util_create_owner_policy(IN p_table regclass)`**
   - **Type:** `PROCEDURE` (`SECURITY INVOKER`, `VOLATILE`)

### Stored Functions
Total Functions: **25**

1. **`app_owner_id()`** -> `uuid`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `STABLE`)

2. **`app_user_id()`** -> `uuid`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `STABLE`)

3. **`check_journal_balance()`** -> `trigger`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

4. **`delete_owner_data(target_owner_id uuid)`** -> `void`
   - **Type:** `FUNCTION` (`SECURITY DEFINER`, `VOLATILE`)

5. **`fn_activate_subscription(p_order_id text)`** -> `jsonb`
   - **Type:** `FUNCTION` (`SECURITY DEFINER`, `VOLATILE`)

6. **`fn_balance_sheet(p_owner_id uuid, p_as_of date)`** -> `TABLE(account_code text, account_name text, account_type text, amount numeric)`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `STABLE`)

7. **`fn_check_conflict(p_owner_id uuid, p_start timestamp with time zone, p_end timestamp with time zone)`** -> `boolean`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `STABLE`)

8. **`fn_confirm_pending_action(p_action_id uuid)`** -> `jsonb`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

9. **`fn_consume_quota(p_owner_id uuid, p_tokens integer)`** -> `TABLE(allowed boolean, remaining bigint, message text)`
   - **Type:** `FUNCTION` (`SECURITY DEFINER`, `VOLATILE`)

10. **`fn_income_statement(p_owner_id uuid, p_from date, p_to date)`** -> `TABLE(account_code text, account_name text, account_type text, amount numeric)`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `STABLE`)

11. **`fn_post_journal(p_owner_id uuid, p_header jsonb, p_lines jsonb)`** -> `uuid`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

12. **`fn_reverse_journal(p_owner_id uuid, p_target_journal_id uuid, p_reason text)`** -> `uuid`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

13. **`fn_suspend_owner(p_owner_id uuid, p_reason text)`** -> `void`
   - **Type:** `FUNCTION` (`SECURITY DEFINER`, `VOLATILE`)

14. **`on_owner_created_seed_accounts()`** -> `trigger`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

15. **`resolve_channel_identity(p_channel text, p_external_account_id text)`** -> `TABLE(owner_id uuid, user_id uuid, business_name text, owner_status text, user_status text, user_role text)`
   - **Type:** `FUNCTION` (`SECURITY DEFINER`, `VOLATILE`)

16. **`seed_default_accounts(p_owner_id uuid)`** -> `void`
   - **Type:** `FUNCTION` (`SECURITY DEFINER`, `VOLATILE`)

17. **`trigger_audit_log()`** -> `trigger`
   - **Type:** `FUNCTION` (`SECURITY DEFINER`, `VOLATILE`)

18. **`trigger_calc_token_usage_cost()`** -> `trigger`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

19. **`trigger_prevent_admin_audit_log_mutation()`** -> `trigger`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

20. **`trigger_prevent_audit_log_mutation()`** -> `trigger`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

21. **`trigger_prevent_journal_mutation()`** -> `trigger`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

22. **`trigger_prevent_owner_id_change()`** -> `trigger`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

23. **`trigger_set_document_version_no()`** -> `trigger`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

24. **`trigger_set_updated_at()`** -> `trigger`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

25. **`trigger_validate_line_owner_consistency()`** -> `trigger`
   - **Type:** `FUNCTION` (`SECURITY INVOKER`, `VOLATILE`)

### Views
Total Views: **7** (All configured with `security_invoker = true`)

1. **`buku_besar`**
2. **`buku_kas`**
3. **`neraca_saldo`**
4. **`subledger_aging`**
5. **`v_admin_owners`**
6. **`v_admin_system_health`**
7. **`v_admin_token_usage`**

### Triggers
Total Triggers: **78**

| Table | Trigger Name | Event | Timing | Action Statement |
| :--- | :--- | :--- | :--- | :--- |
| `accounts` | `trg_accounts_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `accounts` | `trg_accounts_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `accounts` | `trg_audit_accounts` | `INSERT` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `accounts` | `trg_audit_accounts` | `UPDATE` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `accounts` | `trg_audit_accounts` | `DELETE` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `admin_audit_log` | `trg_prevent_admin_audit_log_mutation` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_admin_audit_log_mutation()` |
| `admin_audit_log` | `trg_prevent_admin_audit_log_mutation` | `DELETE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_admin_audit_log_mutation()` |
| `ai_models` | `trg_ai_models_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `alerts` | `trg_alerts_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `audit_log` | `trg_prevent_audit_log_mutation` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_audit_log_mutation()` |
| `audit_log` | `trg_prevent_audit_log_mutation` | `DELETE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_audit_log_mutation()` |
| `bookings` | `trg_bookings_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `bookings` | `trg_bookings_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `bot_configs` | `trg_bot_configs_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `bot_configs` | `trg_bot_configs_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `buku_pembantu` | `trg_audit_buku_pembantu` | `INSERT` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `buku_pembantu` | `trg_audit_buku_pembantu` | `UPDATE` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `buku_pembantu` | `trg_audit_buku_pembantu` | `DELETE` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `buku_pembantu` | `trg_buku_pembantu_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `buku_pembantu` | `trg_buku_pembantu_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `channel_connections` | `trg_channel_connections_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `channel_connections` | `trg_channel_connections_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `chat_logs` | `trg_chat_logs_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `document_versions` | `trg_set_document_version_no` | `INSERT` | `BEFORE` | `EXECUTE FUNCTION trigger_set_document_version_no()` |
| `documents` | `trg_documents_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `documents` | `trg_documents_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `google_connections` | `trg_google_connections_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `google_connections` | `trg_google_connections_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `inbound_messages` | `trg_inbound_messages_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `inbound_messages` | `trg_inbound_messages_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `jurnal_baris` | `trg_check_journal_balance_lines` | `DELETE` | `AFTER` | `EXECUTE FUNCTION check_journal_balance()` |
| `jurnal_baris` | `trg_check_journal_balance_lines` | `INSERT` | `AFTER` | `EXECUTE FUNCTION check_journal_balance()` |
| `jurnal_baris` | `trg_check_journal_balance_lines` | `UPDATE` | `AFTER` | `EXECUTE FUNCTION check_journal_balance()` |
| `jurnal_baris` | `trg_jurnal_baris_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `jurnal_baris` | `trg_prevent_jurnal_baris_mutation` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_journal_mutation()` |
| `jurnal_baris` | `trg_prevent_jurnal_baris_mutation` | `DELETE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_journal_mutation()` |
| `jurnal_baris` | `trg_validate_line_owner_consistency` | `INSERT` | `BEFORE` | `EXECUTE FUNCTION trigger_validate_line_owner_consistency()` |
| `jurnal_umum` | `trg_audit_jurnal_umum` | `DELETE` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `jurnal_umum` | `trg_audit_jurnal_umum` | `INSERT` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `jurnal_umum` | `trg_audit_jurnal_umum` | `UPDATE` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `jurnal_umum` | `trg_check_journal_balance_header` | `INSERT` | `AFTER` | `EXECUTE FUNCTION check_journal_balance()` |
| `jurnal_umum` | `trg_check_journal_balance_header` | `UPDATE` | `AFTER` | `EXECUTE FUNCTION check_journal_balance()` |
| `jurnal_umum` | `trg_jurnal_umum_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `jurnal_umum` | `trg_jurnal_umum_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `jurnal_umum` | `trg_prevent_jurnal_umum_mutation` | `DELETE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_journal_mutation()` |
| `jurnal_umum` | `trg_prevent_jurnal_umum_mutation` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_journal_mutation()` |
| `knowledge_base` | `trg_knowledge_base_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `knowledge_base` | `trg_knowledge_base_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `owners` | `trg_owners_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `owners` | `trg_seed_default_accounts` | `INSERT` | `AFTER` | `EXECUTE FUNCTION on_owner_created_seed_accounts()` |
| `parties` | `trg_audit_parties` | `DELETE` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `parties` | `trg_audit_parties` | `UPDATE` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `parties` | `trg_audit_parties` | `INSERT` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `parties` | `trg_parties_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `parties` | `trg_parties_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `payment_history` | `trg_payment_history_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `payment_history` | `trg_payment_history_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `pending_actions` | `trg_audit_pending_actions` | `UPDATE` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `pending_actions` | `trg_audit_pending_actions` | `INSERT` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `pending_actions` | `trg_audit_pending_actions` | `DELETE` | `AFTER` | `EXECUTE FUNCTION trigger_audit_log()` |
| `pending_actions` | `trg_pending_actions_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `pending_actions` | `trg_pending_actions_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `plans` | `trg_plans_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `quota_counters` | `trg_quota_counters_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `quota_counters` | `trg_quota_counters_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `reminders` | `trg_reminders_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `reminders` | `trg_reminders_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `schedules` | `trg_schedules_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `schedules` | `trg_schedules_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `subscriptions` | `trg_subscriptions_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `subscriptions` | `trg_subscriptions_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `token_topups` | `trg_token_topups_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `token_topups` | `trg_token_topups_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `token_usage_logs` | `trg_calc_token_usage_cost` | `INSERT` | `BEFORE` | `EXECUTE FUNCTION trigger_calc_token_usage_cost()` |
| `token_usage_logs` | `trg_token_usage_logs_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `unanswered_questions` | `trg_unanswered_questions_owner_immutable` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_prevent_owner_id_change()` |
| `unanswered_questions` | `trg_unanswered_questions_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
| `users` | `trg_users_updated_at` | `UPDATE` | `BEFORE` | `EXECUTE FUNCTION trigger_set_updated_at()` |
