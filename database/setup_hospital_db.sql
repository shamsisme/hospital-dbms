-- ============================================================================
-- CENTRALIZED HOSPITAL BED & EMERGENCY RESOURCE MANAGEMENT SYSTEM (CHR-MS)
-- Database Engine: PostgreSQL 16+ / 17+ / 18+
-- Target Database: hospital_db
-- Complete Idempotent Schema Snapshot & Seed Initialization
-- ============================================================================

-- Reset and isolate schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Enable Generalized Search Tree (GiST) scalar index extensions for btree types
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ============================================================================
-- 1. RELATIONAL SCHEMA DDL (8 TABLES IN FK HIERARCHY ORDER)
-- ============================================================================

-- Table 1: Departments
CREATE TABLE departments (
    dept_id SERIAL PRIMARY KEY,
    dept_code VARCHAR(10) NOT NULL UNIQUE,
    dept_name VARCHAR(100) NOT NULL UNIQUE,
    floor_number INT NOT NULL,
    emergency_contact VARCHAR(20) NOT NULL,
    annual_budget NUMERIC(14,2) NOT NULL DEFAULT 500000.00,
    CONSTRAINT chk_dept_code CHECK (dept_code ~ '^[A-Z]{3,4}[0-9]{1,2}$'),
    CONSTRAINT chk_floor CHECK (floor_number >= -2 AND floor_number <= 15),
    CONSTRAINT chk_budget CHECK (annual_budget >= 10000.00)
);

-- Table 2: Doctors
CREATE TABLE doctors (
    doctor_id SERIAL PRIMARY KEY,
    license_no VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(80) NOT NULL,
    dept_id INT NOT NULL REFERENCES departments(dept_id) ON DELETE RESTRICT,
    email VARCHAR(120) NOT NULL UNIQUE,
    phone VARCHAR(15) NOT NULL,
    consultation_fee NUMERIC(10,2) NOT NULL DEFAULT 500.00,
    is_on_duty BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT chk_doc_license CHECK (license_no ~ '^DOC-[0-9]{4}-[A-Z]{2}$'),
    CONSTRAINT chk_doc_email CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT chk_doc_phone CHECK (phone ~ '^[0-9]{10}$'),
    CONSTRAINT chk_consult_fee CHECK (consultation_fee >= 200.00 AND consultation_fee <= 5000.00)
);

-- Table 3: Wards & Beds
CREATE TABLE wards_beds (
    bed_id SERIAL PRIMARY KEY,
    dept_id INT NOT NULL REFERENCES departments(dept_id) ON DELETE RESTRICT,
    room_number VARCHAR(20) NOT NULL,
    bed_label VARCHAR(10) NOT NULL,
    ward_type VARCHAR(30) NOT NULL,
    has_ventilator BOOLEAN NOT NULL DEFAULT false,
    has_oxygen_port BOOLEAN NOT NULL DEFAULT true,
    daily_tariff NUMERIC(10,2) NOT NULL,
    operational_status VARCHAR(25) NOT NULL DEFAULT 'Available',
    CONSTRAINT uq_room_bed UNIQUE (room_number, bed_label),
    CONSTRAINT chk_ward_type CHECK (ward_type IN ('General', 'Pediatric', 'Semi-Private', 'ICU', 'CCU', 'Burn-Unit')),
    CONSTRAINT chk_bed_state CHECK (operational_status IN ('Available', 'Occupied', 'Sanitizing', 'Out-Of-Service')),
    CONSTRAINT chk_tariff CHECK (daily_tariff > 0.00),
    CONSTRAINT chk_critical_infra CHECK (
        ward_type NOT IN ('ICU', 'CCU') OR (has_ventilator = true AND has_oxygen_port = true)
    )
);

