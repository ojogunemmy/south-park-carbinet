import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Calendar, FolderOpen, RefreshCw, Save, Archive, Trash2, Printer, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { getYearData, saveYearData } from "@/utils/yearStorage";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

interface PaymentObligation {
  id: string;
  employeeId: string;
  employeeName: string;
  employeePosition: string;
  amount: number;
  weekStartDate: string;
  weekEndDate: string;
  dueDate: string;
  status: "pending" | "paid" | "canceled";
  paymentMethod: string;
  paidDate?: string;
  paidCheckNumber?: string;
  paidBankName?: string;
  daysWorked?: number;
  reason?: string;
}

interface PaymentRecord {
  weekStartDate: string;
  weekEndDate: string;
  paidDate: string;
  employees: PaymentObligation[];
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
  const [editingRecord, setEditingRecord] = useState<PaymentRecord | null>(null);
  const [editAmount, setEditAmount] = useState<string>("");
  const [editPaidDate, setEditPaidDate] = useState<string>("");
  const [recordToDelete, setRecordToDelete] = useState<PaymentRecord | null>(null);

  // Function to reload payment records from localStorage
  const reloadPaymentRecords = (showToast: boolean = false) => {
    const payments = getYearData<PaymentObligation[]>("payments", selectedYear, []) || [];
    const paidPayments = payments.filter(p => p.status === "paid");

    if (showToast && paidPayments.length > lastPaymentCount) {
      toast({
        title: "✓ Payment History Updated",
        description: `${paidPayments.length - lastPaymentCount} new payment(s) added`,
      });
    }

    setLastPaymentCount(paidPayments.length);
  };

  // Handle edit payment record
  const handleEditRecord = (record: PaymentRecord) => {
    setEditingRecord(record);
    setEditAmount(record.totalAmount.toString());
    setEditPaidDate(record.paidDate);
  };

  // Save edited record
  const handleSaveEdit = () => {
    if (!editingRecord) return;

    const payments = getYearData<PaymentObligation[]>("payments", selectedYear, []) || [];
    const amountDifference = parseFloat(editAmount) - editingRecord.totalAmount;
    const oldPaidDate = editingRecord.paidDate;

    // Update all employees in this record with new paid date and adjust amounts proportionally
    const updatedPayments = payments.map(p => {
      if (
        p.status === "paid" &&
        p.weekStartDate === editingRecord.weekStartDate &&
        p.paidDate === oldPaidDate
      ) {
        return {
          ...p,
          paidDate: editPaidDate,
          amount: p.amount + (amountDifference * (p.amount / editingRecord.totalAmount)),
        };
      }
      return p;
    });

    saveYearData("payments", selectedYear, updatedPayments);
    setEditingRecord(null);
    toast({
      title: "✓ Payment Updated",
      description: "Payment record has been updated successfully",
    });
  };

  // Handle delete payment record
  const handleDeleteRecord = (record: PaymentRecord) => {
    setRecordToDelete(record);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (!recordToDelete) return;

    const payments = getYearData<PaymentObligation[]>("payments", selectedYear, []) || [];

    // Remove all payments in this record
    const updatedPayments = payments.filter(p => {
      if (
        p.status === "paid" &&
        p.weekStartDate === recordToDelete.weekStartDate &&
        p.paidDate === recordToDelete.paidDate
      ) {
        return false;
      }
      return true;
    });

    saveYearData("payments", selectedYear, updatedPayments);
    setRecordToDelete(null);
    toast({
      title: "✓ Payment Deleted",
      description: "Payment record has been removed",
    });
  };

