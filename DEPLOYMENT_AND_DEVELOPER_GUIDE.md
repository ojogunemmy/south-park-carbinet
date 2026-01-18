# 🚀 South Park Cabinets - Complete Deployment & Developer Guide

**Project**: South Park Cabinets Business Management System  
**Owner**: Emmanuel Camarena  
**Current Status**: MVP Complete, Ready for Production Deployment  
**Document Version**: 1.0  
**Last Updated**: January 2026

---

## 📌 Executive Summary

This document provides everything a new developer needs to understand, deploy, and maintain the South Park Cabinets management platform. The app is a **fully functional React web application** with 8 pages, PDF generation, and professional UI. It currently uses **localStorage** for data storage and is ready to migrate to a cloud database for team collaboration.

**Current State**: ✅ Production-ready MVP with all core features working  
**Next Phase**: Database migration to Supabase + multi-user support  
**Estimated Phase 2 Timeline**: 6-8 weeks

---

## 📋 What This App Does (Business Purpose)

South Park Cabinets is a cabinet manufacturing business that needs to track:

1. **Employee Payroll** - Weekly payments with deductions, check printing
2. **Contracts** - Track cabinet projects, payment milestones, materials costs, profit
3. **Bills/Expenses** - Track supplier invoices organized by category
4. **Materials** - Cabinet materials catalog with 20+ predefined items and costs
5. **Work Letters** - Generate work documentation for employees
6. **Financial Reports** - Track costs, profits, and business metrics

---

## 🏗️ Application Architecture

### Frontend Stack
- **React 18** with TypeScript - Type-safe UI components
- **Vite** - Lightning-fast build tool
- **TailwindCSS 3** - Utility-first styling
- **Radix UI** - Accessible component primitives
- **Lucide React** - Icon library
- **React Router 6** - Client-side navigation (SPA)

### Backend Stack (Minimal, Ready to Expand)
- **Express.js 5** - Node.js web framework
- **TypeScript** - Server-side type safety
- **Zod** - Schema validation
- **jsPDF** - PDF generation (checks, reports, contracts)

### Data Storage
- **Current**: localStorage (in-browser)
- **Phase 2**: Supabase PostgreSQL (recommended for multi-user)
- **Alternative Phase 2**: Neon, Firebase (not recommended - see DEVELOPER_ANSWERS.md)

### Authentication
- **Current**: Single user (no auth yet)
- **Phase 2**: Supabase Auth with JWT tokens

---

## 📁 Project Structure Explained

```
📦 South Park Cabinets App
├── client/                          # React SPA Frontend (Vite)
│   ├── pages/                       # 8 route pages (each = one feature)
│   │   ├── Index.tsx               # Dashboard (home, metrics)
│   │   ├── Employees.tsx           # Employee CRUD, payment status
│   │   ├── Payments.tsx            # Weekly payroll, mark as paid, deductions
│   │   ├── Contracts.tsx           # Contract management, material calculator
│   │   ├── Bills.tsx               # Expense tracking by category
│   │   ├── Materials.tsx           # Material catalog management
│   │   ├── WorkLetters.tsx         # Generate work documentation
│   │   ├── Login.tsx               # (Placeholder, will use Supabase Auth)
│   │   └── EmployeeOnboarding.tsx # New employee setup
│   │
│   ├── components/                  # Reusable UI Components
│   │   ├── ui/                     # Radix UI + Tailwind components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   └── ... (30+ more components)
│   │   ├── Layout.tsx              # Main page wrapper (sidebar + header)
│   │   ├── ProtectedRoute.tsx      # (Ready for Phase 2 auth)
│   │   └── YearSelector.tsx        # Select data year (2025-2030)
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx         # (Ready for Phase 2: user info, roles)
│   │   └── YearContext.tsx         # Current selected year
│   │
│   ├── hooks/
│   │   ├── use-toast.ts            # Toast notifications (sonner library)
│   │   ├── useAutoSave.ts          # Auto-save to localStorage
│   │   └── use-mobile.tsx          # Responsive breakpoint detection
│   │
│   ├── utils/
│   │   ├── yearStorage.ts          # localStorage wrapper (year-based keys)
│   │   └── employeeTemplate.ts     # Employee creation defaults
│   │
│   ├── App.tsx                     # Router setup (React Router 6)
│   ├── main.tsx                    # React entry point
│   └── global.css                  # TailwindCSS theme & variables
│
├── server/                          # Express.js Backend
│   ├── index.ts                    # Express setup, middleware
│   ├── routes/                     # API endpoints (to be expanded)
│   │   └── demo.ts                # Demo/example route
│   └── node-build.ts              # Build script
│
├── shared/                          # Shared Types & Constants
│   └── api.ts                      # TypeScript interfaces for API
│
├── netlify/functions/              # Netlify Functions (serverless)
│   └── api.ts                      # Edge function handler
│
├── public/                          # Static assets
│   └── ...images, favicon, robots.txt
│
├── package.json                    # Dependencies & scripts
├── tsconfig.json                   # TypeScript config
├── tsconfig.app.json               # Frontend TS config
├── tsconfig.node.json              # Backend TS config
├── vite.config.ts                  # Frontend build config
├── vite.config.server.ts           # Backend build config
├── tailwind.config.ts              # Tailwind styling config
├── postcss.config.js               # PostCSS config (for Tailwind)
├── eslint.config.js                # Linting rules
├── components.json                 # Radix UI config
└── DEVELOPER_ANSWERS.md            # Detailed Q&A document
```

