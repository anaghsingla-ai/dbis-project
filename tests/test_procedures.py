"""
Stored Procedures (T1 - T10) Integration Test Suite
Executes real ACID stored procedures against CampusHire_Test:
Verifies parameters, transaction commit/rollback, return sets, and table mutations.
"""

import time
import pytest

def test_t1_register_student_and_rollback(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)

    # Fetch initial department headcount
    cur.execute("SELECT dept_id, total_students FROM Department WHERE dept_id = 1;")
    initial_dept = cur.fetchone()
    initial_count = initial_dept['total_students']

    # 1. Valid registration with unique dynamic values
    uid = int(time.time() * 1000) % 10000000
    enrollment = f"EN_{uid}"
    email = f"candidate_{uid}@iiti.ac.in"
    cur.callproc('sp_register_student', (
        enrollment, "Test Candidate T1", email, "9199999999", "2003-05-15",
        "Female", "Hostel H1", 1, "7-1", 8.40, 0, 92.0, 90.0, "https://iiti.ac.in/resume.pdf"
    ))
    for r in cur.stored_results():
        res = r.fetchall()
        assert res[0]['result'] == 'Student registered'
        new_roll = res[0]['roll_no']

    # Verify student exists and headcount incremented via TR3
    cur.execute("SELECT * FROM Student WHERE roll_no = %s;", (new_roll,))
    assert cur.fetchone() is not None
    cur.execute("SELECT total_students FROM Department WHERE dept_id = 1;")
    assert cur.fetchone()['total_students'] == initial_count + 1

    # 2. Duplicate email rollback
    try:
        cur.callproc('sp_register_student', (
            f"DUP_{uid}", "Duplicate Candidate", email, "9199999998", "2003-05-15",
            "Male", "Hostel H1", 1, "7-1", 7.50, 0, 85.0, 85.0, None
        ))
        for r in cur.stored_results(): r.fetchall()
        pytest.fail("Should have rolled back on duplicate email")
    except Exception as e:
        assert 'duplicate' in str(e).lower() or 'email' in str(e).lower()

    # Verify headcount was NOT incremented on failed transaction
    cur.execute("SELECT total_students FROM Department WHERE dept_id = 1;")
    assert cur.fetchone()['total_students'] == initial_count + 1

    cur.close()

def test_t2_create_drive_atomic_rollback(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)

    # 1. Valid drive creation
    cur.callproc('sp_create_drive', (
        1, 1, 'AI Systems Engineer', 'Cutting edge ML systems',
        'Full-Time', 2200000, 3, 'On-Campus', '2026-12-15',
        8.00, 0, 'CSE,EE', 75.0, 75.0
    ))
    drive_id = None
    for r in cur.stored_results():
        res = r.fetchall()
        assert 'Drive created' in res[0]['result']
        drive_id = res[0]['drive_id']

    assert drive_id is not None
    cur.execute("SELECT * FROM Placement_Drive WHERE drive_id = %s;", (drive_id,))
    assert cur.fetchone() is not None
    cur.execute("SELECT * FROM Eligibility_Criteria WHERE drive_id = %s;", (drive_id,))
    assert cur.fetchone() is not None

    # 2. Invalid criteria (min_cgpa = 11.5) must roll back atomically
    cur.execute("SELECT COUNT(*) as c FROM Placement_Drive;")
    count_before = cur.fetchone()['c']

    try:
        cur.callproc('sp_create_drive', (
            1, 1, 'Bad Drive', 'Invalid CGPA',
            'Full-Time', 1000000, 1, 'On-Campus', '2026-12-20',
            11.50, 0, 'ALL', 70.0, 70.0
        ))
        for r in cur.stored_results(): r.fetchall()
        pytest.fail("Should have rolled back on min_cgpa > 10")
    except Exception as e:
        assert 'min_cgpa' in str(e).lower() or 'between 0 and 10' in str(e).lower()

    # Zero orphan rows left in Placement_Drive
    cur.execute("SELECT COUNT(*) as c FROM Placement_Drive;")
    assert cur.fetchone()['c'] == count_before

    cur.close()

