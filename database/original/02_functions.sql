USE CampusHire;
DROP FUNCTION IF EXISTS fn_eligibility_error;
DROP FUNCTION IF EXISTS fn_round_result_error;
DROP FUNCTION IF EXISTS fn_offer_error;
DELIMITER $$

-- F1: can student p_roll apply to drive p_drive?  NULL = yes, otherwise the reason.
CREATE FUNCTION fn_eligibility_error(p_roll INT, p_drive INT) RETURNS VARCHAR(100)
READS SQL DATA
BEGIN
  DECLARE v_cgpa DECIMAL(4,2) DEFAULT NULL; DECLARE v_back INT; DECLARE v_p10 DECIMAL(5,2);
  DECLARE v_p12 DECIMAL(5,2); DECLARE v_dept INT; DECLARE v_code VARCHAR(20);
  DECLARE v_date DATE DEFAULT NULL; DECLARE v_elig INT DEFAULT NULL;
  DECLARE v_min_cgpa DECIMAL(4,2); DECLARE v_max_back INT; DECLARE v_depts VARCHAR(255);
  DECLARE v_min10 DECIMAL(5,2); DECLARE v_min12 DECIMAL(5,2);

  SELECT cgpa, backlog_count, percentage_10th, percentage_12th, dept_id
    INTO v_cgpa, v_back, v_p10, v_p12, v_dept FROM Student WHERE roll_no = p_roll;
  IF v_cgpa IS NULL THEN RETURN 'student not found'; END IF;
  SELECT dept_code INTO v_code FROM Department WHERE dept_id = v_dept;
  SELECT drive_date INTO v_date FROM Placement_Drive WHERE drive_id = p_drive;
  IF v_date IS NULL THEN RETURN 'drive not found'; END IF;
  IF v_date < CURDATE() THEN RETURN 'applications for this drive are closed'; END IF;
  IF EXISTS (SELECT 1 FROM Offer WHERE student_id = p_roll AND offer_status = 'Accepted') THEN
    RETURN 'student already has an accepted offer';
  END IF;

  SELECT eligibility_id, min_cgpa, max_backlogs, eligible_departments, min_10th_percentage, min_12th_percentage
    INTO v_elig, v_min_cgpa, v_max_back, v_depts, v_min10, v_min12
    FROM Eligibility_Criteria WHERE drive_id = p_drive;
  IF v_elig IS NOT NULL THEN
    IF v_min_cgpa IS NOT NULL AND v_cgpa < v_min_cgpa THEN RETURN 'CGPA below drive minimum'; END IF;
    IF v_max_back IS NOT NULL AND v_back > v_max_back THEN RETURN 'too many backlogs for this drive'; END IF;
    IF v_min10 IS NOT NULL AND IFNULL(v_p10,0) < v_min10 THEN RETURN '10th percentage below minimum'; END IF;
    IF v_min12 IS NOT NULL AND IFNULL(v_p12,0) < v_min12 THEN RETURN '12th percentage below minimum'; END IF;
    IF v_depts IS NOT NULL AND UPPER(v_depts) <> 'ALL'
       AND FIND_IN_SET(v_code, REPLACE(v_depts,' ','')) = 0 THEN
      RETURN 'department not eligible for this drive';
    END IF;
  END IF;
  RETURN NULL;
END$$

-- F2: may a result be recorded for student p_roll in round p_round?  NULL = yes.
CREATE FUNCTION fn_round_result_error(p_roll INT, p_round INT) RETURNS VARCHAR(100)
READS SQL DATA
BEGIN
  DECLARE v_drive INT DEFAULT NULL; DECLARE v_no INT; DECLARE v_app INT DEFAULT NULL;
  DECLARE v_status VARCHAR(20); DECLARE v_prev VARCHAR(10) DEFAULT NULL;

  SELECT drive_id, round_no INTO v_drive, v_no FROM Selection_Round WHERE round_id = p_round;
  IF v_drive IS NULL THEN RETURN 'round not found'; END IF;
  SELECT application_id, status INTO v_app, v_status FROM Application
   WHERE student_id = p_roll AND drive_id = v_drive;
  IF v_app IS NULL THEN RETURN 'student has not applied to this drive'; END IF;
  IF v_status NOT IN ('Applied','Shortlisted') THEN
    RETURN 'application is no longer active (rejected/withdrawn)';
  END IF;
  IF EXISTS (SELECT 1 FROM Selection_Round WHERE drive_id = v_drive AND round_no < v_no) THEN
    SELECT rr.outcome INTO v_prev
      FROM Round_Result rr JOIN Selection_Round sr ON sr.round_id = rr.round_id
     WHERE rr.student_id = p_roll AND sr.drive_id = v_drive
       AND sr.round_no = (SELECT MAX(round_no) FROM Selection_Round WHERE drive_id = v_drive AND round_no < v_no);
    IF v_prev IS NULL OR v_prev <> 'Pass' THEN RETURN 'student has not passed the previous round'; END IF;
  END IF;
  RETURN NULL;
END$$

-- F3: may an offer be issued to student p_roll for drive p_drive?  NULL = yes.
CREATE FUNCTION fn_offer_error(p_roll INT, p_drive INT) RETURNS VARCHAR(100)
READS SQL DATA
BEGIN
  DECLARE v_d INT DEFAULT NULL; DECLARE v_vac INT; DECLARE v_status VARCHAR(20) DEFAULT NULL;
  DECLARE v_final INT DEFAULT NULL; DECLARE v_out VARCHAR(10) DEFAULT NULL; DECLARE v_used INT;

  SELECT drive_id, vacancies INTO v_d, v_vac FROM Placement_Drive WHERE drive_id = p_drive;
  IF v_d IS NULL THEN RETURN 'drive not found'; END IF;
  SELECT status INTO v_status FROM Application WHERE student_id = p_roll AND drive_id = p_drive;
  IF v_status IS NULL OR v_status <> 'Shortlisted' THEN
    RETURN 'student is not a shortlisted candidate of this drive';
  END IF;
  SELECT round_id INTO v_final FROM Selection_Round WHERE drive_id = p_drive ORDER BY round_no DESC LIMIT 1;
  IF v_final IS NULL THEN RETURN 'drive has no selection rounds'; END IF;
  SELECT outcome INTO v_out FROM Round_Result WHERE student_id = p_roll AND round_id = v_final;
  IF v_out IS NULL OR v_out <> 'Pass' THEN RETURN 'student has not passed the final round'; END IF;
  IF EXISTS (SELECT 1 FROM Offer WHERE student_id = p_roll AND drive_id = p_drive) THEN
    RETURN 'offer already issued to this student for this drive';
  END IF;
  IF EXISTS (SELECT 1 FROM Offer WHERE student_id = p_roll AND offer_status = 'Accepted') THEN
    RETURN 'student already has an accepted offer';
  END IF;
  IF v_vac IS NOT NULL THEN
    SELECT COUNT(*) INTO v_used FROM Offer WHERE drive_id = p_drive AND offer_status IN ('Pending','Accepted');
    IF v_used >= v_vac THEN RETURN 'all vacancies of this drive are filled'; END IF;
  END IF;
  RETURN NULL;
END$$
DELIMITER ;
