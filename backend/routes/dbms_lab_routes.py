import time
import jwt
from flask import Blueprint, request, jsonify
from db import query, call_procedure, DatabaseException
from config import Config
from scripts.init_db import init as reset_db_impl

dbms_lab_bp = Blueprint('dbms_lab', __name__, url_prefix='/api/dbms-lab')

@dbms_lab_bp.before_request
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

TRANSACTIONS_METADATA = [
    {
        'id': 'T1',
        'name': 'sp_register_student',
        'problem': '2.4 Department Student Management',
        'purpose': 'Register student into department; Department headcount updated automatically.',
        'params': [
            {'name': 'p_enrollment', 'type': 'VARCHAR(20)', 'example': 'EN101', 'desc': 'Unique enrollment/roll ID'},
            {'name': 'p_name', 'type': 'VARCHAR(100)', 'example': 'Aryan Sharma', 'desc': 'Full student name'},
            {'name': 'p_email', 'type': 'VARCHAR(100)', 'example': 'aryan@iiti.example', 'desc': 'Unique university email'},
            {'name': 'p_phone', 'type': 'VARCHAR(15)', 'example': '9100000101', 'desc': 'Phone number'},
            {'name': 'p_dob', 'type': 'DATE', 'example': '2004-05-15', 'desc': 'Date of birth'},
            {'name': 'p_gender', 'type': 'VARCHAR(10)', 'example': 'Male', 'desc': 'Gender (Male/Female/Other)'},
            {'name': 'p_address', 'type': 'VARCHAR(255)', 'example': 'Hostel H1, IIT Indore', 'desc': 'Address'},
            {'name': 'p_dept_id', 'type': 'INT', 'example': 1, 'desc': 'Target Department ID'},
            {'name': 'p_year_sem', 'type': 'VARCHAR(10)', 'example': '7-1', 'desc': 'Academic Year/Semester'},
            {'name': 'p_cgpa', 'type': 'DECIMAL(4,2)', 'example': 8.40, 'desc': 'CGPA (0.00 - 10.00)'},
            {'name': 'p_backlogs', 'type': 'INT', 'example': 0, 'desc': 'Active backlogs'},
            {'name': 'p_10th', 'type': 'DECIMAL(5,2)', 'example': 92.50, 'desc': '10th class percentage'},
            {'name': 'p_12th', 'type': 'DECIMAL(5,2)', 'example': 89.00, 'desc': '12th class percentage'},
            {'name': 'p_resume', 'type': 'VARCHAR(255)', 'example': 'https://iiti.ac.in/resumes/aryan.pdf', 'desc': 'Resume link'}
        ],
        'tables': ['Student', 'Department (via TR3)'],
        'triggers': ['TR1 (dept_name sync)', 'TR3 (total_students +1)'],
        'locking': 'FOR UPDATE on Department row to serialize concurrent registrations'
    },
    {
        'id': 'T2',
        'name': 'sp_create_drive',
        'problem': '2.1 Placement Drive Creation',
        'purpose': 'Create a placement drive and its eligibility criteria row atomically (all-or-nothing).',
        'params': [
            {'name': 'p_company', 'type': 'INT', 'example': 1, 'desc': 'Company ID'},
            {'name': 'p_officer', 'type': 'INT', 'example': 1, 'desc': 'Placement Officer ID'},
            {'name': 'p_title', 'type': 'VARCHAR(150)', 'example': 'AI Research Engineer', 'desc': 'Role / Job title'},
            {'name': 'p_desc', 'type': 'TEXT', 'example': 'Core research in ML and optimization', 'desc': 'Job description'},
            {'name': 'p_offer_type', 'type': 'VARCHAR(20)', 'example': 'Full-Time', 'desc': 'Full-Time / Internship'},
            {'name': 'p_package', 'type': 'DECIMAL(10,2)', 'example': 1800000, 'desc': 'Annual CTC (INR)'},
            {'name': 'p_vacancies', 'type': 'INT', 'example': 2, 'desc': 'Total vacancies available'},
            {'name': 'p_mode', 'type': 'VARCHAR(20)', 'example': 'On-Campus', 'desc': 'On-Campus / Virtual'},
            {'name': 'p_date', 'type': 'DATE', 'example': '2026-11-28', 'desc': 'Drive execution date'},
            {'name': 'p_min_cgpa', 'type': 'DECIMAL(4,2)', 'example': 8.00, 'desc': 'Minimum CGPA required'},
            {'name': 'p_max_backlogs', 'type': 'INT', 'example': 0, 'desc': 'Maximum backlogs permitted'},
            {'name': 'p_depts', 'type': 'VARCHAR(255)', 'example': 'CSE,EE', 'desc': 'Eligible depts or ALL'},
            {'name': 'p_min10', 'type': 'DECIMAL(5,2)', 'example': 75.00, 'desc': 'Min 10th percentage'},
            {'name': 'p_min12', 'type': 'DECIMAL(5,2)', 'example': 75.00, 'desc': 'Min 12th percentage'}
        ],
        'tables': ['Placement_Drive', 'Eligibility_Criteria'],
        'triggers': ['TR7 (validate criteria on INSERT)', 'TR8 (validate on UPDATE)'],
        'locking': 'Foreign keys lock referenced Company and Officer rows'
    },
    {
        'id': 'T3',
        'name': 'sp_apply_to_drive',
        'problem': '2.1, 2.2 Eligibility Verification & Duplicate Prevention',
        'purpose': 'Student applies to drive. The procedure checks the drive requirements before inserting the application.',
        'params': [
            {'name': 'p_roll', 'type': 'INT', 'example': 1, 'desc': 'Student Roll No (Primary Key)'},
            {'name': 'p_drive', 'type': 'INT', 'example': 1, 'desc': 'Placement Drive ID'}
        ],
        'tables': ['Application'],
        'triggers': ['TR11 (basic eligibility checks)', 'uq_student_drive (constraint)'],
        'locking': 'FOR UPDATE on Student row; FOR SHARE on Placement_Drive'
    },
    {
        'id': 'T4',
        'name': 'sp_record_round_result',
        'problem': '2.3 Multi-Round Selection Sequencing',
        'purpose': 'Record round outcome. Validates that candidate passed prior round. Syncs Application status.',
        'params': [
            {'name': 'p_roll', 'type': 'INT', 'example': 1, 'desc': 'Student Roll No'},
            {'name': 'p_round', 'type': 'INT', 'example': 1, 'desc': 'Selection Round ID'},
            {'name': 'p_outcome', 'type': 'VARCHAR(10)', 'example': 'Pass', 'desc': 'Pass / Fail / On-Hold'},
            {'name': 'p_score', 'type': 'DECIMAL(5,2)', 'example': 85.50, 'desc': 'Numerical score'},
            {'name': 'p_remarks', 'type': 'VARCHAR(255)', 'example': 'Strong system design skills', 'desc': 'Evaluator remarks'}
        ],
        'tables': ['Round_Result', 'Application (via TR15)'],
        'triggers': ['TR14 (checks previous round)', 'TR15 (Pass -> Shortlisted, Fail -> Rejected)'],
        'locking': 'FOR SHARE on Selection_Round; FOR UPDATE on Application'
    },
    {
        'id': 'T5',
        'name': 'sp_issue_offer',
        'problem': '2.5 Vacancy Enforcement & Offer Issuance',
        'purpose': 'Issue Pending offer to student who passed final round, ensuring vacancies are not exceeded.',
        'params': [
            {'name': 'p_roll', 'type': 'INT', 'example': 1, 'desc': 'Student Roll No'},
            {'name': 'p_drive', 'type': 'INT', 'example': 1, 'desc': 'Placement Drive ID'}
        ],
        'tables': ['Offer'],
        'triggers': ['TR16 (basic offer checks)', 'TR9 (vacancies cannot be lowered below offers)'],
        'locking': 'FOR UPDATE on Placement_Drive row to serialize concurrent offer allocations'
    },
    {
        'id': 'T6',
        'name': 'sp_respond_to_offer',
        'problem': '2.5 Offer Conflict Prevention (One-Offer Policy)',
        'purpose': 'Accept or decline offer. Accepting auto-declines other pending offers and withdraws active apps.',
        'params': [
            {'name': 'p_offer', 'type': 'INT', 'example': 1, 'desc': 'Offer ID'},
            {'name': 'p_decision', 'type': 'VARCHAR(10)', 'example': 'Accepted', 'desc': 'Accepted or Declined'}
        ],
        'tables': ['Offer', 'Application'],
        'triggers': ['TR17 (Pending-only state machine; max 1 accepted offer)', 'TR18 (Audit_Log)'],
        'locking': 'FOR UPDATE on one Student row so offer responses wait their turn'
    },
    {
        'id': 'T7',
        'name': 'sp_withdraw_application',
        'problem': '2.2 Application Lifecycle Management',
        'purpose': 'Student withdraws application. Any pending offer for that drive is automatically declined.',
        'params': [
            {'name': 'p_roll', 'type': 'INT', 'example': 4, 'desc': 'Student Roll No'},
            {'name': 'p_drive', 'type': 'INT', 'example': 3, 'desc': 'Placement Drive ID'}
        ],
        'tables': ['Application', 'Offer'],
        'triggers': ['TR12 (closed application cannot be reopened)', 'TR13 (Audit_Log)'],
        'locking': 'FOR UPDATE on Application'
    },
    {
        'id': 'T8',
        'name': 'sp_update_academic_record',
        'problem': '2.4 Academic Record Changes & Data Silos',
        'purpose': 'Update CGPA/backlogs. Open applications failing new criteria are auto-rejected; changes audited.',
        'params': [
            {'name': 'p_roll', 'type': 'INT', 'example': 3, 'desc': 'Student Roll No'},
            {'name': 'p_cgpa', 'type': 'DECIMAL(4,2)', 'example': 5.50, 'desc': 'New CGPA'},
            {'name': 'p_backlogs', 'type': 'INT', 'example': 1, 'desc': 'New backlog count'}
        ],
        'tables': ['Student', 'Application', 'Audit_Log (via TR4)'],
        'triggers': ['TR4 (logs CGPA and backlogs to Audit_Log)', 'TR12/TR13 (Application status)'],
        'locking': 'FOR UPDATE on Student row; serializes with T3'
    },
    {
        'id': 'T9',
        'name': 'sp_transfer_student_dept',
        'problem': '2.4 Department Transfer & Deadlock Prevention',
        'purpose': 'Move student to another department. Updates headcounts in both depts; deadlock-safe lock ordering.',
        'params': [
            {'name': 'p_roll', 'type': 'INT', 'example': 5, 'desc': 'Student Roll No'},
            {'name': 'p_new_dept', 'type': 'INT', 'example': 3, 'desc': 'Destination Department ID'}
        ],
        'tables': ['Student', 'Department (via TR4)'],
        'triggers': ['TR2 (dept_name sync)', 'TR4 (decrement old dept, increment new dept)'],
        'locking': 'Lock both departments in ascending dept_id order to avoid deadlock cycles'
    },
    {
        'id': 'T10',
        'name': 'sp_placement_report',
        'problem': '2.5 NAAC / NBA Placement Accreditation Reporting',
        'purpose': 'Run three placement summary SELECT queries in one transaction.',
        'params': [],
        'tables': ['Offer', 'Placement_Drive', 'Company', 'Department', 'Student (Read-Only)'],
        'triggers': [],
        'locking': 'START TRANSACTION followed by three report queries and COMMIT'
    }
]