def test_t3_apply_to_drive_eligibility_enforcement(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)

    # 1. Create a drive with high CGPA cutoff (9.80)
    cur.callproc('sp_create_drive', (
        1, 1, 'Strict Criteria Drive', 'High CGPA Only', 'Full-Time', 2500000, 2, 'On-Campus', '2026-12-25',
        9.80, 0, 'CSE,EE', 80.0, 80.0
    ))
    strict_drive_id = None
    for r in cur.stored_results():
        strict_drive_id = r.fetchall()[0]['drive_id']

    # Find student with CGPA < 9.80 who has no accepted offer
    cur.execute("""
        SELECT roll_no, cgpa FROM Student 
        WHERE cgpa < 9.0 
        AND NOT EXISTS (SELECT 1 FROM Offer WHERE student_id = roll_no AND offer_status = 'Accepted')
        LIMIT 1;
    """)
    low_student = cur.fetchone()
    student_id = low_student['roll_no']

    # Attempt to apply -> T3 and TR11 reject the ineligible student
    try:
        cur.callproc('sp_apply_to_drive', (student_id, strict_drive_id))
        for r in cur.stored_results(): r.fetchall()
        pytest.fail("Low CGPA student application should have been rejected")
    except Exception as e:
        assert 'cgpa below drive minimum' in str(e).lower()

    # 2. Create an open drive with 0.0 CGPA and ALL departments
    cur.callproc('sp_create_drive', (
        1, 1, 'Open Application Drive', 'Open to all', 'Full-Time', 1200000, 5, 'Virtual', '2026-12-25',
        0.00, 10, 'ALL', 0.0, 0.0
    ))
    open_drive_id = None
    for r in cur.stored_results():
        open_drive_id = r.fetchall()[0]['drive_id']

    # Pick an unplaced student
    cur.execute("""
        SELECT s.roll_no FROM Student s
        WHERE NOT EXISTS (SELECT 1 FROM Offer WHERE student_id = s.roll_no AND offer_status = 'Accepted')
        LIMIT 1;
    """)
    eligible_student = cur.fetchone()['roll_no']

    cur.callproc('sp_apply_to_drive', (eligible_student, open_drive_id))
    for r in cur.stored_results():
        res = r.fetchall()
        assert res[0]['result'] == 'Application submitted'

    # Duplicate application must fail
    try:
        cur.callproc('sp_apply_to_drive', (eligible_student, open_drive_id))
        for r in cur.stored_results(): r.fetchall()
        pytest.fail("Duplicate application should have failed")
    except Exception as e:
        assert 'duplicate' in str(e).lower() or 'uq_student_drive' in str(e).lower()

    cur.close()

def test_t6_t7_offer_and_withdrawal_lifecycle(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)

    # Pick an unplaced student
    cur.execute("""
        SELECT s.roll_no FROM Student s
        WHERE NOT EXISTS (SELECT 1 FROM Offer WHERE student_id = s.roll_no AND offer_status = 'Accepted')
        LIMIT 1;
    """)
    student_id = cur.fetchone()['roll_no']

    # Create 2 open test drives for lifecycle testing
    cur.callproc('sp_create_drive', (
        1, 1, 'Lifecycle Role A', 'Test Role A', 'Full-Time', 1500000, 5, 'On-Campus', '2026-12-30',
        0.0, 10, 'ALL', 0.0, 0.0
    ))
    d1 = None
    for r in cur.stored_results():
        d1 = r.fetchall()[0]['drive_id']

    cur.callproc('sp_create_drive', (
        2, 1, 'Lifecycle Role B', 'Test Role B', 'Full-Time', 1800000, 5, 'Virtual', '2026-12-30',
        0.0, 10, 'ALL', 0.0, 0.0
    ))
    d2 = None
    for r in cur.stored_results():
        d2 = r.fetchall()[0]['drive_id']

    cur.execute("INSERT INTO Application (student_id, drive_id, application_date, status) VALUES (%s, %s, CURDATE(), 'Shortlisted');", (student_id, d1))
    cur.execute("INSERT INTO Application (student_id, drive_id, application_date, status) VALUES (%s, %s, CURDATE(), 'Shortlisted');", (student_id, d2))

    # Add final selection round for both drives
    cur.execute("INSERT INTO Selection_Round (drive_id, round_no, round_type, round_date) VALUES (%s, 1, 'HR Interview', CURDATE());", (d1,))
    r1 = cur.lastrowid
    cur.execute("INSERT INTO Selection_Round (drive_id, round_no, round_type, round_date) VALUES (%s, 1, 'HR Interview', CURDATE());", (d2,))
    r2 = cur.lastrowid

    cur.execute("INSERT INTO Round_Result (student_id, round_id, outcome, score) VALUES (%s, %s, 'Pass', 90.0);", (student_id, r1))
    cur.execute("INSERT INTO Round_Result (student_id, round_id, outcome, score) VALUES (%s, %s, 'Pass', 90.0);", (student_id, r2))

    # Issue pending offers via T5
    cur.callproc('sp_issue_offer', (student_id, d1))
    offer_1_id = None
    for r in cur.stored_results():
        offer_1_id = r.fetchall()[0]['offer_id']

    cur.callproc('sp_issue_offer', (student_id, d2))
    offer_2_id = None
    for r in cur.stored_results():
        offer_2_id = r.fetchall()[0]['offer_id']

    # 1. Student accepts Offer 2 via T6
    cur.callproc('sp_respond_to_offer', (offer_2_id, 'Accepted'))
    for r in cur.stored_results(): r.fetchall()

    # Offer 2 must be Accepted
    cur.execute("SELECT offer_status FROM Offer WHERE offer_id = %s;", (offer_2_id,))
    assert cur.fetchone()['offer_status'] == 'Accepted'

    # Offer 1 must be automatically Declined by One-Offer policy
    cur.execute("SELECT offer_status FROM Offer WHERE offer_id = %s;", (offer_1_id,))
    assert cur.fetchone()['offer_status'] == 'Declined'

    # Application for Drive 1 must be automatically Withdrawn
    cur.execute("SELECT status FROM Application WHERE student_id = %s AND drive_id = %s;", (student_id, d1))
    assert cur.fetchone()['status'] == 'Withdrawn'

    # 2. Cannot accept second offer (TR17 guard)
    try:
        cur.callproc('sp_respond_to_offer', (offer_1_id, 'Accepted'))
        for r in cur.stored_results(): r.fetchall()
        pytest.fail("Should have prevented second accepted offer")
    except Exception as e:
        assert 'already been answered' in str(e).lower() or 'cannot be changed' in str(e).lower()

    cur.close()

