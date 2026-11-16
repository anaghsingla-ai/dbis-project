-- CampusHire: Anagh module (from supplied 01_schema.sql)
-- Run within CampusHire database before the student procedures/triggers.
CREATE DATABASE IF NOT EXISTS CampusHire;
USE CampusHire;

CREATE TABLE Department (
 dept_id INT PRIMARY KEY AUTO_INCREMENT,
 dept_name VARCHAR(100) NOT NULL UNIQUE,
 dept_code VARCHAR(20) NOT NULL UNIQUE,
 hod_name VARCHAR(100),
 total_students INT DEFAULT 0
);

CREATE TABLE Student (
 roll_no INT PRIMARY KEY AUTO_INCREMENT,
 enrollment_no VARCHAR(20) NOT NULL UNIQUE,
 name VARCHAR(100) NOT NULL,
 email VARCHAR(100) NOT NULL UNIQUE,
 phone VARCHAR(15) NOT NULL,
 dob DATE NOT NULL,
 gender ENUM('Male', 'Female', 'Other'),
 address VARCHAR(255),
 dept_id INT,
 dept_name VARCHAR(100),
 current_year_sem VARCHAR(10),
 cgpa DECIMAL(4,2) NOT NULL CHECK (cgpa BETWEEN 0 AND 10),
 backlog_count INT DEFAULT 0,
 percentage_10th DECIMAL(5,2),
 percentage_12th DECIMAL(5,2),
 resume_link VARCHAR(255),
 CONSTRAINT fk_student_dept FOREIGN KEY (dept_id)
 REFERENCES Department(dept_id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Required by student/application/offer audit triggers in 04_student_triggers.sql
CREATE TABLE IF NOT EXISTS Audit_Log (
 audit_id BIGINT PRIMARY KEY AUTO_INCREMENT,
 table_name VARCHAR(64) NOT NULL,
 record_id BIGINT NOT NULL,
 field_name VARCHAR(64) NOT NULL,
 old_value VARCHAR(255),
 new_value VARCHAR(255),
 changed_by VARCHAR(255) NOT NULL,
 changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
