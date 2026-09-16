# NAD JARVIS — SUPABASE BACKEND SCHEMA & INTEGRATION AUDIT
**Document ID:** `NAD-JARVIS-AUDIT-2026-09`  
**Target System:** NAD JARVIS — Private Single-User Personal AI Assistant  
**Auditor:** Google DeepMind Advanced Agentic AI Assistant (Inspection Only)  
**Execution Constraints:** No modifications made; zero source code changes; zero database mutations.

---

## 1. Executive Summary

NAD JARVIS is a strictly private, single-owner personal AI operating system built for **Nadjibullah Uwabato ("Nad")**. It is deployed on a modern **Vercel Serverless (Node.js)** backend paired with a vanilla **HTML5 / JavaScript / CSS3** frontend featuring a Three.js interactive particle background and audio visualizers.

The existing codebase was recently migrated away from Firebase/Firestore and restructured to target **Supabase** as its unified data, authentication, and storage platform.

### Key Audit Findings:
1. **Supabase Readiness:** The application code is deeply integrated with `@supabase/supabase-js` (v2.49.1). Ten (10) consolidated Vercel serverless functions in `api/` orchestrate authentication, chat history, memory, scheduled jobs, background tasks, files, and Google Workspace integrations.
2. **Database Scope:** The existing backend code actively queries **11 database tables**, while the companion `supabase/schema.sql` file defines **13 tables** (adding two AI provider configuration tables: `providers` and `models`, which are currently unused by the runtime router).
3. **Storage Bucket Scope:** Exactly **1 private Storage bucket** (`documents`) is required.
4. **pgvector & RAG Reality:** Despite frontend UI labels claiming `"Indexed (pgvector)"`, **NO vector database, embeddings, chunking pipeline, or pgvector extensions are implemented in the backend code**. Knowledge retrieval currently relies on a static in-memory profile in `lib/knowledge.js` injected directly into the LLM system prompt.
5. **Critical Bugs & Schema Collisions Discovered:**
   - **Missing Unique Constraints on Upsert Targets:** In `lib/google/oauth.js`, upserts rely on `ON CONFLICT (user_id, provider)` for `connections` and `ON CONFLICT (user_id, nickname)` for `drive_sources`. Neither unique constraint exists in `supabase/schema.sql`, which will cause Postgres to throw fatal runtime errors during OAuth token saving.
   - **Task Architectural Collision:** The backend `api/tasks.js` and `schema.sql` implement an asynchronous background worker queue (`task_type`, `payload`, `status: queued`), whereas the frontend `public/app.js` treats `tasks` as a user Todo/checklist item (`title`, `priority`, `due_date`, `is_completed`), causing all frontend task creations to fail with `400 Missing taskType`.
   - **Calendar API Contract Mismatch:** The frontend submits Google Calendar events formatted as `{ summary, start: { dateTime }, end: { dateTime } }` without confirmation, but `lib/google/calendar.js` strictly requires `{ title, date, time, confirmed: true }`, rejecting user submissions.
   - **Missing REST Handlers:** The frontend attempts `DELETE /api/conversations`, `PATCH /api/tasks`, `DELETE /api/tasks`, and folder-based `GET /api/files`, all of which return `405 Method Not Allowed` or `400 Bad Request`.

---

## 2. Project Architecture

The repository adheres to a serverless decoupled web architecture:

```
NAD JARVIS Architecture
├── Frontend (Browser Client)
│   ├── public/index.html               (Single-page assistant application dashboard)
│   ├── public/login.html               (Owner login interface with Three.js particle canvas)
│   ├── public/styles.css               (Design system: dark glassmorphism, gold accents)
│   ├── public/app.js                   (Application controller, UI state, Three.js canvas)
│   ├── public/services/api.js          (HTTP client wrapper with JWT bearer injection)
│   └── public/services/google.js       (Google Workspace client dispatch wrapper)
│
├── Serverless Backend Layer (Vercel Node.js Serverless Functions)
│   ├── api/auth.js                     (Consolidated: POST login, GET session)
│   ├── api/chat.js                     (POST chat completions & message persistence)
│   ├── api/conversations.js            (GET list conversations, GET conversation messages)
│   ├── api/files.js                    (Consolidated: POST upload, GET signed URL download)
│   ├── api/memory.js                   (Consolidated: GET list, POST create/approve memory)
│   ├── api/providers.js                (Consolidated: GET health check, POST routing diagnostic)
│   ├── api/schedule.js                 (Consolidated: GET schedule, POST save job, GET due jobs)
│   ├── api/tasks.js                    (Consolidated: GET list/poll task, POST enqueue task)
│   └── api/google/
│       ├── oauth.js                    (Consolidated: GET/POST start consent, GET callback)
│       └── workspace.js                (Consolidated dispatch: drive.*, calendar.*, gmail.*)
│
├── Business Logic & Helper Layer
│   ├── lib/supabase.js                 (Supabase client factory: Admin, User/RLS, Anon)
│   ├── lib/auth.js                     (Middleware: owner session validation via Supabase JWT)
│   ├── lib/audit.js                    (Security audit logging into `audit_events` table)
│   ├── lib/rateLimit.js                (Sliding-window IP rate limiter)
│   ├── lib/router.js                   (AI router: task classifier, provider fallback orchestrator)
│   ├── lib/knowledge.js                (Owner knowledge base & system prompt generator)
│   ├── lib/adapters/
│   │   ├── base.js                     (BaseProviderAdapter specification interface)
│   │   ├── nvidia.js                   (NVIDIA NIM Llama 3.2 90B Vision Instruct adapter)
│   │   └── deepseek.js                 (DeepSeek Chat V3 adapter)
│   └── lib/google/
│       ├── oauth.js                    (Google OAuth URL generation & code-to-token exchange)
│       ├── drive.js                    (Drive file listing, pointer resolution, staged upload)
│       ├── calendar.js                 (Calendar events listing & scheduled job sync)
│       └── gmail.js                    (Gmail message read & query search)
│
├── Database & Security Assets
│   ├── supabase/schema.sql             (Draft DDL: tables, indexes, seeds, RLS policies, buckets)
│   └── tests/rls_security_check.js     (RLS policy test suite against unauthenticated access)
│
└── Configuration
    ├── package.json                    (Dependencies: @supabase/supabase-js ^2.49.1, dotenv ^16.4.7)
    └── vercel.json                     (URL rewrites for OAuth callback & schedule cron)
```

