# CampusHire database: a simple explanation

The submitted schema PDFs are the baseline for the ten main tables. The table definitions in `01_schema.sql` follow that baseline; `User_Account` is added by the backend setup because the website needs login accounts. The schema script now creates `CampusHire` only if it is absent and never drops a database.

The active project no longer has `02_functions.sql`. Its eligibility, round, and offer checks now appear directly in procedures T3, T4, and T5, with matching trigger checks. The older copy under `database/original/` is an archived snapshot and is not loaded by setup scripts.

## Transactions

A transaction groups database changes that belong together:

1. `START TRANSACTION` begins the group.
2. The procedure checks the request and makes its related changes.
3. `COMMIT` saves all those changes together.
4. If MySQL reports an error, the procedure rolls the group back and passes the error to the website.

For example, `sp_create_drive` inserts a placement drive and its eligibility criteria. They belong together: a drive should not be left without its criteria if the second insert fails. `sp_respond_to_offer` updates the chosen offer and closes the student's other active applications in the same transaction.

`FOR UPDATE` is used where two people could change the same record at once. It locks that record until the transaction ends. The report procedure uses the same basic start-and-finish pattern while it reads its related results.

## Triggers

A trigger runs automatically when a row is inserted, updated, or deleted. The examples use the same three ideas as the class tutorial:

- **Event:** which table change starts the trigger.
- **Condition:** an `IF` check for the rule.
- **Action:** set a value, update a related table, or raise an error with `SIGNAL`.

For example, student triggers keep the student's department name and the department headcount in sync. Round-result triggers update an application when a student passes or fails. Audit triggers write changes to `Audit_Log`, which the website's admin and lab pages display.

`BEFORE` triggers check or prepare the row using `NEW` (and `OLD` for updates). `AFTER` triggers update a related table after the change succeeds. `SIGNAL SQLSTATE '45000'` cancels a change when a rule is broken.

## Safe setup and testing

`backend/scripts/init_db.py` checks for `CampusHire` before loading any SQL and stops if it already exists. The trigger setup uses `CREATE TABLE IF NOT EXISTS` for `Audit_Log`, so rerunning it does not erase audit history. Test the database routines against `CampusHire_Test`; do not use the initializer to reset a database that contains data.
