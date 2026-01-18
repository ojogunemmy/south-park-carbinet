# Cabinet Business Management Platform
## Project Requirements & Specifications

**Project Status:** MVP Development Phase  
**Last Updated:** December 2025  
**Client:** South Park Cabinets (Cabinet Manufacturing Business)  
**Current Environment:** Development with localStorage (single-user prototype)

---

## 📌 Executive Summary

South Park Cabinets is replacing scattered spreadsheets and manual note-taking with a modern web application to manage:
- **Employees**: Track payroll, payments, and attendance
- **Contracts**: Manage client jobs, deposits, payment schedules, and costs
- **Bills**: Track vendor expenses and company spending
- **Materials**: Maintain cabinet material inventory and supplier pricing
- **Work Letters**: Generate employment documentation

The current prototype is fully functional with core features working. This document outlines the current state and future production requirements.

---

## 🎯 Business Objectives

1. **Eliminate Manual Spreadsheets**: Consolidate employee, contract, and bill data into one organized system
2. **Streamline Payroll**: Track weekly employee payments and payment history
3. **Improve Contract Management**: Record deposits, track payment milestones, and manage project timelines
4. **Expense Tracking**: Record all bills and expenses for reporting and tax purposes
5. **Professional Reports**: Generate invoices, contracts, checks, and payment reports
6. **Scalability**: Build a foundation that can grow with the business

---

## 👥 User Roles & Permissions

### **Admin (Owner)**
- Full access to all features
- Can create, edit, delete employees, contracts, bills, materials
- Access to settings and company information
- Can view all reports and analytics
- Can manage other users
- Can export data

### **Coworker/Manager** (Future Role)
- View employees and payment history
- View contracts and payment schedules
- View bills and expenses
- Cannot delete data or access settings
- Limited to assigned contracts/employees
- Can view reports but cannot modify

### **Employee** (Future Enhancement)
- View own payment history
- View own work schedule
- Cannot access other employees or company data
- Cannot create or edit contracts

---

## ✅ Current Features (MVP - Complete & Working)

### **1. Employee Management**
- ✅ Add/edit employee information (name, position, hire date)
- ✅ Track weekly salary rates
- ✅ Payment method options:
  - Direct Deposit (with bank details)
  - Check (with check number)
  - Cash
  - ACH Transfer
  - Wire Transfer
- ✅ Payment status tracking (active, paused, leaving)
- ✅ Absence/deduction management
- ✅ Automatic weekly payment generation for entire year
- ✅ Payment history and past payments view
- ✅ Mark payments as paid with deductions
- ✅ Revert paid payments back to pending
- ✅ Remove/delete payments

### **2. Contract Management**
- ✅ Create contracts with client and project details
- ✅ Deposit tracking and remaining balance calculation
- ✅ Payment schedule with milestones (down, installments, final)
- ✅ Contract status: Pending, In-Progress, Completed
- ✅ Due date tracking with overdue alerts
- ✅ Material cost calculator
  - Select from predefined materials (from quotation)
  - Adjust quantities and pricing
  - Automatic cost calculations
- ✅ Labor cost calculator (daily, monthly, or manual)
- ✅ Miscellaneous costs tracking
- ✅ Profit margin calculation
- ✅ Expense tracking per contract
- ✅ PDF generation and download
- ✅ Print checks for payments

### **3. Payment Processing**
- ✅ Weekly payment generation (automated)
- ✅ Payment status tracking (pending, paid, canceled)
- ✅ Payment method display with details:
  - Direct deposit account info (last 4 digits)
  - Check number
  - Bank name
- ✅ Deduction handling
- ✅ Mark all pending as paid (bulk action)
- ✅ Revert all paid to pending
- ✅ Payment filtering by status, employee, date range
- ✅ Overdue payment alerts
- ✅ Print PDF reports
- ✅ Remove individual payments

### **4. Bill Management**
- ✅ Record vendor bills and invoices
- ✅ Expense categories (Materials, Labor, Permits, Other)
- ✅ Payment status tracking
- ✅ Vendor information storage
- ✅ Invoice number and purchase date tracking
- ✅ Category-based reporting

