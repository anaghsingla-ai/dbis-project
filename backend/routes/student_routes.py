import jwt
from flask import Blueprint, request, jsonify
from db import query, execute, call_procedure
from config import Config

student_bp = Blueprint('student', __name__, url_prefix='/api/student')

@student_bp.before_request
def check_student_access():
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

    if data.get('role') != 'STUDENT':
        return jsonify({'success': False, 'message': 'Access denied. STUDENT role required.'}), 403

@student_bp.route('/overview', methods=['GET'])
def get_overview():
    student_id = request.user.get('student_id')
    if not student_id:
        return jsonify({'success': False, 'message': 'User is not linked to a student record.'}), 400

    students = query(
        """SELECT s.*, d.dept_code, d.hod_name 
           FROM Student s 
           LEFT JOIN Department d ON d.dept_id = s.dept_id 
           WHERE s.roll_no = %s""",
        (student_id,)
    )

    if not students:
        return jsonify({'success': False, 'message': 'Student profile not found.'}), 404

    student = students[0]

    counts_rows = query(
        """SELECT 
            (SELECT COUNT(*) FROM Application WHERE student_id = %s) AS total_applications,
            (SELECT COUNT(*) FROM Application WHERE student_id = %s AND status IN ('Applied', 'Shortlisted')) AS active_applications,
            (SELECT COUNT(*) FROM Application WHERE student_id = %s AND status = 'Shortlisted') AS shortlisted_count,
            (SELECT COUNT(*) FROM Offer WHERE student_id = %s) AS total_offers,
            (SELECT COUNT(*) FROM Offer WHERE student_id = %s AND offer_status = 'Pending') AS pending_offers,
            (SELECT COUNT(*) FROM Offer WHERE student_id = %s AND offer_status = 'Accepted') AS accepted_offers""",
        (student_id, student_id, student_id, student_id, student_id, student_id)
    )
    counts = counts_rows[0] if counts_rows else {}

    upcoming_rounds = query(
        """SELECT sr.*, pd.job_title, c.company_name, a.status AS application_status
           FROM Selection_Round sr
           JOIN Placement_Drive pd ON pd.drive_id = sr.drive_id
           JOIN Company c ON c.company_id = pd.company_id
           JOIN Application a ON a.drive_id = pd.drive_id AND a.student_id = %s
           WHERE a.status IN ('Applied', 'Shortlisted')
             AND (sr.round_date >= CURRENT_DATE OR sr.round_date IS NULL)
           ORDER BY sr.round_date ASC, sr.round_no ASC""",
        (student_id,)
    )

    return jsonify({
        'success': True,
        'student': student,
        'counts': counts,
        'upcomingRounds': upcoming_rounds
    })

@student_bp.route('/profile', methods=['GET'])
def get_profile():
    student_id = request.user.get('student_id')
    students = query(
        """SELECT s.*, d.dept_code, d.hod_name 
           FROM Student s 
           LEFT JOIN Department d ON d.dept_id = s.dept_id 
           WHERE s.roll_no = %s""",
        (student_id,)
    )

    if not students:
        return jsonify({'success': False, 'message': 'Student not found.'}), 404

    return jsonify({'success': True, 'student': students[0]})

@student_bp.route('/profile', methods=['PUT'])
def update_profile():
    student_id = request.user.get('student_id')
    data = request.get_json() or {}
    phone = data.get('phone')
    address = data.get('address')
    resume_link = data.get('resume_link')

    # Security: student cannot modify cgpa, backlog_count, or dept_id directly!
    execute(
        """UPDATE Student 
           SET phone = COALESCE(%s, phone), 
               address = COALESCE(%s, address), 
               resume_link = COALESCE(%s, resume_link)
           WHERE roll_no = %s""",
        (phone, address, resume_link, student_id)
    )

    return jsonify({'success': True, 'message': 'Profile updated successfully.'})

# Lists all drives and explains eligibility with ordinary SQL conditions.
@student_bp.route('/drives', methods=['GET'])
def get_available_drives():
    student_id = request.user.get('student_id')

    drives = query(
        """SELECT 
            pd.*,
            c.company_name,
            c.industry_type,
            c.website,
            ec.min_cgpa,
            ec.max_backlogs,
            ec.eligible_departments,
            ec.min_10th_percentage,
            ec.min_12th_percentage,
            a.application_id,
            a.status AS my_application_status,
            a.application_date,
            CASE
                WHEN s.roll_no IS NULL THEN 'student not found'
                WHEN pd.drive_date < CURRENT_DATE THEN 'applications for this drive are closed'
                WHEN EXISTS (
                    SELECT 1 FROM Offer o
                    WHERE o.student_id = s.roll_no AND o.offer_status = 'Accepted'
                ) THEN 'student already has an accepted offer'
                WHEN ec.min_cgpa IS NOT NULL AND s.cgpa < ec.min_cgpa THEN 'CGPA below drive minimum'
                WHEN ec.max_backlogs IS NOT NULL AND s.backlog_count > ec.max_backlogs THEN 'too many backlogs for this drive'
                WHEN ec.min_10th_percentage IS NOT NULL AND COALESCE(s.percentage_10th, 0) < ec.min_10th_percentage THEN '10th percentage below minimum'
                WHEN ec.min_12th_percentage IS NOT NULL AND COALESCE(s.percentage_12th, 0) < ec.min_12th_percentage THEN '12th percentage below minimum'
                WHEN ec.eligible_departments IS NOT NULL AND UPPER(ec.eligible_departments) <> 'ALL'
                     AND FIND_IN_SET(d.dept_code, REPLACE(ec.eligible_departments, ' ', '')) = 0 THEN 'department not eligible for this drive'
                ELSE NULL
            END AS eligibility_error
           FROM Placement_Drive pd
           JOIN Company c ON c.company_id = pd.company_id
           JOIN Student s ON s.roll_no = %s
           LEFT JOIN Department d ON d.dept_id = s.dept_id
           LEFT JOIN Eligibility_Criteria ec ON ec.drive_id = pd.drive_id
           LEFT JOIN Application a ON a.drive_id = pd.drive_id AND a.student_id = %s
           ORDER BY pd.drive_date ASC, pd.drive_id DESC""",
        (student_id, student_id)
    )

    formatted = []
    for d in drives:
        formatted.append({
            **d,
            'is_eligible': d.get('eligibility_error') is None,
            'eligibility_reason': d.get('eligibility_error'),
            'has_applied': bool(d.get('application_id'))
        })

    return jsonify({'success': True, 'drives': formatted})

