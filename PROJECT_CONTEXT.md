# CampusHire — Project Context & Academic Specification

**Project:** CampusHire — Full-Stack College Placement Management System  
**Course:** CS 257: Database and Information Systems Lab  
**Institution:** Indian Institute of Technology Indore (IIT Indore)  
**Supervisor:** Mrs. Aruna Tiwari  
**Team Members:**  
- Anagh Singla — Roll No: 250001006  
- Arush Agrawal — Roll No: 250001008  
- Bhuvaneesh Vijayvargiya — Roll No: 250001017  
- Jay Gupta — Roll No: 250001035  
**Final Evaluation Date:** Monday, November 16, 2026  

---

## 1. Introduction & Motivation

During university placement seasons, the Training and Placement Office (TPO) manages interactions between hundreds of students across multiple engineering departments and dozens of visiting companies. Traditional workflows relying on spreadsheets, WhatsApp groups, emails, and manual notices suffer from severe flaws:
1. **The Eligibility Mismatch Problem:** Students often apply to drives without meeting strict criteria (CGPA, backlogs, department restrictions, 10th/12th percentages). Manual verification of hundreds of applicants is error-prone, delaying interviews or permitting unqualified candidates.
2. **The Application Overload Problem:** Multiple concurrent company drives lead to spreadsheet update races, desynchronized records, duplicate entries, or ghost applications.
3. **The Multi-Round Selection Confusion:** Multi-stage selection processes (Aptitude Test -> Group Discussion -> Technical Interview -> HR Interview) require strict progression validation. Without enforced constraints, candidates who failed an earlier round or skipped rounds might accidentally be scheduled.
4. **The Data Silos Problem:** Department coordinators maintain academic marks while the TPO coordinates drives. CGPA corrections or backlog clearings in departments must automatically propagate and re-evaluate active applications.
5. **The Offer Conflict and Reporting Problem:** University policy strictly prohibits students from accepting multiple offers or continuing in selection processes once an offer has been accepted. Manual tracking risks offer hoarding and vacancy under-utilization, while NAAC/NBA reporting requires reliable, deduplicated snapshots of student salaries and departmental placement ratios.

CampusHire replaces error-prone spreadsheet tracking with a relational database architecture in MySQL where data integrity is enforced at four distinct levels: **Constraints**, **Functions**, **Transactions (Stored Procedures)**, and **Triggers**.

---

## 2. Core Relational Database Schema (10 Academic Tables)

### Table 1: `Department`
Stores academic department reference information and real-time student headcount.
- `dept_id` INT PRIMARY KEY AUTO_INCREMENT
- `dept_name` VARCHAR(100) NOT NULL UNIQUE
- `dept_code` VARCHAR(20) NOT NULL UNIQUE
- `hod_name` VARCHAR(100)
- `total_students` INT DEFAULT 0 *(maintained automatically by triggers TR3, TR4, TR5)*

### Table 2: `Placement_Officer`
Stores TPO administrative personnel.
- `officer_id` INT PRIMARY KEY AUTO_INCREMENT
- `name` VARCHAR(100) NOT NULL
- `designation` VARCHAR(100)
- `email` VARCHAR(100) UNIQUE
- `phone` VARCHAR(15)

### Table 3: `Company`
Stores registered hiring organizations.
- `company_id` INT PRIMARY KEY AUTO_INCREMENT
- `company_name` VARCHAR(150) NOT NULL
- `industry_type` VARCHAR(100)
- `website` VARCHAR(255)
- `hr_contact_name` VARCHAR(100)
- `hr_contact_email` VARCHAR(100)
- `hr_contact_phone` VARCHAR(15)
- `address` VARCHAR(255)

### Table 4: `Student`
Primary student repository. Primary key is `roll_no`.
- `roll_no` INT PRIMARY KEY AUTO_INCREMENT
- `enrollment_no` VARCHAR(20) NOT NULL UNIQUE
- `name` VARCHAR(100) NOT NULL
- `email` VARCHAR(100) NOT NULL UNIQUE
- `phone` VARCHAR(15) NOT NULL
- `dob` DATE NOT NULL
- `gender` ENUM('Male', 'Female', 'Other')
- `address` VARCHAR(255)
- `dept_id` INT (FK -> `Department.dept_id` ON UPDATE CASCADE ON DELETE SET NULL)
- `dept_name` VARCHAR(100) *(kept in sync by triggers TR1, TR2)*
- `current_year_sem` VARCHAR(10)
- `cgpa` DECIMAL(4,2) NOT NULL CHECK (cgpa BETWEEN 0 AND 10)
- `backlog_count` INT DEFAULT 0
- `percentage_10th` DECIMAL(5,2)
- `percentage_12th` DECIMAL(5,2)
- `resume_link` VARCHAR(255)