### **5. Materials Catalog**
- ✅ 20 standard cabinet materials from Imeca Charlotte quotation
- ✅ Material codes and SKUs
- ✅ Category organization (Plywood, Lumber, Hardware, MDF, Drawer Parts)
- ✅ Unit pricing (actual from quotation)
- ✅ Supplier information (Imeca Charlotte)
- ✅ Add/edit/delete materials
- ✅ Filter by category
- ✅ CSV export
- ✅ Price range and average calculations

### **6. Work Letters**
- ✅ Generate work letters for employees
- ✅ Professional formatting
- ✅ Print and download
- ✅ Store generated documents

### **7. Settings & Administration**
- ✅ Company information (name, address, phone)
- ✅ Bank information (routing, account number)
- ✅ Check printing configuration
- ✅ Check number tracking
- ✅ User management (add coworkers, edit roles)
- ✅ Email and password management
- ✅ Delete user accounts

### **8. Reports & Exports**
- ✅ Payment reports (PDF)
- ✅ Contract reports (PDF)
- ✅ Check printing (PDF)
- ✅ Materials list (CSV export)
- ✅ Summary statistics and dashboards

---

## ❓ Developer's Questions - Answers

### **Q1: Who will use the app and what permissions should each role have?**

**A:** 
- **Owner/Admin**: Full system access. Can manage employees, contracts, bills, settings, and user accounts.
- **Coworkers**: Limited access (view-only in Phase 2). Current build is single-admin.
- **Employees**: Will have personal portal in Phase 2 (view own payments, work letters).

Current implementation has basic admin/coworker roles. Full RBAC is Phase 2.

---

### **Q2: For Employees, do you need time tracking/overtime, or only weekly fixed payments + payroll history?**

**A:** 
**Only weekly fixed payments** - no time tracking or overtime needed.

**Current implementation:**
- Each employee has a weekly salary rate
- System automatically generates payments for each week of the year
- Absences can be tracked with days-worked adjustments (e.g., if absent 2 days, pay is adjusted accordingly)
- Payment history is maintained with status tracking

No timesheets, clocking in/out, or overtime calculations needed at this time.

---

### **Q3: For Contracts, what statuses and payment rules do you follow?**

**A:** 
**Contract Status:** Pending → In-Progress → Completed

**Payment Rules:**
- **Deposit**: Usually 50% upfront (configurable per contract)
- **Milestones**: 2-3 payment installments based on project progress
- **Examples**:
  - 50% down, 25% first installment, 25% final (most common)
  - 40% down, 30% middle, 30% final
  - Custom splits allowed

**Current implementation:**
- ✅ Flexible payment schedule (user defines each milestone)
- ✅ Deposit tracking
- ✅ Overdue alerts
- ❌ Late fees: Not yet (Phase 2 feature)
- ❌ Automatic reminders: Not yet (Phase 2 feature)

---

### **Q4: For Bills, do you need recurring bills, receipt photo uploads, and categories for reporting/taxes?**

**A:** 
**Phase 1 (Current):**
- ✅ Basic bill tracking with vendor info
- ✅ Categories: Materials, Labor, Permits, Other
- ✅ Invoice numbers and dates
- ✅ Expense notes

**Phase 2 (Future):**
- ❌ Receipt photo uploads: Planned
- ❌ Recurring bills: Planned
- ❌ Tax category grouping: Can add
- ❌ Expense reports: Can add

---

### **Q5: Should the app work offline at job sites and sync later?**

**A:** 
**Not required.** The business operates from an office. The app is desktop/office-based.

**Future consideration:** If expansion to mobile/field work happens, offline-first design can be added (Phase 3+).

---

### **Q6: Do you want exports/integrations (QuickBooks, CSV/PDF invoices, payroll reports)?**

**A:** 
**Phase 1 (Current):**
- ✅ PDF exports: Payments, contracts, checks
- ✅ CSV exports: Materials list
- ✅ Print-ready formats: Checks, invoices, reports

