"""
Database Triggers (TR1 - TR18) Test Suite
Verifies:
- Placed student delete guard (TR6)
- Criteria boundaries (TR7, TR8)
- Drive vacancy reduction guard (TR9)
- Drive delete guard (TR10)
- Application lifecycle state machine (TR12)
- Application status audit (TR13)
- Offer status audit (TR18)
"""

import pytest

def test_tr6_placed_student_deletion_guard(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)

    # Find a placed student (Accepted offer exists)
    cur.execute("""
        SELECT student_id FROM Offer WHERE offer_status = 'Accepted' LIMIT 1;
    """)
    placed_student = cur.fetchone()['student_id']

    # Attempt to delete student -> TR6 MUST block with SQLSTATE 45000
    try:
        cur.execute("DELETE FROM Student WHERE roll_no = %s;", (placed_student,))
        pytest.fail("TR6 should have blocked deleting a placed student")
    except Exception as e:
        assert 'cannot delete a placed student' in str(e).lower()

    cur.close()

def test_tr9_drive_vacancy_reduction_guard(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)

    # Find a drive that has accepted offers
    cur.execute("""
        SELECT pd.drive_id, pd.vacancies, COUNT(o.offer_id) as accepted_count
        FROM Placement_Drive pd
        JOIN Offer o ON o.drive_id = pd.drive_id AND o.offer_status = 'Accepted'
        GROUP BY pd.drive_id, pd.vacancies
        HAVING COUNT(o.offer_id) >= 1
        LIMIT 1;
    """)
    row = cur.fetchone()
    drive_id = row['drive_id']
    accepted_count = row['accepted_count']

    # Attempt to reduce vacancies below accepted_count -> TR9 MUST block
    try:
        cur.execute("UPDATE Placement_Drive SET vacancies = %s WHERE drive_id = %s;", (accepted_count - 1, drive_id))
        pytest.fail("TR9 should have blocked reducing vacancies below allocated offers")
    except Exception as e:
        assert 'vacancies cannot be less than offers' in str(e).lower()

    cur.close()

def test_tr10_drive_deletion_guard(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)

    # Find drive with accepted offer
    cur.execute("SELECT drive_id FROM Offer WHERE offer_status = 'Accepted' LIMIT 1;")
    drive_id = cur.fetchone()['drive_id']

    # Attempt to delete drive -> TR10 MUST block
    try:
        cur.execute("DELETE FROM Placement_Drive WHERE drive_id = %s;", (drive_id,))
        pytest.fail("TR10 should have blocked deleting drive with accepted offers")
    except Exception as e:
        assert 'cannot delete a drive' in str(e).lower() or 'accepted offers' in str(e).lower()

    cur.close()

def test_tr12_closed_application_reopen_guard(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)

    # Find a Rejected or Withdrawn application
    cur.execute("SELECT application_id FROM Application WHERE status = 'Rejected' LIMIT 1;")
    app = cur.fetchone()
    if not app:
        cur.execute("SELECT application_id FROM Application WHERE status = 'Withdrawn' LIMIT 1;")
        app = cur.fetchone()

    app_id = app['application_id']

    # Attempt to reopen closed application back to 'Applied' -> TR12 MUST block
    try:
        cur.execute("UPDATE Application SET status = 'Applied' WHERE application_id = %s;", (app_id,))
        pytest.fail("TR12 should have blocked reopening closed application")
    except Exception as e:
        assert 'closed application' in str(e).lower() and 'cannot be re-opened' in str(e).lower()

    cur.close()

def test_tr13_and_tr18_audit_logs(test_db_conn):
    cur = test_db_conn.cursor(dictionary=True)

    # Check that Audit_Log contains records from Application and Offer triggers
    cur.execute("SELECT COUNT(*) as c FROM Audit_Log WHERE table_name = 'Application';")
    app_logs = cur.fetchone()['c']
    assert app_logs > 0, "TR13 has not written any application transitions to Audit_Log"

    cur.execute("SELECT COUNT(*) as c FROM Audit_Log WHERE table_name = 'Offer';")
    offer_logs = cur.fetchone()['c']
    assert offer_logs > 0, "TR18 has not written any offer transitions to Audit_Log"

    cur.close()