---

## 3. Supabase Dependencies

The following inventory details everything NAD JARVIS expects from Supabase:

| Category | Component / Resource | Current Usage in Codebase |
|---|---|---|
| **A. Authentication** | Supabase Auth (`auth.users`) | Password-based login for owner (`uwabatonadjibullah@gmail.com`). Issues JWTs containing user UUID. Verified on every protected API route via `admin.auth.getUser(token)`. |
| **B. PostgreSQL Database** | 11 Required Tables | Persistent relational storage for profiles, chat history, usage logs, external tokens, documents, memory, tasks, jobs, and audits. |
| **B. PostgreSQL Database** | 2 Potential Tables | `providers` and `models` exist in `supabase/schema.sql` with seed data, but are not queried by active runtime code. |
| **C. Storage** | 1 Private Bucket (`documents`) | Stores user uploads and Google Drive staged files. Accessed via `client.storage.from('documents')`. Generates 15-minute signed URLs. |
| **D. Row-Level Security** | Strict Single-Owner RLS | Every client-reachable table has RLS enabled with `USING (auth.uid() = user_id)` (or `id` for profiles). |
| **E. Realtime** | Supabase Realtime | **NOT USED.** Zero subscriptions, zero channels, zero `postgres_changes` listeners. All polling is done via HTTP. |
| **F. Edge Functions** | Supabase Edge Functions | **NOT USED.** All server-side logic runs as Vercel Serverless Node.js Functions in `api/`. |
| **G. pgvector** | Vector Database / Embeddings | **NOT USED IN CURRENT BACKEND.** UI claims "Indexed (pgvector)", but no embedding models, vector columns, or similarity search functions exist in code. |
| **H. Extensions** | `uuid-ossp` or `pgcrypto` | Required for `gen_random_uuid()` default primary keys across 11 tables. |

---

## 4. Authentication Audit

### 4.1 Login & Session Lifecycle
- **Sign-In Mechanism:** Handled by `POST /api/auth` (`action=login`) in `api/auth.js`.
- **Client Execution:** Uses `getSupabaseAnon().auth.signInWithPassword({ email, password })`.
- **Single-Owner Check:** Strictly validates that `email.toLowerCase() === OWNER_EMAIL.toLowerCase()`. Any other email is rejected with `403 Forbidden: Unauthorized user email`.
- **Rate Limiting:** Brute-force protection limits login attempts to 5 per minute per IP via `lib/rateLimit.js`.
- **Token Handling:** Returns `session.access_token` and `session.refresh_token` to the frontend.
- **Frontend Storage:** Stored in browser `localStorage` under the key `'nad_jarvis_token'`.
- **Session Verification:** Protected routes pass `Authorization: Bearer <access_token>`. The backend helper `verifyOwnerSession(req, res)` in `lib/auth.js`:
  1. Extracts the Bearer token.
  2. Calls `getSupabaseAdmin().auth.getUser(token)` to validate the signature and retrieve user identity.
  3. Verifies that `user.id === OWNER_USER_ID` or `user.email === OWNER_EMAIL`.
  4. Instantiates an owner-scoped user client via `getSupabaseUserClient(token)` which attaches `Authorization: Bearer <token>` to all queries, enforcing PostgreSQL RLS.

### 4.2 Profiles & Identity Mapping
- When the owner logs in, `api/auth.js` automatically upserts the profile:
  ```javascript
  await admin.from('profiles').upsert({
    id: data.user.id,
    email: data.user.email,
    full_name: 'Nadjibullah Uwabato',
    nickname: 'Nad',
    is_owner: true,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });
  ```
- **Relationship:** `public.profiles.id` is a 1-to-1 Foreign Key referencing `auth.users(id) ON DELETE CASCADE`.

### 4.3 Owner Identity vs External Google Accounts
A critical architectural boundary is maintained:
- **JARVIS Owner:** Authenticates exclusively via Supabase Auth (Email + Password).
- **Google Accounts:** These are **external service connections** managed strictly as OAuth 2.0 credentials stored in the `public.connections` table. Google accounts are **NOT** used to log in to NAD JARVIS; they are authorized tools that JARVIS uses on the owner's behalf to read Drive, Calendar, and Gmail.

---

## 5. Database Tables Audit

The codebase expects the following database tables. Each table has been thoroughly audited against actual query operations in `api/` and `lib/`:

### Summary Table Inventory

| # | Table Name | Status | Primary Key | Foreign Keys | RLS Policy Target |
|---|---|---|---|---|---|
| 1 | `profiles` | **Required** | `id` (UUID) | `auth.users(id)` | `auth.uid() = id` |
| 2 | `conversations` | **Required** | `id` (UUID) | `auth.users(id)` | `auth.uid() = user_id` |
| 3 | `messages` | **Required** | `id` (UUID) | `conversations(id)`, `auth.users(id)` | `auth.uid() = user_id` |
| 4 | `providers` | *Potential (Unused)* | `id` (TEXT) | None | Authenticated Read |
| 5 | `models` | *Potential (Unused)* | `id` (TEXT) | `providers(id)` | Authenticated Read |
| 6 | `provider_usage` | **Required** | `id` (UUID) | `auth.users(id)` | `auth.uid() = user_id` |
| 7 | `connections` | **Required** | `id` (UUID) | `auth.users(id)` | `auth.uid() = user_id` |
| 8 | `drive_sources` | **Required** | `id` (UUID) | `auth.users(id)` | `auth.uid() = user_id` |
| 9 | `documents` | **Required** | `id` (UUID) | `auth.users(id)`, `drive_sources(id)` | `auth.uid() = user_id` |
| 10 | `memory_items` | **Required** | `id` (UUID) | `auth.users(id)` | `auth.uid() = user_id` |
| 11 | `tasks` | **Required (Conflict)** | `id` (UUID) | `auth.users(id)` | `auth.uid() = user_id` |
| 12 | `scheduled_jobs` | **Required** | `id` (UUID) | `auth.users(id)` | `auth.uid() = user_id` |
| 13 | `audit_events` | **Required** | `id` (UUID) | `auth.users(id)` | `auth.uid() = user_id` |

---

### Detailed Table Specifications

