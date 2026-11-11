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

