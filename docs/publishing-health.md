# Publishing Health and safe recovery

## Architecture and API

BullMQ remains the executor and the existing LinkedIn publisher remains the only public-create implementation. The existing five-minute reconciliation tick now also dispatches durable generation intents. Startup dispatches pending intents. The old daily recovery entry point delegates to the same reconciler; it no longer resets failed posts or retry counters.

Authenticated routes under `/api/publishing-health`:

- `GET /summary`: mutually exclusive counts, server `asOf` and reporting-window definition.
- `GET /incidents`: page (20 records), status, stage, mode, from/to (updatedAt) filters; latest failure first.
- `GET /posts/:postId`: safe lifecycle DTO, server eligibility and latest activity.
- `GET /posts/:postId/history`: newest-first paginated activity.
- `POST /posts/:postId/retry-generation`: no body fields; atomic generation recovery request.
- `POST /posts/:postId/reconcile-schedule`: no body fields; restores the current safe future schedule using existing reconciliation logic.

Owner identity comes only from the session. Queries and claims include that owner. Missing and cross-account posts return the same 404. IDs, pagination, enum filters, dates and mutation bodies are validated. Responses use no-store. Mutations have a session throttle; generation additionally has an atomic per-post cooldown and limit. Do not expose Bull Board to ordinary accounts.

Summary covers **all retained posts**, created no later than the returned `asOf`. Future queued posts count only as scheduled; other queued posts count only as queued. `posted` maps to published. Drafts, generating and publishing have separate backend buckets. Existing post TTL means this is not a lifetime analytics counter. List date filters use updatedAt, not createdAt or lastFailedAt; filtering does not change the all-retained summary. Summary and incidents are separate reads, not a cross-endpoint snapshot.

## Schema and retention

Optional additive GeneratedPost fields: errorCode, lastRecoveryAt, recoveryIntent (id/state/requestedAt), generationJobId, generationRunId, activity. Missing fields remain compatible with old records. Account ownership is immutable in the schema. Existing statuses and TTL/unique indexes remain intact. New indexes: `{linkedinMemberUrn:1,status:1,lastFailedAt:-1}` and `{'recoveryIntent.state':1}`.

Activity is embedded, account-scoped through its post, and bounded to the latest 100 events per post. It expires with the post under the existing TTL policy; drafts retain at most 100 events until removed. API history pages contain 20 events. Event metadata is limited to fixed event/stage/actor values and server-generated timestamps. No polling events, provider messages, prompts, tokens or exception objects are stored in activity. Old records have no invented history. Activity is not an independent compliance archive.

Lifecycle and activity changes use the same Mongo document update. Generation text persistence and completion are separate conditional writes; generationRunId fences stale worker writes. Recovery acceptance and queue enqueue cannot be transactional across Mongo and Redis: pending intent is the outbox, and reconciliation repeats enqueue with the same deterministic ID. Failed queue jobs are never reset to bypass limits. Pending intents stay pending during Redis outages. Interrupted running intents become failed only after 30 minutes and proof that their BullMQ job is missing or terminal. Active/waiting/delayed jobs are preserved.

## Eligibility and duplicate protection

Manual failure recovery requires an owned draft/failed post, AI failed stage, no published URN, no public-create timestamp, no pending/running intent, fewer than three historical recovery attempts, and a 60-second cooldown. The atomic claim rechecks owner, status, failed stage, attempt counter, cooldown and intent state. Accepted requests increment the existing counter, preserve topic/article/custom prompt/owner and do not reset failed state before execution. Repeated requests while pending return accepted without adding another job. A known existing active initial job blocks recovery; other legacy jobs cannot claim an intent-owned post.

Initial Studio generation and explicit draft regeneration also use durable intents. Regeneration preserves its existing intent to replace draft text and writing instructions, and refuses posts already recovering. These ordinary Studio actions do not reset or increment failure-recovery counters.

Schedule reconciliation rechecks persisted owner/status/version/time and uses a deterministic versioned job ID. Compatible legacy delayed jobs are reused. Concurrent enqueues deduplicate in BullMQ. Cancellation/rescheduling increments scheduleVersion and workers reject stale versions. Reconciliation does not modify a cancelled draft or already attempted/published post.