#### 1. `public.profiles`
- **Purpose:** Stores owner profile, preferences, display name, and avatar.
- **Code References:** `api/auth.js` (lines 56-63, 99-104), `tests/rls_security_check.js`.
- **Primary Key:** `id UUID` (matches `auth.users.id`).
- **Foreign Keys:** `REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Columns & Data Types:**
  - `id UUID PRIMARY KEY` (Required)
  - `email TEXT NOT NULL UNIQUE` (Required)
  - `full_name TEXT NOT NULL DEFAULT 'Nadjibullah Uwabato'` (Required)
  - `nickname TEXT NOT NULL DEFAULT 'Nad'` (Required)
  - `is_owner BOOLEAN NOT NULL DEFAULT TRUE` (Required)
  - `avatar_url TEXT` (Nullable)
  - `preferences JSONB NOT NULL DEFAULT '{}'::JSONB` (Required)
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
- **Constraints & Indexes:** `UNIQUE (email)`. Index on `id`.

#### 2. `public.conversations`
- **Purpose:** Organizes multi-turn chat sessions.
- **Code References:** `api/chat.js` (lines 46-53), `api/conversations.js` (lines 38-43), `tests/rls_security_check.js`.
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`.
- **Foreign Keys:** `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Columns & Data Types:**
  - `id UUID PRIMARY KEY` (Required)
  - `user_id UUID NOT NULL` (Required)
  - `title TEXT NOT NULL DEFAULT 'New Conversation'` (Required)
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
- **Indexes:** `idx_conversations_user_updated (user_id, updated_at DESC)`.

#### 3. `public.messages`
- **Purpose:** Stores individual conversation messages, roles, LLM telemetry, and model details.
- **Code References:** `api/chat.js` (lines 58-64, 69-75, 100-114), `api/conversations.js` (lines 24-29), `tests/rls_security_check.js`.
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`.
- **Foreign Keys:**
  - `conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE`
  - `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- **Columns & Data Types:**
  - `id UUID PRIMARY KEY` (Required)
  - `conversation_id UUID NOT NULL` (Required)
  - `user_id UUID NOT NULL` (Required)
  - `role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool'))` (Required)
  - `content TEXT NOT NULL` (Required)
  - `provider TEXT` (Nullable, e.g., `'nvidia'`, `'deepseek'`)
  - `model TEXT` (Nullable, e.g., `'meta/llama-3.2-90b-vision-instruct'`)
  - `metadata JSONB NOT NULL DEFAULT '{}'::JSONB` (Stores `latencyMs`, `usage`, `taskType`, `isFallback`)
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
- **Indexes:** `idx_messages_conversation_created (conversation_id, created_at ASC)`.

#### 4. `public.providers` *(Potential / Currently Unused)*
- **Purpose:** Database registry of configured AI providers.
- **Code References:** Defined in `supabase/schema.sql` (lines 45-51, seeded lines 67-71). Not queried by active JS code (adapters read `process.env`).
- **Primary Key:** `id TEXT` (e.g. `'nvidia'`, `'deepseek'`).
- **Columns & Data Types:**
  - `id TEXT PRIMARY KEY`
  - `name TEXT NOT NULL`
  - `is_active BOOLEAN NOT NULL DEFAULT TRUE`
  - `base_url TEXT`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### 5. `public.models` *(Potential / Currently Unused)*
- **Purpose:** Model limits, tool support, and pricing metadata.
- **Code References:** Defined in `supabase/schema.sql` (lines 54-64, seeded lines 73-78). Not queried by active JS code.
- **Primary Key:** `id TEXT` (e.g. `'meta/llama-3.1-70b-instruct'`).
- **Foreign Keys:** `provider_id TEXT NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE`.
- **Columns & Data Types:**
  - `id TEXT PRIMARY KEY`
  - `provider_id TEXT NOT NULL`
  - `name TEXT NOT NULL`
  - `context_window INT DEFAULT 128000`
  - `supports_vision BOOLEAN DEFAULT FALSE`
  - `supports_tools BOOLEAN DEFAULT TRUE`
  - `cost_per_1k_input NUMERIC(10, 6) DEFAULT 0`
  - `cost_per_1k_output NUMERIC(10, 6) DEFAULT 0`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

#### 6. `public.provider_usage`
- **Purpose:** Detailed AI request telemetry (tokens, latency, cost tracking, fallback triggers).
- **Code References:** `lib/router.js` (lines 62-79), `tests/rls_security_check.js`.
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`.
- **Foreign Keys:** `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Columns & Data Types:**
  - `id UUID PRIMARY KEY` (Required)
  - `user_id UUID NOT NULL` (Required)
  - `provider TEXT NOT NULL` (Required)
  - `model TEXT NOT NULL` (Required)
  - `endpoint TEXT NOT NULL` (Required, e.g. `'/chat/completions'`)
  - `prompt_tokens INT NOT NULL DEFAULT 0` (Required)
  - `completion_tokens INT NOT NULL DEFAULT 0` (Required)
  - `latency_ms INT NOT NULL DEFAULT 0` (Required)
  - `is_fallback BOOLEAN NOT NULL DEFAULT FALSE` (Required)
  - `fallback_reason TEXT` (Nullable)
  - `error TEXT` (Nullable)
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
- **Indexes:** `idx_provider_usage_user_created (user_id, created_at DESC)`.

