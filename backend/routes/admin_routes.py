from selection_workflow import record_result, grant_offer
import re
from datetime import date
import jwt
from flask import Blueprint, request, jsonify
from db import query, execute, call_procedure
from auth import hash_password
from config import Config

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.before_request
def check_admin_access():
    """Authenticate and authorize every request to this blueprint."""
    token = None
    auth_header = request.headers.get('Authorization')
    if auth_header and auth_header.startswith('Bearer '):
        token = auth_header.split(' ')[1]
    elif 'token' in request.cookies:
        token = request.cookies.get('token')

    if not token:
        return jsonify({'success': False, 'message': 'Authentication token missing. Please log in.'}), 401

    try:
        data = jwt.decode(token, Config.JWT_SECRET, algorithms=['HS256'])
        request.user = data
    except jwt.ExpiredSignatureError:
        return jsonify({'success': False, 'message': 'Session expired. Please log in again.'}), 403
    except jwt.InvalidTokenError:
        return jsonify({'success': False, 'message': 'Invalid session token. Please log in again.'}), 403

    if data.get('role') != 'TPO_ADMIN':
        return jsonify({'success': False, 'message': 'Access denied. TPO_ADMIN role required.'}), 403

@admin_bp.route('/stats', methods=['GET'])
def get_overview_stats():
    counts_rows = query("""
        SELECT
            (SELECT COUNT(*) FROM Student) AS total_students,
            (SELECT COUNT(*) FROM Company) AS total_companies,
            (SELECT COUNT(*) FROM Placement_Drive) AS total_drives,
            (SELECT COUNT(*) FROM Application) AS total_applications,
            (SELECT COUNT(DISTINCT student_id) FROM Offer WHERE offer_status = 'Accepted') AS total_placed,
            (SELECT COUNT(*) FROM Offer WHERE offer_status = 'Pending') AS pending_offers,
            (SELECT COUNT(*) FROM Placement_Drive WHERE drive_date >= CURRENT_DATE) AS upcoming_drives,
            (SELECT ROUND(AVG(package_offered), 2) FROM Offer WHERE offer_status = 'Accepted') AS avg_package,
            (SELECT MAX(package_offered) FROM Offer WHERE offer_status = 'Accepted') AS max_package,
            (SELECT MIN(package_offered) FROM Offer WHERE offer_status = 'Accepted') AS min_package
    """)
    counts = counts_rows[0] if counts_rows else {}

    total_students = counts.get('total_students') or 0
    total_placed = counts.get('total_placed') or 0
    placement_rate = f"{(total_placed / total_students * 100):.1f}" if total_students > 0 else '0.0'

    dept_stats = query("""
        SELECT 
            d.dept_id,
            d.dept_name,
            d.dept_code,
            d.total_students,
            COUNT(DISTINCT o.student_id) AS placed_students,
            ROUND(COALESCE(COUNT(DISTINCT o.student_id) * 100.0 / NULLIF(d.total_students, 0), 0), 1) AS placement_pct
        FROM Department d
        LEFT JOIN Student s ON s.dept_id = d.dept_id
        LEFT JOIN Offer o ON o.student_id = s.roll_no AND o.offer_status = 'Accepted'
        GROUP BY d.dept_id, d.dept_name, d.dept_code, d.total_students
        ORDER BY d.dept_name
    """)

    company_stats = query("""
        SELECT 
            c.company_id,
            c.company_name,
            COUNT(DISTINCT o.student_id) AS placed_count,
            ROUND(AVG(o.package_offered), 2) AS avg_package
        FROM Company c
        JOIN Placement_Drive pd ON pd.company_id = c.company_id
        JOIN Offer o ON o.drive_id = pd.drive_id AND o.offer_status = 'Accepted'
        GROUP BY c.company_id, c.company_name
        ORDER BY placed_count DESC
    """)

    app_status = query("""
        SELECT status, COUNT(*) AS count
        FROM Application
        GROUP BY status
    """)

    package_distribution = query("""
        SELECT 
            CASE 
                WHEN package_offered < 600000 THEN '< 6 LPA'
                WHEN package_offered BETWEEN 600000 AND 1000000 THEN '6 - 10 LPA'
                WHEN package_offered BETWEEN 1000001 AND 1500000 THEN '10 - 15 LPA'
                ELSE '> 15 LPA'
            END AS salary_bracket,
            COUNT(*) AS count
        FROM Offer
        WHERE offer_status = 'Accepted'
        GROUP BY salary_bracket
        ORDER BY MIN(package_offered)
    """)

    return jsonify({
        'success': True,
        'stats': {
            **counts,
            'placement_rate': placement_rate
        },
        'charts': {
            'deptStats': dept_stats,
            'companyStats': company_stats,
            'applicationStatus': app_status,
            'packageDistribution': package_distribution
        }
    })

