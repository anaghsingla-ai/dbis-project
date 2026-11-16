"""
Comprehensive regression test suite for Round Result Transitions:
- No result -> On-Hold
- On-Hold -> Pass (same row update, TR15b Shortlisted sync, progression unlocked)
- On-Hold -> Fail (same row update, TR15b Rejected sync, progression blocked)
- Finalized Pass/Fail modification blocked by TR14b
- Zero duplicate (student_id, round_id) rows
"""

import time
import pytest

def create_isolated_student_and_drive(cur, prefix):
    uid = int(time.time() * 1000) % 10000000
    enrollment = f"{prefix}_{uid}"
    email = f"{prefix}_{uid}@iiti.ac.in"

    # Register student
    cur.callproc('sp_register_student', (
        enrollment, f"Candidate {prefix}", email, "9188888888", "2003-01-01",
        "Male", "Hostel H1", 1, "7-1", 8.80, 0, 90.0, 90.0, None
    ))
    student_id = None
    for r in cur.stored_results():
        student_id = r.fetchall()[0]['roll_no']

    # Create drive
    cur.callproc('sp_create_drive', (
        1, 1, f'{prefix} Drive', 'Workflow Test Role', 'Full-Time', 1600000, 5, 'On-Campus', '2026-12-31',
        6.00, 0, 'ALL', 0.0, 0.0
    ))
    drive_id = None
    for r in cur.stored_results():
        drive_id = r.fetchall()[0]['drive_id']

    # Create 2 rounds
    cur.execute("INSERT INTO Selection_Round (drive_id, round_no, round_type, round_date) VALUES (%s, 1, 'Technical Interview', CURDATE());", (drive_id,))
    round_1_id = cur.lastrowid
    cur.execute("INSERT INTO Selection_Round (drive_id, round_no, round_type, round_date) VALUES (%s, 2, 'HR Interview', CURDATE());", (drive_id,))
    round_2_id = cur.lastrowid

    # Apply student to drive
    cur.callproc('sp_apply_to_drive', (student_id, drive_id))
    for r in cur.stored_results():
        r.fetchall()

    return student_id, drive_id, round_1_id, round_2_id

def test_on_hold_to_pass_workflow(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)
    student_id, drive_id, round_1_id, round_2_id = create_isolated_student_and_drive(cur, "OHP")

    # 1. Record On-Hold in Round 1
    cur.callproc('sp_record_round_result', (student_id, round_1_id, 'On-Hold', 68.0, 'Review pending'))
    for r in cur.stored_results():
        res = r.fetchall()
        assert len(res) > 0

    # Verify result row exists in MySQL with On-Hold
    cur.execute("SELECT result_id, outcome, score FROM Round_Result WHERE student_id = %s AND round_id = %s;", (student_id, round_1_id))
    r1_row = cur.fetchone()
    assert r1_row is not None
    assert r1_row['outcome'] == 'On-Hold'
    initial_res_id = r1_row['result_id']

    # 2. Verify candidate CANNOT progress to Round 2 while On-Hold
    # The procedure itself checks that the previous round was passed.
    try:
        cur.callproc('sp_record_round_result', (student_id, round_2_id, 'Pass', 85.0, 'premature'))
        for r in cur.stored_results(): r.fetchall()
        pytest.fail("Should have blocked progression to Round 2 while Round 1 is On-Hold")
    except Exception as e:
        assert 'previous round' in str(e).lower()

    # 3. Transition On-Hold -> Pass
    cur.callproc('sp_record_round_result', (student_id, round_1_id, 'Pass', 88.0, 'Cleared after review'))
    for r in cur.stored_results():
        res = r.fetchall()
        assert res[0]['result'] == 'Round result updated'
        assert res[0]['outcome'] == 'Pass'

    # 4. Verify SAME row was updated (no duplicate row)
    cur.execute("SELECT result_id, outcome, score FROM Round_Result WHERE student_id = %s AND round_id = %s;", (student_id, round_1_id))
    r1_after_pass = cur.fetchall()
    assert len(r1_after_pass) == 1, "Duplicate row created for same student and round!"
    assert r1_after_pass[0]['result_id'] == initial_res_id, "result_id changed! UPDATE must preserve primary key."
    assert r1_after_pass[0]['outcome'] == 'Pass'
    assert float(r1_after_pass[0]['score']) == 88.0

    # 5. Verify Application status was synced to Shortlisted by TR15b
    cur.execute("SELECT status FROM Application WHERE student_id = %s AND drive_id = %s;", (student_id, drive_id))
    app_status = cur.fetchone()['status']
    assert app_status == 'Shortlisted'

    # 6. A passed first round allows the next result to be recorded.
    cur.callproc('sp_record_round_result', (student_id, round_2_id, 'Pass', 90.0, 'Round 2 cleared'))
    for r in cur.stored_results(): r.fetchall()
    cur.execute("SELECT outcome FROM Round_Result WHERE student_id = %s AND round_id = %s;", (student_id, round_2_id))
    assert cur.fetchone()['outcome'] == 'Pass'

    # 7. Verify finalized Pass CANNOT be changed
    try:
        cur.callproc('sp_record_round_result', (student_id, round_1_id, 'Fail', 40.0, 'Illegal change'))
        for r in cur.stored_results(): r.fetchall()
        pytest.fail("Should have blocked changing finalized Pass result")
    except Exception as e:
        assert 'finalized round result' in str(e).lower()

    cur.close()

