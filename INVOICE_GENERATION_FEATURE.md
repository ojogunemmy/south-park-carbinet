# 📄 Invoice Generation After Down Payment - Feature Guide

**Feature Status**: ✅ Implemented (January 14, 2026)  
**Location**: Contracts page - Down Payments section  
**Trigger**: Automatically generated when down payment is recorded

---

## 🎯 What This Feature Does

When you record a **down payment for a contract** (like CON-004), the system automatically:

1. ✅ Saves the down payment to the contract
2. ✅ Generates a professional PDF invoice
3. ✅ Shows a success notification
4. ✅ Allows you to download/print the invoice

The invoice shows:
- Contract details (ID, client name, project)
- Total contract value
- All down payments received (with dates and methods)
- Balance due
- Payment history table

---

## 📋 How to Use (Step-by-Step)

### Step 1: Open Contract Details
1. Go to **Contracts** page
2. Click on a contract row (e.g., CON-004 Onnit Construction)
3. Contract details modal opens

### Step 2: Add Down Payment
In the "Down Payments" section:
1. Click **"Add Down Payment"** button (orange button with + icon)
2. Fill in the form:
   - **Amount**: How much was received (e.g., $23,750)
   - **Date**: When payment was received
   - **Payment Method**: How it was paid (Cash, Check, Wire Transfer, etc.)
   - **Description**: Optional notes (e.g., "Wire transfer from client")
3. Click **"Add Down Payment & Generate Invoice"** button

### Step 3: Invoice Auto-Generates
- Success notification appears: "✅ Down Payment Recorded. Invoice generated."
- PDF invoice automatically downloads to your Downloads folder
- Filename format: `CON-004-Invoice.pdf`

### Step 4: Download Invoice Anytime
To download the invoice again later:
1. Open contract details
2. In Down Payments section, click **"Invoice"** button (green button)
3. PDF downloads again

---

## 📊 What the Invoice Shows

The invoice PDF includes:

### Header
- South Park Cabinets company logo
- "CLIENT AGREEMENT AND INVOICE" title
- Contract ID and date

### Client Information
- Client name, address, phone
- Project name and location

### Contract Value Section
- **Total Contract Value**: The full project amount
- **Example**: $47,500

### Payments Received Section
Shows all down payments as a table:
| Date | Payment Method | Amount |
|------|---|---|
| 1/14/2026 | Wire Transfer | $23,750.00 |

### Summary
- **Total Payments Received**: Sum of all down payments
- **Balance Due**: Contract value minus payments received
- Color-coded: Red if amount due, Green if overpaid

### Footer
- Professional thank you message
- Company contact information

---

## 🔄 Workflow Example: CON-004

**Contract**: Onnit Construction Cabinet Project  
**Total Value**: $47,500  
**Deposit (50%)**: $23,750

### Scenario 1: Recording Initial Down Payment
```
1. Client pays $23,750 on 1/14/2026 via Wire Transfer
2. Open CON-004 contract details
3. Click "Add Down Payment"
4. Enter:
   - Amount: 23750
   - Date: 01/14/2026
   - Method: Wire Transfer
   - Description: "Initial 50% down payment received"
5. Click "Add Down Payment & Generate Invoice"
6. Invoice PDF downloads: "CON-004-Invoice.pdf"
7. Invoice shows:
   - Total Contract: $47,500
   - Payments Received: $23,750
   - Balance Due: $23,750
```

### Scenario 2: Recording Additional Payment
```
1. Client pays remaining $23,750 on 2/01/2026 via Wire Transfer
2. Open CON-004 contract details again
3. See first down payment listed: "$23,750"
4. Click "Add Down Payment"
5. Enter:
   - Amount: 23750
   - Date: 02/01/2026
   - Method: Wire Transfer
   - Description: "Final payment received - project complete"
6. Click "Add Down Payment & Generate Invoice"
7. New invoice downloads showing BOTH payments
8. Invoice now shows:
   - Total Payments Received: $47,500
   - Balance Due: $0
   - Status: Fully Paid ✓
```

