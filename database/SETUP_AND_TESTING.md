# CampusHire database setup and verification

## Before running SQL

Use a disposable local MySQL 8.0 instance for development. Back up any database you care about. The supplied schema targets the database named `CampusHire`; do not run it against production or a database containing important data. The schema uses `CREATE DATABASE IF NOT EXISTS`, but its table creation statements are not migrations and are not safe to re-run over existing tables.

Never put passwords, access tokens, private keys, or real student records in tracked files. Configure local connection details outside Git.

## Full application install order

From the project root, install the complete database scripts in this order:

1. `01_schema.sql` — creates the ten application tables.
2. Create the `Audit_Log` support table. The student module schema file defines it; when the full schema has already created Department and Student, run only the Audit_Log definition from `database/modules/anagh/01_student_department_schema.sql`, not that entire module file.
3. `03_transactions.sql` — creates stored procedures T1–T10.
4. `04_triggers.sql` — creates triggers TR1–TR20; audit-writing triggers require `Audit_Log`.
5. `05_sample_data.sql` — optional sample records. Use only on a fresh disposable database.

Run these scripts with a MySQL client that supports the `DELIMITER` command (for example, the MySQL command-line client). The Python app uses PyMySQL; adapt its local connection settings to your own MySQL host, port, username, and password. Do not commit credentials.

The module files under `database/modules/<owner>/` are contribution slices. They are not a second full install: a module procedure or trigger may rely on tables owned by another module. For a single-user test of Anagh's procedures, install the complete schema and support table first, then `03_student_transactions.sql` and `04_student_triggers.sql`.

## Manual verification checklist

After installing on a disposable database:

- Confirm all ten application tables and `Audit_Log` exist.
- Confirm all expected stored procedures and triggers were created without SQL errors.
- Register a student in an existing department; verify the department name is populated and `total_students` increments once.
- Update CGPA/backlogs and verify audit rows are written; test an invalid student or department and confirm the procedure returns an error without partial changes.
- Transfer a student to a different department; verify both department counts and the student's department name.
- Attempt to delete a student with an accepted offer and confirm the trigger rejects it.
- Exercise application, round-result, and offer flows through their procedures and verify ineligible, duplicate, and invalid state transitions are rejected.
- Check that a failed transactional procedure leaves related rows unchanged.

Record the MySQL version, commands, inputs, and observed results when reporting verification. This checklist is not a claim that these tests have already been executed; run them locally and report actual results.

## Contribution and Git workflow

Each contributor should implement their assigned SQL and tests on a branch from the latest `main`, commit only work they personally completed, and open a pull request. Use the contributor's own GitHub identity. Do not manufacture commit history or claim tests that were not run. Keep module ownership clear, coordinate edits to shared scripts, and review the final diff for credentials and personal data before pushing.