The LinkedIn worker only claims due queued posts with no public-create marker or published URN. It stores publishAttemptedAt before the external create request; the marker is never cleared. Failures after that boundary enter review_required and never retry automatically. Database persistence failure after external success also enters review_required, or remains publishing until interrupted-publishing reconciliation quarantines it if Mongo is unavailable. Pre-create failures may use the existing BullMQ retry policy; failed historical records are not blindly reclaimed. No manual Retry Publish or safety bypass is provided. A result reconciliation procedure is deliberately not provided because no authoritative external evidence lookup exists here.

Image generation remains optional and HTTP 402/provider failure preserves successful text with a nonfatal activity warning. This application has no explicit image-required option. Diagnostics use fixed strings and structured error codes; legacy raw errors are omitted from health DTOs. Groq provider errors are no longer logged or rethrown with provider payloads. Logs use post/job identifiers, not high-cardinality metrics. No Prometheus infrastructure was found or introduced.

## Deployment and rollback

1. Use isolated MongoDB and Redis and mock LinkedIn/Groq. Do not point tests at production credentials.
2. Review additive indexes and create them through the existing deployment index procedure. Do not run syncIndexes/drop/reset or queue cleanup.
3. Stop/drain old AI workers before enabling intent-producing APIs. Deploy new compatible workers/reconciler first, then API, then frontend. This repository starts APIs/workers together; use a maintenance rollout if they cannot be deployed separately. Mixed old/new AI workers are unsafe because old workers do not recognize intents or fencing fields.
4. Preserve all MongoDB and Redis data, sessions, attempts, timestamps, and retained jobs. Existing jobs remain compatible with the new worker when they have their original owner/version payload.
5. Verify existing Mongo URI, Redis connection, session secret/store, FRONTEND_ORIGIN, VITE_API_URL, GROQ_API_KEY and LinkedIn configuration through secret management; no new env vars are required. Do not print values.
6. Restart an isolated worker during generation, after intent persistence/before enqueue, and after the LinkedIn create boundary (mocked). Verify reconciliation and quarantine.
7. Deploy the frontend only after the health endpoints are available. No production deployment was performed by this task.

Rollback: frontend can be rolled back independently. Do not roll back workers to versions that reset failed posts, ignore recovery intents, or lack public-create guards while pending/running intents exist. Drain or explicitly resolve them using reviewed operational evidence first. Retain additive fields and indexes. Never clear publishAttemptedAt/review_required or reset recovery counters during rollback.

## Manual verification checklist

- Connect two test accounts; confirm OAuth name/avatar/expiry and logout behavior; verify every health/list/detail/history/mutation is isolated.
- Verify Sunday fetching and Monday allocation preserve existing automatic schedules and prompts. Confirm Calendar, Analytics, Studio, Publish Now and rescheduling continue to work.
- Mock empty Groq, timeout, image 402 and expired LinkedIn token; verify safe messages and text-only fallback.
- Retry eligible AI failure twice concurrently; verify one deterministic job and one counter increment. Verify prompt/article/topic preservation and eventual completed/failed history.
- Disconnect isolated Redis after recording an intent; restart service and restore Redis; confirm the intent is dispatched without resetting the failed post or losing the request.
- Remove only a disposable test delayed job; reconcile twice; confirm one current job, original future publishAt, correct scheduleVersion. Cancel/reschedule while reconciling and verify stale workers do not publish.
- Mock LinkedIn timeout after beforeCreate and a database failure after successful external response; verify review_required and no second public-create.
- Verify loading, no-post/no-matching states, API outage, session expiry, recovery pending, confirmation, manual refresh, history pagination, filters and mobile/dark/light layouts.
- Switch account while a request is pending; verify previous data disappears immediately and old responses cannot populate the new account. Hide the tab/logout/unmount; verify polling pauses/stops and signals abort.

## Verification limits

