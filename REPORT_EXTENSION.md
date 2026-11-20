# CS 257 DBIS Lab — Minor Project Report Extension
## CampusHire: Implementation of Database Transactions, Stored Procedures, and Triggers

**Institution:** Indian Institute of Technology Indore  
**Course:** CS 257 — Database and Information Systems Lab  
**Evaluation Date:** November 16, 2026  
**Team Members:**
- Anagh Singla (Roll: 250001006)
- Arush Agrawal (Roll: 250001008)
- Bhuvaneesh Vijayvargiya (Roll: 250001017)
- Jay Gupta (Roll: 250001035)

---

## 1. Introduction

The initial phase of the CampusHire project designed the conceptual Entity-Relationship (ER) model and relational schema for managing university campus placements across departments, companies, students, drives, rounds, applications, and job offers.

This report extension details the implementation and empirical validation of:
1. **Ten ACID Stored Procedures (T1 – T10)** addressing concurrent transactional anomalies.
2. **Direct SQL checks** in the procedures and triggers enforce eligibility, round sequencing, and offer rules.
3. **Eighteen Active Database Triggers (TR1 – TR18)** enforcing declarative constraints, denormalized synchronization, and forensic audit logging.
4. **Integration into a Full-Stack System** using Python 3, Flask, `mysql-connector-python`, and a React SPA.

---

## 2. Relational Schema Invariants & Support Tables

The system preserves the 10 core tables:
$$\text{Department}, \text{Placement\_Officer}, \text{Company}, \text{Student}, \text{Placement\_Drive},$$
$$\text{Eligibility\_Criteria}, \text{Application}, \text{Selection\_Round}, \text{Round\_Result}, \text{Offer}$$

In addition, two administrative support tables were created:
1. **`Audit_Log`**:
   $$\text{Audit\_Log}(\underline{\text{log\_id}}, \text{table\_name}, \text{record\_id}, \text{field\_name}, \text{old\_value}, \text{new\_value}, \text{changed\_by}, \text{changed\_at})$$
   Written exclusively by database triggers (`TR4`, `TR13`, `TR15b`, `TR18`).
2. **`User_Account`**:
   $$\text{User\_Account}(\underline{\text{user\_id}}, \text{username}, \text{email}, \text{password\_hash}, \text{role}, \text{full\_name}, \text{student\_id}, \text{officer\_id}, \text{company\_id}, \text{dept\_id})$$
   Enforces authentication and role-based access without modifying the relational schema of the 10 academic entities.

---

## 3. Transaction Design & Concurrency Control (T1 – T10)

### T1: `sp_register_student`
- **Problem Addressed:** Department Student Registration (Problem Statement 2.4).
- **Concurrency Strategy:** Acquires an exclusive lock on the target department row:
  ```sql
  SELECT dept_name INTO v_dept_name FROM Department WHERE dept_id = p_dept_id FOR UPDATE;
  ```
- **Atomicity:** If the insert fails (e.g. duplicate email or enrollment number), the transaction rolls back, and trigger `TR3` is undone automatically.

### T2: `sp_create_drive`
- **Problem Addressed:** Atomic Placement Drive Creation (Problem Statement 2.1).
- **Atomicity:** Creates the `Placement_Drive` tuple and its corresponding `Eligibility_Criteria` tuple in a single atomic transaction. Failure of criteria validation (checked by `TR7`) causes a full rollback.

### T3: `sp_apply_to_drive`
- **Problem Addressed:** Eligibility Verification & Concurrent Applications (Problem Statement 2.1, 2.2).
- **Concurrency Strategy:**
  ```sql
  SELECT * FROM Student WHERE roll_no = p_roll_no FOR UPDATE;
  SELECT * FROM Placement_Drive WHERE drive_id = p_drive_id FOR SHARE;
  ```
- **Constraint Enforcement:** Procedure T3 checks eligibility before creating the application. The student drive list uses a SQL `CASE` expression to show the same reasons.

### T4: `sp_record_round_result`
- **Problem Addressed:** Multi-Round Sequencing (Problem Statement 2.3).
- **Sequencing Invariant:** Procedure T4 checks that the student passed the previous round before recording the next result.
- **Trigger Cascade:** Trigger `TR15` automatically updates `Application.status` to `Shortlisted` (on Pass) or `Rejected` (on Fail).

### T5: `sp_issue_offer`
- **Problem Addressed:** Vacancy Enforcement & Offer Allocation (Problem Statement 2.5).
- **Concurrency Strategy:** Serializes allocations via exclusive drive row locking:
  ```sql
  SELECT vacancies FROM Placement_Drive WHERE drive_id = p_drive_id FOR UPDATE;
  ```
  Ensures that simultaneous offer allocations cannot exceed available openings.

### T6: `sp_respond_to_offer`
- **Problem Addressed:** One-Offer Conflict Policy (Problem Statement 2.5).
- **Atomic Cascade:** When a student accepts an offer, the transaction:
  1. Updates the selected offer to `Accepted`.
  2. Automatically updates all other pending offers for that student to `Declined`.
  3. Automatically updates all other active applications for that student to `Withdrawn`.
  4. `TR17` validates offer transitions; `TR18` audits them. Application changes also fire `TR12` and `TR13`.

### T7: `sp_withdraw_application`
- **Problem Addressed:** Application Lifecycle Management (Problem Statement 2.2).
- **Atomicity:** Sets application status to `Withdrawn` and automatically declines any pending offer tied to that drive. Trigger `TR12` prevents reopening withdrawn applications.

