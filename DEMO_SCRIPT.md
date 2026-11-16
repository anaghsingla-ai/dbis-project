# CampusHire — 10-Minute Viva Demonstration Script

**Course:** CS 257 Database and Information Systems Lab, IIT Indore  
**Evaluation Date:** November 16, 2026  
**Audience:** Lab Instructor & Teaching Assistants

---

## 0:00 – 1:30 | Project Overview & Architecture
- **Open Browser:** `http://localhost:5173`
- **Key Talking Points:**
  - *"CampusHire is a full-stack placement portal built on real MySQL 8.0 ACID transactions, stored procedures, functions, and triggers."*
  - *"The backend uses Python 3 Flask and `mysql-connector-python` with connection pooling, exactly adhering to our CS 257 lab curriculum."*
  - *"All academic constraints, headcount invariants, vacancy checks, and one-offer rules are enforced inside the database engine, not merely on the web tier."*

---

## 1:30 – 4:00 | DBMS Demonstration Lab (The Core Evaluation Feature)
1. Click **Enter Portal** on the landing page $\to$ Click **Mrs. Kavita Joshi (TPO Head)** $\to$ Click **Sign in as TPO_ADMIN**.
2. From the sidebar, click **DBMS Lab (Live Demo)** (highlighted in gold).
3. **Show Test Suite:** Click **Run Automated Test Suite**.
   - Show all **7 test cases passing** with execution times in single-digit milliseconds.
   - Point out that these test cases run real SQL stored procedures verifying atomic rollbacks on duplicate email, criteria bounds, and round sequencing.
4. **Demonstrate Negative Cases (Database Guards):**
   - Click **DEMO 2: Ineligible Student Rejection**:
     - Explain: Student Rohan (CGPA 6.1) attempts to apply for TechNova (min CGPA 7.5).
     - Show the returned database error: `T3 failed: CGPA below drive minimum`, raised by the eligibility checks in procedure T3.
   - Click **DEMO 3: Duplicate Application Rejection**:
     - Explain how composite unique constraint `uq_student_drive(student_id, drive_id)` rejects second application.
   - Click **DEMO 7: Conflicting Offer Acceptance Prevention**:
     - Explain how Trigger `TR17` enforces the One-Offer Policy preventing a candidate from hoarding multiple job offers.

---

## 4:00 – 6:00 | Student Workflow & Eligibility Checks (T3)
1. Logout and click **Aarav Sharma (High Achiever)** $\to$ Sign in as `STUDENT`.
2. Navigate to **Browse Drives**:
   - Point out the **Eligible** badge computed from the drive criteria in the student drive query.
   - Click **Apply Now (T3)** on TechNova drive. Show the toast notification confirming procedure `sp_apply_to_drive` executed.
3. Logout and login as **Rohan Gupta (Ineligible Student)**:
   - Navigate to **Browse Drives**:
   - Point out the red badge: **Ineligible: CGPA below drive minimum (Needs 7.50, has 6.10)**.
   - Show that the database function actively informs the student of the exact deficit.

---

## 6:00 – 7:30 | Company HR Evaluation & Trigger Cascades (T4 & TR15)
1. Login as **TechNova HR** (`technova_hr` / `password123`).
2. Navigate to **Assigned Drives** $\to$ View Rounds.
3. For Round 1 (Coding Test), evaluate a candidate with **Pass** (Score: 85):
   - Explain Trigger `TR15`: Pass automatically transitions `Application.status` from `Applied` to `Shortlisted`.
4. Point out that procedure T4 checks the previous round before recording a result for round 2.

---

## 7:30 – 9:00 | Department Coordinator & Deadlock-Safe Transfers (T8 & T9)
1. Login as **Dr. A. Rao (CSE Coordinator)** (`cse_coord` / `password123`).
2. Navigate to **Student Roster**:
   - Click **Update Marks (T8)** on a student. Modify CGPA $\to$ Save.
   - Explain: Procedure `sp_update_academic_record` atomically updates the student and re-evaluates all open applications.
   - Show how Trigger `TR4` automatically captured the old and new CGPA values into `Audit_Log`.
3. Click **Academic Audit** from the sidebar to inspect the live audit log table.
4. Explain **Deadlock Prevention in T9:**
   - *"When transferring between departments, we lock departments in ascending `dept_id` order using `LEAST(dept_a, dept_b)` and `GREATEST(dept_a, dept_b)`, preventing deadlock cycles under concurrent transfers."*

---

## 9:00 – 10:00 | Consistent Reporting & Conclusion (T10)
1. Login back as **Admin**:
2. Navigate to **Placement Reports**:
   - Explain Procedure `T10` (`sp_placement_report`):
   - Executes `START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY`, generating summary metrics, company placements, and department breakdowns without taking a single write lock.
3. Show that the entire database can be reset back to pristine demo state at any moment via the **Reset Database to Clean State** button in the DBMS Lab.
