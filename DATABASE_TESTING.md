# CampusHire — Database Testing & Benchmark Documentation

**Target Database:** `CampusHire_Test`  
**Host / Port:** `127.0.0.1:3307`  
**Storage Engine:** MySQL 8.0 InnoDB  
**Isolation Architecture:** Dedicated test instance running alongside production database `CampusHire`  

---

## 1. Test Dataset Architecture & Scale

To rigorously evaluate the system against high-concurrency placement scenarios, realistic dataset generator script (`backend/scripts/generate_test_data.py`) was developed and executed. The script populates the `CampusHire_Test` database with complex, realistic data satisfying 100% of foreign key, unique, and check constraints:

| Entity / Table | Record Count | Description |
| :--- | :---: | :--- |
| **Department** | 10 | CSE, EE, ME, CE, MEMS, BSBE, MNC, EP, CH, HSS |
| **Placement_Officer** | 4 | TPO Head, Senior Officers, Operations Managers |
| **Company** | 30 | Enterprise Tech, Cloud Giants, FinTech, Analytics, Core Engineering |
| **Student** | 300 | 15% High Achievers (CGPA 9.0–10.0), 60% Average (7.0–8.9), 25% Low/Backlogs |
| **Placement_Drive** | 50 | Across All-Campus, Tech-Only, Core-Only, and Virtual hiring drives |
| **Eligibility_Criteria** | 50 | 1-to-1 matching criteria per drive with varied CGPA cutoffs and branch constraints |
| **Selection_Round** | 155 | Multi-stage rounds: Aptitude Test $\to$ GD $\to$ Tech Interview $\to$ HR Interview |
| **Application** | 1,045 | Valid, eligible candidate applications across active drives |
| **Round_Result** | 1,985 | Multi-stage candidate performance evaluations (Pass, Fail, On-Hold) |
| **Offer** | 109 | Real job offers issued (74 Accepted, conforming strictly to One-Offer policy) |
| **User_Account** | 12 | Role-based authentication credentials with salted bcrypt hashes |

---

## 2. Invariant Verification Results

An automated SQL invariant audit script was executed against `CampusHire_Test` to mathematically prove database integrity:

```sql
-- Invariant 1: Duplicate Applications
SELECT student_id, drive_id, COUNT(*) FROM Application GROUP BY student_id, drive_id HAVING COUNT(*) > 1;
--> Result: 0 rows (ZERO DUPLICATES)

-- Invariant 2: Duplicate Round Results
SELECT student_id, round_id, COUNT(*) FROM Round_Result GROUP BY student_id, round_id HAVING COUNT(*) > 1;
--> Result: 0 rows (ZERO DUPLICATES)

-- Invariant 3: One-Offer Policy Violations (Students with > 1 Accepted Offer)
SELECT student_id, COUNT(*) FROM Offer WHERE offer_status = 'Accepted' GROUP BY student_id HAVING COUNT(*) > 1;
--> Result: 0 rows (ZERO VIOLATIONS)

-- Invariant 4: Department Headcount Consistency
SELECT d.dept_id, d.total_students AS recorded, COUNT(s.roll_no) AS actual
FROM Department d LEFT JOIN Student s ON s.dept_id = d.dept_id
GROUP BY d.dept_id, d.total_students HAVING recorded <> actual;
--> Result: 0 rows (100% SYNCHRONIZED)

-- Invariant 5: Drive Vacancy Violations
SELECT d.drive_id, d.vacancies, COUNT(o.offer_id) AS accepted_count
FROM Placement_Drive d JOIN Offer o ON o.drive_id = d.drive_id AND o.offer_status = 'Accepted'
GROUP BY d.drive_id, d.vacancies HAVING accepted_count > d.vacancies;
--> Result: 0 rows (ZERO OVER-ALLOCATION)
```

---

## 3. Stored Procedure Integration Testing

All 10 stored procedures were executed against `CampusHire_Test`:

