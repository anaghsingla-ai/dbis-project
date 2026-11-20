# CampusHire — Implementation Plan (Python Flask + MySQL Architecture)

## 1. System Architecture Overview

CampusHire is a full-stack university placement management system designed to enforce academic business rules at the database tier using **MySQL 8.0**, with a **Python 3 + Flask REST backend** using **`mysql-connector-python`** with connection pooling (matching the CS257 course curriculum), and a modern **React (Vite + Tailwind CSS + Lucide Icons + Recharts)** frontend.

```
┌────────────────────────────────────────────────────────┐
│             React + Vite Frontend (SPA)                │
│  - Landing Page & 1-Click Role Login                   │
│  - 4 Dashboards (TPO Admin, Student, HR, Dept Coord)   │
│  - DBMS Demonstration Lab (Live Evaluation Suite)      │
│  - Interactive Reports & Visual Analytics              │
└───────────────────────────┬────────────────────────────┘
                            │ REST / JSON (JWT Bearer Token)
┌───────────────────────────▼────────────────────────────┐
│              Python 3 Flask Backend                    │
│  - Blueprint Routes (/api/auth, /api/admin, etc.)      │
│  - Connection Pool (`mysql.connector.pooling`)         │
│  - Stored Procedure Execution (`CALL sp_*`)            │
│  - Error Translation (errno 1644 / SQLSTATE 45000)     │
│  - Role-based Access Control (@token_required)         │
└───────────────────────────┬────────────────────────────┘
                            │ TCP Port 3307 / mysql.connector
┌───────────────────────────▼────────────────────────────┐
│                 MySQL 8.0 Engine                       │
│  - 10 Academic Tables + Audit_Log + User_Account       │
│  - Direct SQL eligibility, round, and offer checks     │
│  - 10 Stored Procedures / Transactions (T1 - T10)      │
│  - 18 Integrity & Audit Triggers (TR1 - TR18)          │
└────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
dbisproject/
├── frontend/                     # React + Vite application
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── api/                 # Axios clients & API modules
│       ├── components/          # Reusable UI primitives (Button, Modal, Card, StatCard, Badge, Input)
│       ├── context/             # AuthContext & ToastContext
│       ├── layouts/             # DashboardLayout, PublicLayout
│       ├── pages/
│       │   ├── public/          # LandingPage, LoginPage, UnauthorizedPage, NotFoundPage
│       │   ├── admin/           # AdminOverview, DbmsLabPage, StudentManagement, CompanyManagement,
│       │   │                    # DriveManagement, ApplicationManagement, OfferManagement, PlacementReports, AuditLogsPage
│       │   ├── student/         # StudentOverview, BrowseDrives, MyApplications, MyOffers, StudentProfile
│       │   ├── hr/              # HrOverview, HrDrives, HrApplicants
│       │   └── coordinator/     # CoordinatorOverview, CoordinatorStudents, CoordinatorAudit
│       └── main.jsx, App.jsx
├── backend/                      # Python Flask REST application
│   ├── requirements.txt
│   ├── .env, .env.example
│   ├── app.py                   # Flask App with Blueprints & CORS
│   ├── config.py                # Database and JWT configuration
│   ├── db.py                    # MySQL connection pooling & procedure execution
│   ├── auth.py                  # bcrypt password hashing & JWT decorators
│   ├── routes/                  # API Blueprint routes
│   │   ├── auth_routes.py       # Login, Me, Change Password, Demo Accounts
│   │   ├── admin_routes.py      # Stats, Students (T1), Drives (T2), Rounds, Offers (T5), Reports (T10), Audits
│   │   ├── student_routes.py    # Overview, SQL eligibility display, Apply (T3), Applications, Withdraw (T7), Respond (T6)
│   │   ├── hr_routes.py         # Company Overview, Drives, Applicants, Evaluate Round (T4)
│   │   ├── coordinator_routes.py# Dept Overview, Students, Update Marks (T8), Transfer Dept (T9), Audit History
│   │   └── dbms_lab_routes.py   # DBMS Lab: Metadata, Execute, Preset Scenarios DEMO 1-10, Automated Tests, DB Reset
│   ├── utils/
│   │   ├── errors.py            # MySQL error translation (1644, 1062, etc.)
│   │   └── serializer.py        # Decimal and Date JSON serialization
│   └── scripts/
│       └── init_db.py           # Database re-seeding via mysql.connector
├── database/
│   ├── data/                    # Isolated MySQL 8.0 data directory (Port 3307)
│   └── original/                # Backups of submitted assignment SQL files
├── 01_schema.sql                # Base DDL for 10 tables + Audit_Log
├── 03_transactions.sql          # Stored procedures T1 - T10
├── 04_triggers.sql              # Active triggers TR1 - TR18
├── 05_sample_data.sql           # Initial dataset for demonstration
└── README.md, TRANSACTION_MAPPING.md, TRIGGER_DOCUMENTATION.md, API_DOCUMENTATION.md, DEMO_SCRIPT.md
```

