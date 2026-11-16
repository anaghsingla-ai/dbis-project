# CampusHire — Full-Stack College Placement Management System

**IIT Indore — CS 257 Database and Information Systems Lab Minor Project**  
**Evaluation Date:** November 16, 2026  
**Supervised by:** Mrs. Aruna Tiwari  

**Team Members:**
- Anagh Singla (Roll: 250001006)
- Arush Agrawal (Roll: 250001008)
- Bhuvaneesh Vijayvargiya (Roll: 250001017)
- Jay Gupta (Roll: 250001035)

---

## 1. System Overview

CampusHire is a university placement management platform that enforces academic eligibility, multi-round selection pipelines, headcount synchronization, and one-offer conflict resolution directly at the database tier using **MySQL 8.0**.

The application features:
- **Database Engine:** MySQL 8.0 with 10 academic tables, 10 stored procedures (`T1`–`T10`), 20 active database triggers (`TR1`–`TR18`), and an audit trail table (`Audit_Log`). Eligibility and workflow rules use direct SQL checks.
- **Backend API:** Python 3 + Flask + `mysql-connector-python` with connection pooling, JWT authentication, and bcrypt password hashing.
- **Frontend SPA:** React 19 + Vite + Tailwind CSS + Lucide Icons + Recharts with responsive dashboards for all four stakeholder roles.
- **DBMS Demonstration Lab:** Dedicated interactive workbench for faculty evaluation with 10 preset demonstration scenarios, dynamic procedure execution, and an automated integration test runner.

---

## 2. Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- MySQL 8.0+

### Step 1: Start MySQL Database
The project utilizes an isolated MySQL instance configured on port `3307`:
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --datadir="C:\Users\anagh\Downloads\dbisproject\database\data" --port=3307 --mysqlx=0 --console
```
*(For a fresh installation only, when `CampusHire` does not exist, run `python backend/scripts/init_db.py`. It stops if that database already exists.)*

If the database tables already exist but login reports that `User_Account` is missing, run `python backend/scripts/setup_user_accounts.py CampusHire`. This adds the login table and accounts for records that exist; it does not reset the database.

### Step 2: Start Python Flask Backend
In a terminal:
```powershell
# Install dependencies (if not already installed)
pip install -r backend/requirements.txt

# Start Flask API server on port 5000
python backend/app.py
```
Backend runs at: `http://localhost:5000`  
Health check endpoint: `http://localhost:5000/api/health`

### Step 3: Start React Frontend
In a second terminal:
```powershell
cd frontend
npm install
npm run dev
```
Frontend runs at: `http://localhost:5173`

---

## 3. Demo Login Credentials (1-Click Login Available)

On the login page (`http://localhost:5173/login`), a 1-click **Quick Demo Login** button is provided for every role:

| Role | Username | Password | Purpose & Description |
|---|---|---|---|
| **TPO_ADMIN** | `admin` | `password123` | TPO Administrative Head (Mrs. Kavita Joshi) — Full administrative access & DBMS Lab |
| **STUDENT** | `aarav` | `password123` | Aarav Sharma (CSE, CGPA 8.50, 0 backlogs) — Eligible for all drives |
| **STUDENT** | `diya` | `password123` | Diya Verma (CSE, CGPA 7.20, 0 backlogs) |
| **STUDENT** | `karan` | `password123` | Karan Patel (EE, CGPA 8.00, 1 backlog) |
| **STUDENT** | `meera` | `password123` | Meera Nair (ME, CGPA 9.10, 0 backlogs) |
| **STUDENT** | `rohan` | `password123` | Rohan Gupta (CSE, CGPA 6.10, 2 backlogs) — Ineligible for high-cutoff drives |
| **COMPANY_HR** | `technova_hr` | `password123` | TechNova HR (IT / Software) |
| **COMPANY_HR** | `dataworks_hr` | `password123` | DataWorks HR (Analytics) |
| **COMPANY_HR** | `coremech_hr` | `password123` | CoreMech HR (Core Mechanical) |
| **DEPARTMENT_COORDINATOR** | `cse_coord` | `password123` | Dr. A. Rao (CSE Department Coordinator) |
| **DEPARTMENT_COORDINATOR** | `ee_coord` | `password123` | Dr. S. Mehta (EE Department Coordinator) |
| **DEPARTMENT_COORDINATOR** | `me_coord` | `password123` | Dr. P. Nair (ME Department Coordinator) |

---

## 4. Key Architectural Features

### Stored Procedures / ACID Transactions (T1 – T10)
- **T1 (`sp_register_student`):** Student registration with automatic department headcount increment.
- **T2 (`sp_create_drive`):** Atomic drive and criteria creation (all-or-nothing rollback).
- **T3 (`sp_apply_to_drive`):** Creates an application; TR11 checks eligibility before insertion.
- **T4 (`sp_record_round_result`):** Multi-round evaluation sequencing; auto-cascades application status via TR15.
- **T5 (`sp_issue_offer`):** Concurrency-safe vacancy enforcement via `FOR UPDATE` lock.
- **T6 (`sp_respond_to_offer`):** One-Offer Policy enforcement; accepting auto-declines other pending offers.
- **T7 (`sp_withdraw_application`):** Lifecycle management preventing reopening of closed applications.
- **T8 (`sp_update_academic_record`):** CGPA/backlog modification with automatic open-application re-evaluation.
- **T9 (`sp_transfer_student_dept`):** Department transfer with two department rows locked in ascending ID order.
- **T10 (`sp_placement_report`):** Three placement summary queries in one transaction.

### Triggers (TR1 – TR18)
- **Headcount Synchronization:** `TR3` (+1), `TR4` (adjust), `TR5` (-1).
- **Integrity Guards:** `TR6` (placed student delete guard), `TR7`/`TR8` (criteria bounds), `TR9` (vacancy guard), `TR10` (drive delete guard), `TR11` (eligibility check), `TR14` (round sequence), `TR16` (offer validity), `TR17` (one-offer policy).
- **Audit Logging:** `TR4` (marks change), `TR13` (application status), `TR18` (offer status) logged to `Audit_Log`.

---

## 5. Documentation Links

- [IMPLEMENTATION_PLAN.md](file:///c:/Users/anagh\Downloads/dbisproject/IMPLEMENTATION_PLAN.md): Architectural roadmap and directory structure.
- [TRANSACTION_MAPPING.md](file:///c:/Users/anagh\Downloads/dbisproject/TRANSACTION_MAPPING.md): Traceability matrix from UI action $\to$ API $\to$ Stored Procedure $\to$ Triggers.
- [TRIGGER_DOCUMENTATION.md](file:///c:/Users/anagh\Downloads/dbisproject/TRIGGER_DOCUMENTATION.md): Complete specifications for TR1 through TR18.
- [API_DOCUMENTATION.md](file:///c:/Users/anagh\Downloads/dbisproject/API_DOCUMENTATION.md): Complete REST endpoint catalog.
- [DEMO_SCRIPT.md](file:///c:/Users/anagh\Downloads/dbisproject/DEMO_SCRIPT.md): Step-by-step 10-minute viva evaluation walkthrough.
- [REPORT_EXTENSION.md](file:///c:/Users/anagh\Downloads/dbisproject/REPORT_EXTENSION.md): Formal transaction & trigger project report extension.

## Classroom explanation

Start with [TRANSACTIONS_TRIGGERS_GUIDE.md](TRANSACTIONS_TRIGGERS_GUIDE.md) for the simplified explanation and [transaction_classroom_examples.sql](transaction_classroom_examples.sql) for ROLLBACK and SAVEPOINT demonstrations. The submitted schema is unchanged.