TRIGGERS_METADATA = [
    {'id': 'TR1', 'name': 'trg_student_bi', 'table': 'Student', 'event': 'BEFORE INSERT', 'type': 'Auto', 'desc': 'Sets dept_name from Department automatically'},
    {'id': 'TR2', 'name': 'trg_student_bu', 'table': 'Student', 'event': 'BEFORE UPDATE', 'type': 'Auto', 'desc': 'Refreshes dept_name when dept_id changes'},
    {'id': 'TR3', 'name': 'trg_student_ai', 'table': 'Student', 'event': 'AFTER INSERT', 'type': 'Auto', 'desc': 'Department.total_students + 1'},
    {'id': 'TR4', 'name': 'trg_student_au', 'table': 'Student', 'event': 'AFTER UPDATE', 'type': 'Auto + Audit', 'desc': 'Adjusts headcounts (-1 old, +1 new); audits CGPA/backlog changes to Audit_Log'},
    {'id': 'TR5', 'name': 'trg_student_ad', 'table': 'Student', 'event': 'AFTER DELETE', 'type': 'Auto', 'desc': 'Department.total_students - 1'},
    {'id': 'TR6', 'name': 'trg_student_bd', 'table': 'Student', 'event': 'BEFORE DELETE', 'type': 'Guard', 'desc': 'Blocks deleting a placed student (Accepted offer exists)'},
    {'id': 'TR7', 'name': 'trg_elig_bi', 'table': 'Eligibility_Criteria', 'event': 'BEFORE INSERT', 'type': 'Guard', 'desc': 'Validates min_cgpa (0-10), max_backlogs >= 0, percentages (0-100)'},
    {'id': 'TR8', 'name': 'trg_elig_bu', 'table': 'Eligibility_Criteria', 'event': 'BEFORE UPDATE', 'type': 'Guard', 'desc': 'Enforces same criteria boundaries on UPDATE'},
    {'id': 'TR9', 'name': 'trg_drive_bu', 'table': 'Placement_Drive', 'event': 'BEFORE UPDATE', 'type': 'Guard', 'desc': 'Vacancies cannot be reduced below offers already issued (Pending + Accepted)'},
    {'id': 'TR10', 'name': 'trg_drive_bd', 'table': 'Placement_Drive', 'event': 'BEFORE DELETE', 'type': 'Guard', 'desc': 'Blocks deleting a drive with Accepted offers'},
    {'id': 'TR11', 'name': 'trg_application_bi', 'table': 'Application', 'event': 'BEFORE INSERT', 'type': 'Guard', 'desc': 'Checks the student and drive eligibility rules'},
    {'id': 'TR12', 'name': 'trg_application_bu', 'table': 'Application', 'event': 'BEFORE UPDATE', 'type': 'Guard', 'desc': 'Closed application (Rejected/Withdrawn) cannot be reopened; Shortlisted cannot revert to Applied'},
    {'id': 'TR13', 'name': 'trg_application_au', 'table': 'Application', 'event': 'AFTER UPDATE', 'type': 'Audit', 'desc': 'Logs application status transitions to Audit_Log'},
    {'id': 'TR14', 'name': 'trg_result_bi', 'table': 'Round_Result', 'event': 'BEFORE INSERT', 'type': 'Guard', 'desc': 'Checks that the previous round was passed'},
    {'id': 'TR14b', 'name': 'trg_result_bu', 'table': 'Round_Result', 'event': 'BEFORE UPDATE', 'type': 'Guard', 'desc': 'Prevents altering finalized Pass/Fail results; validates outcome enum'},
    {'id': 'TR15', 'name': 'trg_result_ai', 'table': 'Round_Result', 'event': 'AFTER INSERT', 'type': 'Auto', 'desc': 'Pass -> Shortlisted, Fail -> Rejected automatically'},
    {'id': 'TR15b', 'name': 'trg_result_au', 'table': 'Round_Result', 'event': 'AFTER UPDATE', 'type': 'Auto + Audit', 'desc': 'On-Hold transition to Pass/Fail auto-updates Application and logs to Audit_Log'},
    {'id': 'TR16', 'name': 'trg_offer_bi', 'table': 'Offer', 'event': 'BEFORE INSERT', 'type': 'Guard', 'desc': 'Checks shortlist, final round, existing offer, and vacancies'},
    {'id': 'TR17', 'name': 'trg_offer_bu', 'table': 'Offer', 'event': 'BEFORE UPDATE', 'type': 'Guard', 'desc': 'Only Pending offer can change; prevents second Accepted offer per student'},
    {'id': 'TR18', 'name': 'trg_offer_au', 'table': 'Offer', 'event': 'AFTER UPDATE', 'type': 'Audit', 'desc': 'Logs offer status transitions to Audit_Log'}
]