### Table 5: `Placement_Drive`
Company placement drives.
- `drive_id` INT PRIMARY KEY AUTO_INCREMENT
- `company_id` INT NOT NULL (FK -> `Company.company_id` ON UPDATE CASCADE ON DELETE RESTRICT)
- `officer_id` INT (FK -> `Placement_Officer.officer_id` ON UPDATE CASCADE ON DELETE SET NULL)
- `job_title` VARCHAR(150) NOT NULL
- `job_description` TEXT
- `offer_type` ENUM('Full-Time', 'Internship', 'Internship+FTE')
- `package_offered` DECIMAL(10,2) NOT NULL
- `vacancies` INT
- `mode` ENUM('On-Campus', 'Off-Campus', 'Virtual')
- `drive_date` DATE NOT NULL

### Table 6: `Eligibility_Criteria`
Exact eligibility requirements per drive (1-to-1 relationship with `Placement_Drive`).
- `eligibility_id` INT PRIMARY KEY AUTO_INCREMENT
- `drive_id` INT NOT NULL UNIQUE (FK -> `Placement_Drive.drive_id` ON UPDATE CASCADE ON DELETE CASCADE)
- `min_cgpa` DECIMAL(4,2)
- `max_backlogs` INT
- `eligible_departments` VARCHAR(255) *(comma-separated list e.g. 'CSE,EE' or 'ALL')*
- `min_10th_percentage` DECIMAL(5,2)
- `min_12th_percentage` DECIMAL(5,2)

### Table 7: `Application`
Student applications to drives.
- `application_id` INT PRIMARY KEY AUTO_INCREMENT
- `student_id` INT NOT NULL (FK -> `Student.roll_no` ON UPDATE CASCADE ON DELETE CASCADE)
- `drive_id` INT NOT NULL (FK -> `Placement_Drive.drive_id` ON UPDATE CASCADE ON DELETE CASCADE)
- `application_date` DATE NOT NULL
- `status` ENUM('Applied', 'Shortlisted', 'Rejected', 'Withdrawn') DEFAULT 'Applied'
- UNIQUE KEY `uq_student_drive` (`student_id`, `drive_id`)

### Table 8: `Selection_Round`
Ordered selection stages for a drive.
- `round_id` INT PRIMARY KEY AUTO_INCREMENT
- `drive_id` INT NOT NULL (FK -> `Placement_Drive.drive_id` ON UPDATE CASCADE ON DELETE CASCADE)
- `round_no` INT NOT NULL
- `round_type` ENUM('Aptitude Test', 'GD', 'Technical Interview', 'HR Interview')
- `round_date` DATE
- `mode` VARCHAR(50)
- `venue` VARCHAR(150)
- UNIQUE KEY `uq_drive_round` (`drive_id`, `round_no`)

### Table 9: `Round_Result`
Student performance in a round.
- `result_id` INT PRIMARY KEY AUTO_INCREMENT
- `student_id` INT NOT NULL (FK -> `Student.roll_no` ON UPDATE CASCADE ON DELETE CASCADE)
- `round_id` INT NOT NULL (FK -> `Selection_Round.round_id` ON UPDATE CASCADE ON DELETE CASCADE)
- `outcome` ENUM('Pass', 'Fail', 'On-Hold')
- `score` DECIMAL(5,2)
- `remarks` VARCHAR(255)
- UNIQUE KEY `uq_student_round` (`student_id`, `round_id`)

### Table 10: `Offer`
Final placement offers issued to candidates.
- `offer_id` INT PRIMARY KEY AUTO_INCREMENT
- `student_id` INT NOT NULL (FK -> `Student.roll_no` ON UPDATE CASCADE ON DELETE CASCADE)
- `drive_id` INT NOT NULL (FK -> `Placement_Drive.drive_id` ON UPDATE CASCADE ON DELETE CASCADE)
- `package_offered` DECIMAL(10,2) NOT NULL
- `offer_date` DATE NOT NULL
- `offer_status` ENUM('Pending', 'Accepted', 'Declined') DEFAULT 'Pending'

