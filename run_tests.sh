#!/bin/bash
# usage: run_tests.sh  (prints a readable log)
q(){ echo; echo "mysql> $1"; mysql -t CampusHire -e "$1" 2>&1 | grep -v -e '^--------------' -e '^CALL ' -e '^SELECT ' -e '^$' | sed 's/^ERROR [0-9]* (\(.*\)) at line [0-9]*: /ERROR (\1): /'; }
h(){ echo; echo "=== $1 ==="; }
for f in 01_schema 02_functions 03_transactions 04_triggers; do mysql < $f.sql; done; mysql < 05_sample_data.sql >/dev/null

h "Initial state"
q "SELECT dept_code,total_students FROM Department;"

h "T1 sp_register_student : duplicate e-mail must roll back (counter unchanged)"
q "CALL sp_register_student('EN099','Fake Aarav','aarav@iiti.example','9100000099','2004-01-01','Male','X',1,'7-1',7.0,0,80,80,NULL);"
q "SELECT dept_code,total_students FROM Department WHERE dept_code='CSE';"
q "CALL sp_register_student('EN098','Ghost','g@iiti.example','9100000098','2004-01-01','Male','X',99,'7-1',7.0,0,80,80,NULL);"

h "T2 sp_create_drive : invalid criteria must leave NO half-created drive"
q "CALL sp_create_drive(1,1,'Bad Drive','x','Full-Time',500000,1,'On-Campus',DATE_ADD(CURDATE(),INTERVAL 5 DAY),11,0,'ALL',NULL,NULL);"
q "CALL sp_create_drive(1,1,'Bad Drive 2','x','Full-Time',500000,0,'On-Campus',DATE_ADD(CURDATE(),INTERVAL 5 DAY),7,0,'ALL',NULL,NULL);"
q "SELECT COUNT(*) AS drives, (SELECT COUNT(*) FROM Eligibility_Criteria) AS criteria FROM Placement_Drive;"

h "T3 sp_apply_to_drive"
q "CALL sp_apply_to_drive(1,1);"
q "CALL sp_apply_to_drive(1,1);"
q "CALL sp_apply_to_drive(2,1);"
q "CALL sp_apply_to_drive(3,1);"
q "CALL sp_apply_to_drive(4,1);"
q "CALL sp_apply_to_drive(5,2);"
q "CALL sp_apply_to_drive(1,2);"
q "CALL sp_apply_to_drive(2,2);"
q "CALL sp_apply_to_drive(3,2);"
q "CALL sp_apply_to_drive(3,3);"
q "CALL sp_apply_to_drive(4,3);"
q "SELECT application_id,student_id,drive_id,status FROM Application;"

h "T4 sp_record_round_result"
q "CALL sp_record_round_result(1,2,'Pass',80,'skipping round 1');"
q "CALL sp_record_round_result(1,1,'Pass',82,NULL);"
q "CALL sp_record_round_result(1,2,'Pass',77,NULL);"
q "CALL sp_record_round_result(1,3,'Pass',90,NULL);"
q "CALL sp_record_round_result(1,4,'Pass',70,NULL);"
q "CALL sp_record_round_result(1,5,'Pass',75,NULL);"
q "CALL sp_record_round_result(2,4,'Fail',35,NULL);"
q "CALL sp_record_round_result(2,5,'Pass',60,'Diya was rejected earlier');"
q "CALL sp_record_round_result(3,4,'Pass',72,NULL);"
q "CALL sp_record_round_result(3,5,'Pass',65,NULL);"
q "SELECT student_id,drive_id,status FROM Application ORDER BY drive_id,student_id;"

h "T5 sp_issue_offer"
q "CALL sp_issue_offer(1,1);"
q "CALL sp_issue_offer(1,1);"
q "CALL sp_issue_offer(1,2);"
q "CALL sp_issue_offer(3,2);"
q "CALL sp_issue_offer(2,2);"
q "CALL sp_issue_offer(4,3);"
q "SELECT offer_id,student_id,drive_id,package_offered,offer_status FROM Offer;"

h "T6 sp_respond_to_offer : accepting one offer auto-declines the rest"
q "CALL sp_respond_to_offer(1,'Accepted');"
q "CALL sp_respond_to_offer(2,'Accepted');"
q "SELECT offer_id,student_id,drive_id,offer_status FROM Offer;"
q "SELECT student_id,drive_id,status FROM Application WHERE student_id=1;"
q "CALL sp_apply_to_drive(1,3);"

h "T7 sp_withdraw_application"
q "CALL sp_withdraw_application(4,3);"
q "CALL sp_withdraw_application(4,3);"

h "T8 sp_update_academic_record : CGPA drop re-validates open applications"
q "CALL sp_apply_to_drive(3,3);"
q "SELECT student_id,drive_id,status FROM Application WHERE student_id=3;"
q "CALL sp_update_academic_record(3,5.5,1);"
q "SELECT student_id,drive_id,status FROM Application WHERE student_id=3;"

h "T9 sp_transfer_student_dept"
q "CALL sp_transfer_student_dept(5,3);"
q "SELECT dept_code,total_students FROM Department;"
q "SELECT roll_no,name,dept_id,dept_name FROM Student WHERE roll_no=5;"
q "CALL sp_transfer_student_dept(5,3);"

h "T10 sp_placement_report"
q "CALL sp_placement_report();"

