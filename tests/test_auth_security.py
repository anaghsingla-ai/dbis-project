"""
Security & Authentication Test Suite
Verifies:
- All 4 role logins
- Invalid logins and error responses
- Protected route middleware (@token_required)
- Role-based authorization (@role_required)
- Cross-company tenant isolation
- Cross-department student record isolation
- Password hashing (bcrypt)
"""

import pytest

def test_login_all_roles(client):
    # 1. Admin login
    res = client.post('/api/auth/login', json={'username': 'admin', 'password': 'password123'})
    data = res.get_json()
    assert res.status_code == 200
    assert data['success'] is True
    assert data['user']['role'] == 'TPO_ADMIN'
    assert 'token' in data

    # 2. Student login
    res = client.post('/api/auth/login', json={'username': 'aarav', 'password': 'password123'})
    data = res.get_json()
    assert res.status_code == 200
    assert data['success'] is True
    assert data['user']['role'] == 'STUDENT'

    # 3. Company HR login
    res = client.post('/api/auth/login', json={'username': 'technova_hr', 'password': 'password123'})
    data = res.get_json()
    assert res.status_code == 200
    assert data['success'] is True
    assert data['user']['role'] == 'COMPANY_HR'

    # 4. Department Coordinator login
    res = client.post('/api/auth/login', json={'username': 'cse_coord', 'password': 'password123'})
    data = res.get_json()
    assert res.status_code == 200
    assert data['success'] is True
    assert data['user']['role'] == 'DEPARTMENT_COORDINATOR'

def test_invalid_logins(client):
    # Non-existent user
    res = client.post('/api/auth/login', json={'username': 'non_existent_user', 'password': 'password123'})
    assert res.status_code == 401
    assert res.get_json()['success'] is False

    # Wrong password
    res = client.post('/api/auth/login', json={'username': 'admin', 'password': 'wrongpassword'})
    assert res.status_code == 401
    assert res.get_json()['success'] is False

    # Empty payload
    res = client.post('/api/auth/login', json={})
    assert res.status_code == 400
    assert res.get_json()['success'] is False

def test_protected_routes_unauthorized(client):
    # Accessing /api/admin/stats without token
    res = client.get('/api/admin/stats')
    assert res.status_code == 401
    assert 'token missing' in res.get_json()['message'].lower()

    # Accessing /api/student/overview without token
    res = client.get('/api/student/overview')
    assert res.status_code == 401

def test_role_based_access_control(client, student_headers, hr_headers, coordinator_headers):
    # Student attempts to access admin stats -> 403 Forbidden
    res = client.get('/api/admin/stats', headers=student_headers)
    assert res.status_code == 403
    assert 'access denied' in res.get_json()['message'].lower()

    # Company HR attempts to access coordinator students -> 403 Forbidden
    res = client.get('/api/coordinator/students', headers=hr_headers)
    assert res.status_code == 403

    # Coordinator attempts to issue offer via admin endpoint -> 403 Forbidden
    res = client.post('/api/admin/offers', json={'student_id': 1, 'drive_id': 1}, headers=coordinator_headers)
    assert res.status_code == 403

def test_cross_company_isolation(client, hr_headers):
    # Technova HR (company 1) attempts to evaluate round for drive owned by company 2 (round_id 4)
    res = client.post('/api/hr/rounds/record-result', json={
        'student_id': 2,
        'round_id': 4, # Belongs to DataWorks (company 2)
        'outcome': 'Pass',
        'score': 85.0
    }, headers=hr_headers)
    assert res.status_code == 403
    assert 'another company' in res.get_json()['message'].lower()

def test_cross_department_isolation(client, coordinator_headers):
    # CSE Coordinator (dept 1) attempts to modify academic record of EE student (student_id = 3, dept 2)
    res = client.post('/api/coordinator/students/academic-record', json={
        'roll_no': 3,
        'cgpa': 9.0,
        'backlog_count': 0
    }, headers=coordinator_headers)
    assert res.status_code == 403
    assert 'another department' in res.get_json()['message'].lower()

def test_password_hashes_in_database(prod_db_conn):
    cur = prod_db_conn.cursor(dictionary=True)
    cur.execute("SELECT username, password_hash FROM User_Account;")
    users = cur.fetchall()
    assert len(users) > 0
    for u in users:
        # Bcrypt hash starts with $2a$ or $2b$ and has length 60
        assert u['password_hash'].startswith('$2'), f"Password not hashed for {u['username']}"
        assert len(u['password_hash']) == 60, f"Invalid bcrypt hash length for {u['username']}"
        assert 'password123' not in u['password_hash'], "Plaintext password stored in database!"
    cur.close()