### Support Table: `Audit_Log` (Audit Trail)
Maintained exclusively by triggers TR4, TR13, and TR18.
- `log_id` INT PRIMARY KEY AUTO_INCREMENT
- `table_name` VARCHAR(30) NOT NULL
- `record_id` INT NOT NULL
- `field_name` VARCHAR(30) NOT NULL
- `old_value` VARCHAR(100)
- `new_value` VARCHAR(100)
- `changed_by` VARCHAR(100)
- `changed_at` DATETIME DEFAULT CURRENT_TIMESTAMP

---

## 3. Four-Level Enforcement Architecture

| Level | What it is | Role in CampusHire | Example |
| :--- | :--- | :--- | :--- |
| **Constraint** | UNIQUE, CHECK, FOREIGN KEY, ENUM in DDL | Single-table/row validation rules | `CHECK (cgpa BETWEEN 0 AND 10)`, `uq_student_drive` |
| **Procedure check** | Ordinary `SELECT`, `IF`, and `SIGNAL` statements | Checks application, round, and offer rules in the procedure that performs each action | `sp_apply_to_drive`, `sp_record_round_result`, `sp_issue_offer` |
| **Transaction** | Stored procedure with `START TRANSACTION`, `COMMIT`, `ROLLBACK`, `FOR UPDATE` | Atomic multi-table state transitions and concurrency serialization | `sp_respond_to_offer` (T6), `sp_issue_offer` (T5) |
| **Trigger** | Automatic database triggers on INSERT, UPDATE, DELETE | Bypasproof safety net, automated side-effects, audit logging | `trg_application_bi` (TR11), `trg_result_ai` (TR15), `trg_offer_bu` (TR17) |

---

## 4. Business Rule Checks

The project does not use stored SQL functions. The rule checks are written next to the action that needs them:

- **T3 (`sp_apply_to_drive`)** checks the drive date, accepted offers, CGPA, backlogs, school percentages, and eligible department before inserting an application.
- **T4 (`sp_record_round_result`)** checks that the student applied, the application is active, and the previous round was passed.
- **T5 (`sp_issue_offer`)** checks the shortlist, final-round result, duplicate offers, accepted offers, and available vacancies.
- The student drive list uses one SQL `CASE` expression to show an eligibility reason using those same rules.

Each procedure reports an invalid request with `SIGNAL SQLSTATE '45000'`. Keeping the checks close to the action makes them easier to follow and explain.

---

## 5. The 10 Stored Procedures / Transactions (`03_transactions.sql`)

- **T1: `sp_register_student(...)`**:
  Locks department FOR UPDATE, checks existence, inserts Student row, retrieves `LAST_INSERT_ID()`. Headcount auto-incremented by TR3.
- **T2: `sp_create_drive(...)`**:
  Validates `vacancies > 0` and `0 <= min_cgpa <= 10`. Inserts `Placement_Drive` and corresponding `Eligibility_Criteria` atomically.
- **T3: `sp_apply_to_drive(p_roll, p_drive)`**:
  Locks the student row and shares the drive row while checking eligibility, then inserts `Application` with status `'Applied'`.
- **T4: `sp_record_round_result(p_roll, p_round, p_outcome, p_score, p_remarks)`**:
  Share-locks the round and locks the application. Checks the previous round, then inserts or updates `Round_Result`. TR15 automatically transitions application status (`Pass` -> `Shortlisted`, `Fail` -> `Rejected`).
- **T5: `sp_issue_offer(p_roll, p_drive)`**:
  Locks the drive, checks the final-round result and remaining vacancies, then inserts `Offer` with status `'Pending'`.
- **T6: `sp_respond_to_offer(p_offer, p_decision)`**:
  Locks candidate's offers. If `'Declined'`, updates offer status. If `'Accepted'`, ensures no prior accepted offer, sets status to `'Accepted'`, automatically auto-declines all other pending offers and marks other active applications as `'Withdrawn'`.
- **T7: `sp_withdraw_application(p_roll, p_drive)`**:
  Locks application, ensures not already Accepted, marks application `'Withdrawn'`, auto-declines any pending offer for that drive.
- **T8: `sp_update_academic_record(p_roll, p_cgpa, p_backlogs)`**:
  Locks student row, updates CGPA and backlog count. Automatically re-evaluates all open applications (`'Applied'`) against `Eligibility_Criteria`; any that no longer qualify are automatically set to `'Rejected'`.
- **T9: `sp_transfer_student_dept(p_roll, p_new_dept)`**:
  Locks student, locks both source and destination departments in ascending `dept_id` order (preventing deadlock cycles), updates `dept_id`. TR4 adjusts headcounts (-1 old, +1 new).