h "Manual SAVEPOINT demo"
mysql -t CampusHire <<'SQL' 2>&1
START TRANSACTION;
UPDATE Student SET cgpa = 7.40 WHERE roll_no = 2;
SAVEPOINT after_diya;
UPDATE Student SET cgpa = 0.80 WHERE roll_no = 4;   -- typo by coordinator
SELECT roll_no, cgpa FROM Student WHERE roll_no IN (2,4);
ROLLBACK TO SAVEPOINT after_diya;
SELECT roll_no, cgpa FROM Student WHERE roll_no IN (2,4);
COMMIT;
SELECT roll_no, cgpa FROM Student WHERE roll_no IN (2,4);
SQL


M(){ mysql -N CampusHire -e "$1"; }
h "CONCURRENCY 1: last vacancy, two offers issued at the same instant"
mysql CampusHire >/dev/null <<'SQL'
CALL sp_register_student('EN006','Sara Khan','sara@iiti.example','9100000006','2004-02-02','Female','Indore',1,'7-1',8.2,0,88,86,NULL);
CALL sp_register_student('EN007','Tej Singh','tej@iiti.example','9100000007','2004-05-05','Male','Indore',1,'7-1',8.4,0,89,85,NULL);
CALL sp_create_drive(2,1,'Intern Data Eng','x','Internship',500000,1,'Virtual',DATE_ADD(CURDATE(),INTERVAL 9 DAY),6,0,'ALL',NULL,NULL);
SQL
SARA=$(M "SELECT roll_no FROM Student WHERE email='sara@iiti.example'"); TEJ=$(M "SELECT roll_no FROM Student WHERE email='tej@iiti.example'")
D=$(M "SELECT MAX(drive_id) FROM Placement_Drive"); M "INSERT INTO Selection_Round(drive_id,round_no,round_type) VALUES ($D,1,'Aptitude Test')"; R=$(M "SELECT MAX(round_id) FROM Selection_Round")
echo "(drive $D has vacancies = 1; Sara = roll $SARA, Tej = roll $TEJ; both are shortlisted after round $R)"
mysql CampusHire -e "CALL sp_apply_to_drive($SARA,$D); CALL sp_apply_to_drive($TEJ,$D); CALL sp_record_round_result($SARA,$R,'Pass',90,NULL); CALL sp_record_round_result($TEJ,$R,'Pass',91,NULL);" >/dev/null
( mysql CampusHire -e "CALL sp_issue_offer($SARA,$D);" 2>&1 | grep -v -e '^---' -e '^CALL' -e '^$' | sed 's/ at line 1//; s/^/[session A] /' ) &
( mysql CampusHire -e "CALL sp_issue_offer($TEJ,$D);" 2>&1 | grep -v -e '^---' -e '^CALL' -e '^$' | sed 's/ at line 1//; s/^/[session B] /' ) &
wait
q "SELECT offer_id,student_id,drive_id,offer_status FROM Offer WHERE drive_id=$D;"

h "CONCURRENCY 2: one student accepts two pending offers at the same instant"
mysql CampusHire >/dev/null <<'SQL'
CALL sp_create_drive(1,1,'SDE Intern','x','Internship',900000,2,'Virtual',DATE_ADD(CURDATE(),INTERVAL 8 DAY),6,0,'ALL',NULL,NULL);
CALL sp_create_drive(3,1,'Design Eng','x','Full-Time',700000,2,'Virtual',DATE_ADD(CURDATE(),INTERVAL 8 DAY),6,0,'ALL',NULL,NULL);
SQL
D2=$(M "SELECT MAX(drive_id) FROM Placement_Drive"); D1=$((D2-1))
M "INSERT INTO Selection_Round(drive_id,round_no,round_type) VALUES ($D1,1,'Aptitude Test'),($D2,1,'Aptitude Test')"
R2=$(M "SELECT MAX(round_id) FROM Selection_Round"); R1=$((R2-1))
mysql CampusHire -e "CALL sp_apply_to_drive($TEJ,$D1); CALL sp_apply_to_drive($TEJ,$D2); CALL sp_record_round_result($TEJ,$R1,'Pass',80,NULL); CALL sp_record_round_result($TEJ,$R2,'Pass',85,NULL); CALL sp_issue_offer($TEJ,$D1); CALL sp_issue_offer($TEJ,$D2);" >/dev/null
O1=$(M "SELECT offer_id FROM Offer WHERE student_id=$TEJ AND drive_id=$D1"); O2=$(M "SELECT offer_id FROM Offer WHERE student_id=$TEJ AND drive_id=$D2")
echo "(Tej holds two PENDING offers: offer $O1 and offer $O2)"
q "SELECT offer_id,student_id,drive_id,offer_status FROM Offer WHERE student_id=$TEJ;"
( mysql CampusHire -e "CALL sp_respond_to_offer($O1,'Accepted');" 2>&1 | grep -v -e '^---' -e '^CALL' -e '^$' | sed 's/ at line 1//; s/^/[session A] /' ) &
( mysql CampusHire -e "CALL sp_respond_to_offer($O2,'Accepted');" 2>&1 | grep -v -e '^---' -e '^CALL' -e '^$' | sed 's/ at line 1//; s/^/[session B] /' ) &
wait
q "SELECT offer_id,student_id,drive_id,offer_status FROM Offer WHERE student_id=$TEJ;"
q "SELECT COUNT(*) AS accepted_offers_for_tej FROM Offer WHERE student_id=$TEJ AND offer_status='Accepted';"

h "T3 closed drive (drive date in the past)"
mysql CampusHire -e "CALL sp_create_drive(1,1,'Old Drive','x','Full-Time',500000,1,'On-Campus',DATE_SUB(CURDATE(),INTERVAL 3 DAY),6,0,'ALL',NULL,NULL);" >/dev/null
q "CALL sp_apply_to_drive(4,$(M "SELECT MAX(drive_id) FROM Placement_Drive"));"
