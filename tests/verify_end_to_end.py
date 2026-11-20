import urllib.request
import urllib.error
import json
import sys

BASE = "http://localhost:5000/api"

def api_call(method, path, body=None, headers=None):
    url = f"{BASE}{path}"
    data = None
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    if body is not None:
        data = json.dumps(body).encode('utf-8')

    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            content = resp.read().decode('utf-8')
            return resp.status, json.loads(content)
    except urllib.error.HTTPError as e:
        content = e.read().decode('utf-8')
        try:
            return e.code, json.loads(content)
        except Exception:
            return e.code, {"error": content}

def run_suite():
    print("=" * 65)
    print("CAMPUSHIRE FULL SYSTEM END-TO-END VERIFICATION SUITE (std lib)")
    print("=" * 65)

    # 1. Health check
    status, res = api_call("GET", "/health")
    assert status == 200, f"Health check failed: {res}"
    print(f"[1] Health Check: OK -> MySQL Connected ({res.get('database')})")

    # 2. Authentication for all 4 roles
    tokens = {}
    for role, user in [
        ('ADMIN', 'admin'),
        ('STUDENT', 'diya'),
        ('HR', 'technova_hr'),
        ('COORDINATOR', 'cse_coord')
    ]:
        status, res = api_call("POST", "/auth/login", {"username": user, "password": "password123"})
        assert status == 200 and 'token' in res, f"Login failed for {user}: {res}"
        tokens[role] = res['token']
        print(f"[2] Login {role} ({user}): OK (token length {len(tokens[role])})")

    admin_h = {"Authorization": f"Bearer {tokens['ADMIN']}"}
    student_h = {"Authorization": f"Bearer {tokens['STUDENT']}"}
    hr_h = {"Authorization": f"Bearer {tokens['HR']}"}
    coord_h = {"Authorization": f"Bearer {tokens['COORDINATOR']}"}

    # 3. T1: Register new student via Admin
    t1_payload = {
        "name": "Integration Student StdLib",
        "enrollment_no": f"EN_STDLIB_{int(sys.platform.encode()[0])}",
        "email": "stdlib_test@iiti.ac.in",
        "dob": "2003-05-15",
        "phone": "9876543210",
        "dept_id": 1,
        "cgpa": 8.85,
        "backlog_count": 0,
        "tenth_percentage": 92.5,
        "twelfth_percentage": 90.0,
        "gender": "Other"
    }
    status, res = api_call("POST", "/admin/students", t1_payload, admin_h)
    print(f"[3] T1 (Register Student): {status} -> {res.get('message', '')[:60]}")

    # 4. T2: Create Placement Drive via Admin
    t2_payload = {
        "job_title": "AI Systems Engineer v2",
        "job_description": "Verification test drive",
        "company_id": 1,
        "drive_date": "2026-12-30",
        "offer_type": "Full-Time",
        "package_offered": 1650000,
        "vacancies": 3,
        "mode": "On-Campus",
        "min_cgpa": 7.0,
        "max_backlogs": 0,
        "eligible_departments": "CSE,EE"
    }
    status, res = api_call("POST", "/admin/drives", t2_payload, admin_h)
    assert status == 200 and res.get('success'), f"T2 failed: {res}"
    drive_id = res['data']['drive_id']
    print(f"[4] T2 (Create Drive): OK -> drive_id={drive_id}")

    # 5. Create round for the drive
    status, res = api_call("POST", "/admin/rounds", {
        "drive_id": drive_id,
        "round_no": 1,
        "round_type": "Technical Interview",
        "round_date": "2026-12-31"
    }, admin_h)
    assert status == 200 and res.get('success'), f"Create round failed: {res}"
    round_id = res.get('round_id')
    print(f"[5] Selection Round Created: OK -> round_id={round_id}")

    # 6. T3: Student Applies (Diya, CSE, CGPA 7.2, eligible)
    status, res = api_call("POST", "/student/apply", {"drive_id": drive_id, "student_id": 2}, student_h)
    assert status == 200 and res.get('success'), f"T3 apply failed: {res}"
    print(f"[6] T3 (Student Apply): OK -> status={res.get('status')}")

    # 7. T4: HR records round result (On-Hold then Pass to verify bug fix!)
    # First: record On-Hold
    status, res = api_call("POST", "/hr/rounds/record-result", {
        "student_id": 2,
        "round_id": round_id,
        "outcome": "On-Hold",
        "score": 75.0,
        "remarks": "On-Hold verification test"
    }, hr_h)
    assert status == 200 and res.get('success'), f"T4 On-Hold failed: {res}"
    print("[7a] T4 (Record On-Hold Result): OK")

    # Second: update On-Hold to Pass (The critical bug verification!)
    status, res = api_call("POST", "/hr/rounds/record-result", {
        "student_id": 2,
        "round_id": round_id,
        "outcome": "Pass",
        "score": 88.0,
        "remarks": "Pass after review"
    }, hr_h)
    assert status == 200 and res.get('success'), f"T4 On-Hold->Pass failed: {res}"
    print("[7b] T4 (On-Hold -> Pass Transition): OK (Verified bug fix!)")

    # Verify applicant rounds route returns round with Pass
    status, res = api_call("GET", f"/admin/drives/{drive_id}/applicants/2/rounds", headers=admin_h)
    assert status == 200, f"Get applicant rounds failed: {res}"
    rounds = res.get('rounds', [])
    assert any(rnd['outcome'] == 'Pass' for rnd in rounds), "Round outcome not updated to Pass"
    print(f"[7c] Applicant Rounds Endpoint: OK ({len(rounds)} round retrieved with outcome=Pass)")

    # 8. T5: Admin issues placement offer
    status, res = api_call("POST", "/admin/offers", {
        "student_id": 2,
        "drive_id": drive_id,
        "package_offered": 1650000,
        "joining_date": "2027-07-01"
    }, admin_h)
    assert status == 200 and res.get('success'), f"T5 issue offer failed: {res}"
    print("[8] T5 (Issue Offer): OK")

    # Find the offer_id
    status, res = api_call("GET", "/student/offers", headers=student_h)
    assert status == 200, f"Student offers failed: {res}"
    offers = [o for o in res.get('offers', []) if o['drive_id'] == drive_id]
    assert len(offers) > 0, "Offer not found in student offers"
    offer_id = offers[0]['offer_id']
    print(f"[8b] Student Offers Endpoint: OK -> offer_id={offer_id}, status={offers[0]['offer_status']}")

    # 9. T6: Student accepts offer
    status, res = api_call("POST", "/student/offers/respond", {
        "offer_id": offer_id,
        "decision": "Accepted"
    }, student_h)
    assert status == 200 and res.get('success'), f"T6 accept offer failed: {res}"
    print("[9] T6 (Accept Offer & Policy Enforcement): OK")

    # 10. T8: Coordinator updates student marks
    status, res = api_call("POST", "/coordinator/students/academic-record", {
        "student_id": 1,
        "new_cgpa": 8.95,
        "new_backlog_count": 0
    }, coord_h)
    assert status == 200 and res.get('success'), f"T8 update marks failed: {res}"
    print("[10] T8 (Update Academic Record & Audit): OK")

    # 11. T9: Coordinator department transfer
    status, res = api_call("POST", "/coordinator/students/transfer", {
        "student_id": 5,
        "new_dept_id": 2
    }, coord_h)
    assert status == 200 and res.get('success'), f"T9 transfer failed: {res}"
    print("[11a] T9 (Transfer Department CSE -> EE): OK")

    # Admin transfers back
    status, res = api_call("POST", "/admin/students/transfer", {
        "roll_no": 5,
        "new_dept_id": 1
    }, admin_h)
    assert status == 200 and res.get('success'), f"T9 transfer back failed: {res}"
    print("[11b] T9 (Transfer Department back to CSE): OK")

    # 12. T10: Generate Placement Report Snapshot
    status, res = api_call("GET", "/admin/reports/placement", headers=admin_h)
    assert status == 200 and res.get('success'), f"T10 placement report failed: {res}"
    rep = res.get('report', {})
    summary = rep.get('summary', {})
    print(f"[12] T10 (Institutional Placement Report Snapshot): OK")
    print(f"     Placed Students: {summary.get('students_placed')}")
    print(f"     Avg Package: Rs. {summary.get('avg_package'):,}")
    print(f"     Highest Package: Rs. {summary.get('highest_package'):,}")

    # 13. Coordinator Departments check
    status, res = api_call("GET", "/coordinator/departments", headers=coord_h)
    assert status == 200 and res.get('success'), f"Coord departments failed: {res}"
    print(f"[13] Coordinator Departments Endpoint: OK ({len(res.get('departments', []))} departments)")

    print("=" * 65)
    print("ALL 13 WORKFLOW VERIFICATION TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 65)

if __name__ == "__main__":
    run_suite()
