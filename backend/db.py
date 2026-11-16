import mysql.connector
from mysql.connector import pooling, Error
from config import Config
from utils.errors import parse_mysql_error
from utils.serializer import serialize_data

# Create connection pool
db_pool = None

def init_pool():
    global db_pool
    if db_pool is None:
        db_pool = pooling.MySQLConnectionPool(
            pool_name="campushire_pool",
            pool_size=10,
            pool_reset_session=True,
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            autocommit=True
        )
    return db_pool

def get_connection():
    try:
        pool = init_pool()
        return pool.get_connection()
    except Exception:
        # Fallback to direct connection if pooling error occurs
        return mysql.connector.connect(
            host=Config.DB_HOST,
            port=Config.DB_PORT,
            user=Config.DB_USER,
            password=Config.DB_PASSWORD,
            database=Config.DB_NAME,
            autocommit=True
        )

class DatabaseException(Exception):
    def __init__(self, parsed_error):
        super().__init__(parsed_error['message'])
        self.status_code = parsed_error['status_code']
        self.code = parsed_error['code']
        self.sqlstate = parsed_error['sqlState']
        self.raw = parsed_error['raw']

def query(sql, params=None):
    """Executes a SELECT query and returns rows as list of dicts."""
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params or ())
        rows = cur.fetchall()
        cur.close()
        return serialize_data(rows)
    except Error as e:
        parsed = parse_mysql_error(e)
        raise DatabaseException(parsed)
    finally:
        conn.close()

def execute(sql, params=None):
    """Executes an INSERT, UPDATE, or DELETE statement."""
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.execute(sql, params or ())
        last_id = cur.lastrowid
        rowcount = cur.rowcount
        cur.close()
        return {'last_id': last_id, 'rowcount': rowcount}
    except Error as e:
        parsed = parse_mysql_error(e)
        raise DatabaseException(parsed)
    finally:
        conn.close()

def call_procedure(proc_name, params=None):
    """
    Executes CALL proc_name(...) using mysql.connector callproc.
    Extracts all stored results and returns them.
    """
    conn = get_connection()
    try:
        cur = conn.cursor(dictionary=True)
        cur.callproc(proc_name, params or ())
        
        result_sets = []
        for result in cur.stored_results():
            rows = result.fetchall()
            result_sets.append(serialize_data(rows))
        
        cur.close()

        if len(result_sets) == 1:
            return result_sets[0]
        elif len(result_sets) > 1:
            return result_sets
        return []
    except Error as e:
        parsed = parse_mysql_error(e)
        raise DatabaseException(parsed)
    finally:
        conn.close()