  // Load employees
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
    const loadAndRefreshPaymentRecords = () => {
      // Get all payments for this year
      const payments = getYearData<PaymentObligation[]>("payments", selectedYear, []) || [];

      // Filter only paid payments
      let paidPayments = payments.filter(p => p.status === "paid");

      // Apply employee filter
      if (filterEmployee !== "all") {
        paidPayments = paidPayments.filter(p => p.employeeId === filterEmployee);
      }

      // Apply date range filter
      if (filterFromDate) {
        paidPayments = paidPayments.filter(p => {
          const paidDate = p.paidDate || p.weekStartDate;
          return new Date(paidDate) >= new Date(filterFromDate);
        });
      }

      if (filterToDate) {
        paidPayments = paidPayments.filter(p => {
          const paidDate = p.paidDate || p.weekStartDate;
          return new Date(paidDate) <= new Date(filterToDate);
        });
      }

      // Group by week and paid date
      const recordsMap = new Map<string, PaymentRecord>();

      paidPayments.forEach(payment => {
        const key = `${payment.weekStartDate}_${payment.paidDate || payment.weekStartDate}`;

        if (!recordsMap.has(key)) {
          recordsMap.set(key, {
            weekStartDate: payment.weekStartDate,
            weekEndDate: payment.weekEndDate,
            paidDate: payment.paidDate || payment.weekStartDate,
            employees: [],
            totalAmount: 0,
            reasons: [],
          });
        }

        const record = recordsMap.get(key)!;
        record.employees.push(payment);
        record.totalAmount += payment.amount || 0;

        // Collect unique reasons
        if (payment.reason && !record.reasons.includes(payment.reason)) {
          record.reasons.push(payment.reason);
        }
      });

      // Convert to array and sort by paid date (newest first)
      const records = Array.from(recordsMap.values()).sort((a, b) =>
        new Date(b.paidDate).getTime() - new Date(a.paidDate).getTime()
      );

      setPaymentRecords(records);
      setLastPaymentCount(paidPayments.length);
    };

    // Load initial records
    loadAndRefreshPaymentRecords();

    // Set up listeners for auto-refresh
    const handleStorageChange = () => {
      console.log("📥 Payment history: localStorage changed - auto-refreshing");
      loadAndRefreshPaymentRecords();
    };

    const handlePaymentUpdate = () => {
      console.log("🔄 Payment history: Payment update detected - auto-refreshing");
      loadAndRefreshPaymentRecords();
    };

    // Listen for storage changes (from other tabs/windows)
    window.addEventListener("storage", handleStorageChange);

    // Listen for custom events (from same tab - Payments page)
    window.addEventListener("paymentsUpdated", handlePaymentUpdate);

    // Set up auto-refresh interval (every 2 seconds)
    const refreshInterval = setInterval(() => {
      loadAndRefreshPaymentRecords();
    }, 2000);