def test_t8_update_academic_record_and_audit(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)

    cur.execute("SELECT roll_no, cgpa, backlog_count FROM Student LIMIT 1;")
    st = cur.fetchone()
    roll_no = st['roll_no']
    new_cgpa = round((float(st['cgpa']) + 0.1) % 10.0, 2)
    new_backlogs = st['backlog_count'] + 1

    # Call T8
    cur.callproc('sp_update_academic_record', (roll_no, new_cgpa, new_backlogs))
    for r in cur.stored_results():
        res = r.fetchall()
        assert res[0]['result'] == 'Academic record updated'

    # Verify student row updated
    cur.execute("SELECT cgpa, backlog_count FROM Student WHERE roll_no = %s;", (roll_no,))
    updated = cur.fetchone()
    assert float(updated['cgpa']) == new_cgpa
    assert updated['backlog_count'] == new_backlogs

    # Verify TR4 wrote to Audit_Log
    cur.execute("SELECT * FROM Audit_Log WHERE table_name = 'Student' AND record_id = %s ORDER BY log_id DESC LIMIT 2;", (roll_no,))
    logs = cur.fetchall()
    assert len(logs) > 0
    fields = [l['field_name'] for l in logs]
    assert 'cgpa' in fields or 'backlog_count' in fields

    cur.close()

def test_t9_deadlock_free_department_transfer(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)

    cur.execute("SELECT roll_no, dept_id FROM Student WHERE dept_id = 1 LIMIT 1;")
    st = cur.fetchone()
    roll_no = st['roll_no']
    old_dept = st['dept_id']
    new_dept = 2

    cur.execute("SELECT total_students FROM Department WHERE dept_id = %s;", (old_dept,))
    count_old_before = cur.fetchone()['total_students']
    cur.execute("SELECT total_students FROM Department WHERE dept_id = %s;", (new_dept,))
    count_new_before = cur.fetchone()['total_students']

    # Call T9
    cur.callproc('sp_transfer_student_dept', (roll_no, new_dept))
    for r in cur.stored_results():
        res = r.fetchall()
        assert res[0]['result'] == 'Student transferred'

    # Verify Student.dept_id updated and dept_name refreshed by TR2
    cur.execute("SELECT dept_id, dept_name FROM Student WHERE roll_no = %s;", (roll_no,))
    transferred = cur.fetchone()
    assert transferred['dept_id'] == new_dept
    assert 'Electrical' in transferred['dept_name']

    # Verify headcounts updated in both departments by TR4
    cur.execute("SELECT total_students FROM Department WHERE dept_id = %s;", (old_dept,))
    assert cur.fetchone()['total_students'] == count_old_before - 1
    cur.execute("SELECT total_students FROM Department WHERE dept_id = %s;", (new_dept,))
    assert cur.fetchone()['total_students'] == count_new_before + 1

    cur.close()

def test_t10_placement_report_consistent_snapshot(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)

    cur.callproc('sp_placement_report', ())
    result_sets = []
    for r in cur.stored_results():
        result_sets.append(r.fetchall())

    assert len(result_sets) == 3, f"Expected 3 result sets, got {len(result_sets)}"
    summary = result_sets[0][0]
    companies = result_sets[1]
    departments = result_sets[2]

    assert 'students_placed' in summary
    assert 'avg_package' in summary
    assert 'highest_package' in summary
    assert 'lowest_package' in summary
    assert len(companies) > 0
    assert len(departments) > 0

    cur.close()
