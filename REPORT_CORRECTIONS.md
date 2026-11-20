# CampusHire report corrections

These corrections describe the current root application source. The archived `database/original` SQL and module contribution slices must not be used to describe the current root implementation interchangeably.

## Project counts and architecture

CampusHire has ten core placement tables plus two support tables: `Audit_Log` and `User_Account`. The database defines ten stored procedures and twenty triggers implementing TR1 to TR18, including TR14b and TR15b. The Python connection pool is configured for ten connections; its helper can fall back to a direct connection when obtaining a pooled connection fails.

Eligibility is implemented with direct SQL conditions in procedure T3 and trigger TR11. The student drive-list query uses CASE expressions to show eligibility reasons. `fn_eligibility_error` is part of the archived original SQL, not the current installation. Describe the checks as eight groups: student existence, drive existence, drive date, no accepted offer, CGPA, backlogs, school percentages, and eligible department. The percentage group contains separate checks for class 10 and class 12.

Replace the Functions row in Section 3 with Direct SQL checks. In Section 5 say that the database contains tables, procedures, constraints and triggers. Some Flask routes also validate requests and perform ordinary queries; the server is not exclusively a stored-procedure relay. Repeated eligibility logic exists in T3, TR11 and the drive-list query, so claiming that it is implemented once is inaccurate.

## Tables and trigger behaviour

Add `User_Account` to the Section 6 table list for logins, password hashes, roles and links to student/company/department/officer records. `Audit_Log` records selected academic, application, round-outcome and offer changes; it is not an immutable log of every database write. Its bootstrap fields include `log_id`, `table_name`, `record_id`, `field_name`, `old_value`, `new_value`, `changed_by`, and `changed_at`.

Remove application deadline from the Placement_Drive description: the current table contains drive_date and has no separate application_deadline column.

## Procedure and SQL construct corrections

| Item | Current behaviour |
|---|---|
| T4 | Shares the round row, locks the application and existing result; INSERT fires TR14/TR15, while updating an On-Hold result fires TR14b/TR15b. Result status changes can cascade through TR12/TR13. |
| T5 | Locks the Placement_Drive row and the matching Application row, not the Student row. TR16 validates a new offer. |
| T6 | Locks the chosen Offer and requests locks on the student's offer set with SELECT COUNT(*) ... FOR UPDATE. Acceptance declines other pending offers and withdraws active applications on other drives. TR17/TR18 and, where applications change, TR12/TR13 run. |
| T7 | Locks the application; withdrawal can also decline a pending offer and fire TR17/TR18. |
| T8 | Rechecks only Applied applications against CGPA and backlog limits. It does not recheck every open or Shortlisted application or all eligibility fields. |
| T9 | Locks the Student row, then requests department locks using ORDER BY dept_id FOR UPDATE inside a derived SELECT. The root procedure does not use LEAST/GREATEST. This ordering is intended to reduce deadlocks; no claim about every possible transaction interaction is established. |
| T10 | Plain START TRANSACTION, three SELECT queries, COMMIT. No explicit READ ONLY, WITH CONSISTENT SNAPSHOT, or locking SELECT. Read-view consistency follows the session isolation level. |
| EXISTS | T3, T5, T6, T7 |
| COALESCE | T1, T3 |
| ORDER BY dept_id ... FOR UPDATE | T9 department locking query |

T10 reads reports and performs no writes, so do not force it into a universal lock-validate-write pattern. Ordinary database guards and triggers do not prove that every concurrent raw SQL path is race-free, and administrators can bypass or remove protections.

## Replacement Section 12 setup and running

Install MySQL 8.0.16 or newer, Python and the frontend's supported Node.js version. Run the commands from the repository root. Use a local disposable database instance for demonstrations and tests.

```powershell
Copy-Item backend/.env.example backend/.env
python -m pip install -r backend/requirements.txt
```

Edit backend/.env locally: set DB_HOST, DB_PORT (3307 by default), DB_USER, DB_PASSWORD, DB_NAME=CampusHire, JWT_SECRET and CLIENT_URL=http://localhost:5173. Start your configured MySQL instance on port 3307.

For a fresh installation where CampusHire does not exist:

```powershell
python backend/scripts/init_db.py
python backend/app.py
```

The bootstrap stops if CampusHire already exists. Do not use it as a reset command. It creates the root schema, procedures, Audit_Log, triggers, sample records and User_Account logins. Passwords are defined by the local account setup; do not print them in the report. If the core database already exists but User_Account is absent, use `python backend/scripts/setup_user_accounts.py CampusHire` after checking the existing database state.

For manual installation on a fresh instance, use a MySQL client supporting DELIMITER: source 01_schema.sql; create Audit_Log with the definition from backend/scripts/init_db.py; source 03_transactions.sql, 04_triggers.sql, and optionally 05_sample_data.sql; then run setup_user_accounts.py CampusHire for the app login table. No functions script is required. Do not run the student module schema over existing Department and Student tables.

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Flask defaults to port 5000. Vite normally starts on 5173 but may select another free port; use the terminal's actual address and align CLIENT_URL. Demo usernames include admin, aarav, technova_hr and cse_coord. The account selector fills a username; enter the configured password and click Sign in.

## Replacement Section 13 demo walkthrough

The demonstration covers the landing page, student eligibility and applications, HR round evaluation, offer acceptance and automatic declines/withdrawals, and the audit log. DEMO_SCRIPT.md is a ten-minute live viva script. Do not infer the duration or availability of a separate recorded video from this script. The repository link provides source code; do not claim it hosts a video unless a video link is actually supplied.

## Replacement Section 14 testing and results

On 20 November 2026, the current suite collected 67 tests after correcting a missing os import in test_concurrency.py. The 43 tests for application progress, round creation validation and selection workflow passed in 0.25 seconds. These use mocks or in-memory data and do not require MySQL.

The other 24 tests require MySQL and were not rerun because the configured server at 127.0.0.1:3307 was unavailable. TEST_REPORT.md records a historical 24-test pass from 11 November 2026; this is not a new full-suite result. The T10 test checks three result sets, not isolation under concurrent updates. No restart/crash test establishes durability, and no measured percentage of trigger coverage is available.

## Conclusion and presentation claims

Remove the invented future-work paragraph. Describe the implemented vacancy checks, offer acceptance rules, academic/application/offer auditing and role-scoped screens. Avoid claiming every web action only calls a procedure, that eligibility exists in one place, that all possible deadlocks are prevented, or that a current full integration pass was observed. Use actual code and verified test results for the viva.
