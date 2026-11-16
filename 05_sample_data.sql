USE CampusHire;
INSERT INTO Department(dept_name,dept_code,hod_name) VALUES
 ('Computer Science and Engineering','CSE','Dr. A. Rao'),
 ('Electrical Engineering','EE','Dr. S. Mehta'),
 ('Mechanical Engineering','ME','Dr. P. Nair');
INSERT INTO Placement_Officer(name,designation,email,phone) VALUES
 ('Mrs. Kavita Joshi','Placement Officer','kavita@tpo.example','9000000001');
INSERT INTO Company(company_name,industry_type,website,hr_contact_name,hr_contact_email,hr_contact_phone,address) VALUES
 ('TechNova','IT','technova.example','R. Iyer','hr@technova.example','9000000011','Pune'),
 ('DataWorks','Analytics','dataworks.example','M. Shah','hr@dataworks.example','9000000012','Bengaluru'),
 ('CoreMech','Core Engineering','coremech.example','T. Das','hr@coremech.example','9000000013','Chennai');
-- students are registered through transaction T1
CALL sp_register_student('EN001','Aarav Sharma','aarav@iiti.example','9100000001','2004-03-11','Male','Indore',1,'7-1',8.50,0,90,88,'r/aarav');
CALL sp_register_student('EN002','Diya Verma','diya@iiti.example','9100000002','2004-07-21','Female','Bhopal',1,'7-1',7.20,0,85,80,'r/diya');
CALL sp_register_student('EN003','Karan Patel','karan@iiti.example','9100000003','2003-12-02','Male','Surat',2,'7-1',8.00,1,78,75,'r/karan');
CALL sp_register_student('EN004','Meera Nair','meera@iiti.example','9100000004','2004-01-15','Female','Kochi',3,'7-1',9.10,0,95,92,'r/meera');
CALL sp_register_student('EN005','Rohan Gupta','rohan@iiti.example','9100000005','2004-09-30','Male','Ujjain',1,'7-1',6.10,2,70,65,'r/rohan');
-- drives are created through transaction T2
CALL sp_create_drive(1,1,'Software Engineer','Backend role','Full-Time',1200000,1,'On-Campus',DATE_ADD(CURRENT_DATE,INTERVAL 10 DAY),7.5,0,'CSE,EE',60,60);
CALL sp_create_drive(2,1,'Data Analyst','Analytics role','Full-Time',800000,2,'Virtual',DATE_ADD(CURRENT_DATE,INTERVAL 12 DAY),6.5,1,'ALL',NULL,NULL);
CALL sp_create_drive(3,1,'Graduate Engineer Trainee','Plant role','Full-Time',600000,2,'On-Campus',DATE_ADD(CURRENT_DATE,INTERVAL 15 DAY),6.0,2,'ME,EE',NULL,NULL);
INSERT INTO Selection_Round(drive_id,round_no,round_type,round_date) VALUES
 (1,1,'Aptitude Test',CURRENT_DATE),(1,2,'Technical Interview',CURRENT_DATE),(1,3,'HR Interview',CURRENT_DATE),
 (2,1,'Aptitude Test',CURRENT_DATE),(2,2,'HR Interview',CURRENT_DATE),
 (3,1,'Aptitude Test',CURRENT_DATE);