-- Table 4: Patients
CREATE TABLE patients (
    patient_id SERIAL PRIMARY KEY,
    national_health_id VARCHAR(30) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    gender CHAR(1) NOT NULL,
    dob DATE NOT NULL,
    blood_group VARCHAR(5) NOT NULL,
    primary_phone VARCHAR(15) NOT NULL,
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(15),
    CONSTRAINT chk_pat_gender CHECK (gender IN ('M', 'F', 'O')),
    CONSTRAINT chk_pat_dob CHECK (dob <= CURRENT_DATE),
    CONSTRAINT chk_blood_group CHECK (blood_group IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
    CONSTRAINT chk_pat_phone CHECK (primary_phone ~ '^[0-9]{10}$'),
    CONSTRAINT chk_minor_emergency_contact CHECK (
        dob <= (CURRENT_DATE - INTERVAL '18 years') OR (
            emergency_contact_name IS NOT NULL AND emergency_contact_phone ~ '^[0-9]{10}$'
        )
    )
);

-- Table 5: Admissions (with GiST Temporal Exclusion & Stored Generated tsrange)
CREATE TABLE admissions (
    admission_id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(patient_id) ON DELETE RESTRICT,
    bed_id INT NOT NULL REFERENCES wards_beds(bed_id) ON DELETE RESTRICT,
    admitting_doctor_id INT NOT NULL REFERENCES doctors(doctor_id) ON DELETE RESTRICT,
    triage_priority INT NOT NULL DEFAULT 3,
    admission_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    discharge_time TIMESTAMP,
    stay_duration_range tsrange GENERATED ALWAYS AS (
        tsrange(admission_time, COALESCE(discharge_time, 'infinity'::timestamp), '[)')
    ) STORED,
    admission_status VARCHAR(25) NOT NULL DEFAULT 'Admitted',
    admission_diagnosis TEXT NOT NULL,
    CONSTRAINT chk_triage_esi CHECK (triage_priority >= 1 AND triage_priority <= 5),
    CONSTRAINT chk_adm_status CHECK (
        admission_status IN ('Triage', 'Admitted', 'Transferred', 'Discharged', 'AMA', 'Deceased')
    ),
    CONSTRAINT chk_timeline CHECK (discharge_time IS NULL OR discharge_time > admission_time),
    CONSTRAINT ex_no_double_bed_booking EXCLUDE USING gist (
        bed_id WITH =,
        stay_duration_range WITH &&
    )
);

-- Table 6: Medical Equipments
CREATE TABLE medical_equipments (
    equipment_id SERIAL PRIMARY KEY,
    serial_number VARCHAR(50) NOT NULL UNIQUE,
    equipment_type VARCHAR(50) NOT NULL,
    assigned_bed_id INT REFERENCES wards_beds(bed_id) ON DELETE SET NULL,
    last_sterilized_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    maintenance_status VARCHAR(30) NOT NULL DEFAULT 'Operational',
    CONSTRAINT chk_eq_type CHECK (
        equipment_type IN ('Ventilator', 'Infusion Pump', 'Defibrillator', 'Dialysis Unit', 'Multiparameter Monitor')
    ),
    CONSTRAINT chk_maint_status CHECK (
        maintenance_status IN ('Operational', 'Maintenance-Due', 'Faulty', 'Sterilization-Pending')
    )
);

-- Table 7: Billing (with Stored Generated Columns & Cross-Column Rules)
CREATE TABLE billing (
    bill_id SERIAL PRIMARY KEY,
    admission_id INT NOT NULL UNIQUE REFERENCES admissions(admission_id) ON DELETE RESTRICT,
    bed_charges NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    clinical_procedure_charges NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    pharmacy_charges NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    gross_amount NUMERIC(12,2) GENERATED ALWAYS AS (
        (bed_charges + clinical_procedure_charges) + pharmacy_charges
    ) STORED,
    insurance_claim_approved NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    net_patient_payable NUMERIC(12,2) GENERATED ALWAYS AS (
        (((bed_charges + clinical_procedure_charges) + pharmacy_charges) - insurance_claim_approved) - 
        (((bed_charges + clinical_procedure_charges) + pharmacy_charges) * (discount_percentage / 100.00))
    ) STORED,
    payment_status VARCHAR(25) NOT NULL DEFAULT 'Unpaid',
    settled_at TIMESTAMP,
    CONSTRAINT chk_bill_status CHECK (
        payment_status IN ('Unpaid', 'Partially-Paid', 'Settled', 'Insurance-Pending')
    ),
    CONSTRAINT chk_discount CHECK (discount_percentage >= 0.00 AND discount_percentage <= 50.00),
    CONSTRAINT chk_insurance_limit CHECK (
        insurance_claim_approved >= 0.00 AND insurance_claim_approved <= gross_amount
    ),
    CONSTRAINT chk_settled_time CHECK (
        (payment_status = 'Settled' AND settled_at IS NOT NULL) OR
        (payment_status <> 'Settled' AND settled_at IS NULL)
    )
);

-- Table 8: Bed Transfer Audit Trail
CREATE TABLE bed_transfer_audit (
    audit_id SERIAL PRIMARY KEY,
    admission_id INT NOT NULL REFERENCES admissions(admission_id) ON DELETE CASCADE,
    previous_bed_id INT NOT NULL,
    new_bed_id INT NOT NULL,
    transfer_reason VARCHAR(255) NOT NULL,
    transferred_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    transferred_by_user VARCHAR(50) NOT NULL DEFAULT CURRENT_USER
);

-- ============================================================================
-- 2. SEED DATA INITIALIZATION (ORDERED BY DEPENDENCY)
-- ============================================================================

-- 2.1 Departments
INSERT INTO departments (dept_id, dept_code, dept_name, floor_number, emergency_contact, annual_budget) VALUES
(1, 'EMER01', 'Emergency & Trauma Core', 0, '9900112233', 1200000.00),
(2, 'CARD01', 'Cardiology & Catheterization', 2, '9900112244', 950000.00),
(3, 'NEUR01', 'Neurology & Stroke Center', 3, '9900112255', 850000.00),
(4, 'PEDI01', 'Pediatrics & Neonatal Care', 1, '9900112266', 600000.00);

-- 2.2 Doctors
INSERT INTO doctors (doctor_id, license_no, full_name, specialization, dept_id, email, phone, consultation_fee, is_on_duty) VALUES
(1, 'DOC-1001-TN', 'Dr. Arvind Swaminathan', 'Trauma Surgeon', 1, 'arvind.s@hospital.org', '9840112233', 1000.00, true),
(2, 'DOC-1002-TN', 'Dr. Radhika Menon', 'Interventional Cardiologist', 2, 'radhika.m@hospital.org', '9840223344', 1500.00, true),
(3, 'DOC-1003-TN', 'Dr. Vikram Seth', 'Critical Care Neurologist', 3, 'vikram.s@hospital.org', '9840334455', 1200.00, true),
(4, 'DOC-1004-TN', 'Dr. Sunita Kapoor', 'Pediatric Specialist', 4, 'sunita.k@hospital.org', '9840445566', 800.00, true),
(5, 'DOC-1005-TN', 'Dr. Meera Nambiar', 'Pediatric Pulmonologist', 4, 'meera.n@hospital.org', '9840556677', 950.00, false),
(6, 'DOC-1006-TN', 'Dr. Rajesh Varma', 'Emergency Medicine Specialist', 1, 'rajesh.v@hospital.org', '9840667788', 1100.00, true);

-- 2.3 Wards & Beds
INSERT INTO wards_beds (bed_id, dept_id, room_number, bed_label, ward_type, has_ventilator, has_oxygen_port, daily_tariff, operational_status) VALUES
(1,  1, 'ER-TRAUMA', 'B-1', 'General',      true,  true, 2500.00, 'Occupied'),
(2,  2, 'ICU-CARD',  'B-1', 'ICU',          true,  true, 8500.00, 'Available'),
(3,  2, 'ICU-CARD',  'B-2', 'ICU',          true,  true, 8500.00, 'Occupied'),
(4,  4, 'PED-WARD',  'B-1', 'Pediatric',    false, true, 1500.00, 'Available'),
(5,  3, 'NEU-WARD',  'B-1', 'Semi-Private', false, true, 3500.00, 'Available'),
(6,  1, 'ER-TRAUMA', 'B-2', 'General',      false, true, 2500.00, 'Available'),
(7,  1, 'ER-RESUS',  'B-1', 'ICU',          true,  true, 7500.00, 'Available'),
(8,  2, 'ICU-CARD',  'B-3', 'ICU',          true,  true, 8500.00, 'Sanitizing'),
(9,  2, 'CCU-STEP',  'B-1', 'Semi-Private', false, true, 4200.00, 'Available'),
(10, 3, 'NEU-ICU',   'B-1', 'ICU',          true,  true, 9000.00, 'Available'),
(11, 3, 'NEU-WARD',  'B-2', 'Semi-Private', false, true, 3500.00, 'Available'),
(12, 4, 'PED-WARD',  'B-2', 'Pediatric',    false, true, 1500.00, 'Sanitizing'),
(13, 4, 'NICU-CRIT', 'B-1', 'ICU',          true,  true, 6500.00, 'Available');

-- 2.4 Patients
INSERT INTO patients (patient_id, national_health_id, full_name, gender, dob, blood_group, primary_phone, emergency_contact_name, emergency_contact_phone) VALUES
(1, 'NHID-IND-9901', 'Kavitha Ramachandran', 'F', '1988-06-15', 'O+',  '9876543210', 'R. Ramachandran', '9876543219'),
(2, 'NHID-IND-9902', 'Master Ayaan Khan',    'M', '2020-10-11', 'B+',  '9123456780', 'Farooq Khan',     '9123456789'),
(3, 'NHID-IND-9903', 'Ramesh Parthasarathy', 'M', '1965-02-10', 'A+',  '9444123456', 'Lakshmi P',       '9444123457'),
(4, 'NHID-IND-9904', 'Ananya Sharma',        'F', '1995-04-20', 'B-',  '9888112233', 'Rahul Sharma',    '9888112234'),
(5, 'NHID-IND-9905', 'Karthik Raja',         'M', '1982-11-12', 'O-',  '9777223344', 'Priya Raja',      '9777223345'),
(6, 'NHID-IND-9906', 'Baby Diya',            'F', '2023-01-15', 'AB+', '9666334455', 'Senthil Nathan',  '9666334456');

-- 2.5 Admissions
INSERT INTO admissions (admission_id, patient_id, bed_id, admitting_doctor_id, triage_priority, admission_time, discharge_time, admission_status, admission_diagnosis) VALUES
(1, 1, 2, 2, 1, '2026-10-07 01:13:15', '2026-10-10 01:13:15', 'Discharged', 'Acute Myocardial Infarction'),
(2, 2, 4, 4, 3, '2026-10-09 01:13:15', '2026-10-11 15:20:42', 'Discharged', 'Severe Bronchiolitis with Wheeze'),
(3, 3, 3, 2, 2, '2026-10-10 13:13:15', NULL,                  'Admitted',   'Unstable Angina & Arrhythmia'),
(4, 4, 1, 1, 1, '2026-10-11 15:20:32', NULL,                  'Admitted',   'Severe Polytrauma with Hemorrhagic Shock');

-- 2.6 Medical Equipments
INSERT INTO medical_equipments (equipment_id, serial_number, equipment_type, assigned_bed_id, last_sterilized_at, maintenance_status) VALUES
(1, 'EQ-VENT-001', 'Ventilator',             1,  '2026-10-10 08:00:00', 'Operational'),
(2, 'EQ-VENT-002', 'Ventilator',             2,  '2026-10-10 08:00:00', 'Operational'),
(3, 'EQ-VENT-003', 'Ventilator',             3,  '2026-10-10 08:00:00', 'Operational'),
(4, 'EQ-MON-001',  'Multiparameter Monitor', 7,  '2026-10-09 14:00:00', 'Operational'),
(5, 'EQ-DEFIB-001','Defibrillator',          1,  '2026-10-08 12:00:00', 'Operational'),
(6, 'EQ-INF-001',  'Infusion Pump',          10, '2026-10-11 09:30:00', 'Operational');

-- 2.7 Billing
INSERT INTO billing (bill_id, admission_id, bed_charges, clinical_procedure_charges, pharmacy_charges, insurance_claim_approved, discount_percentage, payment_status, settled_at) VALUES
(1, 1, 25500.00, 45000.00, 12800.00, 60000.00, 5.00,  'Settled', '2026-10-10 01:13:16'),
(2, 2, 4500.00,  3500.00,  1200.00,  2000.00,  10.00, 'Settled', '2026-10-11 15:20:42');

-- 2.8 Bed Transfer Audit
INSERT INTO bed_transfer_audit (audit_id, admission_id, previous_bed_id, new_bed_id, transfer_reason, transferred_at, transferred_by_user) VALUES
(1, 1, 7, 2, 'Post-Resuscitation Transfer to Cardiac ICU', '2026-10-07 03:00:00', 'clinical_supervisor');

-- Synchronize Identity Primary Key Sequences
SELECT setval('departments_dept_id_seq', (SELECT COALESCE(MAX(dept_id), 1) FROM departments));
SELECT setval('doctors_doctor_id_seq', (SELECT COALESCE(MAX(doctor_id), 1) FROM doctors));
SELECT setval('wards_beds_bed_id_seq', (SELECT COALESCE(MAX(bed_id), 1) FROM wards_beds));
SELECT setval('patients_patient_id_seq', (SELECT COALESCE(MAX(patient_id), 1) FROM patients));
SELECT setval('admissions_admission_id_seq', (SELECT COALESCE(MAX(admission_id), 1) FROM admissions));
SELECT setval('medical_equipments_equipment_id_seq', (SELECT COALESCE(MAX(equipment_id), 1) FROM medical_equipments));
SELECT setval('billing_bill_id_seq', (SELECT COALESCE(MAX(bill_id), 1) FROM billing));
SELECT setval('bed_transfer_audit_audit_id_seq', (SELECT COALESCE(MAX(audit_id), 1) FROM bed_transfer_audit));

-- ============================================================================
-- 3. RELATIONAL OPERATIONAL VIEWS
-- ============================================================================

-- View 1: Real-Time Live Bed Availability Grid
CREATE OR REPLACE VIEW V_Live_Bed_Availability AS
SELECT 
    wb.bed_id,
    wb.room_number,
    wb.bed_label,
    wb.ward_type,
    wb.operational_status,
    wb.has_ventilator,
    wb.has_oxygen_port,
    wb.daily_tariff,
    d.dept_id,
    d.dept_code,
    d.dept_name,
    d.floor_number,
    a.admission_id,
    p.national_health_id,
    p.full_name AS current_patient_name,
    p.gender AS patient_gender,
    a.triage_priority,
    a.admission_time,
    doc.full_name AS attending_physician
FROM wards_beds wb
INNER JOIN departments d ON wb.dept_id = d.dept_id
LEFT JOIN admissions a 
    ON wb.bed_id = a.bed_id 
    AND a.discharge_time IS NULL 
    AND a.admission_status = 'Admitted'
LEFT JOIN patients p ON a.patient_id = p.patient_id
LEFT JOIN doctors doc ON a.admitting_doctor_id = doc.doctor_id;

-- View 2: Pending Discharge and Clearance Ledger
CREATE OR REPLACE VIEW V_Pending_Discharge_Summary AS
SELECT 
    a.admission_id,
    p.national_health_id,
    p.full_name AS patient_name,
    wb.room_number || ' - ' || wb.bed_label AS bed_designation,
    a.admission_time,
    a.discharge_time,
    EXTRACT(DAY FROM (COALESCE(a.discharge_time, CURRENT_TIMESTAMP) - a.admission_time))::INT AS total_days_stayed,
    b.gross_amount,
    b.insurance_claim_approved,
    b.net_patient_payable,
    b.payment_status
FROM admissions a
INNER JOIN patients p ON a.patient_id = p.patient_id
INNER JOIN wards_beds wb ON a.bed_id = wb.bed_id
INNER JOIN billing b ON a.admission_id = b.admission_id
WHERE 
    a.admission_status = 'Discharged'
    AND b.payment_status IN ('Unpaid', 'Partially-Paid', 'Insurance-Pending');

-- View 3: Department Capacity & Real-Time Performance Ledger
CREATE OR REPLACE VIEW V_Department_Occupancy_Summary AS
SELECT 
    d.dept_id,
    d.dept_code,
    d.dept_name,
    d.floor_number,
    COUNT(wb.bed_id) AS total_beds,
    COUNT(wb.bed_id) FILTER (WHERE wb.operational_status = 'Occupied') AS occupied_beds,
    COUNT(wb.bed_id) FILTER (WHERE wb.operational_status = 'Available') AS available_beds,
    COUNT(wb.bed_id) FILTER (WHERE wb.operational_status = 'Sanitizing') AS sanitizing_beds,
    COALESCE(
        ROUND(
            (COUNT(wb.bed_id) FILTER (WHERE wb.operational_status = 'Occupied')::NUMERIC / 
            NULLIF(COUNT(wb.bed_id), 0)) * 100.0, 
            1
        ), 
        0.0
    ) AS occupancy_rate_pct
FROM departments d
LEFT JOIN wards_beds wb ON d.dept_id = wb.dept_id
GROUP BY d.dept_id, d.dept_code, d.dept_name, d.floor_number;

-- ============================================================================
-- 4. PL/pgSQL FUNCTIONS, STORED PROCEDURES & TRIGGERS
-- ============================================================================

-- Function 1: Deterministic Real-Time Department Occupancy Calculation
CREATE OR REPLACE FUNCTION fn_get_department_occupancy_rate(p_dept_id INT)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total_beds INT := 0;
    v_occupied_beds INT := 0;
    v_occupancy_pct NUMERIC(5,2) := 0.00;
BEGIN
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE operational_status = 'Occupied')
    INTO 
        v_total_beds,
        v_occupied_beds
    FROM wards_beds
    WHERE dept_id = p_dept_id;

    IF v_total_beds = 0 THEN
        RETURN 0.00;
    END IF;

    v_occupancy_pct := ROUND((v_occupied_beds::NUMERIC / v_total_beds::NUMERIC) * 100.0, 2);
    RETURN v_occupancy_pct;
