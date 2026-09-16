# NAD JARVIS — FINAL PRE-SUPABASE SCHEMA & INTEGRATION VERIFICATION

**Audit Date:** September 16, 2026  
**Target Schema File:** `supabase/schema.sql`  
**Verified Against:** Complete Current Codebase (`api/`, `lib/`, `public/`, `tests/`)  
**Verdict:** **SAFE TO APPLY SCHEMA**

---

## EXECUTIVE SUMMARY

A comprehensive, line-by-line verification was conducted comparing the current `supabase/schema.sql` against all database operations, queries, mutations, upserts, and security policies across the repaired NAD JARVIS codebase.

Every table, constraint, foreign key, `onConflict` target, RLS policy, and Storage definition was verified. The schema and the codebase are in **100% agreement**.

---

## DETAILED VERIFICATION AUDIT

### 1. `connections` (Multi-Account Google Architecture)
- **Multi-Account Support**: One NAD JARVIS owner can connect multiple Google accounts (Personal, Work, School).
- **Identity Model**: Unique constraint is defined as:
  ```sql
  CONSTRAINT uq_connections_user_provider_account UNIQUE (user_id, provider, account_identifier)
  ```
- **Code `onConflict` Target**: In `lib/google/oauth.js` (line 184):
  ```javascript
  await admin.from('connections').upsert({ ... }, { onConflict: 'user_id,provider,account_identifier' })
  ```
  **Result:** **EXACT MATCH**. Upsert target matches database constraint perfectly.
- **Fields Verified**: `id`, `user_id`, `provider`, `account_identifier`, `nickname`, `status`, `encrypted_refresh_token`, `scopes`, `metadata`, `created_at`, `updated_at`.
- **Status:** **PASS**

---

### 2. `drive_sources` (Account Association)
- **Relationship to `connections`**: Defined in schema as:
  ```sql
  account_id UUID REFERENCES public.connections(id) ON DELETE CASCADE
  ```
- **Uniqueness Constraint**:
  ```sql
  CONSTRAINT uq_drive_sources_user_nickname UNIQUE (user_id, nickname)
  ```
- **Code Alignment**:
  - In `lib/google/oauth.js` (line 194): Upserts with `{ user_id: targetUserId, account_id: connRecord?.id || null, nickname: driveNickname, folder_id: 'root', scope_granted: 'drive.readonly' }` with `{ onConflict: 'user_id,nickname' }`.
  - In `lib/google/oauth.js` (line 261): Queries `drive_sources` and associates with connection via `ds.account_id === conn.id`.
  - Cascading delete ensures disconnecting an account cleanly cleans up dependent drive sources.
- **Status:** **PASS**

---

### 3. `todo_items` (User-Facing Personal Checklist)
- **Table Definition**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.todo_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
      due_date DATE,
      is_completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **Code Alignment in `api/tasks.js`**:
  - `GET`: Queries `todo_items` by `user_id` with ordering by `created_at DESC`.
  - `POST`: Inserts `user_id`, `title`, `priority` (validated against `'low','medium','high'`), `due_date`, `is_completed: false`.
  - `PATCH`: Updates `title`, `priority`, `due_date`, `is_completed`, `updated_at`.
  - `DELETE`: Deletes by `id` and `user_id`.
- **Status:** **PASS**

---

