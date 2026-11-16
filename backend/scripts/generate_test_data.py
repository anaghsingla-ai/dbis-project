"""Generate realistic CampusHire data in a new, isolated database.

The requested database must not already exist. This script never resets or
overwrites an existing database. It uses a fixed random seed for reproducibility.
"""

import os
import sys
import random
import re
from datetime import date, timedelta
import mysql.connector

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import Config

def init_campus_hire_test_schema(conn, database_name):
    if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]{0,63}", database_name):
        raise ValueError("Database name must use letters, numbers, and underscores.")
    print(f"Creating {database_name} database and applying schema, procedures, and triggers...")
    root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    cur = conn.cursor()
    cur.execute("SHOW DATABASES LIKE %s;", (database_name,))
    if cur.fetchone():
        cur.close()
        raise RuntimeError(f"{database_name} already exists. Refusing to overwrite it.")
    cur.execute(f"CREATE DATABASE `{database_name}`;")
    cur.execute(f"USE `{database_name}`;")
    cur.close()

    from scripts.init_db import parse_sql_statements

    for sql_file in ['01_schema.sql', '03_transactions.sql', '04_triggers.sql']:
        path = os.path.join(root_dir, sql_file)
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        # Replace database name references
        content = content.replace('CampusHire', database_name)
        statements = parse_sql_statements(content)
        cur = conn.cursor()
        for stmt in statements:
            if not stmt.strip():
                continue
            cur.execute(stmt)
        cur.close()
    print(f"Schema, procedures, and triggers initialized in {database_name}!")

