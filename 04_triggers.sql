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