---

## 🎯 Key Features & How They Work

### 1. **Dashboard (Index.tsx)**
- Displays key metrics: Total payroll, active contracts, pending payments
- Shows recent activities
- Navigation to all features
- **Data Source**: Reads from localStorage year-based keys

### 2. **Employee Management (Employees.tsx)**
- CRUD operations for employees
- Track payment methods (Direct Deposit, Check, Cash)
- Store bank details for automated payments
- Mark employees as "Active", "On Leave", "Laid Off"
- Trigger severance workflow when marked "Laid Off"
- **Key Fields**: Name, position, weekly rate, payment method, bank details
- **Data**: Stored in localStorage under `employees_[year]`

### 3. **Payroll/Payments (Payments.tsx)**
- **Auto-generated**: All weekly payments for the year created on Day 1
- **Weekly Workflow**:
  1. View pending payments for current week
  2. Add deductions if employee missed work
  3. Mark payment as "Paid"
  4. Print checks if using check method
- **Features**: Payment history, deduction tracking, check number storage
- **Data**: localStorage under `weeklyPayments_[year]`

### 4. **Contracts (Contracts.tsx)** ⭐ Recently Enhanced
- Create and manage cabinet projects
- Payment milestones (50% down, 25% first, 25% final)
- **Material Calculator** - Built-in tool to calculate project costs:
  - Select materials from catalog
  - Enter quantities
  - Add labor costs
  - Apply profit margin
  - Auto-calculate total project value
- Down Payment tracking
- Contract PDF generation
- **Data**: localStorage under `contracts_[year]`

### 5. **Bills (Bills.tsx)**
- Track supplier invoices
- Categories: Materials, Labor, Permits, Other
- Link to contracts for cost tracking
- CSV export for accounting
- **Data**: localStorage under `bills_[year]`

### 6. **Materials (Materials.tsx)**
- Predefined catalog (20+ items with actual supplier prices)
- CRUD operations
- CSV export for re-ordering
- Used by Material Calculator in Contracts page
- **Data**: localStorage under `materials_[year]`

### 7. **Work Letters (WorkLetters.tsx)**
- Generate employment letters
- PDF export for legal purposes
- **Data**: Based on employee records

### 8. **Settings (Settings.tsx)**
- Company information (name, address, phone)
- Bank details (for automated payment setup)
- Check templates
- Default values for templates

---

## 💾 Data Storage (Current & Planned)

