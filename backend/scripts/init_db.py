import os
import sys
import mysql.connector

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import Config
from auth import hash_password

def parse_sql_statements(content: str):
    delimiter = ';'
    statements = []
    current_stmt = []

    lines = content.splitlines()
    for line in lines:
        trimmed = line.strip()

        if trimmed.upper().startswith('DELIMITER '):
            delimiter = trimmed[10:].strip()
            continue

        if delimiter == ';' and (trimmed.startswith('--') or trimmed.startswith('#')):
            continue

        current_stmt.append(line)

        if delimiter == ';':
            if trimmed.endswith(';'):
                stmt = '\n'.join(current_stmt).strip()
                # remove leading comments
                stmt_lines = [l for l in stmt.splitlines() if not l.strip().startswith('--') and not l.strip().startswith('#')]
                cleaned = '\n'.join(stmt_lines).strip()
                if cleaned:
                    statements.append(cleaned)
                current_stmt = []
        else:
            if trimmed.endswith(delimiter):
                stmt = '\n'.join(current_stmt).strip()
                if stmt.endswith(delimiter):
                    stmt = stmt[:-len(delimiter)].strip()
                stmt_lines = [l for l in stmt.splitlines() if not l.strip().startswith('--') and not l.strip().startswith('#')]
                cleaned = '\n'.join(stmt_lines).strip()
                if cleaned:
                    statements.append(cleaned)
                current_stmt = []

    if current_stmt:
        stmt = '\n'.join(current_stmt).strip()
        stmt_lines = [l for l in stmt.splitlines() if not l.strip().startswith('--') and not l.strip().startswith('#')]
        cleaned = '\n'.join(stmt_lines).strip()
        if cleaned:
            statements.append(cleaned)

    return statements

def execute_sql_file(conn, file_path: str):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    statements = parse_sql_statements(content)
    cur = conn.cursor()
    for stmt in statements:
        if not stmt.strip():
            continue
        try:
            cur.execute(stmt)
            # CALL statements can return several result sets. Drain each one
            # before sending the next statement on this connection.
            while True:
                try:
                    if cur.with_rows:
                        cur.fetchall()
                except Exception:
                    pass
                if not cur.nextset():
                    break
        except Exception as e:
            print(f"Error executing statement:\n{stmt[:160]}...\nError: {e}")
            raise e
    cur.close()

def init():
    print(f"Connecting to MySQL on {Config.DB_HOST}:{Config.DB_PORT} as {Config.DB_USER}...")
    conn = mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        autocommit=True
    )

    try:
        # This bootstrap is for a fresh install. Never run its CREATE TABLE
        # and seed steps over an existing CampusHire database.
        check_cur = conn.cursor()
        check_cur.execute("SHOW DATABASES LIKE 'CampusHire'")
        exists = check_cur.fetchone() is not None
        check_cur.close()
        if exists:
            raise RuntimeError(
                "CampusHire already exists. Initialization stopped without "
                "changing it. Use a separate empty database for testing."
            )

        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

        print("1. Loading 01_schema.sql...")
        execute_sql_file(conn, os.path.join(root_dir, '01_schema.sql'))

        # Switch to CampusHire database
        cur = conn.cursor()
        cur.execute("USE CampusHire;")
        cur.close()

        print("2. Loading 03_transactions.sql...")
        execute_sql_file(conn, os.path.join(root_dir, '03_transactions.sql'))

        # Existing support table, previously created by 04_triggers.sql.
        # Create it only during this fresh-database bootstrap.
        audit_cur = conn.cursor()
        audit_cur.execute("""
            CREATE TABLE Audit_Log (
                log_id INT PRIMARY KEY AUTO_INCREMENT,
                table_name VARCHAR(30) NOT NULL,
                record_id INT NOT NULL,
                field_name VARCHAR(30) NOT NULL,
                old_value VARCHAR(100),
                new_value VARCHAR(100),
                changed_by VARCHAR(100),
                changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        audit_cur.close()

        print("3. Loading 04_triggers.sql...")
        execute_sql_file(conn, os.path.join(root_dir, '04_triggers.sql'))

        print("4. Loading 05_sample_data.sql...")
        execute_sql_file(conn, os.path.join(root_dir, '05_sample_data.sql'))

        print("5. Creating User_Account table for authentication...")
        cur = conn.cursor()
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

        print("6. Seeding role accounts with bcrypt passwords...")
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
            ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name);
        """
        for u in users:
            cur.execute(insert_user_sql, u)

        cur.close()
        print("Database initialization and seeding completed successfully via mysql.connector!")
    finally:
        conn.close()

if __name__ == '__main__':
    init()
