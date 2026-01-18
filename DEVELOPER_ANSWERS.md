# Cabinet Management Platform - Developer Q&A

**Project**: South Park Cabinets Business Management System  
**Owner**: Emmanuel Camarena  
**Date**: December 2025  
**Status**: MVP Complete, Ready for Production Phase

---

## Question 1: Database Recommendation

**Q: Should we use Supabase, Firebase, or another database?**

**A: Supabase (PostgreSQL) is the recommended choice for Phase 1.**

### Why Supabase?
- ✅ PostgreSQL (proven, reliable, cost-effective)
- ✅ Built-in authentication (Supabase Auth)
- ✅ Row-level security (RLS) for multi-user access control
- ✅ Real-time capabilities via Realtime subscription (future enhancement)
- ✅ Easy data migration from current localStorage
- ✅ RESTful API auto-generated from schema
- ✅ Good free tier for Phase 1/2 development
- ✅ Excellent documentation and community support

### Why NOT Firebase?
- ❌ Firestore is NoSQL (document-based, harder for relational data like contracts ↔ payments ↔ employees)
- ❌ Firebase pricing scales quickly with real-time reads
- ❌ Migration later would require complete rewrite
- ❌ Only consider Firebase if offline-first + heavy real-time collaboration becomes a priority (currently NOT a requirement)

### Alternative (Secondary Choice): Neon
- Similar to Supabase but Postgres-only
- Good if you want more database flexibility
- Less integrated auth solution (would need Auth0 or similar)

**Recommendation: Start with Supabase. It has everything out-of-the-box.**

---

## Question 2: Platform & Existing Codebase

**Q: What platform are we launching first (Android/iOS via Flutter, or web), and is there an existing codebase I should work from?**

**A: Web first. Existing React codebase ready to use.**

### Platform Strategy
- **Phase 1 (Launch)**: Web application only
- **Phase 2+**: Consider mobile app IF business expands to field teams
- **Technology**: React, NOT Flutter (current tech stack is React + TypeScript)

### Existing Codebase
✅ **You have a complete working prototype to build from:**

**Tech Stack:**
- Frontend: React 18 + TypeScript + Vite
- Backend: Express.js (minimal, for future API)
- UI: Radix UI primitives + TailwindCSS 3 + Lucide icons
- State Management: React hooks + Context API (excellent starting point)
- PDF: jsPDF + html2canvas
- Storage: Currently localStorage (will migrate to Supabase)

**Repository Structure:**
```
client/
  ├── pages/          # Route components (Employees, Contracts, Payments, Bills, Materials, etc.)
  ├── components/     # Reusable UI components
  │   └── ui/        # Radix UI + Tailwind components (Button, Card, Dialog, etc.)
  ├── App.tsx        # Router setup
  └── global.css     # Theme and Tailwind config

server/
  ├── index.ts       # Express setup (minimal, ready to expand)
  └── routes/        # API routes (to be built)

shared/
  └── api.ts         # Type definitions for client-server communication
```

**What's Already Working:**
- ✅ 8 functional pages (Dashboard, Employees, Contracts, Payments, Bills, Materials, Work Letters, Settings)
- ✅ Full CRUD operations for employees, contracts, bills, materials
- ✅ Automatic payment generation (weekly for entire year)
- ✅ Contract payment schedules with milestones
- ✅ Material cost calculator with 20 predefined items (actual from supplier quotes)
- ✅ Labor cost and miscellaneous tracking
- ✅ PDF generation (contracts, checks, reports)
- ✅ CSV export (materials list)
- ✅ Professional UI with charts and tables

**What You Need to Build (Phase 2):**
1. Database integration (Supabase migration)
2. User authentication (JWT tokens)
3. API layer (REST endpoints)
4. Multi-user support with role-based access
5. Data validation (Zod schemas)
6. Error handling and logging
7. Backup and recovery system

### Development Environment
```bash
# Install and run
pnpm install
pnpm dev           # Starts both client + server on port 8080
pnpm build         # Production build
pnpm test          # Run tests (Vitest)
```

---

## Question 3: Multi-User Access & Permissions

**Q: Do coworkers need view-only everywhere, or limited edits in specific areas? What should be blocked?**

**A: Limited edits with careful restrictions.**

### User Roles (Phase 2 Implementation)

