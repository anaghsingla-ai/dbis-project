# CampusHire — Test Case Catalog & Specifications

**Project:** CampusHire — College Placement Management System  
**Lab Course:** CS257 Database & Information Systems, IIT Indore  
**Documentation Purpose:** Academic & Engineering Test Specification Catalog  

---

## 1. Student Registration & Academic Profile Test Cases

### TC-REG-01: Valid Student Registration (T1)
- **Objective:** Verify that a student profile can be successfully registered via `sp_register_student` and that department headcount increments automatically.
- **Input Parameters:** Enrollment: `"EN_001"`, Name: `"Aarav Sharma"`, Email: `"aarav@iiti.ac.in"`, Phone: `"9199999999"`, Dept ID: `1`, CGPA: `8.40`, Backlogs: `0`, 10th: `92.0%`, 12th: `90.0%`.
- **Expected Result:**
  - `Student` row created with autoincremented `roll_no`.
  - Stored procedure returns `result = 'Student registered'`.
  - `Department.total_students` for Dept 1 increments by 1 via trigger `trg_student_ai` (TR3).

### TC-REG-02: Duplicate Email Rejection & Atomic Rollback (T1)
- **Objective:** Verify atomic rollback when attempting to register a student with an email that is already registered.
- **Input Parameters:** Enrollment: `"EN_002"`, Email: existing email from TC-REG-01.
- **Expected Result:**
  - Stored procedure catches MySQL Duplicate Key error (1062) and executes `ROLLBACK; RESIGNAL;`.
  - `Department.total_students` remains unchanged.
  - Zero partial rows exist in `Student`.

### TC-REG-03: Academic Record Update & Eligibility Cascade (T8)
- **Objective:** Verify that updating a student's CGPA or backlogs logs the change to `Audit_Log` and automatically rejects active applications if criteria are violated.
- **Input Parameters:** Student Roll No: `1`, New CGPA: `7.20`, New Backlogs: `2`.
- **Expected Result:**
  - `Student` table updated.
  - Trigger `trg_student_au` (TR4) inserts old and new CGPA values into `Audit_Log`.
  - Any active application where `min_cgpa > 7.20` or `max_backlogs < 2` is automatically transitioned to `status = 'Rejected'`.

---

## 2. Placement Drive & Selection Round Test Cases

### TC-DRV-01: Valid Placement Drive Creation (T2)
- **Objective:** Verify atomic insertion of a placement drive and its eligibility criteria.
- **Input Parameters:** Company ID: `1`, Officer ID: `1`, Title: `"Software Engineer"`, Package: `1,200,000`, Vacancies: `3`, Mode: `'On-Campus'`, Deadline: `CURDATE() + 10`, Min CGPA: `7.50`, Max Backlogs: `0`, Depts: `'CSE,EE'`.
- **Expected Result:**
  - Row created in `Placement_Drive`.
  - Matching row created in `Eligibility_Criteria` with foreign key `drive_id`.
  - Procedure returns `result = 'Drive created with eligibility criteria'`.

### TC-DRV-02: Invalid Criteria Atomic Rollback (T2)
- **Objective:** Verify that invalid eligibility criteria (e.g., `min_cgpa = 11.5`) rolls back the entire drive creation atomically.
- **Input Parameters:** Min CGPA: `11.50`.
- **Expected Result:**
  - Trigger `trg_criteria_bi` (TR7) raises SQLSTATE 45000 (`min_cgpa must be between 0 and 10`).
  - Stored procedure executes `ROLLBACK`.
  - Zero rows inserted into `Placement_Drive` or `Eligibility_Criteria`.

### TC-DRV-03: Drive Vacancy Reduction Guard (TR9)
- **Objective:** Prevent administrators from decreasing drive vacancies below the number of offers already accepted.
- **Precondition:** Drive has 3 accepted offers.
- **Action:** Attempt `UPDATE Placement_Drive SET vacancies = 2 WHERE drive_id = X;`.
- **Expected Result:**
  - Trigger `trg_drive_bu` (TR9) blocks update with SQLSTATE 45000 (`TRG: vacancies cannot be less than offers already issued`).

### TC-DRV-04: Drive Deletion Guard (TR10)
- **Objective:** Prevent deletion of a placement drive that has accepted offers.
- **Precondition:** Drive has accepted offers.
- **Action:** Attempt `DELETE FROM Placement_Drive WHERE drive_id = X;`.
- **Expected Result:**
  - Trigger `trg_drive_bd` (TR10) blocks deletion with SQLSTATE 45000 (`TRG: cannot delete a drive that has accepted offers`).

---

## 3. Application & Eligibility Verification Test Cases

### TC-APP-01: Low CGPA Rejection (T3 / TR11)
- **Objective:** Verify that students with CGPA lower than the drive cutoff are rejected.
- **Input Parameters:** Student CGPA: `6.50`, Drive Cutoff: `8.00`.
- **Expected Result:**
  - Procedure T3 rejects the application with `'CGPA below drive minimum'`.
  - Procedure `sp_apply_to_drive` raises SQLSTATE 45000 (`T3 failed: CGPA below drive minimum`).
  - Zero rows inserted into `Application`.

### TC-APP-02: Duplicate Application Prevention (T3 / uq_student_drive)
- **Objective:** Prevent a student from applying more than once to the same drive.
- **Input Parameters:** Student ID: `5`, Drive ID: `1` (already applied).
- **Expected Result:**
  - Database rejects with duplicate key violation on `(student_id, drive_id)`.

