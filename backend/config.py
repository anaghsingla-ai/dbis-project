import os
from dotenv import load_dotenv

# Load .env from backend folder or root
load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

class Config:
    PORT = int(os.getenv('PORT', 5000))
    DEBUG = os.getenv('FLASK_DEBUG', 'false').lower() == 'true'
    
    # MySQL Database Configuration
    DB_HOST = os.getenv('DB_HOST', '127.0.0.1')
    DB_PORT = int(os.getenv('DB_PORT', 3307))
    DB_USER = os.getenv('DB_USER', 'root')
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')
    DB_NAME = os.getenv('DB_NAME', 'CampusHire')
    
    # JWT Configuration
    JWT_SECRET = os.getenv('JWT_SECRET', 'campushire_iit_indore_jwt_super_secret_key_2026')
    JWT_EXPIRES_DAYS = int(os.getenv('JWT_EXPIRES_DAYS', 7))
    
    CLIENT_URL = os.getenv('CLIENT_URL', 'http://localhost:5173')