#### **Owner/Admin**
- ✅ Full access to all features
- ✅ Create/edit/delete employees
- ✅ Create/edit/delete contracts
- ✅ Create/edit/delete bills
- ✅ Manage materials catalog
- ✅ Access settings and company info
- ✅ Manage user accounts and roles
- ✅ View all reports

#### **Coworker/Manager**
- ✅ **View** employees and payment history (read-only)
- ✅ **Mark payments as paid** (limited edit - workflow action)
- ✅ **Add bills** (limited edit - expense tracking)
- ✅ **View** contracts and payment schedules (read-only)
- ✅ **Generate reports** (read-only, for documentation)
- ❌ **Cannot delete** anything
- ❌ **Cannot edit** employee rates or contract amounts
- ❌ **Cannot access** settings or manage users
- ❌ **Cannot revert** paid payments (only admin can)
- ❌ **Cannot remove** payments

#### **Employee** (Future, Phase 3)
- ✅ View own payment history
- ✅ View own work letters
- ❌ Cannot access other employees' data
- ❌ Cannot see company financial data

### Permission Rules to Enforce
```
PAYMENTS:
  - Coworker: Can mark pending → paid
  - Coworker: Can add deductions
  - Admin only: Can revert paid → pending
  - Admin only: Can delete payments

CONTRACTS:
  - Coworker: Can view and download (read-only)
  - Coworker: Cannot edit amounts or dates
  - Admin only: Can create/edit/delete

BILLS:
  - Coworker: Can add new bills
  - Coworker: Can view bills (read-only)
  - Admin only: Can delete bills

MATERIALS:
  - All: Can view catalog
  - Admin only: Can add/edit/delete materials

SETTINGS:
  - Admin only: Full access
  - Coworker: No access

REPORTS:
  - All authenticated users: Can view and generate
  - Admin only: Download history and data exports
```

### Implementation Strategy
Use **Supabase Row-Level Security (RLS)** with policies:
```sql
-- Example: Coworkers can only mark payments as paid, not delete
CREATE POLICY "coworker_mark_paid"
  ON payments
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    status IN ('pending', 'paid') AND
    -- prevent changing amount
    amount = (SELECT amount FROM payments WHERE id = payments.id)
  );

CREATE POLICY "admin_full_access"
  ON payments
  USING (role = 'admin');
```

---

## Question 4: Multi-Company Support

**Q: Do you need multi-company support later? Single or multiple from day one?**

**A: Single-company in Phase 1. Multi-company in Phase 3+**

### Phase 1 (Current - Single Company)
- One company: "South Park Cabinets"
- One admin user (Emmanuel)
- All data belongs to this company
- No "workspace" or "organization" concept needed yet

### Phase 2 (Multi-User, Still Single Company)
- Multiple users within South Park Cabinets
- All data still belongs to one company
- Users have different roles (Admin, Coworker)

### Phase 3+ (Multi-Company - If Business Expands)
If Emmanuel opens additional cabinet shops or branches later:
- Add `company_id` to all main tables (employees, contracts, bills, payments)
- Create company switching in UI
- Each company has separate financials, employees, contracts
- Share materials catalog across companies (optional)

**For Phase 1, don't add company_id fields.** Keep the schema simple:

```sql
-- Phase 1 Schema (Simple)
CREATE TABLE employees (
  id uuid PRIMARY KEY,
  name text,
  position text,
  weekly_rate decimal,
  ...
);

-- Phase 3+ Schema (Add company_id)
CREATE TABLE employees (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES companies(id),
  name text,
  position text,
  weekly_rate decimal,
  ...
);
```

**Data Isolation in Phase 2:**
Use RLS policies to ensure users only see their company's data (even though there's only one company, this structure helps Phase 3 migration).

---

## Question 5: Exact Weekly Workflows

**Q: What are the exact flows you do weekly: payroll, contract billing, bills?**

**A: Three distinct workflows, executed in this order:**

### Workflow 1: PAYROLL (Every Friday)
**Participants**: Owner (Emmanuel)

**Steps**:
1. Open "Payments" page
2. View all pending payments for the current week
3. For each pending payment:
   - Check if employee worked full week or had absences
   - Add deductions if any (sickness, injury, unpaid time off)
   - Mark payment as "Paid" (this updates the payment status and stores the paid date)
