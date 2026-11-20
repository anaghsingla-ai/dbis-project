from selection_workflow import record_result, grant_offer
import jwt
from flask import Blueprint, request, jsonify
from db import query, call_procedure
from config import Config

hr_bp = Blueprint('hr', __name__, url_prefix='/api/hr')

@hr_bp.before_request
def check_hr_access():
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

    if data.get('role') != 'COMPANY_HR':
        return jsonify({'success': False, 'message': 'Access denied. COMPANY_HR role required.'}), 403

@hr_bp.route('/overview', methods=['GET'])
def get_overview():
    company_id = request.user.get('company_id')
    if not company_id:
        return jsonify({'success': False, 'message': 'User is not linked to a company.'}), 400

    companies = query("SELECT * FROM Company WHERE company_id = %s", (company_id,))
    if not companies:
        return jsonify({'success': False, 'message': 'Company not found.'}), 404

    company = companies[0]

    stats_rows = query(
        """SELECT 
            (SELECT COUNT(*) FROM Placement_Drive WHERE company_id = %s) AS total_drives,
            (SELECT COUNT(*) FROM Application a JOIN Placement_Drive pd ON pd.drive_id = a.drive_id WHERE pd.company_id = %s) AS total_applicants,
            (SELECT COUNT(*) FROM Application a JOIN Placement_Drive pd ON pd.drive_id = a.drive_id WHERE pd.company_id = %s AND a.status = 'Shortlisted') AS shortlisted_candidates,
            (SELECT COUNT(*) FROM Offer o JOIN Placement_Drive pd ON pd.drive_id = o.drive_id WHERE pd.company_id = %s AND o.offer_status = 'Accepted') AS hired_candidates,
            (SELECT COUNT(*) FROM Offer o JOIN Placement_Drive pd ON pd.drive_id = o.drive_id WHERE pd.company_id = %s AND o.offer_status = 'Pending') AS pending_offers""",
        (company_id, company_id, company_id, company_id, company_id)
    )
    stats = stats_rows[0] if stats_rows else {}

    return jsonify({
        'success': True,
        'company': company,
        'stats': stats
    })

@hr_bp.route('/drives', methods=['GET'])
def get_drives():
    company_id = request.user.get('company_id')
    drives = query(
        """SELECT 
            pd.*,
            ec.min_cgpa,
            ec.max_backlogs,
            ec.eligible_departments,
            ec.min_10th_percentage,
            ec.min_12th_percentage,
            (SELECT COUNT(*) FROM Application a WHERE a.drive_id = pd.drive_id) AS total_applicants,
            (SELECT COUNT(*) FROM Application a WHERE a.drive_id = pd.drive_id AND a.status = 'Shortlisted') AS shortlisted_count,
            (SELECT COUNT(*) FROM Offer o WHERE o.drive_id = pd.drive_id AND o.offer_status = 'Accepted') AS hired_count,
            (SELECT COUNT(*) FROM Selection_Round sr WHERE sr.drive_id = pd.drive_id) AS total_rounds
           FROM Placement_Drive pd
           LEFT JOIN Eligibility_Criteria ec ON ec.drive_id = pd.drive_id
           WHERE pd.company_id = %s
           ORDER BY pd.drive_date DESC""",
        (company_id,)
    )

    return jsonify({'success': True, 'drives': drives})

@hr_bp.route('/applicants', methods=['GET'])
def get_applicants():
    company_id = request.user.get('company_id')
    drive_id = request.args.get('drive_id')
    status = request.args.get('status')

    sql = """
        SELECT 
            a.application_id,
            a.drive_id,
            a.application_date,
            a.status,
            s.roll_no AS student_id,
            s.name,
            s.enrollment_no,
            s.email,
            s.phone,
            s.dept_name,
            s.cgpa,
            s.backlog_count,
            s.resume_link,
            pd.job_title,
            (SELECT o.offer_status FROM Offer o WHERE o.student_id = s.roll_no AND o.drive_id = pd.drive_id ORDER BY o.offer_id DESC LIMIT 1) AS offer_status,
            (a.status = 'Shortlisted'
             AND EXISTS(SELECT 1 FROM Selection_Round sr WHERE sr.drive_id = pd.drive_id)
             AND NOT EXISTS(SELECT 1 FROM Selection_Round sr LEFT JOIN Round_Result rr ON rr.round_id = sr.round_id AND rr.student_id = s.roll_no
                 WHERE sr.drive_id = pd.drive_id AND COALESCE(rr.outcome, '') <> 'Pass')
             AND NOT EXISTS(SELECT 1 FROM Offer o WHERE o.student_id = s.roll_no AND (o.drive_id = pd.drive_id OR o.offer_status = 'Accepted'))) AS ready_for_offer,
            (SELECT outcome FROM Round_Result rr 
             JOIN Selection_Round sr ON sr.round_id = rr.round_id 
             WHERE rr.student_id = s.roll_no AND sr.drive_id = pd.drive_id 
             ORDER BY sr.round_no DESC LIMIT 1) AS latest_round_outcome
        FROM Application a
        JOIN Student s ON s.roll_no = a.student_id
        JOIN Placement_Drive pd ON pd.drive_id = a.drive_id
        WHERE pd.company_id = %s
    """
    params = [company_id]

    if drive_id:
        sql += " AND a.drive_id = %s"
        params.append(drive_id)
    if status:
        sql += " AND a.status = %s"
        params.append(status)

    sql += " ORDER BY a.application_date DESC"
    applicants = query(sql, params)

    return jsonify({'success': True, 'applicants': applicants})

