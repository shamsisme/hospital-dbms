# Centralized Hospital Bed & Emergency Resource Management System (CHR-MS)

A full-stack, enterprise-grade clinical management dashboard built with **Next.js 14**, **React 18**, **Tailwind CSS**, and **Lucide Icons**, directly interfacing with local **PostgreSQL** (`hospital_db`) on `localhost:5432` using native node-postgres (`pg`) connection pooling.

---

## 🏥 Architecture & Tech Stack

- **Frontend & App Framework**: Next.js 14 (App Router) + React 18 + TypeScript
- **Styling**: Tailwind CSS + Custom Healthcare Tokens + Lucide React Icons
- **Database Driver**: Native `pg` (node-postgres) Connection Pool with parameterized queries (`$1, $2, ...`)
- **Database Engine**: PostgreSQL 18 on `localhost:5432` (`hospital_db`)
- **Constraint Safety**: Catching & formatting PostgreSQL exclusion constraints (`ex_no_double_bed_booking` - `23P01`), unique constraints (`23505`), and check constraints (`23514`) into real-time clinical alerts.

---

## 🚀 Getting Started (Quick Setup for Teammate / Evaluator)

### 1. Environment Setup

Copy `.env.example` to `.env.local` and set your local PostgreSQL password:
```bash
cp .env.example .env.local
```
Edit `.env.local` with your PostgreSQL password:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_LOCAL_PASSWORD
DB_NAME=hospital_db
DATABASE_URL=postgresql://postgres:YOUR_LOCAL_PASSWORD@localhost:5432/hospital_db
```

### 2. Install Dependencies & Initialize Database

Run the automated database setup script to create `hospital_db`, load the complete normalized schema (8 tables, GiST temporal exclusion constraints, views, triggers, stored procedures), and seed realistic clinical data:

```bash
# Install dependencies
npm install

# Run automated one-command database provisioning
npm run db:setup

# Start the Development Server
npm run dev
```

Visit the dashboard in your browser:
**`http://localhost:3000`**

---

## 🩺 Core Views Built

### 1. Bed Occupancy & Triage Dashboard (`/`)
- **Clinical Metric Cards**:
  - Total Physical Beds & Ready Sanitized Count
  - Currently Occupied Beds & Inpatient Census
  - Available ICU / Critical Beds
  - Critical Triage Count (ESI 1: Resuscitation & ESI 2: Emergent)
- **Visual Bed Grid**:
  - Interactive cards displaying Room Number, Bed Label, Ward Type (ICU / General / Pediatric / Semi-Private).
  - High-contrast equipment badges: Ventilator (`Wind`), O2 Port (`Gauge`), and Daily Tariff.
  - Operational Status Pills: `Available` (Emerald), `Occupied` (Rose), `Sanitizing` (Amber), `Out-Of-Service` (Slate).
  - Inpatient Card Details: Patient name, NHID, blood group, attending physician, length of stay, and diagnosis.
  - Interactive Action Buttons:
    - **Admit Patient Here** (Available)
    - **Discharge & Bill** (Occupied)
    - **Mark Cleaned & Available** (Sanitizing)
- **Filters**:
  - Department dropdown filter
  - Operational status filter pills (All, Available, Occupied, Sanitizing)
  - Ward type filter (ICU, General, Pediatric, Semi-Private)
  - Real-time room / bed / patient search

### 2. Emergency Admission Desk (`/admissions`)
- **Intake Form**:
  - **Select Patient**: Searchable dropdown of registered patients or click **`+ Quick-Register New Patient`** for rapid intake.
  - **Admitting Physician**: Filtered strictly by `is_on_duty = true` with consultation fees and department affiliations.
  - **Bed Dropdown**: Pre-populates 'Available' sanitized beds with room, label, ward type, tariff, and equipment badges.
  - **Emergency Severity Index (ESI) Slider**: Interactive 1–5 triage priority slider with clinical guidance:
    - `ESI 1`: Resuscitation (Immediate life-saving intervention)
    - `ESI 2`: Emergent (High risk, severe pain, or unstable vitals)
    - `ESI 3`: Urgent (Multiple clinical resources needed)
    - `ESI 4`: Less Urgent (Single resource needed)
    - `ESI 5`: Non-Urgent (Routine clinic care)
  - **Admission Diagnosis**: Clinical notes textarea.
