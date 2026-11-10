# Independent copy: current setup

Start with `.env.example` and `docs/OPERATIONS.md`. The sections below are inherited setup notes. This copy does not use AI-generated treatment or price lookup. Account scopes, case grants, professional verification, monitoring and signed updates are defined by the current `supabase/schema.sql` and operations guide. Apply the full current schema to a separate Supabase project; do not reuse or modify the original deployment.

# MedPro — connected service setup

No accounts, projects, external API keys or live deployment are provisioned in this ZIP. **Do not commit real keys**. Features requiring external providers are visibly disabled until configuration is complete; the local cabinet and scanner remain usable.

## 1. Environment configuration

Create `.env.local` for local development (or use Render Environment settings):

| Variable | Required for | Visibility |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | cloud cabinet, family, sign-in | Public project URL, available at build time |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cloud cabinet, family, sign-in | Public **anon** key; never substitute service-role key |
| `OPENMRP_API_KEY` | optional GTIN-to-product lookup | Private server only |
| `DATABASE_URL` | optional catalogue database cache | Private; Render Blueprint supplies this |

The app's `/api/status` route reports boolean availability only and never emits keys. Empty configuration doesn't make the whole site unusable. In Render, rebuilding is necessary after changing `NEXT_PUBLIC_*` variables.

## 2. Supabase account and family setup

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Enable email/password sign-up and confirmation. Configure the actual production Site URL / redirect URLs and SMTP if needed.
3. Deploy with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Confirm two independent user accounts. In the cabinet page, sign in and explicitly **Save to cloud**. Sign in on another device and choose **Load cloud cabinet**.
5. In Family circle, grant a confirmed account by its email, write a message, then refresh the recipient's inbox after they sign in.
6. Revoke permission and verify the recipient can no longer read new or old messages from the API. Already read content cannot be taken back from a person's memory or an already-open client.

**Apply the current supabase/schema.sql before using cloud saves.** Cloud load merges device and remote records. Save requires conflict review and uses a revision-checked RPC. Device edits after review and simultaneous remote edits stop the save rather than silently overwriting them. Sign-out keeps device-local entries and leaves saved cloud records on the server. Local entries are shared within this browser, not isolated by account. Cabinet data is **never** shared by family permissions. Family sharing is in-app only and manual, not proactive regulatory alerting.

## 3. India-specific medicine data and official alerts

Medicine-name search queries are sent to the [Drug Information Service](https://drugdb.in/), which attributes its catalogue to India's Common Drug Codes / NRCeS/C-DAC. The optional [OpenMRP provider](https://openmrp.in/developers) maps some barcodes to products if you obtain its key; product records may be incomplete or outdated. Always verify the physical pack.

MedPro's India alerts page links to two official sources:

- [CDSCO public NSQ and spurious-drug portal](https://cdscoonline.gov.in/CDSCO/viewPublicNSQDrug)
- [CDSCO alerts and notices](https://cdsco.gov.in/opencms/opencms/en/Alerts/)

MedPro now imports the public portal's structured NSQ/spurious report tables and searches the bundled official history, plus live latest-table refreshes. Run `pnpm run alerts:sync` to rebuild the historical snapshot, then rebuild/redeploy. The full update policy and matching rules are in README.md. `/api/recalls?product=...&manufacturer=...&batch=...` returns results, source evidence, reporting periods and coverage metadata. Name-only or batch-only queries are candidates. All three identifiers must agree for a matching-alert label. No US FDA fallback is used.

This is not an exhaustive recall database or a safety verdict. Distribution/ownership history is unavailable. Spurious-investigation remarks must be read with the original evidence. Missing alerts do not establish safety.

## 4. Barcode coverage

ZXing decodes supported barcodes locally. A GTIN alone cannot reveal arbitrary batch, expiry or genuine status. Some GS1 symbols carry batch (`10`) and manufacturing date (`11`), expiry (`17`) and serial (`21`) application identifiers. The app never invents missing label fields. If the optional provider doesn't identify a scanned GTIN, search by name or use manual entry. No label-photo OCR is implemented.

## 5. Deployment and acceptance checklist

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm render:build
corepack pnpm render:start
```

Test on HTTPS: navigation, camera permissions, barcode upload, product search, manual edits, local-storage migration, Supabase two-account RLS, cloud save/load, family revoke, and CDSCO official outbound links.

## Motion and devices

Three.js loads after the interface becomes interactive. Reduced-motion users get static decoration and no card movement. WebGL failure has a static fallback. Camera scanning prefers the rear camera but still requires actual browser permission and HTTPS/localhost. A decoded barcode is not an authenticity check. QR photo decoding was tested with generated fixtures; real device acceptance is still required.