END;
$$;

-- Stored Procedure 1: Explicit Cursor-Driven Patient Discharge & Invoice Generation
CREATE OR REPLACE PROCEDURE sp_process_patient_discharge(
    p_admission_id INT,
    p_procedure_charges NUMERIC,
    p_pharmacy_charges NUMERIC,
    p_insurance_claim NUMERIC,
    p_discount_pct NUMERIC,
    p_payment_mode VARCHAR,
    INOUT p_bill_id INT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    cur_adm CURSOR(c_aid INT) FOR
        SELECT 
            a.admission_id,
            a.patient_id,
            a.bed_id,
            a.admission_time,
            a.admission_status,
            wb.daily_tariff
        FROM admissions a
        INNER JOIN wards_beds wb ON a.bed_id = wb.bed_id
        WHERE a.admission_id = c_aid
        FOR UPDATE OF a;

    rec_adm RECORD;
    v_stay_days INT;
    v_calculated_bed_charges NUMERIC(12,2);
    v_gross NUMERIC(12,2);
BEGIN
    OPEN cur_adm(p_admission_id);
    FETCH cur_adm INTO rec_adm;

    IF NOT FOUND THEN
        CLOSE cur_adm;
        RAISE EXCEPTION 'Discharge Error: Admission ID % does not exist.', p_admission_id
            USING ERRCODE = 'P0002';
    END IF;

    IF rec_adm.admission_status = 'Discharged' THEN
        CLOSE cur_adm;
        RAISE EXCEPTION 'Discharge Error: Admission % is already discharged.', p_admission_id
            USING ERRCODE = '22000';
    END IF;

    -- Calculate billable days (minimum 1 day policy)
    v_stay_days := GREATEST(
        1, 
        CEIL(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - rec_adm.admission_time)) / 86400.0)::INT
    );
    v_calculated_bed_charges := v_stay_days * rec_adm.daily_tariff;

    -- Validate Insurance ceiling against Gross
    v_gross := v_calculated_bed_charges + p_procedure_charges + p_pharmacy_charges;
    IF p_insurance_claim > v_gross THEN
        CLOSE cur_adm;
        RAISE EXCEPTION 'Constraint Error: Insurance ($%) exceeds gross ($%).', p_insurance_claim, v_gross
            USING ERRCODE = '23514';
    END IF;

    -- Update Admission State
    UPDATE admissions
    SET 
        admission_status = 'Discharged',
        discharge_time = CURRENT_TIMESTAMP
    WHERE admission_id = rec_adm.admission_id;

    CLOSE cur_adm;

    -- Insert Finalized Invoice into Billing
    INSERT INTO billing (
        admission_id,
        bed_charges,
        clinical_procedure_charges,
        pharmacy_charges,
        insurance_claim_approved,
        discount_percentage,
        payment_status,
        settled_at
    ) VALUES (
        p_admission_id,
        v_calculated_bed_charges,
        p_procedure_charges,
        p_pharmacy_charges,
        p_insurance_claim,
        p_discount_pct,
        p_payment_mode,
        CASE WHEN p_payment_mode = 'Settled' THEN CURRENT_TIMESTAMP ELSE NULL END
    )
    RETURNING bill_id INTO p_bill_id;

    RAISE NOTICE 'Admission % successfully discharged. Bill #% generated.', p_admission_id, p_bill_id;
