# MedPro — pack evidence and family follow-up

Independent copy of [Charvi and Sparsh's MedPro](https://github.com/charvi52/medpro), with source provenance in [SOURCE_PROVENANCE.md](SOURCE_PROVENANCE.md). This repository is the only destination for changes. The original repository and its deployment are not modified.

MedPro compares user-confirmed pack identifiers with published Indian quality findings, then helps a family organize the next action. It is a prototype, not a medicine-authentication service or clinically validated treatment tool.

## Run

Node 22 and pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

For a production build:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

The build prepares the OCR worker, WebAssembly and English language model from pinned dependencies. Photos are read in the browser; they are not sent to an AI provider. First use needs the reading assets available from the site. Browser caching and installed Hindi voices vary by device.

## Included

- Frontend, server routes, assets, original database schema and dated CDSCO snapshot.
- Supported barcode decoding and printed-pack text capture with highlighted candidates and explicit field confirmation.
- Exact batch/manufacturer/product evidence, incomplete-identity states and source coverage.
- Per-person current/occasional/stopped/stored treatment status and confirmed-ingredient review. Unsupported combinations stay unknown.
- New-strip comparisons, expiry/opening-date tasks and refill estimates from user-confirmed quantities.
- Local review timelines, caregiver/pharmacist request preparation, appointment lists, import review and encrypted cabinet backups.
- Optional account-scoped backup, expiring pack-specific grants, professional review gates and case access history.
- Optional batch email monitoring with deduplication, delivery state, acknowledgement and consent-based delayed escalation.
- Optional signed offline evidence updates with rollback protection.
- A feature-availability page at `/readiness` and an honest [82-point implementation register](docs/IMPROVEMENTS-82.md).

## Evidence and limits

The bundled snapshot has 7,005 published records, retrieved 29 October 2026. A missing match is not proof of safety or authenticity. A published finding is not automatically a recall or a statement about every product from a manufacturer. Read original investigation remarks and firm replies.

Live source retrieval may fail. Historical results remain dated and current coverage stays explicitly incomplete. No current price, stock or pharmacist-approved substitution is invented. Money examples remain confined to fictional demos. Clinical rules, translations and real-photo reading require professional/user validation before use in care.

`pnpm evaluate` regenerates `docs/evaluation.json`: a deterministic historical-identity challenge, not independent clinical validation, real-photo OCR accuracy or a claim of reduced patient harm. No pilot participants or professional endorsements are invented.

## External setup

See [.env.example](.env.example), [SETUP.md](SETUP.md), [operations](docs/OPERATIONS.md) and [pilot protocol](docs/PILOT.md). The local features need no account keys. Online accounts, actual email delivery, verified reviewer accounts and trusted update signing require their own setup. No secrets from the original deployment are copied.

The monitoring workflow is disabled by default. Add the documented private secrets and enable it only after isolated delivery tests. The repository update does not deploy or alter the original Vercel website.