#### 7. `public.connections`
- **Purpose:** Server-side vault for external OAuth accounts (Google Workspace tokens, scopes, metadata).
- **Code References:** `lib/google/oauth.js` (lines 88-97, 136-140), `tests/rls_security_check.js`.
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`.
- **Foreign Keys:** `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Columns & Data Types:**
  - `id UUID PRIMARY KEY` (Required)
  - `user_id UUID NOT NULL` (Required)
  - `provider TEXT NOT NULL CHECK (provider IN ('google', 'mega', 'other'))` (Required)
  - `account_identifier TEXT NOT NULL` (Required, owner's Google email)
  - `status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected', 'expired'))` (Required)
  - `encrypted_refresh_token TEXT` (Nullable)
  - `scopes TEXT[] NOT NULL DEFAULT '{}'` (Required)
  - `metadata JSONB NOT NULL DEFAULT '{}'::JSONB` (Stores `token_type`, `expires_in`, `connected_at`)
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
- **CRITICAL REQUIREMENT:** The code executes `.upsert(..., { onConflict: 'user_id,provider' })`. Therefore, a **`UNIQUE (user_id, provider)` constraint is strictly mandatory**.

#### 8. `public.drive_sources`
- **Purpose:** Nicknamed Google Drive folders and authorized scopes.
- **Code References:** `lib/google/oauth.js` (lines 100-105, 145-149), `lib/google/drive.js` (lines 20-25), `tests/rls_security_check.js`.
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`.
- **Foreign Keys:** `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Columns & Data Types:**
  - `id UUID PRIMARY KEY` (Required)
  - `user_id UUID NOT NULL` (Required)
  - `nickname TEXT NOT NULL` (Required, e.g. `"Nad's Google Drive"`)
  - `folder_id TEXT NOT NULL DEFAULT 'root'` (Required)
  - `scope_granted TEXT NOT NULL DEFAULT 'drive.readonly'` (Required)
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
- **CRITICAL REQUIREMENT:** The code executes `.upsert(..., { onConflict: 'user_id,nickname' })`. Therefore, a **`UNIQUE (user_id, nickname)` constraint is strictly mandatory**. Note that `lib/google/oauth.js` line 152 references `account_id`, which is currently missing from `schema.sql`.

#### 9. `public.documents`
- **Purpose:** Pointers and metadata for indexed documents (from Supabase Storage or Google Drive). Full text is NOT stored here.
- **Code References:** `api/files.js` (lines 33-38, 89-102), `lib/google/drive.js` (lines 27-31, 58-62, 96-101), `tests/rls_security_check.js`.
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`.
- **Foreign Keys:**
  - `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
  - `drive_source_id UUID REFERENCES public.drive_sources(id) ON DELETE SET NULL` (Nullable)
- **Columns & Data Types:**
  - `id UUID PRIMARY KEY` (Required)
  - `user_id UUID NOT NULL` (Required)
  - `drive_source_id UUID` (Nullable)
  - `title TEXT NOT NULL` (Required)
  - `storage_path TEXT` (Nullable, e.g. `"<userId>/<timestamp>_filename"`)
  - `mime_type TEXT` (Nullable)
  - `size_bytes BIGINT NOT NULL DEFAULT 0` (Required)
  - `metadata JSONB NOT NULL DEFAULT '{}'::JSONB` (Nullable/Default)
  - `indexing_status TEXT NOT NULL DEFAULT 'pending' CHECK (indexing_status IN ('pending', 'indexing', 'indexed', 'failed'))` (Required)
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
- **Indexes:** `idx_documents_user (user_id)`.

#### 10. `public.memory_items`
- **Purpose:** Persistent facts, rules, preferences, and personal identity items explicitly approved by the owner.
- **Code References:** `api/memory.js` (lines 21-25, 55-68, 73-85), `tests/rls_security_check.js`.
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`.
- **Foreign Keys:** `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Columns & Data Types:**
  - `id UUID PRIMARY KEY` (Required)
  - `user_id UUID NOT NULL` (Required)
  - `category TEXT NOT NULL` (Required, e.g. `'general'`, `'faith'`, `'engineering'`)
  - `key TEXT NOT NULL` (Required)
  - `value TEXT NOT NULL` (Required)
  - `is_approved BOOLEAN NOT NULL DEFAULT FALSE` (Required)
  - `approved_at TIMESTAMPTZ` (Nullable)
  - `metadata JSONB NOT NULL DEFAULT '{}'::JSONB` (Required)
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
- **Indexes:** `idx_memory_user_category (user_id, category)`.

#### 11. `public.tasks`
- **Purpose:** Asynchronous work queue / background jobs (Backend definition) vs User Todo Items (Frontend expectation).
- **Code References:** `api/tasks.js` (lines 32-37, 42-47, 64-69), `tests/rls_security_check.js`.
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`.
- **Foreign Keys:** `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Current Backend Columns (`api/tasks.js` & `schema.sql`):**
  - `id UUID PRIMARY KEY` (Required)
  - `user_id UUID NOT NULL` (Required)
  - `task_type TEXT NOT NULL` (Required)
  - `payload JSONB NOT NULL DEFAULT '{}'::JSONB` (Required)
  - `status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'completed', 'failed'))` (Required)
  - `result JSONB` (Nullable)
  - `error TEXT` (Nullable)
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
- **NOTE ON FRONTEND COLLISION:** The frontend `public/app.js` attempts to send `{ title, priority, due_date, is_completed }`. A design decision is required (see Section 17 & 20).

#### 12. `public.scheduled_jobs`
- **Purpose:** Reminders, calendar action tracking, and recurring cron jobs.
- **Code References:** `api/schedule.js` (lines 43-49, 78-83, 107-119, 123-135), `lib/google/calendar.js` (lines 53-59), `tests/rls_security_check.js`.
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`.
- **Foreign Keys:** `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Columns & Data Types:**
  - `id UUID PRIMARY KEY` (Required)
  - `user_id UUID NOT NULL` (Required)
  - `title TEXT NOT NULL` (Required)
  - `schedule_cron TEXT` (Nullable, standard 5-part cron)
  - `next_run TIMESTAMPTZ NOT NULL` (Required)
  - `payload JSONB NOT NULL DEFAULT '{}'::JSONB` (Required)
  - `status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled'))` (Required)
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
- **Indexes:** `idx_scheduled_jobs_due (status, next_run ASC)`.

#### 13. `public.audit_events`
- **Purpose:** Immutable audit trail for all security-sensitive actions (logins, OAuth binds, chat messages, file uploads, schedule alterations).
- **Code References:** `lib/audit.js` (lines 21-30), `tests/rls_security_check.js`.
- **Primary Key:** `id UUID DEFAULT gen_random_uuid()`.
- **Foreign Keys:** `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
- **Columns & Data Types:**
  - `id UUID PRIMARY KEY` (Required)
  - `user_id UUID NOT NULL` (Required)
  - `action TEXT NOT NULL` (Required, e.g. `'auth.login'`, `'drive.upload'`, `'chat.message'`)
  - `resource TEXT` (Nullable, e.g. `'profiles'`, `'documents'`, `'connections'`)
  - `details JSONB NOT NULL DEFAULT '{}'::JSONB` (Required)
  - `ip_address TEXT` (Nullable)
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` (Required)
- **Indexes:** `idx_audit_events_user (user_id, created_at DESC)`.

---

## 6. Database Query Map

The following map traces every single database query executed across the entire NAD JARVIS codebase:

| Code Location | Target Table | Operation | Columns Used / Modified | Filters & Constraints | Expected Response |
|---|---|---|---|---|---|
| `api/auth.js:56-63` | `profiles` | `upsert` | `id, email, full_name, nickname, is_owner, updated_at` | `onConflict: 'id'` | Null/Error check |
| `api/auth.js:99-103` | `profiles` | `select` | `*` | `.eq('id', auth.user.id).single()` | Single profile record |
| `api/chat.js:46-50` | `conversations` | `insert` | `user_id, title` | None | `{ id }` (single) |
| `api/chat.js:58-64` | `messages` | `insert` | `conversation_id, user_id, role, content` | None | Null/Error check |
| `api/chat.js:69-75` | `messages` | `select` | `role, content` | `.eq('conversation_id', activeConvId).order('created_at').limit(10)` | Array of 10 messages |
| `api/chat.js:100-114` | `messages` | `insert` | `conversation_id, user_id, role, content, provider, model, metadata` | None | Null/Error check |
| `api/conversations.js:24-29` | `messages` | `select` | `*` | `.eq('conversation_id', conversationId).order('created_at')` | Array of messages |
| `api/conversations.js:38-43` | `conversations` | `select` | `*` | `.order('updated_at', { ascending: false }).limit(50)` | Array of 50 conversations |
| `api/files.js:33-38` | `documents` | `select` | `*` | `.eq('id', fileId).single()` | Single document record |
| `api/files.js:89-102` | `documents` | `insert` | `user_id, title, storage_path, mime_type, size_bytes, metadata, indexing_status` | None | Single document record |
| `api/memory.js:21-25` | `memory_items` | `select` | `*` | `.order('created_at', { ascending: false })` | Array of memory items |
| `api/memory.js:55-68` | `memory_items` | `update` | `category, key, value, is_approved, approved_at, updated_at` | `.eq('id', id).select('*').single()` | Updated single memory item |
| `api/memory.js:73-85` | `memory_items` | `insert` | `user_id, category, key, value, is_approved, approved_at` | None | Single new memory item |
| `api/schedule.js:43-49` | `scheduled_jobs` | `select` | `*` | `.eq('status', 'active').lte('next_run', nowIso).order('next_run')` (+ `.eq('user_id', userId)`) | Array of due jobs |
| `api/schedule.js:78-83` | `scheduled_jobs` | `select` | `*` | `.neq('status', 'cancelled').order('next_run')` | Array of active jobs |
| `api/schedule.js:107-119` | `scheduled_jobs` | `update` | `title, schedule_cron, next_run, payload, updated_at` | `.eq('id', id).select('*').single()` | Updated single job |
| `api/schedule.js:123-135` | `scheduled_jobs` | `insert` | `user_id, title, schedule_cron, next_run, payload, status` | None | Single new job |
| `api/tasks.js:32-37` | `tasks` | `select` | `*` | `.eq('id', taskId).single()` | Single task record |
| `api/tasks.js:42-47` | `tasks` | `select` | `*` | `.order('created_at', { ascending: false }).limit(20)` | Array of 20 tasks |
| `api/tasks.js:64-69` | `tasks` | `insert` | `user_id, task_type, payload, status` | None | Single enqueued task |
| `lib/audit.js:29` | `audit_events` | `insert` | `user_id, action, resource, details, ip_address` | None | Null/Error check |
| `lib/router.js:65-76` | `provider_usage` | `insert` | `user_id, provider, model, endpoint, prompt_tokens, completion_tokens, latency_ms, is_fallback, fallback_reason, error` | None | Null/Error check |
| `lib/google/drive.js:20-25` | `drive_sources` | `select` | `*` | `.eq('user_id', auth.user.id).limit(1).single()` | Single drive source |
| `lib/google/drive.js:27-31` | `documents` | `select` | `*` | `.eq('user_id', auth.user.id).limit(20)` | Array of 20 documents |
| `lib/google/drive.js:58` | `documents` | `select` | `*` | `.eq('id', fileId).single()` | Single document record |
| `lib/google/drive.js:96-101` | `documents` | `insert` | `user_id, title, storage_path, indexing_status` | None | Single document record |
| `lib/google/calendar.js:53-59` | `scheduled_jobs` | `insert` | `user_id, title, next_run, payload, status` | None | Null/Error check |
| `lib/google/oauth.js:88-97` | `connections` | `upsert` | `user_id, provider, account_identifier, status, encrypted_refresh_token, scopes, metadata, updated_at` | `onConflict: 'user_id,provider'` | Null/Error check |
| `lib/google/oauth.js:100-105` | `drive_sources` | `upsert` | `user_id, nickname, folder_id, scope_granted` | `onConflict: 'user_id,nickname'` | Null/Error check |
| `lib/google/oauth.js:136-140` | `connections` | `select` | `id, provider, account_identifier, status, scopes, metadata, created_at, updated_at` | `.eq('user_id', auth.user.id)` | Array of connections |
| `lib/google/oauth.js:145-149` | `drive_sources` | `select` | `*` | `.eq('user_id', auth.user.id)` | Array of drive sources |

---

## 7. Google OAuth & Connections Audit

### 7.1 OAuth Lifecycle & Token Management
1. **OAuth Initiation (`/api/google/oauth?action=start`):**
   - Handled in `lib/google/oauth.js:buildOAuthStartResponse`.
   - Requires verified owner Bearer token.
   - Generates consent URL using `GOOGLE_CLIENT_ID`, `GOOGLE_REDIRECT_URI`, and sets `state: auth.user.id`.
   - Scopes requested:
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Access parameters: `access_type=offline`, `prompt=consent` (forces refresh token generation).
2. **OAuth Callback (`/api/google/oauth?action=callback` / `/api/google/oauth/callback`):**
   - Handled in `lib/google/oauth.js:handleOAuthCallback`.
   - Server receives authorization `code` and `state` (owner user ID).
   - Server-side `fetch('https://oauth2.googleapis.com/token')` exchanges code using `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
   - **Client secrets and refresh tokens are strictly confined to the server.**
3. **Database Persistence:**
   - Upserted into `connections`:
     - `user_id`: owner UUID from OAuth `state`.
     - `provider`: `'google'`.
     - `account_identifier`: owner email (`uwabatonadjibullah@gmail.com`).
     - `status`: `'connected'`.
     - `encrypted_refresh_token`: Google refresh token (plain text string currently — encryption key not yet configured).
     - `scopes`: array of granted scopes.
     - `metadata`: `{ token_type, expires_in, connected_at }`.
   - Upserted into `drive_sources`:
     - `nickname`: `"Nad's Google Drive"`.
     - `folder_id`: `'root'`.
     - `scope_granted`: `'drive.readonly'`.

### 7.2 Consolidated Workspace Endpoint (`/api/google/workspace`)
- Dispatches by query parameter `?action=`:
  - `accounts.list` -> `listConnectedAccounts()`
  - `drive.list` -> `listDriveFiles()`
  - `drive.read` -> `readDriveFile()`
  - `drive.upload` -> `uploadToDrive()` (enforces confirmation)
  - `calendar.list` -> `listCalendarEvents()`
  - `calendar.create` -> `createCalendarEvent()` (enforces confirmation)
  - `gmail.read` -> `readGmailMessage()`
  - `gmail.search` -> `searchGmail()`

### 7.3 Multi-Account & Workspace Capabilities Evaluation
- **Multiple Accounts:** The UI shows an "Add Account" button, but the backend stores external accounts keyed by `(user_id, provider)`. Connecting a second Google account will currently overwrite the existing one unless the schema and code are modified to key on `(user_id, account_identifier)`.
- **Account Nicknames:** Supported via `drive_sources.nickname`.
- **Drive Readiness:** High. Lists indexed document fallbacks, parses metadata, and writes audit logs.
- **Calendar Readiness:** High. Automatically mirrors events into `scheduled_jobs`.
- **Gmail Readiness:** Read-only / placeholder search stage.

---

## 8. Files & Storage Audit

### 8.1 Supabase Storage Configuration
- **Expected Bucket:** `'documents'`
- **Public vs Private:** **Private** (`public = FALSE`).
- **File Upload Path:** `${userId}/${Date.now()}_${safeTitle}`
- **Signed URLs:** Implemented in `api/files.js:46-50`:
  ```javascript
  const { data: signedData } = await client.storage
    .from('documents')
    .createSignedUrl(document.storage_path, 900);
  ```
  Generates a secure 15-minute (900 seconds) download URL.

### 8.2 Database Integration (`documents` table)
Every file uploaded via `POST /api/files` creates a pointer record:
- `user_id`: owner UUID.
- `title`: sanitized filename.
- `storage_path`: path in the `'documents'` bucket.
- `mime_type`: uploaded MIME type (defaults to `'text/plain'`).
- `size_bytes`: exact byte length.
- `indexing_status`: initialized to `'indexed'`.

### 8.3 Storage RLS Policies Required
As defined in `supabase/schema.sql`:
```sql
CREATE POLICY "Owner document storage access" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1])
    WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```
This isolates file access to folders matching the owner's `auth.uid()`.

---

## 9. Knowledge / RAG Audit

### 9.1 Implemented in Current Code vs Planned
- **Implemented:**
  - Rich personal profile database hardcoded in `lib/knowledge.js` (`PERSONAL_KNOWLEDGE_BASE`) containing Nad's engineering degree, SAEV solar capstone details, filmmaking projects, weekly prayer/worship rhythm, and long-term vision.
  - Dynamic prompt generator (`generateSystemPrompt(ragContext = '')`) which formats the owner's biography and injects it into every chat session in `api/chat.js`.
- **PLANNED / FUTURE ONLY (Not Implemented):**
  - **pgvector extension:** Not enabled; not in dependencies.
  - **Vector Embeddings:** Zero embedding models (OpenAI `text-embedding-3`, HuggingFace, etc.) are called.
  - **Chunking Pipeline:** No chunking logic exists.
  - **Vector Similarity Search:** No `match_documents` or cosine distance RPC functions exist.
  - **Drive File Indexing:** Files listed from Drive are not parsed or vector-indexed.

---

## 10. Memory Audit

### 10.1 Memory Structure
- **Table:** `memory_items`
- **Ownership:** Scoped to owner's `user_id`.
- **Columns:** `category`, `key`, `value`, `is_approved`, `approved_at`, `metadata`.
- **Approval Logic:** In `api/memory.js`, saving or updating durable memory strictly requires `confirmedByOwner === true`. If false, the server returns `403 pending_confirmation`.
- **Vector Search / Embeddings:** **NONE.** Memory retrieval is standard SQL text retrieval via `.select('*').order('created_at', { ascending: false })`.
- **Automatic Extraction:** Not implemented in backend. Memory items must be explicitly posted to `/api/memory`.
- **Frontend Disconnect:** In `public/app.js:1641-1658`, `loadMemoryItems()` injects hardcoded static HTML cards rather than calling `JarvisAPI.getMemory()`.

---

## 11. Tasks & Schedule Audit

### 11.1 Scheduled Jobs Architecture
- **Table:** `scheduled_jobs`
- **Query Mechanism:**
  - Normal UI: `GET /api/schedule` returns jobs ordered by `next_run`.
  - Background Cron Execution: Handled via `GET /api/schedule?due=1` (or path rewrite `/api/schedule/due` in `vercel.json`).
  - Secure Cron Trigger: Verifies header `x-cron-secret === process.env.CRON_SECRET`. If verified, it uses `getSupabaseAdmin()` to query all due jobs where `status = 'active'` and `next_run <= NOW()`.
- **Recurrence:** `schedule_cron` column stores standard 5-part cron syntax.

### 11.2 The Tasks Architectural Disconnect
- **Backend (`api/tasks.js`):** Implements an asynchronous worker queue. Expects `POST /api/tasks` with `{ taskType, payload }`, storing `task_type` and `status: queued`.
- **Frontend (`public/app.js`):** Implements a personal Todo checklist with priority filters (`all`, `pending`, `completed`), sending `{ id, title, priority, due_date, is_completed }`.
- **Result:** Calling `POST /api/tasks` from the UI fails with `400 Missing taskType`. This requires a design decision (Section 17 & 20).

---

## 12. AI Provider Configuration

### 12.1 Provider & Router Architecture
- **Storage Location:** All AI provider credentials and configurations live **exclusively in server-side environment variables**, NOT in the database.
- **Adapters:**
  1. **NVIDIA NIM (`lib/adapters/nvidia.js`):**
     - Base URL: `https://integrate.api.nvidia.com/v1`
     - Model: `meta/llama-3.2-90b-vision-instruct`
     - Capabilities: Reasoning, planning, tool calling, vision support.
  2. **DeepSeek (`lib/adapters/deepseek.js`):**
     - Base URL: `https://api.deepseek.com/v1`
     - Model: `deepseek-chat` (DeepSeek V3)
     - Capabilities: Fast, low-cost conversational chat.