Automated checks use mocked external providers. Local Redis was observed refusing connections at 127.0.0.1:6379 during the existing suite. No live MongoDB validation, production queries, real public publishing, destructive migrations, queue cleanup or deployment was performed. Browser/mobile/theme visual review and isolated service restart exercises remain manual deployment gates. Mocked tests alone do not establish production readiness.

## Exact implementation files

Backend:
- src/models/generatedPost.model.js
- src/modules/ai/ai.service.js
- src/modules/publisher/linkedin.publisher.js
- src/queue/recovery.js (removed redundant re-export; server imports the recovery service directly)
- src/queue/workers/ai.worker.js
- src/queue/workers/linkedin.worker.js
- src/routes/studio.routes.js
- src/routes/publishingHealth.routes.js (new)
- src/server.js
- src/services/groq.js
- src/services/imageGenerator.js
- src/services/postScheduling.service.js
- src/services/publishingHealth.service.js (new)
- src/utils/publishingDiagnostics.js (new)
- src/utils/boundedQueue.js (new)
- tests/queue/manualGeneration.test.js
- tests/queue/publishingSafety.test.js
- tests/services/groq.test.js
- tests/queue/publishingHealth.test.js (new)
- tests/queue/scheduleRecovery.test.js (new)
- tests/queue/boundedQueue.test.js (new)
- tests/routes/publishingHealth.routes.test.js (new)

Frontend:
- src/App.jsx
- src/components/layout/Sidebar.jsx
- src/pages/PublishingHealth.jsx (new)
- tests/publishing-health.test.jsx (new)

Documentation: docs/publishing-health.md (this file).

Additional reliability notes: queue calls on recovery/scheduling paths have a five-second response deadline because the shared worker Redis connection otherwise retries requests indefinitely. A timed-out command can still complete later; deterministic IDs and conditional claims make late completion safe. The first queue outage stops the current reconciliation batch and the next tick retries. Session throttling uses the existing session infrastructure; use a shared account-level limiter for strong aggregate limits across independent login sessions. Queue history retention stays unchanged.
- src/components/layout/Header.jsx (Publishing Health breadcrumb)

## Executed validation

- Full backend regression: `npm.cmd test -- --run --maxWorkers=1 --minWorkers=1 --testTimeout=20000 --hookTimeout=60000` in backend: **34 files, 238 tests passed**.
- After final public-create marker acknowledgement/quarantine and AI stage restrictions: worker checks `tests/queue/manualGeneration.test.js tests/queue/publishingSafety.test.js`: **18 tests passed**, including the additional indeterminate-marker-write test. This final extra test was added after the 238-test full run.
- Focused recovery/API/reconciliation suite before that final worker refinement: **6 files, 49 tests passed**, including restart intent dispatch, concurrent claims, retained failed jobs and queue deadlines.
- Full frontend regression with one worker and 20-second test timeout: **7 files, 59 tests passed**. Covers OAuth identity, Studio, calendar, mobile navigation, account switching and the six new health tests.
- Latest frontend `npm.cmd run build`: **passed**, 2447 modules transformed. Existing Browserslist data-age notice remains.
- JavaScript syntax checks and `git diff --check`: passed. No dependency changes were required.
- Initial runs caught outdated error/mutation mocks and an encoding regression; corrected before the successful runs. A cold frontend run also exceeded the default five-second test deadline; the successful full run used a 20-second deadline without changing test assertions.
- Existing backend tests emit Redis ECONNREFUSED for localhost and an existing unawaited model assertion warning. These do not constitute a successful live Redis integration test.

Schedule reconciliation also checks retained terminal jobs (including compatible legacy IDs) and records SCHEDULE_JOB_TERMINAL rather than silently returning a completed/failed queue job or starting a new retry budget. Such failures require operational review; this dashboard offers no unsafe public-publish retry. Before public create, the marker uses majority/journal acknowledgement. An indeterminate marker write is conservatively review-required even if no external create actually began. Verify the deployment's MongoDB write-concern/journaling support in isolation.
- Final API route check after extending stage filters to scheduling/image: **7 tests passed**.