4. **Mark all as paid** (bulk action for employees with no deductions)
5. Print checks for employees receiving checks (using "Print PDF" for check format)
6. Record payment method and details:
   - Direct Deposit: Employee's bank details already stored
   - Check: Use check number from Settings
   - Cash: Just mark paid
7. Generate "Payment Report" (PDF) for weekly record-keeping

**Technical Implementation**:
- Payments are auto-generated weekly for the entire year on Day 1
- Each payment has fields: amount, status (pending/paid), due_date, days_worked, deductions
- Mark as paid stores: paid_date, deduction_amount, check_number (if applicable)

### Workflow 2: CONTRACT BILLING (As milestones are reached)
**Participants**: Owner (Emmanuel) + Project Managers (future coworkers)

**Steps**:
1. Open "Contracts" page
2. View active contracts and their payment schedules
3. When a milestone is reached (e.g., project 50% complete):
   - Update milestone status to "Completed"
   - Generate invoice for that milestone (PDF)
   - Send to client (or Emmanuel collects payment manually)
4. Track payments received:
   - Update payment schedule with "Paid" status and received date
   - Remaining balance updates automatically
5. When final payment received:
   - Mark contract as "Completed"
   - Store project costs (materials + labor + misc)
   - Calculate profit margin

**Contract Payment Example**:
```
Project: Kitchen Cabinets for Johnson Family
Total Contract: $5,000
Deposit (50%): $2,500 ↓ (Received on Jan 5)
Milestone 1 (25%): $1,250 ↓ (Due when 50% built, Received on Jan 20)
Milestone 2 (25%): $1,250 ↓ (Due when 100% built, Received on Feb 2)
Status: Completed ✓
Profit: $1,200 (gross revenue - materials - labor costs)
```

**Technical Implementation**:
- Contract has status: Pending → In-Progress → Completed
- Payment schedule is array of milestones: { amount, description, due_date, status, paid_date }
- Materials, labor, misc costs are stored and summed for profit calculation

### Workflow 3: BILLS/EXPENSES (As invoices arrive)
**Participants**: Office manager or Emmanuel

**Steps**:
1. Open "Bills" page
2. When invoice arrives from supplier (Imeca Charlotte, lumber yards, hardware stores):
   - Create new bill entry
   - Enter vendor name, invoice number, amount, date
   - Select category: Materials, Labor, Permits, or Other
   - Add notes (e.g., "Lumber for Johnson kitchen project")
3. Optional: Attach bill to specific contract for cost tracking
4. Mark as paid when payment sent to vendor
5. Generate expense report (PDF) for accounting/taxes

**Bill Example**:
```
Vendor: Imeca Charlotte
Invoice: #2025-001234
Amount: $487.50
Category: Materials
Date: Dec 23, 2024
Notes: Plywood, drawer parts for Johnson project
Status: Pending payment
```

**Technical Implementation**:
- Bill has fields: vendor, invoice_number, amount, category, date, status, notes, contract_id (optional)
- Categories: "Materials", "Labor", "Permits", "Other"
- Can filter and report by category for tax purposes

---

## Question 6: Must-Have Outputs for Launch

**Q: What are must-have outputs: invoices/receipts, PDF/CSV, QuickBooks integration?**

**A: PDF and CSV are essential. QuickBooks can wait.**

### Phase 1 (MUST HAVE)
✅ **PDF Exports** (currently working):
- Payment reports (weekly/monthly)
- Check printing (formatted for printer)
- Contract invoices/milestones
- Work letters
- Bill reports by category

✅ **CSV Exports** (currently working):
- Materials catalog (for re-ordering, supplier communication)
- Payment history (for import to Excel/accounting)
- Contract list with financial summaries
- Bill list by category

### Phase 2 (Nice to Have)
❌ QuickBooks API integration
- Option A: Generate CSV compatible with QB import
- Option B: Direct API sync (requires QB Online subscription)
- Decision: Start with CSV export, add API later if Emmanuel subscribes

❌ Email delivery of reports
- Example: Send payment report to accounting email weekly
- Implementation: Add Supabase Functions + SendGrid/Resend

❌ Advanced tax reports
- 1099 forms (if contractors used)
- W-2 summaries (if required by jurisdiction)
- Quarterly payroll reports

