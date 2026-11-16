-- Run sections in order, using one MySQL Workbench connection.
-- These examples use existing records and end with ROLLBACK.
USE CampusHire;
SET @demo_student = (SELECT MIN(roll_no) FROM Student);
-- If Student is empty, register a student before running these examples.

-- 1. Like the tutorial salary rollback: change a value, inspect it, undo it.
SELECT roll_no, name, cgpa FROM Student WHERE roll_no = @demo_student;
START TRANSACTION;
UPDATE Student SET cgpa = 7.50 WHERE roll_no = @demo_student;
SELECT roll_no, name, cgpa FROM Student WHERE roll_no = @demo_student;
ROLLBACK;
SELECT roll_no, name, cgpa FROM Student WHERE roll_no = @demo_student;

-- 2. Savepoint: keep the first change temporarily, undo only the second.
START TRANSACTION;
UPDATE Student SET cgpa = 8.00 WHERE roll_no = @demo_student;
SAVEPOINT after_cgpa;
UPDATE Student SET phone = '9000000000' WHERE roll_no = @demo_student;
SELECT roll_no, cgpa, phone FROM Student WHERE roll_no = @demo_student;
ROLLBACK TO SAVEPOINT after_cgpa;
-- CGPA is still 8.00; phone is back to its original value.
SELECT roll_no, cgpa, phone FROM Student WHERE roll_no = @demo_student;
-- COMMIT here would save the CGPA. We restore it for a repeatable demo.
ROLLBACK;

-- 3. Trigger side effects belong to the same transaction.
START TRANSACTION;
SET @demo_dept = (SELECT dept_id FROM Student WHERE roll_no = @demo_student);
SET @other_dept = (SELECT MIN(dept_id) FROM Department WHERE dept_id <> @demo_dept);
SELECT dept_id, total_students FROM Department
 WHERE dept_id IN (@demo_dept, @other_dept);
-- If @other_dept is NULL, there is no second department: skip this UPDATE.
UPDATE Student SET dept_id = @other_dept
 WHERE roll_no = @demo_student AND @other_dept IS NOT NULL;
-- TR2 filled dept_name; TR4 moved one student between the counters.
SELECT dept_id, dept_name FROM Student WHERE roll_no = @demo_student;
SELECT dept_id, total_students FROM Department
 WHERE dept_id IN (@demo_dept, @other_dept);
ROLLBACK;
-- Student department and both counters have returned to their starting values.
SELECT dept_id, total_students FROM Department
 WHERE dept_id IN (@demo_dept, @other_dept);