### T8: `sp_update_academic_record`
- **Problem Addressed:** Academic Record Changes & Open Applications (Problem Statement 2.4).
- **Cascading Re-evaluation:** After updating the student's CGPA or backlog count, the procedure rechecks only applications with status `Applied`, using minimum CGPA and maximum backlogs. Shortlisted applications and percentage/department criteria are not rechecked by T8.

### T9: `sp_transfer_student_dept`
- **Problem Addressed:** Deadlock-Free Department Transfer (Problem Statement 2.4).
- **Lock ordering:** T9 first locks the student row, then requests department rows in ascending `dept_id` order using the following query. This ordering is intended to reduce circular waits; it does not establish that every possible transaction interaction is deadlock-free.
  ```sql
  SELECT COUNT(*) INTO v_lock FROM (
    SELECT dept_id FROM Department
    WHERE dept_id IN (v_old, p_new_dept)
    ORDER BY dept_id FOR UPDATE
  ) t;
  ```

### T10: `sp_placement_report`
- **Problem Addressed:** NAAC / NBA Placement Accreditation Reporting (Problem Statement 2.5).
- **Report transaction:**
  ```sql
  START TRANSACTION;
  -- Three SELECT queries: overall totals, company totals, department totals.
  COMMIT;
  ```
  T10 performs no writes and uses no explicit locking SELECT. It does not declare `READ ONLY` or `WITH CONSISTENT SNAPSHOT`. Read-view consistency follows the session isolation level; the procedure does not set it.

---

## 4. Trigger Specifications (TR1 – TR18)

| Trigger | Timing & Event | Target Table | Purpose |
|---|---|---|---|
| `TR1: trg_student_bi` | BEFORE INSERT | Student | Auto-derives `dept_name` from Department |
| `TR2: trg_student_bu` | BEFORE UPDATE | Student | Re-syncs `dept_name` on department transfer |
| `TR3: trg_student_ai` | AFTER INSERT | Student | Increments `Department.total_students` |
| `TR4: trg_student_au` | AFTER UPDATE | Student | Synchronizes headcounts; logs CGPA/backlog changes to `Audit_Log` |
| `TR5: trg_student_ad` | AFTER DELETE | Student | Decrements `Department.total_students` |
| `TR6: trg_student_bd` | BEFORE DELETE | Student | Guard: Prohibits deleting a student with an Accepted offer |
| `TR7: trg_elig_bi` | BEFORE INSERT | Eligibility_Criteria | Validates criteria bounds (CGPA 0-10, percentage 0-100) |
| `TR8: trg_elig_bu` | BEFORE UPDATE | Eligibility_Criteria | Enforces bounds on criteria update |
| `TR9: trg_drive_bu` | BEFORE UPDATE | Placement_Drive | Guard: Vacancies cannot be reduced below active offers |
| `TR10: trg_drive_bd`| BEFORE DELETE | Placement_Drive | Guard: Prohibits deleting a drive with Accepted offers |
| `TR11: trg_application_bi` | BEFORE INSERT | Application | Uses direct `IF` checks to reject ineligible candidate insertions |
| `TR12: trg_application_bu` | BEFORE UPDATE | Application | Prohibits reopening closed applications |
| `TR13: trg_application_au` | AFTER UPDATE | Application | Audits application status transitions to `Audit_Log` |
| `TR14: trg_result_bi` | BEFORE INSERT | Round_Result | Checks that the student passed the previous round |
| `TR15: trg_result_ai` | AFTER INSERT | Round_Result | Automatically syncs Application status (Pass $\to$ Shortlisted, Fail $\to$ Rejected) |
| `TR14b: trg_result_bu` | BEFORE UPDATE | Round_Result | Protects finalized outcomes and validates new outcomes |
| `TR15b: trg_result_au` | AFTER UPDATE | Round_Result | Synchronizes changed results and audits outcome changes |
| `TR16: trg_offer_bi` | BEFORE INSERT | Offer | Uses direct checks for shortlist, final round, and vacancy |
| `TR17: trg_offer_bu` | BEFORE UPDATE | Offer | Enforces One-Offer acceptance policy and state machine |
| `TR18: trg_offer_au` | AFTER UPDATE | Offer | Audits offer status transitions to `Audit_Log` |

---

## 5. Experimental Test Results

The historical test report dated 11 November 2026 records the following scenarios. These are historical results, not a new execution of the current integration suite. See `TEST_REPORT.md` for the current collection count and verification status:
- **Test 1 (T1 Rollback):** Duplicate email caused immediate transaction rollback; `Department.total_students` remained invariant.
- **Test 2 (T2 Bounds Check):** Drive creation with `min_cgpa = 11.0` aborted atomically; zero orphan rows created.
- **Test 3 (T3 Eligibility):** Application by student below cutoff halted with signal: *"CGPA below drive minimum"*.
- **Test 4 (T4 Round Sequencing):** Attempting round 2 without clearing round 1 was refused by procedure T4 and trigger `TR14`.
- **Test 5 (TR4 Audit Logging):** CGPA update immediately produced a verified row in `Audit_Log`.
- **Test 6 (TR12 State Machine):** Reverting a `Rejected` application to `Applied` was blocked by trigger `TR12`.
- **Test 7 (T10 Accreditation):** Returned three report result sets; this assertion does not test isolation across concurrent updates.


## Current architecture and eligibility

The current app uses ten core tables plus `Audit_Log` and `User_Account`, ten stored procedures, twenty triggers, and a pool configured with ten connections (with a direct-connection fallback). Eligibility is checked directly in T3 and TR11; the student drive-list query uses SQL CASE expressions. `fn_eligibility_error` belongs to the archived `database/original` implementation and is not installed by the current bootstrap.