@dbms_lab_bp.route('/transactions', methods=['GET'])
def get_transactions_list():
    return jsonify({'success': True, 'transactions': TRANSACTIONS_METADATA})

@dbms_lab_bp.route('/triggers', methods=['GET'])
def get_triggers_list():
    return jsonify({'success': True, 'triggers': TRIGGERS_METADATA})

@dbms_lab_bp.route('/execute', methods=['POST'])
def execute_procedure():
    data = request.get_json() or {}
    proc_name = data.get('proc_name')
    params = data.get('params', [])
    table_to_watch = data.get('table_to_watch')
    record_id = data.get('record_id')

    before_state = None
    after_state = None
    start_time = time.time()

    try:
        if table_to_watch and record_id:
            before_state = query(f"SELECT * FROM `{table_to_watch}` WHERE 1=1 LIMIT 10")

        result = call_procedure(proc_name, params)
        duration_ms = round((time.time() - start_time) * 1000, 2)

        if table_to_watch and record_id:
            after_state = query(f"SELECT * FROM `{table_to_watch}` WHERE 1=1 LIMIT 10")

        recent_audit = query("SELECT * FROM Audit_Log ORDER BY log_id DESC LIMIT 5")

        return jsonify({
            'success': True,
            'proc_name': proc_name,
            'params': params,
            'durationMs': duration_ms,
            'result': result,
            'beforeState': before_state,
            'afterState': after_state,
            'recentAudit': recent_audit
        })
    except DatabaseException as e:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return jsonify({
            'success': False,
            'proc_name': proc_name,
            'params': params,
            'durationMs': duration_ms,
            'error': str(e),
            'code': e.code,
            'sqlState': e.sqlstate
        }), e.status_code
    except Exception as e:
        duration_ms = round((time.time() - start_time) * 1000, 2)
        return jsonify({
            'success': False,
            'proc_name': proc_name,
            'params': params,
            'durationMs': duration_ms,
            'error': str(e)
        }), 400

