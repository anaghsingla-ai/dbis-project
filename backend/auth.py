from functools import wraps
from datetime import datetime, timedelta, timezone
from flask import request, jsonify
import jwt
import bcrypt
from config import Config

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=10)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def check_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

def create_access_token(user_payload: dict) -> str:
    payload = user_payload.copy()
    payload['exp'] = datetime.now(timezone.utc) + timedelta(days=Config.JWT_EXPIRES_DAYS)
    payload['iat'] = datetime.now(timezone.utc)
    return jwt.encode(payload, Config.JWT_SECRET, algorithm='HS256')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
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

        return f(*args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(request, 'user') or not request.user:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 401

            user_role = request.user.get('role')
            if user_role not in allowed_roles:
                return jsonify({
                    'success': False,
                    'message': f"Access denied. Requires one of roles: [{', '.join(allowed_roles)}]"
                }), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator
