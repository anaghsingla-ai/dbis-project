import os
import sys
import pytest
import mysql.connector

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backend'))

from config import Config
from app import app as flask_app
from auth import create_access_token

TEST_DB_NAME = os.getenv('TEST_DB_NAME', 'CampusHire_Test')

@pytest.fixture(scope="session")
def app():
    flask_app.config['TESTING'] = True
    return flask_app

@pytest.fixture(scope="session")
def client(app):
    return app.test_client()

@pytest.fixture
def test_db_conn():
    conn = mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=TEST_DB_NAME,
        autocommit=True
    )
    yield conn
    try:
        conn.close()
    except Exception:
        pass

@pytest.fixture
def prod_db_conn():
    conn = mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database="CampusHire",
        autocommit=True
    )
    yield conn
    try:
        conn.close()
    except Exception:
        pass

@pytest.fixture(scope="session")
def admin_headers():
    token = create_access_token({
        'user_id': 1,
        'username': 'admin',
        'email': 'kavita@tpo.example',
        'role': 'TPO_ADMIN',
        'full_name': 'Mrs. Kavita Joshi (TPO Head)',
        'officer_id': 1
    })
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

@pytest.fixture(scope="session")
def student_headers():
    token = create_access_token({
        'user_id': 2,
        'username': 'aarav',
        'email': 'aarav@iiti.example',
        'role': 'STUDENT',
        'full_name': 'Aarav Sharma',
        'student_id': 1,
        'dept_id': 1
    })
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

@pytest.fixture(scope="session")
def hr_headers():
    token = create_access_token({
        'user_id': 7,
        'username': 'technova_hr',
        'email': 'hr@technova.example',
        'role': 'COMPANY_HR',
        'full_name': 'R. Iyer (TechNova HR)',
        'company_id': 1
    })
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

@pytest.fixture(scope="session")
def coordinator_headers():
    token = create_access_token({
        'user_id': 10,
        'username': 'cse_coord',
        'email': 'cse.coord@iiti.ac.in',
        'role': 'DEPARTMENT_COORDINATOR',
        'full_name': 'Dr. A. Rao (CSE Coordinator)',
        'dept_id': 1
    })
    return {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
