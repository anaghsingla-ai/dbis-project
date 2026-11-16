-- CampusHire Anagh module: procedures copied from the submitted 03_transactions.sql
-- Requires the full CampusHire schema, including Application and Eligibility_Criteria.
USE CampusHire;
DROP PROCEDURE IF EXISTS sp_register_student;
DROP PROCEDURE IF EXISTS sp_update_academic_record;
DROP PROCEDURE IF EXISTS sp_transfer_student_dept;
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

  SET @last_roll = LAST_INSERT_ID();
  COMMIT;
  SELECT 'Student registered' AS result, @last_roll AS roll_no;
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
  SELECT dept_id INTO v_lock FROM Department
   WHERE dept_id = LEAST(v_old, p_new_dept) FOR UPDATE;
  SELECT dept_id INTO v_lock FROM Department
   WHERE dept_id = GREATEST(v_old, p_new_dept) FOR UPDATE;
  SELECT dept_name INTO v_new_name FROM Department WHERE dept_id = p_new_dept;
  IF v_new_name IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T9 failed: target department does not exist';
  END IF;
  UPDATE Student SET dept_id = p_new_dept WHERE roll_no = p_roll;
  COMMIT;
  SELECT 'Student transferred' AS result, v_new_name AS new_department;
END$$
DELIMITER ;