END;
$$;

-- Trigger Function: State-Synchronization & Transfer Audit
CREATE OR REPLACE FUNCTION trg_fn_sync_bed_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Scenario A: New Admission
    IF TG_OP = 'INSERT' THEN
        IF NEW.admission_status = 'Admitted' THEN
            UPDATE wards_beds 
            SET operational_status = 'Occupied' 
            WHERE bed_id = NEW.bed_id;
        END IF;
        RETURN NEW;

    -- Scenario B: Bed Transfer or Discharge Update
    ELSIF TG_OP = 'UPDATE' THEN
        -- Inter-Bed Transfer
        IF OLD.bed_id <> NEW.bed_id THEN
            UPDATE wards_beds 
            SET operational_status = 'Sanitizing' 
            WHERE bed_id = OLD.bed_id;

            UPDATE wards_beds 
            SET operational_status = 'Occupied' 
            WHERE bed_id = NEW.bed_id;

            INSERT INTO bed_transfer_audit (
                admission_id,
                previous_bed_id,
                new_bed_id,
                transfer_reason,
                transferred_at,
                transferred_by_user
            ) VALUES (
                NEW.admission_id,
                OLD.bed_id,
                NEW.bed_id,
                'Inter-Ward Clinical Reassignment',
                CURRENT_TIMESTAMP,
                CURRENT_USER
            );
        END IF;

        -- Discharge Finalization
        IF OLD.discharge_time IS NULL AND NEW.discharge_time IS NOT NULL THEN
            UPDATE wards_beds 
            SET operational_status = 'Sanitizing' 
            WHERE bed_id = NEW.bed_id;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$$;

-- Trigger Binding on Admissions
DROP TRIGGER IF EXISTS trg_admission_bed_sync ON admissions;
CREATE TRIGGER trg_admission_bed_sync
AFTER INSERT OR UPDATE ON admissions
FOR EACH ROW
EXECUTE FUNCTION trg_fn_sync_bed_status();

-- ============================================================================
-- VERIFICATION CONFIRMATION
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE 'hospital_db schema initialized successfully with all 8 tables, constraints, views, procedures, and seed records.';
END $$;