---

## 💾 How Invoices Are Stored

### Automatic Saving
- Invoice is generated from the **contract data** (not stored as a file)
- Down payments are saved to contract's `downPayments` array
- When you download invoice, it's created from current data in real-time

### Re-Generate Anytime
- You can download the invoice multiple times
- If you edit down payments, next invoice shows updated amounts
- Supports multiple payment entries (milestone payments, multiple clients, etc.)

---

## 🎨 Invoice Customization (Future)

Current invoice is professional and includes:
- ✅ Company logo
- ✅ Client details
- ✅ Payment history
- ✅ Balance calculations
- ✅ Professional formatting

Future enhancements (Phase 2):
- [ ] Custom company footer/terms
- [ ] Email invoice directly to client
- [ ] Send as attachment
- [ ] Multiple invoice templates
- [ ] Digital signature field
- [ ] QR code for online payment

---

## 🔧 Technical Details

### Invoice Generation Function
```typescript
generateInvoicePDF(contract: Contract)
```

**Location**: `client/pages/Contracts.tsx` (line ~2005)

**Triggers**:
1. Automatically after down payment is recorded
2. Manually via "Invoice" button in Down Payments section
3. Manually via "Download" button on contract row

### Data Used
- Contract ID, client name, project details
- Total contract value
- All down payments (amount, date, method)
- Calculates balance due automatically
- Uses current date for invoice generation

### File Format
- **Type**: PDF (jsPDF library)
- **Filename**: `{CONTRACT_ID}-Invoice.pdf`
- **Example**: `CON-004-Invoice.pdf`

---

## ✨ Key Features

### ✅ Auto-Download
- Invoice automatically downloads when down payment is recorded
- No manual step required
- Saves time in workflow

### ✅ Professional Appearance
- Company branding (logo at top)
- Clean, organized layout
- Proper formatting and spacing
- Color-coded amounts (red for due, green for paid)

### ✅ Complete Payment History
- Shows ALL down payments on one invoice
- Date formatting (readable M/D/YYYY)
- Payment method tracked
- Running totals

### ✅ Accurate Calculations
- Balance Due calculated automatically
- Handles multiple payments
- Handles overpayments (if amount received > contract value)
- Shows net owed/overpaid status

### ✅ Easy Reprint
- Download "Invoice" button always available
- Generate updated invoice anytime
- Useful for record-keeping
- Can print for client records

---

## 🚀 Usage Tips

### Tip 1: Generate Invoice Before Final Payment
```
When client is about to pay final amount:
1. Open contract
2. Add down payment showing current balance
3. Download invoice
4. Send to client showing amount due
```

### Tip 2: Keep Records Organized
```
Recommended workflow:
1. Record payment
2. Invoice auto-downloads
3. Save to folder: "Invoices/2026/CON-004/"
4. Email to client (future feature)
5. Store receipt with invoice
```

### Tip 3: Track Multiple Projects
```
If contract has multiple down payments:
- January: $10,000 down
- February: $10,000 progress payment
- March: $10,000 final payment
- One invoice shows ALL three payments
- Easy to see payment status at a glance
```

---

## 🔍 Invoice Data Structure

Each invoice contains:

```
Header
├── Logo
├── Title: CLIENT AGREEMENT AND INVOICE
├── Contract ID
└── Generated Date

Client Info
├── Client Name
├── Address
├── City, State, ZIP
├── Phone
└── Email

Project Details
├── Project Name
└── Location

Contract Value
├── Total Contract Value: $X.XX

Payments Received (Table)
├── Date | Method | Amount
├── Row 1: [date] [method] [amount]
├── Row 2: [date] [method] [amount]
└── ... (more rows if multiple payments)

Summary
├── Total Payments Received: $X.XX
├── Balance Due: $X.XX
└── [Color indicator if due/paid]

Footer
├── Thank you message
└── Company contact info
```

---

## 💡 Business Benefits