@admin_bp.route('/departments', methods=['GET'])
def get_departments():
    departments = query("SELECT * FROM Department ORDER BY dept_name")
    return jsonify({'success': True, 'departments': departments})

@admin_bp.route('/students', methods=['GET'])
def get_students():
    dept_id = request.args.get('dept_id')
    search = request.args.get('search')
    min_cgpa = request.args.get('min_cgpa')
    max_backlogs = request.args.get('max_backlogs')
    placed = request.args.get('placed')

    sql = """
        SELECT 
            s.*,
            d.dept_code,
            CASE WHEN o.offer_id IS NOT NULL THEN 'Placed' ELSE 'Unplaced' END AS placement_status,
            o.package_offered AS accepted_package,
            c.company_name AS placed_company
        FROM Student s
        LEFT JOIN Department d ON d.dept_id = s.dept_id
        LEFT JOIN Offer o ON o.offer_id = (
            SELECT offer_id
            FROM Offer
            WHERE student_id = s.roll_no AND offer_status = 'Accepted'
            LIMIT 1
        )
        LEFT JOIN Placement_Drive pd ON pd.drive_id = o.drive_id
        LEFT JOIN Company c ON c.company_id = pd.company_id
        WHERE 1=1
    """
    params = []

    if dept_id:
        sql += " AND s.dept_id = %s"
        params.append(dept_id)
    if min_cgpa:
        sql += " AND s.cgpa >= %s"
        params.append(min_cgpa)
    if max_backlogs is not None and max_backlogs != '':
        sql += " AND s.backlog_count <= %s"
        params.append(max_backlogs)
    if search:
        sql += " AND (s.name LIKE %s OR s.enrollment_no LIKE %s OR s.email LIKE %s)"
        pattern = f"%{search}%"
        params.extend([pattern, pattern, pattern])
    if placed == 'true':
        sql += " AND o.offer_id IS NOT NULL"
    elif placed == 'false':
        sql += " AND o.offer_id IS NULL"

    sql += " ORDER BY s.roll_no ASC"
    students = query(sql, params)
    return jsonify({'success': True, 'students': students})

