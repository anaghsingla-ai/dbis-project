# Transactions and triggers: explanation for CampusHire

The submitted table design is unchanged. Use the root `03_transactions.sql`
and `04_triggers.sql`; `database/original` contains older reference code.
The app still calls the same ten procedures with the same parameters.

### Company selection and automatic offers

A drive can have 1 to 4 rounds; four rounds are not required. HR Interview can
be the first round and ends the sequence. Set up all intended rounds before
evaluations begin, because recording results locks the setup.

When HR or admin records Pass for the last configured round, Python calls T4
to save the result and then T5 to grant the offer automatically. The student
sees it in My Offers and becomes placed after accepting it through T6.
Existing candidates who already passed their final round can receive an offer
using Select & Grant Offer in the company's candidate pipeline.

T4 and T5 are separate transactions. If T5 rejects allocation (for example,
vacancies are full), the result stays saved and the UI explains the failure.
After resolving it, retry Grant Offer. Existing offers are not duplicated.

## Connect this to the class tutorials

A transaction is a group of changes saved together with COMMIT or undone
together with ROLLBACK. A trigger runs automatically when a row changes.
Calling a procedure is an app action; firing a trigger is a database action.

The transaction tutorial's salary transfer is the same idea as creating a
drive and its eligibility criteria: both inserts must succeed together.
The trigger tutorial's country population counter is the same idea as our
department student counter: add one after insertion, subtract one after deletion.
The tutorial's negative-salary check is the same pattern as checking minimum CGPA.

## Four examples to explain first

1. **T2: create a drive.** START TRANSACTION, insert Placement_Drive, remember
   LAST_INSERT_ID(), insert Eligibility_Criteria, COMMIT. If the second insert
   fails, ROLLBACK also removes the first insert. There is no incomplete drive.
2. **T7: withdraw an application.** Update the application to Withdrawn and
   decline its Pending offer in one transaction. Both changes are saved together.
3. **TR3 and TR5: student counts.** AFTER INSERT adds one to the department's
   total_students; AFTER DELETE subtracts one. INSERT uses NEW.dept_id;
   DELETE uses OLD.dept_id. The student and counter change roll back together.
4. **TR7: eligibility range check.** BEFORE INSERT checks NEW.min_cgpa.
   If it is outside 0 to 10, SIGNAL SQLSTATE '45000' rejects the row.

## What each procedure does

- T1 registers a student. Student triggers fill dept_name and update the count.
- T2 inserts a drive and its criteria together.
- T3 inserts an application. TR11 checks eligibility before the insert is saved.
- T4 records a result or resolves an On-Hold result. Result triggers update the
  application to Shortlisted for Pass or Rejected for Fail.
- T5 inserts an offer using the drive's package. TR16 checks whether it is allowed.
- T6 accepts or declines an offer. Acceptance also declines other Pending offers
  and withdraws other active applications, all in the same transaction.
- T7 withdraws an application and declines its Pending offer.
- T8 changes CGPA/backlogs and rejects Applied applications that no longer meet
  those two academic requirements. It does not reopen rejected applications.
- T9 changes a student's department. Student triggers move the two counts.
- T10 runs three summary SELECT queries and commits. It reports overall,
  company, and department placements. It changes no records.

## Read the trigger file in this order

- TR1/TR2: SET NEW.dept_name from Department before saving a student.
- TR3/TR5: increment/decrement total_students after insertion/deletion.
- TR7/TR8: IF a criteria value is invalid, SIGNAL an error.
- TR12: compare OLD.status with NEW.status to prevent reopening a closed application.
- TR15/TR15b: a result automatically updates the related application's status.
- TR13/TR18: an AFTER UPDATE trigger inserts the old and new status into Audit_Log.
- Then read TR11, TR14 and TR16. These are longer because eligibility,
  round progression, and offer issuance each have several project rules.

There are 20 CREATE TRIGGER statements: TR1 through TR18, plus TR14b and TR15b
for updating an existing round result. The extra two support resolving On-Hold.

## The few extra SQL terms

`DECLARE` creates a local variable inside a procedure or trigger.
`SELECT ... INTO` stores a query result in that variable.
`LAST_INSERT_ID()` gets the auto-generated ID of the inserted record.
`EXISTS (SELECT ...)` asks whether a matching record exists.
`COALESCE(x, '')` substitutes an empty string when x is NULL, so changes in
nullable status columns can still be compared.
`OLD.x <=> NEW.x` means the values are equal, including when both are NULL.
`NOT (OLD.x <=> NEW.x)` means the value changed.
`FIND_IN_SET` checks a department code in the submitted comma-separated field.

Every write procedure has the same error handler:

```sql
DECLARE EXIT HANDLER FOR SQLEXCEPTION
BEGIN
  ROLLBACK;
  RESIGNAL;
END;
```

Explain it as: "If any SQL statement or trigger raises an error, undo this
whole operation and send the error back to the app." MySQL does not automatically
undo every earlier statement for every SQL error, so this handler is necessary.

`FOR UPDATE` and `FOR SHARE` are in the transaction tutorial. FOR UPDATE makes
another writer wait until COMMIT/ROLLBACK. In T5, the drive row is locked so two
offer allocations for the same drive wait their turn. In T6, the student row
is locked so that student's offer responses wait their turn. In T9, the smaller
department ID is locked first and the larger second, following the tutorial's
advice to use a consistent order. This reduces department lock cycles; it is
not a claim that all possible operations are deadlock-free.

## How to demonstrate

Run `transaction_classroom_examples.sql` in MySQL Workbench on the project database.
Each example ends with a full ROLLBACK, so you can inspect the intermediate
change and restore the starting records. The savepoint example explains partial
rollback too. Run each section in order on the same connection.

For COMMIT, use the app to create a drive with valid criteria, then query both
tables. Explain that COMMIT saved both records. Try invalid criteria next and
show that no half-created drive remains.

Do not wrap CALL statements in another transaction: these procedures manage
their own START TRANSACTION and COMMIT. For a manual rollback demo, use ordinary
UPDATE statements as in the examples file.

## Loading the changed routines

On an existing CampusHire database, run only `03_transactions.sql` followed by
`04_triggers.sql` in Workbench (or MySQL's SOURCE command). These files replace
procedures and triggers; they do not create, alter, or drop tables. The existing
Audit_Log support table is still used. Do not run schema/bootstrap scripts to
update an existing installation.

Routine/trigger replacement is DDL, so it is not rolled back like the classroom
UPDATE examples. Load the files when the app is not handling requests.