### Current: localStorage (Phase 1)
```javascript
// Format: "dataType_year" (string keys)
localStorage.getItem('employees_2026')        // Array of employees
localStorage.getItem('weeklyPayments_2026')   // Array of weekly payments
localStorage.getItem('contracts_2026')        // Array of contracts
localStorage.getItem('bills_2026')            // Array of bills
localStorage.getItem('materials_2026')        // Array of materials
localStorage.getItem('settings_2026')         // Settings object
```

**Advantages**:
- ✅ Works offline
- ✅ No server needed
- ✅ Fast development

**Limitations**:
- ❌ No multi-user support
- ❌ No data persistence across devices
- ❌ Limited storage (5-10MB)
- ❌ Not suitable for teams

### Planned: Supabase PostgreSQL (Phase 2)

**Recommended Architecture**:
```sql
-- Users & Auth (Supabase Auth handles this)
users (id, email, role, company_id, created_at)

-- Employees
employees (id, name, position, weekly_rate, payment_method, bank_details, status, created_at, updated_at)

-- Payments (Weekly Payroll)
payments (id, employee_id, week_start_date, amount, status, deductions, paid_date, check_number, created_at)

-- Contracts
contracts (id, client_name, project_name, total_value, deposit_amount, start_date, due_date, status, materials, labor_cost, profit_margin, created_at, updated_at)

-- Contract Payments (Milestones)
contract_payments (id, contract_id, description, amount, due_date, status, paid_date, created_at)

-- Bills
bills (id, vendor, invoice_number, amount, category, date, status, contract_id, created_at, updated_at)

-- Materials
materials (id, name, unit_price, unit, supplier, quantity_available, created_at)

-- Settings
settings (id, company_name, company_address, bank_name, routing_number, account_number, check_template, created_at, updated_at)
```

---

## 🔐 Authentication & Roles (Phase 2 Plan)

### Current (Phase 1)
- Single user (no authentication)
- All data is public

### Phase 2: Role-Based Access Control (RBAC)

#### Admin
- ✅ Create/edit/delete employees
- ✅ Create/edit/delete contracts
- ✅ Create/edit/delete bills
- ✅ Manage materials catalog
- ✅ Access settings
- ✅ View all reports
- ✅ Manage user accounts

#### Coworker/Manager
- ✅ View employees (read-only)
- ✅ Mark payments as paid
- ✅ Add deductions
- ✅ View contracts (read-only)
- ✅ Add bills
- ✅ Generate reports
- ❌ Cannot delete anything
- ❌ Cannot edit contract amounts
- ❌ Cannot access settings

#### Employee (Phase 3)
- ✅ View own payment history
- ✅ View own work letters
- ❌ Cannot see other employees' data

---

## 🚀 Deployment Guide

### Option 1: Netlify (Recommended) ⭐

**Advantages**:
- ✅ Easy GitHub integration
- ✅ Automatic deployments on push
- ✅ Built-in domain & HTTPS
- ✅ Environment variables support
- ✅ Great for React apps

**Steps**:

1. **Build the app**:
```bash
npm run build:client
# Output: dist/spa/
```

2. **Connect to Netlify**:
   - Go to netlify.com
   - Click "New site from Git"
   - Select GitHub repository
   - Build command: `npm run build:client`
   - Publish directory: `dist/spa`

3. **Set environment variables** (in Netlify dashboard):
   - `VITE_SUPABASE_URL` (when Phase 2 is ready)
   - `VITE_SUPABASE_KEY`
   - `API_URL` (if using external API)

4. **Deploy**: Push to GitHub, Netlify auto-deploys

**Cost**: Free tier includes 125k requests/month (plenty for SMB)

---

### Option 2: Vercel

**Advantages**:
- ✅ Optimized for React
- ✅ Edge network for fast delivery
- ✅ Simple deployment

**Steps**:

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Deploy**:
```bash
vercel
# Follow prompts, select React framework
```

3. **Set environment variables** in Vercel dashboard

**Cost**: Free tier for personal projects

---

### Option 3: Self-Hosted (VPS)

**For full control, use AWS EC2, DigitalOcean, or Linode**:

1. **Build**:
```bash
npm run build
```

