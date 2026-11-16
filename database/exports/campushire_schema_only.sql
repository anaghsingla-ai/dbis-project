-- CampusHire schema-only SQL export.
-- Source: the project's tracked 01_schema.sql, 03_transactions.sql, and 04_triggers.sql.
-- Adds the support-table definitions used by backend/scripts/init_db.py.
-- No application rows, sample accounts, credentials, server files, or private keys are included.
-- This is source-derived SQL, not a byte-for-byte export of the live MySQL data directory.
-- Run only on a fresh disposable MySQL database; see database/SETUP_AND_TESTING.md.

-- Create the schema only when it is absent. Never delete an existing database.
CREATE DATABASE IF NOT EXISTS CampusHire;
USE CampusHire;
SET SQL_SAFE_UPDATES = 0;

CREATE TABLE Department (
 dept_id INT PRIMARY KEY AUTO_INCREMENT,
 dept_name VARCHAR(100) NOT NULL UNIQUE,
 dept_code VARCHAR(20) NOT NULL UNIQUE,
 hod_name VARCHAR(100),
 total_students INT DEFAULT 0
);
CREATE TABLE Placement_Officer (
 officer_id INT PRIMARY KEY AUTO_INCREMENT,
 name VARCHAR(100) NOT NULL,
 designation VARCHAR(100),
 email VARCHAR(100) UNIQUE,
 phone VARCHAR(15)
);
CREATE TABLE Company (
 company_id INT PRIMARY KEY AUTO_INCREMENT,
 company_name VARCHAR(150) NOT NULL,
 industry_type VARCHAR(100),
 website VARCHAR(255),
 hr_contact_name VARCHAR(100),
 hr_contact_email VARCHAR(100),
 hr_contact_phone VARCHAR(15),
 address VARCHAR(255)
);
CREATE TABLE Student (
 roll_no INT PRIMARY KEY AUTO_INCREMENT,
 enrollment_no VARCHAR(20) NOT NULL UNIQUE,
 name VARCHAR(100) NOT NULL, email VARCHAR(100) NOT NULL UNIQUE,
 phone VARCHAR(15) NOT NULL,
 dob DATE NOT NULL,
 gender ENUM('Male', 'Female', 'Other'),
 address VARCHAR(255),
 dept_id INT,
 dept_name VARCHAR(100),
 current_year_sem VARCHAR(10),
 cgpa DECIMAL(4,2) NOT NULL CHECK (cgpa BETWEEN 0 AND 10),
 backlog_count INT DEFAULT 0,
 percentage_10th DECIMAL(5,2),
 percentage_12th DECIMAL(5,2),
 resume_link VARCHAR(255),
 CONSTRAINT fk_student_dept
 FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
 ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE TABLE Placement_Drive (
 drive_id INT PRIMARY KEY AUTO_INCREMENT,
 company_id INT NOT NULL,
 officer_id INT,
 job_title VARCHAR(150) NOT NULL,
 job_description TEXT,
 offer_type ENUM('Full-Time', 'Internship', 'Internship+FTE'),
 package_offered DECIMAL(10,2) NOT NULL,
 vacancies INT,
 mode ENUM('On-Campus', 'Off-Campus', 'Virtual'),
 drive_date DATE NOT NULL,
 CONSTRAINT fk_drive_company
 FOREIGN KEY (company_id) REFERENCES Company(company_id)
 ON UPDATE CASCADE ON DELETE RESTRICT,
 CONSTRAINT fk_drive_officer
 FOREIGN KEY (officer_id) REFERENCES Placement_Officer(officer_id)
 ON UPDATE CASCADE ON DELETE SET NULL
);
CREATE TABLE Eligibility_Criteria (
 eligibility_id INT PRIMARY KEY AUTO_INCREMENT,
 drive_id INT NOT NULL UNIQUE, min_cgpa DECIMAL(4,2),
 max_backlogs INT,
 eligible_departments VARCHAR(255),
 min_10th_percentage DECIMAL(5,2),
 min_12th_percentage DECIMAL(5,2),
 CONSTRAINT fk_eligibility_drive
 FOREIGN KEY (drive_id) REFERENCES Placement_Drive(drive_id)
 ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE TABLE Application (
 application_id INT PRIMARY KEY AUTO_INCREMENT,
 student_id INT NOT NULL,
 drive_id INT NOT NULL,
 application_date DATE NOT NULL,
 status ENUM('Applied', 'Shortlisted', 'Rejected', 'Withdrawn') DEFAULT 'Applied',
 CONSTRAINT fk_application_student
 FOREIGN KEY (student_id) REFERENCES Student(roll_no)
 ON UPDATE CASCADE ON DELETE CASCADE,
 CONSTRAINT fk_application_drive
 FOREIGN KEY (drive_id) REFERENCES Placement_Drive(drive_id)
 ON UPDATE CASCADE ON DELETE CASCADE,
 CONSTRAINT uq_student_drive UNIQUE (student_id, drive_id)
);
CREATE TABLE Selection_Round (
 round_id INT PRIMARY KEY AUTO_INCREMENT,
 drive_id INT NOT NULL,
 round_no INT NOT NULL,
 round_type ENUM('Aptitude Test', 'GD', 'Technical Interview', 'HR Interview'),
 round_date DATE,
 mode VARCHAR(50),
 venue VARCHAR(150),
 CONSTRAINT fk_round_drive
 FOREIGN KEY (drive_id) REFERENCES Placement_Drive(drive_id)
 ON UPDATE CASCADE ON DELETE CASCADE,
 CONSTRAINT uq_drive_round UNIQUE (drive_id, round_no)
);
CREATE TABLE Round_Result (
 result_id INT PRIMARY KEY AUTO_INCREMENT,
 student_id INT NOT NULL,
 round_id INT NOT NULL,
 outcome ENUM('Pass', 'Fail', 'On-Hold'),
 score DECIMAL(5,2),
 remarks VARCHAR(255),
 CONSTRAINT fk_result_student
 FOREIGN KEY (student_id) REFERENCES Student(roll_no)
 ON UPDATE CASCADE ON DELETE CASCADE,
 CONSTRAINT fk_result_round
 FOREIGN KEY (round_id) REFERENCES Selection_Round(round_id)
 ON UPDATE CASCADE ON DELETE CASCADE,
 CONSTRAINT uq_student_round UNIQUE (student_id, round_id)
);
CREATE TABLE Offer (
 offer_id INT PRIMARY KEY AUTO_INCREMENT,
 student_id INT NOT NULL,
 drive_id INT NOT NULL,
 package_offered DECIMAL(10,2) NOT NULL,
 offer_date DATE NOT NULL,
 offer_status ENUM('Pending', 'Accepted', 'Declined') DEFAULT 'Pending',
 CONSTRAINT fk_offer_student
 FOREIGN KEY (student_id) REFERENCES Student(roll_no)
 ON UPDATE CASCADE ON DELETE CASCADE,
 CONSTRAINT fk_offer_drive
 FOREIGN KEY (drive_id) REFERENCES Placement_Drive(drive_id)
 ON UPDATE CASCADE ON DELETE CASCADE
);

-- Support tables must exist before the trigger script is installed.


-- Support tables required by the CampusHire backend and audit triggers.
CREATE TABLE Audit_Log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(30) NOT NULL,
    record_id INT NOT NULL,
    field_name VARCHAR(30) NOT NULL,
    old_value VARCHAR(100),
    new_value VARCHAR(100),
    changed_by VARCHAR(100),
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS User_Account (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('TPO_ADMIN', 'STUDENT', 'COMPANY_HR', 'DEPARTMENT_COORDINATOR') NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    student_id INT NULL,
    officer_id INT NULL,
    company_id INT NULL,
    dept_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_student FOREIGN KEY (student_id) REFERENCES Student(roll_no) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_user_officer FOREIGN KEY (officer_id) REFERENCES Placement_Officer(officer_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_user_company FOREIGN KEY (company_id) REFERENCES Company(company_id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_user_dept FOREIGN KEY (dept_id) REFERENCES Department(dept_id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Stored procedures.
-- CampusHire transactions: schema is unchanged.
-- START TRANSACTION groups changes; COMMIT saves them.
-- The EXIT HANDLER rolls back the whole operation if any statement/trigger fails.
-- RESIGNAL returns that error to the app. This is the same handler in each procedure.
-- Validation on application/offer INSERT lives in the BEFORE trigger, once.
USE CampusHire;
DROP PROCEDURE IF EXISTS sp_register_student;
DROP PROCEDURE IF EXISTS sp_create_drive;
DROP PROCEDURE IF EXISTS sp_apply_to_drive;
DROP PROCEDURE IF EXISTS sp_record_round_result;
DROP PROCEDURE IF EXISTS sp_issue_offer;
DROP PROCEDURE IF EXISTS sp_respond_to_offer;
DROP PROCEDURE IF EXISTS sp_withdraw_application;
DROP PROCEDURE IF EXISTS sp_update_academic_record;
DROP PROCEDURE IF EXISTS sp_transfer_student_dept;
DROP PROCEDURE IF EXISTS sp_placement_report;
DELIMITER $$

-- T1 ------------------------------------------------------------------
CREATE PROCEDURE sp_register_student(
  IN p_enrollment VARCHAR(20), IN p_name VARCHAR(100), IN p_email VARCHAR(100),
  IN p_phone VARCHAR(15), IN p_dob DATE, IN p_gender VARCHAR(10), IN p_address VARCHAR(255),
  IN p_dept_id INT, IN p_year_sem VARCHAR(10), IN p_cgpa DECIMAL(4,2), IN p_backlogs INT,
  IN p_10th DECIMAL(5,2), IN p_12th DECIMAL(5,2), IN p_resume VARCHAR(255))
BEGIN
  DECLARE v_dept_name VARCHAR(100) DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT dept_name INTO v_dept_name FROM Department WHERE dept_id = p_dept_id FOR UPDATE;
  IF v_dept_name IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T1 failed: department does not exist';
  END IF;

  INSERT INTO Student(enrollment_no, name, email, phone, dob, gender, address, dept_id,
                      dept_name, current_year_sem, cgpa, backlog_count,
                      percentage_10th, percentage_12th, resume_link)
  VALUES (p_enrollment, p_name, p_email, p_phone, p_dob, p_gender, p_address, p_dept_id,
          v_dept_name, p_year_sem, p_cgpa, COALESCE(p_backlogs,0), p_10th, p_12th, p_resume);

  SET @last_roll = LAST_INSERT_ID();   -- Department.total_students is updated by trigger trg_student_ai
  COMMIT;
  SELECT 'Student registered' AS result, @last_roll AS roll_no;
END$$

-- T2 ------------------------------------------------------------------
CREATE PROCEDURE sp_create_drive(
  IN p_company INT, IN p_officer INT, IN p_title VARCHAR(150), IN p_desc TEXT,
  IN p_offer_type VARCHAR(20), IN p_package DECIMAL(10,2), IN p_vacancies INT,
  IN p_mode VARCHAR(20), IN p_date DATE,
  IN p_min_cgpa DECIMAL(4,2), IN p_max_backlogs INT, IN p_depts VARCHAR(255),
  IN p_min10 DECIMAL(5,2), IN p_min12 DECIMAL(5,2))
BEGIN
  DECLARE v_drive INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  IF p_vacancies IS NULL OR p_vacancies <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T2 failed: vacancies must be positive';
  END IF;
  IF p_min_cgpa IS NOT NULL AND (p_min_cgpa < 0 OR p_min_cgpa > 10) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T2 failed: min_cgpa must be between 0 and 10';
  END IF;

  INSERT INTO Placement_Drive(company_id, officer_id, job_title, job_description, offer_type,
                              package_offered, vacancies, mode, drive_date)
  VALUES (p_company, p_officer, p_title, p_desc, p_offer_type, p_package, p_vacancies, p_mode, p_date);
  SET v_drive = LAST_INSERT_ID();

  INSERT INTO Eligibility_Criteria(drive_id, min_cgpa, max_backlogs, eligible_departments,
                                   min_10th_percentage, min_12th_percentage)
  VALUES (v_drive, p_min_cgpa, p_max_backlogs, p_depts, p_min10, p_min12);
  COMMIT;
  SELECT 'Drive created with eligibility criteria' AS result, v_drive AS drive_id;
END$$

-- T3 ------------------------------------------------------------------
CREATE PROCEDURE sp_apply_to_drive(IN p_roll INT, IN p_drive INT)
BEGIN
  DECLARE v_student INT DEFAULT NULL;
  DECLARE v_drive INT DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  -- Keep these rows stable until the application is saved (tutorial row locks).
  SELECT roll_no INTO v_student FROM Student WHERE roll_no = p_roll FOR UPDATE;
  SELECT drive_id INTO v_drive FROM Placement_Drive WHERE drive_id = p_drive FOR SHARE;

  -- BEFORE INSERT trigger TR11 checks eligibility and reports the reason if invalid.
  INSERT INTO Application(student_id, drive_id, application_date, status)
  VALUES (p_roll, p_drive, CURRENT_DATE, 'Applied');
  COMMIT;
  SELECT 'Application submitted' AS result;
END$$

-- T4 ------------------------------------------------------------------
CREATE PROCEDURE sp_record_round_result(
  IN p_roll INT, IN p_round INT, IN p_outcome VARCHAR(10), IN p_score DECIMAL(5,2), IN p_remarks VARCHAR(255))
BEGIN
  DECLARE v_drive INT DEFAULT NULL;
  DECLARE v_round_no INT DEFAULT NULL;
  DECLARE v_app INT DEFAULT NULL;
  DECLARE v_app_status VARCHAR(20);
  DECLARE v_previous_round INT DEFAULT NULL;
  DECLARE v_previous_outcome VARCHAR(10) DEFAULT NULL;
  DECLARE v_existing_outcome VARCHAR(10) DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT drive_id, round_no INTO v_drive, v_round_no
    FROM Selection_Round WHERE round_id = p_round FOR SHARE;
  IF v_drive IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T4 failed: round not found';
  END IF;
  SELECT application_id, status INTO v_app, v_app_status
    FROM Application WHERE student_id = p_roll AND drive_id = v_drive FOR UPDATE;
  IF v_app IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T4 failed: student has not applied to this drive';
  END IF;
  IF v_app_status NOT IN ('Applied', 'Shortlisted') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T4 failed: application is no longer active (rejected/withdrawn)';
  END IF;
  SELECT MAX(round_no) INTO v_previous_round
    FROM Selection_Round WHERE drive_id = v_drive AND round_no < v_round_no;
  IF v_previous_round IS NOT NULL THEN
    SELECT outcome INTO v_previous_outcome
      FROM Round_Result rr JOIN Selection_Round sr ON sr.round_id = rr.round_id
     WHERE rr.student_id = p_roll AND sr.drive_id = v_drive AND sr.round_no = v_previous_round;
    IF v_previous_outcome IS NULL OR v_previous_outcome <> 'Pass' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T4 failed: student has not passed the previous round';
    END IF;
  END IF;

  IF p_outcome IS NULL OR p_outcome NOT IN ('Pass', 'Fail', 'On-Hold') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T4 failed: invalid outcome; must be Pass, Fail, or On-Hold';
  END IF;

  -- Check if a result already exists for this student and round
  SELECT outcome INTO v_existing_outcome
    FROM Round_Result
   WHERE student_id = p_roll AND round_id = p_round
   FOR UPDATE;

  IF v_existing_outcome IS NOT NULL THEN
    IF v_existing_outcome <> 'On-Hold' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T4 failed: finalized round result (Pass/Fail) cannot be changed';
    END IF;

    -- Update existing On-Hold result to Pass, Fail, or updated On-Hold
    -- Application.status sync is handled by trigger trg_result_au
    UPDATE Round_Result
       SET outcome = p_outcome, score = p_score, remarks = p_remarks
     WHERE student_id = p_roll AND round_id = p_round;

    COMMIT;
    SELECT 'Round result updated' AS result, p_outcome AS outcome;
  ELSE
    -- Initial evaluation: INSERT new result row
    -- Application.status sync is handled by trigger trg_result_ai
    INSERT INTO Round_Result(student_id, round_id, outcome, score, remarks)
    VALUES (p_roll, p_round, p_outcome, p_score, p_remarks);

    COMMIT;
    SELECT 'Round result recorded' AS result, p_outcome AS outcome;
  END IF;
END$$

-- T5 ------------------------------------------------------------------
CREATE PROCEDURE sp_issue_offer(IN p_roll INT, IN p_drive INT)
BEGIN
  DECLARE v_pkg DECIMAL(10,2) DEFAULT NULL;
  DECLARE v_student INT DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  -- Only one offer allocation for this drive proceeds at a time.
  SELECT package_offered INTO v_pkg
    FROM Placement_Drive WHERE drive_id = p_drive FOR UPDATE;
  SELECT roll_no INTO v_student FROM Student WHERE roll_no = p_roll FOR UPDATE;

  -- BEFORE INSERT trigger TR16 checks shortlist, final round and vacancies.
  INSERT INTO Offer(student_id, drive_id, package_offered, offer_date, offer_status)
  VALUES (p_roll, p_drive, v_pkg, CURRENT_DATE, 'Pending');
  COMMIT;
  SELECT 'Offer issued' AS result, LAST_INSERT_ID() AS offer_id;
END$$

-- T6 ------------------------------------------------------------------
CREATE PROCEDURE sp_respond_to_offer(IN p_offer INT, IN p_decision VARCHAR(10))
BEGIN
  DECLARE v_student INT DEFAULT NULL; DECLARE v_drive INT; DECLARE v_status VARCHAR(20);
  DECLARE v_lock INT; DECLARE v_declined INT DEFAULT 0; DECLARE v_withdrawn INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  IF p_decision IS NULL OR p_decision NOT IN ('Accepted','Declined') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T6 failed: decision must be Accepted or Declined';
  END IF;
  SELECT student_id, drive_id, offer_status INTO v_student, v_drive, v_status
    FROM Offer WHERE offer_id = p_offer;
  IF v_student IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T6 failed: offer not found';
  END IF;
  -- Lock one student row so two responses by this student wait their turn.
  SELECT roll_no INTO v_lock FROM Student WHERE roll_no = v_student FOR UPDATE;
  SELECT offer_status INTO v_status FROM Offer WHERE offer_id = p_offer FOR UPDATE;
  IF v_status <> 'Pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T6 failed: offer has already been answered';
  END IF;

  IF p_decision = 'Declined' THEN
    UPDATE Offer SET offer_status = 'Declined' WHERE offer_id = p_offer;
    COMMIT;
    SELECT 'Offer declined' AS result;
  ELSE
    SELECT COUNT(*) INTO v_lock FROM Offer
     WHERE student_id = v_student AND offer_status = 'Accepted' FOR UPDATE;
    IF v_lock > 0 THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T6 failed: student has already accepted another offer';
    END IF;
    UPDATE Offer SET offer_status = 'Accepted' WHERE offer_id = p_offer;
    UPDATE Offer SET offer_status = 'Declined'
     WHERE student_id = v_student AND offer_id <> p_offer AND offer_status = 'Pending';
    SET v_declined = ROW_COUNT();
    UPDATE Application SET status = 'Withdrawn'
     WHERE student_id = v_student AND drive_id <> v_drive AND status IN ('Applied','Shortlisted');
    SET v_withdrawn = ROW_COUNT();
    COMMIT;
    SELECT 'Offer accepted' AS result, v_declined AS other_offers_declined,
           v_withdrawn AS other_applications_withdrawn;
  END IF;
END$$

-- T7 ------------------------------------------------------------------
CREATE PROCEDURE sp_withdraw_application(IN p_roll INT, IN p_drive INT)
BEGIN
  DECLARE v_app INT DEFAULT NULL; DECLARE v_status VARCHAR(20);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT application_id, status INTO v_app, v_status FROM Application
   WHERE student_id = p_roll AND drive_id = p_drive FOR UPDATE;
  IF v_app IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T7 failed: application not found';
  END IF;
  IF v_status NOT IN ('Applied','Shortlisted') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T7 failed: application is already closed';
  END IF;
  IF EXISTS (SELECT 1 FROM Offer WHERE student_id = p_roll AND drive_id = p_drive
                AND offer_status = 'Accepted') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T7 failed: offer already accepted, cannot withdraw';
  END IF;
  UPDATE Application SET status = 'Withdrawn' WHERE application_id = v_app;
  UPDATE Offer SET offer_status = 'Declined'
   WHERE student_id = p_roll AND drive_id = p_drive AND offer_status = 'Pending';
  COMMIT;
  SELECT 'Application withdrawn (pending offer, if any, declined)' AS result;
END$$

-- T8 ------------------------------------------------------------------
CREATE PROCEDURE sp_update_academic_record(IN p_roll INT, IN p_cgpa DECIMAL(4,2), IN p_backlogs INT)
BEGIN
  DECLARE v_exists INT DEFAULT NULL; DECLARE v_rejected INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT roll_no INTO v_exists FROM Student WHERE roll_no = p_roll FOR UPDATE;
  IF v_exists IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T8 failed: student not found';
  END IF;
  UPDATE Student SET cgpa = p_cgpa, backlog_count = p_backlogs WHERE roll_no = p_roll;

  -- re-validate applications that have not yet entered any selection round
  UPDATE Application a
    JOIN Eligibility_Criteria e ON e.drive_id = a.drive_id
     SET a.status = 'Rejected'
   WHERE a.student_id = p_roll AND a.status = 'Applied'
     AND ((e.min_cgpa IS NOT NULL AND p_cgpa < e.min_cgpa)
       OR (e.max_backlogs IS NOT NULL AND p_backlogs > e.max_backlogs));
  SET v_rejected = ROW_COUNT();
  COMMIT;
  SELECT 'Academic record updated' AS result, v_rejected AS applications_auto_rejected;
END$$

-- T9 ------------------------------------------------------------------
CREATE PROCEDURE sp_transfer_student_dept(IN p_roll INT, IN p_new_dept INT)
BEGIN
  DECLARE v_old INT DEFAULT NULL; DECLARE v_new_name VARCHAR(100) DEFAULT NULL; DECLARE v_lock INT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;
  SELECT dept_id INTO v_old FROM Student WHERE roll_no = p_roll FOR UPDATE;
  IF v_old IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T9 failed: student not found or has no department';
  END IF;
  IF v_old = p_new_dept THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T9 failed: student is already in this department';
  END IF;
  -- lock both departments in a fixed (ascending id) order to avoid deadlocks
  SELECT dept_id INTO v_lock FROM Department
   WHERE dept_id = LEAST(v_old, p_new_dept) FOR UPDATE;
  SELECT dept_id INTO v_lock FROM Department
   WHERE dept_id = GREATEST(v_old, p_new_dept) FOR UPDATE;
  SELECT dept_name INTO v_new_name FROM Department WHERE dept_id = p_new_dept;
  IF v_new_name IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T9 failed: target department does not exist';
  END IF;
  -- dept_name and both head-counts are fixed by triggers trg_student_bu / trg_student_au
  UPDATE Student SET dept_id = p_new_dept WHERE roll_no = p_roll;
  COMMIT;
  SELECT 'Student transferred' AS result, v_new_name AS new_department;
END$$

-- T10 -----------------------------------------------------------------
CREATE PROCEDURE sp_placement_report()
BEGIN
  START TRANSACTION;

  SELECT COUNT(DISTINCT student_id) AS students_placed,
         ROUND(AVG(package_offered),2) AS avg_package,
         MAX(package_offered) AS highest_package,
         MIN(package_offered) AS lowest_package
    FROM Offer WHERE offer_status = 'Accepted';

  SELECT c.company_name, COUNT(*) AS students_placed, ROUND(AVG(o.package_offered),2) AS avg_package
    FROM Offer o JOIN Placement_Drive d ON d.drive_id = o.drive_id
                 JOIN Company c ON c.company_id = d.company_id
   WHERE o.offer_status = 'Accepted'
   GROUP BY c.company_id, c.company_name ORDER BY students_placed DESC;

  SELECT dp.dept_name, dp.total_students,
         COUNT(DISTINCT o.student_id) AS placed,
         ROUND(100 * COUNT(DISTINCT o.student_id) / NULLIF(dp.total_students,0), 1) AS placement_pct
    FROM Department dp
    LEFT JOIN Student s ON s.dept_id = dp.dept_id
    LEFT JOIN Offer o ON o.student_id = s.roll_no AND o.offer_status = 'Accepted'
   GROUP BY dp.dept_id, dp.dept_name, dp.total_students ORDER BY dp.dept_name;

  COMMIT;
END$$
DELIMITER ;

-- Triggers.
-- CampusHire triggers: no table definitions are changed here.
-- BEFORE: check NEW values or fill a value before saving.
-- AFTER: update a related table or record a change after saving.
-- OLD is the previous row; NEW is the incoming row. SIGNAL rejects a change.
-- TR11 owns application eligibility; TR16 owns new-offer validation.
-- COALESCE(value, replacement) supplies a value when NULL.
-- <=> compares two values including NULL; NOT (OLD.x <=> NEW.x) means x changed.
-- Examples to explain first: TR1, TR3, TR5, TR7, TR12, TR15.
USE CampusHire;

-- Uses the existing Audit_Log support table; this script changes only triggers.
DROP TRIGGER IF EXISTS trg_student_bi;
DROP TRIGGER IF EXISTS trg_student_bu;
DROP TRIGGER IF EXISTS trg_student_ai;
DROP TRIGGER IF EXISTS trg_student_au;
DROP TRIGGER IF EXISTS trg_student_ad;
DROP TRIGGER IF EXISTS trg_student_bd;
DROP TRIGGER IF EXISTS trg_elig_bi;
DROP TRIGGER IF EXISTS trg_elig_bu;
DROP TRIGGER IF EXISTS trg_drive_bu;
DROP TRIGGER IF EXISTS trg_drive_bd;
DROP TRIGGER IF EXISTS trg_application_bi;
DROP TRIGGER IF EXISTS trg_application_bu;
DROP TRIGGER IF EXISTS trg_application_au;
DROP TRIGGER IF EXISTS trg_result_bi;
DROP TRIGGER IF EXISTS trg_result_ai;
DROP TRIGGER IF EXISTS trg_result_bu;
DROP TRIGGER IF EXISTS trg_result_au;
DROP TRIGGER IF EXISTS trg_offer_bi;
DROP TRIGGER IF EXISTS trg_offer_bu;
DROP TRIGGER IF EXISTS trg_offer_au;
DELIMITER $$

-- ===================== STUDENT / DEPARTMENT ==================================
-- TR1  keep the redundant Student.dept_name equal to Department.dept_name
CREATE TRIGGER trg_student_bi BEFORE INSERT ON Student FOR EACH ROW
BEGIN
  SET NEW.dept_name = (SELECT dept_name FROM Department WHERE dept_id = NEW.dept_id);
END$$

-- TR2  same on update (e.g. when dept_id changes)
CREATE TRIGGER trg_student_bu BEFORE UPDATE ON Student FOR EACH ROW
BEGIN
  SET NEW.dept_name = (SELECT dept_name FROM Department WHERE dept_id = NEW.dept_id);
END$$

-- TR3  Department.total_students +1 when a student is added
CREATE TRIGGER trg_student_ai AFTER INSERT ON Student FOR EACH ROW
BEGIN
  IF NEW.dept_id IS NOT NULL THEN
    UPDATE Department SET total_students = total_students + 1 WHERE dept_id = NEW.dept_id;
  END IF;
END$$

-- TR4  move head-count when dept changes + audit CGPA / backlog changes (data-silo problem)
CREATE TRIGGER trg_student_au AFTER UPDATE ON Student FOR EACH ROW
BEGIN
  IF NOT (OLD.dept_id <=> NEW.dept_id) THEN
    IF OLD.dept_id IS NOT NULL THEN
      UPDATE Department SET total_students = total_students - 1 WHERE dept_id = OLD.dept_id;
    END IF;
    IF NEW.dept_id IS NOT NULL THEN
      UPDATE Department SET total_students = total_students + 1 WHERE dept_id = NEW.dept_id;
    END IF;
  END IF;
  IF OLD.cgpa <> NEW.cgpa THEN
    INSERT INTO Audit_Log(table_name, record_id, field_name, old_value, new_value, changed_by)
    VALUES ('Student', NEW.roll_no, 'cgpa', OLD.cgpa, NEW.cgpa, USER());
  END IF;
  IF NOT (OLD.backlog_count <=> NEW.backlog_count) THEN
    INSERT INTO Audit_Log(table_name, record_id, field_name, old_value, new_value, changed_by)
    VALUES ('Student', NEW.roll_no, 'backlog_count', OLD.backlog_count, NEW.backlog_count, USER());
  END IF;
END$$

-- TR5  Department.total_students -1 when a student is deleted
CREATE TRIGGER trg_student_ad AFTER DELETE ON Student FOR EACH ROW
BEGIN
  IF OLD.dept_id IS NOT NULL THEN
    UPDATE Department SET total_students = total_students - 1 WHERE dept_id = OLD.dept_id;
  END IF;
END$$

-- TR6  a placed student (Accepted offer) must not be deleted: it would wipe placement statistics
CREATE TRIGGER trg_student_bd BEFORE DELETE ON Student FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM Offer WHERE student_id = OLD.roll_no AND offer_status = 'Accepted') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: cannot delete a placed student (accepted offer exists)';
  END IF;
END$$

-- ===================== ELIGIBILITY / DRIVE ===================================
-- TR7  validate eligibility values on insert
CREATE TRIGGER trg_elig_bi BEFORE INSERT ON Eligibility_Criteria FOR EACH ROW
BEGIN
  IF NEW.min_cgpa < 0 OR NEW.min_cgpa > 10 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: min_cgpa must be between 0 and 10';
  END IF;
  IF NEW.max_backlogs < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: max_backlogs cannot be negative';
  END IF;
  IF NEW.min_10th_percentage NOT BETWEEN 0 AND 100 OR NEW.min_12th_percentage NOT BETWEEN 0 AND 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: minimum percentages must be between 0 and 100';
  END IF;
END$$

-- TR8  same validation on update
CREATE TRIGGER trg_elig_bu BEFORE UPDATE ON Eligibility_Criteria FOR EACH ROW
BEGIN
  IF NEW.min_cgpa < 0 OR NEW.min_cgpa > 10 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: min_cgpa must be between 0 and 10';
  END IF;
  IF NEW.max_backlogs < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: max_backlogs cannot be negative';
  END IF;
  IF NEW.min_10th_percentage NOT BETWEEN 0 AND 100 OR NEW.min_12th_percentage NOT BETWEEN 0 AND 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: minimum percentages must be between 0 and 100';
  END IF;
END$$

-- TR9  vacancies cannot be cut below the offers already issued
CREATE TRIGGER trg_drive_bu BEFORE UPDATE ON Placement_Drive FOR EACH ROW
BEGIN
  DECLARE v_used INT;
  IF NEW.vacancies IS NOT NULL AND (OLD.vacancies IS NULL OR OLD.vacancies <> NEW.vacancies) THEN
    SELECT COUNT(*) INTO v_used FROM Offer
     WHERE drive_id = OLD.drive_id AND offer_status IN ('Pending','Accepted');
    IF NEW.vacancies < v_used THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: vacancies cannot be less than offers already issued';
    END IF;
  END IF;
END$$

-- TR10 a drive with accepted offers must not be deleted (FK CASCADE would delete the offers)
CREATE TRIGGER trg_drive_bd BEFORE DELETE ON Placement_Drive FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM Offer WHERE drive_id = OLD.drive_id AND offer_status = 'Accepted') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: cannot delete a drive that has accepted offers';
  END IF;
END$$

-- ===================== APPLICATION ===========================================
-- TR11: the same basic eligibility checks protect direct INSERT statements too
CREATE TRIGGER trg_application_bi BEFORE INSERT ON Application FOR EACH ROW
BEGIN
  DECLARE v_cgpa DECIMAL(4,2) DEFAULT NULL;
  DECLARE v_backlogs INT;
  DECLARE v_p10 DECIMAL(5,2);
  DECLARE v_p12 DECIMAL(5,2);
  DECLARE v_dept_code VARCHAR(20);
  DECLARE v_drive_date DATE DEFAULT NULL;
  DECLARE v_min_cgpa DECIMAL(4,2);
  DECLARE v_max_backlogs INT;
  DECLARE v_eligible_depts VARCHAR(255);
  DECLARE v_min10 DECIMAL(5,2);
  DECLARE v_min12 DECIMAL(5,2);

  SELECT s.cgpa, s.backlog_count, s.percentage_10th, s.percentage_12th, d.dept_code
    INTO v_cgpa, v_backlogs, v_p10, v_p12, v_dept_code
    FROM Student s LEFT JOIN Department d ON d.dept_id = s.dept_id
   WHERE s.roll_no = NEW.student_id;
  IF v_cgpa IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student not found';
  END IF;
  SELECT drive_date INTO v_drive_date FROM Placement_Drive WHERE drive_id = NEW.drive_id;
  IF v_drive_date IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Drive not found';
  END IF;
  IF v_drive_date < CURRENT_DATE THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Applications for this drive are closed';
  END IF;
  IF EXISTS (SELECT 1 FROM Offer WHERE student_id = NEW.student_id AND offer_status = 'Accepted') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student already has an accepted offer';
  END IF;

  SELECT min_cgpa, max_backlogs, eligible_departments, min_10th_percentage, min_12th_percentage
    INTO v_min_cgpa, v_max_backlogs, v_eligible_depts, v_min10, v_min12
    FROM Eligibility_Criteria WHERE drive_id = NEW.drive_id;
  IF v_min_cgpa IS NOT NULL AND v_cgpa < v_min_cgpa THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'CGPA below drive minimum';
  END IF;
  IF v_max_backlogs IS NOT NULL AND v_backlogs > v_max_backlogs THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Too many backlogs for this drive';
  END IF;
  IF v_min10 IS NOT NULL AND COALESCE(v_p10, 0) < v_min10 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '10th percentage below minimum';
  END IF;
  IF v_min12 IS NOT NULL AND COALESCE(v_p12, 0) < v_min12 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '12th percentage below minimum';
  END IF;
  IF v_eligible_depts IS NOT NULL AND UPPER(v_eligible_depts) <> 'ALL'
     AND FIND_IN_SET(v_dept_code, REPLACE(v_eligible_depts, ' ', '')) = 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Department not eligible for this drive';
  END IF;
END$$

-- TR12 status can only move forward: a Rejected/Withdrawn application can never be re-opened
CREATE TRIGGER trg_application_bu BEFORE UPDATE ON Application FOR EACH ROW
BEGIN
  IF COALESCE(OLD.status, '') <> COALESCE(NEW.status, '') THEN
    IF OLD.status IN ('Rejected','Withdrawn') THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: a closed application (Rejected/Withdrawn) cannot be re-opened';
    END IF;
    IF OLD.status = 'Shortlisted' AND NEW.status = 'Applied' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: a shortlisted application cannot go back to Applied';
    END IF;
  END IF;
END$$

-- TR13 audit every status change
CREATE TRIGGER trg_application_au AFTER UPDATE ON Application FOR EACH ROW
BEGIN
  IF COALESCE(OLD.status, '') <> COALESCE(NEW.status, '') THEN
    INSERT INTO Audit_Log(table_name, record_id, field_name, old_value, new_value, changed_by)
    VALUES ('Application', NEW.application_id, 'status', OLD.status, NEW.status, USER());
  END IF;
END$$

-- ===================== ROUND RESULT ==========================================
-- TR14: only an active applicant who passed the previous round can be evaluated
CREATE TRIGGER trg_result_bi BEFORE INSERT ON Round_Result FOR EACH ROW
BEGIN
  DECLARE v_drive INT DEFAULT NULL;
  DECLARE v_round_no INT DEFAULT NULL;
  DECLARE v_application_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_previous_round INT DEFAULT NULL;
  DECLARE v_previous_outcome VARCHAR(10) DEFAULT NULL;

  SELECT drive_id, round_no INTO v_drive, v_round_no
    FROM Selection_Round WHERE round_id = NEW.round_id;
  IF v_drive IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Round not found';
  END IF;
  SELECT status INTO v_application_status FROM Application
   WHERE student_id = NEW.student_id AND drive_id = v_drive;
  IF v_application_status IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student has not applied to this drive';
  END IF;
  IF v_application_status NOT IN ('Applied', 'Shortlisted') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application is no longer active';
  END IF;
  SELECT MAX(round_no) INTO v_previous_round FROM Selection_Round
   WHERE drive_id = v_drive AND round_no < v_round_no;
  IF v_previous_round IS NOT NULL THEN
    SELECT rr.outcome INTO v_previous_outcome
      FROM Round_Result rr JOIN Selection_Round sr ON sr.round_id = rr.round_id
     WHERE rr.student_id = NEW.student_id AND sr.drive_id = v_drive
       AND sr.round_no = v_previous_round;
    IF v_previous_outcome IS NULL OR v_previous_outcome <> 'Pass' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student has not passed the previous round';
    END IF;
  END IF;
END$$

-- TR15 automatic status sync: Pass -> Shortlisted, Fail -> Rejected (On-Hold: no change)
CREATE TRIGGER trg_result_ai AFTER INSERT ON Round_Result FOR EACH ROW
BEGIN
  DECLARE v_drive INT;
  SELECT drive_id INTO v_drive FROM Selection_Round WHERE round_id = NEW.round_id;
  IF NEW.outcome = 'Fail' THEN
    UPDATE Application SET status = 'Rejected'
     WHERE student_id = NEW.student_id AND drive_id = v_drive;
  ELSEIF NEW.outcome = 'Pass' THEN
    UPDATE Application SET status = 'Shortlisted'
     WHERE student_id = NEW.student_id AND drive_id = v_drive AND status IN ('Applied','Shortlisted');
  END IF;
END$$

-- TR14b guard on UPDATE: finalized results (Pass/Fail) cannot be altered; validate outcome enum
CREATE TRIGGER trg_result_bu BEFORE UPDATE ON Round_Result FOR EACH ROW
BEGIN
  IF OLD.outcome IN ('Pass', 'Fail') AND NEW.outcome <> OLD.outcome THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: finalized round result (Pass/Fail) cannot be changed';
  END IF;
  IF NEW.outcome IS NULL OR NEW.outcome NOT IN ('Pass', 'Fail', 'On-Hold') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: invalid outcome; must be Pass, Fail, or On-Hold';
  END IF;
END$$

-- TR15b automatic status sync on UPDATE: Pass -> Shortlisted, Fail -> Rejected (On-Hold: no change)
CREATE TRIGGER trg_result_au AFTER UPDATE ON Round_Result FOR EACH ROW
BEGIN
  DECLARE v_drive INT;
  SELECT drive_id INTO v_drive FROM Selection_Round WHERE round_id = NEW.round_id;
  IF NEW.outcome = 'Fail' THEN
    UPDATE Application SET status = 'Rejected'
     WHERE student_id = NEW.student_id AND drive_id = v_drive;
  ELSEIF NEW.outcome = 'Pass' THEN
    UPDATE Application SET status = 'Shortlisted'
     WHERE student_id = NEW.student_id AND drive_id = v_drive AND status IN ('Applied','Shortlisted');
  END IF;

  IF COALESCE(OLD.outcome, '') <> COALESCE(NEW.outcome, '') THEN
    INSERT INTO Audit_Log(table_name, record_id, field_name, old_value, new_value, changed_by)
    VALUES ('Round_Result', NEW.result_id, 'outcome', OLD.outcome, NEW.outcome, USER());
  END IF;
END$$

-- ===================== OFFER =================================================
-- TR16: validate a new offer with direct checks and simple IF statements
CREATE TRIGGER trg_offer_bi BEFORE INSERT ON Offer FOR EACH ROW
BEGIN
  DECLARE v_vacancies INT DEFAULT NULL;
  DECLARE v_drive INT DEFAULT NULL;
  DECLARE v_application_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_final_round INT DEFAULT NULL;
  DECLARE v_final_outcome VARCHAR(10) DEFAULT NULL;
  DECLARE v_used INT DEFAULT 0;

  SELECT drive_id, vacancies INTO v_drive, v_vacancies
    FROM Placement_Drive WHERE drive_id = NEW.drive_id;
  IF v_drive IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Drive not found';
  END IF;
  SELECT status INTO v_application_status FROM Application
   WHERE student_id = NEW.student_id AND drive_id = NEW.drive_id;
  IF v_application_status IS NULL OR v_application_status <> 'Shortlisted' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student is not a shortlisted candidate of this drive';
  END IF;
  SELECT round_id INTO v_final_round FROM Selection_Round
   WHERE drive_id = NEW.drive_id ORDER BY round_no DESC LIMIT 1;
  IF v_final_round IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Drive has no selection rounds';
  END IF;
  SELECT outcome INTO v_final_outcome FROM Round_Result
   WHERE student_id = NEW.student_id AND round_id = v_final_round;
  IF v_final_outcome IS NULL OR v_final_outcome <> 'Pass' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student has not passed the final round';
  END IF;
  IF EXISTS (SELECT 1 FROM Offer WHERE student_id = NEW.student_id AND drive_id = NEW.drive_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Offer already issued to this student for this drive';
  END IF;
  IF EXISTS (SELECT 1 FROM Offer WHERE student_id = NEW.student_id AND offer_status = 'Accepted') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student already has an accepted offer';
  END IF;
  IF v_vacancies IS NOT NULL THEN
    SELECT COUNT(*) INTO v_used FROM Offer
     WHERE drive_id = NEW.drive_id AND offer_status IN ('Pending', 'Accepted');
    IF v_used >= v_vacancies THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'All vacancies of this drive are filled';
    END IF;
  END IF;
END$$

-- TR17 offer state machine: Pending -> Accepted/Declined only; never two Accepted per student
CREATE TRIGGER trg_offer_bu BEFORE UPDATE ON Offer FOR EACH ROW
BEGIN
  IF COALESCE(OLD.offer_status, '') <> COALESCE(NEW.offer_status, '') THEN
    IF OLD.offer_status <> 'Pending' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: an answered offer (Accepted/Declined) cannot be changed';
    END IF;
    IF NEW.offer_status = 'Accepted' AND EXISTS
       (SELECT 1 FROM Offer WHERE student_id = NEW.student_id AND offer_status = 'Accepted'
           AND offer_id <> NEW.offer_id) THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: student already has another accepted offer';
    END IF;
  END IF;
END$$

-- TR18 audit every offer status change
CREATE TRIGGER trg_offer_au AFTER UPDATE ON Offer FOR EACH ROW
BEGIN
  IF COALESCE(OLD.offer_status, '') <> COALESCE(NEW.offer_status, '') THEN
    INSERT INTO Audit_Log(table_name, record_id, field_name, old_value, new_value, changed_by)
    VALUES ('Offer', NEW.offer_id, 'offer_status', OLD.offer_status, NEW.offer_status, USER());
  END IF;
END$$
DELIMITER ;