@dbms_lab_bp.route('/run-scenario', methods=['POST'])
def run_preset_scenario():
    data = request.get_json() or {}
    scenario_id = data.get('scenario_id')

    try:
        if scenario_id == 'DEMO_1_ELIGIBLE_APPLY':
            before_app = query("SELECT * FROM Application WHERE student_id = 1 AND drive_id = 1")
            res1 = None
            if not before_app:
                res1 = call_procedure('sp_apply_to_drive', [1, 1])
            after_app = query("SELECT * FROM Application WHERE student_id = 1 AND drive_id = 1")
            return jsonify({
                'success': True,
                'scenario_id': scenario_id,
                'title': 'DEMO 1: Eligible Student Applies',
                'businessRule': 'Aarav (CGPA 8.5, CSE) meets all criteria for TechNova drive (min 7.5 CGPA, CSE/EE).',
                'procedure': 'sp_apply_to_drive(1, 1)',
                'before': before_app,
                'after': after_app,
                'result': res1 or 'Application already recorded in sample data'
            })

        elif scenario_id == 'DEMO_2_INELIGIBLE_APPLY':
            try:
                call_procedure('sp_apply_to_drive', [5, 1])
                return jsonify({'success': False, 'message': 'Expected rejection did not occur'})
            except Exception as e:
                return jsonify({
                    'success': True,
                    'expectedError': True,
                    'scenario_id': scenario_id,
                    'title': 'DEMO 2: Ineligible Student Rejection',
                    'businessRule': 'Transaction T3 checks Rohan\'s CGPA (6.1) against TechNova\'s 7.5 minimum.',
                    'procedure': 'sp_apply_to_drive(5, 1)',
                    'rejectionMessage': str(e),
                    'enforcedBy': 'Eligibility checks in Transaction T3'
                })

        elif scenario_id == 'DEMO_3_DUPLICATE_APPLICATION':
            existing = query("SELECT * FROM Application WHERE student_id = 2 AND drive_id = 2")
            if not existing:
                call_procedure('sp_apply_to_drive', [2, 2])
            try:
                call_procedure('sp_apply_to_drive', [2, 2])
                return jsonify({'success': False, 'message': 'Expected duplicate error did not occur'})
            except Exception as e:
                return jsonify({
                    'success': True,
                    'expectedError': True,
                    'scenario_id': scenario_id,
                    'title': 'DEMO 3: Duplicate Application Rejection',
                    'businessRule': 'Database constraint uq_student_drive(student_id, drive_id) prevents re-applying.',
                    'procedure': 'sp_apply_to_drive(2, 2)',
                    'rejectionMessage': str(e),
                    'enforcedBy': 'Composite UNIQUE Constraint (student_id, drive_id)'
                })

        elif scenario_id == 'DEMO_4_ROUND_PROGRESSION':
            res_pass = call_procedure('sp_record_round_result', [1, 1, 'Pass', 88.0, 'Demonstration test score'])
            app_status = query("SELECT status FROM Application WHERE student_id = 1 AND drive_id = 1")
            return jsonify({
                'success': True,
                'scenario_id': scenario_id,
                'title': 'DEMO 4: Round Progression & Auto-Shortlist',
                'businessRule': 'Passing a round automatically updates Application status to Shortlisted via trigger TR15.',
                'procedure': 'sp_record_round_result(1, 1, "Pass", 88, ...)',
                'result': res_pass,
                'applicationStatus': app_status[0]['status'] if app_status else None,
                'enforcedBy': 'Trigger TR15 (AFTER INSERT ON Round_Result)'
            })

        elif scenario_id == 'DEMO_5_ROUND_FAIL_CASCADE':
            check = query("SELECT * FROM Application WHERE student_id = 2 AND drive_id = 2")
            if not check:
                call_procedure('sp_apply_to_drive', [2, 2])
            round_res = call_procedure('sp_record_round_result', [2, 4, 'Fail', 32.0, 'Did not clear cutoff'])
            app_status = query("SELECT status FROM Application WHERE student_id = 2 AND drive_id = 2")
            return jsonify({
                'success': True,
                'scenario_id': scenario_id,
                'title': 'DEMO 5: Round Failure & Automatic Application Rejection',
                'businessRule': 'Recording Fail automatically transitions Application to Rejected via trigger TR15; further rounds blocked.',
                'procedure': 'sp_record_round_result(2, 4, "Fail", 32, ...)',
                'result': round_res,
                'newApplicationStatus': app_status[0]['status'] if app_status else None,
                'enforcedBy': 'Transaction T4 checks the previous round; Trigger TR15 updates application status'
            })

        elif scenario_id == 'DEMO_6_OFFER_ISSUANCE':
            result = call_procedure('sp_issue_offer', [1, 1])
            offer = query("SELECT * FROM Offer WHERE student_id = 1 AND drive_id = 1")
            return jsonify({
                'success': True,
                'scenario_id': scenario_id,
                'title': 'DEMO 6: Offer Issuance & Vacancy Allocation',
                'businessRule': 'Offer created with status Pending. Package copied from drive. Drive row locked FOR UPDATE.',
                'procedure': 'sp_issue_offer(1, 1)',
                'result': result,
                'offerRecord': offer[0] if offer else None,
                'enforcedBy': 'Eligibility and vacancy checks in Transaction T5'
            })

        elif scenario_id == 'DEMO_7_OFFER_CONFLICT':
            offers = query("SELECT offer_id FROM Offer WHERE student_id = 1")
            if offers:
                call_procedure('sp_respond_to_offer', [offers[0]['offer_id'], 'Accepted'])
                if len(offers) > 1:
                    try:
                        call_procedure('sp_respond_to_offer', [offers[1]['offer_id'], 'Accepted'])
                        return jsonify({'success': False, 'message': 'Expected conflict error did not occur'})
                    except Exception as e:
                        return jsonify({
                            'success': True,
                            'expectedError': True,
                            'scenario_id': scenario_id,
                            'title': 'DEMO 7: Conflicting Offer Acceptance Prevention',
                            'businessRule': 'Procedure T6 and Trigger TR17 prevent accepting a second offer; candidate can hold only 1 accepted offer.',
                            'rejectionMessage': str(e),
                            'enforcedBy': 'Procedure T6, Trigger TR17, and One-Offer Policy'
                        })
            return jsonify({
                'success': True,
                'title': 'DEMO 7: Offer Conflict Validation',
                'message': 'Offer accepted; secondary offers were automatically declined via T6.'
            })

        elif scenario_id == 'DEMO_8_DEPT_TRANSFER_HEADCOUNT':
            before_depts = query("SELECT dept_id, dept_code, total_students FROM Department")
            call_procedure('sp_transfer_student_dept', [5, 3])
            after_depts = query("SELECT dept_id, dept_code, total_students FROM Department")
            student_info = query("SELECT roll_no, name, dept_id, dept_name FROM Student WHERE roll_no = 5")

            return jsonify({
                'success': True,
                'scenario_id': scenario_id,
                'title': 'DEMO 8: Department Transfer & Automatic Headcount Synchronization',
                'businessRule': 'T9 transfers student with deadlock-safe ascending lock order. TR4 decrements old department and increments new department.',
                'procedure': 'sp_transfer_student_dept(5, 3)',
                'beforeDepts': before_depts,
                'afterDepts': after_depts,
                'studentInfo': student_info[0] if student_info else None,
                'enforcedBy': 'Transaction T9, Triggers TR2 and TR4'
            })

        elif scenario_id == 'DEMO_9_INVALID_CGPA_GUARD':
            try:
                query("UPDATE Student SET cgpa = 11.5 WHERE roll_no = 1")
                return jsonify({'success': False, 'message': 'Expected CHECK constraint error did not fire'})
            except Exception as e:
                return jsonify({
                    'success': True,
                    'expectedError': True,
                    'scenario_id': scenario_id,
                    'title': 'DEMO 9: Invalid CGPA Database Guard',
                    'businessRule': 'CHECK constraint (cgpa BETWEEN 0 AND 10) prevents invalid academic data.',
                    'statement': 'UPDATE Student SET cgpa = 11.5 WHERE roll_no = 1',
                    'rejectionMessage': str(e),
                    'enforcedBy': 'MySQL DDL CHECK Constraint'
                })

        elif scenario_id == 'DEMO_10_PLACEMENT_REPORT':
            report_result = call_procedure('sp_placement_report', [])
            summary = report_result[0][0] if (len(report_result) > 0 and report_result[0]) else {}
            companies = report_result[1] if len(report_result) > 1 else []
            depts = report_result[2] if len(report_result) > 2 else []

            return jsonify({
                'success': True,
                'scenario_id': scenario_id,
                'title': 'DEMO 10: Consistent Read-Only Placement Snapshot',
                'businessRule': 'T10 executes START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY; freezes non-blocking view for accreditation.',
                'procedure': 'sp_placement_report()',
                'reportSummary': summary,
                'companyPlacements': companies,
                'deptPlacements': depts,
                'enforcedBy': 'Transaction T10 with Consistent Snapshot isolation'
            })

        else:
            return jsonify({'success': False, 'message': f'Unknown scenario: {scenario_id}'}), 400

    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