| ID | Stored Procedure | Tested Functionality | Verification Status |
| :---: | :--- | :--- | :---: |
| **T1** | `sp_register_student` | Profile creation, auto-increment roll no, department headcount increment, atomic rollback on duplicate email | **VERIFIED** |
| **T2** | `sp_create_drive` | Drive + criteria creation, atomic rollback on invalid CGPA cutoff (> 10.0), zero orphan rows | **VERIFIED** |
| **T3** | `sp_apply_to_drive` | Inline eligibility checks, rejection of low CGPA/branch mismatch, duplicate application guard | **VERIFIED** |
| **T4** | `sp_record_round_result` | Initial On-Hold recording, progression blocking, same-row update from On-Hold $\to$ Pass/Fail, finalization immutability | **VERIFIED** |
| **T5** | `sp_issue_offer` | Row-level locking on drive, verification of final round pass, rejection if vacancies exhausted | **VERIFIED** |
| **T6** | `sp_respond_to_offer` | Acceptance of offer, automatic cascade decline of competing offers, automatic withdrawal of active applications | **VERIFIED** |
| **T7** | `sp_withdraw_application` | Application status set to `Withdrawn`, pending offer set to `Declined` | **VERIFIED** |
| **T8** | `sp_update_academic_record` | Update CGPA/backlogs, trigger logging to `Audit_Log`, automatic rejection of newly-ineligible applications | **VERIFIED** |
| **T9** | `sp_transfer_student_dept` | Deadlock-free inter-department transfer using ascending lock ordering (`ORDER BY dept_id`), headcount synchronization | **VERIFIED** |
| **T10** | `sp_placement_report` | Snapshot consistent multi-table analytics executing under `START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY` | **VERIFIED** |

---

## 4. Trigger Testing & Constraint Invariants

| Trigger | Event | Table | Business Invariant Guarded | Test Outcome |
| :--- | :--- | :--- | :--- | :---: |
| `trg_student_bd` (TR6) | BEFORE DELETE | `Student` | Blocks deleting a student who has an accepted offer | **BLOCKED (45000)** |
| `trg_criteria_bi` (TR7) | BEFORE INSERT | `Eligibility_Criteria` | Validates CGPA $\in [0, 10]$ and percentages $\in [0, 100]$ | **BLOCKED (45000)** |
| `trg_drive_bu` (TR9) | BEFORE UPDATE | `Placement_Drive` | Blocks reducing vacancies below offers already accepted | **BLOCKED (45000)** |
| `trg_drive_bd` (TR10) | BEFORE DELETE | `Placement_Drive` | Blocks deleting a drive that has accepted offers | **BLOCKED (45000)** |
| `trg_app_bu` (TR12) | BEFORE UPDATE | `Application` | Blocks re-opening a closed (`Rejected`/`Withdrawn`) application | **BLOCKED (45000)** |
| `trg_result_bu` (TR14b) | BEFORE UPDATE | `Round_Result` | Blocks altering a finalized `Pass` or `Fail` evaluation | **BLOCKED (45000)** |
| `trg_result_au` (TR15b) | AFTER UPDATE | `Round_Result` | Auto-syncs `Application.status` to `Shortlisted` (Pass) or `Rejected` (Fail) | **SYNCED & AUDITED** |
| `trg_offer_bu` (TR17) | BEFORE UPDATE | `Offer` | Blocks altering an answered (`Accepted`/`Declined`) offer | **BLOCKED (45000)** |
| `trg_offer_au` (TR18) | AFTER UPDATE | `Offer` | Writes offer status transitions to `Audit_Log` | **LOGGED** |

---

## 5. Instructions for Independent Execution

### 5.1 Running the Automated Pytest Suite
```bash
# Run all 24 automated tests with verbose output
pytest tests/ -v
```

### 5.2 Re-generating Benchmark Test Data
```bash
# Re-populate CampusHire_Test with 300 students, 50 drives, and 1,045 applications
python backend/scripts/generate_test_data.py
```

### 5.3 Verifying SQL Invariants Programmatically
```bash
python -c "
import mysql.connector
conn = mysql.connector.connect(host='127.0.0.1', port=3307, user='root', password='', database='CampusHire_Test')
cur = conn.cursor()
cur.execute('SELECT student_id, round_id, COUNT(*) FROM Round_Result GROUP BY student_id, round_id HAVING COUNT(*) > 1;')
print('Duplicate Round Results:', cur.fetchall())
cur.execute('SELECT student_id, COUNT(*) FROM Offer WHERE offer_status = \'Accepted\' GROUP BY student_id HAVING COUNT(*) > 1;')
print('Multi-Offer Violations:', cur.fetchall())
"
```