### For Emmanuel (Owner)
- ✅ Professional invoices without manual creation
- ✅ Automatic tracking of payments received
- ✅ Clear visibility of balance due per project
- ✅ Easy to audit (invoice = contract proof)
- ✅ Reduces paperwork

### For Clients
- ✅ Professional document showing contract amount
- ✅ Clear payment history
- ✅ Knows exact balance remaining
- ✅ Can verify invoice against bank transfer
- ✅ Useful for their accounting

### For Team (Phase 2)
- ✅ Standardized invoicing across team
- ✅ No manual invoice creation needed
- ✅ Consistent professional appearance
- ✅ Prevents errors in calculations
- ✅ Searchable payment records

---

## 🔐 Security & Privacy

### Data Included
- Contract ID and dates (needed for invoice)
- Client contact info (client's own data)
- Payment amounts and methods (business record)

### Data Protection
- Invoice is PDF (static document)
- Not stored on server (generated on-demand)
- Uses contract data from localStorage
- No sensitive bank details in invoice (only "Wire Transfer" etc.)

### Compliance
- Useful for tax records
- Payment dates documented
- Method of payment tracked
- Professional format for audits

---

## 📞 Troubleshooting

### Issue: Invoice not downloading
**Cause**: Browser popup blocker or PDF reader issue
**Solution**:
1. Check browser downloads folder
2. Allow popups for this site
3. Try different browser (Chrome recommended)
4. Try again

### Issue: Invoice shows old data
**Cause**: Browser cache
**Solution**:
1. Refresh page (Ctrl+R)
2. Close and reopen contract
3. Click "Invoice" button again

### Issue: Payment amount not showing in invoice
**Cause**: Down payment not saved before generating
**Solution**:
1. Verify down payment appears in list
2. Click "Add Down Payment" button again
3. Make sure to enter amount before clicking generate
4. Check for error message

### Issue: Wrong balance due
**Cause**: Multiple down payments or math error
**Solution**:
1. Check all down payments listed are correct amounts
2. Verify total = sum of all payments
3. Balance Due = Contract Total - Total Payments
4. If still wrong, check contract total value is correct

---

## 🎉 What's Next

### Current Status
✅ Down payments tracked  
✅ Invoices generated automatically  
✅ Professional PDF format  
✅ Multiple payments supported  

### Future Enhancements (Phase 2+)
- [ ] Email invoice directly to client
- [ ] Store invoices in contract attachments
- [ ] Client portal to view invoices
- [ ] Invoice numbering system (INV-2026-001, etc.)
- [ ] Due date reminders
- [ ] Payment links (Stripe integration)
- [ ] Digital signatures
- [ ] Tax form generation (1099s)

---

## 📚 Related Features

This invoice feature works with:
- ✅ **Contract Management** - Creates invoice from contract data
- ✅ **Down Payments** - Tracks payments and shows on invoice
- ✅ **PDF Generation** - Uses jsPDF for professional format
- ✅ **Data Persistence** - Invoice data sourced from localStorage

---

## 📝 Summary

**What**: Automatic invoice generation when recording down payments  
**Where**: Contracts page → Down Payments section  
**When**: Immediately after recording payment  
**How**: Auto-downloads + manual download available  
**Why**: Professional documentation, clear payment tracking, client communication  

---

**Feature Status**: ✅ Complete & Working  
**Last Updated**: January 14, 2026  
**Ready for**: Immediate Use in Production

---

## Quick Reference

| Task | Steps |
|------|-------|
| Add down payment | Contract details → Add Down Payment → Fill form → Click "Add Down Payment & Generate Invoice" |
| Download invoice | Down Payments section → Click "Invoice" button |
| View payments received | Contract details → Down Payments section → Shows all payments with dates/methods |
| Check balance due | Open contract invoice → Shows "Balance Due" amount |
| Regenerate invoice | Click "Invoice" button anytime to get updated PDF |

---

**Questions?** Review APP_STATUS_AND_FEATURES.md for contract management details.

