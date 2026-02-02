import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Calendar, FolderOpen, RefreshCw, Save, Archive, Trash2, Printer, Edit2, AlertCircle, RotateCcw } from "lucide-react";
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

export default function PaymentHistory() {
  const { selectedYear } = useYear();
  const { toast } = useToast();
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");
  const [employees, setEmployees] = useState<Array<{ id: string; name: string }>>([]);
  const [lastPaymentCount, setLastPaymentCount] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [savedArchives, setSavedArchives] = useState<PaymentHistoryArchive[]>([]);
  const [showArchives, setShowArchives] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  // Load saved archives
  useEffect(() => {
    const saved = localStorage.getItem(`paymentHistoryArchives_${selectedYear}`);
    if (saved) {
      try {
        setSavedArchives(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading archives:", e);
      }
    }
  }, [selectedYear]);

  // Save current payment history as archive
  const savePaymentHistoryArchive = () => {
    if (paymentRecords.length === 0) {
      toast({
        title: "✗ No data to save",
        description: "Payment history is empty",
      });
      return;
    }

    const totalAmount = paymentRecords.reduce((sum, r) => sum + r.totalAmount, 0);
    const archive: PaymentHistoryArchive = {
      id: `archive-${Date.now()}`,
      year: selectedYear,
      savedDate: new Date().toISOString().split('T')[0],
      paymentRecords: paymentRecords,
      totalRecords: paymentRecords.length,
      totalAmount: totalAmount,
    };

    const newArchives = [...savedArchives, archive];
    setSavedArchives(newArchives);
    localStorage.setItem(`paymentHistoryArchives_${selectedYear}`, JSON.stringify(newArchives));

    toast({
      title: "✓ Payment History Archived",
      description: `Saved ${paymentRecords.length} payment record(s) on ${archive.savedDate}`,
    });
  };

  // Delete an archive
  const deleteArchive = (archiveId: string) => {
    const newArchives = savedArchives.filter(a => a.id !== archiveId);
    setSavedArchives(newArchives);
    localStorage.setItem(`paymentHistoryArchives_${selectedYear}`, JSON.stringify(newArchives));
    toast({
      title: "✓ Archive Deleted",
      description: "Payment history archive has been removed",
    });
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
          <RefreshCw className="w-4 h-4 animate-spin" />
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

      {showArchives && savedArchives.length > 0 && (
        <Card className="border-slate-200 bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-blue-900">Saved Payment History Archives</CardTitle>
            <CardDescription>View and manage archived payment history snapshots</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {savedArchives.map((archive) => (
                <div key={archive.id} className="flex items-center justify-between bg-white p-3 rounded border border-slate-200">
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">
                      Saved on {new Date(archive.savedDate).toLocaleDateString('en-US')}
                    </p>
                    <p className="text-sm text-slate-600">
                      {archive.totalRecords} payment record(s) • ${archive.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                  <Button
                    onClick={() => deleteArchive(archive.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                <Button
                  onClick={savePaymentHistoryArchive}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  title="Save current payment history as archive"
                >
                  <Save className="w-4 h-4" />
                  Save Archive
                </Button>
                {savedArchives.length > 0 && (
                  <Button
                    onClick={() => setShowArchives(!showArchives)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    Archives ({savedArchives.length})
                  </Button>
                )}
                <Button
                  onClick={async () => {
                    setIsRefreshing(true);
                    await reloadPaymentRecords(true);
                    setTimeout(() => setIsRefreshing(false), 500);
                  }}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
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
                      <td className={`p-3 font-semibold ${isReversal ? 'text-orange-600' : 'text-green-600'}`}>
                        ${record.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-3">
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

      <Toaster />
    </div>
  );
}