2. **Install Node.js on server**:
```bash
curl -sL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install nodejs
```

3. **Upload files & install**:
```bash
npm install --production
npm start
```

4. **Use PM2 for process management**:
```bash
npm install -g pm2
pm2 start "npm start"
pm2 startup
pm2 save
```

5. **Set up Nginx reverse proxy**:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

6. **Enable HTTPS with Let's Encrypt**:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot certonly --nginx -d yourdomain.com
```

**Cost**: $5-20/month depending on provider

---

## 🔧 Local Development Setup

### Prerequisites
- Node.js 18+ (download from nodejs.org)
- npm or **pnpm** (recommended)

### Installation

1. **Clone the repository**:
```bash
git clone <repository-url>
cd south-park-cabinets
```

2. **Install dependencies** (using pnpm):
```bash
npm install -g pnpm  # Install pnpm globally (one time)
pnpm install          # Install project dependencies
```

3. **Start development server**:
```bash
pnpm dev
# Opens http://localhost:8080
```

4. **Test the app**:
   - Visit http://localhost:8080
   - Year selector shows 2025-2030
   - Click on any page (Employees, Contracts, Payments, etc.)
   - All data is saved to localStorage automatically

### Available Commands

```bash
# Development
pnpm dev              # Start dev server (client + server)
pnpm dev:client       # Frontend only (Vite)
pnpm dev:server       # Backend only (Express)

# Building
pnpm build            # Build for production
pnpm build:client     # Build frontend only
pnpm build:server     # Build backend only

# Testing
pnpm test             # Run tests (Vitest)
pnpm test:watch       # Watch mode

# Other
pnpm format           # Format code with Prettier
pnpm lint             # Check linting errors
pnpm start            # Run production build locally
```

---

## 📊 Database Migration Strategy (Phase 2)

### Step 1: Design Schema
Map localStorage data to SQL tables (see data storage section above)

### Step 2: Set Up Supabase
```bash
# 1. Create Supabase account (free tier: https://supabase.com)
# 2. Create new project (choose region close to users)
# 3. Get project URL and anon key from Settings > API
```

### Step 3: Create Tables & Auth
```sql
-- Example migration in Supabase SQL editor
CREATE TABLE employees (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  position text,
  weekly_rate decimal(10,2),
  payment_method text,
  bank_details jsonb,
  status text DEFAULT 'active',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Create admin policy
CREATE POLICY "Admin can do all" ON employees
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Create coworker read-only policy
CREATE POLICY "Coworkers can view" ON employees
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'coworker'));
```

### Step 4: Migrate Data
```typescript
// TypeScript function to migrate localStorage → Supabase
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(URL, KEY);

async function migrateData() {
  const employees = JSON.parse(localStorage.getItem('employees_2026') || '[]');
  
  const { data, error } = await supabase
    .from('employees')
    .insert(employees);
  
  if (error) console.error('Migration failed:', error);
  else console.log('Migrated', data.length, 'employees');
}
```

### Step 5: Update Frontend
Replace localStorage calls with Supabase:
```typescript
// Before (localStorage)
const employees = JSON.parse(localStorage.getItem('employees_2026') || '[]');

// After (Supabase)
const { data: employees } = await supabase
  .from('employees')
  .select('*')
  .eq('year', 2026);
```

---

## 🐛 Troubleshooting Common Issues

### Issue 1: "Page showing no data"
**Cause**: localStorage not initialized for selected year
**Solution**: 
```typescript
// Check console for errors
console.log(localStorage.getItem('employees_2026'))
// Should return JSON string, not null

