# 🚀 Quick Start Guide for New Developer

**Time to understand app**: 30 minutes  
**Time to deploy**: 15 minutes  
**Time to start Phase 2**: 1-2 hours

---

## 📚 What to Read First (In This Order)

### 1️⃣ This File (5 min)
Quick overview of what the app does and how to get started

### 2️⃣ APP_STATUS_AND_FEATURES.md (15 min)
See what's currently working and what's not. Check-list of all 8 pages.

### 3️⃣ DEPLOYMENT_AND_DEVELOPER_GUIDE.md (30 min)
Comprehensive guide covering:
- Architecture
- How to run locally
- How to deploy
- Troubleshooting
- Phase 2 planning

### 4️⃣ DEVELOPER_ANSWERS.md (20 min)
Detailed answers to important questions:
- Why Supabase? (not Firebase)
- What are the workflows?
- What about authentication?
- Multi-user strategy

---

## 🎯 What This App Is (In Plain English)

South Park Cabinets is a cabinet manufacturing business. They need software to:

1. **Track Employees** - Who works here, how much they earn, payment method
2. **Process Weekly Payroll** - Auto-generate payments, track deductions, print checks
3. **Manage Projects** - Cabinet projects (contracts) with payment milestones
4. **Calculate Project Costs** - Materials + labor + profit margin
5. **Track Expenses** - Supplier invoices organized by category
6. **Generate Documents** - PDFs (checks, contracts, work letters, reports)

**Current User**: Emmanuel (owner) - single user, all data in browser  
**Future Goal**: Multiple team members with different access levels

---

## ⚡ Get Running in 5 Minutes

### Step 1: Install Node.js
Download from https://nodejs.org (18+ recommended)

### Step 2: Clone & Install
```bash
git clone <repository-url>
cd south-park-cabinets
npm install -g pnpm        # One time only
pnpm install               # Install dependencies
```

### Step 3: Run
```bash
pnpm dev
# Opens http://localhost:8080
```

### Step 4: Test
- Try different pages (Employees, Contracts, Payments, etc.)
- All data is saved automatically
- Refresh page - data persists
- Change year selector (2025-2030)

**That's it!** The app is fully functional locally.

---

## 📂 File Structure (Simple Version)

```
south-park-cabinets/
├── client/                  # React app (what user sees)
│   ├── pages/              # 8 pages (Employees, Contracts, Payments, etc.)
│   ├── components/         # Reusable UI components
│   └── App.tsx             # Routes
├── server/                 # Express backend (minimal, ready to expand)
├── shared/                 # Types shared between frontend & backend
├── package.json            # Dependencies
└── Documentation files (what you're reading now)
```

**Key Insight**: Everything in `client/pages/` is independent. Each page is a complete feature.

---

## 🔑 Key Technologies

| Technology | Purpose | Where |
|-----------|---------|-------|
| **React** | User interface | client/ |
| **TypeScript** | Type safety | everywhere |
| **TailwindCSS** | Styling | client/global.css |
| **Vite** | Build tool | vite.config.ts |
| **jsPDF** | PDF generation | Contracts, Payments, WorkLetters pages |
| **localStorage** | Data storage | client/utils/yearStorage.ts |
| **Express** | Backend server | server/index.ts |

---

## 💾 How Data Works

### Current (Phase 1)
```javascript
// All data saved in browser's localStorage
localStorage.getItem('employees_2026')    // Array of employees
localStorage.getItem('contracts_2026')    // Array of contracts
// ... etc for each data type and year
```

**Pro**: Works offline, no server needed  
**Con**: Single user only, limited to ~10MB storage

### Coming (Phase 2)
```javascript
// Data in Supabase PostgreSQL
const supabase = createClient(URL, KEY);
const { data: employees } = await supabase
  .from('employees')
  .select('*');
```

**Pro**: Multi-user, unlimited storage, secure  
**Con**: Requires Phase 2 development

---

## 📄 The 8 Pages Explained

| Page | What It Does | Key Feature |
|------|--------------|-------------|
| **Dashboard** | Overview metrics | Quick navigation |
| **Employees** | CRUD for employees | Track weekly rates, payment methods |
| **Payments** | Weekly payroll | Auto-generated payments, mark paid, deductions |
| **Contracts** | Project management | Material calculator, payment milestones |
| **Bills** | Expense tracking | Organize by category (Materials, Labor, etc.) |
| **Materials** | Catalog of items | 20+ materials with actual supplier prices |
| **WorkLetters** | Generate documents | Employment verification PDFs |
| **Settings** | Company config | Bank details, check templates |

**Total**: ~3000 lines of React code, all TypeScript typed

---

## 🎮 How to Test the App Quickly

### Test 1: Employee Workflow (2 min)
1. Go to Employees page
2. Click "New Employee"
3. Fill name, position, weekly rate, select payment method
4. Click "Add Employee"
5. Refresh page (F5)
6. Employee still there ✓

### Test 2: Payment Workflow (3 min)
1. Go to Payments page
2. Find pending payment for any employee
3. Click "Mark as Paid"
4. Select payment method, enter check number
5. Click "Update Payment"
6. Status changes to "Paid" ✓

### Test 3: Contract Workflow (3 min)
1. Go to Contracts page
2. Click "Material Calculator"
3. Select some materials, enter quantities
4. See total calculate
5. Click "Apply to Contract"
6. Close, see total value filled in ✓

### Test 4: PDF Generation (2 min)
1. Go to Contracts page
2. Click download icon on any contract
3. PDF opens in new tab ✓

---

## 🚀 How to Deploy

