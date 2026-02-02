# Payment History Persistence & Reversal Display

## Overview
Updated PaymentHistory page to fetch data from Supabase database and display both paid payments and reversal entries in chronological order, ensuring complete ledger visibility and persistence.

## Key Changes

### 1. Data Source Migration
**Before:** PaymentHistory fetched from localStorage
```typescript
const payments = getYearData<PaymentObligation[]>("payments", selectedYear, []);
const paidPayments = payments.filter(p => p.status === "paid");
```

**After:** PaymentHistory fetches from Supabase database
```typescript
const allPayments = await paymentsService.getAll();
const yearPayments = allPayments.filter(p => 
  p.year === selectedYear && 
  (p.status === "paid" || p.is_correction) // Include paid + reversals
);
```

### 2. Reversal Entry Display

#### Visual Indicators
- **Desktop Table:**
  - Orange background (`bg-orange-50`) for reversal entries
  - RotateCcw icon (🔄) next to week dates
  - Orange text for amounts instead of green
  - "🔄" emoji prefix on reason badges

- **Mobile Cards:**
  - Orange border (`border-orange-300`) and background
  - "Reversal Entry" title instead of "Payment Batch"
  - Orange-styled badges and amounts
  - "Employees Affected" instead of "Employees Paid"

#### Data Structure
```typescript
interface PaymentLedgerEntry extends Payment {
  employee_name?: string;
  employee_position?: string;
  is_correction?: boolean;  // Identifies reversal entries
  reversal_reason?: string | null;  // Reason for reversal
  reverses_payment_id?: string | null;  // Original payment ID
  reversed_by_payment_id?: string | null;  // Reversal entry ID
  reason?: string;  // Additional reason field
}

interface PaymentRecord {
  weekStartDate: string;
  weekEndDate: string;
  paidDate: string;
  entries: PaymentLedgerEntry[];  // Changed from 'employees'
  totalAmount: number;
  reasons: string[];
}
```

### 3. Chronological Ordering

Payments are sorted by:
1. **Paid date** (newest first)
2. **Created timestamp** (for same-day entries)

```typescript
const records = Array.from(recordsMap.values()).sort((a, b) => {
  const dateCompare = new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime();
  if (dateCompare !== 0) return dateCompare;
  
  // Same paid date? Sort by creation time
  const aCreated = a.entries[0]?.created_at || a.paidDate;
  const bCreated = b.entries[0]?.created_at || b.paidDate;
  return new Date(bCreated).getTime() - new Date(aCreated).getTime();
});
```

### 4. Immutable Ledger Notice

Added informational banner at top of payment summary:
```
📘 Immutable Ledger System
This payment history shows all paid transactions and reversal entries in chronological order.
Reversal entries (marked with 🔄 and orange color) represent corrections to the ledger.
All entries are permanent and cannot be edited or deleted, ensuring complete audit trail compliance.
```

### 5. Database Persistence

All data persists in Supabase `payments` table:
- **Original payments:** `status = 'paid'`, `is_correction = false`
- **Reversal entries:** `status = 'paid'`, `is_correction = true`, negative amounts
- **Audit columns:** `reversal_reason`, `reverses_payment_id`, `reversed_by_payment_id`, `reversed_at`

### 6. Auto-Refresh Mechanism

- Fetches fresh data from database every 5 seconds
- Listens for `paymentsUpdated` custom event from Payments page
- Shows loading indicator during data fetch
- Manual refresh button in toolbar

### 7. Field Name Standardization

Updated all field references to match database schema:
| Old (localStorage) | New (Supabase) |
|-------------------|----------------|
| `employeeId` | `employee_id` |
| `employeeName` | `employee_name` |
| `employeePosition` | `employee_position` |
| `weekStartDate` | `week_start_date` |
| `weekEndDate` | `week_end_date` |
| `paidDate` | `paid_date` |
| `paidCheckNumber` | `check_number` |
| `paymentMethod` | `payment_method` |

### 8. Summary Statistics Updates

Changed label from "Employees Paid" to "Employees Affected" to account for reversals:
```typescript
<p className="text-sm text-slate-600 font-medium">Employees Affected</p>
<p className="text-2xl font-bold text-purple-600">
  {new Set(paymentRecords.flatMap(r => r.entries.map(e => e.employee_id))).size}
</p>
```

## Example Scenarios

### Scenario 1: Regular Payment
```
Week: Jan 1-5, 2026
Paid Date: Jan 7, 2026
Entries: 3 employees
Total: $5,000.00
Color: Green
Icon: None
```

### Scenario 2: Reversal Entry
```
Week: Jan 1-5, 2026
Paid Date: Jan 15, 2026
Entries: 1 employee (John Doe)
Total: -$1,500.00
Color: Orange
Icon: 🔄
Reason: "Overpayment correction - employee was on leave"
```

### Scenario 3: Same Week, Multiple Entries
The ledger will show:
1. Original payment (Jan 7) - Green
2. Reversal entry (Jan 15) - Orange
3. Corrected payment (Jan 16) - Green

All three appear separately in chronological order.

## Benefits

1. **Complete Audit Trail:** Every transaction is visible
2. **Regulatory Compliance:** No data deletion, full history
3. **Error Transparency:** Reversals clearly marked and explained
4. **Database Persistence:** Survives browser storage clears
5. **Multi-user Support:** All users see same ledger state
6. **Chronological Clarity:** Easy to understand sequence of events

## Testing Checklist

- [ ] PaymentHistory loads data from Supabase on mount
- [ ] Both paid payments and reversals display
- [ ] Reversal entries show orange styling
- [ ] Reasons display correctly for both payment types
- [ ] Chronological order is correct (newest first)
- [ ] Auto-refresh works every 5 seconds
- [ ] Manual refresh button works
- [ ] Year filter applies correctly
- [ ] Employee filter applies correctly
- [ ] Date range filters apply correctly
- [ ] PDF export includes all entries
- [ ] Mobile view displays correctly
- [ ] Summary statistics calculate correctly
- [ ] Loading indicator appears during fetch

## Future Enhancements

1. **Audit Trail View:** Click on payment to see full reversal chain
2. **Advanced Filters:** Filter by "Paid Only" or "Reversals Only"
3. **Export Options:** Export to Excel with color-coded entries
4. **Search:** Full-text search across reasons and employee names
5. **Pagination:** For years with many transactions
6. **Net Calculation:** Show net amount per employee after reversals
