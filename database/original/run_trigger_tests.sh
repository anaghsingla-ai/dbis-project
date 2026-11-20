#!/bin/bash
# Trigger tests: direct INSERT/UPDATE/DELETE (bypassing the stored procedures) to prove the triggers act as a safety net
q(){ echo; echo "mysql> $1"; mysql -t CampusHire -e "$1" 2>&1 | grep -v -e '^--------------' -e '^CALL ' -e '^SELECT ' -e '^INSERT ' -e '^UPDATE ' -e '^DELETE ' -e '^$' | sed 's/^ERROR [0-9]* (\(.*\)) at line [0-9]*: /ERROR (\1): /'; }
h(){ echo; echo "=== $1 ==="; }
for f in 01_schema 02_functions 03_transactions 04_triggers; do mysql < $f.sql; done; mysql < 05_sample_data.sql >/dev/null

h "TR1 + TR3: direct INSERT into Student (no dept_name given, no counter update by hand)"
q "INSERT INTO Student(enrollment_no,name,email,phone,dob,cgpa,dept_id) VALUES ('EN050','Neel Rao','neel@iiti.example','9100000050','2004-04-04',7.9,2);"
q "SELECT name, dept_id, dept_name FROM Student WHERE enrollment_no='EN050';"
q "SELECT dept_code,total_students FROM Department;"
h "TR2 + TR4: direct UPDATE of dept_id moves the head-count and refreshes dept_name"
q "UPDATE Student SET dept_id=3 WHERE enrollment_no='EN050';"
q "SELECT name, dept_id, dept_name FROM Student WHERE enrollment_no='EN050';"
q "SELECT dept_code,total_students FROM Department;"
h "TR5: direct DELETE of an unplaced student decrements the head-count"
q "DELETE FROM Student WHERE enrollment_no='EN050';"
q "SELECT dept_code,total_students FROM Department;"
h "TR4 (audit): CGPA change is logged with old and new value"
q "UPDATE Student SET cgpa=6.30 WHERE roll_no=5;"
q "SELECT table_name,record_id,field_name,old_value,new_value FROM Audit_Log;"

h "TR7 + TR8: eligibility value validation"
q "INSERT INTO Placement_Drive(company_id,job_title,package_offered,vacancies,drive_date) VALUES (1,'Direct Drive',500000,1,DATE_ADD(CURDATE(),INTERVAL 5 DAY));"
q "INSERT INTO Eligibility_Criteria(drive_id,min_cgpa) VALUES (4,11);"
q "INSERT INTO Eligibility_Criteria(drive_id,min_cgpa,min_12th_percentage) VALUES (4,7,120);"
q "UPDATE Eligibility_Criteria SET max_backlogs=-1 WHERE drive_id=1;"

h "TR11: direct INSERT into Application is checked (student 5 has CGPA 6.3, drive 1 needs 7.5)"
q "INSERT INTO Application(student_id,drive_id,application_date) VALUES (5,1,CURDATE());"

h "Setup through procedures: student 1 applies to drives 1 and 2, clears all rounds, gets two offers"
mysql CampusHire >/dev/null 2>&1 <<'SQL'
CALL sp_apply_to_drive(1,1); CALL sp_apply_to_drive(1,2);
CALL sp_record_round_result(1,1,'Pass',80,NULL); CALL sp_record_round_result(1,2,'Pass',80,NULL); CALL sp_record_round_result(1,3,'Pass',80,NULL);
CALL sp_record_round_result(1,4,'Pass',80,NULL); CALL sp_record_round_result(1,5,'Pass',80,NULL);
CALL sp_issue_offer(1,1); CALL sp_issue_offer(1,2);
SQL
q "SELECT offer_id,student_id,drive_id,offer_status FROM Offer;"

h "TR16: direct INSERT into Offer for a student who never applied"
q "INSERT INTO Offer(student_id,drive_id,package_offered,offer_date) VALUES (2,1,1200000,CURDATE());"
h "TR9: vacancies cannot be reduced below offers already issued"
q "UPDATE Placement_Drive SET vacancies=0 WHERE drive_id=1;"
h "TR17: offer state machine (offers written directly, bypassing T6)"
q "UPDATE Offer SET offer_status='Accepted' WHERE offer_id=1;"
q "UPDATE Offer SET offer_status='Accepted' WHERE offer_id=2;"
q "UPDATE Offer SET offer_status='Pending' WHERE offer_id=1;"
h "TR6 + TR10: placed student / drive with an accepted offer cannot be deleted"
q "DELETE FROM Student WHERE roll_no=1;"
q "DELETE FROM Placement_Drive WHERE drive_id=1;"

h "TR15 + TR12: a Fail result rejects the application automatically; a rejected application cannot be re-opened"
mysql CampusHire >/dev/null 2>&1 <<'SQL'
CALL sp_apply_to_drive(2,2); CALL sp_apply_to_drive(3,2);
SQL
q "INSERT INTO Round_Result(student_id,round_id,outcome) VALUES (2,4,'Fail');"
q "SELECT student_id,drive_id,status FROM Application WHERE student_id=2;"
q "UPDATE Application SET status='Applied' WHERE student_id=2 AND drive_id=2;"
h "TR14 + TR15: direct Round_Result is checked; a direct Pass shortlists automatically"
q "INSERT INTO Round_Result(student_id,round_id,outcome) VALUES (3,5,'Pass');"
q "INSERT INTO Round_Result(student_id,round_id,outcome) VALUES (3,4,'Pass');"
q "SELECT student_id,drive_id,status FROM Application WHERE student_id=3;"

h "TR13 + TR18: audit trail written by triggers"
q "SELECT log_id,table_name,record_id,field_name,old_value,new_value FROM Audit_Log ORDER BY log_id;"