# T3: sp_apply_to_drive
@student_bp.route('/apply', methods=['POST'])
def apply_to_drive():
    student_id = request.user.get('student_id')
    data = request.get_json() or {}
    drive_id = data.get('drive_id')

    if not drive_id:
        return jsonify({'success': False, 'message': 'Drive ID is required.'}), 400

    result = call_procedure('sp_apply_to_drive', [student_id, drive_id])

    return jsonify({
        'success': True,
        'message': 'Application submitted successfully via procedure T3 (sp_apply_to_drive)',
        'data': result[0] if result else None
    })

@student_bp.route('/applications', methods=['GET'])
def get_my_applications():
    student_id = request.user.get('student_id')

    applications = query(
        """SELECT 
            a.*,
            pd.job_title,
            pd.package_offered,
            pd.drive_date,
            pd.mode,
            c.company_name,
            c.industry_type,
            (SELECT COUNT(*) FROM Selection_Round sr WHERE sr.drive_id = a.drive_id) AS total_rounds
           FROM Application a
           JOIN Placement_Drive pd ON pd.drive_id = a.drive_id
           JOIN Company c ON c.company_id = pd.company_id
           WHERE a.student_id = %s
           ORDER BY a.application_date DESC""",
        (student_id,)
    )

    for app in applications:
        app['rounds'] = query(
            """SELECT sr.round_id, sr.round_no, sr.round_type, sr.round_date, rr.outcome, rr.score, rr.remarks
               FROM Selection_Round sr
               LEFT JOIN Round_Result rr ON rr.round_id = sr.round_id AND rr.student_id = %s
               WHERE sr.drive_id = %s
               ORDER BY sr.round_no ASC""",
            (student_id, app['drive_id'])
        )
        offers = query('SELECT offer_status FROM Offer WHERE student_id = %s AND drive_id = %s', (student_id, app['drive_id']))
        statuses = [offer['offer_status'] for offer in offers]
        if 'Accepted' in statuses:
            app['placement_stage'] = 'Placed'
        elif 'Pending' in statuses:
            app['placement_stage'] = 'Offer received'
        elif 'Declined' in statuses:
            app['placement_stage'] = 'Offer declined'
        elif app['status'] in ('Applied', 'Shortlisted') and app['rounds'] and all(row['outcome'] == 'Pass' for row in app['rounds']):
            app['placement_stage'] = 'Ready for offer'
        else:
            app['placement_stage'] = app['status']

    return jsonify({'success': True, 'applications': applications})

# T7: sp_withdraw_application
@student_bp.route('/withdraw', methods=['POST'])
def withdraw_application():
    student_id = request.user.get('student_id')
    data = request.get_json() or {}
    drive_id = data.get('drive_id')

    if not drive_id:
        return jsonify({'success': False, 'message': 'Drive ID is required.'}), 400

    result = call_procedure('sp_withdraw_application', [student_id, drive_id])

    return jsonify({
        'success': True,
        'message': 'Application withdrawn via procedure T7 (sp_withdraw_application)',
        'data': result[0] if result else None
    })

@student_bp.route('/offers', methods=['GET'])
def get_my_offers():
    student_id = request.user.get('student_id')

    offers = query(
        """SELECT 
            o.*,
            pd.job_title,
            pd.drive_date,
            c.company_name,
            c.industry_type,
            c.website
           FROM Offer o
           JOIN Placement_Drive pd ON pd.drive_id = o.drive_id
           JOIN Company c ON c.company_id = pd.company_id
           WHERE o.student_id = %s
           ORDER BY o.offer_date DESC""",
        (student_id,)
    )

    return jsonify({'success': True, 'offers': offers})

# T6: sp_respond_to_offer
@student_bp.route('/offers/respond', methods=['POST'])
def respond_to_offer():
    student_id = request.user.get('student_id')
    data = request.get_json() or {}
    offer_id = data.get('offer_id')
    decision = data.get('decision')

    if not offer_id or not decision:
        return jsonify({'success': False, 'message': 'Offer ID and decision (Accepted/Declined) are required.'}), 400

    if decision not in ['Accepted', 'Declined']:
        return jsonify({'success': False, 'message': "Decision must be either 'Accepted' or 'Declined'."}), 400

    check = query("SELECT student_id, offer_status FROM Offer WHERE offer_id = %s", (offer_id,))
    if not check:
        return jsonify({'success': False, 'message': 'Offer not found.'}), 404
    if check[0]['student_id'] != student_id:
        return jsonify({'success': False, 'message': 'You are not authorized to respond to this offer.'}), 403

    result = call_procedure('sp_respond_to_offer', [offer_id, decision])

    return jsonify({
        'success': True,
        'message': f"Offer {decision.lower()} via procedure T6 (sp_respond_to_offer). Triggers TR17 and TR18 enforced.",
        'data': result[0] if result else None
    })