// Reset data (development only)
localStorage.clear()
// Page will reload with example data
```

### Issue 2: "Blue Update Contract button not working"
**Status**: ✅ FIXED (as of Jan 2026)
- Button was disabled because terms checkbox required even for edits
- Now: Terms checkbox only required for NEW contracts, not edits
- Edits can be saved without checking the checkbox

### Issue 3: "Material Calculator not updating contract value"
**Status**: ✅ WORKING
- Use Material Calculator to select materials and quantities
- Click "Apply to Contract" button at bottom
- This auto-calculates total project value and 50% deposit

### Issue 4: "Payments not saving when marked as paid"
**Status**: ✅ FIXED
- Payment method validation was too strict
- Now: Check payments don't need routing/account numbers
- Bank transfer payments require full bank details
- Data auto-saves to localStorage via useEffect

### Issue 5: "Performance slow with large datasets"
**Solution** (when you have 1000+ records):
- localStorage can handle ~10MB of data
- For production, migrate to Supabase (handles millions of records)
- Consider pagination in UI (load 50 rows at a time)
- Use React memo() for expensive components

---

## 🔑 Important Code Patterns

### Pattern 1: Year-Based Data Storage
```typescript
// Always include year when reading/writing
const { selectedYear } = useYear();

// Read
const employees = getYearData<Employee[]>('employees', selectedYear, []);

// Write
saveYearData('employees', selectedYear, updatedEmployees);
```

### Pattern 2: useState + useEffect for Persistence
```typescript
// Auto-save pattern used throughout
const [employees, setEmployees] = useState<Employee[]>(getInitialEmployees());

useEffect(() => {
  saveYearData('employees', selectedYear, employees);
}, [employees, selectedYear]);
```

### Pattern 3: Modal Management
```typescript
// Open modal: set ID + open flag
const handleEditClick = (id: string) => {
  setEditingId(id);
  setIsModalOpen(true);
};

// Close modal: clear state
const handleCloseModal = () => {
  setEditingId(null);
  setIsModalOpen(false);
  // Optional: reset form
  setFormData({...});
};
```

### Pattern 4: Form Validation
```typescript
const handleSave = () => {
  // Validate required fields
  if (!formData.name.trim()) {
    alert('Name is required');
    return;
  }
  
  // Validate format
  if (!validateEmail(formData.email)) {
    alert('Invalid email format');
    return;
  }
  
  // Save
  saveData(formData);
  toast({ title: 'Success', description: 'Data saved' });
  handleCloseModal();
};
```

---

## 📈 Performance Optimization Tips

### 1. Lazy Load Routes
```typescript
// Instead of importing all pages at top
import { lazy, Suspense } from 'react';

const Employees = lazy(() => import('./pages/Employees'));
const Contracts = lazy(() => import('./pages/Contracts'));

<Suspense fallback={<Loading />}>
  <Routes>
    <Route path="/employees" element={<Employees />} />
    <Route path="/contracts" element={<Contracts />} />
  </Routes>
</Suspense>
```

### 2. Memoize Expensive Components
```typescript
const ContractTable = React.memo(({ contracts }) => {
  return <table>...</table>;
});
```

### 3: Use React.memo for List Items
```typescript
const ContractRow = React.memo(({ contract, onEdit }) => {
  return <tr>...</tr>;
});
```

### 4: Debounce Search/Filter
```typescript
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useCallback(
  debounce((value: string) => {
    // Filter data
  }, 300),
  []
);
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)
```typescript
// Example: Test employee validation
import { describe, it, expect } from 'vitest';

describe('Employee', () => {
  it('should not allow duplicate names', () => {
    const employees = [{ name: 'John' }];
    const duplicate = { name: 'John' };
    expect(isDuplicate(duplicate, employees)).toBe(true);
  });
});
```

### Integration Tests
- Test full workflows: Create contract → Add payment → Mark paid
- Test data persistence: Save to localStorage → Reload page → Verify data

### Manual Testing Checklist
- [ ] Create employee and verify data saves
- [ ] Create contract and verify material calculator works
- [ ] Mark payment as paid and verify status updates
- [ ] Add bill and verify category filtering works
- [ ] Generate PDF and verify it's readable
- [ ] Test on mobile (responsive design)

---

## 🚨 Common Gotchas & Solutions

### 1. **Date Handling (Timezone Issues)**
**Problem**: Dates appear off by one day on some browsers

