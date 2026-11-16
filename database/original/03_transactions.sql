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
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT dept_name INTO v_dept_name FROM Department WHERE dept_id = p_dept_id FOR UPDATE;
  IF v_dept_name IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T1 failed: department does not exist';
  END IF;

  INSERT INTO Student(enrollment_no, name, email, phone, dob, gender, address, dept_id,
                      dept_name, current_year_sem, cgpa, backlog_count,
                      percentage_10th, percentage_12th, resume_link)
  VALUES (p_enrollment, p_name, p_email, p_phone, p_dob, p_gender, p_address, p_dept_id,
          v_dept_name, p_year_sem, p_cgpa, IFNULL(p_backlogs,0), p_10th, p_12th, p_resume);

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
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

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
  DECLARE v_lock INT DEFAULT NULL; DECLARE v_drive INT DEFAULT NULL; DECLARE v_err VARCHAR(100);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT roll_no INTO v_lock FROM Student WHERE roll_no = p_roll FOR UPDATE;      -- freeze student's marks
  IF v_lock IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T3 failed: student not found';
  END IF;
  SELECT drive_id INTO v_drive FROM Placement_Drive WHERE drive_id = p_drive LOCK IN SHARE MODE;
  IF v_drive IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T3 failed: drive not found';
  END IF;

  SET v_err = fn_eligibility_error(p_roll, p_drive);                              -- all rules in one function
  IF v_err IS NOT NULL THEN
    SET v_err = CONCAT('T3 failed: ', v_err);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_err;
  END IF;

  INSERT INTO Application(student_id, drive_id, application_date, status)
  VALUES (p_roll, p_drive, CURDATE(), 'Applied');
  COMMIT;
  SELECT 'Application submitted' AS result;
END$$

-- T4 ------------------------------------------------------------------
CREATE PROCEDURE sp_record_round_result(
  IN p_roll INT, IN p_round INT, IN p_outcome VARCHAR(10), IN p_score DECIMAL(5,2), IN p_remarks VARCHAR(255))
BEGIN
  DECLARE v_drive INT DEFAULT NULL; DECLARE v_app INT DEFAULT NULL; DECLARE v_err VARCHAR(100);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT drive_id INTO v_drive FROM Selection_Round WHERE round_id = p_round LOCK IN SHARE MODE;
  IF v_drive IS NOT NULL THEN
    SELECT application_id INTO v_app FROM Application
     WHERE student_id = p_roll AND drive_id = v_drive FOR UPDATE;               -- one result at a time
  END IF;

  SET v_err = fn_round_result_error(p_roll, p_round);
  IF v_err IS NOT NULL THEN
    SET v_err = CONCAT('T4 failed: ', v_err);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_err;
  END IF;

  -- Application.status (Pass -> Shortlisted, Fail -> Rejected) is synced by trigger trg_result_ai
  INSERT INTO Round_Result(student_id, round_id, outcome, score, remarks)
  VALUES (p_roll, p_round, p_outcome, p_score, p_remarks);
  COMMIT;
  SELECT 'Round result recorded' AS result, p_outcome AS outcome;
END$$

-- T5 ------------------------------------------------------------------
CREATE PROCEDURE sp_issue_offer(IN p_roll INT, IN p_drive INT)
BEGIN
  DECLARE v_pkg DECIMAL(10,2); DECLARE v_d INT DEFAULT NULL; DECLARE v_app INT DEFAULT NULL;
  DECLARE v_err VARCHAR(100);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  -- lock the drive row: concurrent offers for the same drive are serialised here
  SELECT drive_id, package_offered INTO v_d, v_pkg FROM Placement_Drive WHERE drive_id = p_drive FOR UPDATE;
  IF v_d IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T5 failed: drive not found';
  END IF;
  SELECT application_id INTO v_app FROM Application
   WHERE student_id = p_roll AND drive_id = p_drive FOR UPDATE;

  SET v_err = fn_offer_error(p_roll, p_drive);
  IF v_err IS NOT NULL THEN
    SET v_err = CONCAT('T5 failed: ', v_err);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_err;
  END IF;

  INSERT INTO Offer(student_id, drive_id, package_offered, offer_date, offer_status)
  VALUES (p_roll, p_drive, v_pkg, CURDATE(), 'Pending');
  COMMIT;
  SELECT 'Offer issued' AS result, LAST_INSERT_ID() AS offer_id;
END$$

-- T6 ------------------------------------------------------------------
CREATE PROCEDURE sp_respond_to_offer(IN p_offer INT, IN p_decision VARCHAR(10))
BEGIN
  DECLARE v_student INT DEFAULT NULL; DECLARE v_drive INT; DECLARE v_status VARCHAR(20);
  DECLARE v_lock INT; DECLARE v_declined INT DEFAULT 0; DECLARE v_withdrawn INT DEFAULT 0;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  IF p_decision NOT IN ('Accepted','Declined') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T6 failed: decision must be Accepted or Declined';
  END IF;
  SELECT student_id, drive_id, offer_status INTO v_student, v_drive, v_status
    FROM Offer WHERE offer_id = p_offer FOR UPDATE;
  IF v_student IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T6 failed: offer not found';
  END IF;
  -- lock ALL offers of this student so two concurrent accepts cannot both succeed
  SELECT COUNT(*) INTO v_lock FROM Offer WHERE student_id = v_student FOR UPDATE;
  SELECT offer_status INTO v_status FROM Offer WHERE offer_id = p_offer;
  IF v_status <> 'Pending' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T6 failed: offer has already been answered';
  END IF;

  IF p_decision = 'Declined' THEN
    UPDATE Offer SET offer_status = 'Declined' WHERE offer_id = p_offer;
    COMMIT;
    SELECT 'Offer declined' AS result;
  ELSE
    IF EXISTS (SELECT 1 FROM Offer WHERE student_id = v_student AND offer_status = 'Accepted') THEN
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
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

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
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

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
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  START TRANSACTION;
  SELECT dept_id INTO v_old FROM Student WHERE roll_no = p_roll FOR UPDATE;
  IF v_old IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T9 failed: student not found or has no department';
  END IF;
  IF v_old = p_new_dept THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'T9 failed: student is already in this department';
  END IF;
  -- lock both departments in a fixed (ascending id) order to avoid deadlocks
  SELECT COUNT(*) INTO v_lock FROM (
     SELECT dept_id FROM Department WHERE dept_id IN (v_old, p_new_dept) ORDER BY dept_id FOR UPDATE) t;
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
  START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY;

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
