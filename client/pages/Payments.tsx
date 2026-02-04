import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, Printer, Trash2, Paperclip, Download, Eye, X, Plus, Calendar, Edit2, DollarSign } from "lucide-react";
import jsPDF from "jspdf";
import { useState, useEffect, useMemo } from "react";
import { useYear } from "@/contexts/YearContext";
import { getTodayDate, formatDateString, formatDateToString, saveYearData } from "@/utils/yearStorage";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useToast } from "@/hooks/use-toast";
import {
  employeesService,
  paymentsService,
  absencesService,
  settingsService,
  type Employee,
  type Payment,
  type EmployeeAbsence,
  type Settings,
} from "@/lib/supabase-service";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface CheckAttachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  data: string; // base64 encoded data
}

// PaymentObligation needs to extend Payment with joined employee details for backwards compatibility in the UI
// while we transition to full snake_case.
type PaymentObligation = Payment & {
  employee_name: string;
  employee_position?: string;
  is_adjusted_for_absence: boolean;
  full_weekly_salary: number;
  attachments?: CheckAttachment[];
  is_severance?: boolean;
  severance_reason?: string;
  severance_date?: string;
  employee_status?: "active" | "paused" | "leaving" | "laid_off";
};

const exampleEmployees: Employee[] = [];

export default function Payments() {
  const { toast } = useToast();
  const { selectedYear } = useYear();

  // Load employees from localStorage or use example employees
  // Data loading logic will be handled by loadFreshData

  // Helper function to convert number to words for checks
  const convertNumberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertHundreds = (n: number): string => {
      let result = '';
      if (n >= 100) {
        result += ones[Math.floor(n / 100)] + ' Hundred ';
        n %= 100;
      }
      if (n >= 20) {
        result += tens[Math.floor(n / 10)];
        if (n % 10 > 0) result += ' ' + ones[n % 10];
      } else if (n >= 10) {
        result += teens[n - 10];
      } else if (n > 0) {
        result += ones[n];
      }
      return result.trim();
    };

    if (num === 0) return 'Zero Dollars';
    const dollars = Math.floor(num);
    const cents = Math.round((num - dollars) * 100);

    let words = '';
    if (dollars > 0) {
      const millions = Math.floor(dollars / 1000000);
      const thousands = Math.floor((dollars % 1000000) / 1000);
      const rest = dollars % 1000;

      if (millions > 0) {
        words += convertHundreds(millions) + ' Million ';
      }
      if (thousands > 0) {
        words += convertHundreds(thousands) + ' Thousand ';
      }
      if (rest > 0) {
        words += convertHundreds(rest);
      }
      words = words.replace(/\s+/g, ' ').trim() + ' Dollars';
    }

    if (cents > 0) {
      words += ' and ' + cents + '/100';
    }
    return words.trim();
  };

  // Get the next check number based on starting number and already-used checks
  const getNextCheckNumber = (): number => {
    const startingNumber = settings?.check_start_number || 1001;

    // Find all check numbers that have been used
    const usedCheckNumbers = payments
      .filter(p => p.check_number)
      .map(p => parseInt(p.check_number || '0', 10))
      .filter(n => !isNaN(n) && n > 0);

    if (usedCheckNumbers.length === 0) {
      return startingNumber;
    }

    const maxUsed = Math.max(...usedCheckNumbers);
    return Math.max(maxUsed + 1, startingNumber);
  };

  // Validate check number is not duplicate
  const validateCheckNumber = async (checkNum: string, excludePaymentId?: string): Promise<boolean> => {
    if (!checkNum || checkNum.trim() === "") return true;
    
    try {
      const allPayments = await paymentsService.getAll();
      const exclusionId = excludePaymentId || selectedPaymentId;
      const duplicate = allPayments.find(
        (p: any) => p.check_number === checkNum && p.id !== exclusionId
      );
      
      if (duplicate) {
        toast({
          title: "Duplicate Check Number",
          description: `Check #${checkNum} is already used. Please use a different number.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error validating check number:", error);
      return true; // Allow if validation fails
    }
  };

  // Handle payment method selection with auto-increment for checks
  const handlePaymentMethodChange = (method: string) => {
    setSelectedPaymentMethod(method);
    if (method === "check") {
      // Auto-assign the next check number
      const nextNumber = getNextCheckNumber();
      setPaidCheckNumber(nextNumber.toString());
    }
  };

  // Generate batch PDF with multiple checks
  const generateBatchChecksPDF = (checksToGenerate: PaymentObligation[]) => {
    if (checksToGenerate.length === 0) {
      alert("Please select at least one check to generate");
      return;
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let pageNumber = 1;

    checksToGenerate.forEach((payment, index) => {
      if (index > 0) {
        doc.addPage();
        pageNumber++;
      }

      let y = 15;

      // Company header
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text(settings?.company_name || 'Your Company', 15, y);
      y += 7;

      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.text(settings?.company_address || '', 15, y);
      y += 5;
      doc.text(settings?.company_phone || '', 15, y);
      y += 10;

      // Check number (top right)
      const checkNum = parseInt(payment.check_number || '0', 10);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(checkNum.toString().padStart(4, '0'), 180, 20);
      doc.setFontSize(8);
      doc.text('Check #', 180, 26);

      // Date
      y += 5;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('DATE', 15, y);
      doc.setFont(undefined, 'normal');
      doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }), 35, y);
      y += 8;

      // Pay to the order of
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('PAY TO THE ORDER OF', 15, y);
      y += 6;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(14);
      doc.text(payment.employee_name, 15, y);
      y += 8;

      // Amount in words
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('AMOUNT IN WORDS', 15, y);
      y += 6;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(11);
      const amountWords = convertNumberToWords(payment.amount);
      const wordLines = doc.splitTextToSize(amountWords, 140);
      doc.text(wordLines, 15, y);
      y += wordLines.length * 5 + 5;

      // Dollar amount (right side)
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('AMOUNT', 155, y - wordLines.length * 5 - 5);
      doc.setFontSize(16);
      doc.setFont(undefined, 'bold');
      doc.text(`$${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 155, y - wordLines.length * 5 + 4);

      y += 10;

      // For/Memo
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('FOR/MEMO', 15, y);
      y += 5;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(10);
      const memo = payment.is_severance ? 'Severance Payment' : `Week of ${new Date(payment.week_start_date).toLocaleDateString()}`;
      doc.text(memo, 15, y);
      y += 12;

      // Signature line
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      y += 15;
      doc.line(15, y, 80, y);
      doc.text('Authorized Signature', 15, y + 5);

      // MICR line
      y += 20;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      const micrLine = `|${settings?.routing_number?.padEnd(9, '0') || '000000000'}|${payment.employee_id.padEnd(12, ' ')}|${checkNum.toString().padStart(8, '0')}|`;
      doc.text(micrLine, 15, y);
    });

    // Save PDF
    const fileName = `batch_checks_${checksToGenerate.length}_${formatDateToString(new Date())}.pdf`;
    doc.save(fileName);
    setIsBatchCheckModalOpen(false);
    setSelectedChecksForBatch(new Set());
    toast({
      title: "✓ Batch PDF Generated",
      description: `Generated PDF with ${checksToGenerate.length} check(s)`,
    });
  };

  // Generate Weekly Report PDF
  const generateWeeklyReportPDF = () => {
    try {
      if (filteredPayments.length === 0) {
        alert("No payments to generate report for.");
        return;
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const width = doc.internal.pageSize.getWidth();
      
      let y = 15;
      const margin = 15;

      // Header
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text("WEEKLY PAYMENTS REPORT", margin, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, y);
      y += 6;
      
      if (filterFromDate && filterToDate) {
        doc.text(`Period: ${new Date(filterFromDate).toLocaleDateString()} - ${new Date(filterToDate).toLocaleDateString()}`, margin, y);
        y += 6;
      }

      y += 10;

      // Table Headers
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 5, width - 2 * margin, 8, 'F');
      
      doc.text("DATE", margin, y);
      doc.text("RECIPIENT", margin + 25, y);
      doc.text("DESCRIPTION", margin + 65, y); // Adjusted X
      doc.text("METHOD", margin + 115, y);      // Adjusted X
      doc.text("STATUS", margin + 145, y);      // New Column
      doc.text("AMOUNT", width - margin, y, { align: "right" });
      
      y += 8;

      // Table Content
      doc.setFont(undefined, 'normal');
      let totalPaid = 0;
      let totalPending = 0;

      filteredPayments.forEach((payment, index) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
          // Re-print headers on new page
          doc.setFont(undefined, 'bold');
          doc.setFillColor(240, 240, 240);
          doc.rect(margin, y - 5, width - 2 * margin, 8, 'F');
          
          doc.text("DATE", margin, y);
          doc.text("RECIPIENT", margin + 25, y);
          doc.text("DESCRIPTION", margin + 65, y);
          doc.text("METHOD", margin + 115, y);
          doc.text("STATUS", margin + 145, y);
          doc.text("AMOUNT", width - margin, y, { align: "right" });
          doc.setFont(undefined, 'normal');
          y += 8;
        }

        const dateStr = new Date(payment.week_start_date).toLocaleDateString();
        const methodStr = (payment.payment_method || "N/A").replace("_", " ");
        
        // Determine description: Use notes if available (covers Severance), else default to Weekly Salary
        let descStr = payment.notes || (payment.is_severance ? "Severance" : "Weekly Salary");
        
        if (payment.check_number) descStr += ` (Chk #${payment.check_number})`;
        
        // Status formatting
        const statusStr = payment.status.charAt(0).toUpperCase() + payment.status.slice(1);
        
        // Calculate Totals based on status
        if (payment.status === "paid") {
          totalPaid += payment.amount;
        } else if (payment.status === "pending") {
          totalPending += payment.amount;
        }

        doc.text(dateStr, margin, y);
        
        // Truncate long names
        const name = payment.employee_name.length > 20 ? payment.employee_name.substring(0, 18) + "..." : payment.employee_name;
        doc.text(name, margin + 25, y);

        // Truncate long descriptions
        const desc = descStr.length > 25 ? descStr.substring(0, 23) + "..." : descStr;
        doc.text(desc, margin + 65, y);

        doc.text(methodStr, margin + 115, y);
        
        // Status with color indication (simple caps for now)
        doc.text(statusStr, margin + 145, y);

        doc.text(`$${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width - margin, y, { align: "right" });

        y += 6;
      });

      // Totals Section
      y += 4;
      doc.setDrawColor(0, 0, 0);
      doc.line(margin, y, width - margin, y);
      y += 8;
      
      // Totals breakdown
      const totalColX = margin + 130;
      
      doc.setFont(undefined, 'normal');
      doc.text("Total Paid:", totalColX, y);
      doc.text(`$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width - margin, y, { align: "right" });
      y += 6;

      doc.text("Total Pending:", totalColX, y);
      doc.text(`$${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width - margin, y, { align: "right" });
      y += 8;

      // Grand Total line
      doc.setDrawColor(200, 200, 200);
      doc.line(totalColX, y - 2, width - margin, y - 2);
      
      doc.setFont(undefined, 'bold');
      doc.setFontSize(11);
      doc.text("TOTAL:", totalColX, y);
      const grandTotal = totalPaid + totalPending;
      doc.text(`$${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width - margin, y, { align: "right" });

      doc.save(`Weekly-Payments-Report-${formatDateToString(new Date())}.pdf`);
      toast({
        title: "✓ Report Generated",
        description: `Weekly payments report saved with totals breakdown.`,
      });

    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to generate PDF report.",
      });
    }
  };

  // Generate PDF check
  const generateCheckPDF = (payment: PaymentObligation, checkNum: number, settings: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Set up the check layout
    let y = 15;

    // Company header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(settings?.companyName || 'Your Company', 15, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text(settings?.companyAddress || '', 15, y);
    y += 5;
    doc.text(`${settings?.companyCity}, ${settings?.companyState} ${settings?.companyZip}`, 15, y);
    y += 5;
    doc.text(settings?.companyPhone || '', 15, y);
    y += 10;

    // Check number (top right)
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(checkNum.toString().padStart(4, '0'), width - 30, 20);
    doc.setFontSize(8);
    doc.text('Check #', width - 30, 26);

    // Date
    y += 5;
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('DATE', 15, y);
    doc.setFont(undefined, 'normal');
    doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }), 35, y);
    y += 8;

    // Pay to the order of
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('PAY TO THE ORDER OF', 15, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(14);
    doc.text(payment.employee_name, 15, y);
    y += 8;

    // Amount in words
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('AMOUNT IN WORDS', 15, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    const amountWords = convertNumberToWords(payment.amount);
    const wordLines = doc.splitTextToSize(amountWords, width - 30);
    doc.text(wordLines, 15, y);
    y += wordLines.length * 5 + 5;

    // Dollar amount (right side)
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('AMOUNT', width - 50, y - wordLines.length * 5 - 5);
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(`$${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, width - 50, y - wordLines.length * 5 + 4);

    y += 10;

    // For/Memo
    doc.setFontSize(9);
    doc.setFont(undefined, 'bold');
    doc.text('FOR/MEMO', 15, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    const memo = payment.is_severance ? 'Severance Payment' : `Week of ${new Date(payment.week_start_date).toLocaleDateString()}`;
    doc.text(memo, 15, y);
    y += 12;

    // Signature line
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    y += 15;
    doc.line(15, y, 80, y);
    doc.text('Authorized Signature', 15, y + 5);

    // MICR line
    y += 20;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    const micrLine = `|${settings?.routing_number?.padEnd(9, '0') || '000000000'}|${payment.employee_id.padEnd(12, ' ')}|${checkNum.toString().padStart(8, '0')}|`;
    doc.text(micrLine, 15, y);

    // Save PDF
    const fileName = `check_${payment.employee_name.replace(/\s+/g, '_')}_${checkNum}.pdf`;
    doc.save(fileName);
  };

  // Loading initial state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absences, setAbsences] = useState<EmployeeAbsence[]>([]);
  const [payments, setPayments] = useState<PaymentObligation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paid_date, setPaidDate] = useState("");
  const [paidDeduction, setPaidDeduction] = useState<number>(0);
  const [check_number, setPaidCheckNumber] = useState("");
  const [bank_name, setBankName] = useState("");
  const [routing_number, setRoutingNumber] = useState("");
  const [account_number, setAccountNumber] = useState("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("");
  const [isEditAmountOpen, setIsEditAmountOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<number>(0);
  const [editingCheckNumber, setEditingCheckNumber] = useState<string>("");
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid">("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");
  const [isCheckPrintModalOpen, setIsCheckPrintModalOpen] = useState(false);
  const [selectedCheckPaymentId, setSelectedCheckPaymentId] = useState<string | null>(null);
  const [isAllMarkedAsPaid, setIsAllMarkedAsPaid] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedReversalPaymentId, setSelectedReversalPaymentId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState<string>("");
  const [customReversalReason, setCustomReversalReason] = useState<string>("");
  const [isBulkReverseOpen, setIsBulkReverseOpen] = useState(false);
  const [bulkReversalPayments, setBulkReversalPayments] = useState<PaymentObligation[]>([]);
  const [selectedReversalPayments, setSelectedReversalPayments] = useState<Set<string>>(new Set());
  const [bulkReversalReasons, setBulkReversalReasons] = useState<Record<string, string>>({});
  const [bulkCustomReasons, setBulkCustomReasons] = useState<Record<string, string>>({});
  
  // Reversal reason templates for faster selection
  const REVERSAL_REASON_TEMPLATES = [
    "Check bounced - needs reissue",
    "Duplicate payment - correcting error",
    "Wrong amount calculated",
    "Payment issued to wrong employee",
    "Check lost or stolen",
    "Employee returned payment",
    "Bank error - correction needed",
    "Custom reason..."
  ];
  const [isCheckAttachmentModalOpen, setIsCheckAttachmentModalOpen] = useState(false);
  const [selectedPaymentForAttachment, setSelectedPaymentForAttachment] = useState<string | null>(null);
  const [isViewCheckAttachmentOpen, setIsViewCheckAttachmentOpen] = useState(false);
  const [selectedCheckAttachment, setSelectedCheckAttachment] = useState<CheckAttachment | null>(null);
  const [isEditDaysOpen, setIsEditDaysOpen] = useState(false);
  const [editingDaysPaymentId, setEditingDaysPaymentId] = useState<string | null>(null);
  const [editingDaysWorked, setEditingDaysWorked] = useState<number>(5);
  const [isBulkDaysOpen, setIsBulkDaysOpen] = useState(false);
  const [bulkDaysValue, setBulkDaysValue] = useState<number>(5);
  const [lastBulkOperation, setLastBulkOperation] = useState<{ paymentsSnapshot: PaymentObligation[] } | null>(null);
  const [isCheckDetailsModalOpen, setIsCheckDetailsModalOpen] = useState(false);
  const [checkDetailsPaymentId, setCheckDetailsPaymentId] = useState<string | null>(null);
  const [isBatchCheckModalOpen, setIsBatchCheckModalOpen] = useState(false);
  const [selectedChecksForBatch, setSelectedChecksForBatch] = useState<Set<string>>(new Set());
  const [checkDetailsNumber, setCheckDetailsNumber] = useState("");
  const [checkDetailsBankName, setCheckDetailsBankName] = useState("");
  const [checkDetailsAccountLast4, setCheckDetailsAccountLast4] = useState("");
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false);
  const [addPaymentEmployeeId, setAddPaymentEmployeeId] = useState<string>("");
  const [addPaymentReason, setAddPaymentReason] = useState<string>("");
  const [addPaymentAmount, setAddPaymentAmount] = useState<number>(0);
  const [addPaymentDate, setAddPaymentDate] = useState<string>("");

  // Add Week Payments modal state
  const [isAddWeekModalOpen, setIsAddWeekModalOpen] = useState(false);
  const [week_start_date, setWeekStartDate] = useState<string>("");
  const [selectedEmployeesForWeek, setSelectedEmployeesForWeek] = useState<Set<string>>(new Set());
  const [weekDaysWorked, setWeekDaysWorked] = useState<number>(5); // Keeping for fallback/initialization
  const [employeeDays, setEmployeeDays] = useState<Record<string, number>>({});
  const [bulkDaysInput, setBulkDaysInput] = useState<number>(5);

  // Additional Payments Inline State
  const [isAddingPaymentInline, setIsAddingPaymentInline] = useState(false);
  const [queuedAdditionalPayments, setQueuedAdditionalPayments] = useState<Array<{
    id: string;
    employeeId: string;
    amount: number;
    reason: string;
    employeeName: string;
  }>>([]);
  const [inlinePaymentEmpId, setInlinePaymentEmpId] = useState("");
  const [inlinePaymentAmount, setInlinePaymentAmount] = useState<string>("");
  const [inlinePaymentReason, setInlinePaymentReason] = useState("");

  // Down Payment Edit modal state
  const [isEditDownPaymentOpen, setIsEditDownPaymentOpen] = useState(false);
  const [editingDownPaymentPaymentId, setEditingDownPaymentPaymentId] = useState<string | null>(null);
  const [editingDownPaymentAmount, setEditingDownPaymentAmount] = useState<number>(0);
  
  // Submission state to prevent double clicks
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Bulk reversal progress tracking
  const [bulkReverseProgress, setBulkReverseProgress] = useState<{
    processed: number;
    total: number;
    success: number;
    failed: number;
  } | null>(null);
  const [viewMode, setViewMode] = useState<"weekly" | "yearly">("weekly");

  // Bulk Check Edit modal state
  const [isBulkCheckEditOpen, setIsBulkCheckEditOpen] = useState(false);
  const [bulkCheckPayments, setBulkCheckPayments] = useState<PaymentObligation[]>([]);
  const [bulkCheckNumbers, setBulkCheckNumbers] = useState<Record<string, string>>({});
  const [bulkPaymentMethods, setBulkPaymentMethods] = useState<Record<string, string>>({});
  const [bulkAmounts, setBulkAmounts] = useState<Record<string, number>>({});
  const [bulkCheckStartNumber, setBulkCheckStartNumber] = useState<string>("");
  const [bulkCheckAutoAssign, setBulkCheckAutoAssign] = useState(true);

  // Batch Mark Paid modal state
  const [isBatchMarkPaidModalOpen, setIsBatchMarkPaidModalOpen] = useState(false);
  const [batchPaidDate, setBatchPaidDate] = useState<string>("");
  const [batchStartingCheckNumber, setBatchStartingCheckNumber] = useState<string>("");

  // Settings state
  const [settings, setSettings] = useState<Settings | null>(null);

  // Reload employees, absences, and payments when year changes
  const loadFreshData = async () => {
    setIsLoading(true);
    try {
      const [empData, payData, absData, settingsData] = await Promise.all([
        employeesService.getAll(),
        paymentsService.getAll(),
        absencesService.getAll(),
        settingsService.get(),
      ]);
      setEmployees(empData || []);
      
      setEmployees(empData || []);
      
      const mappedPayments = (payData || [])
        .filter((p: any) => {
          const date = new Date(p.week_start_date);
          return date.getFullYear() === selectedYear;
        })
        .map((p: any) => ({
          ...p,
          employee_name: p.employees?.name || "Unknown Employee",
          employee_position: p.employees?.position,
          employee_status: p.employees?.payment_status,
        }));
      
      setPayments(mappedPayments);
      
      const filteredAbsences = (absData || []).filter((a: any) => {
        const date = new Date(a.date);
        return date.getFullYear() === selectedYear;
      });
      setAbsences(filteredAbsences);
      setSettings(settingsData || null);

      // Sync to Ledger (LocalStorage)
      const ledgerPayments = mappedPayments.map((p: any) => ({
        id: p.id,
        employeeId: p.employee_id,
        employeeName: p.employee_name,
        employeePosition: p.employee_position,
        amount: p.amount,
        weekStartDate: p.week_start_date,
        weekEndDate: p.week_end_date,
        dueDate: p.due_date,
        status: p.status,
        paymentMethod: p.payment_method,
        paidDate: p.paid_date,
        paidCheckNumber: p.check_number,
        paidBankName: p.bank_name,
        paidAccountLast4: p.account_last_four,
        daysWorked: p.days_worked,
        isAdjustedForAbsence: p.is_adjusted_for_absence,
        fullWeeklySalary: p.full_weekly_salary,
        deductionAmount: p.deduction_amount,
        reason: p.notes || (p.is_severance ? "Severance" : undefined),
        notes: p.notes
      }));
      
      // Save for current year
      saveYearData("payments", selectedYear, ledgerPayments);
      window.dispatchEvent(new Event("paymentsUpdated"));
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error Loading Data",
        description: "Failed to fetch information from Supabase.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reload data when year changes
  useEffect(() => {
    loadFreshData();
  }, [selectedYear]);

  // Listen for external updates
  useEffect(() => {
    const handleCustomUpdate = () => loadFreshData();
    window.addEventListener("employeesUpdated", handleCustomUpdate);
    window.addEventListener("focus", handleCustomUpdate);
    document.addEventListener("visibilitychange", handleCustomUpdate);

    return () => {
      window.removeEventListener("employeesUpdated", handleCustomUpdate);
      window.removeEventListener("focus", handleCustomUpdate);
      document.removeEventListener("visibilitychange", handleCustomUpdate);
    };
  }, []);



  // Filter payments logic
  useEffect(() => {
    setIsAllMarkedAsPaid(false);
  }, [selectedYear]);

  // Parse date string in local timezone (not UTC)
  const parseLocalDate = (dateString: string): Date => {
    if (!dateString) return new Date();
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };


  const handleMarkAsPaid = (paymentId: string) => {
    console.log("📌 handleMarkAsPaid clicked - Opening payment modal");
    console.log("🔑 Payment ID:", paymentId);

    const payment = payments.find(p => p.id === paymentId);
    console.log("💰 Payment found:", payment?.employee_name, "-", payment?.amount);

    setSelectedPaymentId(paymentId);
    setPaidDate(getTodayDate());
    setPaidDeduction(0);
    setPaidCheckNumber("");
    setSelectedPaymentMethod(payment?.payment_method || "");
    setBankName("");
    setRoutingNumber("");
    setAccountNumber("");
    setIsPaymentModalOpen(true);

    console.log("🔓 Payment modal opened");
  };

  const handleConfirmPayment = async () => {
    console.log("💳 handleConfirmPayment called");
    console.log("📅 paid_date:", paid_date);
    console.log("💳 selectedPaymentMethod:", selectedPaymentMethod);
    console.log("🔑 selectedPaymentId:", selectedPaymentId);

    // Basic validation
    if (!selectedPaymentId) {
      console.error("❌ No payment selected");
      alert("Error: No payment selected");
      return;
    }

    if (!paid_date) {
      console.error("❌ No paid date selected");
      alert("Please enter a payment date");
      return;
    }

    if (!selectedPaymentMethod) {
      console.error("❌ No payment method selected");
      alert("Please select a payment method");
      return;
    }

    console.log("✅ Basic validation passed");

    const payment = payments.find(p => p.id === selectedPaymentId);
    if (!payment) {
      console.error("❌ Payment not found");
      alert("Error: Payment not found");
      return;
    }

    // Validate check number if paying by check
    if (selectedPaymentMethod === "check") {
      const isValid = await validateCheckNumber(check_number);
      if (!isValid) return;
    }

    try {
      // Direct Supabase update for allowed mutable fields (status, paid_date, payment details)
      const { error } = await supabase
        .from('payments')
        .update({
          status: "paid",
          paid_date,
          payment_method: selectedPaymentMethod,
          deduction_amount: paidDeduction,
          check_number: selectedPaymentMethod === "check" ? check_number : undefined,
          account_last_four: account_number ? account_number.slice(-4) : payment?.account_last_four,
          bank_name: bank_name || payment?.bank_name,
        })
        .eq('id', selectedPaymentId);

      if (error) {
        console.error("❌ Supabase error:", error);
        throw error;
      }

      console.log("✅ Payment updated in database");
      await loadFreshData();

      // Capture values before resetting for toast message
      const checkNumberVal = check_number;
      const method = selectedPaymentMethod;

      // Close modal
      setIsPaymentModalOpen(false);
      setSelectedPaymentId(null);
      setPaidDate("");
      setPaidDeduction(0);
      setPaidCheckNumber("");
      setBankName("");
      setRoutingNumber("");
      setAccountNumber("");
      setSelectedPaymentMethod("");

      toast({
        title: "✓ Payment Confirmed",
        description: `Payment marked as paid via ${method}${method === 'check' ? ` (Check #${checkNumberVal})` : ''}`,
      });

      console.log("✅ handleConfirmPayment COMPLETED SUCCESSFULLY");
    } catch (error: any) {
      console.error("❌ Error updating payment:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to update payment in Supabase.",
        variant: "destructive",
      });
      // Don't close modal on error so user can retry
    }
  };

  const handleMarkAsPending = async (payment_id: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: "pending", paid_date: null })
        .eq('id', payment_id);

      if (error) throw error;
      await loadFreshData();
      toast({
        title: "✓ Status Updated",
        description: "Payment has been marked as pending.",
      });
    } catch (error) {
      console.error("Error marking as pending:", error);
    }
  };

  const handleEditAmount = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setEditingPaymentId(paymentId);
      setEditingAmount(payment.amount);
      setEditingCheckNumber(payment.check_number || "");
      setEditingPaymentMethod(payment.payment_method || "");
      setIsEditAmountOpen(true);
    }
  };

  const handleConfirmAmountEdit = async () => {
    if (!editingPaymentId) {
      toast({
        title: "Invalid Payment",
        description: "Please select a payment to edit.",
        variant: "destructive",
      });
      return;
    }

    // Validate check number if payment method is check
    if (editingPaymentMethod === "check" && editingCheckNumber.trim()) {
      const isValid = await validateCheckNumber(editingCheckNumber, editingPaymentId);
      if (!isValid) {
        return;
      }
    }

    try {
      const updateData: any = { 
        amount: editingAmount,
        payment_method: editingPaymentMethod
      };
      
      // Only update check_number if payment method is check
      if (editingPaymentMethod === "check") {
        updateData.check_number = editingCheckNumber || null;
      } else {
        updateData.check_number = null;
      }

      const { error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', editingPaymentId);

      if (error) throw error;
      await loadFreshData();
      toast({
        title: "✓ Payment Updated",
        description: "Payment details have been updated.",
      });
    } catch (error) {
      console.error("Error updating payment:", error);
      toast({
        title: "Error",
        description: "Failed to update payment.",
        variant: "destructive",
      });
    }

    setIsEditAmountOpen(false);
    setEditingPaymentId(null);
    setEditingAmount(0);
    setEditingCheckNumber("");
    setEditingPaymentMethod("");
  };

  const handleEditDays = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setEditingDaysPaymentId(paymentId);
      setEditingDaysWorked(payment.days_worked || 5);
      setIsEditDaysOpen(true);
    }
  };

  const handleConfirmDaysEdit = async () => {
    if (!editingDaysPaymentId || editingDaysWorked < 1 || editingDaysWorked > 7) {
      alert("Please enter a valid number of days (1-7)");
      return;
    }

    const payment = payments.find(p => p.id === editingDaysPaymentId);
    if (!payment) return;

    // Calculate new amount based on days worked
    let weekly_rate = payment.full_weekly_salary || 0;
    if (!weekly_rate && payment.amount && payment.days_worked) {
      weekly_rate = (payment.amount / payment.days_worked) * 5;
    }
    if (!weekly_rate && payment.amount) {
      weekly_rate = payment.amount / 5 * 5;
    }

    const dailyRate = weekly_rate > 0 ? weekly_rate / 5 : 0;
    const newAmount = dailyRate * editingDaysWorked;

    try {
      const { error } = await supabase
        .from('payments')
        .update({
          days_worked: editingDaysWorked,
          amount: newAmount || payment.amount,
        })
        .eq('id', editingDaysPaymentId);

      if (error) throw error;
      await loadFreshData();
      toast({
        title: "✓ Days Worked Updated",
        description: "Days worked and payment amount have been updated.",
      });
    } catch (error) {
      console.error("Error updating days worked:", error);
      toast({
        title: "Error",
        description: "Failed to update days worked.",
        variant: "destructive",
      });
    }

    setIsEditDaysOpen(false);
    setEditingDaysPaymentId(null);
    setEditingDaysWorked(5);
  };

  const handleEditDownPayment = (paymentId: string) => {
    console.log("🔵 handleEditDownPayment clicked for payment:", paymentId);
    const payment = payments.find(p => p.id === paymentId);
    console.log("📦 Found payment:", payment);
    if (payment) {
      setEditingDownPaymentPaymentId(paymentId);
      setEditingDownPaymentAmount(payment.down_payment || 0);
      setIsEditDownPaymentOpen(true);
      console.log("✅ Down payment modal opened");
    } else {
      console.error("❌ Payment not found for ID:", paymentId);
    }
  };

  const handleConfirmDownPaymentEdit = async () => {
    console.log("💾 handleConfirmDownPaymentEdit - Updating down payment");
    console.log("🔑 Payment ID:", editingDownPaymentPaymentId);
    console.log("💰 Down Payment Amount:", editingDownPaymentAmount);
    console.log("🔍 All payments count:", payments.length);

    if (!editingDownPaymentPaymentId) {
      console.error("❌ No payment ID selected");
      alert("Error: No payment selected");
      return;
    }

    // Allow negative amounts for reversal entries
    // Down payment amounts can be negative for corrections

    const payment = payments.find(p => p.id === editingDownPaymentPaymentId);
    if (!payment) {
      console.error("❌ Payment not found:", editingDownPaymentPaymentId);
      console.log("🔍 Available payment IDs:", payments.map(p => p.id));
      alert("Error: Payment not found. Please try again.");
      return;
    }

    console.log("✅ Found payment to update:", payment.employee_name);
    const down_payment_amount = editingDownPaymentAmount;

    try {
      const { error } = await supabase
        .from('payments')
        .update({ down_payment: down_payment_amount })
        .eq('id', editingDownPaymentPaymentId);

      if (error) throw error;
      await loadFreshData();
      toast({
        title: "✅ Success",
        description: `Down payment updated to $${down_payment_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      });
    } catch (error) {
      console.error("❌ Error updating down payment:", error);
      toast({
        title: "Error",
        description: "Failed to update down payment.",
        variant: "destructive",
      });
      return;
    }

    // Close modal and reset state
    setIsEditDownPaymentOpen(false);
    setEditingDownPaymentPaymentId(null);
    setEditingDownPaymentAmount(0);

    console.log("✅ Down payment edit completed successfully");
  };

  const handleApplyBulkDays = async () => {
    if (bulkDaysValue < 1 || bulkDaysValue > 7) {
      alert("Please enter a valid number of days (1-7)");
      return;
    }

    // Only update pending payments in the current filtered view (current week)
    const pendingPaymentsList = filteredPayments.filter(p => p.status === "pending");
    if (pendingPaymentsList.length === 0) {
      toast({ description: "No pending payments to update for this week" });
      return;
    }

    // Store the current payments snapshot before making changes (for undo)
    setLastBulkOperation({
      paymentsSnapshot: payments.map(p => ({ ...p })), // Deep copy
    });

    const updates = pendingPaymentsList.map(async (p) => {
      // Calculate new amount based on days worked
      let weekly_rate = p.full_weekly_salary || 0;
      if (!weekly_rate && p.amount && p.days_worked) {
        weekly_rate = (p.amount / p.days_worked) * 5;
      }
      if (!weekly_rate && p.amount) {
        weekly_rate = p.amount / 5 * 5; // Assume it was 5 days
      }

      const dailyRate = weekly_rate > 0 ? weekly_rate / 5 : 0;
      const newAmount = dailyRate * bulkDaysValue;

      const { error } = await supabase
        .from('payments')
        .update({
          days_worked: bulkDaysValue,
          amount: newAmount || p.amount, // Fallback to original amount if calculation fails
        })
        .eq('id', p.id);

      if (error) throw error;
    });

    try {
      await Promise.all(updates);
      await loadFreshData(); // Reload all data after bulk update
      toast({
        title: "Success",
        description: `Updated ${pendingPaymentsList.length} pending payment${pendingPaymentsList.length !== 1 ? 's' : ''} for this week to ${bulkDaysValue} days worked`,
      });
    } catch (error) {
      console.error("Error applying bulk days:", error);
      toast({
        title: "Error",
        description: "Failed to apply bulk days update.",
        variant: "destructive",
      });
    }

    setIsBulkDaysOpen(false);
    setBulkDaysValue(5);
  };

  const handleRevertBulkDays = async () => {
    if (!lastBulkOperation) {
      alert("No recent bulk operation to revert");
      return;
    }

    // Restore the previous state by updating each payment individually
    const revertUpdates = lastBulkOperation.paymentsSnapshot.map(async (p) => {
      const { error } = await supabase
        .from('payments')
        .update({
          days_worked: p.days_worked,
          amount: p.amount,
          status: p.status,
          paid_date: p.paid_date,
          deduction_amount: p.deduction_amount,
          check_number: p.check_number,
          account_last_four: p.account_last_four,
          bank_name: p.bank_name,
        })
        .eq('id', p.id);

      if (error) throw error;
    });

    try {
      await Promise.all(revertUpdates);
      await loadFreshData(); // Reload all data after revert
      setLastBulkOperation(null);

      toast({
        title: "✓ Reverted",
        description: "Bulk set days operation has been reverted.",
      });
    } catch (error) {
      console.error("Error reverting bulk days:", error);
      toast({
        title: "Error",
        description: "Failed to revert bulk days operation.",
        variant: "destructive",
      });
    }
  };

  // Bulk Check Editing Functions
  const handleBulkEditChecks = () => {
    // Get all pending/paid payments for the current week
    const weekPayments = filteredPayments.filter(
      p => (p.status === "pending" || p.status === "paid")
    );

    if (weekPayments.length === 0) {
      toast({
        title: "No Payments Found",
        description: "No payments found for this week.",
        variant: "destructive",
      });
      return;
    }

    setBulkCheckPayments(weekPayments);
    
    // Initialize check numbers and payment methods with existing values
    const initialCheckNumbers: Record<string, string> = {};
    const initialPaymentMethods: Record<string, string> = {};
    weekPayments.forEach(p => {
      initialCheckNumbers[p.id] = p.check_number || "";
      initialPaymentMethods[p.id] = p.payment_method || "cash";
    });
    setBulkCheckNumbers(initialCheckNumbers);
    setBulkPaymentMethods(initialPaymentMethods);

    // Set starting number for auto-assignment
    const nextCheck = getNextCheckNumber();
    setBulkCheckStartNumber(nextCheck.toString());
    setBulkCheckAutoAssign(true);
    
    setIsBulkCheckEditOpen(true);
  };

  const handleAutoAssignCheckNumbers = () => {
    if (!bulkCheckStartNumber || isNaN(parseInt(bulkCheckStartNumber))) {
      toast({
        title: "Invalid Starting Number",
        description: "Please enter a valid starting check number.",
        variant: "destructive",
      });
      return;
    }

    let currentNumber = parseInt(bulkCheckStartNumber);
    const newCheckNumbers: Record<string, string> = { ...bulkCheckNumbers };
    
    // Assign sequential numbers only to payments with check payment method
    bulkCheckPayments.forEach(payment => {
      const paymentMethod = bulkPaymentMethods[payment.id] || payment.payment_method;
      if (paymentMethod === "check" && !payment.check_number) {
        newCheckNumbers[payment.id] = currentNumber.toString();
        currentNumber++;
      } else if (paymentMethod !== "check") {
        // Clear check number if payment method is not check
        newCheckNumbers[payment.id] = "";
      }
    });

    setBulkCheckNumbers(newCheckNumbers);
    
    toast({
      title: "✓ Check Numbers Assigned",
      description: `Assigned sequential check numbers starting from ${bulkCheckStartNumber}`,
    });
  };

  const handleConfirmBulkCheckEdit = async () => {
    setIsSubmitting(true);

    try {
      // Validate check numbers are unique and only for check payment methods
      const checkPayments = bulkCheckPayments.filter(p => bulkPaymentMethods[p.id] === "check");
      const checkNumberValues = checkPayments
        .map(p => bulkCheckNumbers[p.id])
        .filter(num => num && num.trim() !== "");
      
      const uniqueNumbers = new Set(checkNumberValues);
      
      if (checkNumberValues.length !== uniqueNumbers.size) {
        toast({
          title: "Duplicate Check Numbers",
          description: "Each check number must be unique. Please review and fix duplicates.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Validate against existing check numbers in the database
      for (const payment of checkPayments) {
        const checkNumber = bulkCheckNumbers[payment.id]?.trim();
        if (checkNumber && !(await validateCheckNumber(checkNumber, payment.id))) {
          setIsSubmitting(false);
          return; // validateCheckNumber shows its own error toast
        }
      }

      // Update all payments using direct Supabase calls
      const updatePromises = bulkCheckPayments.map(async (payment) => {
        const newPaymentMethod = bulkPaymentMethods[payment.id] || payment.payment_method;
        const newCheckNumber = newPaymentMethod === "check" ? (bulkCheckNumbers[payment.id]?.trim() || null) : null;
        const newAmount = bulkAmounts[payment.id] !== undefined ? bulkAmounts[payment.id] : payment.amount;
        
        if (newPaymentMethod !== payment.payment_method || newCheckNumber !== payment.check_number || newAmount !== payment.amount) {
          const { error } = await supabase
            .from('payments')
            .update({
              payment_method: newPaymentMethod,
              check_number: newCheckNumber,
              amount: newAmount
            })
            .eq('id', payment.id);
          
          if (error) throw error;
        }
      });

      await Promise.all(updatePromises);
      await loadFreshData(); // Reload all data

      const updatedCount = bulkCheckPayments.filter(
        p => bulkPaymentMethods[p.id] !== p.payment_method || 
             (bulkPaymentMethods[p.id] === "check" && bulkCheckNumbers[p.id]?.trim() !== (p.check_number || "")) ||
             (bulkAmounts[p.id] !== undefined && bulkAmounts[p.id] !== p.amount)
      ).length;

      toast({
        title: "✓ Payments Updated",
        description: `Successfully updated ${updatedCount} payment(s)`,
      });

      setIsBulkCheckEditOpen(false);
      setBulkCheckPayments([]);
      setBulkCheckNumbers({});
      setBulkPaymentMethods({});
      setBulkAmounts({});
      setBulkCheckStartNumber("");

    } catch (error) {
      console.error("Error updating bulk payment details:", error);
      toast({
        title: "Error",
        description: "Failed to update payment details. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrintCheck = (paymentId: string) => {
    setSelectedCheckPaymentId(paymentId);
    setIsCheckPrintModalOpen(true);
  };

  const handleReversePayment = (paymentId: string) => {
    setSelectedReversalPaymentId(paymentId);
    setReversalReason("");
    setCustomReversalReason("");
    setIsDeleteConfirmOpen(true);
  };

  const handleBulkReverseWeek = () => {
    // Get all paid payments for the selected week that aren't already reversed or reversals
    const paidPaymentsForWeek = filteredPayments.filter(
      p => p.status === "paid" && 
           !(p as any).is_correction && 
           !(p as any).reversed_by_payment_id
    );

    if (paidPaymentsForWeek.length === 0) {
      toast({
        title: "No Payments to Reverse",
        description: "There are no paid payments in this week that can be reversed.",
        variant: "destructive",
      });
      return;
    }

    setBulkReversalPayments(paidPaymentsForWeek);
    // Initialize all payments as selected by default
    setSelectedReversalPayments(new Set(paidPaymentsForWeek.map(p => p.id)));
    // Initialize empty reasons for each payment
    const initialReasons: Record<string, string> = {};
    const initialCustom: Record<string, string> = {};
    paidPaymentsForWeek.forEach(p => {
      initialReasons[p.id] = "";
      initialCustom[p.id] = "";
    });
    setBulkReversalReasons(initialReasons);
    setBulkCustomReasons(initialCustom);
    setIsBulkReverseOpen(true);
  };

  const handleConfirmBulkReverse = async () => {
    if (selectedReversalPayments.size === 0) {
      toast({
        title: "No Payments Selected",
        description: "Please select at least one payment to reverse.",
        variant: "destructive",
      });
      return;
    }

    // Validate selected payments have reasons
    const selectedPaymentsList = bulkReversalPayments.filter(p => selectedReversalPayments.has(p.id));
    const missingReasons: string[] = [];
    for (const payment of selectedPaymentsList) {
      const selectedReason = bulkReversalReasons[payment.id] || "";
      const customReason = bulkCustomReasons[payment.id] || "";
      const finalReason = selectedReason === "" ? customReason.trim() : selectedReason.trim();
      
      if (!finalReason) {
        missingReasons.push(payment.employee_name);
      }
    }

    if (missingReasons.length > 0) {
      toast({
        title: "Missing Reversal Reasons",
        description: `Please provide reasons for: ${missingReasons.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    // Progress tracking
    setBulkReverseProgress({ processed: 0, total: selectedPaymentsList.length, success: 0, failed: 0 });

    let successCount = 0;
    let failCount = 0;

    for (const [idx, payment] of selectedPaymentsList.entries()) {
      const selectedReason = bulkReversalReasons[payment.id] || "";
      const customReason = bulkCustomReasons[payment.id] || "";
      const finalReason = selectedReason === "" ? customReason.trim() : selectedReason.trim();
      
      try {
        await paymentsService.reversePayment(payment.id, finalReason);
        successCount++;
      } catch (error) {
        console.error(`Error reversing payment ${payment.id}:`, error);
        failCount++;
      }

      // update progress after each attempt
      setBulkReverseProgress(prev => ({
        processed: (prev?.processed || 0) + 1,
        total: selectedPaymentsList.length,
        success: successCount,
        failed: failCount,
      }));
    }

    setIsSubmitting(false);
    // ensure we refresh data after all reversals
    await loadFreshData();

    toast({
      title: "Bulk Reversal Complete",
      description: `Successfully reversed ${successCount} payment(s).${failCount > 0 ? ` ${failCount} failed.` : ""}`,
      variant: failCount > 0 ? "destructive" : "default",
    });

    setIsBulkReverseOpen(false);
    setBulkReversalPayments([]);
    setSelectedReversalPayments(new Set());
    setBulkReversalReasons({});
    setBulkCustomReasons({});
    setBulkReverseProgress(null);
  };

  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  const handleConfirmReversePayment = async () => {
    // Use custom reason if "Custom reason..." selected, otherwise use template
    const finalReason = reversalReason === "Custom reason..." 
      ? customReversalReason.trim()
      : reversalReason.trim();

    if (!selectedReversalPaymentId || !finalReason) {
      toast({
        title: "Reversal Reason Required",
        description: "Please provide a reason for reversing this payment.",
        variant: "destructive",
      });
      return;
    }

    const paymentToReverse = payments.find(p => p.id === selectedReversalPaymentId);

    if (paymentToReverse) {
      try {
        await paymentsService.reversePayment(selectedReversalPaymentId, finalReason);
        await loadFreshData();
        toast({
          title: "Payment Reversed",
          description: `Reversal entry created for ${paymentToReverse.employee_name}'s payment.`,
        });
        setReversalReason("");
        setCustomReversalReason("");
      } catch (error: any) {
        console.error("Error reversing payment:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to reverse payment.",
          variant: "destructive",
        });
      }
    }
    setIsDeleteConfirmOpen(false);
    setSelectedReversalPaymentId(null);
  };

  // Find the earliest pending payment date (coming week to pay)
  // Get all unique week start dates
  const availableWeeks = Array.from(new Set(payments.map(p => p.week_start_date)))
    .sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)

  // Determine default week (Earliest Pending > Current Real Week > Latest Available)
  const defaultWeek = useMemo(() => {
    // 1. Try to find earliest pending week
    const pendingWeeks = payments
      .filter(p => p.status === "pending")
      .map(p => p.week_start_date)
      .sort();
    
    if (pendingWeeks.length > 0) return pendingWeeks[0];

    // 2. Fallback to latest available week
    if (availableWeeks.length > 0) return availableWeeks[0];

    // 3. Fallback to current week (2026-01-26 context)
    return "2026-01-25"; // Approximate default
  }, [payments, availableWeeks]);

  // Persist selected week per year so view survives refresh
  const selectedWeekStorageKey = `payments_selected_week_${selectedYear}`;

  const [selectedWeek, setSelectedWeek] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(`payments_selected_week_${selectedYear}`);
      return saved ?? '';
    } catch (e) {
      return '';
    }
  });

  // Restore saved week or use defaultWeek on initial load / when year changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(selectedWeekStorageKey);
      if (saved) {
        setSelectedWeek(saved);
        return;
      }
    } catch (e) {
      // ignore
    }

    if (defaultWeek) {
      setSelectedWeek(defaultWeek);
    }
  }, [defaultWeek, selectedYear]);

  // Save selectedWeek whenever it changes
  useEffect(() => {
    try {
      if (selectedWeek) {
        localStorage.setItem(selectedWeekStorageKey, selectedWeek);
      } else {
        localStorage.removeItem(selectedWeekStorageKey);
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [selectedWeek, selectedYear]);

  // Compute Yearly Stats for "All Payments" view
  const yearlyStats = useMemo(() => {
    const stats: Record<string, { id: string, name: string, weeklyRate: number, paid: number, pending: number, total: number, count: number }> = {};
    
    // Initialize with all active employees
    employees.forEach(e => {
      stats[e.id] = { id: e.id, name: e.name, weeklyRate: e.weekly_rate || 0, paid: 0, pending: 0, total: 0, count: 0 };
    });

    // Aggregate payments
    payments.forEach(p => {
      // If employee not in map (e.g. deleted), create entry or skip?
      // For now, let's skip if no matching employee to avoid displaying IDs, or handle if needed.
      // But usually payments belong to valid employees.
      if (!stats[p.employee_id]) {
         // Optionally handle deleted employees if name is available in payment? (Cabinet2 payments don't seem to store name denormalized, just ID. Wait, PDF gen helper used p.employee_name??)
         // Checking types... PaymentObligation interface from Step 741 getPaymentMethodDisplay params...
         // Let's rely on `employees` list. If they are deleted, they might be missing.
         // Better to check if we can get name from somewhere else or just skip.
         return;
      }
      
      const amount = p.amount || 0;
      stats[p.employee_id].total += amount;
      stats[p.employee_id].count += 1;
      
      if (p.status === 'paid') {
        const deduction = p.deduction_amount || 0;
        stats[p.employee_id].paid += (amount - deduction); // Net paid? Or gross? Usually Total Earned = Gross. Paid = Net? 
        // Image 2 "Total Earned" vs "Paid" vs "Pending". 
        // Let's assume Paid = amount for now unless specific logic needed.
        // Step 750 line 1176: totalPaid uses (amount - deduction). I will use that for consistency.
      } else if (p.status === 'pending') {
        stats[p.employee_id].pending += amount;
      }
    });

    return Object.values(stats);
  }, [employees, payments]);

  const yearlyTotals = useMemo(() => {
    return yearlyStats.reduce((acc, curr) => ({
      total: acc.total + curr.total,
      paid: acc.paid + curr.paid,
      pending: acc.pending + curr.pending,
      count: acc.count + curr.count
    }), { total: 0, paid: 0, pending: 0, count: 0 });
  }, [yearlyStats]);

  const filteredPayments = payments
    .filter((p) => {
      const statusMatch = filterStatus === "all" || p.status === filterStatus;
      const employeeMatch = filterEmployee === "all" || p.employee_id === filterEmployee;

      let dateMatch = true;

      // If user set manual date filters, use those
      if (filterFromDate || filterToDate) {
        const paymentDate = parseLocalDate(p.due_date);

        if (filterFromDate) {
          const from_date = parseLocalDate(filterFromDate);
          if (paymentDate < from_date) dateMatch = false;
        }
        if (filterToDate) {
          const to_date = parseLocalDate(filterToDate);
          if (paymentDate > to_date) dateMatch = false;
        }
      } else {
        // Strict Week Filtering
        dateMatch = p.week_start_date === selectedWeek;
      }

      // Filter out pending or canceled payments for laid-off employees unless it's severance
      let laidOffFilter = true;
      if ((p.status === "pending" || p.status === "canceled") && p.employee_status === "laid_off") {
        // Rely strictly on DB flags as requested by user
        // p.is_severance is the primary truth. p.severance_date is a secondary confirmation.
        const isSeverance = !!p.is_severance || !!p.severance_date;
        
        if (!isSeverance) {
          laidOffFilter = false;
        }
      }

      return statusMatch && employeeMatch && dateMatch && laidOffFilter;
    })
    .sort((a, b) => {
      // Primary sort: by Employee ID in ascending order (EMP-001, EMP-002, etc.)
      const aIdMatch = a.employee_id.match(/EMP-(\d+)/);
      const bIdMatch = b.employee_id.match(/EMP-(\d+)/);

      if (aIdMatch && bIdMatch) {
        const aNum = parseInt(aIdMatch[1], 10);
        const bNum = parseInt(bIdMatch[1], 10);
        if (aNum !== bNum) {
          return aNum - bNum;
        }
      }

      // Secondary sort: by due_date in ascending order (oldest first)
      const aDate = parseLocalDate(a.due_date);
      const bDate = parseLocalDate(b.due_date);
      return aDate.getTime() - bDate.getTime();
    });

  const pendingPayments = filteredPayments.filter((p) => p.status === "pending");
  const paidPayments = filteredPayments.filter((p) => p.status === "paid");
  const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = paidPayments.reduce((sum, p) => {
    const deduction = p.deduction_amount || 0;
    return sum + ((p.amount || 0) - deduction);
  }, 0);

  const handleMarkAllAsPaid = () => {
    // Open the new modal instead of confirming directly
    setBatchPaidDate(getTodayDate());
    // Auto-fill next check number if checks are used
    const nextCheck = getNextCheckNumber();
    setBatchStartingCheckNumber(nextCheck.toString());
    
    setIsBatchMarkPaidModalOpen(true);
  };

  const handleConfirmBatchMarkPaid = async () => {
    setIsSubmitting(true);
    try {
      // Only mark the payments currently visible/filtered as paid
      const pendingIds = filteredPayments.filter(p => p.status === "pending").map(p => p.id);
      
      let nextCheckNum = parseInt(batchStartingCheckNumber) || getNextCheckNumber();
      const isCheckPayment = batchStartingCheckNumber && batchStartingCheckNumber.trim() !== "";

      await Promise.all(pendingIds.map(async (id, index) => {
        const updateData: any = { 
          status: "paid", 
          paid_date: batchPaidDate 
        };
        
        // If user provided a starting check number, assign incrementing check numbers
        if (isCheckPayment) {
          updateData.check_number = (nextCheckNum + index).toString();
        }

        const { error } = await supabase
          .from('payments')
          .update(updateData)
          .eq('id', id);

        if (error) throw error;
        return { id };
      }));

      await loadFreshData();
      setIsBatchMarkPaidModalOpen(false);
      
      toast({
        title: "✓ All Paid",
        description: `Marked ${pendingIds.length} payments as paid.`,
      });
    } catch (error) {
      console.error("Error marking all as paid:", error);
      toast({
        title: "Error",
        description: "Failed to mark payments as paid.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // REMOVED: handleMarkAllAsUnpaid() - violates ledger immutability
  // REMOVED: handleDeleteAllPending() - use reversals instead
  // REMOVED: handleConfirmClearAll() - payments are append-only

  const isOverdue = (due_date: string) => {
    return new Date(due_date) < new Date() && new Date().toDateString() !== new Date(due_date).toDateString();
  };

  const handleAddPayment = async () => {
    if (!addPaymentEmployeeId) {
      alert("Please select an employee");
      return;
    }

    if (!addPaymentReason) {
      alert("Please enter a reason/note for this payment");
      return;
    }

    if (isNaN(addPaymentAmount)) {
      alert("Please enter a valid amount");
      return;
    }

    if (!addPaymentDate) {
      alert("Please select a date");
      return;
    }

    const employee = employees.find(e => e.id === addPaymentEmployeeId);
    if (!employee) return;

    // Parse the date to get components
    const parts = addPaymentDate.split('-');
    const paymentDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    
    // Calculate week start date (Sunday) from the payment date
    const week_start_date_obj = new Date(paymentDateObj);
    week_start_date_obj.setDate(paymentDateObj.getDate() - paymentDateObj.getDay()); // Go to Sunday
    const weekStartYear = week_start_date_obj.getFullYear();
    const month = String(week_start_date_obj.getMonth() + 1).padStart(2, '0');
    const day = String(week_start_date_obj.getDate()).padStart(2, '0');
    const weekStartStr = `${weekStartYear}-${month}-${day}`;

    // Calculate week end date (Saturday)
    const week_end_date_obj = new Date(week_start_date_obj);
    week_end_date_obj.setDate(week_start_date_obj.getDate() + 6);
    const weekEndStr = formatDateToString(week_end_date_obj);

    // Calculate due_date as the day after week_end_date
    const due_date_obj = new Date(week_end_date_obj);
    due_date_obj.setDate(week_end_date_obj.getDate() + 1);
    const due_date_str = formatDateToString(due_date_obj);

    try {
      setIsSubmitting(true);
      await paymentsService.create({
        employee_id: employee.id,
        amount: addPaymentAmount,
        week_start_date: weekStartStr,
        week_end_date: weekEndStr,
        due_date: due_date_str,
        status: "pending",
        payment_method: employee.payment_method,
        bank_name: employee.bank_details?.bank_name || null,
        routing_number: employee.bank_details?.routing_number || null,
        account_number: employee.bank_details?.account_number || null,
        account_type: employee.bank_details?.account_type || null,
        account_last_four: employee.bank_details?.account_number ? (employee.bank_details.account_number.slice(-4)) : null,
        days_worked: 5,
        deduction_amount: 0,
        notes: addPaymentReason,
        gross_amount: addPaymentAmount,
        bonus_amount: 0,
        check_number: null,
        paid_date: null,
        down_payment: 0,
      });
      await loadFreshData();

      // Reset form and close modal
      setIsAddPaymentModalOpen(false);
      setAddPaymentEmployeeId("");
      setAddPaymentReason("");
      setAddPaymentAmount(0);
      setAddPaymentDate("");

      toast({
        title: "✓ Payment Added",
        description: `$${addPaymentAmount.toLocaleString()} payment for ${employee.name} has been added.`,
      });
    } catch (error) {
      console.error("Error adding payment:", error);
      toast({
        title: "Error",
        description: "Failed to add payment.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for adding weekly payments
  const handleAddWeekPayments = async () => {
    if (!week_start_date) {
      alert("Please select a week start date");
      return;
    }

    if (selectedEmployeesForWeek.size === 0) {
      alert("Please select at least one employee");
      return;
    }

    // Parse the week start date
    const parts = week_start_date.split('-');
    const year = parseInt(parts[0], 10);

    if (year !== 2026) {
      alert("Week dates must be in 2026");
      return;
    }

    // Create a Date object from the week start date
    const weekStart = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

    // Calculate week end (Saturday - 6 days after Sunday)
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // Calculate due date (day after Saturday)
    const due_date = new Date(weekEnd);
    due_date.setDate(weekEnd.getDate() + 1);

    // Helper to format dates
    const formatDateStr = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const weekStartStr = formatDateStr(weekStart);
    const weekEndStr = formatDateStr(weekEnd);
    const due_dateStr = formatDateStr(due_date);

    // Check if payments for this week already exist
    const existingPaymentIds = new Set<string>();
    payments.forEach(p => {
      if (p.week_start_date === weekStartStr) {
        existingPaymentIds.add(p.employee_id);
      }
    });

    const duplicateEmployees: string[] = [];
    selectedEmployeesForWeek.forEach(empId => {
      if (existingPaymentIds.has(empId)) {
        const emp = employees.find(e => e.id === empId);
        if (emp) duplicateEmployees.push(emp.name);
      }
    });

    if (duplicateEmployees.length > 0) {
      alert(`Payments for the week of ${weekStartStr} already exist for: ${duplicateEmployees.join(', ')}`);
      return;
    }

    // Create payments for selected employees
    try {
      setIsSubmitting(true);
      await Promise.all(Array.from(selectedEmployeesForWeek).map(async (empId) => {
        const employee = employees.find(e => e.id === empId);
        if (employee) {
          const daysWorked = employeeDays[empId] ?? 5;
          const dailyRate = employee.weekly_rate / 5;
          const amount = dailyRate * daysWorked;

          await paymentsService.create({
            employee_id: employee.id,
            amount: amount,
            week_start_date: weekStartStr,
            week_end_date: weekEndStr,
            due_date: due_dateStr,
            status: "pending",
            payment_method: employee.payment_method,
            bank_name: employee.bank_details?.bank_name || null,
            routing_number: employee.bank_details?.routing_number || null,
            account_number: employee.bank_details?.account_number || null,
            account_type: employee.bank_details?.account_type || null,
            account_last_four: employee.bank_details?.account_number ? (employee.bank_details.account_number.slice(-4)) : null,
            days_worked: daysWorked,
            deduction_amount: 0,
            gross_amount: amount,
            bonus_amount: 0,
            check_number: null,
            paid_date: null,
            down_payment: 0,
            notes: null,
          });
        }
      }));

      // Process queued additional payments
      if (queuedAdditionalPayments.length > 0) {
        await Promise.all(queuedAdditionalPayments.map(async (qp) => {
          const employee = employees.find(e => e.id === qp.employeeId);
          if (employee) {
            await paymentsService.create({
              employee_id: employee.id,
              amount: qp.amount,
              week_start_date: weekStartStr,
              week_end_date: weekEndStr,
              due_date: due_dateStr,
              status: "pending",
              payment_method: employee.payment_method,
              bank_name: employee.bank_details?.bank_name || null,
              routing_number: employee.bank_details?.routing_number || null,
              account_number: employee.bank_details?.account_number || null,
              account_type: employee.bank_details?.account_type || null,
              account_last_four: employee.bank_details?.account_number ? (employee.bank_details.account_number.slice(-4)) : null,
              days_worked: 0, // Additional payment doesn't imply days worked
              deduction_amount: 0,
              gross_amount: qp.amount,
              bonus_amount: 0,
              check_number: null,
              paid_date: null,
              down_payment: 0,
              notes: qp.reason,
            });
          }
        }));
      }

      await loadFreshData();

      // Reset form and close modal
      setIsAddWeekModalOpen(false);
      setWeekStartDate("");
      setSelectedEmployeesForWeek(new Set());
      setWeekDaysWorked(5);
      setQueuedAdditionalPayments([]);
      
      toast({
        title: "✓ Week & Payments Added",
        description: `Added salary payments for ${selectedEmployeesForWeek.size} employees and ${queuedAdditionalPayments.length} additional payments.`,
      });
    } catch (error) {
      console.error("Error adding week payments:", error);
      toast({
        title: "Error",
        description: "Failed to add weekly payments.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddWeeklyPayments = () => {
    // Simply open the modal - let user manually select week and employees
    setIsAddWeekModalOpen(true);
    // Initialize with all active employees selected (exclude laid_off)
    const activeEmployeesIds = new Set(
      employees
        .filter(e => e.payment_status !== 'laid_off')
        .map(e => e.id)
    );
    setSelectedEmployeesForWeek(activeEmployeesIds);
    
    // Initialize days for all employees to 5
    const initialDays: Record<string, number> = {};
    employees.forEach(emp => {
      initialDays[emp.id] = 5;
    });
    setEmployeeDays(initialDays);
    setBulkDaysInput(5);
    
    // Reset additional payments state
    setQueuedAdditionalPayments([]);
    setIsAddingPaymentInline(false);
    setInlinePaymentEmpId("");
    setInlinePaymentAmount("");
    setInlinePaymentReason("");

    // Set week start date to NEXT week (7 days after currently viewed week)
    if (selectedWeek) {
      const currentWeekParts = selectedWeek.split('-');
      const currentWeekDate = new Date(
        parseInt(currentWeekParts[0], 10),
        parseInt(currentWeekParts[1], 10) - 1,
        parseInt(currentWeekParts[2], 10)
      );
      const nextWeekDate = new Date(currentWeekDate);
      nextWeekDate.setDate(currentWeekDate.getDate() + 7);
      setWeekStartDate(formatDateToString(nextWeekDate));
    } else {
      // Fallback: default to second week in 2026
      setWeekStartDate("2026-01-11");
    }
  };

  const handleBulkApply = () => {
    const newDays = { ...employeeDays };
    selectedEmployeesForWeek.forEach(id => {
      newDays[id] = bulkDaysInput;
    });
    setEmployeeDays(newDays);
    toast({
      description: `Applied ${bulkDaysInput} days to ${selectedEmployeesForWeek.size} selected employees.`
    });
  };

  const handleAddInlinePayment = () => {
    if (!inlinePaymentEmpId || !inlinePaymentAmount) return;
    
    const emp = employees.find(e => e.id === inlinePaymentEmpId);
    if (!emp) return;

    const amount = parseFloat(inlinePaymentAmount);
    if (isNaN(amount)) return;

    setQueuedAdditionalPayments(prev => [...prev, {
      id: `q-${Date.now()}`,
      employeeId: emp.id,
      employeeName: emp.name,
      amount: amount,
      reason: inlinePaymentReason || "Additional Payment"
    }]);

    setIsAddingPaymentInline(false);
    setInlinePaymentEmpId("");
    setInlinePaymentAmount("");
    setInlinePaymentReason("");
  };

  const handleRemoveQueuedPayment = (id: string) => {
    setQueuedAdditionalPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleAttachCheck = (paymentId: string) => {
    setSelectedPaymentForAttachment(paymentId);
    setIsCheckAttachmentModalOpen(true);
  };

  const handleCheckFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPaymentForAttachment) {
      alert("Please select a file");
      return;
    }

    // Limit file size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    // Read file as base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Data = event.target?.result as string;
      const newAttachment: CheckAttachment = {
        id: `ATT-${Date.now()}`,
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadDate: getTodayDate(),
        data: base64Data,
      };

      const updatedPayments = payments.map((payment) =>
        payment.id === selectedPaymentForAttachment
          ? {
              ...payment,
              attachments: [...(payment.attachments || []), newAttachment],
            }
          : payment
      );

      setPayments(updatedPayments);
      // Local storage save removed

      setIsCheckAttachmentModalOpen(false);
      setSelectedPaymentForAttachment(null);
      toast({
        title: "Success",
        description: "Check attachment added successfully!",
      });
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveCheckAttachment = (paymentId: string, attachmentId: string) => {
    if (window.confirm("Are you sure you want to remove this attachment?")) {
      const updatedPayments = payments.map((payment) =>
        payment.id === paymentId
          ? {
              ...payment,
              attachments: payment.attachments?.filter((att) => att.id !== attachmentId) || [],
            }
          : payment
      );

      setPayments(updatedPayments);
      // Local storage save removed

      toast({
        title: "Success",
        description: "Attachment removed successfully!",
      });
    }
  };

  const handleDownloadCheckAttachment = (attachment: CheckAttachment) => {
    const link = document.createElement("a");
    link.href = attachment.data;
    link.download = attachment.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewCheckAttachment = (attachment: CheckAttachment) => {
    setSelectedCheckAttachment(attachment);
    setIsViewCheckAttachmentOpen(true);
  };

  const handlePrintCheckAttachment = (attachment: CheckAttachment) => {
    const printWindow = window.open('', '', 'width=900,height=700');
    if (printWindow) {
      if (attachment.fileType.startsWith('image/')) {
        // For images, create an HTML page with the image
        printWindow.document.write(`
          <html>
            <head>
              <title>${attachment.filename}</title>
              <style>
                body { margin: 0; padding: 10px; }
                img { max-width: 100%; height: auto; display: block; margin: 0 auto; }
              </style>
            </head>
            <body>
              <img src="${attachment.data}" alt="${attachment.filename}" />
              <script>
                window.onload = function() {
                  window.print();
                  window.onafterprint = function() { window.close(); };
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        // For PDFs and other files, try to open in iframe for printing
        printWindow.document.write(`
          <html>
            <head>
              <title>${attachment.filename}</title>
              <style>
                body { margin: 0; padding: 10px; font-family: Arial, sans-serif; }
                .container { max-width: 900px; margin: 0 auto; }
                .header { padding: 20px 0; border-bottom: 1px solid #ccc; margin-bottom: 20px; }
                .file-info { color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h2>${attachment.filename}</h2>
                  <div class="file-info">
                    <p>Type: ${attachment.fileType}</p>
                    <p>Size: ${(attachment.fileSize / 1024).toFixed(2)} KB</p>
                    <p>Uploaded: ${attachment.uploadDate}</p>
                  </div>
                </div>
                <div style="text-align: center; color: #999; padding: 40px;">
                  <p>Document is ready to print. Use Ctrl+P (or Cmd+P) to print this file.</p>
                  <p style="font-size: 12px;">If the document doesn't display, you may need to download it to view properly.</p>
                </div>
              </div>
              <script>
                window.onload = function() {
                  window.print();
                  window.onafterprint = function() { window.close(); };
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const handleEditCheckDetails = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (payment && payment.status === "paid") {
      setCheckDetailsPaymentId(paymentId);
      setCheckDetailsNumber(payment.check_number || "");
      setCheckDetailsBankName(payment.bank_name || "");
      setCheckDetailsAccountLast4(payment.account_last_four || "");
      setIsCheckDetailsModalOpen(true);
    }
  };

  const handleConfirmCheckDetailsEdit = async () => {
    if (!checkDetailsPaymentId) return;

    try {
      const { supabase } = await import('@/lib/supabase');
      const { error } = await supabase
        .from('payments')
        .update({
          check_number: checkDetailsNumber,
          bank_name: checkDetailsBankName,
          account_last_four: checkDetailsAccountLast4,
        })
        .eq('id', checkDetailsPaymentId);

      if (error) throw error;
      await loadFreshData();
      
      setIsCheckDetailsModalOpen(false);
      setCheckDetailsPaymentId(null);
      setCheckDetailsNumber("");
      setCheckDetailsBankName("");
      setCheckDetailsAccountLast4("");

      toast({
        title: "Success",
        description: "Check details updated successfully",
      });
    } catch (error) {
      console.error("Error updating check details:", error);
      toast({
        title: "Error",
        description: "Failed to update check details.",
        variant: "destructive",
      });
    }
  };

  const getPaymentMethodDisplay = (method?: string, payment?: PaymentObligation) => {
    if (!payment || payment.status !== "paid") {
      // For pending/canceled payments, show method and check number if available
      switch (method) {
        case "cash":
          return "Cash";
        case "direct_deposit":
          return "Direct Deposit";
        case "check":
          return payment?.check_number ? `Check #${payment.check_number}` : "Check";
        case "ach":
          return "ACH Transfer";
        case "wire":
          return "Wire Transfer";
        default:
          return "Not Set";
      }
    }

    // For paid payments, show details with check number
    switch (method) {
      case "cash":
        return "Cash";
      case "direct_deposit":
        return `Direct Deposit (${payment.bank_name || ""} ••••${payment.account_last_four || ""})`;
      case "check":
        return `Check #${payment.check_number || "N/A"}`;
      case "ach":
        return `ACH Transfer (••••${payment.account_last_four || ""})`;
      case "wire":
        return `Wire Transfer (${payment.bank_name || ""})`;
      default:
        return "Not Set";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Payroll</h1>
          <p className="text-slate-600 mt-1">Process and manage employee payments</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => setIsAddPaymentModalOpen(true)}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Payment
          </Button>
          <Button
            onClick={handleAddWeeklyPayments}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            title="Add weekly payments - upcoming week and all employees pre-selected"
          >
            <Calendar className="w-4 h-4" />
            Add Weekly Payments
          </Button>
          <div className="border-l border-slate-300"></div>
          <Button
            onClick={() => setViewMode(viewMode === "weekly" ? "yearly" : "weekly")}
            className={`gap-2 ${viewMode === "yearly" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-700 hover:bg-slate-800"}`}
          >
            <DollarSign className="w-4 h-4" />
            {viewMode === "weekly" ? "Yearly Earnings" : "All Payments"}
          </Button>
          <Button
            onClick={() => {
              document.body.setAttribute('data-current-page', `Payroll - ${viewMode === "weekly" ? "Weekly Payments" : "Yearly Earnings"}`);
              window.print();
            }}
            className="gap-2 bg-slate-700 hover:bg-slate-800"
            title="Print payroll information"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <p className="text-3xl font-bold text-orange-600">${(totalPending || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-sm text-slate-600">{pendingPayments.length} payments</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const overdueAmount = pendingPayments.filter((p) => isOverdue(p.due_date)).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
              const overdueCount = pendingPayments.filter((p) => isOverdue(p.due_date)).length;
              return (
                <div className="flex items-baseline gap-2 whitespace-nowrap">
                  <p className="text-3xl font-bold text-red-600">${overdueAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="text-sm text-slate-600">{overdueCount} payments</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2 whitespace-nowrap">
              <p className="text-3xl font-bold text-green-600">${(totalPaid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-sm text-slate-600">{paidPayments.length} payments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {viewMode === "yearly" ? (
        <Card className="border-slate-200" data-print-section>
          <CardHeader>
            <CardTitle>Yearly Earnings Summary</CardTitle>
            <CardDescription>Consolidated payments for 2026</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-900">Employee</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Weekly Rate</th>
                    <th className="text-center p-3 font-semibold text-slate-900">Payments</th>
                    <th className="text-right p-3 font-semibold text-slate-900">Total Earned</th>
                    {/* <th className="text-right p-3 font-semibold text-slate-900">Paid</th> */}
                    {/* <th className="text-right p-3 font-semibold text-slate-900">Pending</th> */}
                  </tr>
                </thead>
                <tbody>
                  {yearlyStats.map(stat => (
                    <tr key={stat.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="p-3 text-slate-700 font-medium">{stat.name}</td>
                      <td className="p-3 text-slate-700 text-right font-medium">${stat.weeklyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3 text-slate-700 text-center">{stat.count}</td>
                      <td className="p-3 text-slate-700 text-right font-medium">${stat.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      {/* <td className="p-3 text-green-600 text-right bg-green-50/50">${stat.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> */}
                      {/* <td className="p-3 text-orange-600 text-right bg-orange-50/50">${stat.pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> */}
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td className="p-3 text-slate-900">TOTAL</td>
                    <td className="p-3 text-slate-900 text-right">-</td>
                    <td className="p-3 text-slate-900 text-center">{yearlyTotals.count}</td>
                    <td className="p-3 text-slate-900 text-right">${yearlyTotals.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    {/* <td className="p-3 text-green-700 text-right">${yearlyTotals.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> */}
                    {/* <td className="p-3 text-orange-700 text-right">${yearlyTotals.pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td> */}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-slate-200" data-print-section>
          <CardHeader>
            <CardTitle>Generate Payments</CardTitle>
          <CardDescription>Calculate and process payments</CardDescription>
          <div className="space-y-4 mt-4">
            {/* Filters Section */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Filter Payments</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="status-filter" className="text-sm font-medium mb-2 block">Status</Label>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger id="status-filter" className="w-full border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="employee-filter" className="text-sm font-medium mb-2 block">Employee</Label>
                  <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                    <SelectTrigger id="employee-filter" className="w-full border-slate-300">
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
                  <Label htmlFor="from-date-filter" className="text-sm font-medium mb-2 block">From Date</Label>
                  <Input
                    id="from-date-filter"
                    type="date"
                    value={filterFromDate}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                    className="w-full border-slate-300"
                  />
                </div>

                <div>
                  <Label htmlFor="to-date-filter" className="text-sm font-medium mb-2 block">To Date</Label>
                  <Input
                    id="to-date-filter"
                    type="date"
                    value={filterToDate}
                    onChange={(e) => setFilterToDate(e.target.value)}
                    className="w-full border-slate-300"
                  />
                </div>
              </div>

              {(filterStatus !== "all" || filterEmployee !== "all" || filterFromDate || filterToDate) && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterStatus("all");
                      setFilterEmployee("all");
                      setFilterFromDate("");
                      setFilterToDate("");
                    }}
                    className="gap-2"
                  >
                    <X className="w-4 h-4" />
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-4 items-center flex-wrap">
              <div className="flex items-center gap-2">
                <Label htmlFor="weekSelector" className="text-sm font-medium text-slate-700">View Week:</Label>
                <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                  <SelectTrigger id="weekSelector" className="w-[180px] border-slate-300">
                    <SelectValue placeholder="Select week" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableWeeks.map((week) => (
                      <SelectItem key={week} value={week}>
                        {new Date(week).toLocaleDateString()} ({payments.filter(p => p.week_start_date === week).length} items)
                      </SelectItem>
                    ))}
                    {!availableWeeks.includes(selectedWeek) && (
                      <SelectItem value={selectedWeek}>
                        {new Date(selectedWeek).toLocaleDateString()} (Current)
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 items-center flex-wrap">
                <Button
                  variant="outline"
                  onClick={handleMarkAllAsPaid}
                  className="gap-2 border-slate-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                  title="Mark all visible pending payments as PAID"
                >
                   ✓ Paid
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkReverseWeek}
                  className="gap-2 border-orange-200 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
                  title="Reverse all paid payments for this week"
                  disabled={filteredPayments.filter(p => p.status === "paid" && !(p as any).is_correction && !(p as any).reversed_by_payment_id).length === 0}
                >
                  <AlertCircle className="w-4 h-4" />
                  Reverse Week
                </Button>
                <Button
                  variant="outline"
                  onClick={handleBulkEditChecks}
                  className="gap-2 border-blue-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                  title="Edit payment methods and check numbers for payments in this week"
                  disabled={filteredPayments.filter(p => (p.status === "pending" || p.status === "paid")).length === 0}
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Week Payments
                </Button>
              </div>

              {/*
              <div className="flex gap-2 ml-auto">
                <Button
                  onClick={() => setIsBulkDaysOpen(true)}
                  className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                  disabled={filteredPayments.filter(p => p.status === "pending").length === 0}
                  title="Set days worked for pending payments in this week"
                >
                  Bulk Set Days
                </Button>
                <Button
                  onClick={handleRevertBulkDays}
                  className="gap-2 bg-amber-600 hover:bg-amber-700"
                  disabled={!lastBulkOperation}
                  title="Undo the last bulk set days operation"
                >
                  Revert Bulk Days
                </Button>
                <Button
                  onClick={handleMarkAllAsPaid}
                  className={`gap-2 ${
                    isAllMarkedAsPaid
                      ? 'bg-orange-600 hover:bg-orange-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  disabled={filteredPayments.filter(p => p.status === "pending").length === 0 && !isAllMarkedAsPaid}
                >
                  {isAllMarkedAsPaid ? "Revert All to Pending" : "Mark All Pending as Paid"}
                </Button>
                <Button
                  onClick={() => setIsBatchCheckModalOpen(true)}
                  className="gap-2 bg-teal-600 hover:bg-teal-700"
                  disabled={filteredPayments.filter(p => p.status === "paid" && p.payment_method === "check").length === 0}
                  title="Generate and export multiple checks as batch PDF"
                >
                  <Download className="w-4 h-4" />
                  Batch Print Checks
                </Button>
                <Button
                  onClick={generateWeeklyReportPDF}
                  className="gap-2 bg-slate-600 hover:bg-slate-700"
                  title="Print all visible payments as a weekly report"
                >
                  <Printer className="w-4 h-4" />
                  Print Weekly Report
                </Button>
              </div>
              */}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Employee</th>
                  {/* <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Description</th> */}
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Week</th>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Amount</th>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Due Date</th>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Payment Method</th>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Status</th>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-3 text-center text-slate-500">
                      No payments found for the week of {new Date(selectedWeek).toLocaleDateString()}.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment, idx) => (
                    <tr key={payment.id} className="bg-white hover:bg-slate-50">
                      <td className="p-3 text-slate-700 font-medium whitespace-nowrap">
                        <p className="font-semibold">{payment.employee_id} - {payment.employee_name}</p>
                        {(payment.is_severance || payment.severance_date) && (
                          <div className="mt-1">
                            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                              Severance Payment
                            </Badge>
                          </div>
                        )}
                      </td>
                      {/*
                      <td className="p-3 text-slate-700 text-xs whitespace-nowrap">
                         {(() => {
                           if (payment.is_severance || (payment.notes && payment.notes.toLowerCase().includes("severance"))) {
                             return (
                               <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
                                 {payment.notes || "Severance Payment"}
                               </Badge>
                             );
                           }
                           return <span className="text-slate-600">{payment.notes || "Weekly Salary"}</span>;
                         })()}
                      </td>
                      */}
                      <td className="p-3 text-slate-700 text-xs whitespace-nowrap">
                        <span>{new Date(payment.week_start_date).toLocaleDateString()} to {new Date(payment.week_end_date).toLocaleDateString()}</span>
                        {payment.days_worked !== 5 && (
                          <span className="text-yellow-700 font-semibold ml-2">({payment.days_worked}/5 days)</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        <div className="space-y-1">
                          {payment.is_adjusted_for_absence ? (
                            <div className="bg-orange-50 p-2 rounded border border-orange-200 text-xs space-y-1">
                              <div className="flex justify-between text-orange-900">
                                <span>Full Salary:</span>
                                <span className="line-through whitespace-nowrap">${(payment.full_weekly_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-red-700 font-semibold">
                                <span>Deduction:</span>
                                <span className="whitespace-nowrap">-${(payment.deduction_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-green-700 font-bold border-t border-orange-200 pt-1">
                                <span>Pay:</span>
                                <span className="whitespace-nowrap">${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="font-semibold text-slate-900 whitespace-nowrap">
                              ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                          {payment.down_payment && payment.down_payment > 0 && (
                            <div className="bg-cyan-50 p-2 rounded border border-cyan-200 text-xs space-y-1">
                              <div className="flex justify-between text-cyan-900">
                                <span>Down Payment:</span>
                                <span className="whitespace-nowrap">-${(payment.down_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-cyan-700 font-semibold border-t border-cyan-200 pt-1">
                                <span>Net Payment:</span>
                                <span className="whitespace-nowrap">${((payment.amount || 0) - (payment.down_payment || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isOverdue(payment.due_date) && payment.status === "pending" && (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                          {formatDateString(payment.due_date)}
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        {payment.status === "paid" && payment.payment_method === "check" ? (
                          <button
                            onClick={() => handleEditAmount(payment.id)}
                            className="px-3 py-1.5 rounded-full inline-block text-sm font-medium whitespace-nowrap bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors cursor-pointer"
                            title="Click to edit payment details"
                          >
                            <span>{getPaymentMethodDisplay(payment.payment_method, payment)}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEditAmount(payment.id)}
                            className={`px-3 py-1.5 rounded-full inline-block text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                              payment.payment_method === 'direct_deposit' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                              payment.payment_method === 'check' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                              payment.payment_method === 'cash' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                              payment.payment_method === 'ach' ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' :
                              payment.payment_method === 'wire' ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' :
                              'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                            title="Click to edit payment details"
                          >
                            <span>{getPaymentMethodDisplay(payment.payment_method, payment)}</span>
                          </button>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {payment.status === "paid" ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-medium text-green-700">Paid {new Date(payment.paid_date!).toLocaleDateString()}</span>
                            </>
                          ) : payment.status === "canceled" ? (
                            <>
                              <AlertCircle className="w-4 h-4 text-red-600" />
                              <span className="text-xs font-medium text-red-700">Canceled</span>
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-orange-600" />
                              <span className="text-xs font-medium text-orange-700">Pending</span>
                            </>
                          )}
                        </div>
                        {payment.status === "paid" && payment.deduction_amount && payment.deduction_amount > 0 && (
                          <div className="bg-red-50 p-2 rounded border border-red-200 text-xs mt-2">
                            <div className="text-red-700 font-medium">
                              Deduction: ${(payment.deduction_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-green-700 font-bold mt-1">
                              Paid Amount: ${((payment.amount || 0) - (payment.deduction_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-4 items-center flex-wrap">
                          <button
                            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                            onClick={() => handlePrintCheck(payment.id)}
                            title="Print check"
                          >
                            <Printer className="w-4 h-4" />
                            <span>Check</span>
                          </button>
                          
                          <button
                            className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-800"
                            onClick={() => handleAttachCheck(payment.id)}
                            title="Attach check image"
                          >
                            <Paperclip className="w-4 h-4" />
                            <span>Attach</span>
                          </button>

                          <button
                            className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-800"
                            onClick={() => handleEditAmount(payment.id)}
                            title="Edit payment amount"
                          >
                            <Edit2 className="w-4 h-4" />
                            <span>Edit</span>
                          </button>
                        </div>
                        <div className="flex gap-4 items-center mt-2 flex-wrap">
                          {payment.status === "pending" && (
                            <button
                                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
                                onClick={() => handleEditDays(payment.id)}
                                title="Edit days worked"
                              >
                                <Calendar className="w-4 h-4" />
                                <span>Days</span>
                              </button>
                          )}

                          {payment.status === "paid" && !(payment as any).is_correction && !(payment as any).reversed_by_payment_id && (
                            <button
                              className="flex items-center gap-1 text-sm text-orange-600 hover:text-orange-800"
                              onClick={() => handleReversePayment(payment.id)}
                              title="Create reversal entry for this payment"
                            >
                              <AlertCircle className="w-4 h-4" />
                              <span>Reverse</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {filteredPayments.length === 0 ? (
              <div className="text-center p-8 bg-white rounded-lg border border-slate-200">
                <p className="text-slate-500">No payments found</p>
              </div>
            ) : (
              filteredPayments.map((payment) => (
                <div key={payment.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-slate-900">{payment.employee_name}</p>
                      <p className="text-xs text-slate-500">{payment.employee_id}</p>
                      {(payment.is_severance || payment.severance_date) && (
                        <div className="mt-1">
                          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0 h-5 hover:bg-amber-100">
                            Severance
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       {payment.status === "paid" ? (
                          <div className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Paid
                          </div>
                        ) : payment.status === "canceled" ? (
                          <div className="flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                            <AlertCircle className="w-3 h-3" />
                            Canceled
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-xs font-medium text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">
                            <Clock className="w-3 h-3" />
                            Pending
                          </div>
                        )}
                        {isOverdue(payment.due_date) && payment.status === "pending" && (
                          <span className="text-[10px] text-red-600 font-medium flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        )}
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Amount</span>
                      <span className="font-bold text-slate-900 text-lg">
                        ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    {payment.is_adjusted_for_absence && (
                       <div className="bg-orange-50 p-2 rounded border border-orange-200 text-xs space-y-1">
                          <div className="flex justify-between text-orange-900">
                            <span>Full Salary:</span>
                            <span className="line-through">${(payment.full_weekly_salary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                           <div className="flex justify-between text-red-700 font-semibold">
                            <span>Deduction:</span>
                            <span>-${(payment.deduction_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                       </div>
                    )}

                    {payment.down_payment && payment.down_payment > 0 && (
                        <div className="bg-cyan-50 p-2 rounded border border-cyan-200 text-xs space-y-1">
                          <div className="flex justify-between text-cyan-900">
                            <span>Down Payment:</span>
                            <span>-${(payment.down_payment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-cyan-700 font-semibold border-t border-cyan-200 pt-1">
                            <span>Net:</span>
                            <span>${((payment.amount || 0) - (payment.down_payment || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="block text-slate-400">Week</span>
                        <span>{new Date(payment.week_start_date).toLocaleDateString()}</span>
                      </div>
                      <div>
                         <span className="block text-slate-400">Due Date</span>
                         <span>{new Date(payment.due_date).toLocaleDateString()}</span>
                      </div>
                      <div>
                         <span className="block text-slate-400">Days</span>
                         <span>{payment.days_worked}/5</span>
                      </div>
                      <div>
                         <span className="block text-slate-400">Method</span>
                         <button 
                           onClick={() => handleEditAmount(payment.id)}
                           className="text-blue-600 hover:text-blue-800 underline cursor-pointer text-left"
                           title="Click to edit payment details"
                         >
                           {getPaymentMethodDisplay(payment.payment_method, payment)}
                         </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-3 flex justify-between gap-2 border-t border-slate-100 overflow-x-auto">
                    <button
                        className="p-2 text-slate-600 hover:bg-slate-200 rounded-full"
                        onClick={() => handlePrintCheck(payment.id)}
                        title="Print Check"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-slate-600 hover:bg-slate-200 rounded-full"
                        onClick={() => handleAttachCheck(payment.id)}
                        title="Attach"
                      >
                        <Paperclip className="w-4 h-4" />
                      </button>
                       <button
                        className="p-2 text-slate-600 hover:bg-slate-200 rounded-full"
                        onClick={() => handleEditAmount(payment.id)}
                        title="Edit Amount"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {payment.status === "pending" && (
                         <button
                            className="p-2 text-slate-600 hover:bg-slate-200 rounded-full"
                            onClick={() => handleEditDays(payment.id)}
                            title="Edit Days"
                          >
                            <Calendar className="w-4 h-4" />
                          </button>
                      )}
                      
                      {/* Mark as paid button embedded for quick action if pending */}
                      {payment.status === "pending" && (
                        <Button 
                          className="h-8 text-xs bg-green-600 hover:bg-green-700 px-3"
                          onClick={() => handleMarkAsPaid(payment.id)}
                        >
                          Pay
                        </Button>
                      )}
                      
                      {payment.status === "paid" && !(payment as any).is_correction && !(payment as any).reversed_by_payment_id && (
                        <button
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-full ml-auto"
                          onClick={() => handleReversePayment(payment.id)}
                          title="Reverse Payment"
                        >
                          <AlertCircle className="w-4 h-4" />
                        </button>
                      )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {isPaymentModalOpen && selectedPaymentId && (() => {
        const selectedPayment = payments.find(p => p.id === selectedPaymentId);
        const finalAmount = selectedPayment ? selectedPayment.amount - paidDeduction : 0;

        return (
          <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Mark Payment as Paid</DialogTitle>
                <DialogDescription>
                  Confirm the payment details
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {selectedPayment && (
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Employee:</span> {selectedPayment.employee_name}
                    </p>
                    <p className="text-sm text-slate-600 mt-1 whitespace-nowrap">
                      <span className="font-medium">Original Amount:</span> ${(selectedPayment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">Payment Method:</span> {getPaymentMethodDisplay(selectedPayment.payment_method)}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="paid_date">Payment Date *</Label>
                  <Input
                    id="paid_date"
                    type="date"
                    value={paid_date}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_method">Payment Method *</Label>
                  <Select value={selectedPaymentMethod} onValueChange={handlePaymentMethodChange}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                      <SelectItem value="debit_card">Debit Card</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {selectedPaymentMethod === "check" && (
                  <div className="space-y-2">
                    <Label htmlFor="check_number">Check Number</Label>
                    <Input
                      id="check_number"
                      type="text"
                      value={check_number}
                      onChange={(e) => setPaidCheckNumber(e.target.value)}
                      placeholder="e.g., 1001"
                      className="border-slate-300 font-semibold text-blue-600"
                    />
                    <p className="text-xs text-green-600 font-medium">✓ Next sequential check number auto-assigned</p>
                  </div>
                )}

                {selectedPaymentMethod && (selectedPaymentMethod === "direct_deposit" || selectedPaymentMethod === "bank_transfer" || selectedPaymentMethod === "wire_transfer") && (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Bank Transfer Details</p>
                    <div className="space-y-2">
                      <Label htmlFor="bank_name">Bank Name</Label>
                      <Input
                        id="bank_name"
                        type="text"
                        value={bank_name}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g., Wells Fargo, Chase Bank"
                        className="border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="routing_number">Routing Number</Label>
                      <Input
                        id="routing_number"
                        type="text"
                        value={routing_number}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                        placeholder="9-digit routing number"
                        className="border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="account_number">Account Number</Label>
                      <Input
                        id="account_number"
                        type="password"
                        value={account_number}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="Account number (masked for security)"
                        className="border-slate-300"
                      />
                    </div>
                  </div>
                )}
                {selectedPaymentMethod && (selectedPaymentMethod === "debit_card" || selectedPaymentMethod === "credit_card") && (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Card Details</p>
                    <div className="space-y-2">
                      <Label htmlFor="cardLastFour">Card Last 4 Digits</Label>
                      <Input
                        id="cardLastFour"
                        type="text"
                        maxLength={4}
                        value={check_number}
                        onChange={(e) => setPaidCheckNumber(e.target.value.replace(/\D/g, ""))}
                        placeholder="e.g., 4242"
                        className="border-slate-300"
                      />
                      <p className="text-xs text-slate-500">Last 4 digits of the card used</p>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="paidDeduction">Deduction Amount ($)</Label>
                  <Input
                    id="paidDeduction"
                    type="number"
                    step="0.01"
                    value={paidDeduction}
                    onChange={(e) => setPaidDeduction(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="border-slate-300"
                  />
                  <p className="text-xs text-slate-500">For example, if there's a deduction or adjustment to the payment</p>
                </div>
                {selectedPayment && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-sm font-medium text-blue-900 whitespace-nowrap">
                      Final Amount to Pay: ${(finalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedPaymentId(null);
                    setPaidDate("");
                    setPaidDeduction(0);
                    setPaidCheckNumber("");
                    setBankName("");
                    setRoutingNumber("");
                    setAccountNumber("");
                    setSelectedPaymentMethod("");
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPayment}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Confirm Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {isEditAmountOpen && editingPaymentId && (() => {
        const payment = payments.find(p => p.id === editingPaymentId);

        return (
          <Dialog open={isEditAmountOpen} onOpenChange={setIsEditAmountOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Payment Details</DialogTitle>
                <DialogDescription>
                  {payment && `Edit payment details for ${payment.employee_name}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {payment && (
                  <>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Employee:</span> {payment.employee_name}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Week:</span> {new Date(payment.week_start_date).toLocaleDateString()} - {new Date(payment.week_end_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Days Worked:</span> {payment.days_worked}/5
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="editAmount">Payment Amount ($)</Label>
                      <Input
                        id="editAmount"
                        type="number"
                        step="0.01"
                        value={editingAmount}
                        onChange={(e) => setEditingAmount(parseFloat(e.target.value) || 0)}
                        className="border-slate-300"
                      />
                      <p className="text-xs text-slate-500 whitespace-nowrap">
                        Original amount: ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="editPaymentMethod">Payment Method</Label>
                      <Select value={editingPaymentMethod} onValueChange={setEditingPaymentMethod}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="ach">ACH Transfer</SelectItem>
                          <SelectItem value="wire">Wire Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {editingPaymentMethod === "check" && (
                      <div className="space-y-2">
                        <Label htmlFor="editCheckNumber">Check Number</Label>
                        <Input
                          id="editCheckNumber"
                          type="text"
                          value={editingCheckNumber}
                          onChange={(e) => setEditingCheckNumber(e.target.value)}
                          placeholder="e.g., 1001"
                          className="border-slate-300"
                        />
                        <p className="text-xs text-slate-500">
                          {payment.check_number ? `Original: #${payment.check_number}` : "No check number set"}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditAmountOpen(false);
                    setEditingPaymentId(null);
                    setEditingAmount(0);
                    setEditingCheckNumber("");
                    setEditingPaymentMethod("");
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAmountEdit}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Update Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {isEditDaysOpen && editingDaysPaymentId && (() => {
        const payment = payments.find(p => p.id === editingDaysPaymentId);
        if (!payment) return null;

        // Calculate weekly rate safely
        let weekly_rate = payment.full_weekly_salary || 0;
        if (!weekly_rate && payment.amount && payment.days_worked) {
          weekly_rate = (payment.amount / payment.days_worked) * 5;
        }
        if (!weekly_rate && payment.amount) {
          weekly_rate = payment.amount / 5 * 5;
        }

        const dailyRate = weekly_rate > 0 ? weekly_rate / 5 : 0;
        const newAmount = dailyRate * editingDaysWorked;

        return (
          <Dialog open={isEditDaysOpen} onOpenChange={setIsEditDaysOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Days Worked</DialogTitle>
                <DialogDescription>
                  {payment && `Adjust days worked for ${payment.employee_name}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {payment && (
                  <>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Employee:</span> {payment.employee_name}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Week:</span> {new Date(payment.week_start_date).toLocaleDateString()} - {new Date(payment.week_end_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Weekly Rate:</span> ${(weekly_rate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Daily Rate:</span> ${(dailyRate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editDaysWorked">Days Worked (1-7)</Label>
                      <Select value={editingDaysWorked.toString()} onValueChange={(value) => setEditingDaysWorked(parseInt(value, 10))}>
                        <SelectTrigger className="border-slate-300">
                          <SelectValue placeholder="Select days" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="2">2 days</SelectItem>
                          <SelectItem value="3">3 days</SelectItem>
                          <SelectItem value="4">4 days</SelectItem>
                          <SelectItem value="5">5 days (Full week)</SelectItem>
                          <SelectItem value="6">6 days</SelectItem>
                          <SelectItem value="7">7 days (Including weekends)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500 mt-2">
                        <span className="font-medium">Current amount:</span> ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-500">
                        <span className="font-medium">New amount:</span> ${(newAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDaysOpen(false);
                    setEditingDaysPaymentId(null);
                    setEditingDaysWorked(5);
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDaysEdit}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Update Days
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {isEditDownPaymentOpen && editingDownPaymentPaymentId && (() => {
        const payment = payments.find(p => p.id === editingDownPaymentPaymentId);
        if (!payment) return null;

        const netAmount = (payment.amount || 0) - editingDownPaymentAmount;

        return (
          <Dialog open={isEditDownPaymentOpen} onOpenChange={setIsEditDownPaymentOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Down Payment</DialogTitle>
                <DialogDescription>
                  {payment && `Adjust down payment for ${payment.employee_name}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {payment && (
                  <>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Employee:</span> {payment.employee_name}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Week:</span> {new Date(payment.week_start_date).toLocaleDateString()} - {new Date(payment.week_end_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Total Amount:</span> ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="editDownPayment">Down Payment Amount ($)</Label>
                      <Input
                        id="editDownPayment"
                        type="number"
                        step="0.01"
                        value={editingDownPaymentAmount}
                        onChange={(e) => setEditingDownPaymentAmount(parseFloat(e.target.value) || 0)}
                        className="border-slate-300"
                      />
                      <p className="text-xs text-slate-500 whitespace-nowrap">
                        Net payment after down payment: ${(netAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDownPaymentOpen(false);
                    setEditingDownPaymentPaymentId(null);
                    setEditingDownPaymentAmount(0);
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmDownPaymentEdit}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Update Down Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {isBulkDaysOpen && (() => {
        const pendingPaymentsList = filteredPayments.filter(p => p.status === "pending");

        return (
          <Dialog open={isBulkDaysOpen} onOpenChange={setIsBulkDaysOpen}>
            <DialogContent className="sm:max-w-md max-h-[70vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Bulk Set Days Worked</DialogTitle>
                <DialogDescription>
                  Set the same number of days worked for all pending payments
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm text-blue-900">
                    This will update <span className="font-semibold">{pendingPaymentsList.length}</span> pending payment{pendingPaymentsList.length !== 1 ? 's' : ''} for the current week to the selected number of days worked.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bulkDaysWorked">Days Worked (1-7)</Label>
                  <Select value={bulkDaysValue.toString()} onValueChange={(value) => setBulkDaysValue(parseInt(value, 10))}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue placeholder="Select days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="2">2 days</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="4">4 days</SelectItem>
                      <SelectItem value="5">5 days (Full week)</SelectItem>
                      <SelectItem value="6">6 days</SelectItem>
                      <SelectItem value="7">7 days (Including weekends)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-2">
                    Payment amounts will be automatically recalculated based on: (Weekly Rate ÷ 5) × Days Worked
                  </p>
                </div>

                {pendingPaymentsList.length > 0 && (
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                    <p className="text-sm font-medium text-slate-900">Pending payments for this week ({pendingPaymentsList.length}):</p>
                    <div className="max-h-96 overflow-y-auto space-y-1 border border-slate-300 rounded p-2 bg-white">
                      {pendingPaymentsList.map((payment) => {
                        // Calculate weekly rate safely
                        let weekly_rate = payment.full_weekly_salary || 0;
                        if (!weekly_rate && payment.amount && payment.days_worked) {
                          weekly_rate = (payment.amount / payment.days_worked) * 5;
                        }
                        if (!weekly_rate && payment.amount) {
                          weekly_rate = payment.amount / 5 * 5;
                        }

                        const dailyRate = weekly_rate > 0 ? weekly_rate / 5 : 0;
                        const newAmount = dailyRate * bulkDaysValue;
                        return (
                          <div key={payment.id} className="text-xs text-slate-700 flex justify-between items-center py-1 px-2 hover:bg-slate-100 rounded">
                            <span className="flex-1">{payment.employee_name}</span>
                            <span className="text-slate-500 text-xs mx-2">{new Date(payment.week_start_date).toLocaleDateString()}</span>
                            <span className="font-medium whitespace-nowrap">
                              ${(newAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBulkDaysOpen(false);
                    setBulkDaysValue(5);
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApplyBulkDays}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  Apply to All Pending
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      <Dialog open={isBatchMarkPaidModalOpen} onOpenChange={setIsBatchMarkPaidModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark All as Paid</DialogTitle>
            <DialogDescription>
              Marking {filteredPayments.filter(p => p.status === 'pending').length} pending payments as paid.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="batchPaidDate">Payment Date</Label>
              <Input
                type="date"
                id="batchPaidDate"
                value={batchPaidDate}
                onChange={(e) => setBatchPaidDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2 pt-2 border-t border-slate-100">
               <Label className="text-base font-medium">Check Details (Optional)</Label>
               <p className="text-xs text-slate-500">If using checks, enter the starting check number. Numbers will increment automatically.</p>
               
               <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="batchStartingCheckNumber">Starting Check #</Label>
                <Input
                  type="number"
                  id="batchStartingCheckNumber"
                  placeholder="e.g. 1001"
                  value={batchStartingCheckNumber}
                  onChange={(e) => setBatchStartingCheckNumber(e.target.value)}
                />
               </div>
            </div>

            <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm border border-blue-100">
               Total to Pay: <strong>${filteredPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}</strong>
            </div>

          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBatchMarkPaidModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmBatchMarkPaid} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? "Processing..." : "Confirm & Pay All"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isCheckPrintModalOpen && selectedCheckPaymentId && (() => {
        const payment = payments.find((p) => p.id === selectedCheckPaymentId);
        // settings inherited from component state

        if (!payment) return null;

        const check_number = settings?.check_start_number ? settings.check_start_number + payments.filter((p) => new Date(p.week_start_date) <= new Date(payment.week_start_date)).length : 1001;

        return (
          <Dialog open={isCheckPrintModalOpen} onOpenChange={setIsCheckPrintModalOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Print Check</DialogTitle>
                <DialogDescription>
                  Check for {payment.employee_name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Professional Check Template */}
                <div className="p-8 bg-white border-4 border-slate-800 rounded-lg" style={{ width: '100%', minHeight: '450px', fontFamily: '"Courier New", monospace', backgroundColor: '#fafafa', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {/* Bank routing box (top right) */}
                  <div style={{ float: 'right', textAlign: 'right', marginBottom: '10px', fontSize: '10px', color: '#666' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{check_number.toString().padStart(4, '0')}</div>
                    <div style={{ fontSize: '9px' }}>Check #</div>
                  </div>

                  {/* Company Header */}
                  <div style={{ marginBottom: '15px', borderBottom: '3px solid #1f2937', paddingBottom: '10px' }}>
                    {settings?.company_name && (
                      <>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937' }}>{settings.company_name}</div>
                        <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>{settings.company_address}</div>
                        <div style={{ fontSize: '11px', color: '#4b5563' }}>{settings.company_phone}</div>
                      </>
                    )}
                  </div>

                  {/* Date and Check Number */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
                    <div>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase' }}>Date</div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '3px' }}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' })}</div>
                    </div>
                  </div>

                  {/* Pay To the Order Of */}
                  <div style={{ marginBottom: '15px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Pay to the Order of</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '3px solid #000', paddingBottom: '6px', minHeight: '30px', color: '#1f2937' }}>
                      {payment.employee_name}
                    </div>
                  </div>

                  {/* Amount Section */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Amount in Words</div>
                      <div style={{ fontSize: '14px', borderBottom: '3px solid #000', minWidth: '350px', paddingBottom: '6px', color: '#1f2937' }}>
                        {convertNumberToWords(payment.amount)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginLeft: '20px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>Amount</div>
                      <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1f2937' }}>
                        ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* For/Memo */}
                  <div style={{ marginBottom: '30px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>For/Memo</div>
                    <div style={{ fontSize: '13px', borderBottom: '2px solid #000', paddingBottom: '4px', minHeight: '20px', color: '#1f2937' }}>
                      {payment.is_severance ? 'Severance Payment' : `Week of ${new Date(payment.week_start_date).toLocaleDateString()}`}
                    </div>
                  </div>

                  {/* Signature Line */}
                  <div style={{ marginTop: '45px', textAlign: 'right', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '9px', color: '#666', marginBottom: '2px' }}>Authorized by:</div>
                      <div style={{ borderTop: '2px solid #000', width: '120px', paddingTop: '2px', fontSize: '10px' }}></div>
                    </div>
                    <div>
                      <div style={{ fontSize: '9px', color: '#666', marginBottom: '2px' }}>Authorized Signature:</div>
                      <div style={{ borderTop: '2px solid #000', width: '150px', paddingTop: '2px', fontSize: '10px' }}></div>
                    </div>
                  </div>

                  {/* MICR Line (magnetic encoding) */}
                  <div style={{ marginTop: '20px', fontSize: '18px', letterSpacing: '4px', fontFamily: '"MICR Encoding", "Courier New", monospace', textAlign: 'center', color: '#333', fontWeight: 'bold' }}>
                    |{settings?.routing_number?.padEnd(9, '0') || '000000000'}|{payment.employee_id.padEnd(12, ' ')}|{check_number.toString().padStart(8, '0')}|
                  </div>

                  {/* Bank Info Footer */}
                  {settings && (
                    <div style={{ marginTop: '15px', fontSize: '9px', color: '#666', textAlign: 'center', borderTop: '2px dashed #ccc', paddingTop: '8px' }}>
                      <div>{settings.bank_name} • Routing #: {settings.routing_number} • Account: ••••{settings.account_number?.slice(-4)}</div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsCheckPrintModalOpen(false);
                      setSelectedCheckPaymentId(null);
                    }}
                    className="border-slate-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => generateCheckPDF(payment, check_number, settings)}
                    className="bg-green-600 hover:bg-green-700 gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export as PDF
                  </Button>
                  <Button
                    onClick={() => window.print()}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Print Check
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {isDeleteConfirmOpen && selectedReversalPaymentId && (() => {
        const paymentToReverse = payments.find(p => p.id === selectedReversalPaymentId);

        return (
          <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>🔄 Reverse Payment</DialogTitle>
                <DialogDescription>
                  Create a corrective reversal entry for this payment
                </DialogDescription>
              </DialogHeader>
              {paymentToReverse && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Employee:</span> {paymentToReverse.employee_name}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Week:</span> {new Date(paymentToReverse.week_start_date).toLocaleDateString()} to {new Date(paymentToReverse.week_end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Amount:</span> ${(paymentToReverse.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Status:</span> {paymentToReverse.status === "paid" ? "Paid" : paymentToReverse.status === "canceled" ? "Canceled" : "Pending"}
                  </p>
                </div>
              )}
              <div className="bg-blue-50 p-3 rounded border border-blue-200 space-y-3">
                <p className="text-sm text-blue-700 font-medium">
                  Why are you reversing this payment?
                </p>
                <div>
                  <label className="text-xs text-slate-600 block mb-1">Select Reason:</label>
                  <Select
                    value={reversalReason || "custom"}
                    onValueChange={(value) => {
                      if (value === "custom") {
                        setReversalReason("");
                        setCustomReversalReason("");
                      } else {
                        setReversalReason(value);
                        setCustomReversalReason("");
                      }
                    }}
                  >
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue placeholder="Choose a reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REVERSAL_REASON_TEMPLATES.map((template) => (
                        <SelectItem 
                          key={template} 
                          value={template === "Custom reason..." ? "custom" : template}
                        >
                          {template}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {reversalReason === "" && (
                  <div>
                    <label className="text-xs text-slate-600 block mb-1">Custom Reason:</label>
                    <textarea
                      className="w-full p-2 border border-blue-300 rounded text-sm"
                      rows={3}
                      placeholder="Enter a custom reason for this reversal..."
                      value={customReversalReason}
                      onChange={(e) => setCustomReversalReason(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>
              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <p className="text-sm text-amber-800">
                  ℹ️ This creates a corrective entry. The original transaction remains in the ledger for audit purposes.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setSelectedReversalPaymentId(null);
                    setReversalReason("");
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmReversePayment}
                  className="bg-orange-600 hover:bg-orange-700"
                  disabled={!reversalReason.trim()}
                >
                  Create Reversal
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Bulk Check Edit Dialog */}
      <Dialog open={isBulkCheckEditOpen} onOpenChange={setIsBulkCheckEditOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              Edit Week Payments
            </DialogTitle>
            <DialogDescription>
              Update amounts, payment methods, and check numbers for payments in this week
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Auto-assign section */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-blue-900">Auto-assign Check Numbers</h4>
                <Checkbox 
                  checked={bulkCheckAutoAssign} 
                  onCheckedChange={(checked) => setBulkCheckAutoAssign(checked === true)}
                />
              </div>
              
              {bulkCheckAutoAssign && (
                <div className="flex items-center gap-3">
                  <Label htmlFor="startingNumber" className="text-sm font-medium">Starting Number:</Label>
                  <Input
                    id="startingNumber"
                    type="number"
                    value={bulkCheckStartNumber}
                    onChange={(e) => setBulkCheckStartNumber(e.target.value)}
                    className="w-32"
                    placeholder="1001"
                  />
                  <Button
                    onClick={handleAutoAssignCheckNumbers}
                    variant="outline"
                    size="sm"
                    className="text-blue-700 border-blue-300"
                  >
                    Auto-assign Check Numbers
                  </Button>
                </div>
              )}
            </div>

            {/* Individual payment method and check number assignments */}
            <div className="space-y-3">
              <h4 className="font-semibold text-slate-900">Payment Details</h4>
              <div className="grid gap-3">
                {bulkCheckPayments.map((payment) => (
                  <div key={payment.id} className="p-3 bg-slate-50 rounded-lg border space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{payment.employee_name}</p>
                        <p className="text-sm text-slate-600">
                          Week {new Date(payment.week_start_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`amount-${payment.id}`} className="text-sm">Amount ($)</Label>
                        <Input
                          id={`amount-${payment.id}`}
                          type="number"
                          step="0.01"
                          value={bulkAmounts[payment.id] !== undefined ? bulkAmounts[payment.id] : payment.amount || 0}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value);
                            setBulkAmounts(prev => ({
                              ...prev,
                              [payment.id]: isNaN(value) ? 0 : value
                            }));
                          }}
                          className="w-full"
                          placeholder="0.00"
                        />
                        <p className="text-xs text-slate-500">Use negative amounts for reversals</p>
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`method-${payment.id}`} className="text-sm">Payment Method</Label>
                        <Select 
                          value={bulkPaymentMethods[payment.id] || payment.payment_method || "cash"}
                          onValueChange={(value) => setBulkPaymentMethods(prev => ({
                            ...prev,
                            [payment.id]: value
                          }))}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="debit_card">Debit Card</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {(bulkPaymentMethods[payment.id] === "check" || (!bulkPaymentMethods[payment.id] && payment.payment_method === "check")) && (
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor={`check-${payment.id}`} className="text-sm">Check Number</Label>
                          <Input
                            id={`check-${payment.id}`}
                            type="text"
                            value={bulkCheckNumbers[payment.id] || ""}
                            onChange={(e) => setBulkCheckNumbers(prev => ({
                              ...prev,
                              [payment.id]: e.target.value
                            }))}
                            className="w-full"
                            placeholder="1001"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsBulkCheckEditOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBulkCheckEdit}
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update Payments"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Reverse Week Dialog */}
      <Dialog open={isBulkReverseOpen} onOpenChange={setIsBulkReverseOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Reverse Entire Week's Payments
            </DialogTitle>
            <DialogDescription>
              Provide individual reversal reasons for each payment
            </DialogDescription>
          </DialogHeader>
          
          {/* Progress indicator shown while reversing */}
          {bulkReverseProgress && (
            <div className="px-4">
              <div className="text-sm font-medium text-slate-700 mb-2">Reversal Progress</div>
              <div className="w-full bg-slate-200 rounded h-2 overflow-hidden">
                <div
                  className="h-2 bg-orange-500"
                  style={{ width: `${Math.round((bulkReverseProgress.processed / Math.max(1, bulkReverseProgress.total)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-600 mt-2">
                <div>Processed: {bulkReverseProgress.processed}/{bulkReverseProgress.total}</div>
                <div>Success: {bulkReverseProgress.success} • Failed: {bulkReverseProgress.failed}</div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-slate-900">
                  Selected: {selectedReversalPayments.size} of {bulkReversalPayments.length}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (selectedReversalPayments.size === bulkReversalPayments.length) {
                      setSelectedReversalPayments(new Set());
                    } else {
                      setSelectedReversalPayments(new Set(bulkReversalPayments.map(p => p.id)));
                    }
                  }}
                  className="text-xs"
                >
                  {selectedReversalPayments.size === bulkReversalPayments.length ? "Deselect All" : "Select All"}
                </Button>
              </div>
              <p className="text-sm text-slate-600">
                Total Selected: ${bulkReversalPayments.filter(p => selectedReversalPayments.has(p.id)).reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>

            <div className="space-y-4">
              {bulkReversalPayments.map((payment, index) => (
                <div key={payment.id} className={`bg-white p-4 rounded-lg border-2 transition-colors ${
                  selectedReversalPayments.has(payment.id) 
                    ? 'border-orange-300 bg-orange-50/30' 
                    : 'border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-3 flex-1">
                      <input
                        type="checkbox"
                        checked={selectedReversalPayments.has(payment.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedReversalPayments);
                          if (e.target.checked) {
                            newSet.add(payment.id);
                          } else {
                            newSet.delete(payment.id);
                          }
                          setSelectedReversalPayments(newSet);
                        }}
                        className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-semibold">
                            #{index + 1}
                          </span>
                          <p className="font-semibold text-slate-900">{payment.employee_name}</p>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{payment.employee_position || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-slate-500 capitalize">
                        {payment.payment_method?.replace(/_/g, ' ') || 'N/A'}
                        {payment.check_number && ` #${payment.check_number}`}
                      </p>
                    </div>
                  </div>

                  {selectedReversalPayments.has(payment.id) && (
                    <div className="space-y-2">
                      <label className="text-xs text-slate-700 font-medium block">Reversal Reason:</label>
                      <Select
                        value={bulkReversalReasons[payment.id] || "custom"}
                        onValueChange={(value) => {
                        if (value === "custom") {
                          setBulkReversalReasons(prev => ({ ...prev, [payment.id]: "" }));
                          setBulkCustomReasons(prev => ({ ...prev, [payment.id]: "" }));
                        } else {
                          setBulkReversalReasons(prev => ({ ...prev, [payment.id]: value }));
                          setBulkCustomReasons(prev => ({ ...prev, [payment.id]: "" }));
                        }
                      }}
                    >
                      <SelectTrigger className="w-full bg-white">
                        <SelectValue placeholder="Choose a reason..." />
                      </SelectTrigger>
                      <SelectContent>
                        {REVERSAL_REASON_TEMPLATES.map((template) => (
                          <SelectItem 
                            key={template} 
                            value={template === "Custom reason..." ? "custom" : template}
                          >
                            {template}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {bulkReversalReasons[payment.id] === "" && (
                      <textarea
                        className="w-full p-2 border border-slate-300 rounded text-sm"
                        rows={2}
                        placeholder="Enter a custom reason..."
                        value={bulkCustomReasons[payment.id] || ""}
                        onChange={(e) => setBulkCustomReasons(prev => ({ ...prev, [payment.id]: e.target.value }))}
                      />
                    )}
                  </div>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-amber-50 p-3 rounded border border-amber-200">
              <p className="text-sm text-amber-800 font-medium mb-2">
                ⚠️ Important
              </p>
              <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                <li>Each selected payment must have an individual reversal reason</li>
                <li>All original transactions remain in the ledger for audit purposes</li>
                <li>This action cannot be undone</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsBulkReverseOpen(false);
                setBulkReversalPayments([]);
                setSelectedReversalPayments(new Set());
                setBulkReversalReasons({});
                setBulkCustomReasons({});
              }}
              disabled={isSubmitting}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmBulkReverse}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={isSubmitting || selectedReversalPayments.size === 0}
            >
              {isSubmitting ? "Processing..." : `Reverse ${selectedReversalPayments.size} Payment${selectedReversalPayments.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isCheckAttachmentModalOpen && selectedPaymentForAttachment && (() => {
        const payment = payments.find(p => p.id === selectedPaymentForAttachment);
        return (
          <Dialog open={isCheckAttachmentModalOpen} onOpenChange={setIsCheckAttachmentModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Attach Check</DialogTitle>
                <DialogDescription>
                  {payment && `Upload check image for ${payment.employee_name}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {payment && (
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Employee:</span> {payment.employee_name}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">Amount:</span> ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">Week:</span> {new Date(payment.week_start_date).toLocaleDateString()} - {new Date(payment.week_end_date).toLocaleDateString()}
                    </p>
                    {payment.attachments && payment.attachments.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-sm font-medium text-slate-900 mb-2">Current Attachments:</p>
                        <div className="space-y-2">
                          {payment.attachments.map((att) => (
                            <div key={att.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-900 truncate">{att.filename}</p>
                                <p className="text-xs text-slate-500">{(att.fileSize / 1024).toFixed(2)} KB • {att.uploadDate}</p>
                              </div>
                              <div className="flex gap-1 ml-2">
                                <button
                                  onClick={() => handleViewCheckAttachment(att)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="View"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handlePrintCheckAttachment(att)}
                                  className="text-purple-600 hover:text-purple-800 p-1"
                                  title="Print"
                                >
                                  <Printer className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDownloadCheckAttachment(att)}
                                  className="text-green-600 hover:text-green-800 p-1"
                                  title="Download"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleRemoveCheckAttachment(payment.id, att.id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Remove"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="check-file">Upload Check Image (PDF, JPG, PNG - Max 5MB)</Label>
                  <input
                    id="check-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                    onChange={handleCheckFileUpload}
                    className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCheckAttachmentModalOpen(false);
                    setSelectedPaymentForAttachment(null);
                  }}
                  className="border-slate-300"
                >
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {isViewCheckAttachmentOpen && selectedCheckAttachment && (
        <Dialog open={isViewCheckAttachmentOpen} onOpenChange={setIsViewCheckAttachmentOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>View Check Attachment</DialogTitle>
              <DialogDescription>{selectedCheckAttachment.filename}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedCheckAttachment.fileType.startsWith("image/") ? (
                <div className="w-full bg-slate-50 rounded border border-slate-200">
                  <img
                    src={selectedCheckAttachment.data}
                    alt={selectedCheckAttachment.filename}
                    className="w-full h-auto"
                  />
                </div>
              ) : (
                <div className="bg-slate-50 p-8 rounded border border-slate-200 text-center">
                  <Paperclip className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 mb-3">{selectedCheckAttachment.filename}</p>
                  <p className="text-sm text-slate-500">File type: {selectedCheckAttachment.fileType}</p>
                  <p className="text-sm text-slate-500">Size: {(selectedCheckAttachment.fileSize / 1024).toFixed(2)} KB</p>
                  <Button
                    onClick={() => handleDownloadCheckAttachment(selectedCheckAttachment)}
                    className="gap-2 bg-teal-600 hover:bg-teal-700 mt-4"
                  >
                    <Download className="w-4 h-4" />
                    Download File
                  </Button>
                </div>
              )}
              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm text-slate-600">
                <p><span className="font-medium">Uploaded:</span> {selectedCheckAttachment.uploadDate}</p>
                <p><span className="font-medium">Size:</span> {(selectedCheckAttachment.fileSize / 1024).toFixed(2)} KB</p>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsViewCheckAttachmentOpen(false)}
                className="border-slate-300"
              >
                Close
              </Button>
              <Button
                onClick={() => handlePrintCheckAttachment(selectedCheckAttachment)}
                className="gap-2 bg-purple-600 hover:bg-purple-700"
              >
                <Printer className="w-4 h-4" />
                Print
              </Button>
              <Button
                onClick={() => handleDownloadCheckAttachment(selectedCheckAttachment)}
                className="gap-2 bg-teal-600 hover:bg-teal-700"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isCheckDetailsModalOpen && checkDetailsPaymentId && (() => {
        const payment = payments.find(p => p.id === checkDetailsPaymentId);

        return (
          <Dialog open={isCheckDetailsModalOpen} onOpenChange={setIsCheckDetailsModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Check Details</DialogTitle>
                <DialogDescription>
                  {payment && `Update check information for ${payment.employee_name}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {payment && (
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Employee:</span> {payment.employee_name}
                    </p>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Amount:</span> ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Week:</span> {new Date(payment.week_start_date).toLocaleDateString()} - {new Date(payment.week_end_date).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Paid Date:</span> {payment.paid_date ? new Date(payment.paid_date).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="checkDetailsNumber">Check Number</Label>
                  <Input
                    id="checkDetailsNumber"
                    type="text"
                    value={checkDetailsNumber}
                    onChange={(e) => setCheckDetailsNumber(e.target.value)}
                    placeholder="e.g., 1001"
                    className="border-slate-300"
                  />
                  <p className="text-xs text-slate-500">The check number used for this payment</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkDetailsBankName">Bank Name</Label>
                  <Input
                    id="checkDetailsBankName"
                    type="text"
                    value={checkDetailsBankName}
                    onChange={(e) => setCheckDetailsBankName(e.target.value)}
                    placeholder="e.g., Wells Fargo, Chase Bank"
                    className="border-slate-300"
                  />
                  <p className="text-xs text-slate-500">Optional: Bank name for reference</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkDetailsAccountLast4">Account Last 4</Label>
                  <Input
                    id="checkDetailsAccountLast4"
                    type="text"
                    maxLength={4}
                    value={checkDetailsAccountLast4}
                    onChange={(e) => setCheckDetailsAccountLast4(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g., 5678"
                    className="border-slate-300"
                  />
                  <p className="text-xs text-slate-500">Last 4 digits of account number</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCheckDetailsModalOpen(false);
                    setCheckDetailsPaymentId(null);
                    setCheckDetailsNumber("");
                    setCheckDetailsBankName("");
                    setCheckDetailsAccountLast4("");
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmCheckDetailsEdit}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Save Check Details
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Batch Print Checks Modal */}
      <Dialog open={isBatchCheckModalOpen} onOpenChange={setIsBatchCheckModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Print Checks</DialogTitle>
            <DialogDescription>
              Select checks to generate as a batch PDF
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {filteredPayments.filter(p => p.status === "paid" && p.payment_method === "check").length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-2">No paid check payments available</p>
                <p className="text-sm text-slate-500">Mark payments as paid with "Check" method to generate them</p>
              </div>
            ) : (
              <>
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">{selectedChecksForBatch.size}</span> check(s) selected
                  </p>
                </div>

                <div className="space-y-2 border rounded p-3 max-h-96 overflow-y-auto">
                  {filteredPayments
                    .filter(p => p.status === "paid" && p.payment_method === "check")
                    .map((payment) => (
                      <label key={payment.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedChecksForBatch.has(payment.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedChecksForBatch);
                            if (e.target.checked) {
                              newSelected.add(payment.id);
                            } else {
                              newSelected.delete(payment.id);
                            }
                            setSelectedChecksForBatch(newSelected);
                          }}
                          className="w-4 h-4 rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{payment.employee_name}</p>
                          <p className="text-sm text-slate-600">
                            Check #{payment.check_number} • {new Date(payment.week_start_date).toLocaleDateString()} • ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </label>
                    ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      const allCheckIds = new Set(
                        filteredPayments
                          .filter(p => p.status === "paid" && p.payment_method === "check")
                          .map(p => p.id)
                      );
                      setSelectedChecksForBatch(allCheckIds);
                    }}
                    variant="outline"
                    className="text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    onClick={() => setSelectedChecksForBatch(new Set())}
                    variant="outline"
                    className="text-xs"
                  >
                    Clear All
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setIsBatchCheckModalOpen(false)}
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                const checksToGen = filteredPayments.filter(p => selectedChecksForBatch.has(p.id));
                generateBatchChecksPDF(checksToGen);
              }}
              className="bg-teal-600 hover:bg-teal-700 gap-2"
              disabled={selectedChecksForBatch.size === 0}
            >
              <Download className="w-4 h-4" />
              Generate PDF ({selectedChecksForBatch.size})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* REMOVED: Clear All Confirmation Dialog - payments are immutable */}

      {/* Add Payment Modal */}
      <Dialog open={isAddPaymentModalOpen} onOpenChange={setIsAddPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Add a payment for an employee (severance, extra hours, bonus, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="addPaymentEmployee">Employee *</Label>
              <Select value={addPaymentEmployeeId} onValueChange={setAddPaymentEmployeeId}>
                <SelectTrigger id="addPaymentEmployee" className="border-slate-300">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem 
                      key={emp.id} 
                      value={emp.id} 
                      className={emp.payment_status === 'laid_off' ? 'text-slate-400 italic' : ''}
                      disabled={emp.payment_status === 'laid_off'}
                    >
                      {emp.name} ({emp.id}){emp.payment_status === 'laid_off' ? ' (Laid Off)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="addPaymentReason">Reason *</Label>
              <Input
                id="addPaymentReason"
                placeholder="e.g., Severance, Extra Hours, Bonus, etc."
                value={addPaymentReason}
                onChange={(e) => setAddPaymentReason(e.target.value)}
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addPaymentAmount">Amount *</Label>
              <Input
                id="addPaymentAmount"
                type="number"
                placeholder="0.00"
                value={addPaymentAmount || ""}
                onChange={(e) => setAddPaymentAmount(parseFloat(e.target.value) || 0)}
                className="border-slate-300"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="addPaymentDate">Date * (2026 only)</Label>
              <Input
                id="addPaymentDate"
                type="date"
                value={addPaymentDate}
                onChange={(e) => setAddPaymentDate(e.target.value)}
                className="border-slate-300"
                min="2026-01-01"
                max="2026-12-31"
              />
              <p className="text-xs text-slate-500">Only 2026 dates are allowed</p>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              onClick={() => setIsAddPaymentModalOpen(false)}
              variant="outline"
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPayment}
              className="bg-green-600 hover:bg-green-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Week Payments Modal */}
      <Dialog open={isAddWeekModalOpen} onOpenChange={setIsAddWeekModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Payments for Week</DialogTitle>
            <DialogDescription>
              Select week start date and employees to generate weekly payments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="week_start_date">Week Start Date (Sunday) *</Label>
              <Input
                id="week_start_date"
                type="date"
                value={week_start_date}
                onChange={(e) => setWeekStartDate(e.target.value)}
                className="border-slate-300"
                min="2026-01-01"
                max="2026-12-31"
              />
              <p className="text-xs text-slate-500">Select the Sunday of the week you want to add</p>
            </div>

            <div className="space-y-2">
              <Label>Select Employees & Days Worked *</Label>
              <div className="border rounded-lg max-h-[300px] overflow-y-auto bg-slate-50 divide-y divide-slate-100">
                {employees.length === 0 ? (
                  <p className="p-3 text-sm text-slate-500">No employees found</p>
                ) : (
                  employees.map((emp) => (
                    <div key={emp.id} className={`flex items-center justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 ${emp.payment_status === 'laid_off' ? 'opacity-60 bg-slate-50' : 'bg-white'}`}>
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`emp-${emp.id}`}
                          checked={selectedEmployeesForWeek.has(emp.id)}
                          onChange={(e) => {
                            const newSelected = new Set(selectedEmployeesForWeek);
                            if (e.target.checked) {
                              newSelected.add(emp.id);
                            } else {
                              newSelected.delete(emp.id);
                            }
                            setSelectedEmployeesForWeek(newSelected);
                          }}
                          disabled={emp.payment_status === 'laid_off'}
                          className="rounded w-4 h-4 border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50"
                        />
                        <label htmlFor={`emp-${emp.id}`} className={`text-sm font-medium cursor-pointer select-none ${emp.payment_status === 'laid_off' ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                          {emp.name} ({emp.id}) - ${(emp.weekly_rate || 0).toLocaleString()}
                          {emp.payment_status === 'laid_off' && " (Laid Off)"}
                        </label>
                      </div>
                      <div className="flex items-center gap-2">
                         <Label htmlFor={`days-${emp.id}`} className="text-xs text-slate-500">Days:</Label>
                         <Input
                           id={`days-${emp.id}`}
                           type="number"
                           step="0.5"
                           value={employeeDays[emp.id] ?? 5}
                           onChange={(e) => {
                             const val = parseFloat(e.target.value);
                             setEmployeeDays(prev => ({...prev, [emp.id]: isNaN(val) ? 0 : val}));
                           }}
                           className="w-16 h-8 text-sm"
                           disabled={!selectedEmployeesForWeek.has(emp.id)}
                         />
                      </div>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-slate-500">
                {selectedEmployeesForWeek.size} employee(s) selected - Set individual days worked for each
              </p>
            </div>
            
            {/* Bulk Set Days Section */}
             <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-3">
                 <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium text-blue-900">Bulk Set Days for Selected Employees</p>
                    <p className="text-xs text-blue-700">{selectedEmployeesForWeek.size} employee(s) selected</p>
                 </div>
                 
                 <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                        <Label htmlFor="bulkDays" className="text-xs text-blue-800">Days Worked:</Label>
                         <Select value={bulkDaysInput.toString()} onValueChange={(v) => setBulkDaysInput(parseFloat(v))}>
                            <SelectTrigger id="bulkDays" className="bg-white border-blue-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[1, 2, 3, 4, 5].map(d => (
                                <SelectItem key={d} value={d.toString()}>{d} Days</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                    </div>
                    <Button 
                        onClick={handleBulkApply}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={selectedEmployeesForWeek.size === 0}
                    >
                        Apply
                    </Button>
                 </div>
             </div>

             <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                     <h4 className="text-sm font-medium text-slate-900">Additional Individual Payments</h4>
                     {!isAddingPaymentInline && (
                       <Button variant="outline" size="sm" className="gap-1 text-slate-600" onClick={() => setIsAddingPaymentInline(true)}>
                          <Plus className="w-3 h-3" /> Add Payment
                       </Button>
                     )}
                </div>

                {/* Inline Payment Form */}
                {isAddingPaymentInline && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="inlineEmp" className="text-xs">Employee *</Label>
                      <Select value={inlinePaymentEmpId} onValueChange={setInlinePaymentEmpId}>
                        <SelectTrigger id="inlineEmp" className="bg-white h-9">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map(e => (
                             <SelectItem key={e.id} value={e.id} className={e.payment_status === 'laid_off' ? 'text-slate-400 italic' : ''}>
                               {e.name}{e.payment_status === 'laid_off' ? ' (Laid Off)' : ''}
                             </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="inlineAmount" className="text-xs">Amount *</Label>
                      <Input
                        id="inlineAmount"
                        type="number"
                        placeholder="0.00"
                        value={inlinePaymentAmount}
                        onChange={e => setInlinePaymentAmount(e.target.value)}
                        className="bg-white h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="inlineReason" className="text-xs">Reason (Optional)</Label>
                      <Input
                        id="inlineReason"
                        placeholder="e.g., Bonus, Correction, etc."
                        value={inlinePaymentReason}
                        onChange={e => setInlinePaymentReason(e.target.value)}
                        className="bg-white h-9"
                      />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={handleAddInlinePayment} className="bg-green-600 hover:bg-green-700 h-8">
                        Add
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setIsAddingPaymentInline(false)} className="h-8">
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Queued Payments List */}
                {queuedAdditionalPayments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-500">Added Payments:</p>
                    <div className="border rounded-lg overflow-hidden divide-y divide-slate-100">
                      {queuedAdditionalPayments.map(p => (
                        <div key={p.id} className="flex justify-between items-center p-3 bg-white text-sm">
                           <div>
                             <p className="font-medium text-slate-900">{p.employeeName}</p>
                             <p className="text-slate-500 text-xs">${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} - {p.reason}</p>
                           </div>
                           <Button 
                             variant="ghost" 
                             size="sm" 
                             className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                             onClick={() => handleRemoveQueuedPayment(p.id)}
                           >
                              <X className="w-4 h-4" />
                           </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
             </div>
          </div>

          <div className="flex justify-between">
            <Button
              onClick={() => {
                setIsAddWeekModalOpen(false);
                setWeekStartDate("");
                setSelectedEmployeesForWeek(new Set());
                setWeekDaysWorked(5);
              }}
              variant="outline"
              className="border-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddWeekPayments}
              className="bg-green-600 hover:bg-green-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Week"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}