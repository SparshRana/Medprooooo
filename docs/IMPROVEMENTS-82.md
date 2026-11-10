# 82-point implementation register

Status is deliberately explicit. **Implemented** describes code present in this copy; it does not imply clinical validation, external-service activation or a real-world pilot. **Setup** requires credentials/operator configuration. **Validation** requires professional review or human evidence. **Partial** identifies a remaining deliverable rather than disguising it as complete.

| # | Requirement | Status and evidence |
|---|---|---|
|1|Remove clearance claims|Implemented: no-match wording and dated coverage in safety panel.|
|2|Bound interaction claims|Implemented: two source-linked ingredient rules; unsupported combinations unknown.|
|3|Review one person|Implemented: owner separation in checker and tests.|
|4|Separate treatment from stock|Implemented: current/occasional/stopped/stored fields.|
|5|Readable catalogue errors|Implemented: bounded JSON requests, safe provider failure and manual fallback; external catalogue uptime unverified.|
|6|Current alert retrieval|Partial: bounded live fetch, latest-sync worker and dated fallback; external availability not guaranteed or activated.|
|7|Show freshness and gaps|Implemented: source coverage and explicit stale/unavailable states.|
|8|Bound search loading|Implemented: timeout, cancellation and request-generation protection.|
|9|Activate family services|Setup: complete account/schema code; deployment credentials unavailable.|
|10|Remove configuration jargon from user flow|Implemented: availability messages; operator instructions in docs.|
|11|Separate examples from personal entries|Implemented: example labels, explicit copy/save and restore exclusion.|
|12|Keep illustrative money in demos|Implemented; real verified quotes remain unavailable.|
|13|Printed-pack photo reading|Implemented: same-origin Tesseract English OCR; real-photo accuracy needs validation.|
|14|Highlight extracted sources|Implemented: source-line bounding boxes, photograph and transcript.|
|15|Confirm ambiguous characters|Implemented: every candidate needs human confirmation.|
|16|Photo quality guidance|Implemented heuristics for resolution, light/glare and focus; not a validated classifier.|
|17|Guide pack-panel capture|Implemented: name/batch/expiry instructions; broader pack-format guidance needs user testing.|
|18|Explain barcode limits|Implemented in scanner and source evidence.|
|19|Exact formulations|Implemented: complete salt/strength/form/release gates; removed fuzzy substitution.|
|20|Combination ingredients|Implemented: all user-confirmed ingredients and strengths retained.|
|21|Manual corrections|Implemented in candidate review and pack form.|
|22|Original photo and corrections|Implemented: original prepared photo, OCR transcript, capture date and bounded change history.|
|23|Distinct evidence outcomes|Implemented: exact/candidate/no-match/incomplete/unavailable.|
|24|Field-by-field evidence|Implemented: name/manufacturer/batch comparison.|
|25|Preserve finding categories|Implemented: NSQ/spurious source categories and no recall equivalence.|
|26|Plain-language findings|Partial: category explanations present; laboratory-specific translations need clinical review.|
|27|Traceable sources|Implemented: original URLs, reporting periods and retrieval timestamps.|
|28|Corrections/withdrawal handling|Implemented data revision comparison and updated-finding fingerprints; absence never means withdrawal. Operator handling still required.|
|29|Avoid invalid manufacturer rankings|Implemented: no quality score or denominator-free ranking.|
|30|Next action per result|Implemented through confirmation, pack details and follow-up workspace.|
|31|Future batch monitoring|Implemented worker/subscriptions; Setup required.|
|32|Closed-app notifications|Implemented email path and scheduled job; actual delivery requires Setup and testing. No push/SMS claim.|
|33|Deduplicate deliveries|Implemented fingerprint ledger, leases and provider idempotency.|
|34|Acknowledgement|Implemented owner-only acknowledgement RPC and UI.|
|35|Consent-based escalation|Implemented delayed pack-scoped alert grants with expiry/revocation; Setup required.|
|36|Resolution timeline|Implemented user-recorded steps with outcome-before-resolution requirement.|
|37|Pharmacist workspace|Implemented shared-case review queue and owner preparation; Setup required.|
|38|Authenticated professional decisions|Implemented database gate: operator-verified reviewer plus active case access. Registration verification is an operator prerequisite.|
|39|Replacement pack history|Implemented previous-pack links and comparisons without overwriting original.|
|40|Correct reporting routes|Implemented distinction between quality complaints and adverse-reaction guidance; no automatic complaint transmission.|
|41|New-strip journey|Implemented fresh batch/expiry confirmation and comparison.|
|42|Expiry reminders|Implemented in-app attention queue; no closed-app expiry delivery claim.|
|43|Opening dates|Implemented user-entered label deadline; no inferred shelf life.|
|44|Refill tracking|Implemented optional confirmed quantity/schedule estimates.|
|45|Duplicate ingredients|Implemented per-person confirmed-current-ingredient review.|
|46|Separate prescribed instructions|Implemented verbatim user-entered instructions; no dose generation.|
|47|Appointment export|Implemented private text export with uncertainty.|
|48|Prescription changes|Partial: user-entered instruction difference on replacement pack; automatic prescription-document reconciliation not implemented.|
|49|Dated official prices|Partial: official PMBI link and strict quote library; no reviewed current-price dataset available.|
|50|Equal quantity/exact formulation|Implemented quote-comparison gates and tests; dataset still needed.|
|51|Price versus stock|Implemented distinct quote fields and unverified-stock UI.|
|52|Savings provenance|Implemented no unsourced real-world savings display; reviewed quotes required.|
|53|Professional substitution confirmation|Implemented explicit confirmation requirement; no automatic switch.|
|54|Accurate map search|Implemented stock-not-checked label.|
|55|Large photos/text|Implemented retained Dadi Mode and responsive pack view; user validation pending.|
|56|Clear primary actions|Implemented simplified entry and follow-up actions; user validation pending.|
|57|Text/icons plus colour|Implemented labelled states and focusable controls.|
|58|Consolidate audio|Implemented distinct saved-pack readout and result transcript controls; removed repeated Dadi button.|
|59|Transcripts/audio failures|Implemented visible transcript and local-voice fallback.|
|60|Pack-specific caregiver help|Implemented photo/request preparation and scoped case sharing.|
|61|Reviewed translations|Validation: existing Hindi plus new workflow copy need a qualified clinical/language review.|
|62|Older-user comprehension|Validation: PILOT.md protocol; no participants tested or invented.|
|63|Honest offline scope|Implemented dated evidence, first-use asset disclosure and availability page.|
|64|Reconnect/conflicts|Implemented: reviewed merge queues offline and retries on reconnect while the app is open; revision conflicts stop the save.|
|65|Signed update integrity|Implemented Ed25519 verification/anti-rollback tests; trusted key Setup required.|
|66|Shared-device account separation|Implemented local account scopes; browser storage not encrypted at rest.|
|67|Export/removal controls|Implemented reviewed import, optional AES-GCM export and explicit device-data removal.|
|68|Granular revocable grants|Implemented pack-specific review/alert scopes and expiry; Setup required.|
|69|Access/change history|Implemented pack changes and explicit case-open/review audit; direct database/device reads outside scope.|
|70|Device-local photos|Implemented OCR locally; case sharing excludes photos unless user chooses device sharing.|
|71|ABDM milestone|Not integrated/certified. Documented external milestone requiring official requirements and validation.|
|72|Reduce homepage repetition|Implemented shorter homepage, capability strip and availability link.|
|73|Immediate meaningful demo|Implemented Try Demo loads two batches and the family cabinet.|
|74|Visible simulations|Implemented fictional entries/events separated from personal and official data.|
|75|Result/reason/action first|Implemented evidence panel and follow-up queue; supporting details collapsible.|
|76|Small-screen forms|Implemented responsive grids, wrapping actions and readable form controls; browser QA recorded separately.|
|77|Feature availability|Implemented /readiness and explicit setup states.|
|78|Measured evaluation|Implemented deterministic identity challenge, software/security tests and published limits; real-photo/clinical evaluation pending.|
|79|Manual-process comparison|Validation: baseline protocol supplied; no human timing results invented.|
|80|Family/pharmacist pilot|Validation: recruitment/task protocol supplied; no pilot conducted.|
|81|Focused first audience|Documented in OPERATIONS.md.|
|82|Operating model|Documented owners, data maintenance, failure handling, setup and cost-measurement plan; commercial assumptions unvalidated.|
