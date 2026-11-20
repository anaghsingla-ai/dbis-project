# CampusHire — Database Trigger Architecture & Catalog

In CampusHire, database triggers form the core defense layer of data integrity, business rule compliance, and forensic auditing. Triggers run inside the MySQL engine, ensuring that data invariants cannot be bypassed by any client or raw SQL command.

---

## 1. Classification by Purpose

Triggers in CampusHire fall into three architectural categories:

1. **Auto-Synchronization Triggers:** Automatically derive dependent attributes and maintain denormalized aggregate metrics without client intervention.
2. **Integrity Guard Triggers:** Use simple `IF` checks before a change and raise `SIGNAL SQLSTATE '45000'` when a trigger-level rule is broken. Application, round, and offer eligibility checks live in procedures T3, T4, and T5.
3. **Audit Trail Triggers:** Fire AFTER successful modifications to capture timestamped audit records (`old_value`, `new_value`, `record_id`) into the `Audit_Log` system table.

---

## 2. Complete Trigger Directory

### Student Table (TR1 – TR6)
- **TR1: `trg_student_bi` (BEFORE INSERT)**
  - *Purpose:* Derives `dept_name` automatically by querying `Department` using `NEW.dept_id`.
  - *Invariant:* Guarantees consistent department nomenclature without relying on front-end input.
- **TR2: `trg_student_bu` (BEFORE UPDATE)**
  - *Purpose:* If `NEW.dept_id != OLD.dept_id`, re-synchronizes `NEW.dept_name` with the destination department.
- **TR3: `trg_student_ai` (AFTER INSERT)**
  - *Purpose:* Atomically increments `Department.total_students = total_students + 1` for `NEW.dept_id`.
- **TR4: `trg_student_au` (AFTER UPDATE)**
  - *Purpose:* 
    1. If `NEW.dept_id != OLD.dept_id`, decrements `OLD.dept_id` headcount and increments `NEW.dept_id` headcount.
    2. If `NEW.cgpa != OLD.cgpa`, records a row into `Audit_Log` (`field_changed = 'cgpa'`).
    3. If `NEW.backlog_count != OLD.backlog_count`, records a row into `Audit_Log` (`field_changed = 'backlog_count'`).
- **TR5: `trg_student_ad` (AFTER DELETE)**
  - *Purpose:* Atomically decrements `Department.total_students = total_students - 1` for `OLD.dept_id`.
- **TR6: `trg_student_bd` (BEFORE DELETE)**
  - *Purpose:* Guard trigger. Prevents deletion of a student record if an `Accepted` offer exists in the `Offer` table. Raises SQLSTATE '45000'.

### Eligibility Criteria Table (TR7 – TR8)
- **TR7: `trg_elig_bi` (BEFORE INSERT)**
  - *Purpose:* Validates numeric bounds: `min_cgpa BETWEEN 0 AND 10`, `max_backlogs >= 0`, `min_10th_percentage BETWEEN 0 AND 100`, `min_12th_percentage BETWEEN 0 AND 100`. Raises SQLSTATE '45000' if invalid.
- **TR8: `trg_elig_bu` (BEFORE UPDATE)**
  - *Purpose:* Enforces the identical numeric bounds on criteria updates.

### Placement Drive Table (TR9 – TR10)
- **TR9: `trg_drive_bu` (BEFORE UPDATE)**
  - *Purpose:* Prevents reducing drive `vacancies` below the count of already allocated offers (`Pending` + `Accepted`). Raises SQLSTATE '45000'.
- **TR10: `trg_drive_bd` (BEFORE DELETE)**
  - *Purpose:* Blocks deleting a placement drive that has active or accepted student offers.

### Application Table (TR11 – TR13)
- **TR11: `trg_application_bi` (BEFORE INSERT)**
  - *Purpose:* Uses straightforward `SELECT` and `IF` checks for drive date, accepted offers, marks, and eligible department.
- **TR12: `trg_application_bu` (BEFORE UPDATE)**
  - *Purpose:* State machine validator. Prevents closed applications (`Rejected` or `Withdrawn`) from being reopened to `Applied`, and prevents `Shortlisted` from reverting to `Applied`.
- **TR13: `trg_application_au` (AFTER UPDATE)**
  - *Purpose:* Logs any change in `status` to `Audit_Log` (`table_name = 'Application'`).

### Round Result Table (TR14 – TR15)
- **TR14: `trg_result_bi` (BEFORE INSERT)**
  - *Purpose:* Checks that the application is active and the student passed the previous round.
- **TR15: `trg_result_ai` (AFTER INSERT)**
  - *Purpose:* Automatic status cascade:
    - If `NEW.outcome = 'Pass'`, updates `Application.status = 'Shortlisted'`.
    - If `NEW.outcome = 'Fail'`, updates `Application.status = 'Rejected'`.

### Offer Table (TR17 – TR18)
- **TR16: `trg_offer_bi` (BEFORE INSERT)**
  - *Purpose:* Checks shortlist, final-round result, duplicate offers, and remaining vacancies.
- **TR17: `trg_offer_bu` (BEFORE UPDATE)**
  - *Purpose:* State machine and One-Offer Policy guard:
    - Prohibits altering already `Accepted` or `Declined` offers.
    - Prohibits accepting an offer if the candidate already holds an `Accepted` offer elsewhere.
- **TR18: `trg_offer_au` (AFTER UPDATE)**
  - *Purpose:* Logs offer status transitions (`Pending` $\to$ `Accepted` / `Declined`) into `Audit_Log`.