    // Cleanup
    return () => {
      console.log("🧹 Payment history: Cleaning up listeners");
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("paymentsUpdated", handlePaymentUpdate);
      clearInterval(refreshInterval);
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

    record.employees.forEach((employee) => {
      if (y > 250) {
        doc.addPage();
        y = 15;
      }

      doc.text(employee.employeeName.substring(0, 18), 15, y);
      doc.text(employee.employeePosition.substring(0, 12), 50, y);
      doc.text(
        `$${(employee.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        85,
        y
      );
      doc.text(employee.reason ? employee.reason.substring(0, 12) : 'Regular', 110, y);

      // Combine payment method with check number
      let methodDisplay = employee.paymentMethod?.substring(0, 20) || 'Unknown';
      if (employee.paymentMethod === 'check' && employee.paidCheckNumber) {
        methodDisplay = `Check #${employee.paidCheckNumber}`;
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
              <p className="text-sm text-slate-600 font-medium">Employees Paid</p>
              <p className="text-2xl font-bold text-purple-600">
                {new Set(paymentRecords.flatMap(r => r.employees.map(e => e.employeeId))).size}
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
                  onClick={() => {
                    setIsRefreshing(true);
                    const payments = getYearData<PaymentObligation[]>("payments", selectedYear, []) || [];
                    const paidPayments = payments.filter(p => p.status === "paid");
                    setLastPaymentCount(paidPayments.length);
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
                    // Get unique payment methods and their check numbers
                    const paymentMethodsData = (() => {
                      const methods = new Map<string, string[]>();
                      record.employees.forEach(emp => {
                        const method = emp.paymentMethod || 'Unknown';
                        if (!methods.has(method)) {
                          methods.set(method, []);
                        }
                        if (emp.paidCheckNumber && method === 'check') {
                          methods.get(method)!.push(`#${emp.paidCheckNumber}`);
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
                    <tr key={`${record.weekStartDate}_${record.paidDate}`} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 whitespace-nowrap">{formatDateRange(record.weekStartDate, record.weekEndDate)}</td>
                      <td className="p-3">{new Date(record.paidDate).toLocaleDateString('en-US')}</td>
                      <td className="p-3 font-medium">{record.employees.length}</td>
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
                        {record.reasons.length > 0 ? (
                          <div className="space-y-1">
                            {record.reasons.map((reason, idx) => (
                              <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-1 rounded block text-xs whitespace-nowrap">
                                {reason}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Regular Payment</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-green-600">
                        ${record.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                            Download
                          </Button>
                          <Button
                            onClick={() => handleEditRecord(record)}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            title="Edit payment record"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => handleDeleteRecord(record)}
                            variant="outline"
                            size="sm"
                            className="gap-2 text-red-600 hover:bg-red-50"
                            title="Delete payment record"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </Button>
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
                 // Get unique payment methods and their check numbers
                 const paymentMethodsData = (() => {
                  const methods = new Map<string, string[]>();
                  record.employees.forEach(emp => {
                    const method = emp.paymentMethod || 'Unknown';
                    if (!methods.has(method)) {
                      methods.set(method, []);
                    }
                    if (emp.paidCheckNumber && method === 'check') {
                      methods.get(method)!.push(`#${emp.paidCheckNumber}`);
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
                  <div key={`${record.weekStartDate}_${record.paidDate}`} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-slate-900">Payment Batch</p>
                        <p className="text-xs text-slate-500">{formatDateRange(record.weekStartDate, record.weekEndDate)}</p>
                      </div>
                      <div className="text-right">
                         <span className="block font-bold text-green-600">
                          ${record.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </span>
                         <span className="text-xs text-slate-500">{new Date(record.paidDate).toLocaleDateString('en-US')}</span>
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <div>
                          <span className="block text-slate-400">Employees Paid</span>
                          <span className="font-medium text-slate-900">{record.employees.length}</span>
                        </div>
                        <div>
                           <span className="block text-slate-400">Reason</span>
                           {record.reasons.length > 0 ? (
                             <div className="space-y-1 mt-1">
                               {record.reasons.map((reason, idx) => (
                                 <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded block text-xs w-fit">
                                   {reason}
                                 </span>
                               ))}
                             </div>
                           ) : (
                             <span>Regular</span>
                           )}
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
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                        onClick={() => handleEditRecord(record)}
                        title="Edit"
                      >
                       <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                        onClick={() => handleDeleteRecord(record)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Payment Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Payment Record</DialogTitle>
            <DialogDescription>
              Update the payment details for the week of {editingRecord && formatDateRange(editingRecord.weekStartDate, editingRecord.weekEndDate)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-paid-date" className="text-slate-700 font-medium">Payment Date</Label>
              <Input
                id="edit-paid-date"
                type="date"
                value={editPaidDate}
                onChange={(e) => setEditPaidDate(e.target.value)}
                className="border-slate-300 mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-amount" className="text-slate-700 font-medium">Total Amount</Label>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-slate-600">$</span>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="border-slate-300"
                />
              </div>
            </div>
            {editingRecord && (
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Employees in this batch:</span> {editingRecord.employees.length}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingRecord(null)}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!recordToDelete} onOpenChange={(open) => !open && setRecordToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record for {recordToDelete && formatDateRange(recordToDelete.weekStartDate, recordToDelete.weekEndDate)}?
              <br />
              <span className="font-semibold text-slate-900 block mt-2">
                This will remove payment for {recordToDelete?.employees.length} employee(s) totaling ${recordToDelete?.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.
              </span>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  );
}
