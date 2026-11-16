USE CampusHire;

-- Support table written ONLY by triggers (not part of the ER model; it is an audit trail)
DROP TABLE IF EXISTS Audit_Log;
CREATE TABLE Audit_Log (
  log_id     INT PRIMARY KEY AUTO_INCREMENT,
  table_name VARCHAR(30)  NOT NULL,
  record_id  INT          NOT NULL,
  field_name VARCHAR(30)  NOT NULL,
  old_value  VARCHAR(100),
  new_value  VARCHAR(100),
  changed_by VARCHAR(100),
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_student_bi;      DROP TRIGGER IF EXISTS trg_student_bu;
DROP TRIGGER IF EXISTS trg_student_ai;      DROP TRIGGER IF EXISTS trg_student_au;
DROP TRIGGER IF EXISTS trg_student_ad;      DROP TRIGGER IF EXISTS trg_student_bd;
DROP TRIGGER IF EXISTS trg_elig_bi;         DROP TRIGGER IF EXISTS trg_elig_bu;
DROP TRIGGER IF EXISTS trg_drive_bu;        DROP TRIGGER IF EXISTS trg_drive_bd;
DROP TRIGGER IF EXISTS trg_application_bi;  DROP TRIGGER IF EXISTS trg_application_bu;
DROP TRIGGER IF EXISTS trg_application_au;  DROP TRIGGER IF EXISTS trg_result_bi;
DROP TRIGGER IF EXISTS trg_result_ai;       DROP TRIGGER IF EXISTS trg_offer_bi;
DROP TRIGGER IF EXISTS trg_offer_bu;        DROP TRIGGER IF EXISTS trg_offer_au;
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
  IF NOT (OLD.cgpa <=> NEW.cgpa) THEN
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
  IF NEW.vacancies IS NOT NULL AND NOT (OLD.vacancies <=> NEW.vacancies) THEN
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
-- TR11 safety net: any INSERT into Application (even outside T3) must pass the eligibility rules
CREATE TRIGGER trg_application_bi BEFORE INSERT ON Application FOR EACH ROW
BEGIN
  DECLARE v_err VARCHAR(100);
  SET v_err = fn_eligibility_error(NEW.student_id, NEW.drive_id);
  IF v_err IS NOT NULL THEN
    SET v_err = CONCAT('TRG: ', v_err);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_err;
  END IF;
END$$

-- TR12 status can only move forward: a Rejected/Withdrawn application can never be re-opened
CREATE TRIGGER trg_application_bu BEFORE UPDATE ON Application FOR EACH ROW
BEGIN
  IF NOT (OLD.status <=> NEW.status) THEN
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
  IF NOT (OLD.status <=> NEW.status) THEN
    INSERT INTO Audit_Log(table_name, record_id, field_name, old_value, new_value, changed_by)
    VALUES ('Application', NEW.application_id, 'status', OLD.status, NEW.status, USER());
  END IF;
END$$

-- ===================== ROUND RESULT ==========================================
-- TR14 safety net: result only for an active application that passed the previous round
CREATE TRIGGER trg_result_bi BEFORE INSERT ON Round_Result FOR EACH ROW
BEGIN
  DECLARE v_err VARCHAR(100);
  SET v_err = fn_round_result_error(NEW.student_id, NEW.round_id);
  IF v_err IS NOT NULL THEN
    SET v_err = CONCAT('TRG: ', v_err);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_err;
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

-- ===================== OFFER =================================================
-- TR16 safety net: any INSERT into Offer (even outside T5) must satisfy the offer rules
CREATE TRIGGER trg_offer_bi BEFORE INSERT ON Offer FOR EACH ROW
BEGIN
  DECLARE v_err VARCHAR(100);
  SET v_err = fn_offer_error(NEW.student_id, NEW.drive_id);
  IF v_err IS NOT NULL THEN
    SET v_err = CONCAT('TRG: ', v_err);
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_err;
  END IF;
END$$

-- TR17 offer state machine: Pending -> Accepted/Declined only; never two Accepted per student
CREATE TRIGGER trg_offer_bu BEFORE UPDATE ON Offer FOR EACH ROW
BEGIN
  IF NOT (OLD.offer_status <=> NEW.offer_status) THEN
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
  IF NOT (OLD.offer_status <=> NEW.offer_status) THEN
    INSERT INTO Audit_Log(table_name, record_id, field_name, old_value, new_value, changed_by)
    VALUES ('Offer', NEW.offer_id, 'offer_status', OLD.offer_status, NEW.offer_status, USER());
  END IF;
END$$
DELIMITER ;
