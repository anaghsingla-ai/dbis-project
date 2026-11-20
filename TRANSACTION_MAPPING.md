# CampusHire — Transaction & Trigger Traceability Matrix

This document maps every user-facing interaction in the CampusHire frontend to the corresponding Python Flask API endpoint, underlying MySQL stored procedure, tables modified, concurrency controls, and active triggers fired.

---

## Transaction Traceability Table

| ID | Frontend Action & Page | Python Flask Endpoint | MySQL Stored Procedure / DDL | Tables Modified | Concurrency & Locking Strategy | Triggers Fired |
|---|---|---|---|---|---|---|
| **T1** | Admin registers a new student (`/admin/students`) | `POST /api/admin/students` | `CALL sp_register_student(...)` | `Student`, `Department` | `SELECT total_students FROM Department WHERE dept_id = p_dept_id FOR UPDATE` | **TR1** (`trg_student_bi` sets `dept_name`)<br>**TR3** (`trg_student_ai` increments `total_students`) |
| **T2** | Admin creates placement drive with criteria (`/admin/drives`) | `POST /api/admin/drives` | `CALL sp_create_drive(...)` | `Placement_Drive`, `Eligibility_Criteria` | Foreign key share locks on referenced `Company` and `Placement_Officer` rows | **TR7** (`trg_elig_bi` validates criteria limits) |
| **T3** | Student applies to an eligible drive (`/student/drives`) | `POST /api/student/apply` | `CALL sp_apply_to_drive(...)` | `Application` | Locks the student row and shares the drive row while checking eligibility | Eligibility rules are written directly in T3; the unique key prevents duplicate applications |
| **T4** | Company HR records evaluation result for round (`/hr/applicants`) | `POST /api/hr/rounds/record-result` | `CALL sp_record_round_result(...)` | `Round_Result`, `Application` | Shares the round row and locks the application | T4 checks the previous round; **TR15** updates application status after a result |
| **T5** | Admin issues job offer to candidate (`/admin/offers`) | `POST /api/admin/offers` | `CALL sp_issue_offer(...)` | `Offer` | Locks the drive row while checking available vacancies | T5 checks shortlist, final-round result, existing offers, and vacancies |
| **T6** | Student accepts or declines offer (`/student/offers`) | `POST /api/student/offers/respond` | `CALL sp_respond_to_offer(...)` | `Offer`, `Application` | `SELECT * FROM Offer WHERE student_id = v_student_id FOR UPDATE` | **TR17** (`trg_offer_bu` enforces state transitions and prevents holding 2 accepted offers)<br>**TR18** (`trg_offer_au` writes transition to `Audit_Log`) |
| **T7** | Student withdraws active application (`/student/applications`) | `POST /api/student/withdraw` | `CALL sp_withdraw_application(...)` | `Application`, `Offer` | `SELECT * FROM Application WHERE student_id = p_roll_no AND drive_id = p_drive_id FOR UPDATE` | **TR12** (`trg_application_bu` prevents reopening withdrawn application)<br>**TR13** (`trg_application_au` writes transition to `Audit_Log`) |
| **T8** | Dept Coordinator updates marks/backlogs (`/coordinator/students`) | `POST /api/coordinator/students/academic-record` | `CALL sp_update_academic_record(...)` | `Student`, `Application`, `Audit_Log` | `SELECT * FROM Student WHERE roll_no = p_roll_no FOR UPDATE` | **TR4** (`trg_student_au` records CGPA/backlog change to `Audit_Log`)<br>**TR12/TR13** (Automatic rejection of failing open applications) |
| **T9** | Dept Coordinator transfers student (`/coordinator/students`) | `POST /api/coordinator/students/transfer` | `CALL sp_transfer_student_dept(...)` | `Student`, `Department` | Ascending order locking: `SELECT ... FROM Department WHERE dept_id IN (LEAST(...), GREATEST(...)) FOR UPDATE` | **TR2** (`trg_student_bu` refreshes `dept_name`)<br>**TR4** (`trg_student_au` atomically adjusts headcounts in both old and new departments) |
| **T10**| Admin generates NAAC / NBA report (`/admin/reports`) | `GET /api/admin/reports/placement` | `CALL sp_placement_report()` | None (Read-Only) | `START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY` | None (No row modifications; zero write locks taken) |