@admin_bp.route('/students/<int:id>', methods=['GET'])
def get_student_by_id(id):
    students = query(
        """SELECT s.*, d.dept_code, d.hod_name 
           FROM Student s 
           LEFT JOIN Department d ON d.dept_id = s.dept_id 
           WHERE s.roll_no = %s""",
        (id,)
    )

    if not students:
        return jsonify({'success': False, 'message': 'Student not found'}), 404

    student = students[0]

    applications = query(
        """SELECT a.*, pd.job_title, pd.package_offered, pd.drive_date, c.company_name, c.company_id
           FROM Application a
           JOIN Placement_Drive pd ON pd.drive_id = a.drive_id
           JOIN Company c ON c.company_id = pd.company_id
           WHERE a.student_id = %s
           ORDER BY a.application_date DESC""",
        (id,)
    )

    round_results = query(
        """SELECT rr.*, sr.round_no, sr.round_type, sr.drive_id, c.company_name, pd.job_title
           FROM Round_Result rr
           JOIN Selection_Round sr ON sr.round_id = rr.round_id
           JOIN Placement_Drive pd ON pd.drive_id = sr.drive_id
           JOIN Company c ON c.company_id = pd.company_id
           WHERE rr.student_id = %s
           ORDER BY sr.drive_id, sr.round_no""",
        (id,)
    )

    offers = query(
        """SELECT o.*, pd.job_title, c.company_name
           FROM Offer o
           JOIN Placement_Drive pd ON pd.drive_id = o.drive_id
           JOIN Company c ON c.company_id = pd.company_id
           WHERE o.student_id = %s
           ORDER BY o.offer_date DESC""",
        (id,)
    )

    audit_history = query(
        """SELECT * FROM Audit_Log WHERE table_name = 'Student' AND record_id = %s ORDER BY changed_at DESC""",
        (id,)
    )

    return jsonify({
        'success': True,
        'student': student,
        'applications': applications,
        'roundResults': round_results,
        'offers': offers,
        'auditHistory': audit_history
    })

# T1: sp_register_student
@admin_bp.route('/students', methods=['POST'])
def register_student():
    data = request.get_json() or {}
    enrollment_no = data.get('enrollment_no')
    name = data.get('name')
    email = data.get('email')
    phone = data.get('phone')
    dob = data.get('dob')
    gender = data.get('gender')
    address = data.get('address')
    dept_id = data.get('dept_id')
    current_year_sem = data.get('current_year_sem', '7-1')
    cgpa = data.get('cgpa')
    backlog_count = data.get('backlog_count', 0)
    percentage_10th = data.get('percentage_10th')
    percentage_12th = data.get('percentage_12th')
    resume_link = data.get('resume_link')

    result = call_procedure('sp_register_student', [
        enrollment_no, name, email, phone, dob, gender, address,
        dept_id, current_year_sem, cgpa, backlog_count,
        percentage_10th, percentage_12th, resume_link
    ])

    roll_no = result[0].get('roll_no') if result else None
    if roll_no:
        pwd_hash = hash_password('password123')
        username = re.sub(r'[^a-z0-9]', '', enrollment_no.lower())
        execute(
            """INSERT INTO User_Account (username, email, password_hash, role, full_name, student_id, dept_id)
               VALUES (%s, %s, %s, 'STUDENT', %s, %s, %s)
               ON DUPLICATE KEY UPDATE student_id = VALUES(student_id)""",
            (username, email, pwd_hash, name, roll_no, dept_id)
        )

    return jsonify({
        'success': True,
        'message': 'Student successfully registered via procedure T1 (sp_register_student)',
        'data': result[0] if result else None
    })

# T9: sp_transfer_student_dept
@admin_bp.route('/students/transfer', methods=['POST'])
def transfer_student():
    data = request.get_json() or {}
    roll_no = data.get('roll_no')
    new_dept_id = data.get('new_dept_id')

    result = call_procedure('sp_transfer_student_dept', [roll_no, new_dept_id])
    execute("UPDATE User_Account SET dept_id = %s WHERE student_id = %s", (new_dept_id, roll_no))

    return jsonify({
        'success': True,
        'message': 'Student department transferred via procedure T9 (sp_transfer_student_dept)',
        'data': result[0] if result else None
    })

# T8: sp_update_academic_record
@admin_bp.route('/students/academic-record', methods=['POST'])
def update_academic_record():
    data = request.get_json() or {}
    roll_no = data.get('roll_no')
    cgpa = data.get('cgpa')
    backlog_count = data.get('backlog_count')

    result = call_procedure('sp_update_academic_record', [roll_no, cgpa, backlog_count])

    return jsonify({
        'success': True,
        'message': 'Academic record updated via procedure T8 (sp_update_academic_record)',
        'data': result[0] if result else None
    })

