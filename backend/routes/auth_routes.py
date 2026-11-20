from flask import Blueprint, request, jsonify
from db import query, execute
from auth import check_password, hash_password, create_access_token, token_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'success': False, 'message': 'Username and password are required.'}), 400

    users = query(
        "SELECT * FROM User_Account WHERE username = %s OR email = %s LIMIT 1",
        (username, username)
    )

    if not users:
        return jsonify({'success': False, 'message': 'Invalid credentials. User not found.'}), 401

    user = users[0]
    if not check_password(password, user['password_hash']):
        return jsonify({'success': False, 'message': 'Invalid username or password.'}), 401

    payload = {
        'user_id': user['user_id'],
        'username': user['username'],
        'email': user['email'],
        'role': user['role'],
        'full_name': user['full_name'],
        'student_id': user['student_id'],
        'officer_id': user['officer_id'],
        'company_id': user['company_id'],
        'dept_id': user['dept_id']
    }

    token = create_access_token(payload)

    return jsonify({
        'success': True,
        'message': 'Login successful',
        'token': token,
        'user': payload
    })

@auth_bp.route('/me', methods=['GET'])
@token_required
def get_me():
    user_id = request.user['user_id']
    users = query(
        """SELECT user_id, username, email, role, full_name, student_id, officer_id, company_id, dept_id, created_at
           FROM User_Account WHERE user_id = %s""",
        (user_id,)
    )

    if not users:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    user = users[0]
    extra_details = {}

    if user['role'] == 'STUDENT' and user.get('student_id'):
        students = query("SELECT * FROM Student WHERE roll_no = %s", (user['student_id'],))
        if students:
            extra_details['student'] = students[0]
    elif user['role'] == 'COMPANY_HR' and user.get('company_id'):
        companies = query("SELECT * FROM Company WHERE company_id = %s", (user['company_id'],))
        if companies:
            extra_details['company'] = companies[0]
    elif user['role'] == 'DEPARTMENT_COORDINATOR' and user.get('dept_id'):
        depts = query("SELECT * FROM Department WHERE dept_id = %s", (user['dept_id'],))
        if depts:
            extra_details['department'] = depts[0]
    elif user['role'] == 'TPO_ADMIN' and user.get('officer_id'):
        officers = query("SELECT * FROM Placement_Officer WHERE officer_id = %s", (user['officer_id'],))
        if officers:
            extra_details['officer'] = officers[0]

    merged_user = {**user, **extra_details}
    return jsonify({'success': True, 'user': merged_user})

@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    data = request.get_json() or {}
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    if not old_password or not new_password:
        return jsonify({'success': False, 'message': 'Old and new passwords are required.'}), 400

    user_id = request.user['user_id']
    users = query("SELECT * FROM User_Account WHERE user_id = %s", (user_id,))
    if not users:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    user = users[0]
    if not check_password(old_password, user['password_hash']):
        return jsonify({'success': False, 'message': 'Current password does not match.'}), 400

    new_hash = hash_password(new_password)
    execute("UPDATE User_Account SET password_hash = %s WHERE user_id = %s", (new_hash, user_id))

    return jsonify({'success': True, 'message': 'Password changed successfully.'})

@auth_bp.route('/demo-accounts', methods=['GET'])
def get_demo_accounts():
    accounts = [
        {'role': 'TPO_ADMIN', 'username': 'admin', 'description': 'TPO Administrative Head (Mrs. Kavita Joshi)', 'password': 'password123'},
        {'role': 'STUDENT', 'username': 'aarav', 'description': 'Aarav Sharma (CSE, CGPA 8.5, 0 backlogs - High achiever)', 'password': 'password123'},
        {'role': 'STUDENT', 'username': 'diya', 'description': 'Diya Verma (CSE, CGPA 7.2, 0 backlogs)', 'password': 'password123'},
        {'role': 'STUDENT', 'username': 'karan', 'description': 'Karan Patel (EE, CGPA 8.0, 1 backlog)', 'password': 'password123'},
        {'role': 'STUDENT', 'username': 'meera', 'description': 'Meera Nair (ME, CGPA 9.1, 0 backlogs)', 'password': 'password123'},
        {'role': 'STUDENT', 'username': 'rohan', 'description': 'Rohan Gupta (CSE, CGPA 6.1, 2 backlogs - Ineligible for high-cutoff drives)', 'password': 'password123'},
        {'role': 'COMPANY_HR', 'username': 'technova_hr', 'description': 'TechNova HR (IT / Software)', 'password': 'password123'},
        {'role': 'COMPANY_HR', 'username': 'dataworks_hr', 'description': 'DataWorks HR (Analytics)', 'password': 'password123'},
        {'role': 'DEPARTMENT_COORDINATOR', 'username': 'cse_coord', 'description': 'Computer Science Dept Coordinator (Dr. A. Rao)', 'password': 'password123'},
        {'role': 'DEPARTMENT_COORDINATOR', 'username': 'ee_coord', 'description': 'Electrical Engg Dept Coordinator (Dr. S. Mehta)', 'password': 'password123'}
    ]
    return jsonify({'success': True, 'accounts': accounts})