@hr_bp.route('/drives/<int:drive_id>/rounds', methods=['GET'])
def get_rounds(drive_id):
    company_id = request.user.get('company_id')

    # Verify company owns this drive
    drive_check = query("SELECT drive_id FROM Placement_Drive WHERE drive_id = %s AND company_id = %s", (drive_id, company_id))
    if not drive_check:
        return jsonify({'success': False, 'message': 'Drive does not belong to your company.'}), 403

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

@hr_bp.route('/drives/<int:drive_id>/applicants/<int:student_id>/rounds', methods=['GET'])
def get_applicant_rounds(drive_id, student_id):
    company_id = request.user.get('company_id')
    drive_check = query("SELECT drive_id FROM Placement_Drive WHERE drive_id = %s AND company_id = %s", (drive_id, company_id))
    if not drive_check:
        return jsonify({'success': False, 'message': 'Drive does not belong to your company.'}), 403

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

@hr_bp.route('/rounds/<int:round_id>/candidates', methods=['GET'])
def get_round_candidates(round_id):
    company_id = request.user.get('company_id')

    round_info = query(
        """SELECT sr.*, pd.company_id FROM Selection_Round sr
           JOIN Placement_Drive pd ON pd.drive_id = sr.drive_id
           WHERE sr.round_id = %s""",
        (round_id,)
    )

    if not round_info:
        return jsonify({'success': False, 'message': 'Round not found.'}), 404
    if round_info[0]['company_id'] != company_id:
        return jsonify({'success': False, 'message': 'Unauthorized for this round.'}), 403

    drive_id = round_info[0]['drive_id']
    round_no = round_info[0]['round_no']

    if round_no == 1:
        candidates = query(
            """SELECT s.roll_no AS student_id, s.name, s.enrollment_no, s.dept_name, s.cgpa, a.status,
                      rr.result_id, rr.outcome, rr.score, rr.remarks
               FROM Application a
               JOIN Student s ON s.roll_no = a.student_id
               LEFT JOIN Round_Result rr ON rr.student_id = s.roll_no AND rr.round_id = %s
               WHERE a.drive_id = %s AND a.status IN ('Applied', 'Shortlisted')
               ORDER BY s.name ASC""",
            (round_id, drive_id)
        )
    else:
        candidates = query(
            """SELECT s.roll_no AS student_id, s.name, s.enrollment_no, s.dept_name, s.cgpa, a.status,
                      rr.result_id, rr.outcome, rr.score, rr.remarks
               FROM Application a
               JOIN Student s ON s.roll_no = a.student_id
               JOIN Round_Result prev_rr ON prev_rr.student_id = s.roll_no AND prev_rr.outcome = 'Pass'
               JOIN Selection_Round prev_sr ON prev_sr.round_id = prev_rr.round_id 
                    AND prev_sr.drive_id = %s AND prev_sr.round_no = (%s - 1)
               LEFT JOIN Round_Result rr ON rr.student_id = s.roll_no AND rr.round_id = %s
               WHERE a.drive_id = %s AND a.status IN ('Applied', 'Shortlisted')
               ORDER BY s.name ASC""",
            (drive_id, round_no, round_id, drive_id)
        )

    return jsonify({'success': True, 'round': round_info[0], 'candidates': candidates})

# T4: sp_record_round_result with company ownership validation
@hr_bp.route('/rounds/record-result', methods=['POST'])
def record_round_result():
    company_id = request.user.get('company_id')
    data = request.get_json() or {}
    student_id = data.get('student_id')
    round_id = data.get('round_id')
    outcome = data.get('outcome')
    score = data.get('score')
    remarks = data.get('remarks')

    round_check = query(
        """SELECT sr.round_id FROM Selection_Round sr
           JOIN Placement_Drive pd ON pd.drive_id = sr.drive_id
           WHERE sr.round_id = %s AND pd.company_id = %s""",
        (round_id, company_id)
    )

    if not round_check:
        return jsonify({'success': False, 'message': 'Unauthorized: this round belongs to another company.'}), 403

    return jsonify(record_result(student_id, round_id, outcome, score if score is not None else None, remarks or None))


@hr_bp.route('/offers', methods=['POST'])
def select_candidate():
    data = request.get_json() or {}
    student_id, drive_id = data.get('student_id'), data.get('drive_id')
    if not student_id or not drive_id:
        return jsonify({'success': False, 'message': 'Student and drive are required.'}), 400
    drives = query('SELECT drive_id FROM Placement_Drive WHERE drive_id = %s AND company_id = %s', (drive_id, request.user.get('company_id')))
    if not drives:
        return jsonify({'success': False, 'message': 'This drive does not belong to your company.'}), 403
    offer = grant_offer(student_id, drive_id)
    return jsonify({'success': True, 'message': 'Offer granted. The student can now view and accept it in My Offers.', 'offer': offer})
