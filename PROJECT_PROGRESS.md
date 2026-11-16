# CampusHire — Project Progress Tracking

**CS257 Database and Information Systems Lab — Minor Project**  
**Evaluation Date:** November 16, 2026  
**Status:** **Fully Implemented, Verified & Redesigned to Match High-Tech SaaS Reference Image**

---

## 1. Milestones Completed

### Database Tier (MySQL 8.0)
- [x] **Isolated Database Environment:** Running MySQL 8.0 daemon on port 3307 with isolated datadir at `database/data`.
- [x] **10 Academic Tables:** `Department`, `Placement_Officer`, `Company`, `Student`, `Placement_Drive`, `Eligibility_Criteria`, `Application`, `Selection_Round`, `Round_Result`, `Offer`.
- [x] **System Tables:** `Audit_Log` (written exclusively by triggers) and `User_Account` (bcrypt credentials for authentication).
- [x] Eligibility and workflow checks are written directly in procedures T3, T4, and T5.
- [x] **10 Stored Procedures (T1 - T10):** All ACID transactions implemented with appropriate isolation and lock-ordering.
- [x] **18 Database Triggers:** Automatic synchronization, direct `IF` checks, and audit trail generation.
- [x] **Seeded Test Data:** Multi-department, multi-company dataset with varying CGPA/backlog scenarios for edge-case demonstration.

### Backend Tier (Python 3 + Flask + mysql-connector-python)
- [x] **Course-Aligned Architecture:** Migrated cleanly from Express to Python Flask + `mysql.connector` matching CS257 course requirements.
- [x] **Connection Pooling:** Initialized connection pool with `mysql.connector.pooling.MySQLConnectionPool`.
- [x] **Procedure Invocation:** `call_procedure()` cleanly iterates `stored_results()` to fetch single and multi-result sets (`sp_placement_report`).
- [x] **Error Handling:** Translates MySQL `errno 1644` (SIGNAL SQLSTATE 45000) and `errno 1062` into clean, actionable messages.
- [x] **Security & Auth:** Secure password hashing with bcrypt, JWT bearer token verification (`@token_required`), and role enforcement (`@role_required`).
- [x] **Clean Blueprint Modularity:**
  - `auth_routes.py`: `/api/auth/login`, `/me`, `/change-password`, `/demo-accounts`
  - `admin_routes.py`: Full administrative control over students, companies, drives, rounds, offers, and live reports
  - `student_routes.py`: Personal overview, eligibility calculation in SQL, 1-click apply (T3), withdrawal (T7), offer response (T6)
  - `hr_routes.py`: Company-scoped drive tracking, candidate evaluation (T4)
  - `coordinator_routes.py`: Department roster, marks update (T8), department transfer (T9), audit trail
  - `dbms_lab_routes.py`: Interactive evaluation lab, dynamic procedure execution, preset scenarios (DEMO 1-10), test runner, database reset

### Frontend Tier — Ultra-Premium Futuristic High-Tech SaaS Redesign (Matching Reference Image)
- [x] **Deep Cyber-Navy Aesthetic:** Implemented deep midnight navy background (`#070B14`, `#0A0F1E`) with glowing electric cyan (`#06B6D4`, `#22D3EE`), neon royal blue (`#2563EB`, `#3B82F6`), and teal (`#14B8A6`) accents.
- [x] **Glassmorphism & Neon Shadows:** High-tech frosted glass cards (`.cyber-card`), glowing borders (`neon-border-cyan`), and subtle ambient radiant gradients.
- [x] **Interactive India Placement Map:** Accurate SVG map of India in high-tech styling featuring:
  - Central origin beacon at IIT Indore with radiating animated pulse rings.
  - Glowing curved transit arcs to major placement hubs (Bengaluru, Hyderabad, Pune, Mumbai, Delhi-NCR, Chennai, Kolkata, Ahmedabad).
  - Clickable/hoverable hub pins with real-time popup cards detailing active drives, placements, and top recruiting companies.
  - 3 floating metric counters matching reference screenshot (Active Companies, Cities, Hiring Hubs).
