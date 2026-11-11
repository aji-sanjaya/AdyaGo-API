# AdyaGo (ERP System)

[![Go Version](https://img.shields.io/badge/Go-1.22+-00ADD8?style=flat&logo=go)](https://golang.org/)
[![React Version](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)]()

**AdyaGo** is an enterprise-grade ERP portal and API suite built with **Go (Gin)** and **React (Vite + Tailwind CSS)**, seamlessly integrated with **iDempiere ERP** through both direct PostgreSQL querying and official iDempiere REST API services.

---

## Architecture Overview

```
+-------------------------------------------------------+
|                 AdyaGo Web Frontend                  |
|       (React 18 + Vite + Tailwind CSS + Lucide)       |
|                 http://localhost:5173                 |
+---------------------------+---------------------------+
                            |
                     REST / JSON API
                            |
                            v
+-------------------------------------------------------+
|                  AdyaGo API Backend                   |
|                   (Golang + Gin)                      |
|                 http://localhost:8080                 |
+---------------------+-------------------+-------------+
                      |                   |
            Direct PostgreSQL (Read-Only) | iDempiere REST API (v1)
                      |                   | (Auth, Actions, Tokens)
                      v                   v
+-------------------------------------------------------+
|                    iDempiere ERP                      |
|        PostgreSQL Database (100.103.195.31:5432)       |
| REST API Engine (https://adyago-idempiere-13.stampingadyawinsa.com) |
+-------------------------------------------------------+
```

### Tech Stack

- **Backend:**
  - **Go 1.22+** with [Gin Web Framework](https://github.com/gin-gonic/gin)
  - **Database Connection:** `lib/pq` (PostgreSQL driver) strictly read-only access to iDempiere database
  - **HTTP Client:** Go `net/http` for communication with iDempiere REST API
  - **Architecture:** Clean layered architecture (`config`, `internal/{auth,notification,requisition}`)
- **Frontend:**
  - **React 18** with [Vite](https://vitejs.dev/)
  - **Styling:** [Tailwind CSS](https://tailwindcss.com/) with full Dark & Light mode support
  - **Icons:** [Lucide React](https://lucide.dev/)
  - **UI Components:** Custom React Select with dark mode styling, Custom Date Picker, Modal Portals
  - **Excel Processing:** `xlsx` library for client-side batch line item imports with real-time HUD progress
  - **Print / Export:** Dedicated modal print preview with printable documents

---

## Core Features

### 1. Two-Step Contextual Authentication
- **Step 1 - User Credentials:** Authenticates against iDempiere REST API (`POST /auth/tokens`) and queries `AD_User`.
- **Step 2 - Context Resolution:** Dynamically fetches accessible Tenants/Clients (`AD_Client`), authorized Roles (`AD_Role`, `AD_User_Roles`), Organizations (`AD_Org`, `AD_Role_OrgAccess`), and Warehouses (`M_Warehouse`).
- **Context Drawer:** Interactive user navbar dropdown displaying tenant, role, org, warehouse context with quick **Switch Role** and **Sign Out** actions.

### 2. Purchase Requisition (PR) Management
- **Dashboard & List View:** Searchable table with document status badges, line counters, and actions (View, Print Preview).
- **Header Details:** Compact, responsive form for General Information and Request Details (Client, Org, Warehouse, Price List, Cost Center, Dates, Priority).
- **Requisition Lines:**
  - Dynamic line item counter displayed directly in tab labels without needing to navigate into the tab first.
  - Detailed product, charge, quantity, and pricing lines.
  - **Batch Excel Import HUD:** Real-time upload feedback with row counters, live progress bar, and success/error metrics.
- **Print Preview Modal:** High-fidelity print preview with clean modal overlay, printer friendly formatting, and page control.
- **Audit Trails & Collaboration:** Change log tracking and contextual discussion feeds.

### 3. Notification Center
- Integrated with iDempiere `AD_Note` table.
- Navbar notification bell with live unread badge count.
- Interactive dropdown displaying latest active, unprocessed system notes with relative timestamps.

---

## Directory Structure

```
AdyaGo/
├── README.md               # Project documentation
├── AGENTS.md               # Architectural guidelines & agent rules
├── .gitignore              # Git ignore rules for Go, Node, and environments
│
├── backend/                # Go Backend REST API
│   ├── cmd/
│   │   └── server/         # Application entry point (main.go)
│   ├── config/             # Configuration & environment loader
│   ├── internal/           # Internal core packages
│   │   ├── auth/           # Authentication & context handlers/services
│   │   ├── notification/   # AD_Note notification handlers/services
│   │   └── requisition/    # Purchase requisition handlers/services
│   ├── .env.example        # Sample environment variables
│   ├── go.mod              # Go module definition
│   └── go.sum              # Go dependencies checksum
│
└── frontend/               # React Vite Frontend Application
    ├── public/             # Static assets and icons
    ├── src/
    │   ├── api/            # Axios / fetch client configurations
    │   ├── components/     # Reusable UI components
    │   ├── context/        # React context (AuthContext, ThemeContext)
    │   ├── layouts/        # Layout wrappers (ModuleLayout, Sidebar, Navbar)
    │   ├── pages/          # Application views (Auth, Home, Requisition)
    │   │   ├── auth/       # Step 1 & Step 2 Login views
    │   │   ├── home/       # Home dashboard
    │   │   └── requisition/# Purchase Requisition module
    │   ├── App.jsx         # App routes and providers
    │   └── main.jsx        # Frontend entry point
    ├── package.json        # Node dependencies and scripts
    ├── tailwind.config.js  # Tailwind CSS configuration
    └── vite.config.js      # Vite build configuration
```

---

## Getting Started

### Prerequisites

1. **Go:** Version 1.22 or higher ([Download Go](https://golang.org/dl/))
2. **Node.js:** Version 18.x or higher and `npm` ([Download Node.js](https://nodejs.org/))
3. **Network Access:** Connectivity to the iDempiere PostgreSQL database and iDempiere REST API.

---

### Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Copy the example environment file and configure your credentials:
   ```bash
   cp .env.example .env
   ```

3. Update the `.env` file with your configuration:
   ```env
   PORT=8080
   GIN_MODE=debug

   # iDempiere REST API
   IDEMPIERE_API_BASE_URL=https://adyago-idempiere-13.stampingadyawinsa.com/api/v1

   # iDempiere PostgreSQL Database (Strictly Read-Only)
   IDEMPIERE_DB_HOST=100.103.195.31
   IDEMPIERE_DB_PORT=5432
   IDEMPIERE_DB_USER=your_db_user
   IDEMPIERE_DB_PASSWORD=your_db_password
   IDEMPIERE_DB_NAME=idempiere
   IDEMPIERE_DB_SSLMODE=disable

   # Allowed CORS origins
   CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
   ```

4. Download dependencies and run the server:
   ```bash
   go mod download
   go run cmd/server/main.go
   ```
   The backend API will be available at: **`http://localhost:8080`**

---

### Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend application will run at: **`http://localhost:5173`**

4. Build for production:
   ```bash
   npm run build
   ```

---

## API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check endpoint |
| `POST` | `/api/v1/auth/login-step1` | Verify credentials & retrieve accessible roles/tenants |
| `POST` | `/api/v1/auth/login-step2` | Complete contextual login with tenant, role, org, warehouse |
| `GET` | `/api/v1/requisitions` | List purchase requisitions |
| `GET` | `/api/v1/requisition/:id` | Get requisition details by document ID |
| `GET` | `/api/v1/requisition/:id/lines` | Get line items for a requisition |
| `POST` | `/api/v1/requisition/create` | Create a new purchase requisition |
| `POST` | `/api/v1/requisition/lines/batch` | Batch insert/upload requisition lines |
| `GET` | `/api/v1/notifications` | Get active unread notifications (`AD_Note`) |

---

## Security & Database Guidelines

> [!IMPORTANT]
> **Strict Read-Only Database Access:**
> Direct connection to the PostgreSQL database is strictly configured for `SELECT` queries only. No DDL (`CREATE`, `ALTER`, `DROP`) or DML (`INSERT`, `UPDATE`, `DELETE`) operations are executed directly against the database. All state-changing operations are dispatched through the official iDempiere REST API engine.

---

## License

This software is proprietary and confidential. Unauthorized copying, distribution, or modification of this project via any medium is strictly prohibited.
