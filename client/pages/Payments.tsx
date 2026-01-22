import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, Printer, Trash2, Paperclip, Download, Eye, X, Plus } from "lucide-react";
import jsPDF from "jspdf";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { getTodayDate, formatDateString, formatDateToString } from "@/utils/yearStorage";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
      words += convertHundreds(Math.floor(dollars / 1000000)) + ' Million ';
      words += convertHundreds(Math.floor((dollars % 1000000) / 1000)) + ' Thousand ';
      words += convertHundreds(dollars % 1000);
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
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "paid">("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");
  const [isCheckPrintModalOpen, setIsCheckPrintModalOpen] = useState(false);
  const [selectedCheckPaymentId, setSelectedCheckPaymentId] = useState<string | null>(null);
  const [isAllMarkedAsPaid, setIsAllMarkedAsPaid] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedDeletePaymentId, setSelectedDeletePaymentId] = useState<string | null>(null);
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
  const [weekDaysWorked, setWeekDaysWorked] = useState<number>(5);

  // Down Payment Edit modal state
  const [isEditDownPaymentOpen, setIsEditDownPaymentOpen] = useState(false);
  const [editingDownPaymentPaymentId, setEditingDownPaymentPaymentId] = useState<string | null>(null);
  const [editingDownPaymentAmount, setEditingDownPaymentAmount] = useState<number>(0);

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
      setPayments(payData || []);
      setAbsences(absData || []);
      setSettings(settingsData || null);
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

    try {
      await paymentsService.update(selectedPaymentId, {
        status: "paid",
        paid_date,
        payment_method: selectedPaymentMethod,
        deduction_amount: paidDeduction,
        check_number: selectedPaymentMethod === "check" ? check_number : undefined,
        account_last_four: account_number ? account_number.slice(-4) : payment?.account_last_four,
        bank_name: bank_name || payment?.bank_name,
      });
      await loadFreshData();
    } catch (error) {
      console.error("Error updating payment:", error);
      toast({
        title: "Error",
        description: "Failed to update payment in Supabase.",
        variant: "destructive",
      });
    }

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
  };

  const handleMarkAsPending = async (payment_id: string) => {
    try {
      await paymentsService.update(payment_id, { status: "pending", paid_date: null });
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
      setIsEditAmountOpen(true);
    }
  };

  const handleConfirmAmountEdit = async () => {
    if (!editingPaymentId || editingAmount < 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      await paymentsService.update(editingPaymentId, { amount: editingAmount });
      await loadFreshData();
      toast({
        title: "✓ Amount Updated",
        description: "Payment amount has been updated.",
      });
    } catch (error) {
      console.error("Error updating payment amount:", error);
      toast({
        title: "Error",
        description: "Failed to update payment amount.",
        variant: "destructive",
      });
    }

    setIsEditAmountOpen(false);
    setEditingPaymentId(null);
    setEditingAmount(0);
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
      await paymentsService.update(editingDaysPaymentId, {
        days_worked: editingDaysWorked,
        amount: newAmount || payment.amount,
      });
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

    if (editingDownPaymentAmount < 0) {
      console.error("❌ Invalid down payment amount:", editingDownPaymentAmount);
      alert("Please enter a valid down payment amount (0 or more)");
      return;
    }

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
      await paymentsService.update(editingDownPaymentPaymentId, { down_payment: down_payment_amount });
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

      return paymentsService.update(p.id, {
        days_worked: bulkDaysValue,
        amount: newAmount || p.amount, // Fallback to original amount if calculation fails
      });
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
      return paymentsService.update(p.id, {
        days_worked: p.days_worked,
        amount: p.amount,
        status: p.status,
        paid_date: p.paid_date,
        deduction_amount: p.deduction_amount,
        check_number: p.check_number,
        account_last_four: p.account_last_four,
        bank_name: p.bank_name,
        // Add other fields that might have been changed by bulk operation
      });
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



  const handlePrintCheck = (paymentId: string) => {
    setSelectedCheckPaymentId(paymentId);
    setIsCheckPrintModalOpen(true);
  };

  const handleRemovePayment = (paymentId: string) => {
    setSelectedDeletePaymentId(paymentId);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmRemovePayment = async () => {
    if (!selectedDeletePaymentId) return;

    const paymentToRemove = payments.find(p => p.id === selectedDeletePaymentId);

    if (paymentToRemove) {
      try {
        await paymentsService.delete(selectedDeletePaymentId);
        await loadFreshData();
        toast({
          title: "Payment Removed",
          description: `Payment for ${paymentToRemove.employee_name} (${new Date(paymentToRemove.week_start_date).toLocaleDateString()}) has been removed.`,
        });
      } catch (error) {
        console.error("Error deleting payment:", error);
        toast({
          title: "Error",
          description: "Failed to remove payment.",
          variant: "destructive",
        });
      }
    }
    setIsDeleteConfirmOpen(false);
    setSelectedDeletePaymentId(null);
  };

  // Find the earliest pending payment date (coming week to pay)
  const upcomingPaymentWeek = (() => {
    // Find the earliest week with pending payments using string comparison to avoid timezone issues
    const pendingPayments = payments.filter(p => p.status === "pending");
    if (pendingPayments.length > 0) {
      // Use string comparison on YYYY-MM-DD format (lexicographic ordering works correctly)
      return pendingPayments.reduce<string | null>((earliest, p) => {
        if (!earliest || p.week_start_date < earliest) {
          return p.week_start_date;
        }
        return earliest;
      }, null);
    }

    // If no pending payments, show the earliest week (first week of year)
    // This way, if week 1 is all paid, it shows week 1's paid status
    if (payments.length > 0) {
      // Use string comparison on YYYY-MM-DD format (lexicographic ordering works correctly)
      return payments.reduce<string | null>((earliest, p) => {
        if (!earliest || p.week_start_date < earliest) {
          return p.week_start_date;
        }
        return earliest;
      }, null);
    }

    return null;
  })();

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
      } else if (upcomingPaymentWeek) {
        // Otherwise, default to showing only the coming week's payments
        dateMatch = p.week_start_date === upcomingPaymentWeek;
      }

      return statusMatch && employeeMatch && dateMatch;
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

  const handleMarkAllAsPaid = async () => {
    const confirmed = window.confirm("Are you sure you want to mark ALL pending payments as paid?");
    if (confirmed) {
      const today = getTodayDate();
      const pendingIds = payments.filter(p => p.status === "pending").map(p => p.id);
      
      try {
        await Promise.all(pendingIds.map(id => 
          paymentsService.update(id, { status: "paid", paid_date: today })
        ));
        await loadFreshData();
        toast({
          title: "✓ All Paid",
          description: "All pending payments have been marked as paid.",
        });
      } catch (error) {
        console.error("Error marking all as paid:", error);
        toast({
          title: "Error",
          description: "Failed to mark all payments as paid.",
          variant: "destructive",
        });
      }
    }
  };

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

    if (addPaymentAmount <= 0) {
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
      await Promise.all(Array.from(selectedEmployeesForWeek).map(async (empId) => {
        const employee = employees.find(e => e.id === empId);
        if (employee) {
          const dailyRate = employee.weekly_rate / 5;
          const amount = dailyRate * weekDaysWorked;

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
            days_worked: weekDaysWorked,
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

      await loadFreshData();

      // Reset form and close modal
      setIsAddWeekModalOpen(false);
      setWeekStartDate("");
      setSelectedEmployeesForWeek(new Set());
      setWeekDaysWorked(5);

      toast({
        title: "✓ Week Added",
        description: `Added payments for ${selectedEmployeesForWeek.size} employee(s) for the week of ${weekStartStr}`,
      });
    } catch (error) {
      console.error("Error adding week payments:", error);
      toast({
        title: "Error",
        description: "Failed to add weekly payments.",
        variant: "destructive",
      });
    }
  };

  const handleAddWeeklyPayments = () => {
    // Simply open the modal - let user manually select week and employees
    setIsAddWeekModalOpen(true);
    // Initialize with all employees selected
    const allEmployeeIds = new Set(employees.map(e => e.id));
    setSelectedEmployeesForWeek(allEmployeeIds);

    // Set week start date to NEXT week (7 days after upcoming payment week)
    if (upcomingPaymentWeek) {
      const currentWeekParts = upcomingPaymentWeek.split('-');
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
      await paymentsService.update(checkDetailsPaymentId, {
        check_number: checkDetailsNumber,
        bank_name: checkDetailsBankName,
        account_last_four: checkDetailsAccountLast4,
      });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employee Payments</h1>
          <p className="text-slate-600 mt-1">Manage and track employee payment obligations</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setIsAddPaymentModalOpen(true)}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Add Payment
          </Button>
          <Button
            onClick={handleAddWeeklyPayments}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
            title="Add weekly payments - upcoming week and all employees pre-selected"
          >
            <Plus className="w-4 h-4" />
            Add Weekly Payments
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

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Payment List</CardTitle>
          <CardDescription>All employee payment obligations</CardDescription>
          <div className="space-y-4 mt-4">
            <div className="flex gap-4 flex-wrap">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-40 border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                <SelectTrigger className="w-40 border-slate-300">
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

            <div className="flex gap-4 items-center flex-wrap">
              <Label className="text-sm text-slate-600">Due Date Range:</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="filterFromDate"
                  type="date"
                  placeholder="From"
                  value={filterFromDate}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                  className="border-slate-300"
                />
                <span className="text-slate-500 text-sm whitespace-nowrap">to</span>
                <Input
                  id="filterToDate"
                  type="date"
                  placeholder="To"
                  value={filterToDate}
                  onChange={(e) => setFilterToDate(e.target.value)}
                  className="border-slate-300"
                />
              </div>

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
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Employee</th>
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
                    <td colSpan={7} className="p-3 text-center text-slate-500">
                      No payments found
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment, idx) => (
                    <tr key={payment.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="p-3 text-slate-700 font-medium whitespace-nowrap">
                        <p className="font-semibold">{payment.employee_id} - {payment.employee_name}</p>
                      </td>
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
                            onClick={() => handleEditCheckDetails(payment.id)}
                            className="px-3 py-1.5 rounded-full inline-block text-sm font-medium whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity bg-purple-100 text-purple-700"
                            title="Click to edit check details"
                          >
                            <span>{getPaymentMethodDisplay(payment.payment_method, payment)}</span>
                          </button>
                        ) : (
                          <div className={`px-3 py-1.5 rounded-full inline-block text-sm font-medium whitespace-nowrap ${
                            payment.payment_method === 'direct_deposit' ? 'bg-blue-100 text-blue-700' :
                            payment.payment_method === 'check' ? 'bg-purple-100 text-purple-700' :
                            payment.payment_method === 'cash' ? 'bg-green-100 text-green-700' :
                            payment.payment_method === 'ach' ? 'bg-teal-100 text-teal-700' :
                            payment.payment_method === 'wire' ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            <span>{getPaymentMethodDisplay(payment.payment_method, payment)}</span>
                          </div>
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
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:bg-blue-50 gap-1"
                              onClick={() => handlePrintCheck(payment.id)}
                              title="Print check"
                            >
                              <Printer className="w-3 h-3" />
                              Check
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-teal-600 hover:bg-teal-50 gap-1"
                              onClick={() => handleAttachCheck(payment.id)}
                              title="Attach check image"
                            >
                              <Paperclip className="w-3 h-3" />
                              Attach
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-purple-600 hover:bg-purple-50 gap-1"
                              onClick={() => handleEditAmount(payment.id)}
                              title="Edit payment amount"
                            >
                              <span>Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-indigo-600 hover:bg-indigo-50 gap-1"
                              onClick={() => handleEditDays(payment.id)}
                              title="Edit days worked"
                            >
                              <span>Days</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-cyan-600 hover:bg-cyan-50 gap-1"
                              onClick={() => handleEditDownPayment(payment.id)}
                              title="Edit down payment"
                            >
                              <span>Down Pmt</span>
                            </Button>
                            {payment.status === "pending" ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:bg-green-50"
                                onClick={() => handleMarkAsPaid(payment.id)}
                              >
                                Paid
                              </Button>
                            ) : payment.status === "canceled" ? (
                              <span className="text-xs text-slate-500">—</span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-600 hover:bg-orange-50"
                                onClick={() => handleMarkAsPending(payment.id)}
                              >
                                Revert
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:bg-red-50 gap-1"
                              onClick={() => handleRemovePayment(payment.id)}
                              title="Remove payment"
                            >
                              <Trash2 className="w-3 h-3" />
                              Remove
                            </Button>
                          </div>
                          {payment.attachments && payment.attachments.length > 0 && (
                            <div className="flex flex-col gap-1">
                              <div className="text-xs text-teal-700 font-medium">
                                {payment.attachments.length} attachment{payment.attachments.length !== 1 ? "s" : ""}
                              </div>
                              <div className="flex gap-1 flex-wrap">
                                {payment.attachments.map((att) => (
                                  <div key={att.id} className="flex gap-0.5">
                                    <button
                                      onClick={() => handleViewCheckAttachment(att)}
                                      className="text-blue-600 hover:text-blue-800 p-0.5"
                                      title="View"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handlePrintCheckAttachment(att)}
                                      className="text-purple-600 hover:text-purple-800 p-0.5"
                                      title="Print"
                                    >
                                      <Printer className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDownloadCheckAttachment(att)}
                                      className="text-green-600 hover:text-green-800 p-0.5"
                                      title="Download"
                                    >
                                      <Download className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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
                    min="0"
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
                <DialogTitle>Edit Payment Amount</DialogTitle>
                <DialogDescription>
                  {payment && `Adjust amount for ${payment.employee_name}`}
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
                        min="0"
                        step="0.01"
                        value={editingAmount}
                        onChange={(e) => setEditingAmount(parseFloat(e.target.value) || 0)}
                        className="border-slate-300"
                      />
                      <p className="text-xs text-slate-500 whitespace-nowrap">
                        Original amount: ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    </div>
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
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmAmountEdit}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Update Amount
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
                        min="0"
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

      {isDeleteConfirmOpen && selectedDeletePaymentId && (() => {
        const paymentToDelete = payments.find(p => p.id === selectedDeletePaymentId);

        return (
          <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Remove Payment</DialogTitle>
                <DialogDescription>
                  Are you sure you want to remove this payment?
                </DialogDescription>
              </DialogHeader>
              {paymentToDelete && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Employee:</span> {paymentToDelete.employee_name}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Week:</span> {new Date(paymentToDelete.week_start_date).toLocaleDateString()} to {new Date(paymentToDelete.week_end_date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Amount:</span> ${(paymentToDelete.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Status:</span> {paymentToDelete.status === "paid" ? "Paid" : paymentToDelete.status === "canceled" ? "Canceled" : "Pending"}
                  </p>
                </div>
              )}
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p className="text-sm text-red-700">
                  This action cannot be undone. The payment will be permanently removed.
                </p>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteConfirmOpen(false);
                    setSelectedDeletePaymentId(null);
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmRemovePayment}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Remove Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

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
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name} ({emp.id})
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
                min="0"
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
            >
              Add Payment
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
              <Label htmlFor="weekDaysWorked">Days Worked *</Label>
              <Input
                id="weekDaysWorked"
                type="number"
                min="1"
                max="5"
                value={weekDaysWorked}
                onChange={(e) => setWeekDaysWorked(Math.max(1, Math.min(5, parseInt(e.target.value) || 5)))}
                className="border-slate-300"
              />
              <p className="text-xs text-slate-500">Number of days worked (1-5, default is 5)</p>
            </div>

            <div className="space-y-2">
              <Label>Select Employees *</Label>
              <div className="border rounded-lg p-3 space-y-2 max-h-[300px] overflow-y-auto bg-slate-50">
                {employees.length === 0 ? (
                  <p className="text-sm text-slate-500">No employees found</p>
                ) : (
                  employees.map((emp) => (
                    <div key={emp.id} className="flex items-center space-x-2">
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
                        className="rounded"
                      />
                      <label htmlFor={`emp-${emp.id}`} className="text-sm cursor-pointer">
                        {emp.name} ({emp.id}) - ${(emp.weekly_rate || 0).toLocaleString()}
                      </label>
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-slate-500">
                {selectedEmployeesForWeek.size} employee(s) selected
              </p>
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
            >
              Add Week
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
    </div>
  );
}