### TC-APP-03: Closed Application Re-opening Guard (TR12)
- **Objective:** Prevent an application that has reached a closed status (`Rejected` or `Withdrawn`) from being reset to `Applied`.
- **Precondition:** `Application.status = 'Rejected'`.
- **Action:** Attempt `UPDATE Application SET status = 'Applied' WHERE application_id = X;`.
- **Expected Result:**
  - Trigger `trg_app_bu` (TR12) blocks update with SQLSTATE 45000 (`TRG: a closed application (Rejected/Withdrawn) cannot be re-opened`).

---

## 4. Selection Round & On-Hold Result Transitions Test Cases

### TC-RND-01: Initial On-Hold Evaluation (T4)
- **Objective:** Record an `On-Hold` evaluation for a candidate in an active selection round.
- **Input Parameters:** Student ID: `10`, Round ID: `1`, Outcome: `'On-Hold'`, Score: `68.0`, Remarks: `"Review pending"`.
- **Expected Result:**
  - `Round_Result` row inserted with `outcome = 'On-Hold'`.
  - `Application.status` remains `Applied`.
  - Procedure T4 blocks progression to Round 2 until the student passes Round 1.

### TC-RND-02: On-Hold to Pass Transition (T4 / TR15b)
- **Objective:** Update an existing `On-Hold` result to `Pass`.
- **Input Parameters:** Student ID: `10`, Round ID: `1`, Outcome: `'Pass'`, Score: `88.0`.
- **Expected Result:**
  - `Round_Result` row updated (same `result_id` preserved; zero duplicate rows).
  - Trigger `trg_result_au` (TR15b) automatically synchronizes `Application.status` to `'Shortlisted'`.
  - Audit log recorded in `Audit_Log` with `old_value = 'On-Hold'`, `new_value = 'Pass'`.
  - After the student passes Round 1, procedure T4 allows the Round 2 result.

### TC-RND-03: On-Hold to Fail Transition (T4 / TR15b)
- **Objective:** Update an existing `On-Hold` result to `Fail`.
- **Input Parameters:** Student ID: `12`, Round ID: `1`, Outcome: `'Fail'`, Score: `45.0`.
- **Expected Result:**
  - `Round_Result` row updated in place.
  - Trigger `trg_result_au` (TR15b) automatically synchronizes `Application.status` to `'Rejected'`.
  - Progression to subsequent rounds strictly blocked (`'application is no longer active'`).

### TC-RND-04: Finalized Result Immutability Guard (TR14b)
- **Objective:** Verify that once a round outcome is finalized as `Pass` or `Fail`, neither recruiters nor admins can modify it.
- **Precondition:** `Round_Result.outcome = 'Pass'`.
- **Action:** Attempt `UPDATE Round_Result SET outcome = 'Fail' WHERE result_id = X;`.
- **Expected Result:**
  - Trigger `trg_result_bu` (TR14b) blocks update with SQLSTATE 45000 (`TRG: finalized round result (Pass/Fail) cannot be changed`).

---

## 5. Job Offer & One-Offer Policy Test Cases

### TC-OFR-01: Job Offer Issuance Prerequisites (T5 / TR16)
- **Objective:** Verify that an offer can only be issued to a shortlisted candidate who has passed all selection rounds.
- **Expected Result:**
  - Procedure T5 checks that the application is `Shortlisted`, the drive has rounds, and the student passed the final round.
  - `Offer` row created with `offer_status = 'Pending'`.

### TC-OFR-02: Offer Acceptance & One-Offer Policy Enforcement (T6 / TR17)
- **Objective:** When a candidate accepts an offer, automatically decline competing offers and withdraw active applications.
- **Precondition:** Student has Offer A (Drive 1, Pending) and Offer B (Drive 2, Pending).
- **Action:** Student invokes `sp_respond_to_offer(offer_b_id, 'Accepted')`.
- **Expected Result:**
  - Offer B status becomes `'Accepted'`.
  - Offer A status automatically becomes `'Declined'`.
  - Application for Drive 1 automatically becomes `'Withdrawn'`.
  - Attempting to accept Offer A subsequently is rejected (`'offer has already been answered'`).

### TC-OFR-03: Placed Student Deletion Guard (TR6)
- **Objective:** Prevent deletion of a student record if the student has accepted a job offer.
- **Precondition:** Student has `Offer.offer_status = 'Accepted'`.
- **Action:** Attempt `DELETE FROM Student WHERE roll_no = X;`.
- **Expected Result:**
  - Trigger `trg_student_bd` (TR6) blocks deletion with SQLSTATE 45000 (`TRG: cannot delete a placed student (accepted offer exists)`).

---

## 6. Concurrency & Deadlock Prevention Test Cases

### TC-CONC-01: Simultaneous Application Race Condition
- **Objective:** Verify that two parallel threads submitting applications for the same `(student_id, drive_id)` do not produce duplicates.
- **Expected Result:**
  - Exactly one thread commits successfully.
  - Exactly one thread fails with duplicate constraint violation.
  - Database contains exactly 1 application record.

### TC-CONC-02: Deadlock-Free Bidirectional Department Transfers (T9)
- **Objective:** Verify that parallel bidirectional transfers between Dept 1 and Dept 2 complete without deadlock.
- **Mechanism:** Procedure `sp_transfer_student_dept` locks departments in strict ascending `dept_id` order (`ORDER BY dept_id`).
- **Expected Result:**
  - Both transfers commit cleanly with zero deadlock errors (MySQL Error 1213).
  - Department headcounts remain perfectly synchronized.
