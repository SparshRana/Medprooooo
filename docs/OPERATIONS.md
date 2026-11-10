# Operating model and release requirements

Start with families managing regular medicines for an older relative, supported by one pharmacy. Pharmacy acceptance and willingness to pay remain hypotheses. Do not sell patient data.

The maintainer owns source retrieval, coverage checks, corrected findings, signed updates and incident handling. The hosting operator owns credentials, migrations and recovery. A registered professional must review clinical content and make treatment decisions. Operator verification of registration is required before enabling a professional account; self-verification is prohibited by database permissions.

Use a new Supabase project for this copy. Apply supabase/schema.sql and configure .env.example through hosting settings. Never copy another deployment's secrets. The private service-role and email keys belong only in the trusted worker environment.

Account-scoped local cabinets are separate. Guest entries are not silently moved into accounts; export and explicitly import them if desired. Browser storage is not encrypted at rest. Signed-out account copies remain until removed. Shared-device users should use protected browser profiles and encrypted exports, then remove local copies.

Case sharing projects only one pack and question, excluding photos and private cabinet notes. Grants expire and can be revoked. The audit records explicit app case opens and professional submissions, not all database or device access.

Monitoring is disabled until repository variable MEDPRO_MONITORING_ENABLED=true and private secrets SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY and MEDPRO_ALERT_FROM are configured. The app needs its corresponding environment settings. Verify test-account delivery before activation. Current source retrieval must succeed before monitoring; stale snapshots stop the worker. Historical frontend matches remain dated.

The delivery ledger uses finding fingerprints, leases, provider idempotency and retry status. Ambiguous deliveries older than 23 hours require operator review. Provider acceptance is not inbox receipt or reading. Acknowledgement is explicit. Optional caregiver escalation waits 24 hours and requires a current, pack-specific alert grant. No SMS, WhatsApp or browser-push delivery is claimed. GitHub schedules may be delayed; choose a dedicated host if guaranteed timing is required.

Test duplicate workers, source failures, revoked grants and stale snapshots in an isolated account. Monitor job failures without logging recipient addresses, tokens or medical data.

For signed updates, generate Ed25519 keys on a trusted publishing host. Configure the raw base64 public key as NEXT_PUBLIC_ALERT_SIGNING_KEY and the private PEM as MEDPRO_ALERT_SIGNING_PRIVATE_KEY on the trusted signer only. Run pnpm alerts:sign. Import rejects tampering, older versions, future publication dates and non-official sources. A valid signature proves origin/integrity, not medicine quality.

No current government MRP, stock or approved interchangeability is claimed. Illustrative prices are confined to fictional demos. Reviewed price collection is still needed; lib/prices.ts gates exact formulations, quantity, date and price type.

ABDM integration and certification have not occurred. Review current official integration requirements before undertaking them. Clinical content and translations require professional review before use in care.

Run pnpm typecheck, pnpm test, pnpm build and pnpm evaluate. The deterministic identity challenge is not independent clinical validation. See PILOT.md for unperformed real-user work.

Measure hosting/OCR bandwidth, database use, email cost, storage and refresh failures before quoting operating costs or return on investment. No costs or outcomes are invented.
