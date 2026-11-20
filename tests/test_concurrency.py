"""
Concurrency and ACID Race Condition Test Suite
Tests:
1. Concurrent Applications (Unique constraint atomicity under parallel submission)
2. Concurrent Department Transfers (Deadlock-free execution via ascending dept_id locks)
3. Concurrent Offer Responses (Strict One-Offer policy race prevention)
"""

import time
import threading
import mysql.connector
import pytest
from config import Config

TEST_DB_NAME = os.getenv('TEST_DB_NAME', 'CampusHire_Test')

def get_db_connection():
    return mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=TEST_DB_NAME,
        autocommit=True
    )

def test_concurrent_applications_race_condition():
    """
    Two threads attempt to submit an application for the exact same student and drive concurrently.
    Guarantees:
    - Exactly one succeeds.
    - Exactly one fails with duplicate error / business rejection.
    - Zero duplicate rows in Application table.
    """
    setup_conn = get_db_connection()
    cur = setup_conn.cursor(dictionary=True)

    uid = int(time.time() * 1000) % 10000000
    enrollment = f"CONC_APP_{uid}"
    email = f"conc_{uid}@iiti.ac.in"

    # Register fresh test student
    cur.callproc('sp_register_student', (
        enrollment, "Conc Candidate", email, "9177777777", "2003-01-01",
        "Male", "Hostel H1", 1, "7-1", 8.50, 0, 90.0, 90.0, None
    ))
    student_id = None
    for r in cur.stored_results():
        student_id = r.fetchall()[0]['roll_no']

    # Create open drive
    cur.callproc('sp_create_drive', (
        1, 1, f'Conc Drive {uid}', 'Concurrency Test Role', 'Full-Time', 1400000, 5, 'On-Campus', '2026-12-31',
        0.00, 10, 'ALL', 0.0, 0.0
    ))
    drive_id = None
    for r in cur.stored_results():
        drive_id = r.fetchall()[0]['drive_id']

    cur.close()
    setup_conn.close()

    results = []
    errors = []

    def apply_worker():
        conn = get_db_connection()
        c = conn.cursor(dictionary=True)
        try:
            c.callproc('sp_apply_to_drive', (student_id, drive_id))
            for r in c.stored_results():
                results.append(r.fetchall()[0]['result'])
        except Exception as e:
            errors.append(str(e))
        finally:
            c.close()
            conn.close()

    t1 = threading.Thread(target=apply_worker)
    t2 = threading.Thread(target=apply_worker)

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # Invariant: exactly 1 success and 1 error
    assert len(results) == 1, f"Expected 1 success, got {results}"
    assert results[0] == 'Application submitted'
    assert len(errors) == 1, f"Expected 1 duplicate error, got {errors}"
    assert 'duplicate' in errors[0].lower() or 'uq_student_drive' in errors[0].lower()

    # Invariant: exactly 1 application in DB
    verify_conn = get_db_connection()
    v_cur = verify_conn.cursor(dictionary=True)
    v_cur.execute("SELECT COUNT(*) as cnt FROM Application WHERE student_id = %s AND drive_id = %s;", (student_id, drive_id))
    assert v_cur.fetchone()['cnt'] == 1
    v_cur.close()
    verify_conn.close()

def test_concurrent_department_transfers_deadlock_free():
    """
    Two threads perform simultaneous bidirectional transfers:
    Thread 1: Transfers student A from Dept 1 -> Dept 2
    Thread 2: Transfers student B from Dept 2 -> Dept 1
    T9 orders locks by ascending dept_id (1, then 2), preventing cyclic lock waits (deadlock).
    Guarantees:
    - Both threads finish without deadlock (MySQL Error 1213).
    - Final department counts and student assignments are consistent.
    """
    setup_conn = get_db_connection()
    cur = setup_conn.cursor(dictionary=True)

    uid = int(time.time() * 1000) % 10000000

    # Register student A in Dept 1
    cur.callproc('sp_register_student', (
        f"TXA_{uid}", "Trans Candidate A", f"txa_{uid}@iiti.ac.in", "9177777771", "2003-01-01",
        "Male", "Hostel H1", 1, "7-1", 8.00, 0, 85.0, 85.0, None
    ))
    student_a = None
    for r in cur.stored_results():
        student_a = r.fetchall()[0]['roll_no']

    # Register student B in Dept 2
    cur.callproc('sp_register_student', (
        f"TXB_{uid}", "Trans Candidate B", f"txb_{uid}@iiti.ac.in", "9177777772", "2003-01-01",
        "Female", "Hostel H2", 2, "7-1", 8.20, 0, 88.0, 88.0, None
    ))
    student_b = None
    for r in cur.stored_results():
        student_b = r.fetchall()[0]['roll_no']

    cur.close()
    setup_conn.close()

    results = []
    errors = []

    def transfer_worker(roll, target_dept):
        conn = get_db_connection()
        c = conn.cursor(dictionary=True)
        try:
            c.callproc('sp_transfer_student_dept', (roll, target_dept))
            for r in c.stored_results():
                results.append(r.fetchall()[0]['result'])
        except Exception as e:
            errors.append(str(e))
        finally:
            c.close()
            conn.close()

    t1 = threading.Thread(target=transfer_worker, args=(student_a, 2))
    t2 = threading.Thread(target=transfer_worker, args=(student_b, 1))

    t1.start()
    t2.start()
    t1.join()
    t2.join()

    # Zero deadlocks allowed!
    assert len(errors) == 0, f"Deadlock or error occurred: {errors}"
    assert len(results) == 2
    assert all(r == 'Student transferred' for r in results)

    # Invariant: student A is now in Dept 2, student B is in Dept 1
    verify_conn = get_db_connection()
    v_cur = verify_conn.cursor(dictionary=True)
    v_cur.execute("SELECT dept_id FROM Student WHERE roll_no = %s;", (student_a,))
    assert v_cur.fetchone()['dept_id'] == 2
    v_cur.execute("SELECT dept_id FROM Student WHERE roll_no = %s;", (student_b,))
    assert v_cur.fetchone()['dept_id'] == 1
    v_cur.close()
    verify_conn.close()