**Phase 2 (Future):**
- ❌ QuickBooks API integration: Planned
- ❌ Advanced payroll reports: Planned
- ❌ Tax reporting (1099, W2 generation): Planned
- ❌ Email delivery: Planned

---

### **Q7: Are you starting from an existing app/database, or is this a fresh build?**

**A:** 
**Fresh build.** Currently:
- ✅ Working prototype with all core features
- ✅ Built with React + TypeScript + TailwindCSS
- ✅ Modern, maintainable codebase
- ✅ Using localStorage for data (single-user development)

**Production changes needed:**
- Database (Supabase, Neon, or AWS RDS PostgreSQL)
- User authentication (JWT, OAuth, or similar)
- API layer (REST or GraphQL)
- Multi-user support
- Data backup and security

---

## 🏗️ Technology Stack

### **Current (Development)**
- **Frontend**: React 18, TypeScript, TailwindCSS, Vite
- **Backend**: Express.js (minimal)
- **Storage**: localStorage (development only)
- **UI Library**: Radix UI + Lucide icons
- **PDF Generation**: jsPDF + html2canvas
- **State Management**: React hooks + Context API
- **Package Manager**: pnpm

### **Production Requirements**
- **Database**: PostgreSQL (Supabase recommended, or Neon)
- **Authentication**: Auth0, Supabase Auth, or Firebase
- **Backend**: Node.js/Express with proper API design
- **Hosting**: Netlify, Vercel, AWS, or cloud provider
- **Backup**: Daily automated backups
- **Security**: HTTPS, password hashing, role-based access control

---

## 📊 Data Models

### **Employee**
```
- ID, Name, Position, Weekly Rate
- Hire Date, Payment Status (active/paused/leaving)
- Payment Method (direct_deposit, check, cash, ach, wire)
- Bank Details (routing, account, account type)
- Payment History (generated automatically)
```

### **Contract**
```
- ID, Client Name, Project Name
- Client Contact Info (phone, email, address)
- Amount, Deposit, Balance Due
- Status (pending, in-progress, completed)
- Start Date, Due Date
- Payment Schedule (milestones with dates/amounts)
- Cost Tracking (materials, labor, misc)
- Expenses (vendor bills related to contract)
```

### **Payment**
```
- ID, Employee ID, Week Start/End
- Amount, Due Date, Status
- Payment Method, Bank Name, Account Last 4
- Check Number (if check payment)
- Deduction Amount, Paid Date
- Days Worked (for absence-adjusted payments)
```

### **Bill/Expense**
```
- ID, Vendor, Invoice Number
- Amount, Purchase Date, Category
- Description, Notes, Status
- Receipt File (Phase 2)
```

### **Material**
```
- ID, Code, Name, Category
- Unit Price, Unit Type (EA, SF, LF, etc.)
- Supplier Info (Imeca Charlotte)
- Description
```

---

## 🔄 Current Data Storage

**Development:** localStorage (in-browser)
**Data persists across sessions but limited to single browser**

### Sample localStorage Keys:
```
- "employees" → Employee array
- "employeeAbsences" → Absence/deduction array
- "companySettings" → Company & bank info
- "materials" → Materials catalog
```

**Production:** Will migrate to PostgreSQL database with proper schema.

---

## 🚀 Recommended Development Phases

### **Phase 1: Foundation (Current MVP - Complete)**
- ✅ Core features working
- ✅ User admin section
- ✅ Data entry and reporting

**Current Status:** 95% complete

### **Phase 2: Production Ready (1-2 months)**
- [ ] Database integration (Supabase or Neon)
- [ ] Proper user authentication
- [ ] Multi-user support
- [ ] Data validation (Zod schemas)
- [ ] Error handling & logging
- [ ] Backup & recovery system
- [ ] Receipt photo uploads
- [ ] Email notifications (payment reminders, invoices)
- [ ] Advanced reports (tax summaries, profit & loss)
- [ ] QuickBooks integration

### **Phase 3: Advanced Features (2-3 months)**
- [ ] Recurring bills automation
- [ ] Mobile-responsive design improvements
- [ ] Employee portal (view own payments)
- [ ] Calendar view of payments/deadlines
- [ ] SMS alerts for overdue payments
- [ ] API for third-party integrations
- [ ] Advanced analytics and dashboards