### 4. `tasks` (Background Worker Queue)
- **Separation from `todo_items`**: Complete architectural separation maintained.
- **Table Definition**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.tasks (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      task_type TEXT NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::JSONB,
      status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed')),
      result JSONB,
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **Code Alignment in `api/tasks.js`**:
  - Worker tasks triggered via `req.body.taskType` or `?type=worker`.
  - Inserts `task_type`, `payload`, `status: 'queued'`, `user_id`.
  - Queries return `tasks` queue items without interfering with `todo_items`.
- **Status:** **PASS**

---

### 5. `conversations` & `messages` (Chat Persistence)
- **Table Definitions**:
  - `conversations`: `id`, `user_id`, `title`, `created_at`, `updated_at`.
  - `messages`: `id`, `conversation_id REFERENCES public.conversations(id) ON DELETE CASCADE`, `user_id`, `role CHECK (role IN ('user', 'assistant', 'system', 'tool'))`, `content`, `provider`, `model`, `metadata`, `created_at`.
- **Code Alignment**:
  - `api/conversations.js`: Handles `GET` (list and retrieve by ID), `POST` (create), and `DELETE` (cascading message deletion).
  - `api/chat.js`: Creates conversation if none active; records `user` role; records `assistant` role with `provider`, `model`, and telemetry metadata; updates `conversations.updated_at`.
- **Status:** **PASS**

---

### 6. `documents` (Storage Metadata & Honest Indexing Status)
- **Table Definition**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      drive_source_id UUID REFERENCES public.drive_sources(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      storage_path TEXT,
      mime_type TEXT,
      size_bytes BIGINT NOT NULL DEFAULT 0,
      metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
      indexing_status TEXT NOT NULL DEFAULT 'pending' CHECK (indexing_status IN ('pending', 'indexing', 'indexed', 'failed')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **Honest Indexing Status**:
  - Default is `'pending'`.
  - `api/files.js` explicitly inserts `indexing_status: 'pending'`.
  - `lib/google/drive.js` explicitly inserts `indexing_status: 'pending'`.
  - Fraudulent claims of `"Indexed (pgvector)"` have been completely eradicated.
- **Code Alignment**:
  - `api/files.js`: `GET` list, `GET` by ID with signed URL, `POST` upload recording pointer, `DELETE` record and storage object.
  - `lib/knowledge.js`: `retrieveKnowledgeContext` selects `id, title, storage_path, mime_type, metadata, indexing_status` where `user_id = userId` and `indexing_status != 'failed'`.
- **Status:** **PASS**

---

### 7. `memory_items` (Owner-Approved Memory Foundation)
- **Table Definition**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.memory_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      is_approved BOOLEAN NOT NULL DEFAULT FALSE,
      approved_at TIMESTAMPTZ,
      metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **Code Alignment**:
  - `api/memory.js`: Enforces `confirmedByOwner = true` before writing durable memory with `is_approved = true` and `approved_at = NOW()`; provides `DELETE` by `id` and `user_id`.
  - `api/chat.js`: Selects only approved memories (`.eq('is_approved', true)`) for injection into system prompt.
- **Status:** **PASS**

---

### 8. `scheduled_jobs` (Schedule & Calendar Mirroring)
- **Table Definition**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      schedule_cron TEXT,
      next_run TIMESTAMPTZ NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::JSONB,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **Code Alignment**:
  - `api/schedule.js`: Queries active jobs due for execution (`lte('next_run', nowIso)`) for Vercel Cron triggers; handles `GET` list and `POST` create/update.
  - `lib/google/calendar.js`: Inserts scheduled appointment mirror with `title`, `next_run`, `payload`, `status: 'active'`.
- **Status:** **PASS**

---

### 9. `audit_events` (Security Event Logging)
- **Table Definition**:
  ```sql
  CREATE TABLE IF NOT EXISTS public.audit_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      resource TEXT,
      details JSONB NOT NULL DEFAULT '{}'::JSONB,
      ip_address TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
- **Code Alignment**:
  - `lib/audit.js`: Uses `getSupabaseAdmin()` (bypasses RLS via service role) to insert `user_id`, `action`, `resource`, `details`, `ip_address`.
  - Schema RLS allows authenticated owner to read their own audit logs.
- **Status:** **PASS**

---

### 10. Row Level Security (RLS) & Service Admin Operations
- **Single-Owner Isolation**:
  - All 14 tables in schema have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`.
  - Owner-scoped tables enforce:
    ```sql
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    ```
    (with `auth.uid() = id` for `profiles`).
- **Service Role Bypass**:
  - In Supabase, the `service_role` key has Postgres attribute `BYPASSRLS`.
  - Server-side administrative operations in `lib/audit.js`, `lib/google/oauth.js` (callback token saving), and `api/schedule.js` (cron checks) execute via `getSupabaseAdmin()` and will operate without restriction.
- **Status:** **PASS**

---

### 11. Supabase Storage (`documents` bucket)
- **Bucket Creation**:
  ```sql
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('documents', 'documents', FALSE)
  ON CONFLICT (id) DO NOTHING;
  ```
- **Storage Security Policy**:
  ```sql
  CREATE POLICY "Owner document storage access" ON storage.objects
      FOR ALL TO authenticated
      USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])
      WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
  ```
- **Code Alignment**:
  - `api/files.js` generates path `${userId}/${Date.now()}_${safeTitle}`.
  - `(storage.foldername(name))[1]` resolves to `${userId}`, which strictly equals `auth.uid()::text`.
  - Signed URLs generated for 15 minutes (`900` seconds).
- **Status:** **PASS**

---

### 12. Google OAuth & Server-Side Token Security
- **Encryption Field**: `connections.encrypted_refresh_token` (TEXT).
- **Encryption Implementation**: `lib/crypto.js` provides authenticated `AES-256-GCM` encryption.
- **Environment Variable**: Requires server secret `TOKEN_ENCRYPTION_KEY` (32 bytes).
- **Client Security**: Refresh tokens are never exposed in any API response or stored in `localStorage`.
- **Status:** **PASS**

---

### 13. `providers` & `models` Tables Analysis
- **Runtime Dependency Check**:
  - `lib/router.js` classifies tasks and selects models using in-memory adapter classes (`NvidiaNimAdapter`, `DeepSeekAdapter`).
  - No code in `api/` or `lib/` queries `public.providers` or `public.models` at runtime.
  - The tables are present in `schema.sql` as reference/catalog tables seeded with NVIDIA NIM and DeepSeek metadata.
- **Impact**: Creating them does **not** cause any runtime overhead or failure; they are completely safe to execute.
- **Status:** **PASS (Non-blocking reference tables)**

---

### 14. Comprehensive Defect Checklist
- Missing columns: **NONE**
- Wrong column names: **NONE**
- Wrong foreign keys: **NONE**
- Wrong unique constraints: **NONE**
- Wrong `onConflict` targets: **NONE**
- Invalid indexes: **NONE**
- Invalid RLS policies: **NONE**
- Code/schema contract mismatches: **NONE**

---

## FINAL REPORT SUMMARY

### A. PASS
1. `connections` table and multi-account Google identity model
2. `drive_sources` table and foreign key to `connections(id)`
3. `todo_items` table and CRUD contract in `api/tasks.js`
4. `tasks` background queue table and separation from `todo_items`
5. `conversations` and `messages` tables and cascading deletes
6. `documents` table and honest `pending` indexing status
7. `memory_items` table and owner-approval mechanism
8. `scheduled_jobs` table and calendar mirroring
9. `audit_events` table and admin logging
10. Row Level Security policies across all 14 tables
11. Supabase Storage `documents` bucket and path-level RLS policy
12. Server-side AES-256-GCM token encryption in `lib/crypto.js`
13. Static reference behavior of `providers` and `models` tables

### B. FAIL
**NONE**

### C. REQUIRED FIX BEFORE SUPABASE
**NONE**. No further code or schema modifications are required prior to execution.

### D. SAFE TO APPLY SCHEMA: YES/NO
# **YES**

---

> ## **SAFE TO APPLY SCHEMA**
> 
> You may proceed directly to your **Supabase Dashboard SQL Editor** and execute the entire contents of:
> **`supabase/schema.sql`**