- **Router Logic (`lib/router.js`):**
  - Classifies user messages into: `coding`, `action`, `reasoning`, `rewrite`, or `general_chat`.
  - Assigns Primary and Fallback adapters.
  - If Primary fails, automatically attempts Fallback.
  - Logs latency, tokens, and fallback reasons to `public.provider_usage`.
- **Database Tables `providers` and `models`:** Defined in `supabase/schema.sql`, but completely bypassed by the runtime router.

---

## 13. Environment Variables Inventory

| Variable Name | Purpose | Used By | Scope | Required? | Secret? |
|---|---|---|---|---|---|
| `SUPABASE_URL` | Supabase Project API URL | `lib/supabase.js`, `tests/` | Server / Test | **Required** | No |
| `SUPABASE_PUBLISHABLE_KEY` | Modern Supabase Publishable Key (Anon) | `lib/supabase.js`, `tests/` | Server / Test | **Required** | No |
| `SUPABASE_SECRET_KEY` | Modern Supabase Secret Key (Service Role) | `lib/supabase.js` | Server-side only | **Required** | **YES** |
| `OWNER_EMAIL` | Single-owner email identifier | `lib/auth.js`, `api/auth.js` | Server-side only | **Required** | No |
| `OWNER_USER_ID` | Single-owner Supabase Auth UUID | `lib/auth.js`, `oauth.js` | Server-side only | **Required** | No |
| `NVIDIA_NIM_API_KEY` | API Key for NVIDIA NIM LLM inference | `lib/adapters/nvidia.js` | Server-side only | **Required** | **YES** |
| `DEEPSEEK_API_KEY` | API Key for DeepSeek LLM inference | `lib/adapters/deepseek.js`| Server-side only | Optional / Fallback | **YES** |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID | `lib/google/oauth.js` | Server-side only | **Required** | No |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret | `lib/google/oauth.js` | Server-side only | **Required** | **YES** |
| `GOOGLE_REDIRECT_URI` | Google OAuth Redirect Target URI | `lib/google/oauth.js` | Server-side only | Optional (auto-computed) | No |
| `CRON_SECRET` | Secret token to authorize Vercel cron | `api/schedule.js` | Server-side only | Optional | **YES** |

