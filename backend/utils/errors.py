from mysql.connector import Error

def parse_mysql_error(err: Error):
    """
    Parses a MySQL error into user-friendly message, HTTP status code, and diagnostic info.
    Handles SQLSTATE 45000 / errno 1644 (SIGNAL from triggers/stored procedures)
    and errno 1062 (Duplicate entry).
    """
    msg = str(err.msg) if hasattr(err, 'msg') else str(err)
    status_code = 400
    errno = getattr(err, 'errno', None)
    sqlstate = getattr(err, 'sqlstate', None)

    # Stored procedure / Trigger business rule violation (SIGNAL SQLSTATE '45000')
    if errno == 1644 or sqlstate == '45000':
        status_code = 422  # Unprocessable Entity
        message = msg
    elif errno == 1062 or sqlstate == '23000':
        status_code = 409  # Conflict
        if 'uq_student_drive' in msg:
            message = 'Student has already applied to this placement drive (duplicate application prevented).'
        elif 'uq_drive_round' in msg:
            message = 'A round with this round number already exists for this drive.'
        elif 'uq_student_round' in msg:
            message = 'A result has already been recorded for this student in this round.'
        elif 'enrollment_no' in msg:
            message = 'Enrollment number is already registered in the system.'
        elif 'email' in msg:
            message = 'Email address is already in use by another user.'
        else:
            message = f"Duplicate record: {msg}"
    elif errno in (1451, 1452):
        status_code = 400
        message = f"Referential integrity constraint failed: {msg}"
    else:
        message = msg

    return {
        'message': message,
        'status_code': status_code,
        'code': errno,
        'sqlState': sqlstate,
        'raw': msg
    }
