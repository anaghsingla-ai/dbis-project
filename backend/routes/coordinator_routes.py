import jwt
from flask import Blueprint, request, jsonify
from db import query, execute, call_procedure
from config import Config

coordinator_bp = Blueprint('coordinator', __name__, url_prefix='/api/coordinator')

@coordinator_bp.before_request
def check_coordinator_access():
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

    if data.get('role') != 'DEPARTMENT_COORDINATOR':
        return jsonify({'success': False, 'message': 'Access denied. DEPARTMENT_COORDINATOR role required.'}), 403

@coordinator_bp.route('/departments', methods=['GET'])
def get_departments():
    """List all departments (needed for the transfer modal dropdown)."""
    departments = query("SELECT dept_id, dept_code, dept_name FROM Department ORDER BY dept_name")
    return jsonify({'success': True, 'departments': departments})

@coordinator_bp.route('/overview', methods=['GET'])
def get_department_overview():
    dept_id = request.user.get('dept_id')
    if not dept_id:
        return jsonify({'success': False, 'message': 'User is not linked to a department.'}), 400

    depts = query("SELECT * FROM Department WHERE dept_id = %s", (dept_id,))
    if not depts:
        return jsonify({'success': False, 'message': 'Department not found.'}), 404

    department = depts[0]

    stats_rows = query(
        """SELECT 
            COUNT(DISTINCT s.roll_no) AS enrolled_students,
            COUNT(DISTINCT o.student_id) AS placed_students,
            ROUND(COALESCE(COUNT(DISTINCT o.student_id) * 100.0 / NULLIF(COUNT(DISTINCT s.roll_no), 0), 0), 1) AS placement_pct,
            ROUND(AVG(o.package_offered), 2) AS avg_package,
            MAX(o.package_offered) AS highest_package
           FROM Student s
           LEFT JOIN Offer o ON o.student_id = s.roll_no AND o.offer_status = 'Accepted'
           WHERE s.dept_id = %s""",
        (dept_id,)
    )
    stats = stats_rows[0] if stats_rows else {}

    return jsonify({
        'success': True,
        'department': department,
        'stats': stats
    })

@coordinator_bp.route('/students', methods=['GET'])
def get_students():
    dept_id = request.user.get('dept_id')
    search = request.args.get('search')
    min_cgpa = request.args.get('min_cgpa')
    max_backlogs = request.args.get('max_backlogs')
    placed = request.args.get('placed')

    sql = """
        SELECT 
            s.*,
            CASE WHEN o.offer_id IS NOT NULL THEN 'Placed' ELSE 'Unplaced' END AS placement_status,
            o.package_offered AS accepted_package,
            c.company_name AS placed_company,
            (SELECT COUNT(*) FROM Application a WHERE a.student_id = s.roll_no) AS total_applications
        FROM Student s
        LEFT JOIN Offer o ON o.offer_id = (
            SELECT offer_id
            FROM Offer
            WHERE student_id = s.roll_no AND offer_status = 'Accepted'
            LIMIT 1
        )
        LEFT JOIN Placement_Drive pd ON pd.drive_id = o.drive_id
        LEFT JOIN Company c ON c.company_id = pd.company_id
        WHERE s.dept_id = %s
    """
    params = [dept_id]

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

# T8: sp_update_academic_record with department check
@coordinator_bp.route('/students/academic-record', methods=['POST'])
def update_academic_record():
    dept_id = request.user.get('dept_id')
    data = request.get_json() or {}
    # Accept both 'student_id' (from frontend) and 'roll_no' (legacy)
    roll_no = data.get('student_id') or data.get('roll_no')
    # Accept both 'new_cgpa'/'new_backlog_count' (frontend) and 'cgpa'/'backlog_count' (legacy)
    cgpa = data.get('new_cgpa') or data.get('cgpa')
    backlog_count = data.get('new_backlog_count') if data.get('new_backlog_count') is not None else data.get('backlog_count')

    if not roll_no:
        return jsonify({'success': False, 'message': 'student_id is required.'}), 400

    student_check = query("SELECT dept_id FROM Student WHERE roll_no = %s", (roll_no,))
    if not student_check:
        return jsonify({'success': False, 'message': 'Student not found.'}), 404
    if student_check[0]['dept_id'] != dept_id:
        return jsonify({'success': False, 'message': 'Cannot update academic record of a student from another department.'}), 403

    result = call_procedure('sp_update_academic_record', [roll_no, cgpa, backlog_count])

    return jsonify({
        'success': True,
        'message': 'Academic record updated successfully. Audit log recorded automatically.',
        'data': result[0] if result else None
    })

# T9: sp_transfer_student_dept with department check
@coordinator_bp.route('/students/transfer', methods=['POST'])
def transfer_student():
    dept_id = request.user.get('dept_id')
    data = request.get_json() or {}
    # Accept both 'student_id' (from frontend) and 'roll_no' (legacy)
    roll_no = data.get('student_id') or data.get('roll_no')
    new_dept_id = data.get('new_dept_id')

    if not roll_no:
        return jsonify({'success': False, 'message': 'student_id is required.'}), 400

    student_check = query("SELECT dept_id FROM Student WHERE roll_no = %s", (roll_no,))
    if not student_check:
        return jsonify({'success': False, 'message': 'Student not found.'}), 404
    if student_check[0]['dept_id'] != dept_id:
        return jsonify({'success': False, 'message': 'Student does not belong to your department.'}), 403

    result = call_procedure('sp_transfer_student_dept', [roll_no, new_dept_id])
    execute("UPDATE User_Account SET dept_id = %s WHERE student_id = %s", (new_dept_id, roll_no))

    return jsonify({
        'success': True,
        'message': 'Student transferred via procedure T9 (sp_transfer_student_dept). Both department counts synchronized via TR4.',
        'data': result[0] if result else None
    })

@coordinator_bp.route('/audit-history', methods=['GET'])
def get_audit_history():
    dept_id = request.user.get('dept_id')
    logs = query(
        """SELECT al.*, s.name AS student_name, s.enrollment_no 
           FROM Audit_Log al
           JOIN Student s ON s.roll_no = al.record_id
           WHERE al.table_name = 'Student' AND s.dept_id = %s
           ORDER BY al.changed_at DESC
           LIMIT 50""",
        (dept_id,)
    )

    return jsonify({'success': True, 'logs': logs})
