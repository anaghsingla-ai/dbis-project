import os
import sys
import mysql.connector

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import Config
from auth import hash_password

def setup_users_for_db(db_name):
    print(f"Setting up User_Account in {db_name}...")
    conn = mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        database=db_name,
        autocommit=True
    )
    cur = conn.cursor(dictionary=True)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS User_Account (
            user_id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(100) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('TPO_ADMIN', 'STUDENT', 'COMPANY_HR', 'DEPARTMENT_COORDINATOR') NOT NULL,
            full_name VARCHAR(150) NOT NULL,
            student_id INT NULL,
            officer_id INT NULL,
            company_id INT NULL,
            dept_id INT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_user_student FOREIGN KEY (student_id) REFERENCES Student(roll_no) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_user_officer FOREIGN KEY (officer_id) REFERENCES Placement_Officer(officer_id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES Company(company_id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_user_dept FOREIGN KEY (dept_id) REFERENCES Department(dept_id) ON UPDATE CASCADE ON DELETE SET NULL
        );
    """)

    password_hash = hash_password('password123')

    users = [
        # TPO Admin
        ('admin', 'kavita@tpo.example', password_hash, 'TPO_ADMIN', 'Mrs. Kavita Joshi (TPO Head)', None, 1, None, None),
        # Students
        ('aarav', 'aarav@iiti.example', password_hash, 'STUDENT', 'Aarav Sharma', 1, None, None, 1),
        ('diya', 'diya@iiti.example', password_hash, 'STUDENT', 'Diya Verma', 2, None, None, 1),
        ('karan', 'karan@iiti.example', password_hash, 'STUDENT', 'Karan Patel', 3, None, None, 2),
        ('meera', 'meera@iiti.example', password_hash, 'STUDENT', 'Meera Nair', 4, None, None, 3),
        ('rohan', 'rohan@iiti.example', password_hash, 'STUDENT', 'Rohan Gupta', 5, None, None, 1),
        # Company HRs
        ('technova_hr', 'hr@technova.example', password_hash, 'COMPANY_HR', 'R. Iyer (TechNova HR)', None, None, 1, None),
        ('dataworks_hr', 'hr@dataworks.example', password_hash, 'COMPANY_HR', 'M. Shah (DataWorks HR)', None, None, 2, None),
        ('coremech_hr', 'hr@coremech.example', password_hash, 'COMPANY_HR', 'T. Das (CoreMech HR)', None, None, 3, None),
        # Department Coordinators
        ('cse_coord', 'cse.coord@iiti.ac.in', password_hash, 'DEPARTMENT_COORDINATOR', 'Dr. A. Rao (CSE Coordinator)', None, None, None, 1),
        ('ee_coord', 'ee.coord@iiti.ac.in', password_hash, 'DEPARTMENT_COORDINATOR', 'Dr. S. Mehta (EE Coordinator)', None, None, None, 2),
        ('me_coord', 'me.coord@iiti.ac.in', password_hash, 'DEPARTMENT_COORDINATOR', 'Dr. P. Nair (ME Coordinator)', None, None, None, 3)
    ]

    insert_user_sql = """
        INSERT INTO User_Account (username, email, password_hash, role, full_name, student_id, officer_id, company_id, dept_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE user_id = user_id;
    """
    reference_tables = {
        'student_id': (5, 'Student', 'roll_no'),
        'officer_id': (6, 'Placement_Officer', 'officer_id'),
        'company_id': (7, 'Company', 'company_id'),
        'dept_id': (8, 'Department', 'dept_id'),
    }
    inserted = 0
    skipped = 0
    for user in users:
        # A partial database may not contain every sample student or company.
        # Skip accounts whose linked record is absent instead of failing midway.
        missing_reference = False
        for field, (value_index, table, key) in reference_tables.items():
            value = user[value_index]
            if value is not None:
                cur.execute(f"SELECT 1 FROM `{table}` WHERE `{key}` = %s LIMIT 1", (value,))
                if cur.fetchone() is None:
                    missing_reference = True
                    break
        if missing_reference:
            skipped += 1
            continue

        cur.execute(insert_user_sql, user)
        inserted += 1

    cur.close()
    conn.close()
    print(f"Configured {inserted} demo accounts in {db_name}; skipped {skipped} without matching records.")

if __name__ == '__main__':
    target_db = sys.argv[1] if len(sys.argv) > 1 else Config.DB_NAME
    setup_users_for_db(target_db)