*Note: No secrets or environment variables are bundled into or exposed to the client.*

---

## 14. Security Audit

1. **Row-Level Security (RLS):** Every client-reachable table is protected by RLS. The test suite `tests/rls_security_check.js` confirms that unauthenticated requests to any of the 11 core tables are blocked or return empty results.
2. **Service Key Protection:** `SUPABASE_SECRET_KEY` is loaded only in `lib/supabase.js:getSupabaseAdmin()` on the server. It is never transmitted to the client.
3. **Owner Identity Integrity:** `verifyOwnerSession()` validates the user's JWT cryptographically and verifies that `user.id === OWNER_USER_ID` or `user.email === OWNER_EMAIL`.
4. **Google Tokens:** Refresh tokens and access tokens are stored in the server-side `connections` table. They are stripped from the response in `listConnectedAccounts()`, preventing client leakage.
5. **Rate Limiting:** Sliding-window rate limiting is implemented via `lib/rateLimit.js` on `/api/auth` (5/min), `/api/chat` (30/min), and `/api/google/workspace` (60/min).
6. **Confirmation Step for Destructive Actions:** Uploading to Drive and creating Calendar events return `confirmation_required` if `confirmed: true` is not explicitly supplied in the request body.

---

## 15. RLS Policy Requirements

Based on actual backend usage, the following RLS policies are required:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | `auth.uid() = id` | Service Role / Admin | `auth.uid() = id` | `auth.uid() = id` |
| `conversations` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `messages` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `providers` | `TRUE` (Authenticated) | Service Role only | Service Role only | Service Role only |
| `models` | `TRUE` (Authenticated) | Service Role only | Service Role only | Service Role only |
| `provider_usage` | `auth.uid() = user_id` | Service Role / Admin | Service Role only | Service Role only |
| `connections` | `auth.uid() = user_id` | Service Role / Admin | Service Role / Admin | `auth.uid() = user_id` |
| `drive_sources` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `documents` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `memory_items` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `tasks` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `scheduled_jobs` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` | `auth.uid() = user_id` |
| `audit_events` | `auth.uid() = user_id` | Service Role / Admin | DENY ALL | DENY ALL |

---

## 16. Supabase Extensions

1. **`uuid-ossp` or `pgcrypto`:** **STRICTLY REQUIRED.** All 11 tables utilize `gen_random_uuid()` for primary key generation.
2. **`pgvector`:** **NOT CURRENTLY REQUIRED.** No vector operations or vector data types exist in current backend code. Should only be enabled if full RAG chunking is developed in the future.

---

## 17. Missing / Incomplete Implementation

The codebase exhibits several divergences between what the frontend renders and what the backend implements:

### A. Fully Implemented & Working
- Single-owner password login and profile provisioning.
- Multi-turn conversational chat with conversation auto-creation.
- AI Router with NVIDIA NIM (Llama 3.2 90B) and DeepSeek fallbacks.
- Provider usage logging with latency, token counting, and fallback triggers.
- Google OAuth 2.0 authorization URL building, callback handling, and server-side token storage.
- Private document upload to Supabase Storage with signed download URL generation.
- Audit event logging across all critical endpoints.
- Rate limiting middleware.

### B. Partially Implemented
- **Google Workspace Services:** Dispatch works, but Drive reading uses mock text pointers, and Calendar creation requires confirmation that the frontend modal does not send.
- **Scheduled Jobs:** Jobs can be created, updated, and queried when due, but no external cron schedule is currently configured in Vercel to invoke `/api/schedule/due`.

### C. Frontend-Only / Placeholders
- **Settings Knowledge Tab (`loadKnowledgeDocs`):** Statically renders two hardcoded documents labeled `"Indexed (pgvector)"`. Does not query `/api/files` or Supabase.
- **Settings Memory Tab (`loadMemoryItems`):** Statically renders four hardcoded memory items. Does not query `/api/memory`.
- **Search Chat Page (`executeSearch`):** Hardcoded substring matching against static mock conversations. Does not query the `messages` table.

### D. Backend-Only (No Frontend UI Hook)
- **AI Diagnostics:** `POST /api/providers?action=route` and `GET /api/providers` (health check) are fully functional on the server, but have no diagnostic panel in the UI.
- **Due Job Cron Trigger:** `GET /api/schedule?due=1` with `x-cron-secret` is ready on the server, but requires Vercel Cron setup.

### E. Missing Features & Endpoint Discrepancies
- **`DELETE /api/conversations`:** Called by `JarvisAPI.deleteConversation(id)`, but `api/conversations.js` rejects non-GET requests with `405 Method Not Allowed`.
- **`POST /api/conversations`:** Called by `JarvisAPI.createConversation(title)`, but `api/conversations.js` returns `405`.
- **`PATCH /api/tasks` & `DELETE /api/tasks`:** Called by frontend task toggle/delete, but `api/tasks.js` only handles GET and POST.
- **`GET /api/files` (listing):** Called by `JarvisAPI.getFiles()`, but `api/files.js` demands `?id=<uuid>`, throwing `400 Missing file id`.

### F. Critical Bugs Requiring Direct Fixes in Blueprint
- **Unique Constraints on `connections` & `drive_sources`:** Missing in `schema.sql`, causing upsert crashes during Google OAuth.
- **Tasks Schema Inversion:** Background queue (`task_type`) vs User Todo checklist (`title`, `priority`, `due_date`, `is_completed`).

---

## 18. Vercel Function Structure

The API adheres to Vercel Serverless Function architecture:

```
api/
├── auth.js               --> /api/auth
├── chat.js               --> /api/chat
├── conversations.js      --> /api/conversations
├── files.js              --> /api/files
├── memory.js             --> /api/memory
├── providers.js          --> /api/providers
├── schedule.js           --> /api/schedule
├── tasks.js              --> /api/tasks
└── google/
    ├── oauth.js          --> /api/google/oauth
    └── workspace.js      --> /api/google/workspace