### Option 1: Netlify (Easiest) ⭐
1. Push code to GitHub
2. Go to netlify.com
3. Click "New site from Git"
4. Select your GitHub repo
5. Build command: `npm run build:client`
6. Publish directory: `dist/spa`
7. Done! Your site is live

### Option 2: Vercel
1. Install Vercel CLI: `npm install -g vercel`
2. Run: `vercel`
3. Follow prompts
4. Done!

### Option 3: Self-hosted
1. Rent a VPS ($5-20/month)
2. Install Node.js
3. Run: `npm start`
4. Use PM2 to keep it running
5. Set up Nginx as reverse proxy

**Recommendation**: Start with Netlify. Zero configuration, automatic deployments on GitHub push.

---

## 🔍 Common Questions

### Q: Where is the database?
A: Currently in browser localStorage. Will migrate to Supabase in Phase 2.

### Q: Can multiple people use this simultaneously?
A: Not yet. That's Phase 2. Currently single-user only.

### Q: How do I add a new feature?
A: Create a new component in `client/pages/` or `client/components/`, import it in `App.tsx`, add route. See existing pages for patterns.

### Q: How do I export data?
A: Click CSV button on any page (Employees, Materials, Bills, etc.). Opens in Excel.

### Q: Can this work offline?
A: Yes! All data stored locally. Perfect for office without internet.

### Q: How much data can it store?
A: ~10MB in localStorage. When Phase 2 happens (Supabase), unlimited.

### Q: Is it secure?
A: For single user in office, yes. For team access, needs Phase 2 auth + encryption.

### Q: What if someone closes the browser?
A: All data is saved automatically. It persists when they reopen.

---

## ⚠️ Important Things to Know

### 1. Date Format
Always use `YYYY-MM-DD` strings. Never use JavaScript `Date` objects in storage.

```typescript
// ✅ Good
const date = "2026-01-15";

// ❌ Bad
const date = new Date(2026, 0, 15);  // Can cause timezone issues
```

### 2. Year-Based Storage
Everything is keyed by year. When user switches year selector, all data changes.

```typescript
// Always include year
saveYearData('employees', selectedYear, employees);
getYearData('employees', selectedYear, []);
```

### 3. Auto-Save Pattern
Most pages auto-save to localStorage via useEffect.

```typescript
const [employees, setEmployees] = useState(getInitialEmployees());

useEffect(() => {
  saveYearData('employees', selectedYear, employees);
}, [employees, selectedYear]);  // Saves whenever employees changes
```

### 4. Toast Notifications
Show success/error messages with sonner library:

```typescript
toast({ title: "Success", description: "Employee saved!" });
```

### 5. Type Safety
All components are TypeScript typed. No `any` types allowed.

---

## 🚨 Troubleshooting

### App won't start
```bash
# Clear and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

### localStorage quota exceeded
```javascript
// Clear (development only)
localStorage.clear()
// Page will reload with example data
```

### PDF not generating
- Check console for errors (F12)
- Verify images are data URIs, not URLs
- Try in Chrome (best PDF support)

### Data disappeared after refresh
- Check localStorage wasn't cleared
- Check you're on correct year
- Check browser private/incognito mode

---

## 📋 Checklist Before Phase 2

- [ ] Understand how current app works locally
- [ ] Test all 8 pages
- [ ] Read DEVELOPER_ANSWERS.md
- [ ] Understand localStorage data structure
- [ ] Know why Supabase was chosen
- [ ] Understand workflows (payroll, contracts, bills)
- [ ] Ready to design database schema
- [ ] Understand Phase 2 timeline (6-8 weeks)

---

## 🎓 Learning Path

**Day 1**: 
- Read this file
- Run app locally
- Test all pages

**Day 2**: 
- Read APP_STATUS_AND_FEATURES.md
- Review code structure
- Understand React patterns used

**Day 3**: 
- Read DEPLOYMENT_AND_DEVELOPER_GUIDE.md
- Deploy to Netlify
- Plan Phase 2 architecture

**Week 2+**: 
- Design database schema
- Set up Supabase
- Start Phase 2 development

---

## 🎯 Success Criteria

You'll know you're ready to start Phase 2 when you can:

- [ ] Run app locally without errors
- [ ] Understand what each of 8 pages does
- [ ] Explain current data storage (localStorage)
- [ ] Deploy app to Netlify in < 15 minutes
- [ ] Add a simple feature (like new field in employee form)
- [ ] Export data to CSV
- [ ] Generate PDF successfully
- [ ] Explain why Supabase is better than Firebase for this app

---

## 📞 Getting Help

1. **"How do I run this?"** → Read DEPLOYMENT_AND_DEVELOPER_GUIDE.md
2. **"What should I build next?"** → Read DEVELOPER_ANSWERS.md
3. **"What's currently working?"** → Read APP_STATUS_AND_FEATURES.md
4. **"I found a bug"** → Check browser console (F12), search code for similar patterns
5. **"Business logic question"** → Contact Emmanuel

---

## 🎉 You're Ready!

You now have everything needed to:
1. ✅ Understand the app
2. ✅ Run it locally
3. ✅ Deploy it
4. ✅ Start Phase 2 development

**Next Step**: Clone repo, run `pnpm install && pnpm dev`, then read the other guides.

**Questions?** Review the files in this order:
1. This file (what you're reading)
2. APP_STATUS_AND_FEATURES.md (what's working)
3. DEPLOYMENT_AND_DEVELOPER_GUIDE.md (how to deploy)
4. DEVELOPER_ANSWERS.md (why we built it this way)

---

**Last Updated**: January 14, 2026  
**Status**: Ready for Developer Handoff  
**Questions?** Contact Emmanuel

