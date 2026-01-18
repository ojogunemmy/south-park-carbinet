# South Park Cabinets Management - Design & Features Documentation

## Overview

South Park Cabinets Management is a comprehensive business management system designed specifically for cabinet companies. It provides complete tools for managing employees, contracts, materials, payments, bills, and project costs.

---

## 1. Dashboard / Home Page

### Purpose
The dashboard is the central hub where users can see key business metrics, recent activities, and quick access to all major features.

### Key Features
- **Welcome Banner**: Prominent header with quick navigation buttons to main sections
- **KPI Cards**: Real-time metrics displaying:
  - Total Employees (with active count)
  - Active Contracts (with total value)
  - Outstanding Bills (with total amount)
  - Total Costs (materials & miscellaneous)
  - Profit Summary (with margin percentage)

- **Payroll History Section**:
  - 2026 Payroll History overview
  - Total Paid YTD (completed payments in green)
  - Weekly Obligation (all employees' total weekly pay in blue)
  - Monthly Breakdown (shows payment distribution across all 12 months)

### Navigation
The left sidebar provides quick access to:
- **Team Management**: Employees, Work Letters, Workers
- **Financial**: Contracts, Payments, Bills, Costs
- **Operations**: Materials, Settings

---

## 2. Employees Management

### Purpose
Manage all employee information, payment schedules, and employment status tracking.

### Key Features

#### Employee List Display
- **Table Columns**:
  - ID (unique identifier)
  - Name
  - Position/Job Title
  - Weekly Rate (hourly or weekly compensation)
  - Start Date
  - Payment Method (Check, Direct Deposit, etc.)
  - Status (Active, Paused, Laid Off, etc.)
  - Action Buttons (View, Edit, Delete)

#### Employee Summary Statistics
- Total Employees count with breakdown
- Active employees count
- Paused employees count
- Leaving/Laid Off count

#### Action Buttons
- **Download Template**: Export employee template for bulk import
- **Download Employees**: Export current employee list
- **Detailed Report**: Generate comprehensive employee report
- **Bulk Set Days**: Quickly set payment days for multiple employees
- **Add Employee**: Create new employee record

#### Search & Filter
- Filter by payment status (All Status, Active, Paused, etc.)
- Date range filtering for employee start dates
- Real-time search capabilities

#### Employee Details
When editing or viewing an employee:
- Full Name
- Position
- Weekly Rate
- Tax Information (Federal withholding, State, FICA)
- Payment Schedule (Weekly/Bi-weekly/Monthly)
- Direct Deposit or Check payment details
- Employment Status tracking

---

## 3. Contracts Management

### Purpose
Track client contracts, deposits, payment schedules, project details, and generate professional invoices.

### Key Features

#### Contract Overview
- **Alert System**: Displays overdue contracts in red banner
- **Active Contracts List** with columns:
  - Contract ID (clickable link)
  - Client Name
  - Project Name
  - Contract Value
  - Deposit Received
  - Due Date
  - Status (Pending, Active, Completed)
  - Action Buttons

#### Contract Statistics
- Total Contracts count
- Total Contract Value (sum of all contracts)
- Pending Payments amount

#### Action Tools
- **Material Calculator**: Built-in tool to calculate project costs
  - Select materials with quantities
  - Automatic cost calculation
  - Real-time total updates
- **Print**: Generate contract summary
- **New Contract**: Add new client contract

#### Contract Details
When creating/editing a contract:
- Contract ID
- Client Name and Address
- Project Name and Address
- Contract Value
- Down Payment information
- Payment Schedule setup
- Material List with quantities and prices
- Cost Tracking:
  - Material Costs
  - Labor Costs
  - Miscellaneous Costs
- Budget Summary with profit margin calculation

#### PDF Generation
- Professional invoice PDFs
- Budget Summary reports
- Contract documentation download
- Cabinet Installation specifications

#### Payment Tracking
- Down payment recording with:
  - Payment date
  - Payment method (Check, Bank Transfer, etc.)
  - Payment amount
  - Check number (if applicable)
  - Payment attachments
- Automatic invoice generation
- Balance due calculation

---

## 4. Materials Catalog

### Purpose
Maintain a comprehensive materials database with pricing and supplier information for accurate project costing.

### Key Features

#### Materials Summary Statistics
- **Total Materials**: Count of all materials in catalog (29 items)
- **Categories**: Number of material categories (5 categories)
- **Average Price**: Mean price across all materials
- **Price Range**: Minimum and maximum prices available

#### Materials List
Organized in table format with columns:
- **Code**: Material code (e.g., PL170, PL71)
- **Name**: Material name with optional description
- **Category**: Category badge (Plywood, Lumber, Hardware, etc.)
- **Unit**: Unit of measurement (EA, LF, SQ FT, etc.)
- **Price**: Unit price
- **Supplier**: Supplier name and location

#### Example Materials
- Plywood products (birch, oak finishes in various sizes)
- Lumber (poplar, pine, hardwoods)
- Hardware and accessories
- Finishing materials

#### Actions
- **Print**: Generate professional materials catalog PDF with:
  - Company branding header
  - Summary statistics boxes
  - Complete materials list with descriptions
  - Color-coded rows for easy reading
- **Export**: Export materials to Excel/CSV
- **Add Material**: Create new material entry
- **Edit**: Modify material details
- **Delete**: Remove materials from catalog

#### Material Details
- Material Code
- Name and Description
- Category assignment
- Unit of measure
- Unit Price
- Supplier information
- Usage tracking in projects

---

## 5. Payments & Payroll

### Purpose
Manage employee payments, check printing, payment tracking, and payroll records.

### Key Features

#### Payment Processing
- **Add Payment**: Create individual or bulk payments
- **Payment Methods**:
  - Check (with check number tracking)
  - Direct Deposit
  - Bank Transfer
  - Wire Transfer
  - Credit Card
  - Debit Card
  - Cash

#### Check Management
- **Batch Check Printing**: Print multiple checks at once
- **Check Details**:
  - Check number
  - Employee name and address
  - Payment amount
  - Date
  - Signature line
  - Memo field
- **Check Attachments**: Upload check images/documents
- **Check Verification**: Confirm checks before printing

#### Payment Tracking
- Mark payments as "Pending" or "Paid"
- Payment date recording
- Payment method recording
- Automatic calculation of:
  - Days worked
  - Gross pay
  - Deductions
  - Net pay
- Weekly obligation calculations
- Year-to-date (YTD) payment tracking

#### Bulk Operations
- **Bulk Set Days**: Set working days for multiple employees simultaneously
- **Generate Weekly Payments**: Auto-generate payments for all active employees
- **Print Multiple Checks**: Batch processing for efficiency

#### Reports
- Payment history by employee
- Weekly payment obligations
- Monthly payment summaries
- YTD payment totals
- Severance payment tracking (for laid-off employees)

#### Payment Status Indicators
- Color-coded payment status
- Overdue payment alerts
- Payment history with timestamps

---

## 6. Bills & Expenses

### Purpose
Track company expenses, vendor payments, and maintain organized bill records.

### Key Features

#### Bills Management
- **Bill Tracking**:
  - Bill ID (auto-generated: BILL-YYYY-#)
  - Vendor name
  - Description/Category
  - Amount
  - Due date
  - Status (All, Pending, Paid, Overdue)

#### Vendor Information
- Vendor names (Wurth, Home Depot, Office Depot, Eastway Paint & Materials, Quicktrip, etc.)
- Vendor contact management
- Multiple bills per vendor

#### Bill Categories
- Materials
- Office materials
- Miscellaneous
- Gasoline
- Tools & Equipment
- Labor

#### Filter & Sort Options
- **Status Filters**: All, Pending, Paid, Overdue
- **Date Range**: Filter by due date
- **Search**: Find bills by vendor, description, or amount
- **Category Filtering**: View bills by expense category

#### Actions
- **Add Bill**: Create new bill entry
- **Edit**: Modify bill details
- **Attach Document**: Upload bill documents/receipts
- **View Attachment**: Preview attached documents
- **Delete**: Remove bill records
- **Mark as Paid**: Update bill status

#### Bill Details
- Bill ID
- Vendor name
- Description/Category
- Amount
- Due date
- Date paid (when applicable)
- Payment method
- Notes and comments
- Document attachments

#### Reporting
- **Print**: Generate bill summary report
- **Export**: Download bill list
- Total bills amount calculation
- Overdue bills identification

---

## 7. Project Costs

### Purpose
Track and analyze all project-related costs to monitor profitability and budget performance.

### Key Features

#### Financial Overview
- **Total Contract Value**: Sum of all contract values
- **Total Material Costs**: Sum of all materials used across projects
- **Total Labor Costs**: Sum of all labor expenses
- **Total Miscellaneous Costs**: Other project expenses
- **Total Profit**: Revenue minus total costs
- **Profit Margin**: Percentage profit relative to contract value

#### Cost Status Filter
- All Contracts (3)
- Pending (3)
- In Progress (0)
- Completed (0)

#### Cost Breakdown by Contract
Detailed table showing for each contract:
- Contract ID
- Project Name
- Client Name
- Status
- Contract Value
- Material Costs (color-coded in blue)
- Labor Costs (color-coded in purple)
- Miscellaneous Costs
- Total Costs
- Profit
- Profit Margin %

#### Example Costs Displayed
- CON-003: $78,000 contract with $25,000 materials, $15,000 labor, 48.7% margin
- CON-002: $14,600 contract with $3,129.45 materials, $3,000 labor, 58.0% margin
- CON-001: $7,600 contract with $1,042.96 materials, $1,000 labor, 73.1% margin

#### Analysis Features
- Budget vs. Actual comparison
- Profitability tracking
- Cost efficiency analysis
- Labor cost analysis
- Material cost analysis

#### Reporting
- **Print**: Generate comprehensive cost report
- Export cost data
- Margin analysis for decision-making

---

## 8. Work Letters

### Purpose
Generate professional work letters, verification documents, and employment records.

### Key Features
- Generate employment verification letters
- Create severance letters
- Produce work history documents
- Professional letter formatting
- Easy printing and distribution
- Customizable templates

---

## 9. Workers Management

### Purpose
Manage independent contractors, temporary workers, and other non-employee personnel.

### Key Features
- Worker profile management
- Assignment tracking
- Contract terms
- Payment records
- Document attachments

---

## Design Characteristics

### Color Scheme
- **Primary Blue**: #2563EB (used for main buttons and highlights)
- **Success Green**: #10B981 (for active status and profit indicators)
- **Warning Yellow**: #FCD34D (for pending status)
- **Error Red**: #DC2626 (for overdue items)
- **Neutral Gray**: Various shades for backgrounds and text

### Typography
- **Headers**: Bold, large font (24-32px)
- **Section Headers**: Bold medium font (18-20px)
- **Body Text**: Regular font (14-16px)
- **Labels**: Small font (12-14px)

### Layout
- **Sidebar Navigation**: Left sidebar with collapsible menu
- **Main Content**: Full-width responsive layout
- **Responsive Design**: Mobile-friendly on tablets and phones
- **Card-Based Components**: Using card containers for data organization

### Interactive Elements
- **Buttons**: Various styles (Primary, Secondary, Outline, Danger)
- **Modals/Dialogs**: For detailed forms and confirmations
- **Dropdowns**: For filtering and sorting options
- **Data Tables**: Sortable columns, pagination
- **Date Pickers**: For date range selections

### Data Visualization
- **KPI Cards**: Color-coded metrics
- **Charts**: Bar graphs for monthly/yearly breakdowns
- **Progress Indicators**: Status badges
- **Alerts**: Alert banners for critical information

---

## Key Functionality Highlights

### 1. Automatic Data Persistence
- All changes automatically saved to browser storage
- Year-based data partitioning (separate data for each year)
- No manual save required

### 2. Professional Document Generation
- PDF invoice generation from contracts
- Budget summary reports
- Materials catalog printing
- Bill reports
- Employee records

### 3. Multi-Format Exports
- Excel/CSV exports for all lists
- PDF printing for reports
- Bulk operations for efficiency

### 4. Accessibility Features
- Screen reader support
- Keyboard navigation
- ARIA compliance
- High contrast text
- Focus indicators

### 5. Error Handling
- Input validation
- Error messages with solutions
- Data integrity checks
- Backup confirmation before delete

---

## Navigation Structure

```
Dashboard
├── Team Management
│   ├── Employees
│   ├── Work Letters
│   └── Workers
├── Financial
│   ├── Contracts
│   ├── Payments
│   ├── Bills
│   └── Costs
├── Operations
│   ├── Materials
│   └── Settings
```

---

## Data Organization

### Storage
- **Browser LocalStorage**: Year-partitioned data storage
- **Format**: JSON objects
- **Automatic Sync**: Real-time synchronization across tabs

### Data Models

#### Employee
```
{
  id: string,
  name: string,
  position: string,
  weeklyRate: number,
  startDate: string,
  paymentMethod: string,
  taxInfo: object,
  status: string
}
```

#### Contract
```
{
  id: string,
  clientName: string,
  projectName: string,
  address: string,
  totalValue: number,
  deposits: array,
  paymentSchedule: array,
  materials: array,
  costTracking: object,
  status: string
}
```

#### Material
```
{
  id: string,
  code: string,
  name: string,
  category: string,
  unitPrice: number,
  unit: string,
  supplier: string
}
```

---

## User Workflow Examples

### Example 1: Creating and Managing a Contract

1. **Navigate to Contracts** from sidebar
2. **Click "New Contract"** button
3. **Fill in Contract Details**:
   - Client information
   - Project details
   - Contract value
4. **Add Down Payment**:
   - Select payment method (Check)
   - Enter check number
   - Record payment date
5. **Use Material Calculator**:
   - Select materials from catalog
   - Adjust quantities
   - View automatic cost calculation
6. **Generate Invoice**:
   - Click Print button
   - Download PDF invoice
   - Email to client

### Example 2: Processing Payroll

1. **Navigate to Payments**
2. **Click "Generate Weekly Payments"**
   - Automatically creates payments for all active employees
3. **Review Payments**:
   - Verify amounts
   - Confirm payment methods
4. **Print Checks**:
   - Select check printing option
   - Print batch of checks
   - Record check numbers
5. **Mark as Paid**:
   - Update payment status
   - Record actual payment date

### Example 3: Tracking Project Costs

1. **Navigate to Project Costs**
2. **View Cost Breakdown by Contract**:
   - See material costs
   - Review labor costs
   - Analyze profitability
3. **Generate Report**:
   - Print cost analysis
   - Share with management
   - Use for pricing decisions

---

## Performance & Reliability

- **Fast Load Times**: Optimized for quick page loads
- **Offline Capability**: Works with cached data
- **Auto-Save**: Eliminates data loss risks
- **Data Validation**: Prevents invalid entries
- **Responsive Design**: Works on all devices

---

## Security Features

- **Authentication**: Secure login system
- **Access Control**: Role-based permissions
- **Data Protection**: Encrypted storage
- **Audit Trail**: Track all changes
- **Session Management**: Automatic timeout

---

## Future Enhancement Opportunities

- Cloud synchronization
- Multi-user collaboration
- Advanced reporting and analytics
- Mobile app
- API integrations
- Advanced filtering and search
- Custom templates
- Automated reminders
- Email notifications
- Integration with accounting software

---

## Support & Documentation

For more information and technical details, refer to:
- DEPLOYMENT_AND_DEVELOPER_GUIDE.md
- QUICK_START_FOR_DEVELOPER.md
- PROJECT_REQUIREMENTS.md

---

*Last Updated: January 2026*
*Version: 1.0*