```

### Vercel Serverless Count:
Vercel detects exactly **10 serverless functions** from this directory tree.  
Rewrites in `vercel.json` map `/api/google/oauth/callback` to `api/google/oauth.js` and `/api/schedule/due` to `api/schedule.js` without generating extra functions.

---

## 19. Final Supabase Implementation Blueprint

When creating the Supabase project configuration, execute in the following 10 phases:

### PHASE 1 — Authentication
- Enable Email/Password Auth provider in Supabase.
- Confirm owner user exists in `auth.users` with UUID matching `OWNER_USER_ID`.
- Disable public user sign-ups in Supabase Auth settings (`Disable signup`).

### PHASE 2 — Core Database
- Execute DDL for `profiles`, `conversations`, and `messages`.
- Verify Foreign Key cascade deletions from `auth.users(id)` and `conversations(id)`.
- Create composite indexes on `messages(conversation_id, created_at)` and `conversations(user_id, updated_at DESC)`.

### PHASE 3 — Storage
- Create private bucket: `documents` (`public = FALSE`).
- Apply storage policy on `storage.objects` restricting `(storage.foldername(name))[1] = auth.uid()::text`.

### PHASE 4 — Google Connections & Audit Tables
- Create `connections` with mandatory constraint: `UNIQUE (user_id, provider)`.
- Create `drive_sources` with mandatory constraint: `UNIQUE (user_id, nickname)`.
- Create `audit_events` with indexing on `(user_id, created_at DESC)`.

### PHASE 5 — Knowledge & Documents
- Create `documents` table referencing `drive_sources(id)`.
- Defer pgvector installation until an embedding pipeline is actively built.

### PHASE 6 — Memory
- Create `memory_items` table.
- Enforce check on `is_approved`.

### PHASE 7 — Tasks & Schedule
- Create `scheduled_jobs` with composite index `(status, next_run ASC)`.
- Resolve `tasks` table schema conflict (either add todo columns or create a dedicated `todo_items` table).

### PHASE 8 — RLS & Security
- Enable Row-Level Security on all tables.
- Apply `auth.uid() = user_id` policies for authenticated role.
- Run `node tests/rls_security_check.js` to certify 100% policy pass rate.

### PHASE 9 — Environment Variables
- Ensure production Vercel project has all 8 required environment variables configured.

### PHASE 10 — Verification & Smoke Testing
- Run auth session verification, chat completion flow, document upload test, and Google OAuth flow.

---

## 20. Questions That NAD JARVIS Owner Must Answer Before Supabase Implementation

1. **Tasks Architecture Conflict:**
   *Should the `tasks` table be a User Todo / Checklist system (`title`, `priority`, `due_date`, `is_completed`) as rendered by the UI, or an Asynchronous AI Background Worker Queue (`task_type`, `payload`, `status: queued`) as defined by the backend code? Or should both exist (e.g. `todo_items` for the UI and `background_tasks` for the AI)?*
2. **Knowledge & RAG Strategy:**
   *Should Knowledge continue to use the current fast, deterministic in-memory system prompt profile, or should we install the `pgvector` extension, define an embeddings model (e.g., OpenAI or NVIDIA NeMo Retriever), and build a true chunking/embedding pipeline for uploaded files?*
3. **Google Calendar Contract Alignment:**
   *Should the Calendar modal in the UI be updated to submit `{ title, date, time, confirmed: true }` matching the backend contract, or should the backend adapter be updated to accept the frontend's `{ summary, start: { dateTime }, end: { dateTime } }` shape?*
4. **UI Disconnect on Memory & Knowledge:**
   *Should the static mockup cards on the Memory and Knowledge settings pages be rewired to fetch live records from `/api/memory` and `/api/files`?*
5. **Multiple Google Accounts:**
   *Will you ever need to connect more than one Google account simultaneously? If yes, the database constraint on `connections` must be `UNIQUE (user_id, account_identifier)` rather than `UNIQUE (user_id, provider)`.*
6. **External Scheduler (Cron):**
   *Do you want Vercel Cron configured in `vercel.json` to automatically ping `/api/schedule/due` every 15 minutes to trigger active reminders?*

---

## 21. Recommended Implementation Order

1. **Answer Design Questions** (Tasks, Calendar, RAG).
2. **Apply Database DDL with Required Unique Constraints:**
   - Add `UNIQUE (user_id, provider)` to `connections`.
   - Add `UNIQUE (user_id, nickname)` to `drive_sources`.
3. **Provision the Supabase Storage Bucket (`documents`).**
4. **Configure All RLS Policies and run `npm run test:rls`.**
5. **Fix Endpoint Method Gaps** (`DELETE /api/conversations`, `PATCH /api/tasks`, etc.).
6. **Synchronize Frontend Services with Backend Schema.**
7. **Deploy and Run Live End-to-End Verification.**