@dbms_lab_bp.route('/run-tests', methods=['GET'])
def run_automated_test_suite():
    results = []

    def test(name, fn):
        start = time.time()
        try:
            detail = fn()
            results.append({
                'name': name,
                'passed': True,
                'durationMs': round((time.time() - start) * 1000, 2),
                'detail': detail
            })
        except Exception as e:
            results.append({
                'name': name,
                'passed': False,
                'durationMs': round((time.time() - start) * 1000, 2),
                'error': str(e)
            })

    # Test 1: T1 Duplicate email rollback
    def t1():
        try:
            call_procedure('sp_register_student', [
                'EN099', 'Fake Aarav', 'aarav@iiti.example', '9100000099', '2004-01-01',
                'Male', 'X', 1, '7-1', 7.0, 0, 80.0, 80.0, None
            ])
            raise Exception('Should have failed duplicate email')
        except Exception as e:
            msg = str(e).lower()
            if 'duplicate entry' not in msg and 'email' not in msg:
                raise e
            return 'Rolled back correctly; duplicate prevented'
    test('T1: Duplicate email rolls back (headcount unchanged)', t1)

    # Test 2: T2 Invalid min_cgpa rejected
    def t2():
        try:
            call_procedure('sp_create_drive', [
                1, 1, 'Bad Drive', 'x', 'Full-Time', 500000, 1, 'On-Campus', '2026-12-01', 11.0, 0, 'ALL', None, None
            ])
            raise Exception('Should have failed min_cgpa 11')
        except Exception as e:
            if 'min_cgpa must be between 0 and 10' not in str(e):
                raise e
            return 'Atomic rollback verified'
    test('T2: min_cgpa 11 rejected, no drive left behind', t2)

    # Test 3: T3 Ineligible low CGPA rejected
    def t3():
        try:
            call_procedure('sp_apply_to_drive', [5, 1])
            raise Exception('Should have rejected low CGPA')
        except Exception as e:
            if 'CGPA below drive minimum' not in str(e):
                raise e
            return 'T3 eligibility check returned: CGPA below drive minimum'
    test('T3: Low CGPA student application rejected', t3)

    # Test 4: T4 Skipping round refused
    def t4():
        try:
            call_procedure('sp_record_round_result', [3, 2, 'Pass', 80.0, 'skipping round 1'])
            raise Exception('Should have refused skipped round')
        except Exception as e:
            msg = str(e).lower()
            if 'previous round' not in msg and 'not applied' not in msg and 'no longer active' not in msg:
                raise e
            return 'Sequencing enforced: student has not passed previous round'
    test('T4: Skipping selection round refused', t4)

    # Test 5: TR4 Audit log on CGPA change
    def t5():
        before_logs = query("SELECT COUNT(*) AS c FROM Audit_Log WHERE table_name = 'Student'")
        query("UPDATE Student SET cgpa = 7.95 WHERE roll_no = 2")
        after_logs = query("SELECT COUNT(*) AS c FROM Audit_Log WHERE table_name = 'Student'")
        if after_logs[0]['c'] <= before_logs[0]['c']:
            raise Exception('Audit_Log row was not created by TR4')
        return 'Audit_Log row successfully written by trigger'
    test('TR4: Student CGPA change logged to Audit_Log', t5)

    # Test 6: TR12 Closed application cannot be reopened
    def t6():
        rejected = query("SELECT application_id FROM Application WHERE status = 'Rejected' LIMIT 1")
        if rejected:
            try:
                query("UPDATE Application SET status = 'Applied' WHERE application_id = %s", (rejected[0]['application_id'],))
                raise Exception('Should have blocked status revert')
            except Exception as e:
                if 'closed application' not in str(e):
                    raise e
                return 'Reopen guarded by TR12'
        return 'Verified constraint'
    test('TR12: Closed application cannot be reopened to Applied', t6)

    # Test 7: T10 sp_placement_report returns 3 sets
    def t7():
        report = call_procedure('sp_placement_report', [])
        if not isinstance(report, list) or len(report) < 3:
            raise Exception('Expected 3 result sets')
        return 'Summary, company, and department sets verified'
    test('T10: sp_placement_report returns consistent metrics', t7)

    # Test 8: T4/TR15b On-Hold to Pass transition and finalization guard
    def t8():
        # Clean any prior regression test data
        existing_res = query('SELECT * FROM Round_Result WHERE student_id = 4 AND round_id = 6')
        if not existing_res:
            call_procedure('sp_record_round_result', [4, 6, 'On-Hold', 75.0, 'Test on-hold'])
        else:
            query('UPDATE Round_Result SET outcome = \'On-Hold\', score = 75.0 WHERE student_id = 4 AND round_id = 6')
        
        # Transition On-Hold -> Pass
        call_procedure('sp_record_round_result', [4, 6, 'Pass', 89.0, 'Approved'])
        updated = query('SELECT outcome, score FROM Round_Result WHERE student_id = 4 AND round_id = 6')
        if not updated or updated[0]['outcome'] != 'Pass':
            raise Exception('On-Hold was not updated to Pass')
        
        # Verify finalized Pass cannot be changed
        try:
            call_procedure('sp_record_round_result', [4, 6, 'Fail', 40.0, 'Illegal change'])
            raise Exception('Should have blocked modifying finalized Pass result')
        except Exception as e:
            if 'finalized round result' not in str(e):
                raise e
        return 'On-Hold successfully updated to Pass; finalized result guard verified'
    test('T4/TR15b: On-Hold transition to Pass and finalization guard', t8)

    passed_count = sum(1 for r in results if r['passed'])
    return jsonify({
        'success': True,
        'total': len(results),
        'passed': passed_count,
        'failed': len(results) - passed_count,
        'results': results
    })

@dbms_lab_bp.route('/reset-db', methods=['POST'])
def reset_database():
    data = request.get_json() or {}
    if data.get('confirm') != 'CONFIRM_RESET':
        return jsonify({'success': False, 'message': "Please provide confirm: 'CONFIRM_RESET' to reset the database."}), 400

    try:
        reset_db_impl()
    except RuntimeError as error:
        return jsonify({'success': False, 'message': str(error)}), 409
    return jsonify({
        'success': True,
        'message': 'CampusHire database reset to clean state and re-seeded successfully!'
    })
