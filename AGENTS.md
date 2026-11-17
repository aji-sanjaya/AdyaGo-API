# FactoryHub-Go Rules & Knowledge Base

## CRITICAL RULES
1. **DATABASE IDEMPIERE (`100.103.195.31`): STRICTLY READ-ONLY**
   - **DILARANG KERAS** menambah, mengubah, atau menghapus tabel maupun kolom (NO DDL, NO `CREATE TABLE`, NO `ALTER TABLE`, NO `AutoMigrate`).
   - Sifat akses ke PostgreSQL iDempiere HANYA `SELECT`.
   - Jika membutuhkan tabel, kolom, atau view baru, **WAJIB informasikan kepada user**. User yang akan menambahkan secara manual di iDempiere.

2. **LANGUAGE PREFERENCE: ENGLISH ONLY**
   - All frontend pages, components, labels, placeholders, tooltips, toasts, and API error/success messages MUST be in **English only**, unless explicitly requested otherwise.

## ARCHITECTURE
- **Backend:** Go Lang (Gin) as REST API on `http://localhost:8080`
- **Database:** Direct PostgreSQL connection to iDempiere (`100.103.195.31:5432`)
- **API Engine:** iDempiere REST API (`https://adyago-idempiere-13.stampingadyawinsa.com/api/v1`)
- **Frontend:** React (Vite + Tailwind CSS) on `http://localhost:5173`

---

## REQUISITION APPROVAL CHAIN & AUTHORIZATION KNOWLEDGE BASE

### 1. Database Tables & Roles

#### A. Approval Matrix Definition (`ADW_RequisitionAuthorizer`)
Master configuration table that determines which users must approve a Purchase Requisition based on its Cost Center (`c_costcenter_id`).
- **Key Columns**:
  - `adw_requisitionauthorizer_id` (PK)
  - `c_costcenter_id` (FK to `c_costcenter` - matched against `m_requisition.c_costcenter_id`)
  - `ad_user_id` (FK to `ad_user` - assigned authorizer)
  - `sequence` (integer, e.g. 10, 20, 30 - determines approval order)
  - `name` (Function name e.g. `Checked By`, `Approved By`, `Legalized By`)
  - `isactive` (`'Y'` / `'N'`)

#### B. Requisition Approval Transaction (`ADW_RequisitionAuthorizerStatus`)
Custom transaction table tracking actual approval execution and sign-off timestamps for each Purchase Requisition.
- **Key Columns**:
  - `adw_requisitionauthorizerstatus_id` (PK)
  - `m_requisition_id` (FK to `m_requisition`)
  - `adw_requisitionauthorizer_id` (FK to master config)
  - `ad_user_id` (FK to `ad_user` - approver)
  - `sequence` (integer - sequence order)
  - `name` (Function name e.g. `Checked By`, `Approved By`, `Legalized By`)
  - `isapproved` (Status code: `'IP'` = In Progress / Pending, `'AP'` = Approved, `'RE'` = Rejected)
  - `created` & `createdby` (Creation audit)
  - `updated` & `updatedby` (Approval execution timestamp & actor)

### 2. Synchronization & Population Logic
- When a Purchase Requisition header is saved or created:
  1. System checks `ADW_RequisitionAuthorizer` for rows matching `m_requisition.c_costcenter_id`.
  2. System queries existing rows in `ADW_RequisitionAuthorizerStatus` for `m_requisition_id`.
  3. Any missing authorizers from the matrix are automatically inserted via iDempiere REST API (`ADW_RequisitionAuthorizerStatus`) with `isapproved = 'IP'` and initial status.
  4. Backend helper: `syncRequisitionAuthorizers` in `backend/internal/requisition/service.go`.

### 3. Frontend UI Specifications
- **Approval Tab (`ApprovalTab.jsx`)**:
  - Located on `CreateRequisitionPage.jsx` (`/create-pr?documentID=...`).
  - Card-based responsive grid (never use plain HTML tables for approval lists).
  - Displays:
    - Sequence badge (`Sequence #10`, etc.)
    - Function title (`Checked By`, `Approved By`, `Legalized By`)
    - Approver user details (`user_name`, `user_description`)
    - Status badge (`Approved` with green dot, `In Progress` with amber dot, `Rejected` with red dot)
    - Approval timestamp (`updated`)
  - Security note: Do NOT expose internal table names (e.g. `ADW_RequisitionAuthorizerStatus`) in user-facing UI labels.

### 4. Print Preview & PDF Generation Specifications
- **Generator**: `frontend/src/utils/requisitionPdfGenerator.js`
- **Top Header Box**:
  - Contains Document Meta (Left: Document No, Date, Status; Right: Cost Center, Date Required, Warehouse).
  - Contains full-width **Description / Note** row at the bottom of the header box with dynamic height wrapping.
  - No redundant "Note :" section after the line items table.
- **Footer Signature Section**:
  - Positioned at `sigBoxY = 252mm` (height `32mm`) above running footer (`y = 290mm`).
  - Table bottom margin is `46mm` so line items paginate before touching the footer signature block.
  - **Dynamic Signature Columns**:
    - **Column 1 ("Prepared by")**: Creator (`createdby`), creation date, and QR code.
    - **Columns 2..N**: Dynamic columns populated from `ADW_RequisitionAuthorizerStatus` sorted by `sequence ASC`:
      - Function title (`name`)
      - Signer name (underlined)
      - Dynamic verification QR code generated when status is approved (`AP`/`CO`) with timestamp
      - Red `REJECTED` or gray `PENDING` text when awaiting sign-off
    - Width is calculated dynamically: `186mm / total_columns`.

### 5. Guidelines for Upcoming Approval Module
- **Target Workflow**:
  - Approver dashboard/queue listing requisitions pending the logged-in user's approval (`isapproved = 'IP'` where `ad_user_id == current_user.id`).
  - Sequential approval enforcement: An approver with `sequence = 20` cannot approve until all prior sequence authorizers (`sequence = 10`) have `isapproved = 'AP'`.
  - Action execution:
    - Approving updates `ADW_RequisitionAuthorizerStatus`: sets `isapproved = 'AP'`, `updated = NOW()`, `updatedby = user_id`.
    - Rejecting updates `ADW_RequisitionAuthorizerStatus`: sets `isapproved = 'RE'`, `updated = NOW()`, `updatedby = user_id`.
  - When the final sequence is approved, transition `m_requisition.docstatus` to Completed (`'CO'`).


