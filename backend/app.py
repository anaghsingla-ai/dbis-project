import os
import sys
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import Config
from db import query, DatabaseException
from routes.auth_routes import auth_bp
from routes.admin_routes import admin_bp
from routes.student_routes import student_bp
from routes.hr_routes import hr_bp
from routes.coordinator_routes import coordinator_bp

app = Flask(__name__)
app.config.from_object(Config)

# Enable CORS for React frontend
CORS(
    app,
    resources={r"/api/*": {"origins": [Config.CLIENT_URL, "http://localhost:5173", "http://127.0.0.1:5173"]}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# Health Check Endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        rows = query("SELECT 1 AS connected, VERSION() AS version")
        return jsonify({
            'status': 'UP',
            'database': 'Connected to MySQL via mysql.connector',
            'version': rows[0]['version'] if rows else 'unknown',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'DOWN',
            'database': 'Database connection failed',
            'error': str(e)
        }), 500

# Register Blueprints
app.register_blueprint(auth_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(student_bp)
app.register_blueprint(hr_bp)
app.register_blueprint(coordinator_bp)

# Global Centralized Error Handling
@app.errorhandler(DatabaseException)
def handle_database_exception(err):
    return jsonify({
        'success': False,
        'message': str(err),
        'code': err.code,
        'sqlState': err.sqlstate
    }), err.status_code

@app.errorhandler(404)
def not_found(e):
    return jsonify({'success': False, 'message': 'API endpoint not found'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'success': False, 'message': 'Internal server error'}), 500

if __name__ == '__main__':
    print("=" * 65)
    print(f" CampusHire Python Flask REST API Server running on port {Config.PORT}")
    print(f" Database: MySQL 8.0 on {Config.DB_HOST}:{Config.DB_PORT} ({Config.DB_NAME})")
    print(f" Connectivity: mysql-connector-python with Connection Pooling")
    print(f" Frontend: React + Vite on {Config.CLIENT_URL}")
    print("=" * 65)
    app.run(host='0.0.0.0', port=Config.PORT, debug=Config.DEBUG)