- **T10: `sp_placement_report()`**:
  Executes `START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY;` returning 3 consistent result sets:
  1. Placed student count, average, max, and min package.
  2. Company-wise placements and average packages.
  3. Department-wise total students, placed students, and placement percentage.

---

## 6. The Database Triggers (`04_triggers.sql`)

- **TR1 (`trg_student_bi`)**: BEFORE INSERT ON Student -> sets `dept_name` from Department.
- **TR2 (`trg_student_bu`)**: BEFORE UPDATE ON Student -> refreshes `dept_name` if `dept_id` changed.
- **TR3 (`trg_student_ai`)**: AFTER INSERT ON Student -> increments `Department.total_students`.
- **TR4 (`trg_student_au`)**: AFTER UPDATE ON Student -> moves headcount between departments; audits CGPA and backlog changes in `Audit_Log`.
- **TR5 (`trg_student_ad`)**: AFTER DELETE ON Student -> decrements `Department.total_students`.
- **TR6 (`trg_student_bd`)**: BEFORE DELETE ON Student -> guards against deleting placed students (`Accepted` offer).
- **TR7 (`trg_elig_bi`)**: BEFORE INSERT ON Eligibility_Criteria -> validates criteria ranges (CGPA 0-10, backlogs >= 0, percentages 0-100).
- **TR8 (`trg_elig_bu`)**: BEFORE UPDATE ON Eligibility_Criteria -> same validation on updates.
- **TR9 (`trg_drive_bu`)**: BEFORE UPDATE ON Placement_Drive -> guards vacancies from being lowered below already issued offers (`Pending` + `Accepted`).
- **TR10 (`trg_drive_bd`)**: BEFORE DELETE ON Placement_Drive -> blocks deleting drives with accepted offers.
- **TR11 (`trg_application_bi`)**: BEFORE INSERT ON Application -> checks eligibility with direct `IF` conditions.
- **TR12 (`trg_application_bu`)**: BEFORE UPDATE ON Application -> state machine guard: closed applications (`Rejected`/`Withdrawn`) cannot be reopened; `Shortlisted` cannot revert to `Applied`.
- **TR13 (`trg_application_au`)**: AFTER UPDATE ON Application -> logs status transitions to `Audit_Log`.
- **TR14 (`trg_result_bi`)**: BEFORE INSERT ON Round_Result -> checks active application and previous-round result.
- **TR15 (`trg_result_ai`)**: AFTER INSERT ON Round_Result -> automatically syncs application status (`Pass` -> `Shortlisted`, `Fail` -> `Rejected`).
- **TR16 (`trg_offer_bi`)**: BEFORE INSERT ON Offer -> checks shortlist, final-round result, and vacancies.
- **TR17 (`trg_offer_bu`)**: BEFORE UPDATE ON Offer -> state machine guard: only `Pending` offers can change; prevents multiple `Accepted` offers per student.
- **TR18 (`trg_offer_au`)**: AFTER UPDATE ON Offer -> logs offer status transitions to `Audit_Log`.

---

## 7. Verified Test Scenarios (from `test_log.txt` & `trigger_test_log.txt`)

1. **T1 Rollback & Triggers**: Duplicate email or invalid department rolls back cleanly; headcount remains unchanged.
2. **T2 Atomic Drive Creation**: min_cgpa > 10 or vacancies = 0 rolls back; no orphaned drive or criteria row left.
3. **T3 Eligibility Enforcement**: Rejects low CGPA, excess backlogs, wrong department, or closed drives with precise error messages.
4. **T4 Round Progression**: Skips are refused ("student has not passed previous round"); failed candidates are rejected and barred from subsequent rounds.
5. **T5 Concurrency & Vacancies**: Multiple concurrent requests for the final vacancy result in exactly one offer issued and the second safely rejected ("all vacancies of this drive are filled").
6. **T6 Conflicting Offers**: Accepting one offer automatically auto-declines other pending offers and withdraws competing active applications. A second accept is strictly rejected.
7. **T7 Application Withdrawal**: Withdrawing an application frees any pending offer and prevents further round scheduling.
8. **T8 Academic Record Propagation**: A drop in CGPA triggers automatic re-evaluation of open applications, setting newly ineligible applications to `Rejected` and writing old/new values to `Audit_Log`.
9. **T9 Department Transfer**: Updates headcounts in both old and new departments and updates student `dept_name` safely without deadlocks.
10. **T10 Read-Only Placement Snapshot**: Generates consistent multi-result metrics without taking intrusive locks.
