"""Thin application layer: every screen/button calls ONE stored procedure."""
import pymysql

def connect():
    return pymysql.connect(host="localhost", user="root", password="", database="CampusHire",
                           unix_socket="/run/mysqld/mysqld.sock",     # use host/port/password on your machine
                           autocommit=True, cursorclass=pymysql.cursors.DictCursor)

def call(proc, *args):
    """Run a procedure. Returns (True, rows) or (False, error message for the UI)."""
    con = connect()
    try:
        with con.cursor() as cur:
            cur.callproc(proc, args)
            return True, cur.fetchall()
    except pymysql.MySQLError as e:
        return False, e.args[1]            # e.g. 'T3 failed: CGPA below drive minimum'
    finally:
        con.close()

if __name__ == "__main__":
    print(call("sp_apply_to_drive", 1, 1))   # student 1 -> drive 1
    print(call("sp_apply_to_drive", 1, 1))   # duplicate
    print(call("sp_apply_to_drive", 5, 1))   # ineligible
    print(call("sp_respond_to_offer", 99, "Accepted"))