- **Constraint Handling (`ex_no_double_bed_booking`)**:
  - Toggle **"Show Occupied Beds (Test Conflict)"** allows testing what happens if an occupied bed is selected.
  - Submitting an occupied bed triggers the PostgreSQL GiST exclusion constraint (`23P01`). The backend rolls back the transaction and returns a structured 409 error.
  - The UI catches this and displays a **prominent red error toast** and a **Clinical Alert Dialog** explaining the violation.

### 3. Patient Discharge & Billing Terminal (`/billing`)
- **Active Inpatients Census**:
  - Real-time census table displaying patient name, NHID, bed assignment, attending physician, admission date, and calculated length of stay (days and hours).
- **Discharge & Generate Bill Modal**:
  - Automatically calculates bed charges: `billable_days × daily_tariff`.
  - Input fields for **Clinical Procedure Charges** and **Pharmacy Charges**.
  - **Insurance Claim Approved** deduction input.
  - **Hospital Concession Discount Slider** (0% to 50% max, adhering to DB `chk_discount`).
  - Real-time billing summary:
    $$\text{Gross Amount} = \text{Bed} + \text{Procedures} + \text{Pharmacy}$$
    $$\text{Net Payable} = \text{Gross} - \text{Insurance} - (\text{Gross} \times \text{Discount}\%)$$
  - **Atomic Transaction**:
    1. Updates `admissions` status to `'Discharged'` and sets `discharge_time = CURRENT_TIMESTAMP`.
    2. Updates `wards_beds` status to `'Available'` (or `'Sanitizing'`).
    3. Inserts into `billing` table (with `gross_amount` and `net_patient_payable` computed by PostgreSQL generated columns).
- **Hospital Invoice Receipt**:
  - Generates official discharge clearance invoice with print-friendly layout.
  - Historical invoices tab to audit past bills.

### 4. Departmental Capacity & Analytics (`/analytics`)
- **SQL Aggregate Summary Table**:
  - Shows department-wise bed occupancy rate %, active admissions, gross revenue billed, net patient collections, and on-duty physician staffing.
  - Dynamic progress bars with threshold color coding (>80% warning).
- **Specialty Ward Breakdown**:
  - ICU vs General vs Pediatric vs Semi-Private distribution, ventilator counts, and average tariffs.
- **KPI Summary Cards**:
  - Hospital-wide occupancy %, total inpatients, gross billed, and net collections.

---

## 🔌 REST API Endpoints

All endpoints use parameterized queries (`$1, $2`) via `lib/db.ts`:

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stats` | High-level clinical dashboard metric counts |
| `GET` | `/api/beds` | Bed inventory with active admission & department joins (`?dept_id=&status=&ward_type=&search=`) |
| `PATCH` | `/api/beds/[id]` | Update bed operational status (e.g. Sanitizing -> Available) |
| `GET` | `/api/departments` | Department listings and bed capacity counts |
| `GET` | `/api/doctors` | Doctor directory (`?on_duty=true`) |
| `GET` | `/api/patients` | Patient directory and active admission check (`?q=`) |
| `POST` | `/api/patients` | Rapid emergency patient intake registration |
| `GET` | `/api/admissions` | Admissions list (`?status=Admitted&q=`) |
| `POST` | `/api/admissions` | Atomic admission creation with `ex_no_double_bed_booking` conflict detection |
| `GET` | `/api/billing/active` | Active inpatients with calculated stay days and tariff estimates |
| `POST` | `/api/billing/discharge` | Atomic discharge, bed release, and billing invoice generation |
| `GET` | `/api/billing/invoices` | Past and settled billing invoices |
| `GET` | `/api/analytics` | Departmental capacity, occupancy %, and revenue SQL aggregates |

---

## 🔒 Database Integrity & Safety Features

1. **Exclusion Constraint**: `ex_no_double_bed_booking EXCLUDE USING gist (bed_id WITH =, stay_duration_range WITH &&)` ensures that no two admissions can ever overlap on the same physical bed.
2. **Critical Care Equipment Check**: `chk_critical_infra` ensures all ICU and CCU beds must have `has_ventilator = true` and `has_oxygen_port = true`.
3. **Billing Stored Generated Columns**: `gross_amount` and `net_patient_payable` are computed automatically by PostgreSQL.
4. **Settled Timestamp Consistency**: `chk_settled_time` requires non-null `settled_at` only when `payment_status = 'Settled'`.
5. **SQL Injection Prevention**: 100% of queries use `$1, $2, ...` prepared statements.
