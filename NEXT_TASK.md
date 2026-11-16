# CampusHire — Next Steps & Maintenance Guide

## 1. Current State
- **MySQL 8.0 Daemon:** Running on `127.0.0.1:3307` with isolated datadir at `database/data`.
- **Python 3 + Flask REST API:** Running on `127.0.0.1:5000` with connection pooling, JWT security, and 24/24 passing tests.
- **Frontend (Vite + React):** Running on `http://localhost:5174/` (and compiled to `dist/`).
- **UI/UX Design State:** Completely redesigned to match the reference image:
  - Deep space cyber-navy palette (`#070B14`, `#0A0F1E`) with glowing cyan, electric blue, and teal accents.
  - Interactive India Placement Map with radiating transit arcs from IIT Indore to 8 placement hubs.
  - 1:1 dashboard replication of all 8 components from the reference image.
  - Consistent high-tech styling across the landing page, login page, and all four role-based dashboards.
  - Zero noisy academic SQL jargon on public pages; preserved technical lab tools in DBMS Lab tab.

---

## 2. Recommended Next Steps for Viva / Evaluation Preparation

### 1. Rehearse the 10-Minute Viva Demonstration
- Refer to [DEMO_SCRIPT.md](file:///c:/Users/anagh/Downloads/dbisproject/DEMO_SCRIPT.md) for a structured walkthrough during the lab evaluation on November 16, 2026.
- Log in using 1-Click Demo Login as TPO Admin (`admin` / `password123`):
  1. Show the main dashboard with the glowing wave spline chart, interactive India placement map, and application trends.
  2. Navigate to **DBMS Demonstration Lab** (`/admin/dbms-lab`):
     - Click **Run Automated Test Suite** to show all automated test cases passing in real time.
     - Demonstrate **DEMO 2: Ineligible Student Rejection** (Signals SQLSTATE 45000).
     - Demonstrate **DEMO 8: Deadlock-Free Department Transfer** (shows headcount synchronization).
     - Demonstrate **DEMO 7: Conflicting Offer Acceptance** (shows one-offer policy).

### 2. Service Management
- Start MySQL (port 3307):
  ```powershell
  & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqld.exe" --datadir="C:\Users\anagh\Downloads\dbisproject\database\data" --port=3307 --mysqlx=0 --console
  ```
- Start Flask backend:
  ```powershell
  python backend/app.py
  ```
- Start React frontend:
  ```powershell
  cd frontend
  npm run dev
  ```

### 3. Automated Test Execution
- To re-verify all 24 database invariants via pytest:
  ```powershell
  python -m pytest tests/ -v
  ```
- To execute the 13-stage live REST API and database integration suite:
  ```powershell
  python tests/verify_end_to_end.py
  ```