- [x] **Executive Dashboard (AdminOverview) 1:1 Match with Reference Screenshot:**
  - **Card 1: Placement Overview** with 4 KPI chips (Eligible, Placed, Placement Rate, Avg. CTC) and glowing cyan spline area wave chart.
  - **Card 2: India Placement Map** (interactive center stage).
  - **Card 3: Application Trends** dual neon line chart (Applications vs Shortlisted) with legend indicators.
  - **Card 4: Recent Drives** with company badges, applicant counters, round status pills.
  - **Card 5: Department Placement Stats** with horizontal glowing cyan-to-teal progress bars.
  - **Card 6: Upcoming Interviews** schedule with date blocks, company tags, round pills, and interview times.
  - **Card 7: Top Recruiting Companies** horizontal company logo tiles with highest and avg CTCs.
  - **Card 8: New Placement Drive Callout Banner** with glowing teal gradient and action button.
- [x] **Reference-Accurate Sidebar & Top Navigation Bar:**
  - Active navigation pill in electric blue (`#1E6BFF`) with subtle glow.
  - Institute building vector graphic at sidebar bottom with glowing cyan wave and aurora aura.
  - Top header with browser navigation buttons (`← →`), global search bar with dark glass styling, institution dropdown, academic year pill, notification bell with red badge (`5`), and user profile avatar.
- [x] **Clean Public Presentation:** Redesigned `LandingPage.jsx` and `LoginPage.jsx` with enterprise SaaS copy, removing noisy SQL/procedure text while preserving technical demonstration in the dedicated DBMS Lab for examiners.
- [x] **Production Build Verified:** `npm run build` succeeds cleanly in 1.55s.

---

## 2. Test Verification Summary

### Test Verification Summary

### Comprehensive Pytest Suite (24 / 24 Passed, 100% Pass Rate)

| Test Module | Tests | Description | Result |
| :--- | :---: | :--- | :---: |
| `tests/test_auth_security.py` | 7 | JWT Auth, Role RBAC, Cross-Company Isolation, Cross-Dept Isolation, Bcrypt hashes | **7/7 PASSED** |
| `tests/test_on_hold_workflow.py` | 3 | Critical Bug Fix: On-Hold $\to$ Pass/Fail same-row update, zero duplicates, status sync | **3/3 PASSED** |
| `tests/test_procedures.py` | 7 | T1 (Student Reg), T2 (Atomic Drive), T3 (Eligibility), T6/T7 (One-Offer), T8, T9, T10 | **7/7 PASSED** |
| `tests/test_triggers.py` | 7 | TR1-TR3 (Counts), TR4 (CGPA Audit), TR11/TR12/TR14 (Guards), TR15 (Cascade) | **7/7 PASSED** |
| **Total** | **24** | **Complete Database Integration and Invariants Verified** | **24/24 PASSED (100%)** |

### Live System End-to-End Verification (`tests/verify_end_to_end.py`) (13 / 13 Passed, 100% Pass Rate)

| Workflow Step | Description | Result |
| :--- | :--- | :---: |
| Step 1 | Backend Health Check & MySQL connectivity validation | **PASSED** |
| Step 2 | Multi-role Authentication (Admin, Student, HR, Coordinator) | **PASSED** |
| Step 3 | T1: Register new student with atomic department headcount update | **PASSED** |
| Step 4 | T2: Create placement drive with eligibility criteria atomically | **PASSED** |
| Step 5 | Create selection interview round for drive | **PASSED** |
| Step 6 | T3: Student application with eligibility guard enforcement (CGPA, backlogs, department) | **PASSED** |
| Step 7a | T4: HR evaluation recording candidate as On-Hold | **PASSED** |
| Step 7b | T4: On-Hold $\to$ Pass transition without duplicate rows (Critical Bug verified fixed) | **PASSED** |
| Step 7c | Nested Applicant Rounds retrieval endpoint verified | **PASSED** |
| Step 8 | T5: TPO Admin issues formal placement offer | **PASSED** |
| Step 9 | T6: Student accepts offer; One-Offer policy and duplicate application closure enforced | **PASSED** |
| Step 10 | T8: Coordinator updates student CGPA; TR4 audit trail generated automatically | **PASSED** |
| Step 11 | T9: Deadlock-free department transfer with headcount balance synchronization | **PASSED** |
| Step 12 | T10: Placement report consistent snapshot generation (dept-wise & company-wise) | **PASSED** |
| Step 13 | Coordinator departments listing endpoint for transfer modal | **PASSED** |
