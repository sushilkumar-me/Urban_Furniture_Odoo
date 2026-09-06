# 🪑 Urban Furniture ERP

[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB.svg?logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.21-646CFF.svg?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1.svg?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0.30-D71F00.svg?logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?logo=python&logoColor=white)](https://www.python.org/)
[![Pytest](https://img.shields.io/badge/Tests-22%20Passed-brightgreen.svg?logo=pytest&logoColor=white)](https://docs.pytest.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> **Urban Furniture ERP** is a modern, modular, production-grade Enterprise Resource Planning (ERP) and Accounting solution tailored for custom furniture manufacturers, interior design firms, and commercial furniture enterprises.  
> Inspired by **Odoo Enterprise**, it bridges the gap between commercial operations (Sales, Purchasing, Inventory) and financial governance (Double-Entry Bookkeeping, Managerial Cost Centers, and Real-Time Portals for Customers and Vendors).

---
![Database Schema ERD Diagram](<img width="4257" height="2533" alt="db" src="https://github.com/user-attachments/assets/171844fa-8de9-49a8-8eae-eee103b25494" />)
*Figure 2: 17-Table Enterprise Relational Architecture (Excalidraw Design).*
<img width="4257" height="2533" alt="db" src="https://github.com/user-attachments/assets/205a8fa8-39d5-48d7-ba8e-c8a77580e160" />

## 📸 Application Showcase

<!-- ================================================================= -->
<!-- USER SCREENSHOT PLACEHOLDER: ATTACH YOUR PROJECT SCREENSHOT HERE  -->
<!-- Replace the path below with your image file (e.g. ./docs/screenshots/dashboard.png) -->
<!-- ================================================================= -->
<img width="1919" height="914" alt="image" src="https://github.com/user-attachments/assets/7c9ce735-ea0b-42a2-ab52-4dab5dbf3ebd" />
<img width="1918" height="907" alt="image" src="https://github.com/user-attachments/assets/7b8c9e56-c294-4783-8d53-0097619cb4c4" />
<img width="1919" height="916" alt="image" src="https://github.com/user-attachments/assets/6b0ed0bd-14c4-4a77-94e3-844745db43b2" />
<img width="1919" height="923" alt="image" src="https://github.com/user-attachments/assets/46985f38-b5e9-46c7-8c97-5cde5413c6de" />
<img width="1919" height="918" alt="image" src="https://github.com/user-attachments/assets/60060188-4d83-4dfa-8eed-af3f146a72c2" />
<img width="1919" height="914" alt="image" src="https://github.com/user-attachments/assets/2adcc42c-b0db-458d-b1c8-b0efe75b8aaa" />


---

## 🗄️ Database Architecture (Entity Relationship Diagram)

The system is powered by a **fully normalized 3rd Normal Form (3NF)** relational database schema consisting of **17 interconnected tables** with strict referential integrity, cascade policies, and foreign key constraints.

<!-- ================================================================= -->
<!-- USER SCREENSHOT PLACEHOLDER: ATTACH YOUR DATABASE SCHEMA HERE     -->
<!-- Replace the path below with your Excalidraw / DB schema screenshot -->
<!-- ================================================================= -->


### 🧱 Core Relational Architecture (17 Tables)

```
┌──────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│     Contacts     │──1:M──│    Purchase Orders     │──1:M──│  Purchase Order Items  │
│ (Customer/Vendor)│       │(Vendor, Status, Total) │       │(Product, Analytics,Qty)│
└────────┬─────────┘       └───────────┬────────────┘       └────────────────────────┘
         │                             │ 1:1
         │                             ▼
         │                 ┌────────────────────────┐       ┌────────────────────────┐
         │                 │      Vendor Bills      │──1:M──│        Payments        │
         │                 │(Bill#, Dates, Due Date)│       │ (Send / Receive, Bank) │
         │                 └────────────────────────┘       └───────────▲────────────┘
         │                                                              │ 1:M
         │                 ┌────────────────────────┐                   │
         └─────────1:M────►│      Sales Orders      │──1:M──┌───────────┴────────────┐
                           │ (Customer, Date, Total)│       │   Customer Invoices    │
                           └───────────┬────────────┘       │(Invoice#, Date, Status)│
                                       │ 1:M                └────────────────────────┘
                                       ▼                                ▲ 1:1
                           ┌────────────────────────┐                   │
                           │   Sales Order Items    │───────────────────┘
                           │ (Product, Analytic, Qty│
                           └────────────────────────┘

┌────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│   Chart of Accounts    │──1:M──│        Journals        │──1:M──│    Journal Entries     │
│ (Asset, Liab, Inc, Exp)│       │(Bank, Cash, Sale, Purch│       │ (Draft/Posted, Balances│
└───────────┬────────────┘       └────────────────────────┘       └───────────┬────────────┘
            │                                                                 │ 1:M
            └───────────────────────1:M───────────────────────────────────────▼
                                                      ┌────────────────────────┐
                                                      │  Journal Entry Items   │
                                                      │ (Debit = Credit Ledger)│
                                                      └────────────────────────┘

┌────────────────────────┐       ┌────────────────────────┐       ┌────────────────────────┐
│       Categories       │──1:M──│        Products        │       │   Analytic Accounts    │
│(Raw Material, Finished)│       │(Sales Price, Cost,Type)│       │(Projects, Cost Centers)│
└────────────────────────┘       └────────────────────────┘       └───────────┬────────────┘
                                                                              │ 1:M
                                                                              ▼
                                                                  ┌────────────────────────┐
                                                                  │        Budgets         │
                                                                  │(Planned vs Achieved,Rev│
                                                                  └────────────────────────┘
```

---

## 🌟 Key Enterprise Features & Modules

### 1. 🛡️ Role-Based Access Control (RBAC) & Multi-User Portals
* **Administrator**: Complete control over system configuration, user provisioning (`/register`), master data, and financial locks.
* **Chief Accountant**: Full operational authority over accounts, journal entries, reconciliations, vendor payments, and statutory financial statements.
* **Customer Self-Service Hub (`/customer-dashboard`)**:
  * Real-time visibility into issued customer invoices and outstanding balances.
  * Instant **"Pay Now"** portal settlement feature.
  * Payment history with downloadable receipts.
* **Supplier & Vendor Account Hub (`/vendor-dashboard`)**:
  * Track purchase orders and bill status (`Draft` $\rightarrow$ `Posted` $\rightarrow$ `Paid`).
  * Live monitoring of pending balances and cleared settlements.

### 2. 🛒 Sales & Customer Invoicing (Order-to-Cash)
* **Sales Order Lifecycle**: Draft $\rightarrow$ Confirmed $\rightarrow$ Invoiced $\rightarrow$ Cancelled.
* **Line Item Cost Tagging**: Every product line item links to **Budget Analytics** to track project revenues automatically.
* **One-Click Invoicing**: Direct transition from confirmed Sales Order to Customer Invoice.
* **Dynamic Customer Portal Sync**: Posting an invoice immediately updates the customer's portal balance in real-time.

### 3. 🚚 Procurement & Vendor Billing (Procure-to-Pay)
* **Purchase Order Lifecycle**: Manage purchase quotations, negotiate prices, and confirm orders with suppliers.
* **Vendor Bill 3-Way Matching**: Generate vendor bills directly from confirmed POs with inherited lines and analytics.
* **Smart Payment Disbursement**:
  * Dedicated payment confirmation modal with **Partner**, **Payment Type (`Send`)**, and **Payment Method** selection.
  * **Auto-Generated Official Payment Voucher / Receipt** with printable company header, transaction ID, and official signature block.

### 4. ⚖️ Treasury, Payments & Double-Entry Ledger
* **Unified Payments Engine**: Handles both incoming customer collections and outgoing vendor disbursements through cash, bank transfers, cheques, or UPI.
* **Strict Double-Entry Enforcement**:
  * Journal entries enforce the golden accounting rule: **$\sum \text{Total Debits} = \sum \text{Total Credits}$**.
  * Real-time visual balance indicator (**`Balanced ⚖️`** vs. **`Unbalanced`** difference warning).
  * Minimum 2-row validation with mutual exclusivity between Debit and Credit fields.
* **Audit-Proof Posting**: Moves from `Draft` to `Posted`, locking entries permanently into the General Ledger.

### 5. 📊 Managerial Accounting (Analytic Accounts & Budgets)
* **Cost & Profit Centers**: Segregate finances by **Projects** (e.g. *Executive Suite Turnkey*), **Departments** (e.g. *Assembly Workshop*), or **Product Lines** without cluttering the legal Chart of Accounts.
* **Financial Budgets**:
  * Set spending ceilings and revenue targets with specified start and end dates.
  * Dual view modes: **Table List View** and interactive **Kanban Board**.
  * **Budget Versioning / Revisions**: Native support for revising active budgets (creates versioned revisions linked back to original).
  * Live **Variance and Achievement tracking** feeding directly into executive charts.

### 6. 📈 Executive Dashboard & Financial Reports
* **Interactive Operations Dashboard**:
  * High-level KPI cards for Total Revenue, Total Purchases, Net Profit, and Open Bills/Invoices.
  * Interactive Sales vs. Purchase Analytics charts.
  * Live clickable Budget Reports (Total Budgets, Achieved, Committed) linking directly to filtered views.
  * Live feed of recent multi-document transactions.
* **Statutory Financial Reports (`/reports`)**:
  * **Profit & Loss (P&L)**: Categorized breakdown of Income vs. Expenses with Gross and Net Margins.
  * **Balance Sheet**: Assets vs. Liabilities + Equity.
  * **Trial Balance**: Account-by-account debit and credit reconciliation.

---

## ⚡ Real-Time Multi-Window Demonstration Flow

The application features seamless data scoping based on the authenticated user's registered email:

```
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│  WINDOW 1: Regular Chrome (Accountant) │       │  WINDOW 2: Incognito (Customer/Vendor)│
├──────────────────────────────────────┤       ├──────────────────────────────────────┤
│ 1. Creates Sales Order for Customer  │       │ 2. Customer Dashboard initially shows│
│ 2. Confirms SO & Posts Invoice       │       │    Outstanding Due = ₹0.00           │
│                                      │──────►│ 3. REFRESH: Outstanding Due instantly│
│                                      │       │    updates to Invoice Amount!        │
│ 4. Receives Payment (or Pay Now)     │──────►│ 5. REFRESH: Due drops to ₹0.00,      │
│                                      │       │    status turns to PAID (Green Badge)│
└──────────────────────────────────────┘       └──────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies | Description |
| :--- | :--- | :--- |
| **Backend Framework** | **FastAPI** (Python 3.11+) | High-performance asynchronous REST API with automatic OpenAPI (Swagger) generation. |
| **Database & ORM** | **PostgreSQL** + **SQLAlchemy 2.0** | Robust relational persistence, strict FK constraints, indexed lookups, and ORM cascading. |
| **Data Validation** | **Pydantic v2** + **pydantic-settings** | Type-safe request/response schemas and environment configuration parsing. |
| **Security & Auth** | **PassLib (Bcrypt)** + **Python-JOSE (JWT)** | Secure salted password hashing and stateless token-based RBAC authentication. |
| **Testing** | **Pytest** + **HTTPX** | Comprehensive automated end-to-end integration test suite (**22/22 tests passing**). |
| **Frontend Core** | **React 18** + **Vite 5** | Lightning-fast HMR, component-driven UI architecture, and modern ES build tooling. |
| **Routing & State** | **React Router DOM v6** | Client-side routing with role-protected route guards (`ProtectedRoute`). |
| **Styling & Design** | **Modern Vanilla CSS** | Enterprise dark/light design system, glassmorphism, responsive data tables, and micro-interactions. |
| **HTTP Client** | **Axios** | Interceptor-enabled client handling automatic JWT header injection and global error catching. |

---

## 🚀 Quick Start Guide

### Prerequisites
* **Python**: `v3.11` or higher
* **Node.js**: `v18` or `v20` LTS
* **PostgreSQL**: `v14` or higher installed and running

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/urban-furniture-odoo.git
cd urban-furniture-odoo
```

---

### Step 2: Backend Setup
1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables in `backend/.env`:
   ```ini
   APP_NAME="Urban Furniture Accounting System"
   APP_VERSION="1.0.0"
   DEBUG=True
   DATABASE_URL="postgresql://postgres:password@localhost:5432/urban_furniture_db"
   SECRET_KEY="your-super-secret-jwt-key"
   ALGORITHM="HS256"
   ACCESS_TOKEN_EXPIRE_MINUTES=480
   ```
5. Seed demonstration data (Generates 17-table relational dataset):
   ```bash
   python seed_data.py
   ```
6. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   * Backend API: `http://127.0.0.1:8000`
   * Interactive Swagger Docs: `http://127.0.0.1:8000/docs`

---

### Step 3: Frontend Setup
1. Open a new terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   * Frontend Application: `http://localhost:5173`

---

## 🔑 Pre-Seeded Demonstration Accounts

All demonstration accounts are pre-configured in the database for presentation and evaluation:

| Role | Login ID / Email | Password | Assigned Dashboard | Primary Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **🛡️ Administrator** | `admin` | `Password123!` | `/dashboard` | User provisioning, master controls, full system access |
| **📊 Chief Accountant** | `ramesh_ca` | `Password123!` | `/dashboard` | Journals, GL, invoices, bills, budgets, financial reports |
| **🛒 Registered Customer** | `NIMESH001` *(nimesh@pathak.com)* | `password123` | `/customer-dashboard` | View customer invoices, pay balances, download receipts |
| **🚚 Registered Vendor** | `AZURE001` *(azure@furniture.com)* | `password123` | `/vendor-dashboard` | View purchase bills, track settlement status, review vouchers |

---

## 🧪 Testing & Validation

The codebase includes an automated test suite covering authentication, RBAC boundaries, order lifecycles, and financial reconciliations.

```bash
# Run full backend test suite
cd backend
pytest tests/ -q

# Expected Output:
# ============================== 22 passed in 7.44s ==============================
```

```bash
# Verify frontend production bundle
cd frontend
npm run build

# Expected Output:
# ✓ built in 1.5s
```

---

## 📁 Repository Directory Structure

```
Urban_Furniture_Odoo/
├── docs/
│   └── screenshots/              # Store your project & schema screenshots here
│       ├── project_dashboard.png
│       └── database_schema_erd.png
├── backend/
│   ├── app/
│   │   ├── models/               # 17 SQLAlchemy ORM database models
│   │   ├── routers/              # Modular FastAPI route controllers
│   │   ├── schemas/              # Pydantic request/response validation schemas
│   │   ├── services/             # Transactional business logic & calculations
│   │   ├── config.py             # App settings & environment loading
│   │   ├── database.py           # Engine & SessionLocal setup
│   │   └── main.py               # FastAPI application entrypoint
│   ├── tests/                    # 22 automated integration test suites
│   ├── seed_data.py              # Relational seeding engine with Faker
│   ├── requirements.txt          # Python dependencies
│   └── .env                      # Environment configuration
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable UI components (Layout, ProtectedRoute, Modals)
│   │   ├── pages/                # 21 Application views & role portals
│   │   ├── api.js                # Axios instance with JWT interceptor
│   │   ├── App.jsx               # Role-based route definitions
│   │   └── main.jsx              # React root entrypoint
│   ├── package.json              # Frontend dependencies and scripts
│   └── vite.config.js            # Vite configuration
└── README.md                     # Enterprise documentation
```

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👥 Authors & Acknowledgments

* **Urban Furniture ERP Engineering Team**
* Inspired by the modular design patterns and double-entry accounting standards of **Odoo Community & Enterprise**.