**Solution**: Always use YYYY-MM-DD strings, never JavaScript Date
```typescript
// ❌ Wrong (causes timezone shift)
new Date('2026-01-15').toISOString().split('T')[0]

// ✅ Correct (use utility function)
import { formatDateToString } from '@/utils/yearStorage';
formatDateToString(new Date(2026, 0, 15)) // Returns "2026-01-15"
```

### 2. **localStorage Quota Exceeded**
**Problem**: App crashes when adding too much data

**Solution**: Monitor storage size + migrate to Supabase
```typescript
const storageSize = Object.keys(localStorage)
  .reduce((sum, key) => sum + localStorage[key].length, 0);
console.log('Storage used:', (storageSize / 1024 / 1024).toFixed(2), 'MB');
// Warn user if > 5MB
```

### 3. **Missing Attachments on PDF Generation**
**Problem**: PDF exports fail if images aren't available

**Solution**: Use data URIs instead of URLs
```typescript
// ✅ Works offline
const dataUri = "data:image/png;base64,iVBORw0KG..."
pdf.addImage(dataUri, 'PNG', x, y, width, height);

// ❌ Fails offline
pdf.addImage('https://...', 'PNG', x, y, width, height);
```

---

## 📞 Support & Resources

### Internal Documentation
- **DEVELOPER_ANSWERS.md** - Detailed Q&A about architecture decisions
- **PROJECT_REQUIREMENTS.md** - Full business requirements
- **CODE COMMENTS** - Throughout the codebase

### External Resources
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs/
- **TailwindCSS**: https://tailwindcss.com/docs
- **Radix UI**: https://www.radix-ui.com/docs/primitives/overview/introduction
- **React Router**: https://reactrouter.com/
- **Supabase Docs**: https://supabase.com/docs (for Phase 2)

### Getting Help
1. Check error messages in browser console
2. Search existing code for similar patterns
3. Review DEVELOPER_ANSWERS.md for architectural questions
4. Contact Emmanuel for business logic clarifications

---

## 🎯 Phase 2 Checklist

Before starting Phase 2 development:

- [ ] Review this entire guide
- [ ] Run app locally (`pnpm dev`)
- [ ] Test all 8 pages and features
- [ ] Review DEVELOPER_ANSWERS.md
- [ ] Create Supabase account
- [ ] Design database schema
- [ ] Set up Supabase project
- [ ] Create example tables and data
- [ ] Write data migration scripts
- [ ] Connect frontend to Supabase API
- [ ] Implement authentication
- [ ] Set up RLS policies
- [ ] Write automated tests
- [ ] Deploy to staging environment
- [ ] Get Emmanuel to approve changes
- [ ] Deploy to production

---

## ✅ Current Known Issues & Fixes

### ✅ Fixed in January 2026:
1. **Update Contract button disabled** - Fixed by making terms checkbox optional for edits
2. **Check payment validation too strict** - Fixed by making bank details optional for checks
3. **CON-004 value showing $0** - Fixed by merging example data with stored data
4. **Material Calculator missing** - Implemented full calculator with quantity input and profit margin

### 🔄 In Progress:
- (None at this time - app is stable)

### 📋 Future Enhancements:
- Database migration (Phase 2)
- Multi-user support (Phase 2)
- Mobile app (Phase 3)
- Client portal (Phase 3+)
- Advanced reporting (Phase 3+)

---

## 📝 Notes for Developer

### Before Deployment
1. Test all workflows locally
2. Verify PDF generation works
3. Check localStorage capacity
4. Test on mobile/tablet
5. Verify images/assets load correctly

### During Phase 2
1. Keep this guide updated
2. Document any new patterns
3. Write tests as you build
4. Maintain TypeScript strict mode
5. Follow existing code style

### Production Considerations
1. Monitor error logs (add Sentry)
2. Regular backups of data
3. Performance monitoring
4. User feedback mechanism
5. Security audit before launch

---

**Document Created**: January 2026  
**For**: New Developer / Deployment Team  
**Status**: Ready for Review

**Questions?** Review DEVELOPER_ANSWERS.md or contact Emmanuel.