def test_on_hold_to_fail_workflow(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)
    student_id, drive_id, round_1_id, round_2_id = create_isolated_student_and_drive(cur, "OHF")

    # 1. Record On-Hold in Round 1
    cur.callproc('sp_record_round_result', (student_id, round_1_id, 'On-Hold', 62.0, 'Borderline performance'))
    for r in cur.stored_results(): r.fetchall()

    cur.execute("SELECT result_id, outcome FROM Round_Result WHERE student_id = %s AND round_id = %s;", (student_id, round_1_id))
    initial_id = cur.fetchone()['result_id']

    # 2. Transition On-Hold -> Fail
    cur.callproc('sp_record_round_result', (student_id, round_1_id, 'Fail', 48.0, 'Failed re-assessment'))
    for r in cur.stored_results():
        res = r.fetchall()
        assert res[0]['result'] == 'Round result updated'
        assert res[0]['outcome'] == 'Fail'

    # 3. Verify same row updated
    cur.execute("SELECT result_id, outcome, score FROM Round_Result WHERE student_id = %s AND round_id = %s;", (student_id, round_1_id))
    r_rows = cur.fetchall()
    assert len(r_rows) == 1
    assert r_rows[0]['result_id'] == initial_id
    assert r_rows[0]['outcome'] == 'Fail'
    assert float(r_rows[0]['score']) == 48.0

    # 4. Verify Application status was synced to Rejected by TR15b
    cur.execute("SELECT status FROM Application WHERE student_id = %s AND drive_id = %s;", (student_id, drive_id))
    assert cur.fetchone()['status'] == 'Rejected'

    # 5. Verify candidate CANNOT progress to Round 2 (application is rejected)
    try:
        cur.callproc('sp_record_round_result', (student_id, round_2_id, 'Pass', 85.0, 'after rejection'))
        for r in cur.stored_results(): r.fetchall()
        pytest.fail("A rejected application must not progress to the next round")
    except Exception as e:
        assert 'no longer active' in str(e).lower()

    # 6. Verify finalized Fail cannot be altered
    try:
        cur.callproc('sp_record_round_result', (student_id, round_1_id, 'Pass', 95.0, 'Illegal change'))
        for r in cur.stored_results(): r.fetchall()
        pytest.fail("Should have blocked changing finalized Fail result")
    except Exception as e:
        assert 'finalized round result' in str(e).lower() or 'no longer active' in str(e).lower()

    cur.close()

def test_no_duplicate_round_results_in_database(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)
    cur.execute("SELECT student_id, round_id, COUNT(*) as cnt FROM Round_Result GROUP BY student_id, round_id HAVING cnt > 1;")
    dupes = cur.fetchall()
    assert len(dupes) == 0, f"Found duplicate round results: {dupes}"
    cur.close()