@admin_bp.route('/companies', methods=['GET'])
def get_companies():
    companies = query("""
        SELECT 
            c.*,
            COUNT(DISTINCT pd.drive_id) AS total_drives,
            COUNT(DISTINCT o.student_id) AS hired_students
        FROM Company c
        LEFT JOIN Placement_Drive pd ON pd.company_id = c.company_id
        LEFT JOIN Offer o ON o.drive_id = pd.drive_id AND o.offer_status = 'Accepted'
        GROUP BY c.company_id
        ORDER BY c.company_name
    """)
    return jsonify({'success': True, 'companies': companies})

@admin_bp.route('/companies', methods=['POST'])
def add_company():
    data = request.get_json() or {}
    company_name = data.get('company_name')
    industry_type = data.get('industry_type')
    website = data.get('website')
    hr_contact_name = data.get('hr_contact_name')
    hr_contact_email = data.get('hr_contact_email')
    hr_contact_phone = data.get('hr_contact_phone')
    address = data.get('address')

    res = execute(
        """INSERT INTO Company (company_name, industry_type, website, hr_contact_name, hr_contact_email, hr_contact_phone, address)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (company_name, industry_type, website, hr_contact_name, hr_contact_email, hr_contact_phone, address)
    )
    company_id = res['last_id']

    pwd_hash = hash_password('password123')
    username = re.sub(r'[^a-z0-9]', '', company_name.lower()) + '_hr'
    execute(
        """INSERT INTO User_Account (username, email, password_hash, role, full_name, company_id)
           VALUES (%s, %s, %s, 'COMPANY_HR', %s, %s)
           ON DUPLICATE KEY UPDATE company_id = VALUES(company_id)""",
        (username, hr_contact_email, pwd_hash, f"{hr_contact_name or company_name} (HR)", company_id)
    )

    return jsonify({
        'success': True,
        'message': 'Company added successfully',
        'company_id': company_id
    })

@admin_bp.route('/drives', methods=['GET'])
def get_drives():
    company_id = request.args.get('company_id')
    status = request.args.get('status')

    sql = """
        SELECT 
            pd.*,
            c.company_name,
            c.industry_type,
            po.name AS officer_name,
            ec.eligibility_id,
            ec.min_cgpa,
            ec.max_backlogs,
            ec.eligible_departments,
            ec.min_10th_percentage,
            ec.min_12th_percentage,
            (SELECT COUNT(*) FROM Application a WHERE a.drive_id = pd.drive_id) AS total_applicants,
            (SELECT COUNT(*) FROM Application a WHERE a.drive_id = pd.drive_id AND a.status = 'Shortlisted') AS shortlisted_count,
            (SELECT COUNT(*) FROM Offer o WHERE o.drive_id = pd.drive_id AND o.offer_status IN ('Pending', 'Accepted')) AS offers_issued,
            (SELECT COUNT(*) FROM Offer o WHERE o.drive_id = pd.drive_id AND o.offer_status = 'Accepted') AS offers_accepted,
            (SELECT COUNT(*) FROM Selection_Round sr WHERE sr.drive_id = pd.drive_id) AS total_rounds,
            EXISTS(SELECT 1 FROM Selection_Round sr WHERE sr.drive_id = pd.drive_id AND sr.round_type = 'HR Interview') AS has_final_round,
            EXISTS(SELECT 1 FROM Round_Result rr JOIN Selection_Round sr ON sr.round_id = rr.round_id WHERE sr.drive_id = pd.drive_id) AS rounds_started
        FROM Placement_Drive pd
        JOIN Company c ON c.company_id = pd.company_id
        LEFT JOIN Placement_Officer po ON po.officer_id = pd.officer_id
        LEFT JOIN Eligibility_Criteria ec ON ec.drive_id = pd.drive_id
        WHERE 1=1
    """
    params = []

    if company_id:
        sql += " AND pd.company_id = %s"
        params.append(company_id)
    if status == 'upcoming':
        sql += " AND pd.drive_date >= CURRENT_DATE"
    elif status == 'past':
        sql += " AND pd.drive_date < CURRENT_DATE"

    sql += " ORDER BY pd.drive_date DESC, pd.drive_id DESC"
    drives = query(sql, params)
    return jsonify({'success': True, 'drives': drives})

# T2: sp_create_drive
@admin_bp.route('/drives', methods=['POST'])
def create_drive():
    data = request.get_json() or {}
    company_id = data.get('company_id')
    officer_id = data.get('officer_id') or request.user.get('officer_id') or 1
    job_title = data.get('job_title')
    job_description = data.get('job_description', '')
    offer_type = data.get('offer_type', 'Full-Time')
    package_offered = data.get('package_offered')
    vacancies = data.get('vacancies')
    mode = data.get('mode', 'On-Campus')
    drive_date = data.get('drive_date')
    min_cgpa = data.get('min_cgpa')
    max_backlogs = data.get('max_backlogs') if data.get('max_backlogs') != '' else None
    eligible_departments = data.get('eligible_departments', 'ALL')
    min_10th = data.get('min_10th_percentage')
    min_12th = data.get('min_12th_percentage')

    result = call_procedure('sp_create_drive', [
        company_id, officer_id, job_title, job_description,
        offer_type, package_offered, vacancies, mode, drive_date,
        min_cgpa, max_backlogs, eligible_departments,
        min_10th, min_12th
    ])

    return jsonify({
        'success': True,
        'message': 'Drive and eligibility criteria created atomically via procedure T2 (sp_create_drive)',
        'data': result[0] if result else None
    })

@admin_bp.route('/applications', methods=['GET'])
def get_applications():
    drive_id = request.args.get('drive_id')
    student_id = request.args.get('student_id')
    status = request.args.get('status')

    sql = """
        SELECT 
            a.*,
            s.name AS student_name,
            s.enrollment_no,
            s.email AS student_email,
            s.cgpa,
            s.backlog_count,
            s.dept_name,
            pd.job_title,
            pd.package_offered,
            c.company_name,
            (a.status = 'Shortlisted'
             AND EXISTS(SELECT 1 FROM Selection_Round sr WHERE sr.drive_id = a.drive_id)
             AND NOT EXISTS(SELECT 1 FROM Selection_Round sr
                 LEFT JOIN Round_Result rr ON rr.round_id = sr.round_id AND rr.student_id = a.student_id
                 WHERE sr.drive_id = a.drive_id AND COALESCE(rr.outcome, '') <> 'Pass')
             AND NOT EXISTS(SELECT 1 FROM Offer o WHERE o.student_id = a.student_id AND
                 (o.drive_id = a.drive_id OR o.offer_status = 'Accepted'))) AS ready_for_offer
        FROM Application a
        JOIN Student s ON s.roll_no = a.student_id
        JOIN Placement_Drive pd ON pd.drive_id = a.drive_id
        JOIN Company c ON c.company_id = pd.company_id
        WHERE 1=1
    """
    params = []

    if drive_id:
        sql += " AND a.drive_id = %s"
        params.append(drive_id)
    if student_id:
        sql += " AND a.student_id = %s"
        params.append(student_id)
    if status:
        sql += " AND a.status = %s"
        params.append(status)

    sql += " ORDER BY a.application_date DESC, a.application_id DESC"
    applications = query(sql, params)
    return jsonify({'success': True, 'applications': applications})

@admin_bp.route('/drives/<int:drive_id>/rounds', methods=['GET'])
def get_rounds(drive_id):
    rounds = query(
        """SELECT sr.*, 
            COUNT(rr.result_id) AS candidates_evaluated,
            COUNT(CASE WHEN rr.outcome = 'Pass' THEN 1 END) AS passed_count,
            COUNT(CASE WHEN rr.outcome = 'Fail' THEN 1 END) AS failed_count
           FROM Selection_Round sr
           LEFT JOIN Round_Result rr ON rr.round_id = sr.round_id
           WHERE sr.drive_id = %s
           GROUP BY sr.round_id
           ORDER BY sr.round_no ASC""",
        (drive_id,)
    )
    return jsonify({'success': True, 'rounds': rounds})

@admin_bp.route('/drives/<int:drive_id>/applicants/<int:student_id>/rounds', methods=['GET'])
def get_applicant_rounds(drive_id, student_id):
    rounds = query(
        """SELECT sr.round_id, sr.round_no, sr.round_type, sr.round_date, sr.mode, sr.venue,
                  rr.result_id, rr.outcome, rr.score, rr.remarks
           FROM Selection_Round sr
           LEFT JOIN Round_Result rr ON rr.round_id = sr.round_id AND rr.student_id = %s
           WHERE sr.drive_id = %s
           ORDER BY sr.round_no ASC""",
        (student_id, drive_id)
    )
    return jsonify({'success': True, 'rounds': rounds})

@admin_bp.route('/rounds', methods=['POST'])
def create_round():
    data = request.get_json() or {}
    if not isinstance(data, dict):
        return jsonify({'success': False, 'message': 'Round details must be an object.'}), 400
    drive_id = data.get('drive_id')
    round_no = data.get('round_no')
    round_type = data.get('round_type')
    round_date = data.get('round_date')
    mode = data.get('mode', 'On-Campus')
    venue = data.get('venue')

    # Validate form input before it reaches the submitted database schema.
    for field, value in [('drive_id', drive_id), ('round_no', round_no)]:
        if isinstance(value, bool) or not re.fullmatch(r'[1-9][0-9]*', str(value)):
            return jsonify({'success': False, 'message': f'{field} must be a positive whole number.'}), 400
    drive_id, round_no = int(drive_id), int(round_no)
    if round_type not in ('Aptitude Test', 'GD', 'Technical Interview', 'HR Interview'):
        return jsonify({'success': False, 'message': 'Choose a valid selection round type.'}), 400
    if mode not in ('On-Campus', 'Off-Campus', 'Virtual'):
        return jsonify({'success': False, 'message': 'Choose a valid round mode.'}), 400
    if round_date:
        try:
            round_date = date.fromisoformat(round_date).isoformat()
        except (ValueError, TypeError):
            return jsonify({'success': False, 'message': 'Round date must be a valid date (YYYY-MM-DD).'}), 400
    if venue is not None and (not isinstance(venue, str) or len(venue) > 150):
        return jsonify({'success': False, 'message': 'Venue must be text of at most 150 characters.'}), 400
    if not query('SELECT drive_id FROM Placement_Drive WHERE drive_id = %s', (drive_id,)):
        return jsonify({'success': False, 'message': 'Placement drive not found.'}), 404

    rounds = query('SELECT round_no, round_type FROM Selection_Round WHERE drive_id = %s ORDER BY round_no', (drive_id,))
    if len(rounds) >= 4:
        return jsonify({'success': False, 'message': 'A drive can have at most 4 selection rounds.'}), 409
    if any(row['round_type'] == 'HR Interview' for row in rounds):
        return jsonify({'success': False, 'message': 'HR Interview is the final round. No more rounds can be added.'}), 409
    activity = query('''SELECT
        EXISTS(SELECT 1 FROM Round_Result rr JOIN Selection_Round sr ON sr.round_id = rr.round_id WHERE sr.drive_id = %s) AS started,
        EXISTS(SELECT 1 FROM Offer WHERE drive_id = %s) AS offered''', (drive_id, drive_id))
    if activity and (activity[0]['started'] or activity[0]['offered']):
        return jsonify({'success': False, 'message': 'Round setup is locked because evaluations or offers have already started.'}), 409
    next_round = max((row['round_no'] for row in rounds), default=0) + 1
    if round_no != next_round:
        return jsonify({'success': False, 'message': f'The next round number must be {next_round}.'}), 409
    if round_no > 4:
        return jsonify({'success': False, 'message': 'A drive can have at most 4 rounds, but may finish after just one.'}), 400
    if any(row['round_type'] == round_type for row in rounds):
        return jsonify({'success': False, 'message': 'This round type is already configured for this drive.'}), 409

    res = execute(
        """INSERT INTO Selection_Round (drive_id, round_no, round_type, round_date, mode, venue)
           VALUES (%s, %s, %s, %s, %s, %s)""",
        (drive_id, round_no, round_type, round_date or None, mode, venue or None)
    )

    return jsonify({
        'success': True,
        'message': 'Selection round created successfully',
        'round_id': res['last_id']
    })

# T4: sp_record_round_result
@admin_bp.route('/rounds/record-result', methods=['POST'])
def record_round_result():
    data = request.get_json() or {}
    student_id = data.get('student_id')
    round_id = data.get('round_id')
    outcome = data.get('outcome')
    score = data.get('score')
    remarks = data.get('remarks')

    return jsonify(record_result(student_id, round_id, outcome, score if score is not None else None, remarks or None))

@admin_bp.route('/offers', methods=['GET'])
def get_offers():
    drive_id = request.args.get('drive_id')
    status = request.args.get('status')

    sql = """
        SELECT 
            o.*,
            s.name AS student_name,
            s.enrollment_no,
            s.dept_name,
            s.email AS student_email,
            pd.job_title,
            c.company_name
        FROM Offer o
        JOIN Student s ON s.roll_no = o.student_id
        JOIN Placement_Drive pd ON pd.drive_id = o.drive_id
        JOIN Company c ON c.company_id = pd.company_id
        WHERE 1=1
    """
    params = []

    if drive_id:
        sql += " AND o.drive_id = %s"
        params.append(drive_id)
    if status:
        sql += " AND o.offer_status = %s"
        params.append(status)

    sql += " ORDER BY o.offer_date DESC, o.offer_id DESC"
    offers = query(sql, params)
    return jsonify({'success': True, 'offers': offers})

# T5: sp_issue_offer
@admin_bp.route('/offers', methods=['POST'])
def issue_offer():
    data = request.get_json() or {}
    student_id = data.get('student_id')
    drive_id = data.get('drive_id')

    offer = grant_offer(student_id, drive_id)
    return jsonify({'success': True, 'message': 'Offer granted. The student can view it in My Offers.', 'data': offer})

# T10: sp_placement_report
@admin_bp.route('/reports/placement', methods=['GET'])
def get_placement_report():
    result = call_procedure('sp_placement_report', [])
    # T10 returns 3 result sets:
    # result[0]: overall summary
    # result[1]: company-wise
    # result[2]: dept-wise
    summary = result[0][0] if (len(result) > 0 and result[0]) else {}
    company_wise = result[1] if len(result) > 1 else []
    dept_wise = result[2] if len(result) > 2 else []

    return jsonify({
        'success': True,
        'message': 'Placement report generated via procedure T10 (sp_placement_report)',
        'report': {
            'summary': summary,
            'companyWise': company_wise,
            'deptWise': dept_wise
        }
    })

@admin_bp.route('/audit-logs', methods=['GET'])
def get_audit_logs():
    table_name = request.args.get('table_name')
    limit = int(request.args.get('limit', 100))

    sql = "SELECT * FROM Audit_Log WHERE 1=1"
    params = []

    if table_name:
        sql += " AND table_name = %s"
        params.append(table_name)

    sql += " ORDER BY log_id DESC LIMIT %s"
    params.append(limit)

    logs = query(sql, params)
    return jsonify({'success': True, 'logs': logs})