### **Phase 4: Scaling (Future)**
- [ ] Multiple office locations
- [ ] Mobile app for field teams
- [ ] Offline sync capability
- [ ] Advanced permissions (project managers, accountants)
- [ ] Client portal (view contract status/payments)
- [ ] Automated payroll processing

---

## 🔒 Security Requirements

**Phase 2 Priority:**
- [ ] HTTPS/TLS encryption (all data in transit)
- [ ] Password hashing (bcrypt, Argon2)
- [ ] JWT token authentication
- [ ] Session management
- [ ] Role-based access control (RBAC)
- [ ] Input validation & sanitization
- [ ] SQL injection prevention (ORM or parameterized queries)
- [ ] Rate limiting on API endpoints
- [ ] Audit logging (who did what, when)
- [ ] Data encryption at rest (optional but recommended)

---

## 📋 Success Criteria

### **MVP Success:**
- ✅ App prevents spreadsheet use
- ✅ All employees paid on time via app
- ✅ All contracts tracked from start to completion
- ✅ All bills recorded and categorized
- ✅ Reports generated automatically

### **Production Success:**
- Multiple users can use app simultaneously
- Data is secure and backed up
- System is reliable (99%+ uptime)
- Easy to add new employees/contracts
- Fast report generation
- No data loss or corruption

---

## 💼 Business Rules to Enforce

1. **Payments**: Cannot mark employee as paid twice in same week
2. **Contracts**: Cannot delete contract if payments have been made
3. **Bills**: Expense amount must be > 0
4. **Materials**: Unit prices must be positive
5. **Employees**: Cannot hire employee with past start date (should be today or future)
6. **Payment Status**: Pending → Paid → (cannot revert if other conditions)
7. **Contract Status**: Pending → In-Progress → Completed (cannot go backward)

---

## 📞 Communication & Next Steps

1. **Developer Onboarding**:
   - Access codebase and README.md
   - Review architecture in README
   - Set up development environment
   - Run tests and verify features work

2. **Database Design**:
   - Create PostgreSQL schema from data models above
   - Plan migration from localStorage to database
   - Design API endpoints

3. **Authentication**:
   - Select auth solution (Supabase, Auth0, Firebase, or custom)
   - Implement JWT tokens
   - Add role-based access control

4. **API Development**:
   - Create REST endpoints for CRUD operations
   - Implement validation and error handling
   - Add logging and monitoring

5. **Testing**:
   - Unit tests for business logic
   - Integration tests for API
   - E2E tests for critical workflows

6. **Deployment**:
   - Set up production environment
   - Configure database backups
   - Set up monitoring and alerting
   - Plan data migration strategy

---

## 📞 Contact & Questions

For clarifications or questions:
- **Owner**: Emmanuel Camarena
- **Current App**: Working prototype at https://cabinet-management-platform.app/
- **Tech Questions**: Refer to README.md for architecture details

---

## 📎 Appendix: Key Features Summary Table

| Feature | Phase 1 | Phase 2 | Status |
|---------|---------|---------|--------|
| Employee Management | ✅ | ✅ | Complete |
| Weekly Payments | ✅ | ✅ | Complete |
| Contract Tracking | ✅ | ✅ | Complete |
| Payment Schedules | ✅ | ✅ | Complete |
| Material Costs | ✅ | ✅ | Complete |
| Bill Tracking | ✅ | ✅ | Complete |
| PDF Reports | ✅ | ✅ | Complete |
| User Roles | Basic | RBAC | In Progress |
| Database | localStorage | PostgreSQL | Planned |
| Authentication | None | JWT | Planned |
| Multi-User | ❌ | ✅ | Planned |
| Email Notifications | ❌ | ✅ | Planned |
| Receipt Uploads | ❌ | ✅ | Planned |
| Mobile App | ❌ | ❌ | Phase 3+ |
| QuickBooks Integration | ❌ | ✅ | Planned |
| Tax Reports | ❌ | ✅ | Planned |

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Next Review**: After Phase 2 completion
