-- CampusHire Anagh module: student triggers from original 04_triggers.sql
-- Requires full schema with Offer, and support table Audit_Log.
USE CampusHire;
DROP TRIGGER IF EXISTS trg_student_bi;
DROP TRIGGER IF EXISTS trg_student_bu;
DROP TRIGGER IF EXISTS trg_student_ai;
DROP TRIGGER IF EXISTS trg_student_au;
DROP TRIGGER IF EXISTS trg_student_ad;
DROP TRIGGER IF EXISTS trg_student_bd;
DELIMITER $$

-- TR1
CREATE TRIGGER trg_student_bi BEFORE INSERT ON Student FOR EACH ROW
BEGIN
  SET NEW.dept_name = (SELECT dept_name FROM Department WHERE dept_id = NEW.dept_id);
END$$

-- TR2
CREATE TRIGGER trg_student_bu BEFORE UPDATE ON Student FOR EACH ROW
BEGIN
  SET NEW.dept_name = (SELECT dept_name FROM Department WHERE dept_id = NEW.dept_id);
END$$

-- TR3
CREATE TRIGGER trg_student_ai AFTER INSERT ON Student FOR EACH ROW
BEGIN
  IF NEW.dept_id IS NOT NULL THEN
    UPDATE Department SET total_students = total_students + 1 WHERE dept_id = NEW.dept_id;
  END IF;
END$$

-- TR4
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

-- TR5
CREATE TRIGGER trg_student_ad AFTER DELETE ON Student FOR EACH ROW
BEGIN
  IF OLD.dept_id IS NOT NULL THEN
    UPDATE Department SET total_students = total_students - 1 WHERE dept_id = OLD.dept_id;
  END IF;
END$$

-- TR6
CREATE TRIGGER trg_student_bd BEFORE DELETE ON Student FOR EACH ROW
BEGIN
  IF EXISTS (SELECT 1 FROM Offer WHERE student_id = OLD.roll_no AND offer_status = 'Accepted') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'TRG: cannot delete a placed student (accepted offer exists)';
  END IF;
END$$
DELIMITER ;