---

## 3. Database Architecture & Evaluation Mapping

### Stored Procedures / Transactions (T1 - T10)
| ID | Procedure | Category / Course Problem | Tables Touched | Isolation / Locking |
|---|---|---|---|---|
| **T1** | `sp_register_student` | 2.4 Headcount & Profile | Student, Department | `FOR UPDATE` on Department row |
| **T2** | `sp_create_drive` | 2.1 Placement Drive Creation | Placement_Drive, Eligibility_Criteria | Foreign key share locks |
| **T3** | `sp_apply_to_drive` | 2.1 Eligibility Verification | Application | `FOR UPDATE` on Student; `FOR SHARE` on Drive |
| **T4** | `sp_record_round_result` | 2.3 Multi-Round Sequencing | Round_Result, Application | `FOR SHARE` on Round; `FOR UPDATE` on Application |
| **T5** | `sp_issue_offer` | 2.5 Vacancy Enforcement | Offer | `FOR UPDATE` on Placement_Drive row |
| **T6** | `sp_respond_to_offer` | 2.5 One-Offer Conflict Policy | Offer, Application | `FOR UPDATE` on all Offer rows of the student |
| **T7** | `sp_withdraw_application` | 2.2 Lifecycle Management | Application, Offer | `FOR UPDATE` on Application |
| **T8** | `sp_update_academic_record`| 2.4 Academic Record Changes | Student, Application, Audit_Log | `FOR UPDATE` on Student |
| **T9** | `sp_transfer_student_dept` | 2.4 Deadlock Prevention | Student, Department | Ascending `dept_id` order locks (`LEAST`, `GREATEST`) |
| **T10**| `sp_placement_report` | 2.5 NAAC / NBA Snapshot | Offer, Drive, Company, Dept, Student | `START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY` |

### Business Rule Checks
- T3 uses ordinary `SELECT` and `IF` statements to check eligibility before an application.
- T4 checks application status and the previous round before saving a result.
- T5 checks shortlist, final-round result, existing offers, and vacancies before issuing an offer.

### Triggers (TR1 - TR18)
- **TR1 - TR6:** Student table triggers (automatic dept_name sync, department headcount maintenance `+1` on insert, `-1` on delete, adjustment on update, deletion guard for placed students).
- **TR7 - TR8:** Eligibility Criteria validation triggers (`0-10` CGPA, `0-100` percentages, `>=0` backlogs).
- **TR9 - TR10:** Placement Drive vacancy reduction guard and deletion guard for drives with accepted offers.
- **TR11 - TR13:** Application triggers (basic eligibility checks, state-machine preventing closed application reopen, Audit_Log recorder).
- **TR14 - TR15b:** Round Result triggers (previous-round check, automatic application status sync: Pass $\to$ Shortlisted, Fail $\to$ Rejected).
- **TR16 - TR18:** Offer triggers (basic offer checks, one-offer acceptance policy enforcement, Audit_Log recorder).