### Phase 3+ (Future)
❌ Client portal (clients see contract status, invoices, and payment schedule online)
❌ Employee portal (employees see own payment history, request time off)
❌ Automated invoice delivery to clients
❌ Recurring invoice templates

---

## Implementation Priority for Phase 2

### Week 1-2: Foundation
- [ ] Set up Supabase project
- [ ] Create database schema from localStorage data models
- [ ] Set up Supabase Auth (JWT tokens)
- [ ] Create API endpoints (REST)

### Week 3-4: Data Migration & API
- [ ] Migrate localStorage data to Supabase
- [ ] Implement role-based access control (RLS policies)
- [ ] Connect React frontend to API endpoints
- [ ] Test all CRUD operations

### Week 5-6: Security & Testing
- [ ] Input validation (Zod schemas)
- [ ] Error handling and logging
- [ ] Unit and integration tests
- [ ] Security audit (SQL injection, XSS, CSRF prevention)

### Week 7-8: Polish & Documentation
- [ ] Backup strategy (daily automated)
- [ ] Production environment setup
- [ ] Load testing (ensure performance)
- [ ] Documentation for operations team

---

## Technology Decisions Summary

| Decision | Choice | Reasoning |
|----------|--------|-----------|
| **Database** | Supabase (PostgreSQL) | Proven, cost-effective, built-in auth & RLS |
| **Platform** | Web (React) | Already built, works great for office-based business |
| **Authentication** | Supabase Auth | Integrated with DB, JWT tokens, secure |
| **API** | REST (initially) | Simple, straightforward, can upgrade to GraphQL later |
| **Hosting** | Netlify or Vercel | Easy deployment, auto-scaling, good for React |
| **PDF/CSV** | Keep jsPDF + html2canvas | Already working, no need to change |
| **QuickBooks** | CSV export only (Phase 2) | QB can import CSV; direct API adds complexity |
| **Real-time** | Not needed Phase 1 | Consider Supabase Realtime in Phase 2+ if multiple users editing same data |
| **Mobile** | Phase 3+ only | Desktop/office-based business; mobile not a priority |

---

## Next Steps for Developer

1. **Review the codebase**:
   - Clone/access the repository
   - Run `pnpm install && pnpm dev`
   - Test all features in the UI
   - Review React component structure

2. **Understand the data models**:
   - Read `PROJECT_REQUIREMENTS.md` for detailed schema
   - Map localStorage data to SQL tables
   - Plan primary keys, foreign keys, indexes

3. **Set up Supabase**:
   - Create Supabase project (free tier)
   - Design database schema
   - Set up RLS policies for role-based access
   - Create Auth roles (admin, coworker)

4. **Build API layer**:
   - Create REST endpoints in Express
   - Connect to Supabase database
   - Implement validation and error handling
   - Add logging and monitoring

5. **Connect frontend to backend**:
   - Replace localStorage fetch calls with API calls
   - Add loading states and error handling
   - Test all workflows end-to-end

6. **Testing and deployment**:
   - Write tests for critical workflows
   - Set up continuous deployment (GitHub → Netlify/Vercel)
   - Configure automated backups
   - Plan data migration strategy

---

## Questions for Developer During Phase 2

When starting Phase 2, clarify with Emmanuel:
1. **Timezone**: What timezone for payment dates/due dates?
2. **Decimal places**: Currency = 2 decimals (standard), or different?
3. **Backup frequency**: Daily, weekly, or real-time?
4. **Audit logging**: Do you need to track "who changed what when"?
5. **Data export**: Should admin be able to export all company data (for backup/migration)?
6. **Password policy**: Minimum requirements (length, complexity, expiration)?
7. **Employee access**: Should employees view own payments in Phase 2, or Phase 3?
8. **Concurrent edits**: If two people edit same contract simultaneously, what's the behavior? (Last write wins vs conflict resolution)

---

## Resources

- **Supabase Docs**: https://supabase.com/docs
- **React Router Docs**: https://reactrouter.com/
- **TailwindCSS Docs**: https://tailwindcss.com/docs
- **Zod Validation**: https://zod.dev/
- **PostgreSQL Design**: https://www.postgresql.org/docs/

---

**Document Version**: 1.0  
**Last Updated**: December 2025  
**Created for**: New developer joining Phase 2  
**Owner**: Emmanuel Camarena
