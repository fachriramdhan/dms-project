# 📘 Document Management System (DMS) with Approval Workflow

DMS adalah aplikasi pengelolaan dokumen berbasis web yang dirancang dengan fokus pada keamanan data dan integritas workflow. Sistem ini memastikan setiap tindakan kritis pada dokumen melalui proses verifikasi oleh Administrator.

---

## 📸 App Preview

|              User Dashboard               |         Admin Approval Console          |
| :---------------------------------------: | :-------------------------------------: |
| ![Dashboard](./screenshots/dashboard.png) | ![Approval](./screenshots/approval.png) |

|            Login Page             |              Register Page              |
| :-------------------------------: | :-------------------------------------: |
| ![Login](./screenshots/login.png) | ![Register](./screenshots/register.png) |
|     _Secure JWT-based login_      |         _New user registration_         |

---

## 🔄 System Flowchart

Visualisasi alur kerja dari sisi User hingga keputusan Admin:

```mermaid
graph TD
    A[USER LOGIN] --> B[Dashboard]
    B --> C[Upload]
    B --> D[Search]
    B --> E[View Detail]

    E --> F[Request Replace]
    E --> G[Request Delete]

    F --> H[Create Approval Entry]
    G --> H

    H --> I[Notify Admin]
    I --> J[Admin Reviews]

    J --> K[Approve]
    J --> L[Reject]

    K --> M[Notify User]
    L --> M

    C --> N[Document Active]
    M --> N
```

🏗️ Project Structure
Proyek ini menggunakan arsitektur monorepo sederhana yang memisahkan Backend dan Frontend dengan jelas:

dms-project/
├── backend/ # NestJS API (Enterprise Level)
│ ├── src/
│ │ ├── auth/ # Authentication & Security Guard
│ │ ├── users/ # User management
│ │ ├── documents/ # Core Document management
│ │ ├── approvals/ # Workflow approval engine
│ │ ├── notifications/ # Real-time event notifications
│ │ ├── storage/ # Abstracted File storage service
│ │ ├── common/ # Shared utilities & interceptors
│ │ └── database/ # TypeORM configuration
│ └── uploads/ # Document physical storage
└── frontend/ # React + Vite (Modern UI)
├── src/
│ ├── components/ # Reusable UI components
│ ├── pages/ # View/Page modules
│ ├── services/ # Axios API integrations
│ ├── hooks/ # Custom business logic hooks
│ └── contexts/ # Global state (Auth & Theme)

🗄️ Database Schema
Relasi database dirancang untuk mendukung audit trail dan sinkronisasi status dokumen:

USERS (Master Data)
├── id (UUID) | email | password (Bcrypt) | fullName | role (USER/ADMIN)

DOCUMENTS (File Metadata)
├── id (UUID) | title | description | documentType | fileUrl | fileName
├── fileSize | version (Optimistic Lock) | status (ACTIVE/PENDING/DELETED)
└── createdBy (FK to USERS)

APPROVALS (Workflow Tracking)
├── id (UUID) | type (DELETE/REPLACE) | status (PENDING/APPROVED/REJECTED)
├── reason | adminComment | documentId (FK) | requestedBy (FK) | reviewedBy (FK)

NOTIFICATIONS (Alert System)
├── id (UUID) | type | title | message | isRead | userId (FK)

🛠️ Installation & Setup

1. Database Setup
   Buat database MySQL bernama dms_project.

2. Backend Setup
   cd backend
   npm install

# Buat file .env dan sesuaikan DB_HOST, DB_USER, DB_PASS

npm run start:dev

3. Frontend Setup
   cd frontend
   npm install
   npm run dev

🚀 Key Technical Highlights

1. Optimistic Locking: Implementasi kolom version pada dokumen untuk mencegah race condition.
2. Role-Based Access Control (RBAC): Proteksi endpoint menggunakan JWT Guard sesuai peran User/Admin.
3. Real-time Notification: Mekanisme polling (extensible to WebSocket) untuk update status approval.
4. Security: Hashing Bcrypt untuk kredensial dan UUID untuk identitas unik data.
