import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Calendar, FolderOpen, Printer, AlertCircle, RotateCcw, FileText, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { getYearData, saveYearData } from "@/utils/yearStorage";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { paymentsService, type Payment } from "@/lib/supabase-service";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import jsPDF from "jspdf";
import JSZip from "jszip";

interface PaymentLedgerEntry extends Payment {
  employee_name?: string;
  employee_position?: string;
  is_reversal?: boolean;
  is_correction?: boolean;
  reversal_reason?: string | null;
  reverses_payment_id?: string | null;
  reversed_by_payment_id?: string | null;
}

interface PaymentRecord {
  weekStartDate: string;
  weekEndDate: string;
  paidDate: string;
  entries: PaymentLedgerEntry[];
  totalAmount: number;
  reasons: string[]; // Store all reasons for this payment batch
}

interface PaymentHistoryArchive {
  id: string;
  year: number;
  savedDate: string;
  paymentRecords: PaymentRecord[];
  totalRecords: number;
  totalAmount: number;
}

interface AuditLogEntry {
  id: string;
  payment_id: string;
  action: string;
  user_id: string | null;
  reason: string | null;
  created_at: string;
}

export default function PaymentHistory() {
  const { selectedYear } = useYear();
  const { toast } = useToast();
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [lastPaymentCount, setLastPaymentCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [auditTrailOpen, setAuditTrailOpen] = useState(false);
  const [selectedAuditPayment, setSelectedAuditPayment] = useState<PaymentLedgerEntry | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [employeeSelectionOpen, setEmployeeSelectionOpen] = useState(false);
  const [employeeSelectionList, setEmployeeSelectionList] = useState<PaymentLedgerEntry[]>([]);

  // Function to reload payment records from Supabase
  const reloadPaymentRecords = async (showToast: boolean = false) => {
    try {
      setIsLoading(true);
      const allPayments = await paymentsService.getAll();
      
      // Filter payments for selected year and include both paid and reversed entries
      const yearPayments = (allPayments || [])
        .filter((p: any) => {
          const date = new Date(p.week_start_date);
          return date.getFullYear() === selectedYear && 
                 (p.status === "paid" || p.is_correction); // Include paid payments and reversal entries
        })
        .map((p: any) => ({
          ...p,
          employee_name: p.employees?.name || p.employee_name || "Unknown Employee",
          employee_position: p.employees?.position || p.employee_position,
        })) as PaymentLedgerEntry[];

      if (showToast && yearPayments.length > lastPaymentCount) {
        toast({
          title: "✓ Payment History Updated",
          description: `${yearPayments.length - lastPaymentCount} new entry/entries added`,
        });
      }

      setLastPaymentCount(yearPayments.length);
      return yearPayments;
    } catch (error) {
      console.error("Error loading payment records:", error);
      toast({
        title: "✗ Error Loading Payment History",
        description: "Failed to load payment records from database",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Load employees from localStorage for filter dropdown
  useEffect(() => {
    const emps = getYearData<Array<{ id: string; name: string }>>("employees", selectedYear, []) || [];
    setEmployees(emps);
  }, [selectedYear]);

  // View audit trail for a payment entry
  const viewAuditTrail = async (entry: PaymentLedgerEntry) => {
    try {
      setSelectedAuditPayment(entry);
      const logs = await paymentsService.getAuditTrail(entry.id);
      setAuditLogs(logs || []);
      setAuditTrailOpen(true);
    } catch (error) {
      console.error("Error fetching audit trail:", error);
      toast({
        title: "✗ Error Loading Audit Trail",
        description: "Failed to fetch audit logs for this payment",
        variant: "destructive",
      });
    }
  };

  // Open employee selection modal for multiple entries
  const openEmployeeSelection = (entries: PaymentLedgerEntry[]) => {
    setEmployeeSelectionList(entries);
    setEmployeeSelectionOpen(true);
  };

  // Handle employee selection from modal
  const handleEmployeeSelection = (entry: PaymentLedgerEntry) => {
    setEmployeeSelectionOpen(false);
    viewAuditTrail(entry);
  };

  useEffect(() => {
    const loadAndRefreshPaymentRecords = async () => {
      // Get all payments for this year from Supabase
      const yearPayments = await reloadPaymentRecords();

      // Apply employee filter
      let filteredPayments = yearPayments;
      if (filterEmployee !== "all") {
        filteredPayments = yearPayments.filter(p => p.employee_id === filterEmployee);
      }

      // Apply date range filter
      if (filterFromDate) {
        filteredPayments = filteredPayments.filter(p => {
          const paidDate = p.paid_date || p.week_start_date;
          return new Date(paidDate) >= new Date(filterFromDate);
        });
      }

      if (filterToDate) {
        filteredPayments = filteredPayments.filter(p => {
          const paidDate = p.paid_date || p.week_start_date;
          return new Date(paidDate) <= new Date(filterToDate);
        });
      }

      // Group by week and paid date, but keep reversal entries separate
      const recordsMap = new Map<string, PaymentRecord>();

      filteredPayments.forEach(payment => {
        const paidDate = payment.paid_date || payment.week_start_date || new Date().toISOString();
        const weekStart = payment.week_start_date || paidDate;
        const weekEnd = payment.week_end_date || paidDate;
        
        // Create unique key for grouping - include payment ID for reversals to keep them separate
        const key = payment.is_correction 
          ? `reversal_${payment.id}` 
          : `${weekStart}_${paidDate}`;

        if (!recordsMap.has(key)) {
          recordsMap.set(key, {
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            paidDate: paidDate,
            entries: [],
            totalAmount: 0,
            reasons: [],
          });
        }

        const record = recordsMap.get(key)!;
        record.entries.push(payment);
        record.totalAmount += payment.amount || 0;

        // Collect unique reasons
        const reason = payment.reversal_reason || payment.severance_reason || payment.notes;
        if (reason && !record.reasons.includes(reason)) {
          record.reasons.push(reason);
        }
      });

      // Convert to array and sort by paid date (newest first), then by created_at
      const records = Array.from(recordsMap.values()).sort((a, b) => {
        const dateCompare = new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime();
        if (dateCompare !== 0) return dateCompare;
        
        // If same paid date, sort by creation time
        const aCreated = a.entries[0]?.created_at || a.paidDate;
        const bCreated = b.entries[0]?.created_at || b.paidDate;
        return new Date(bCreated).getTime() - new Date(aCreated).getTime();
      });

      setPaymentRecords(records);
    };

    // Load initial records
    loadAndRefreshPaymentRecords();

    // Set up listeners for updates from Payments page
    const handlePaymentUpdate = () => {
      console.log("🔄 Payment history: Payment update detected - refreshing");
      loadAndRefreshPaymentRecords();
    };

    // Listen for custom events (from same tab - Payments page)
    window.addEventListener("paymentsUpdated", handlePaymentUpdate);

    // Cleanup
    return () => {
      window.removeEventListener("paymentsUpdated", handlePaymentUpdate);
    };
  }, [selectedYear, filterEmployee, filterFromDate, filterToDate]);

  const generatePaymentPDF = (record: PaymentRecord): { data: Uint8Array; fileName: string } => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const weekStart = new Date(record.weekStartDate);
    const weekEnd = new Date(record.weekEndDate);
    const paidDate = new Date(record.paidDate);

    let y = 15;

    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text('Payment History Report', 15, y);
    y += 10;

    // Period information
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Week: ${weekStart.toLocaleDateString('en-US')} - ${weekEnd.toLocaleDateString('en-US')}`, 15, y);
    y += 5;
    doc.text(`Payment Date: ${paidDate.toLocaleDateString('en-US')}`, 15, y);
    y += 5;
    doc.text(`Total Paid: $${record.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 15, y);
    y += 10;

    // Table header
    doc.setFont(undefined, 'bold');
    doc.setFillColor(240, 240, 240);
    doc.rect(15, y - 3, 180, 5, 'F');
    doc.text('Employee', 15, y);
    doc.text('Position', 50, y);
    doc.text('Amount', 85, y);
    doc.text('Reason', 110, y);
    doc.text('Payment Method', 140, y);
    y += 6;

    // Table rows
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);

    record.entries.forEach((entry) => {
      if (y > 250) {
        doc.addPage();
        y = 15;
      }

      doc.text((entry.employee_name || 'Unknown').substring(0, 18), 15, y);
      doc.text((entry.employee_position || '').substring(0, 12), 50, y);
      doc.text(
        `$${(entry.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        85,
        y
      );
      const reason = entry.reversal_reason || entry.severance_reason || entry.notes;
      doc.text(reason ? reason.substring(0, 12) : (entry.is_correction ? 'Reversal' : 'Regular'), 110, y);

      // Combine payment method with check number
      let methodDisplay = entry.payment_method?.substring(0, 20) || 'Unknown';
      if (entry.payment_method === 'check' && entry.check_number) {
        methodDisplay = `Check #${entry.check_number}`;
      }
      doc.text(methodDisplay, 140, y);
      y += 4;
    });

    // Footer
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `Generated on ${new Date().toLocaleDateString('en-US')} at ${new Date().toLocaleTimeString('en-US')}`,
      15,
      280
    );

    const fileName = `payment_history_${record.paidDate}.pdf`;
    return {
      data: new Uint8Array(doc.output('arraybuffer')),
      fileName
    };
  };

  const downloadPaymentReport = (record: PaymentRecord) => {
    const { data, fileName } = generatePaymentPDF(record);
    const blob = new Blob([data as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadAllReports = async () => {
    const zip = new JSZip();
    const monthlyFolders = new Map<string, JSZip>();

    // Group records by month for folder organization
    paymentRecords.forEach((record) => {
      const paidDate = new Date(record.paidDate);
      const monthYear = paidDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!monthlyFolders.has(monthYear)) {
        monthlyFolders.set(monthYear, zip.folder(monthYear)!);
      }

      const { data, fileName } = generatePaymentPDF(record);
      const monthFolder = monthlyFolders.get(monthYear)!;
      monthFolder.file(fileName, data);
    });

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `payment_reports_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error generating ZIP file:', error);
    }
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <div className="space-y-6">
      {isLoading && (
        <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Loading payment history...</span>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Payment Ledger</h1>
          <p className="text-slate-600 text-sm md:text-base mt-1">Review and archive payment records</p>
        </div>
        <Button
          onClick={() => window.print()}
          className="gap-2 bg-slate-700 hover:bg-slate-800"
          title="Print payment ledger"
        >
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>

      {/* Filters Card */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm">Filter Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="employee-filter" className="text-sm font-medium mb-2 block">Employee</Label>
              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger id="employee-filter" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="from-date" className="text-sm font-medium mb-2 block">From Date</Label>
              <Input
                id="from-date"
                type="date"
                value={filterFromDate}
                onChange={(e) => setFilterFromDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <Label htmlFor="to-date" className="text-sm font-medium mb-2 block">To Date</Label>
              <Input
                id="to-date"
                type="date"
                value={filterToDate}
                onChange={(e) => setFilterToDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {(filterEmployee !== "all" || filterFromDate || filterToDate) && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterEmployee("all");
                  setFilterFromDate("");
                  setFilterToDate("");
                }}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="text-green-900">Weekly Payments Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600 font-medium">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">
                ${paymentRecords.reduce((sum, r) => sum + r.totalAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600 font-medium">Payment Batches</p>
              <p className="text-2xl font-bold text-blue-600">{paymentRecords.length}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600 font-medium">Employees Affected</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(paymentRecords.flatMap(r => r.entries.map(e => e.employee_id))).size}
              </p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-slate-200">
              <p className="text-sm text-slate-600 font-medium">Average Per Batch</p>
              <p className="text-2xl font-bold text-orange-600">
                ${paymentRecords.length > 0 ? (paymentRecords.reduce((sum, r) => sum + r.totalAmount, 0) / paymentRecords.length).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {paymentRecords.length === 0 ? (
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No payment history available yet</p>
              <p className="text-sm text-slate-400">Payments will appear here once they are marked as paid</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle>Processed Payments</CardTitle>
                <CardDescription>All paid payments for {selectedYear}</CardDescription>
              </div>
              <div className="flex gap-2 flex-wrap">
                {paymentRecords.length > 0 && (
                  <Button
                    onClick={downloadAllReports}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Download All Reports
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Period</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Payment Date</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Employees Paid</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Payment Method</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Reason</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Total Amount</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentRecords.map((record) => {
                    // Check if this is a reversal entry
                    const isReversal = record.entries.some(e => e.is_correction);
                    
                    // Check if this payment has been reversed (has a reversal entry pointing to it)
                    const isReversed = record.entries.some(e => 
                      e.reversed_by_payment_id || 
                      paymentRecords.some(r => 
                        r.entries.some(re => re.reverses_payment_id === e.id)
                      )
                    );
                    
                    // Get unique payment methods and their check numbers
                    const paymentMethodsData = (() => {
                      const methods = new Map<string, string[]>();
                      record.entries.forEach(entry => {
                        const method = entry.payment_method || 'Unknown';
                        if (!methods.has(method)) {
                          methods.set(method, []);
                        }
                        if (entry.check_number && method === 'check') {
                          methods.get(method)!.push(`#${entry.check_number}`);
                        }
                      });
                      return Array.from(methods.entries()).map(([method, checks]) => {
                        if (method === 'check' && checks.length > 0) {
                          return `Check ${checks.join(", ")}`;
                        }
                        return method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
                      });
                    })();

                    return (
                    <tr key={`${record.weekStartDate}_${record.paidDate}_${record.entries[0]?.id}`} className={`border-b border-slate-100 hover:bg-slate-50 ${isReversal ? 'bg-orange-50' : ''}`}>
                      <td className="p-3 whitespace-nowrap">
                        {isReversal && <RotateCcw className="w-4 h-4 text-orange-600 inline-block mr-2" />}
                        {formatDateRange(record.weekStartDate, record.weekEndDate)}
                      </td>
                      <td className="p-3">{new Date(record.paidDate).toLocaleDateString('en-US')}</td>
                      <td className="p-3 font-medium">{record.entries.length}</td>
                      <td className="p-3 text-sm">
                        <div className="space-y-1">
                          {paymentMethodsData.map((method, idx) => (
                            <span key={idx} className="bg-purple-50 text-purple-700 px-2 py-1 rounded inline-block text-xs mr-1 mb-1">
                              {method}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {record.entries.map((entry, idx) => {
                            const entryReason = entry.reversal_reason || entry.severance_reason || entry.notes;
                            const entryIsReversal = entry.is_correction;
                            return entryReason ? (
                              <div key={idx} className="flex items-start gap-1">
                                <span className={`px-2 py-1 rounded text-xs flex-1 ${entryIsReversal ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-700'}`}>
                                  {entryIsReversal && '🔄 '}{entryReason}
                                </span>
                              </div>
                            ) : null;
                          })}
                          {!record.entries.some(e => e.reversal_reason || e.severance_reason || e.notes) && (
                            <span className="text-slate-400 text-xs">{isReversal ? 'Reversal Entry' : 'Regular Payment'}</span>
                          )}
                        </div>
                      </td>
                      <td className={`p-3 font-semibold ${isReversal ? 'text-orange-600' : isReversed ? 'text-red-600' : 'text-green-600'}`}>
                        <div className="flex flex-col gap-1">
                          <span>
                            ${record.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {isReversed && !isReversal && (
                            <span className="text-xs text-red-500 font-normal flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Reversed
                            </span>
                          )}
                          {isReversal && (
                            <span className="text-xs text-orange-500 font-normal">
                              Reversal Entry
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            onClick={() => downloadPaymentReport(record)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            title="Download payment report"
                          >
                            <Download className="w-4 h-4" />
                            Report
                          </Button>
                          {record.entries.length === 1 ? (
                            <Button
                              onClick={() => viewAuditTrail(record.entries[0])}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              title="View audit trail"
                            >
                              <FileText className="w-4 h-4" />
                              Audit
                            </Button>
                          ) : (
                            <Button
                              onClick={() => openEmployeeSelection(record.entries)}
                              variant="outline"
                              size="sm"
                              className="gap-2"
                              title="View audit trail - select employee"
                            >
                              <FileText className="w-4 h-4" />
                              Audit ({record.entries.length})
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {paymentRecords.map((record) => {
                // Check if this is a reversal entry
                const isReversal = record.entries.some(e => e.is_correction);
                
                // Get unique payment methods and their check numbers
                const paymentMethodsData = (() => {
                  const methods = new Map<string, string[]>();
                  record.entries.forEach(entry => {
                    const method = entry.payment_method || 'Unknown';
                    if (!methods.has(method)) {
                      methods.set(method, []);
                    }
                    if (entry.check_number && method === 'check') {
                      methods.get(method)!.push(`#${entry.check_number}`);
                    }
                  });
                  return Array.from(methods.entries()).map(([method, checks]) => {
                    if (method === 'check' && checks.length > 0) {
                      return `Check ${checks.join(", ")}`;
                    }
                    return method.charAt(0).toUpperCase() + method.slice(1).replace(/_/g, ' ');
                  });
                })();

                return (
                  <div key={`${record.weekStartDate}_${record.paidDate}_${record.entries[0]?.id}`} className={`bg-white rounded-lg border shadow-sm overflow-hidden ${isReversal ? 'border-orange-300 bg-orange-50' : 'border-slate-200'}`}>
                    <div className={`p-4 border-b flex justify-between items-start ${isReversal ? 'border-orange-200' : 'border-slate-100'}`}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {isReversal && <RotateCcw className="w-4 h-4 text-orange-600" />}
                          <p className="font-semibold text-slate-900">{isReversal ? 'Reversal Entry' : 'Payment Batch'}</p>
                        </div>
                        <p className="text-xs text-slate-500">{formatDateRange(record.weekStartDate, record.weekEndDate)}</p>
                      </div>
                      <div className="text-right">
                         <span className={`block font-bold ${isReversal ? 'text-orange-600' : 'text-green-600'}`}>
                          ${record.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </span>
                         <span className="text-xs text-slate-500">{new Date(record.paidDate).toLocaleDateString('en-US')}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>
                          <span className="block text-slate-400">Employees {isReversal ? 'Affected' : 'Paid'}</span>
                          <span className="font-medium text-slate-900">{record.entries.length}</span>
                        </div>
                        <div>
                           <span className="block text-slate-400">Reason</span>
                           <div className="space-y-1 mt-1 max-h-20 overflow-y-auto">
                             {record.entries.map((entry, idx) => {
                               const entryReason = entry.reversal_reason || entry.severance_reason || entry.notes;
                               const entryIsReversal = entry.is_correction;
                               return entryReason ? (
                                 <span key={idx} className={`px-2 py-0.5 rounded block text-xs ${entryIsReversal ? 'bg-orange-100 text-orange-800' : 'bg-blue-50 text-blue-700'}`}>
                                   {entryIsReversal && '🔄 '}{entryReason}
                                 </span>
                               ) : null;
                             })}
                             {!record.entries.some(e => e.reversal_reason || e.severance_reason || e.notes) && (
                               <span className="text-xs">{isReversal ? 'Reversal' : 'Regular'}</span>
                             )}
                           </div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="block text-xs text-slate-400 mb-1">Payment Methods</span>
                        <div className="flex flex-wrap gap-1">
                          {paymentMethodsData.map((method, idx) => (
                            <span key={idx} className="bg-purple-50 text-purple-700 px-2 py-1 rounded text-xs">
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-3 flex justify-end gap-2 border-t border-slate-100">
                      <button
                        className="p-2 text-slate-600 hover:bg-slate-200 rounded-full"
                        onClick={() => downloadPaymentReport(record)}
                        title="Download Report"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      {record.entries.length === 1 ? (
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"
                          onClick={() => viewAuditTrail(record.entries[0])}
                          title="View Audit Trail"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          className="px-3 py-2 text-blue-600 hover:bg-blue-100 rounded text-sm flex items-center gap-1"
                          onClick={() => openEmployeeSelection(record.entries)}
                          title="View Audit Trail - Select Employee"
                        >
                          <FileText className="w-4 h-4" />
                          {record.entries.length}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Immutable Ledger Notice */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Immutable Payment Ledger</h3>
        <p className="text-sm text-blue-800">
          Payment records cannot be edited or deleted to maintain audit integrity.
          If you need to correct a payment error, go to the <strong>Payments</strong> page
          and create a <strong>reversal entry</strong> with a reason.
        </p>
      </div>

      {/* Employee Selection Modal */}
      <Dialog open={employeeSelectionOpen} onOpenChange={setEmployeeSelectionOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Select Employee to View Audit Trail
            </DialogTitle>
            <DialogDescription>
              Choose which employee's payment record you want to view
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {employeeSelectionList.map((entry, idx) => (
              <button
                key={idx}
                onClick={() => handleEmployeeSelection(entry)}
                className="w-full p-4 text-left border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{entry.employee_name}</p>
                    {entry.employee_position && (
                      <p className="text-xs text-slate-500 mt-1">{entry.employee_position}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ${(entry.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    {entry.payment_method && (
                      <p className="text-xs text-slate-500 mt-1 capitalize">
                        {entry.payment_method.replace(/_/g, ' ')}
                        {entry.check_number && ` #${entry.check_number}`}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setEmployeeSelectionOpen(false)} variant="outline">
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={auditTrailOpen} onOpenChange={setAuditTrailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Payment Audit Trail
            </DialogTitle>
            <DialogDescription>
              Complete history of actions taken on this payment
            </DialogDescription>
          </DialogHeader>
          {selectedAuditPayment && (
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <h4 className="font-semibold text-slate-900 mb-2">Payment Details</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-600">Employee:</span>
                    <p className="font-medium">{selectedAuditPayment.employee_name}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Amount:</span>
                    <p className="font-medium text-green-600">
                      ${(selectedAuditPayment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-600">Week:</span>
                    <p className="font-medium">
                      {new Date(selectedAuditPayment.week_start_date).toLocaleDateString()} - {new Date(selectedAuditPayment.week_end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-600">Payment Method:</span>
                    <p className="font-medium capitalize">{selectedAuditPayment.payment_method || 'Unspecified'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-3">Audit History</h4>
                {auditLogs.length === 0 ? (
                  <p className="text-slate-500 text-sm italic p-4 bg-slate-50 rounded">
                    No audit logs available for this payment
                  </p>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {auditLogs.map((log) => {
                      const actionColors: Record<string, string> = {
                        created: 'bg-green-50 border-green-200 text-green-800',
                        reversed: 'bg-orange-50 border-orange-200 text-orange-800',
                        attempted_edit: 'bg-red-50 border-red-200 text-red-800',
                        attempted_delete: 'bg-red-50 border-red-200 text-red-800',
                      };
                      const actionIcons: Record<string, string> = {
                        created: '✓',
                        reversed: '🔄',
                        attempted_edit: '⚠️',
                        attempted_delete: '⚠️',
                      };
                      const colorClass = actionColors[log.action] || 'bg-slate-50 border-slate-200 text-slate-800';

                      return (
                        <div key={log.id} className={`p-3 rounded border ${colorClass}`}>
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-semibold text-sm">
                              {actionIcons[log.action]} {log.action.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className="text-xs opacity-75">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          {log.reason && (
                            <p className="text-sm mt-2 bg-white bg-opacity-50 p-2 rounded">
                              <span className="font-medium">Reason:</span> {log.reason}
                            </p>
                          )}
                          {log.user_id && (
                            <p className="text-xs mt-1 opacity-75">
                              User ID: {log.user_id}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setAuditTrailOpen(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
