# South Park Cabinets Management Platform - User Guide

**Version 1.0 | February 2026**

---

## Table of Contents

1. [The Big Picture](#1-the-big-picture)
2. [Understanding Your Role](#2-understanding-your-role)
3. [Tour of Every Section](#3-tour-of-every-section)
4. [Hands-On Workflows](#4-hands-on-workflows)
5. [Problem Solving & FAQ](#5-problem-solving--faq)
6. [Quick Reference](#6-quick-reference)
7. [Getting Started](#7-getting-started)

---

## 1. The Big Picture

### What is This Website?

The South Park Cabinets Management Platform is your all-in-one business management system. Instead of juggling multiple spreadsheets for employees, contracts, bills, and payments, everything now lives in one organized, professional platform.

### What Problems Does It Solve?

**Before (Spreadsheet Chaos):**
- ❌ Employee payment data scattered across multiple Excel files
- ❌ Manual profit calculations on every project
- ❌ Lost track of who got paid when
- ❌ Hours spent generating reports
- ❌ No audit trail for financial changes
- ❌ Risk of data loss or corruption

**Now (Organized System):**
- ✅ All employee data in one secure database
- ✅ Automatic profit calculations on projects
- ✅ Complete payment history with receipts
- ✅ Professional PDF reports in seconds
- ✅ Immutable ledger with full audit trail
- ✅ Automatic backups to Supabase cloud

### Real Benefits You'll See

1. **Time Savings**: Weekly payroll reduced from 2 hours to 15 minutes
2. **Accuracy**: No more manual calculation errors
3. **Professionalism**: Print checks and invoices instantly
4. **Transparency**: See exactly where money is going
5. **Compliance**: Full audit trail for accounting
6. **Peace of Mind**: Your data is backed up and secure

### How It Works

The system is built around **append-only accounting principles**:
- Payments are never deleted, only reversed with audit trails
- Every financial transaction is logged
- You can generate reports for any time period
- Historical data is preserved forever

---

## 2. Understanding Your Role

### Admin Access (You)

As an Admin, you have **full access** to:
- ✅ Add, edit, and manage employees
- ✅ Process weekly payroll
- ✅ Create and track contracts
- ✅ Record bills and expenses
- ✅ Manage materials catalog
- ✅ Configure company settings
- ✅ View all financial reports
- ✅ Manage user accounts

### Coworker Access (Limited)

Future team members with "Coworker" accounts can:
- ✅ View employee information (read-only)
- ✅ View contracts and project status
- ✅ View payment history
- ❌ Cannot process payments
- ❌ Cannot edit financial data
- ❌ Cannot access settings

### Security & Privacy

- Your password is encrypted and secure
- All data is stored in Supabase (enterprise-grade security)
- Only authenticated users can access the system
- Sensitive financial data is protected by role-based permissions

---

## 3. Tour of Every Section

### 3.1 Dashboard (Home Page)

**What You See:**
- 📊 Total Active Employees
- 💰 Total Pending Payments
- 🏗️ Active Contracts
- 📋 Recent Bills

**What It's For:**
Your daily snapshot of business health. Check this every morning to see:
- How many employees need to be paid this week
- Which contracts are in progress
- Recent expenses

**Quick Actions:**
- Click any card to jump to that section
- Recent activity shows what changed today

---

### 3.2 Employees Section

**What It Does:**
Manages your workforce - from hiring to payment tracking.

#### Adding a New Employee

**Step-by-Step:**

1. **Click "Add Employee"**
   - Opens the employee form

2. **Fill Basic Information:**
   - Full Name (e.g., "John Smith")
   - Position (e.g., "Cabinet Installer", "Finishing Carpenter")
   - Phone Number
   - Email Address
   - Hire Date

3. **Set Payment Details:**
   - **Weekly Rate**: Their standard weekly salary (e.g., $1,200)
   - **Payment Method**: Choose one:
     - **Cash**: Pay in cash (requires signature log)
     - **Check**: Print physical checks
     - **Direct Deposit**: Bank transfer (requires bank details)
     - **ACH Transfer**: Electronic payment
     - **Wire Transfer**: Urgent/large payments
   
4. **Bank Details (if applicable):**
   - Bank Name (e.g., "Chase Bank")
   - Routing Number (9 digits)
   - Account Number
   - Account Type (Checking/Savings)

5. **Employment Status:**
   - **Active**: Currently working, will receive weekly payments
   - **Paused**: Temporarily not working (no auto-payments)
   - **Leaving**: Gave notice, final payments pending
   - **Laid Off**: Terminated, severance may be due

6. **Save Employee**

#### Managing Existing Employees

**Actions Available:**

- **Edit**: Update information, change salary, modify payment method
- **View Payment History**: See all payments ever made to this employee
- **Add Absence**: Record sick days, vacations (affects payment calculations)
- **Change Status**: Move from Active → Paused/Leaving/Laid Off
- **Salary History**: Track salary changes over time with audit trail

#### Employee Card Shows:

```
┌─────────────────────────────────────┐
│ John Smith - Cabinet Installer      │
│ $1,200/week • Direct Deposit        │
│ Status: Active                      │
│ Total Paid: $24,000 (YTD)          │
│ Last Payment: Jan 25, 2026         │
└─────────────────────────────────────┘
```

---

### 3.3 Payroll Section (Payments)

**What It Does:**
Your weekly payroll center - where you mark employees as paid and generate checks.

#### Weekly Payroll Process

**Every Monday Morning (15 minutes):**

1. **Open Payments Section**
   - Shows current week by default
   - Yellow "Pending" payments need processing

2. **Review Pending Payments:**
   - Each employee shows:
     - Name and position
     - Days worked (default: 5)
     - Amount due (e.g., $1,200)
     - Payment method
     - Status: Pending/Paid

3. **Adjust Days if Needed:**
   - Click "Edit Days" if someone worked less than 5 days
   - System automatically recalculates amount (daily rate × days)
   - Example: 3 days × $240/day = $720

4. **Mark as Paid (Individual):**
   - Click "Mark as Paid" button
   - Confirm payment method
   - Enter check number (if paying by check)
   - Add bank details (if direct deposit)
   - Optionally add deduction amount
   - Click "Confirm Payment"

5. **Batch Mark All Paid:**
   - Click "Mark All as Paid" button
   - Enter starting check number (auto-increments)
   - Select paid date
   - System processes all pending payments at once
   - Checks are numbered sequentially

6. **Generate Reports:**
   - "Weekly Report" → PDF summary of all payments
   - "Batch Checks" → Print multiple checks as PDF
   - "Individual Check" → Print one check

#### Payment Methods Explained

**Cash Payments:**
- Mark as paid with cash method
- No check number needed
- Good for: Day laborers, small amounts
- Tip: Keep a signature log for cash payments

**Check Payments:**
- System auto-assigns next check number
- Prints professional checks with MICR line
- Includes: Company info, amount in words, signature line
- Starting check number set in Settings

**Direct Deposit:**
- Requires employee bank details on file
- Mark as paid → system records bank info
- Export payment file for your bank portal
- Most secure and convenient method

**ACH Transfer:**
- Similar to direct deposit
- Used for electronic payments
- Records last 4 digits of account

**Wire Transfer:**
- For urgent or large payments
- Records bank name and details
- More expensive but fastest

#### Reversing a Payment (Append-Only Ledger)

**Important:** Payments are never deleted. Instead, you create a **reversal entry**.

**When to Reverse:**
- Payment was issued to wrong person
- Amount was incorrect
- Check was lost or voided
- Employee returned payment

**How to Reverse:**

1. Find the payment in history
2. Click "Reverse Payment"
3. **Enter Reason** (required): "Wrong amount calculated", "Check lost", etc.
4. System creates:
   - Original payment marked as "Reversed"
   - New reversal entry with negative amount
   - Audit log entry with your reason
   - Net effect: $0

**What You See:**
```
John Smith - Week of Jan 18-24
Original: +$1,200 (Status: Reversed)
Reversal: -$1,200 (Reason: "Check lost, reissued")
Net: $0
```

#### Year View

Switch to "Yearly View" to see:
- Total paid to each employee (year-to-date)
- Total pending payments
- Payment count per employee
- Grand totals for the year

---

### 3.4 Contracts Section

**What It Does:**
Manages customer projects from quote to completion.

#### Creating a New Contract

**Step-by-Step:**

1. **Click "Add Contract"**

2. **Client Information:**
   - Client Name (e.g., "Johnson Family")
   - Project Name (e.g., "Kitchen Remodel - Full Cabinet Install")
   - Contact Email & Phone
   - Project Address

3. **Contract Details:**
   - **Contract Date**: When signed
   - **Start Date**: When work begins
   - **End Date**: Expected completion
   - **Status**: 
     - Pending: Quote sent, awaiting approval
     - In Progress: Work started
     - Completed: Job done
     - Cancelled: Contract terminated

4. **Financial Terms:**
   - **Total Contract Amount**: What client pays (e.g., $45,000)
   - **Deposit Received**: Initial payment (e.g., $15,000)
   - **Payment Schedule**: Add milestones
     - Example: "Demo Complete" → $10,000
     - Example: "Cabinets Installed" → $10,000
     - Example: "Final Punch List" → $10,000

5. **Project Scope (Notes):**
   - Describe what's included
   - Materials specified
   - Timeline and milestones
   - Special requirements

6. **Add Costs:**
   
   **Labor Costs:**
   - Click "Add Labor Cost"
   - Select employee
   - Enter hours or flat amount
   - Example: John Smith - 40 hours × $30/hr = $1,200

   **Material Costs:**
   - Click "Add Material Cost"
   - Select from materials catalog
   - Enter quantity
   - Example: Plywood 3/4" - 20 sheets × $65 = $1,300

   **Bills (External Costs):**
   - Link existing bills from Bills section
   - Example: Contractor permit - $450
   - Example: Hardware order - $2,300

7. **System Calculates Automatically:**
   ```
   Contract Amount:    $45,000
   Total Costs:        $32,750
   ─────────────────────────────
   Gross Profit:       $12,250
   Profit Margin:      27.2%
   ```

8. **Save Contract**

#### Managing Active Contracts

**Actions Available:**

- **Edit**: Update details, add costs, change status
- **Mark Payment Received**: Record milestone payments
- **Add Material**: Link new material purchases
- **Add Labor**: Record employee hours
- **Link Bills**: Connect vendor invoices
- **View Report**: Generate PDF with all details
- **Complete Contract**: Mark as finished

#### Contract Card Shows:

```
┌─────────────────────────────────────────────┐
│ Johnson Kitchen Remodel                     │
│ Client: Johnson Family                      │
│ $45,000 • In Progress                       │
│ Profit: $12,250 (27.2%)                    │
│ Start: Jan 15 • Est. End: Mar 1           │
└─────────────────────────────────────────────┘
```

---

### 3.5 Bills Section

**What It Does:**
Records all business expenses for accounting.

#### Recording a New Bill

**Step-by-Step:**

1. **Click "Add Bill"**

2. **Vendor Information:**
   - Vendor Name (e.g., "Home Depot", "ABC Lumber")
   - Bill Number (their invoice #)
   - Bill Date

3. **Bill Details:**
   - **Amount**: Total bill amount
   - **Category**: Choose one
     - Materials: Lumber, hardware, supplies
     - Labor: Subcontractors, helpers
     - Permits: Government fees, inspections
     - Other: Utilities, office supplies, insurance
   
4. **Payment Status:**
   - **Paid**: Already paid (enter paid date)
   - **Pending**: Not yet paid
   - **Overdue**: Past due date

5. **Description/Notes:**
   - What was purchased
   - Which project it's for (if applicable)
   - Payment method used

6. **Link to Contract (Optional):**
   - Select active contract
   - Bill automatically counts toward contract costs

7. **Attach Receipt (Optional):**
   - Upload photo or PDF of receipt
   - Stored securely in database

8. **Save Bill**

#### Managing Bills

**Actions Available:**

- **Mark as Paid**: Change status and record payment date
- **Edit**: Update details
- **Delete**: Remove bill (with audit trail)
- **View Receipt**: See attached document
- **Export**: Generate CSV for accounting software

#### Bills Card Shows:

```
┌─────────────────────────────────────────────┐
│ Home Depot - Materials Purchase             │
│ Invoice #: HD-2024-0015                    │
│ $2,450.00 • Paid: Jan 20, 2026            │
│ Category: Materials                        │
│ Contract: Johnson Kitchen Remodel          │
└─────────────────────────────────────────────┘
```

#### Monthly Bills View

Filter by:
- Date range
- Category
- Status (Paid/Pending/Overdue)
- Vendor

See totals:
- Total Bills: $25,430
- Total Paid: $20,100
- Total Pending: $5,330

---

### 3.6 Materials Section

**What It Does:**
Your catalog of standard cabinet materials with supplier pricing.

#### Pre-Loaded Materials (20+ Items)

**Plywood:**
- 3/4" Plywood - $65/sheet
- 1/2" Plywood - $45/sheet
- 1/4" Plywood - $30/sheet

**Lumber:**
- 2×4 Stud - $8/piece
- 2×6 Stud - $12/piece
- 1×4 Pine Board - $6/piece

**Hardware:**
- Cabinet Hinges - $3/each
- Drawer Slides 18" - $12/pair
- Knobs/Pulls - $5/each

**Finish Materials:**
- Interior Paint (Gallon) - $40
- Stain (Quart) - $25
- Polyurethane (Gallon) - $55

#### Adding a New Material

**Step-by-Step:**

1. **Click "Add Material"**

2. **Material Details:**
   - Name (e.g., "Premium Oak Plywood 3/4"")
   - Category (Plywood, Lumber, Hardware, Finish, Other)
   - Unit Price (what you pay supplier)
   - Unit of Measure (sheet, piece, gallon, box)
   - Supplier Name
   - SKU/Part Number

3. **Stock Tracking (Optional):**
   - Current quantity on hand
   - Reorder point alert

4. **Save Material**

#### Using Materials in Contracts

When creating a contract:
1. Click "Add Material Cost"
2. Select from dropdown (shows all materials)
3. Enter quantity needed
4. System calculates: Quantity × Unit Price = Total Cost
5. Material cost automatically added to contract

#### Managing Materials

**Actions Available:**

- **Edit**: Update pricing, supplier, details
- **Delete**: Remove material (if not used in contracts)
- **View Usage**: See which contracts use this material
- **Duplicate**: Create similar material quickly

---

### 3.7 Settings Section

**What It Does:**
Configure your company information and system preferences.

#### Company Settings

**Company Information:**
- Company Name (appears on checks and reports)
- Address, City, State, ZIP
- Phone Number
- Email Address

**Banking Information:**
- Bank Name
- Routing Number (9 digits)
- Account Number
- Starting Check Number (e.g., 1001)

**Payment Defaults:**
- Default payment method for new employees
- Default days worked per week (usually 5)

#### User Management

**Current Users:**
- See all user accounts
- Admin vs Coworker roles
- Last login date

**Add New User:**
1. Click "Add User"
2. Enter email address
3. Select role (Admin/Coworker)
4. Send invitation email
5. They set their password

**Manage Existing Users:**
- Change role
- Disable account
- Reset password
- View activity log

#### System Settings

**Fiscal Year:**
- Select current operating year (2026)
- Switch between years for historical data
- Each year maintains separate data

**Data Management:**
- **Export All Data**: Download CSV of all records
- **Generate Backup**: Create snapshot (stored in Supabase)
- **View Audit Log**: See all changes made to financial data

**Preferences:**
- Date format (MM/DD/YYYY or DD/MM/YYYY)
- Currency format ($1,200.00 or $1.200,00)
- Time zone

---

## 4. Hands-On Workflows

### 4.1 Scenario: A New Cabinet Project

**Situation:** Johnson family calls wanting a full kitchen remodel.

**Your Workflow:**

**Day 1 - Initial Contact:**
```
1. Create Contract
   - Client: Johnson Family
   - Project: Kitchen Remodel
   - Status: Pending
   - Amount: $45,000 (your quote)
   
2. Email quote PDF to client
   - System generates professional proposal
   - Includes line items and timeline
```

**Day 3 - Contract Signed:**
```
1. Update Contract Status → "In Progress"

2. Record Deposit:
   - Click "Mark Payment Received"
   - Milestone: "Deposit"
   - Amount: $15,000
   - Payment Method: Check
   - Date: Jan 15, 2026

3. Order Materials:
   - Create Bill #1:
     - Vendor: ABC Lumber
     - Amount: $3,200
     - Category: Materials
     - Link to: Johnson Kitchen contract
   
   - Create Bill #2:
     - Vendor: Home Depot
     - Amount: $1,800
     - Category: Materials
     - Link to: Johnson Kitchen contract
```

**Week 1 - Demo Phase:**
```
1. Record Labor:
   - Add Labor Cost to contract
   - Employee: John Smith
   - Hours: 40
   - Rate: $30/hr
   - Total: $1,200

2. Weekly Payroll:
   - Mark John Smith's regular weekly payment ($1,200)
   - Generate check #1025
   - Print and deliver

3. Record Permit:
   - Create Bill #3:
     - Vendor: City Building Dept
     - Amount: $450
     - Category: Permits
     - Status: Paid
     - Link to: Johnson Kitchen
```

**Week 2 - Milestone Reached:**
```
1. Client inspects demo work (satisfied)

2. Record Milestone Payment:
   - Milestone: "Demo Complete"
   - Amount: $10,000
   - Payment Method: Direct Deposit
   - Date: Jan 25, 2026

3. Check Contract Profit:
   - Contract Amount: $45,000
   - Received so far: $25,000
   - Total Costs: $8,450
   - Current Profit: $16,550 (36.8%)
```

**Week 4 - Cabinets Installed:**
```
1. Record more materials and labor

2. Mark Another Milestone:
   - Milestone: "Cabinets Installed"
   - Amount: $10,000
   - Total Received: $35,000

3. Weekly Payroll (as usual)
```

**Final Week - Project Complete:**
```
1. Final walkthrough with client

2. Record Final Payment:
   - Milestone: "Final Payment"
   - Amount: $10,000
   - Total Received: $45,000 ✓

3. Update Contract Status → "Completed"

4. Generate Final Report:
   - PDF with all costs
   - Final profit: $12,250 (27.2%)
   - Hours logged: 160
   - Materials used: Listed
   - Total project duration: 5 weeks

5. Archive contract (remains in system for records)
```

**Result:**
- Total project revenue: $45,000
- Total costs: $32,750
- Net profit: $12,250
- Profit margin: 27.2%
- All documented with receipts and audit trail

---

### 4.2 Scenario: Weekly Payroll

**Situation:** It's Monday morning, you need to pay 8 employees for last week.

**Your Workflow (15 minutes):**

**Step 1: Open Payments Section**
```
1. Click "Payments" in navigation
2. System shows current week: Jan 25-31, 2026
3. See 8 pending payments totaling $9,600
```

**Step 2: Review Pending Payments**
```
Employee List:
┌────────────────────────────────────────────┐
│ John Smith       $1,200  5 days  Pending   │
│ Mike Johnson     $1,400  5 days  Pending   │
│ Sarah Williams   $1,100  5 days  Pending   │
│ David Brown      $1,050  4 days  Pending ← │
│ Lisa Davis       $1,200  5 days  Pending   │
│ Tom Wilson       $1,300  5 days  Pending   │
│ Emily Martinez   $1,150  5 days  Pending   │
│ Chris Anderson   $1,200  5 days  Pending   │
└────────────────────────────────────────────┘

Total Pending: $9,600
```

**Step 3: Adjust Days (if needed)**
```
Notice: David Brown only worked 4 days (sick on Friday)

1. Click "Edit Days" next to David Brown
2. Change from 5 → 4 days
3. System recalculates: $1,050 × (4/5) = $840
4. Save
```

**Step 4: Batch Mark as Paid**
```
1. Click "Mark All as Paid" button

2. Enter details in modal:
   - Paid Date: Jan 26, 2026
   - Starting Check Number: 1030
   - Payment Method: Check (default)

3. Review summary:
   - 8 payments
   - Checks #1030-1037
   - Total: $9,390

4. Click "Confirm All"

5. System processes:
   - Marks all 8 as "Paid"
   - Assigns sequential check numbers
   - Updates payment history
   - Records in audit log
```

**Step 5: Print Checks**
```
1. Click "Generate Batch Checks" button

2. Select all 8 payments

3. Click "Generate PDF"

4. System creates one PDF with 8 professional checks:
   ┌─────────────────────────────────────┐
   │ SOUTH PARK CABINETS                 │
   │ 123 Main St, Town, ST 12345        │
   │ (555) 555-5555                     │
   │                                     │
   │ Check #1030                  DATE: 01/26/26 │
   │ PAY TO THE ORDER OF                 │
   │ John Smith                          │
   │ One Thousand Two Hundred Dollars    │
   │ AMOUNT: $1,200.00                   │
   │                                     │
   │ FOR: Week of Jan 25-31, 2026       │
   │ _____________________               │
   │ Authorized Signature                │
   └─────────────────────────────────────┘

5. Print PDF on check stock

6. Sign all checks

7. Distribute to employees
```

**Step 6: Generate Weekly Report**
```
1. Click "Weekly Report" button

2. System generates PDF summary:
   - Date range: Jan 25-31, 2026
   - Total employees paid: 8
   - Total amount: $9,390
   - Payment method breakdown:
     * Checks: 8 employees, $9,390
   - Individual payment details
   - Signatures section

3. Save PDF for records

4. Done! ✓
```

**Time Elapsed: 15 minutes**

**Old Way (Spreadsheets): 2 hours**
- Look up each employee in different files
- Calculate amounts manually
- Type each check in Word
- Print one at a time
- Update multiple spreadsheets
- Risk of errors

**New Way (This System): 15 minutes**
- All data in one place
- Automatic calculations
- Batch check printing
- One click to update everything
- Complete audit trail

---

### 4.3 Scenario: Handling Employee Absence

**Situation:** Sarah Williams was sick for 2 days this week.

**Your Workflow:**

**Option 1: Record Absence (for tracking)**
```
1. Go to Employees section

2. Find Sarah Williams

3. Click "Add Absence"

4. Fill form:
   - Date: Jan 27, 2026
   - Duration: 2 days
   - Reason: Sick Leave
   - Paid/Unpaid: Unpaid

5. Save

Result: System logs absence for HR records
```

**Option 2: Adjust Weekly Payment**
```
1. Go to Payments section

2. Find Sarah's pending payment for this week

3. Click "Edit Days"

4. Change from 5 → 3 days

5. System recalculates:
   - Weekly Rate: $1,100
   - Daily Rate: $220
   - New Amount: $220 × 3 = $660

6. Save

7. When marking as paid, she receives $660 instead of $1,100
```

**Best Practice:**
- Record absence in Employees section for HR tracking
- Adjust payment in Payments section for correct pay
- Add note on payment: "Sick 2 days - paid 3 days"

---

### 4.4 Scenario: Issuing Severance Payment

**Situation:** Laying off Tom Wilson, need to pay severance.

**Your Workflow:**

**Step 1: Update Employee Status**
```
1. Go to Employees section

2. Find Tom Wilson

3. Click "Edit"

4. Change status: Active → Laid Off

5. Fill severance details:
   - Severance Date: Feb 1, 2026
   - Severance Reason: "Position eliminated - business slowdown"
   - Severance Amount: $2,600 (2 weeks pay)

6. Save

System marks: No more auto-generated weekly payments
```

**Step 2: Process Final Regular Payment**
```
1. Go to Payments section

2. Mark Tom's last week as paid (Jan 25-31)
   - Amount: $1,300 (full week)
   - Method: Check #1050
   - Status: Paid

3. This is his final regular paycheck
```

**Step 3: Process Severance Payment**
```
1. Still in Payments section

2. Click "Add Custom Payment"

3. Fill form:
   - Employee: Tom Wilson
   - Amount: $2,600
   - Reason: "Severance - 2 weeks"
   - Payment Date: Feb 1, 2026
   - Payment Method: Check
   - Check Number: 1051
   - Note: "Final severance per company policy"

4. Mark as Paid

5. System shows:
   - Regular payment: $1,300 (paid)
   - Severance: $2,600 (paid)
   - Total final compensation: $3,900
```

**Step 4: Generate Documentation**
```
1. Export Tom Wilson's payment history:
   - Shows all payments from hire date to termination
   - Total earned: $62,400
   - Total severance: $2,600
   - Grand total: $65,000

2. Generate PDF for HR records

3. Tom's employee card now shows:
   - Status: Laid Off
   - Last Payment: Feb 1, 2026
   - Severance Paid: Yes
   - Eligible for Rehire: (set per company policy)
```

**Result:**
- Clean audit trail of separation
- Severance properly documented
- Tax reporting ready
- Historical data preserved

---

## 5. Problem Solving & FAQ

### 5.1 Payment Questions

**Q: What if I mark a payment as paid by mistake?**

A: Use the "Reverse Payment" feature:
1. Find the payment in history
2. Click "Reverse Payment"
3. Enter reason (e.g., "Marked paid accidentally")
4. System creates reversal entry (negative amount)
5. Net effect: $0, but full audit trail preserved

**Q: Can I edit a paid payment?**

A: No - payments are immutable once marked paid. This is intentional for accounting compliance. If you need to correct:
1. Reverse the incorrect payment (with reason)
2. Create a new correct payment
3. Both transactions appear in audit log

**Q: How do I handle partial weeks?**

A: Use the "Edit Days" feature:
1. Click "Edit Days" on the payment
2. Enter actual days worked (1-7)
3. System calculates: (Weekly Rate ÷ 5) × Days Worked
4. Example: $1,000 weekly rate, 3 days = $600

**Q: What if an employee works overtime?**

A: Add a custom payment:
1. Click "Add Custom Payment"
2. Select employee
3. Enter overtime amount
4. Add reason: "5 hours overtime @ $45/hr"
5. This creates a separate payment entry

**Q: Can I pay someone who isn't an employee?**

A: Yes, but add them as an employee first (even if temporary):
1. Create employee with "Paused" status
2. Enter their one-time rate
3. Process payment as normal
4. System maintains record for tax purposes

### 5.2 Contract Questions

**Q: Can I track material costs per contract?**

A: Yes, three ways:
1. **Direct Materials**: Add from Materials catalog
2. **Bills**: Link existing bills to contract
3. **Labor**: Add employee hours/costs

System automatically calculates total costs and profit.

**Q: What if a contract changes mid-project?**

A: Update the contract:
1. Click "Edit Contract"
2. Change contract amount (e.g., from $45K to $52K)
3. Add note explaining change order
4. Continue adding costs
5. Profit recalculates automatically

**Q: How do I handle multiple payment milestones?**

A: When creating contract:
1. Add all milestones up front:
   - Deposit: $15,000
   - Demo: $10,000
   - Install: $10,000
   - Final: $10,000
2. As each is completed, click "Mark Payment Received"
3. System tracks received vs. remaining balance

**Q: Can I see profitability mid-project?**

A: Yes! The contract card shows real-time:
- Total contract amount
- Payments received so far
- Costs incurred to date
- Current profit/loss
- Projected final margin

### 5.3 Employee Questions

**Q: How do I change an employee's salary?**

A: Two options:

**Option 1: Simple Change**
1. Edit employee
2. Change weekly rate
3. Save
4. Future payments use new rate

**Option 2: With Audit Trail** (recommended)
1. Click "Add Salary Change" in employee profile
2. Enter new rate and reason
3. Effective date
4. System logs in salary history
5. Preserves record of all rate changes

**Q: What if someone is on vacation?**

A: Depends on your policy:

**Paid Vacation:**
- Process payment normally (5 days)
- Add note: "Vacation week"

**Unpaid Vacation:**
- Edit payment: 0 days worked
- Or: Skip that week entirely

**Q: Can I batch update employee information?**

A: Not currently. Future feature. For now:
- Edit each employee individually
- Use CSV export → edit → import (advanced)

### 5.4 Reports & Data

**Q: Can I export my data?**

A: Yes, multiple ways:

**PDF Reports:**
- Weekly Payment Report
- Contract Summary
- Employee Payment History
- Year-End Summary

**CSV Export:**
- Go to Settings → Data Management
- Click "Export All Data"
- Download CSV files for:
  * Employees
  * Payments
  * Contracts
  * Bills
  * Materials

**Import to Excel/QuickBooks:**
- Open CSV files
- Map columns to your accounting software
- Import as journal entries

**Q: How far back does data go?**

A: Forever! System preserves:
- All payment history
- All contracts (completed and active)
- All employee records
- All bill records
- Complete audit trail

You can filter by year:
- Switch year selector in top navigation
- Each year maintains separate view
- Historical data never deleted

**Q: Can I generate tax reports?**

A: Yes, annual reports show:
- Total paid per employee (for 1099/W2)
- Payment method breakdown
- Quarterly summaries
- YTD totals

Export to CSV and provide to your accountant.

### 5.5 System & Technical

**Q: What if I lose internet connection?**

A: Most recent data is cached locally:
- You can view existing records
- Cannot save changes until reconnected
- System shows "Offline" indicator
- Changes sync when connection restored

**Q: Can multiple people use the system?**

A: Yes! Invite coworkers:
1. Go to Settings → Users
2. Click "Add User"
3. Enter their email
4. Select role (Admin or Coworker)
5. They receive invitation email

Each person has their own login.

**Q: Is my data backed up?**

A: Yes, automatically:
- Stored in Supabase (enterprise database)
- Real-time backup to cloud
- Point-in-time recovery available
- 99.9% uptime guarantee

You can also create manual backups:
- Settings → Data Management → Generate Backup

**Q: What if I accidentally delete something?**

A: Most deletions are "soft deletes":
- Employee: Can be reactivated
- Contract: Can be restored
- Bill: Can be undeleted (within 30 days)
- Payment: Cannot be deleted (append-only ledger)

Contact support for recovery assistance.

**Q: How do I reset my password?**

A: On login page:
1. Click "Forgot Password"
2. Enter email address
3. Check inbox for reset link
4. Create new password
5. Login with new credentials

---

## 6. Quick Reference

### 6.1 Daily Checklist

**Every Morning (5 minutes):**
- [ ] Check Dashboard for pending payments
- [ ] Review new bills/invoices
- [ ] Check active contract status
- [ ] Respond to any alerts

**As Needed:**
- [ ] Record new bills when received
- [ ] Update contract milestones when reached
- [ ] Add new employees when hired
- [ ] Record absences/sick days

### 6.2 Weekly Checklist

**Every Monday (15-20 minutes):**
- [ ] Process weekly payroll
- [ ] Review pending payments list
- [ ] Adjust days worked if needed
- [ ] Mark all as paid (batch process)
- [ ] Generate and print checks
- [ ] Distribute checks to employees
- [ ] Generate weekly payment report
- [ ] File PDF for records

**Every Friday:**
- [ ] Review week's expenses (bills)
- [ ] Update project progress
- [ ] Prepare for next week's payroll

### 6.3 Monthly Checklist

**First Day of Month:**
- [ ] Generate previous month payment report
- [ ] Review all contracts for profitability
- [ ] Export data for accounting
- [ ] Reconcile payments with bank statements
- [ ] Check for overdue bills

**Monthly Tasks:**
- [ ] Review employee statuses
- [ ] Update completed contracts
- [ ] Archive old bills
- [ ] Review materials pricing
- [ ] Check system for updates

### 6.4 Quarterly Checklist

**Every Quarter:**
- [ ] Generate quarterly financial report
- [ ] Export payment data for taxes
- [ ] Review profit margins on contracts
- [ ] Update materials catalog pricing
- [ ] Backup all data manually
- [ ] Provide reports to accountant

### 6.5 Annual Checklist

**End of Year:**
- [ ] Generate annual payment summary per employee
- [ ] Export all data for tax filing
- [ ] Create year-end backup
- [ ] Archive completed contracts
- [ ] Review employee salary history
- [ ] Prepare W2/1099 information
- [ ] Switch to new fiscal year
- [ ] Update settings for new year

### 6.6 Quick Reference Table

| Section | Primary Use | Key Actions | Reports Available |
|---------|-------------|-------------|-------------------|
| **Dashboard** | Daily overview | View summaries | None (aggregates only) |
| **Employees** | Workforce management | Add, Edit, View History | Employee Payment History |
| **Payments** | Weekly payroll | Mark Paid, Print Checks, Reverse | Weekly Report, Batch Checks, Annual Summary |
| **Contracts** | Project tracking | Create, Add Costs, Mark Milestones | Contract Summary, Profit Analysis |
| **Bills** | Expense tracking | Record, Mark Paid, Categorize | Monthly Bills, Category Breakdown |
| **Materials** | Product catalog | Add, Edit, Price Update | Material Usage by Contract |
| **Settings** | System config | Company Info, Users, Backup | None (configuration only) |

### 6.7 Keyboard Shortcuts

| Action | Shortcut | Where |
|--------|----------|-------|
| Open search | `Ctrl/Cmd + K` | Anywhere |
| Navigate sections | `Arrow keys` | Navigation menu |
| Save form | `Ctrl/Cmd + Enter` | Any form |
| Close modal | `Esc` | Any dialog |
| Print | `Ctrl/Cmd + P` | Report views |

### 6.8 Payment Method Reference

| Method | When to Use | Requires | Best For |
|--------|-------------|----------|----------|
| **Cash** | Small amounts, day workers | Signature log (manual) | Occasional labor |
| **Check** | Standard payroll | Check stock, printer | Regular employees |
| **Direct Deposit** | Preferred by most | Bank details on file | All employees (best) |
| **ACH** | Electronic payment | Bank routing/account | Vendors, contractors |
| **Wire** | Urgent/large payments | Bank details | Large amounts, urgent |

### 6.9 Status Reference

**Employee Status:**
- **Active**: Working regularly, receives auto-generated payments
- **Paused**: Temporarily not working (leave, suspension)
- **Leaving**: Gave notice, final payments pending
- **Laid Off**: Terminated, severance may apply

**Payment Status:**
- **Pending**: Not yet paid, awaiting processing
- **Paid**: Completed and processed
- **Reversed**: Canceled with audit trail

**Contract Status:**
- **Pending**: Quote sent, not approved
- **In Progress**: Work started, ongoing
- **Completed**: Finished and closed
- **Cancelled**: Terminated early

**Bill Status:**
- **Pending**: Not yet paid
- **Paid**: Payment completed
- **Overdue**: Past due date

### 6.10 Common Calculations

**Daily Rate from Weekly:**
```
Daily Rate = Weekly Rate ÷ 5
Example: $1,200 ÷ 5 = $240/day
```

**Partial Week Pay:**
```
Partial Pay = Daily Rate × Days Worked
Example: $240 × 3 days = $720
```

**Contract Profit:**
```
Profit = Contract Amount - (Labor + Materials + Bills)
Example: $45,000 - $32,750 = $12,250
```

**Profit Margin:**
```
Margin % = (Profit ÷ Contract Amount) × 100
Example: ($12,250 ÷ $45,000) × 100 = 27.2%
```

---

## 7. Getting Started

### 7.1 First Week Setup

**Day 1: Company Setup (30 minutes)**

1. **Login for first time**
   - Use credentials provided
   - Change password immediately

2. **Configure Settings**
   - Go to Settings section
   - Enter company information:
     * Company Name: "South Park Cabinets"
     * Address, phone, email
   - Enter banking information:
     * Bank name and routing number
     * Starting check number (e.g., 1001)
   - Save settings

3. **Create User Account** (optional)
   - Add additional admin or coworker
   - Test login with that account

**Day 2: Import Employees (1-2 hours)**

1. **Prepare Employee Data**
   - Gather employee information:
     * Names, positions
     * Weekly rates
     * Payment methods
     * Bank details (if direct deposit)

2. **Add Each Employee**
   - Click "Add Employee"
   - Fill in complete information
   - Set status to "Active"
   - Save

3. **Verify All Employees**
   - Check employee cards
   - Ensure payment methods correct
   - Test editing one employee

**Day 3: Add Materials Catalog (1 hour)**

1. **Review Pre-loaded Materials**
   - System has 20+ common items
   - Verify pricing matches your suppliers
   - Update prices if needed

2. **Add Your Custom Materials**
   - Click "Add Material"
   - Add specialty items you use
   - Include supplier info and SKU

3. **Organize by Category**
   - Plywood, lumber, hardware, etc.
   - Makes contract creation easier

**Day 4: Import Active Contracts (2-3 hours)**

1. **Gather Contract Information**
   - Active projects
   - Client information
   - Contract amounts
   - Costs incurred to date

2. **Create Each Contract**
   - Start with most recent
   - Enter all details
   - Add costs already incurred
   - Link any existing bills

3. **Verify Profit Calculations**
   - Check if numbers match your records
   - Adjust if needed

**Day 5: Process First Payroll (1 hour)**

1. **Review Pending Payments**
   - System shows current week
   - Check each employee listed
   - Verify amounts correct

2. **Mark as Paid (Practice)**
   - Try marking one payment as paid
   - Enter payment details
   - Generate check PDF
   - Print and review

3. **If Satisfied, Process All**
   - Batch mark all as paid
   - Generate checks
   - Distribute to employees

### 7.2 Best Practices

**Data Entry:**
- ✅ Enter data daily, don't let it pile up
- ✅ Use consistent naming (e.g., always "John Smith", not "J. Smith")
- ✅ Add notes/descriptions for context
- ✅ Double-check amounts before saving
- ❌ Don't rush through forms
- ❌ Don't skip optional fields (they help later)

**Payments:**
- ✅ Process payroll same day each week
- ✅ Always enter reversal reasons
- ✅ Keep check stock secure
- ✅ Reconcile with bank monthly
- ❌ Never delete payment records
- ❌ Don't mark as paid until actually paid

**Contracts:**
- ✅ Create contract before starting work
- ✅ Add costs as they occur (don't wait)
- ✅ Update status regularly
- ✅ Generate final report when complete
- ❌ Don't forget to link bills to contracts
- ❌ Don't leave contracts in "Pending" forever

**Security:**
- ✅ Use strong passwords
- ✅ Log out when finished
- ✅ Limit user access appropriately
- ✅ Review audit logs periodically
- ❌ Don't share login credentials
- ❌ Don't access from public computers

**Backups:**
- ✅ System auto-backs up to Supabase
- ✅ Create manual backup monthly
- ✅ Export CSV files quarterly
- ✅ Store backups off-site (cloud)
- ❌ Don't rely on local storage only
- ❌ Don't ignore backup failures

### 7.3 Training New Users

**For New Admins:**

1. **Week 1: Read-Only**
   - Read this entire guide
   - Watch you process payroll
   - Observe contract creation
   - Ask questions

2. **Week 2: Supervised Practice**
   - They process payroll (you watch)
   - They create a test contract
   - They add a test employee
   - Correct mistakes together

3. **Week 3: Independent**
   - They work independently
   - You spot-check their work
   - Address any questions
   - Review reports together

4. **Week 4: Fully Trained**
   - Operating independently
   - Confident in all features
   - Knows where to find help
   - Can train others

**For Coworkers (View-Only):**

1. **Give Access**
   - Create coworker account
   - They login and explore
   - Explain what they can/cannot do

2. **Show Key Features**
   - How to view employee information
   - How to check contract status
   - How to see payment history
   - Answer their questions

3. **Set Expectations**
   - They cannot edit or delete
   - They can view and export
   - They should report errors to admin
   - Access may be revoked if misused

### 7.4 Troubleshooting

**Can't Login:**
1. Check caps lock is off
2. Verify email address is correct
3. Click "Forgot Password" to reset
4. Clear browser cache
5. Try different browser
6. Contact support if persists

**Data Not Saving:**
1. Check internet connection
2. Look for error messages
3. Try refreshing page
4. Re-enter data
5. Try different browser
6. Report bug if continues

**Calculation Seems Wrong:**
1. Verify employee weekly rate
2. Check days worked entered
3. Look for manual adjustments
4. Review deductions
5. Check contract linked costs
6. Compare with last week/month

**PDF Won't Generate:**
1. Allow pop-ups in browser
2. Try different browser
3. Check printer/PDF driver installed
4. Clear browser cache
5. Try downloading vs. printing
6. Report issue if unresolved

**Missing Data:**
1. Check you're in correct year
2. Verify filters aren't too restrictive
3. Check status filters (Active/Paused/etc)
4. Look in archive section
5. Contact support for data recovery

### 7.5 Getting Help

**Built-In Help:**
- Every page has tooltips (hover over ? icons)
- Forms show inline validation
- Error messages explain what's wrong

**This Guide:**
- Keep this guide bookmarked
- Use Ctrl+F to search for keywords
- Check FAQ section first

**Video Tutorials:**
- Located in Help menu
- Short 2-5 minute demos
- Cover common tasks

**Email Support:**
- support@southparkcabinets.com
- Include screenshots if possible
- Describe what you were trying to do
- Response within 24 hours (weekdays)

**Emergency Contact:**
- For system down or data loss
- Call (555) 555-5555 ext. 911
- Available 24/7

### 7.6 System Updates

**How Updates Work:**
- System automatically updates
- Usually happens overnight
- No action required from you
- Data is preserved

**What Gets Updated:**
- Bug fixes
- New features
- Security patches
- Performance improvements

**Update Notifications:**
- You'll see "What's New" popup
- Lists new features
- Highlights improvements
- Dismiss when read

**If Something Breaks After Update:**
1. Refresh page (Ctrl+R)
2. Clear cache and retry
3. Report issue to support
4. They can rollback if critical

---

## Appendix A: Glossary

**Accounting Terms:**

- **Append-Only Ledger**: System where records are never deleted, only added. Provides complete audit trail.
- **Reversal Entry**: Negative transaction that cancels a previous positive transaction. Net effect is $0.
- **Gross Profit**: Revenue minus direct costs (materials + labor).
- **Profit Margin**: Profit as a percentage of total revenue.
- **Audit Trail**: Complete history of all changes made to financial data.
- **Fiscal Year**: 12-month accounting period (Jan 1 - Dec 31 for most businesses).

**Payment Terms:**

- **Direct Deposit**: Electronic transfer directly to employee's bank account.
- **ACH (Automated Clearing House)**: Electronic bank-to-bank transfer.
- **Wire Transfer**: Fast electronic payment, usually for large amounts.
- **MICR Line**: Magnetic ink character recognition - the numbers at bottom of checks.
- **Routing Number**: 9-digit code identifying your bank.
- **Account Number**: Your specific bank account identifier.

**Business Terms:**

- **Milestone Payment**: Partial payment received when project reaches specific stage.
- **Down Payment**: Initial deposit when contract is signed.
- **Severance**: Compensation paid when terminating employee.
- **Contract Amount**: Total agreed price for entire project.
- **Labor Cost**: Cost of employee hours on a project.
- **Material Cost**: Cost of supplies/materials used.
- **Overhead**: Indirect costs (insurance, utilities, office, etc.).

**System Terms:**

- **Admin**: User with full access to edit and manage all data.
- **Coworker**: User with read-only access to view data.
- **Supabase**: Cloud database where your data is stored securely.
- **PDF**: Portable Document Format - universal file type for reports.
- **CSV**: Comma-Separated Values - spreadsheet format for data export.
- **Backup**: Copy of all your data for disaster recovery.

---

## Appendix B: Contact Information

**Technical Support:**
- Email: support@southparkcabinets.com
- Hours: Mon-Fri 8am-6pm EST
- Response Time: Within 24 hours

**Emergency Support:**
- Phone: (555) 555-5555 ext. 911
- Available: 24/7 for critical issues
- For: System down, data loss, urgent bugs

**Feature Requests:**
- Email: features@southparkcabinets.com
- Describe feature you'd like
- Explain use case and benefit
- We review all requests monthly

**General Questions:**
- Email: info@southparkcabinets.com
- For: Billing, account management, general inquiries

**Developer:**
- Technical issues beyond user support
- System integration questions
- Custom development requests

---

## Appendix C: Changelog

**Version 1.0 - February 2026**
- Initial release
- Complete payroll system
- Contract management
- Bills tracking
- Materials catalog
- Multi-year data support
- PDF report generation
- Append-only payment ledger
- Audit trail system

**Upcoming Features (Roadmap):**
- Mobile app for iOS/Android
- Time tracking integration
- Inventory management
- Customer portal (clients can view project status)
- Advanced reporting (custom date ranges, filters)
- Batch CSV import for employees
- Integration with QuickBooks
- Photo gallery per contract
- Email notifications for milestones
- SMS reminders for pending payments

---

**End of User Guide**

Thank you for using South Park Cabinets Management Platform!

For the latest updates to this guide, visit: [https://docs.southparkcabinets.com](https://docs.southparkcabinets.com)

Last Updated: February 2, 2026