def seed_campus_hire_test(database_name='CampusHire_Test'):
    random.seed(42)
    print(f"Connecting to MySQL port {Config.DB_PORT} for {database_name} seeding...")
    conn = mysql.connector.connect(
        host=Config.DB_HOST,
        port=Config.DB_PORT,
        user=Config.DB_USER,
        password=Config.DB_PASSWORD,
        autocommit=True
    )
    init_campus_hire_test_schema(conn, database_name)

    cur = conn.cursor(dictionary=True)
    cur.execute(f"USE `{database_name}`;")

    # 1. Departments (10 departments)
    departments = [
        ('Computer Science and Engineering', 'CSE', 'Dr. A. Rao'),
        ('Electrical Engineering', 'EE', 'Dr. S. Mehta'),
        ('Mechanical Engineering', 'ME', 'Dr. P. Nair'),
        ('Civil Engineering', 'CE', 'Dr. R. Sharma'),
        ('Metallurgy & Materials Science', 'MEMS', 'Dr. V. Kulkarni'),
        ('Biosciences and Bioengineering', 'BSBE', 'Dr. M. Sen'),
        ('Mathematics and Computing', 'MNC', 'Dr. K. Raman'),
        ('Engineering Physics', 'EP', 'Dr. T. Bhattacharya'),
        ('Chemistry', 'CH', 'Dr. H. Verma'),
        ('Humanities and Social Sciences', 'HSS', 'Dr. D. Ghosh')
    ]
    dept_ids = []
    dept_codes = {}
    for d in departments:
        cur.execute("INSERT INTO Department (dept_name, dept_code, hod_name, total_students) VALUES (%s, %s, %s, 0);", d)
        d_id = cur.lastrowid
        dept_ids.append(d_id)
        dept_codes[d_id] = d[1]
    print(f"1. Seeded {len(dept_ids)} departments.")

    # 2. Placement Officers (4 officers)
    officers = [
        ('Mrs. Kavita Joshi', 'kavita.joshi@tpo.iiti.ac.in', '9811002201'),
        ('Dr. Manish Saxena', 'manish.saxena@tpo.iiti.ac.in', '9811002202'),
        ('Ms. Ritu Deshmukh', 'ritu.deshmukh@tpo.iiti.ac.in', '9811002203'),
        ('Mr. Ankit Tiwari', 'ankit.tiwari@tpo.iiti.ac.in', '9811002204')
    ]
    officer_ids = []
    for o in officers:
        cur.execute("INSERT INTO Placement_Officer (name, email, phone) VALUES (%s, %s, %s);", o)
        officer_ids.append(cur.lastrowid)
    print(f"2. Seeded {len(officer_ids)} placement officers.")

    # 3. Companies (30 companies)
    companies = [
        ('Google India', 'IT / Software', 'https://google.com', 'Sundar N.', 'hr@google.example', '9822001001', 'Bangalore, KA'),
        ('Microsoft IDC', 'IT / Software', 'https://microsoft.com', 'Satya P.', 'hr@microsoft.example', '9822001002', 'Hyderabad, TS'),
        ('Amazon Web Services', 'Cloud / IT', 'https://amazon.com', 'Andy J.', 'hr@amazon.example', '9822001003', 'Hyderabad, TS'),
        ('Goldman Sachs', 'Investment Banking', 'https://goldmansachs.com', 'David S.', 'hr@gs.example', '9822001004', 'Bangalore, KA'),
        ('Morgan Stanley', 'Fintech / Banking', 'https://morganstanley.com', 'Ted P.', 'hr@ms.example', '9822001005', 'Mumbai, MH'),
        ('Tower Research Capital', 'High Frequency Trading', 'https://tower-research.com', 'Mark B.', 'hr@tower.example', '9822001006', 'Gurgaon, HR'),
        ('Sprinklr', 'SaaS / Enterprise', 'https://sprinklr.com', 'Ragy T.', 'hr@sprinklr.example', '9822001007', 'Gurgaon, HR'),
        ('Oracle India', 'Database / Cloud', 'https://oracle.com', 'Safra C.', 'hr@oracle.example', '9822001008', 'Bangalore, KA'),
        ('Cisco Systems', 'Networking / IoT', 'https://cisco.com', 'Chuck R.', 'hr@cisco.example', '9822001009', 'Bangalore, KA'),
        ('Intel Technology', 'Semiconductors', 'https://intel.com', 'Pat G.', 'hr@intel.example', '9822001010', 'Bangalore, KA'),
        ('Texas Instruments', 'Analog & Embedded', 'https://ti.com', 'Rich T.', 'hr@ti.example', '9822001011', 'Bangalore, KA'),
        ('Qualcomm India', 'Wireless & Telecom', 'https://qualcomm.com', 'Cristiano A.', 'hr@qualcomm.example', '9822001012', 'Hyderabad, TS'),
        ('NVIDIA Graphics', 'AI / GPU Computing', 'https://nvidia.com', 'Jensen H.', 'hr@nvidia.example', '9822001013', 'Pune, MH'),
        ('Tata Consultancy Services', 'IT Services', 'https://tcs.com', 'K. Krithivasan', 'hr@tcs.example', '9822001014', 'Mumbai, MH'),
        ('Infosys Technologies', 'Consulting & IT', 'https://infosys.com', 'Salil P.', 'hr@infosys.example', '9822001015', 'Bangalore, KA'),
        ('Larsen & Toubro', 'Core Engineering', 'https://larsentoubro.com', 'S. N. Subrahmanyan', 'hr@lnt.example', '9822001016', 'Mumbai, MH'),
        ('Tata Motors', 'Automotive', 'https://tatamotors.com', 'Shailesh C.', 'hr@tatamotors.example', '9822001017', 'Pune, MH'),
        ('Bajaj Auto', 'Automotive R&D', 'https://bajajauto.com', 'Rajiv B.', 'hr@bajaj.example', '9822001018', 'Pune, MH'),
        ('Reliance Industries', 'Energy & Petrochemicals', 'https://ril.com', 'Mukesh A.', 'hr@ril.example', '9822001019', 'Jamnagar, GJ'),
        ('Adani Enterprises', 'Infrastructure', 'https://adani.com', 'Gautam A.', 'hr@adani.example', '9822001020', 'Ahmedabad, GJ'),
        ('ITC Limited', 'FMCG / Manufacturing', 'https://itcportal.com', 'Sanjiv P.', 'hr@itc.example', '9822001021', 'Kolkata, WB'),
        ('Schlumberger (SLB)', 'Energy / Oil & Gas', 'https://slb.com', 'Olivier L.', 'hr@slb.example', '9822001022', 'Navi Mumbai, MH'),
        ('Bain & Company', 'Management Consulting', 'https://bain.com', 'Manny M.', 'hr@bain.example', '9822001023', 'Gurgaon, HR'),
        ('McKinsey & Company', 'Strategy Consulting', 'https://mckinsey.com', 'Bob S.', 'hr@mckinsey.example', '9822001024', 'Gurgaon, HR'),
        ('Barclays Global', 'Financial Services', 'https://barclays.com', 'C. S. Venkat', 'hr@barclays.example', '9822001025', 'Pune, MH'),
        ('JPMorgan Chase', 'Investment Banking', 'https://jpmorganchase.com', 'Jamie D.', 'hr@jpmc.example', '9822001026', 'Mumbai, MH'),
        ('Uber Technologies', 'Mobility & Logistics', 'https://uber.com', 'Dara K.', 'hr@uber.example', '9822001027', 'Hyderabad, TS'),
        ('Flipkart Internet', 'E-Commerce', 'https://flipkart.com', 'Kalyan K.', 'hr@flipkart.example', '9822001028', 'Bangalore, KA'),
        ('Zomato Media', 'Consumer Tech', 'https://zomato.com', 'Deepinder G.', 'hr@zomato.example', '9822001029', 'Gurgaon, HR'),
        ('Swiggy Limited', 'Supply Chain / Tech', 'https://swiggy.com', 'Sriharsha M.', 'hr@swiggy.example', '9822001030', 'Bangalore, KA')
    ]
    company_ids = []
    for c in companies:
        cur.execute("""
            INSERT INTO Company (company_name, industry_type, website, hr_contact_name, hr_contact_email, hr_contact_phone, address)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """, c)
        company_ids.append(cur.lastrowid)
    print(f"3. Seeded {len(company_ids)} companies.")

    # 4. Students (300 students)
    first_names = [
        'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
        'Shaurya', 'Dhruv', 'Kabir', 'Rishi', 'Kavya', 'Ananya', 'Diya', 'Isha', 'Aadhya', 'Saanvi',
        'Tara', 'Aditi', 'Pari', 'Sneha', 'Tanvi', 'Khushi', 'Riya', 'Nandini', 'Pooja', 'Meera',
        'Rohan', 'Karan', 'Aryan', 'Samarth', 'Manish', 'Harsh', 'Varun', 'Naveen', 'Siddharth', 'Nikhil',
        'Dev', 'Alok', 'Chirag', 'Tushar', 'Pranav', 'Gaurav', 'Kartik', 'Mayank', 'Sumit', 'Abhishek'
    ]
    last_names = [
        'Sharma', 'Verma', 'Patel', 'Nair', 'Gupta', 'Singh', 'Kumar', 'Iyer', 'Reddy', 'Chauhan',
        'Mehta', 'Rao', 'Bhatt', 'Mishra', 'Joshi', 'Aggarwal', 'Deshmukh', 'Saxena', 'Trivedi', 'Kulkarni',
        'Sen', 'Banerjee', 'Chatterjee', 'Das', 'Dutta', 'Bose', 'Pandey', 'Dubey', 'Tiwari', 'Shukla'
    ]

    students = []
    student_rolls = []
    student_meta = {} # roll_no -> dict(cgpa, backlogs, dept_id, p10, p12)

    for i in range(1, 301):
        fn = random.choice(first_names)
        ln = random.choice(last_names)
        name = f"{fn} {ln}"
        enrollment = f"25000{1000 + i}"
        email = f"{fn.lower()}.{ln.lower()}{i}@iiti.ac.in"
        phone = f"91000{10000 + i}"
        gender = random.choice(['Male', 'Female', 'Male', 'Female', 'Other'])
        dob = date(2003, 1, 1) + timedelta(days=random.randint(0, 700))
        address = f"Room {random.randint(101, 599)}, Hall {random.randint(1, 4)}, IIT Indore Campus"
        dept_id = random.choice(dept_ids)
        sem = random.choice(['7-1', '7-1', '7-1', '8-1'])
        
        # Realistic profile distribution:
        # 15% High Achievers (CGPA >= 8.5, 0 backlogs)
        # 60% Average (CGPA 6.8 - 8.4, 0 or 1 backlog)
        # 25% Low/Borderline (CGPA 5.0 - 6.7, 1-3 backlogs)
        roll_type = random.random()
        if roll_type < 0.15:
            cgpa = round(random.uniform(8.50, 9.95), 2)
            backlogs = 0
            p10 = round(random.uniform(88.0, 98.5), 2)
            p12 = round(random.uniform(86.0, 97.0), 2)
        elif roll_type < 0.75:
            cgpa = round(random.uniform(6.80, 8.45), 2)
            backlogs = random.choice([0, 0, 0, 1])
            p10 = round(random.uniform(75.0, 89.0), 2)
            p12 = round(random.uniform(72.0, 88.0), 2)
        else:
            cgpa = round(random.uniform(5.00, 6.75), 2)
            backlogs = random.randint(1, 3)
            p10 = round(random.uniform(60.0, 78.0), 2)
            p12 = round(random.uniform(58.0, 75.0), 2)

        resume = f"https://resumes.iiti.ac.in/{enrollment}.pdf"

        # Note: Department total_students will be automatically updated by TR3
        # and dept_name by TR1!
        cur.execute("""
            INSERT INTO Student (enrollment_no, name, email, phone, dob, gender, address,
                                dept_id, current_year_sem, cgpa, backlog_count,
                                percentage_10th, percentage_12th, resume_link)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (enrollment, name, email, phone, dob, gender, address, dept_id, sem, cgpa, backlogs, p10, p12, resume))
        
        roll_no = cur.lastrowid
        student_rolls.append(roll_no)
        student_meta[roll_no] = {
            'cgpa': cgpa,
            'backlogs': backlogs,
            'dept_id': dept_id,
            'dept_code': dept_codes[dept_id],
            'p10': p10,
            'p12': p12,
            'placed': False,
            'offers': []
        }

    print(f"4. Seeded {len(student_rolls)} students across {len(dept_ids)} departments.")

    # 5. Placement Drives & Eligibility Criteria (50 drives)
    roles = [
        ('Software Development Engineer', 'Full-Time', 1800000, 4, 7.50, 0, 'CSE,EE,MNC'),
        ('Member Technical Staff', 'Full-Time', 2400000, 2, 8.50, 0, 'CSE,MNC'),
        ('Quantitative Analyst', 'Full-Time', 3600000, 2, 8.80, 0, 'CSE,EE,MNC'),
        ('Graduate Engineer Trainee (Mech)', 'Full-Time', 950000, 6, 6.50, 1, 'ME,MEMS'),
        ('Graduate Engineer Trainee (Civil)', 'Full-Time', 850000, 5, 6.00, 1, 'CE'),
        ('Embedded Systems Engineer', 'Full-Time', 1600000, 3, 7.80, 0, 'EE,CSE,EP'),
        ('Data Scientist / Analyst', 'Full-Time', 1500000, 4, 7.20, 0, 'ALL'),
        ('Associate Consultant', 'Full-Time', 1400000, 5, 7.00, 0, 'ALL'),
        ('Product Manager Intern/FT', 'Full-Time', 2000000, 2, 8.00, 0, 'ALL'),
        ('Site Reliability Engineer', 'Full-Time', 1700000, 3, 7.00, 1, 'CSE,EE'),
        ('Hardware Design Engineer', 'Full-Time', 1900000, 3, 7.50, 0, 'EE,EP'),
        ('Operations & Supply Chain Analyst', 'Full-Time', 1100000, 4, 6.50, 1, 'ALL'),
        ('Research Scientist (Bio/Chem)', 'Full-Time', 1300000, 2, 7.50, 0, 'BSBE,CH'),
        ('Cybersecurity Specialist', 'Full-Time', 1750000, 2, 7.50, 0, 'CSE,EE'),
        ('Core Metallurgy Engineer', 'Full-Time', 1000000, 4, 6.50, 1, 'MEMS,ME')
    ]

    drive_ids = []
    drive_meta = {} # drive_id -> dict(...)
    drive_rounds = {} # drive_id -> list of round_ids

    for i in range(1, 51):
        company_id = random.choice(company_ids)
        officer_id = random.choice(officer_ids)
        role_info = roles[(i - 1) % len(roles)]
        job_title = f"{role_info[0]} - Cohort {2026 if i%2==0 else 2027}"
        job_desc = f"Campus recruitment drive for {job_title}. Excellent opportunity for high-caliber graduates."
        offer_type = role_info[1]
        package = role_info[2] + random.randint(-100000, 300000)
        vacancies = role_info[3] + random.randint(0, 2)
        mode = random.choice(['On-Campus', 'On-Campus', 'Virtual'])
        drive_date = date.today() + timedelta(days=random.randint(5, 60))

        cur.execute("""
            INSERT INTO Placement_Drive (company_id, officer_id, job_title, job_description,
                                         offer_type, package_offered, vacancies, mode, drive_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s);
        """, (company_id, officer_id, job_title, job_desc, offer_type, package, vacancies, mode, drive_date))
        d_id = cur.lastrowid
        drive_ids.append(d_id)

        # Eligibility criteria
        min_cgpa = role_info[4]
        max_backlogs = role_info[5]
        eligible_depts = role_info[6]
        min_10th = round(random.uniform(65.0, 75.0), 2) if random.random() > 0.3 else None
        min_12th = round(random.uniform(65.0, 75.0), 2) if random.random() > 0.3 else None

        cur.execute("""
            INSERT INTO Eligibility_Criteria (drive_id, min_cgpa, max_backlogs, eligible_departments,
                                             min_10th_percentage, min_12th_percentage)
            VALUES (%s, %s, %s, %s, %s, %s);
        """, (d_id, min_cgpa, max_backlogs, eligible_depts, min_10th, min_12th))

        drive_meta[d_id] = {
            'company_id': company_id,
            'job_title': job_title,
            'package': package,
            'vacancies': vacancies,
            'min_cgpa': min_cgpa,
            'max_backlogs': max_backlogs,
            'eligible_depts': eligible_depts,
            'min_10th': min_10th,
            'min_12th': min_12th,
            'drive_date': drive_date,
            'applicants': [],
            'offers_issued': 0
        }

        # 6. Selection Rounds (2 to 4 rounds per drive)
        round_types = ['Aptitude Test', 'GD', 'Technical Interview', 'HR Interview']
        num_rounds = random.randint(2, 4)
        rounds_for_d = []
        for r_no in range(1, num_rounds + 1):
            r_type = round_types[r_no - 1]
            r_mode = mode
            r_date = drive_date + timedelta(days=r_no * 2)
            venue = f"Lab {r_no + 1}, Academic Pod 1" if r_mode == 'On-Campus' else "MS Teams"
            cur.execute("""
                INSERT INTO Selection_Round (drive_id, round_no, round_type, round_date, mode, venue)
                VALUES (%s, %s, %s, %s, %s, %s);
            """, (d_id, r_no, r_type, r_date, r_mode, venue))
            r_id = cur.lastrowid
            rounds_for_d.append({
                'round_id': r_id,
                'round_no': r_no,
                'round_type': r_type
            })
        drive_rounds[d_id] = rounds_for_d

    total_rounds_count = sum(len(r) for r in drive_rounds.values())
    print(f"5. Seeded {len(drive_ids)} drives with eligibility criteria and {total_rounds_count} selection rounds.")

    # 7. Applications (~1,500 applications respecting criteria)
    app_count = 0
    student_apps = {s: [] for s in student_rolls} # s -> list of drive_ids

    def is_eligible(student_id, drive_id):
        sm = student_meta[student_id]
        dm = drive_meta[drive_id]
        if sm['placed']:
            return False
        if dm['min_cgpa'] and sm['cgpa'] < dm['min_cgpa']:
            return False
        if dm['max_backlogs'] is not None and sm['backlogs'] > dm['max_backlogs']:
            return False
        if dm['min_10th'] and sm['p10'] < dm['min_10th']:
            return False
        if dm['min_12th'] and sm['p12'] < dm['min_12th']:
            return False
        if dm['eligible_depts'] != 'ALL':
            allowed = [x.strip() for x in dm['eligible_depts'].split(',')]
            if sm['dept_code'] not in allowed:
                return False
        return True

    for s_roll in student_rolls:
        # Each student applies to 3 to 10 drives they are eligible for
        possible_drives = [d for d in drive_ids if is_eligible(s_roll, d)]
        random.shuffle(possible_drives)
        target_apps = min(len(possible_drives), random.randint(3, 8))
        for d_id in possible_drives[:target_apps]:
            app_date = date.today() - timedelta(days=random.randint(1, 20))
            cur.execute("""
                INSERT INTO Application (student_id, drive_id, application_date, status)
                VALUES (%s, %s, %s, 'Applied');
            """, (s_roll, d_id, app_date))
            app_id = cur.lastrowid
            student_apps[s_roll].append(d_id)
            drive_meta[d_id]['applicants'].append({
                'app_id': app_id,
                'student_id': s_roll,
                'status': 'Applied'
            })
            app_count += 1

    print(f"6. Seeded {app_count} valid applications meeting all eligibility and unique constraints.")

    # 8. Selection Round Results & Progressive Shortlisting (~1,000 round results)
    # Simulate multi-round progression:
    # Round 1: ~60% pass, 10% on-hold, 30% fail
    # Round 2: ~50% pass, 50% fail
    # Round 3+: ~60% pass
    result_count = 0
    drive_finalists = {d: [] for d in drive_ids} # drive_id -> list of student_ids who cleared final round

    for d_id in drive_ids:
        r_list = drive_rounds[d_id]
        if not r_list:
            continue
        applicants = drive_meta[d_id]['applicants']
        if not applicants:
            continue

        active_students = [a['student_id'] for a in applicants]

        for idx, round_info in enumerate(r_list):
            round_id = round_info['round_id']
            next_active = []

            for s_id in active_students:
                # Decide outcome
                # High CGPA students have higher pass probabilities
                cgpa = student_meta[s_id]['cgpa']
                pass_prob = 0.75 if cgpa >= 8.5 else (0.55 if cgpa >= 7.0 else 0.35)
                
                rand_val = random.random()
                if rand_val < pass_prob:
                    outcome = 'Pass'
                    score = round(random.uniform(70.0, 98.0), 2)
                    remarks = 'Strong conceptual clarity, cleared cutoffs'
                    next_active.append(s_id)
                elif rand_val < pass_prob + 0.12 and idx == 0:
                    outcome = 'On-Hold'
                    score = round(random.uniform(60.0, 72.0), 2)
                    remarks = 'Borderline score, waitlisted for committee review'
                    # On-Hold students do not immediately progress to next round
                else:
                    outcome = 'Fail'
                    score = round(random.uniform(30.0, 65.0), 2)
                    remarks = 'Did not clear the round cutoff score'

                # Use direct INSERT or CALL sp_record_round_result
                # Trigger TR15 will automatically sync Application status:
                # Pass -> Shortlisted, Fail -> Rejected!
                cur.execute("""
                    INSERT INTO Round_Result (student_id, round_id, outcome, score, remarks)
                    VALUES (%s, %s, %s, %s, %s);
                """, (s_id, round_id, outcome, score, remarks))
                result_count += 1

                # Trigger TR15 handles Application.status automatically!
            
            active_students = next_active
            if idx == len(r_list) - 1:
                # Final round cleared!
                drive_finalists[d_id] = active_students

    print(f"7. Seeded {result_count} round results with automatic status synchronization.")

    # 9. Offer Allocations (100 - 180 offers)
    # Strictly respect vacancies, candidate shortlist status, and the One-Offer Policy!
    offers_issued_count = 0
    accepted_offers_count = 0

    for d_id in drive_ids:
        vacancies = drive_meta[d_id]['vacancies']
        pkg = drive_meta[d_id]['package']
        finalists = drive_finalists[d_id]
        
        # Filter finalists who are not yet placed
        eligible_for_offer = [s for s in finalists if not student_meta[s]['placed']]
        num_to_offer = min(vacancies, len(eligible_for_offer))

        for s_id in eligible_for_offer[:num_to_offer]:
            # Issue offer (starts as Pending)
            offer_date = date.today() - timedelta(days=random.randint(0, 5))
            cur.execute("""
                INSERT INTO Offer (student_id, drive_id, package_offered, offer_status, offer_date)
                VALUES (%s, %s, %s, 'Pending', %s);
            """, (s_id, d_id, pkg, offer_date))
            offer_id = cur.lastrowid
            offers_issued_count += 1
            drive_meta[d_id]['offers_issued'] += 1

            # Decide student response:
            # High probability to accept if package is attractive and student is unplaced
            if not student_meta[s_id]['placed'] and random.random() < 0.70:
                # Student accepts!
                # Procedure sp_respond_to_offer or trigger TR17/TR18:
                cur.execute("""
                    UPDATE Offer SET offer_status = 'Accepted' WHERE offer_id = %s;
                """, (offer_id,))
                student_meta[s_id]['placed'] = True
                accepted_offers_count += 1

                # Any other pending offers for this student are automatically declined:
                cur.execute("""
                    UPDATE Offer SET offer_status = 'Declined'
                    WHERE student_id = %s AND offer_id <> %s AND offer_status = 'Pending';
                """, (s_id, offer_id))

                # Any other active applications are withdrawn:
                cur.execute("""
                    UPDATE Application SET status = 'Withdrawn'
                    WHERE student_id = %s AND drive_id <> %s AND status IN ('Applied', 'Shortlisted');
                """, (s_id, d_id))
            elif random.random() < 0.20:
                # Student declines
                cur.execute("UPDATE Offer SET offer_status = 'Declined' WHERE offer_id = %s;", (offer_id,))

    print(f"8. Seeded {offers_issued_count} job offers ({accepted_offers_count} Accepted, satisfying One-Offer Policy).")

    # 10. User Accounts for Authentication in the generated dataset
    # Ensure role accounts exist for testing
    from auth import hash_password
    pwd_hash = hash_password('password123')

    test_users = [
        ('admin', 'admin@demo.example', pwd_hash, 'TPO_ADMIN', 'Demo Administrator', None, officer_ids[0], None, None),
        ('aarav', 'aarav@demo.example', pwd_hash, 'STUDENT', 'Demo Student', student_rolls[0], None, None, dept_ids[0]),
        ('technova_hr', 'hr@demo.example', pwd_hash, 'COMPANY_HR', 'Demo Company HR', None, None, company_ids[0], None),
        ('cse_coord', 'coord@demo.example', pwd_hash, 'DEPARTMENT_COORDINATOR', 'Demo Department Coordinator', None, None, None, dept_ids[0])
    ]

    cur.execute("""
        CREATE TABLE IF NOT EXISTS User_Account (
            user_id INT PRIMARY KEY AUTO_INCREMENT,
            username VARCHAR(100) NOT NULL UNIQUE,
            email VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            role ENUM('TPO_ADMIN', 'STUDENT', 'COMPANY_HR', 'DEPARTMENT_COORDINATOR') NOT NULL,
            full_name VARCHAR(150) NOT NULL,
            student_id INT NULL,
            officer_id INT NULL,
            company_id INT NULL,
            dept_id INT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_test_user_student FOREIGN KEY (student_id) REFERENCES Student(roll_no) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_test_user_officer FOREIGN KEY (officer_id) REFERENCES Placement_Officer(officer_id) ON UPDATE CASCADE ON DELETE SET NULL,
            CONSTRAINT fk_test_user_company FOREIGN KEY (company_id) REFERENCES Company(company_id) ON UPDATE CASCADE ON DELETE CASCADE,
            CONSTRAINT fk_test_user_dept FOREIGN KEY (dept_id) REFERENCES Department(dept_id) ON UPDATE CASCADE ON DELETE SET NULL
        );
    """)

    for u in test_users:
        cur.execute("""
            INSERT INTO User_Account (username, email, password_hash, role, full_name, student_id, officer_id, company_id, dept_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);
        """, u)

    # Enrollment number is the login name for every generated student.
    cur.execute("""
        INSERT INTO User_Account (username, email, password_hash, role, full_name, student_id, dept_id)
        SELECT enrollment_no, CONCAT(enrollment_no, '@students.demo.example'), %s,
               'STUDENT', name, roll_no, dept_id
        FROM Student
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash);
    """, (pwd_hash,))
    print(f"   Added student login accounts for {len(student_rolls)} generated students.")

    print(f"9. Seeded authentication test accounts in User_Account.")
    conn.close()

    print("=====================================================================")
    print(f" {database_name} dataset generated successfully!")
    print(f"  • Departments: {len(dept_ids)}")
    print(f"  • Companies:   {len(company_ids)}")
    print(f"  • Students:    {len(student_rolls)}")
    print(f"  • Drives:      {len(drive_ids)}")
    print(f"  • Rounds:      {total_rounds_count}")
    print(f"  • Applications:{app_count}")
    print(f"  • Results:     {result_count}")
    print(f"  • Offers:      {offers_issued_count} ({accepted_offers_count} placed)")
    print("=====================================================================")

if __name__ == '__main__':
    target_database = sys.argv[1] if len(sys.argv) > 1 else 'CampusHire_Test'
    seed_campus_hire_test(target_database)
