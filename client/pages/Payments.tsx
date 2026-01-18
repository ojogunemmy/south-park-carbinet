import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, AlertCircle, Printer, Trash2, Paperclip, Download, Eye, X, Plus } from "lucide-react";
import jsPDF from "jspdf";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { getYearData, saveYearData, shouldUseExampleData, getTodayDate, formatDateString, formatDateToString } from "@/utils/yearStorage";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useToast } from "@/hooks/use-toast";
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

interface EmployeeAbsence {
  id: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  daysWorkedPerWeek: number;
  reason?: string;
}

interface CheckAttachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  data: string; // base64 encoded data
}

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
  paidDate?: string;
  paymentMethod?: string;
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  accountType?: string;
  daysWorked?: number;
  isAdjustedForAbsence?: boolean;
  fullWeeklySalary?: number;
  deductionAmount?: number;
  downPayment?: number;
  paidCheckNumber?: string;
  paidAccountLast4?: string;
  paidBankName?: string;
  attachments?: CheckAttachment[];
  isSeverance?: boolean;
  severanceReason?: string;
  severanceDate?: string;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  weeklyRate: number;
  startDate: string;
  paymentMethod?: string;
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  accountType?: string;
  paymentDay?: string;
  paymentStatus?: "active" | "paused" | "leaving" | "laid_off";
  defaultDaysWorkedPerWeek?: number;
}

const exampleEmployees: Employee[] = [
  {
    id: "EMP-001",
    name: "Julio Funez",
    position: "Assembler",
    weeklyRate: 1200,
    startDate: "2025-01-12",
    paymentStartDate: "2026-01-04",
    ssn: "85909977255",
    address: "197 lamplighter Winnsboro SC",
    telephone: "(984) 245-6558",
    email: "juliofunez@gmail.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
    defaultDaysWorkedPerWeek: 5,
  },
  {
    id: "EMP-002",
    name: "Jayro Calderon",
    position: "Assistant",
    weeklyRate: 900,
    startDate: "2025-11-20",
    paymentStartDate: "2026-01-04",
    ssn: "",
    address: "197 lamplighter Winnsboro SC",
    telephone: "(714) 760-1310",
    email: "lopeznahun85@gmail.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
    defaultDaysWorkedPerWeek: 5,
  },
  {
    id: "EMP-003",
    name: "Darwin Hernandez",
    position: "Assembler",
    weeklyRate: 1500,
    startDate: "2022-04-18",
    paymentStartDate: "2026-01-04",
    ssn: "",
    address: "12831 wedgefield dr",
    telephone: "(702) 984-9684",
    email: "darwin.hernandez@example.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
  },
  {
    id: "EMP-004",
    name: "Wilson Hernandez",
    position: "Assembler",
    weeklyRate: 1300,
    startDate: "2024-07-20",
    paymentStartDate: "2026-01-04",
    ssn: "456-78-9012",
    address: "2427 sunset ave",
    telephone: "(980) 376-2654",
    email: "",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
  },
  {
    id: "EMP-005",
    name: "Lucas Moura (2m Home Solutions)",
    position: "Machine Operator",
    weeklyRate: 1400,
    startDate: "2024-02-19",
    paymentStartDate: "2026-01-04",
    ssn: "",
    address: "10321 Osprey dr, Pineville dr",
    telephone: "(980) 213-9706",
    email: "2mhomesolutionsnc@gmail.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
  },
  {
    id: "EMP-006",
    name: "Gustavo Sousa",
    position: "Painter",
    weeklyRate: 1500,
    startDate: "2024-02-19",
    paymentStartDate: "2026-01-04",
    ssn: "",
    address: "11838 Nantuckety Ln NC 28270",
    telephone: "(980) 378-7312",
    email: "GS4707770@gmail.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
    defaultDaysWorkedPerWeek: 5,
  },
  {
    id: "EMP-007",
    name: "Noel Zapata",
    position: "Assembler",
    weeklyRate: 1200,
    startDate: "2024-12-13",
    paymentStartDate: "2026-01-04",
    ssn: "789-01-2345",
    address: "112831 Webgefield Dr, 28208 Charlotte NC",
    telephone: "(704) 298-2900",
    email: "noel.zapata@example.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
  },
  {
    id: "EMP-008",
    name: "Marco Afonso (MCI Pro Service LLC)",
    position: "Installer",
    weeklyRate: 1500,
    startDate: "2026-01-01",
    paymentStartDate: "2026-01-04",
    ssn: "890-12-3456",
    address: "357 Ash Way, Denver, CO 80209",
    telephone: "(303) 555-8901",
    email: "marco.afonso@example.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
    defaultDaysWorkedPerWeek: 5,
  },
  {
    id: "EMP-009",
    name: "Luis Araya",
    position: "Installer",
    weeklyRate: 1300,
    startDate: "2026-01-02",
    paymentStartDate: "2026-01-04",
    ssn: "901-23-4567",
    address: "246 Oak Ridge, Denver, CO 80210",
    telephone: "(303) 555-9012",
    email: "luis.araya@example.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
  },
  {
    id: "EMP-010",
    name: "Carlos Ruiz",
    position: "Installer",
    weeklyRate: 1200,
    startDate: "2026-01-03",
    paymentStartDate: "2026-01-04",
    ssn: "012-34-5678",
    address: "135 Willow St, Denver, CO 80211",
    telephone: "(303) 555-0234",
    email: "carlos@example.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
    defaultDaysWorkedPerWeek: 5,
  },
  {
    id: "EMP-011",
    name: "Jhonata Nunes",
    position: "Assistant",
    weeklyRate: 900,
    startDate: "2026-01-04",
    paymentStartDate: "2026-01-04",
    ssn: "123-34-5678",
    address: "468 Spruce Rd, Denver, CO 80212",
    telephone: "(303) 555-1345",
    email: "yonthan.nunez@example.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
    defaultDaysWorkedPerWeek: 5,
  },
  {
    id: "EMP-012",
    name: "Luis Molina",
    position: "Operation Manager",
    weeklyRate: 1500,
    startDate: "2026-01-05",
    paymentStartDate: "2026-01-04",
    ssn: "234-45-6789",
    address: "579 Hickory Ct, Denver, CO 80213",
    telephone: "(303) 555-2456",
    email: "luis.molina@example.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
  },
  {
    id: "EMP-013",
    name: "Emmanuel Alejandro Camarena Burdier",
    position: "Digital Strategist",
    weeklyRate: 1000,
    startDate: "2026-01-06",
    paymentStartDate: "2026-01-04",
    ssn: "026-55-3649",
    address: "690 Chestnut Dr, Denver, CO 80214",
    telephone: "(303) 555-3567",
    email: "emmanuel.camarena@example.com",
    paymentMethod: "direct_deposit",
    directDeposit: true,
    paymentDay: "wednesday",
    paymentStatus: "active",
    defaultDaysWorkedPerWeek: 5,
  },
  {
    id: "EMP-014",
    name: "Tuan Nguyen",
    position: "Manager",
    weeklyRate: 1400,
    startDate: "2026-01-07",
    paymentStartDate: "2026-01-04",
    ssn: "456-67-8901",
    address: "801 Dogwood Ln, Denver, CO 80215",
    telephone: "(303) 555-4678",
    email: "tuan.nguyen@example.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
  },
  {
    id: "EMP-015",
    name: "Richard Fix",
    position: "Driver",
    weeklyRate: 1100,
    startDate: "2026-01-01",
    paymentStartDate: "2026-01-04",
    ssn: "567-78-9012",
    address: "912 Elder Way, Denver, CO 80216",
    telephone: "(303) 555-5789",
    email: "richard.fix@example.com",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
  },
  {
    id: "EMP-016",
    name: "Julio Paraguassu",
    position: "Painter",
    weeklyRate: 1500,
    startDate: "2026-01-08",
    paymentStartDate: "2026-01-04",
    ssn: "",
    address: "",
    telephone: "",
    email: "",
    paymentMethod: "check",
    directDeposit: false,
    paymentDay: "wednesday",
    paymentStatus: "active",
  },
];

export default function Payments() {
  const { toast } = useToast();
  const { selectedYear } = useYear();

  // Load employees from localStorage or use example employees
  const getEmployees = () => {
    const saved = getYearData<Employee[]>("employees", selectedYear, null);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      try {
        // Deduplicate by ID to prevent duplicate key warnings
        const seenIds = new Set<string>();
        return saved.filter((emp: Employee) => {
          if (emp && emp.id && !seenIds.has(emp.id)) {
            seenIds.add(emp.id);
            return true;
          }
          return false;
        });
      } catch (error) {
        console.error("Error loading employees:", error);
        return exampleEmployees;
      }
    }
    // Use example employees as fallback
    return exampleEmployees;
  };

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
    const settings = getCompanySettings();
    const startingNumber = settings?.checkStartNumber || 1001;

    // Find all check numbers that have been used
    const usedCheckNumbers = payments
      .filter(p => p.paidCheckNumber)
      .map(p => parseInt(p.paidCheckNumber || '0', 10))
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
    const settings = getCompanySettings();
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
      const checkNum = parseInt(payment.paidCheckNumber || '0', 10);
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
      doc.text(payment.employeeName, 15, y);
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
      const memo = payment.isSeverance ? 'Severance Payment' : `Week of ${new Date(payment.weekStartDate).toLocaleDateString()}`;
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
      const micrLine = `|${settings?.routingNumber?.padEnd(9, '0') || '000000000'}|${payment.employeeId.padEnd(12, ' ')}|${checkNum.toString().padStart(8, '0')}|`;
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
    doc.text(payment.employeeName, 15, y);
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
    const memo = payment.isSeverance ? 'Severance Payment' : `Week of ${new Date(payment.weekStartDate).toLocaleDateString()}`;
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
    const micrLine = `|${settings?.routingNumber?.padEnd(9, '0') || '000000000'}|${payment.employeeId.padEnd(12, ' ')}|${checkNum.toString().padStart(8, '0')}|`;
    doc.text(micrLine, 15, y);

    // Save PDF
    const fileName = `check_${payment.employeeName.replace(/\s+/g, '_')}_${checkNum}.pdf`;
    doc.save(fileName);
  };

  const [employees, setEmployees] = useState<Employee[]>(getEmployees());
  const [absences, setAbsences] = useState<EmployeeAbsence[]>(() => {
    return getYearData<EmployeeAbsence[]>("employeeAbsences", selectedYear, []);
  });

  // Initialize payments from localStorage or generate if empty
  const initializePayments = (): PaymentObligation[] => {
    console.log("🔄 initializePayments called for year:", selectedYear);
    const saved = getYearData<PaymentObligation[]>("payments", selectedYear, []);
    console.log("📂 Loaded from localStorage:", saved.length, "payments");
    // Return saved payments or empty array to trigger generation in useEffect
    return saved && saved.length > 0 ? saved : [];
  };

  const [payments, setPayments] = useState<PaymentObligation[]>(initializePayments());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [paidDate, setPaidDate] = useState("");
  const [paidDeduction, setPaidDeduction] = useState<number>(0);
  const [paidCheckNumber, setPaidCheckNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [routingNumber, setRoutingNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
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
  const [weekStartDate, setWeekStartDate] = useState<string>("");
  const [selectedEmployeesForWeek, setSelectedEmployeesForWeek] = useState<Set<string>>(new Set());
  const [weekDaysWorked, setWeekDaysWorked] = useState<number>(5);

  // Down Payment Edit modal state
  const [isEditDownPaymentOpen, setIsEditDownPaymentOpen] = useState(false);
  const [editingDownPaymentPaymentId, setEditingDownPaymentPaymentId] = useState<string | null>(null);
  const [editingDownPaymentAmount, setEditingDownPaymentAmount] = useState<number>(0);

  // Reload employees, absences, and payments when year changes
  useEffect(() => {
    console.log("📥 Year changed to:", selectedYear);
    setEmployees(getEmployees());
    setAbsences(getYearData<EmployeeAbsence[]>("employeeAbsences", selectedYear, []));
    // Always reload payments from localStorage to ensure fresh data
    const savedPayments = getYearData<PaymentObligation[]>("payments", selectedYear, []);
    console.log("📥 Loading saved payments on year change:", savedPayments.length);
    setPayments(savedPayments.length > 0 ? savedPayments : []);
  }, [selectedYear]);

  // Listen for changes to localStorage (when Employees page updates in same tab)
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedEmployees = getEmployees();
      setEmployees(updatedEmployees);
      const updatedPayments = getYearData<PaymentObligation[]>("payments", selectedYear, []);
      setPayments(updatedPayments);
    };

    // Storage event for cross-tab updates
    window.addEventListener("storage", handleStorageChange);

    // Custom event for same-tab updates (when severance payment is created from Employees page)
    const handleCustomUpdate = () => {
      const updatedEmployees = getEmployees();
      setEmployees(updatedEmployees);
      const updatedPayments = getYearData<PaymentObligation[]>("payments", selectedYear, []);
      setPayments(updatedPayments);
    };
    window.addEventListener("employeesUpdated", handleCustomUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("employeesUpdated", handleCustomUpdate);
    };
  }, [selectedYear]);

  // Reload employees when page becomes visible (tab switch)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const updatedEmployees = getEmployees();
        setEmployees(updatedEmployees);
        const updatedPayments = getYearData<PaymentObligation[]>("payments", selectedYear, []);
        setPayments(updatedPayments);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [selectedYear]);

  // Load fresh data from localStorage when component mounts and when page becomes visible
  useEffect(() => {
    console.log("📥 Setting up payment data loading effect for year:", selectedYear);

    const loadFreshData = () => {
      console.log("🔄 Loading fresh payment data from localStorage for year:", selectedYear);
      try {
        // FORCE reload directly from localStorage
        const key = `payments_${selectedYear}`;
        const rawData = localStorage.getItem(key);

        if (rawData) {
          const updatedPayments = JSON.parse(rawData);
          console.log("✅ Loaded", updatedPayments.length, "payments from localStorage");
          console.log("📋 Key used:", key);

          // Show any paid payments
          const paidPayments = updatedPayments.filter((p: PaymentObligation) => p.status === "paid");
          if (paidPayments.length > 0) {
            console.log("💰 Found", paidPayments.length, "paid payments:");
            paidPayments.forEach(p => {
              console.log(`   - ${p.employeeName}: Check #${p.paidCheckNumber || 'N/A'}`);
            });
          }

          setPayments(updatedPayments);
        } else {
          console.warn("⚠️ No payment data found in localStorage for year", selectedYear);
          console.log("📋 Key checked:", key);
          setPayments([]);
        }
      } catch (error) {
        console.error("❌ Error loading payments:", error);
        setPayments([]);
      }
    };

    // Load on mount - CRITICAL: must happen first before any effects modify state
    console.log("📍 Component mounted for year", selectedYear);
    loadFreshData();

    // Also reload when window receives focus (user switches back from another app/tab)
    const handleWindowFocus = () => {
      console.log("🔄 Window focus event - reloading payments from storage");
      loadFreshData();
    };

    // Also reload when page becomes visible (navigating back to this page via browser back button)
    const handlePageShow = () => {
      console.log("🔄 Page show event (browser navigation back) - reloading payments from storage");
      loadFreshData();
    };

    // Listen for visibility changes (tab/window switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("👁️ Document became visible - reloading payments from storage");
        loadFreshData();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      console.log("🧹 Cleaning up payment data loading listeners");
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedYear]);

  // Save payments to localStorage whenever they change
  useEffect(() => {
    if (payments.length > 0) {
      console.log("🔄 Auto-saving payments to localStorage for year:", selectedYear);
      console.log("📊 Payments to save:", payments.length, "items");

      // Find any paid payments to log
      const paidPayments = payments.filter(p => p.status === "paid");
      if (paidPayments.length > 0) {
        console.log("💰 Paid payments detected:", paidPayments.length);
        paidPayments.forEach(p => {
          console.log(`   - ${p.employeeName}: Check #${p.paidCheckNumber || 'N/A'}, Paid: ${p.paidDate}`);
        });
      }

      try {
        saveYearData("payments", selectedYear, payments);
        console.log("✅ Payments saved successfully");

        // Verify it was saved immediately
        setTimeout(() => {
          const saved = getYearData<PaymentObligation[]>("payments", selectedYear, []);
          const savedPaid = saved.filter(p => p.status === "paid");
          console.log("🔍 Verification - Total saved:", saved.length, "items, Paid:", savedPaid.length);

          if (savedPaid.length !== paidPayments.length) {
            console.warn("⚠️ WARNING: Paid payment count mismatch! Expected:", paidPayments.length, "Got:", savedPaid.length);
          }
        }, 100);
      } catch (error) {
        console.error("❌ CRITICAL ERROR saving payments:", error);
      }
    }
  }, [payments, selectedYear]);

  // Filter payments to only show selected year on year change
  useEffect(() => {
    setIsAllMarkedAsPaid(false);
  }, [selectedYear]);

  // For 2026, auto-generate all payments ONLY if they're missing
  // This effect ONLY runs on first mount (when employees list loads)
  useEffect(() => {
    // Safety check: only run for 2026
    if (selectedYear !== 2026) return;
    if (employees.length === 0) return;

    // CRITICAL: Check localStorage DIRECTLY, not state
    // State may not have loaded yet from the year change effect
    const key = `payments_${selectedYear}`;
    const rawData = localStorage.getItem(key);

    console.log("🔍 Auto-generation check - Checking localStorage directly for key:", key);
    console.log("🔍 localStorage has data:", rawData ? "YES" : "NO");

    // If data already exists in localStorage, DON'T regenerate
    if (rawData) {
      console.log("✅ Saved payments exist in localStorage - skipping regeneration");
      // Load it into state
      try {
        const savedPayments = JSON.parse(rawData);
        console.log("✅ Loaded", savedPayments.length, "payments from localStorage");
        setPayments(savedPayments);
      } catch (error) {
        console.error("❌ Error parsing saved payments:", error);
      }
      return;
    }

    // Also check state as a fallback (in case data is already in memory)
    if (payments.length > 0) {
      console.log("✅ Payments already in state - skipping regeneration");
      return;
    }

    console.log("🔄 Auto-generating payments for 2026 (first time)...");

    // Generate all payments for the entire year
    const allPayments: PaymentObligation[] = [];

    // Helper function to parse dates
    const parseDate = (dateString: string): Date => {
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day);
    };

    const startDate = parseDate("2026-01-01");
    const endDate = parseDate("2026-12-31");

    let weekStart = new Date(startDate);
    while (weekStart.getDay() !== 0) {
      weekStart.setDate(weekStart.getDate() + 1);
    }

    while (weekStart <= endDate) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      employees.forEach((emp) => {
        const empPaymentStart = emp.paymentStartDate || emp.startDate || "1900-01-01";
        const empPaymentStartDate = parseDate(empPaymentStart);

        if (weekStart >= empPaymentStartDate) {
          const weekStartStr = formatDateToString(weekStart);
          const dailyRate = emp.weeklyRate / 5;
          const dueDate = new Date(weekEnd.getTime() + 86400000);

          allPayments.push({
            id: `PAY-${emp.id}-${weekStartStr}`,
            employeeId: emp.id,
            employeeName: emp.name,
            employeePosition: emp.position,
            amount: dailyRate * 5,
            weekStartDate: weekStartStr,
            weekEndDate: formatDateToString(weekEnd),
            dueDate: formatDateToString(dueDate),
            status: "pending" as const,
            paymentMethod: emp.paymentMethod,
            bankName: emp.bankName,
            routingNumber: emp.routingNumber,
            accountNumber: emp.accountNumber,
            accountType: emp.accountType,
            daysWorked: 5,
            isAdjustedForAbsence: false,
            fullWeeklySalary: emp.weeklyRate,
            deductionAmount: 0,
          });
        }
      });

      weekStart.setDate(weekStart.getDate() + 7);
    }

    if (allPayments.length > 0) {
      console.log("💾 Setting generated payments:", allPayments.length);
      setPayments(allPayments);
    }
  }, [selectedYear]);

  // Generate payments for entire selected year (DISABLED - using auto-generation above instead)
  useEffect(() => {
    // This useEffect is disabled because the auto-generation useEffect above handles it
    return;
    if (employees.length > 0) {
      const generatedPayments: PaymentObligation[] = [];
      const seenPaymentIds = new Set<string>();

      // First, collect all existing payment IDs to avoid duplicates
      payments.forEach((p) => {
        seenPaymentIds.add(p.id);
      });

      // Generate payments for entire selected year
      const startDate = parseLocalDate(`${selectedYear}-01-01`);
      const endDate = parseLocalDate(`${selectedYear}-12-31`);

      // Start from the first Sunday (day 0)
      const weekStart = new Date(startDate);
      while (weekStart.getDay() !== 0) { // 0 = Sunday
        weekStart.setDate(weekStart.getDate() + 1);
      }

      // Generate weekly payments for the year
      while (weekStart <= endDate) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7); // Next Sunday (7 days)

        employees.forEach((emp) => {
          const empStartDate = parseLocalDate(emp.startDate || "1900-01-01");
          let canPayThisWeek = weekStart >= empStartDate;

          // Also check payment start date if it exists
          if (canPayThisWeek && emp.paymentStartDate) {
            const empPaymentStartDate = parseLocalDate(emp.paymentStartDate);
            canPayThisWeek = weekStart >= empPaymentStartDate;
          }

          // Generate payments if employee is eligible for this week
          if (canPayThisWeek) {
            const weekStartStr = formatDateToString(weekStart);
            const paymentId = `PAY-${emp.id}-${weekStartStr}`;

            // Only generate if we haven't already
            if (!seenPaymentIds.has(paymentId)) {
              seenPaymentIds.add(paymentId);

              let daysWorked = 5;
              let isAdjustedForAbsence = false;

              for (const absence of absences) {
                if (absence.employeeId === emp.id) {
                  const absenceStart = parseLocalDate(absence.fromDate);
                  const absenceEnd = parseLocalDate(absence.toDate);

                  if (weekStart >= absenceStart && weekStart <= absenceEnd) {
                    daysWorked = absence.daysWorkedPerWeek;
                    isAdjustedForAbsence = true;
                    break;
                  }
                }
              }

              const dailyRate = emp.weeklyRate / 5;
              const adjustedAmount = dailyRate * daysWorked;
              const deductionAmount = isAdjustedForAbsence ? (dailyRate * (5 - daysWorked)) : 0;
              const dueDate = new Date(weekEnd.getTime() + 86400000);

              generatedPayments.push({
                id: paymentId,
                employeeId: emp.id,
                employeeName: emp.name,
                employeePosition: emp.position,
                amount: adjustedAmount,
                weekStartDate: weekStartStr,
                weekEndDate: formatDateToString(weekEnd),
                dueDate: formatDateToString(dueDate),
                status: "pending",
                paymentMethod: emp.paymentMethod,
                bankName: emp.bankName,
                routingNumber: emp.routingNumber,
                accountNumber: emp.accountNumber,
                accountType: emp.accountType,
                daysWorked: daysWorked,
                isAdjustedForAbsence: isAdjustedForAbsence,
                fullWeeklySalary: emp.weeklyRate,
                deductionAmount: deductionAmount,
              });
            }
          }
        });

        weekStart.setDate(weekStart.getDate() + 7);
      }

      // Only update if there are new payments to add
      if (generatedPayments.length > 0) {
        setPayments([...payments, ...generatedPayments]);
      }
    }
  }, [employees.length, selectedYear, absences]); // Regenerate when employees change

  // Parse date string in local timezone (not UTC)
  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const generatePayments = () => {
    const generatedPayments: PaymentObligation[] = [];
    const seenPaymentIds = new Set<string>();

    // Generate payments for entire selected year
    const startDate = parseLocalDate(`${selectedYear}-01-01`);
    const endDate = parseLocalDate(`${selectedYear}-12-31`);

    // Start from the first Sunday
    const weekStart = new Date(startDate);
    while (weekStart.getDay() !== 0) { // 0 = Sunday
      weekStart.setDate(weekStart.getDate() + 1);
    }

    // Generate all weekly payments
    while (weekStart <= endDate) {
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7); // Next Sunday (7 days)

      employees.forEach((emp) => {
        const empStartDate = parseLocalDate(emp.startDate);
        let canPayThisWeek = weekStart >= empStartDate;

        // Also check payment start date if it exists
        if (canPayThisWeek && emp.paymentStartDate) {
          const empPaymentStartDate = parseLocalDate(emp.paymentStartDate);
          canPayThisWeek = weekStart >= empPaymentStartDate;
        }

        // Generate payments if employee is eligible for this week
        if (canPayThisWeek) {
          const weekStartStr = formatDateToString(weekStart);
          const paymentId = `PAY-${emp.id}-${weekStartStr}`;

          // Skip if we've already generated this payment (deduplication)
          if (seenPaymentIds.has(paymentId)) {
            return;
          }
          seenPaymentIds.add(paymentId);

          const paymentStatus = "pending";

          // Check if this week falls within any absence date range for this employee
          let daysWorked = 5; // Default to full week
          let isAdjustedForAbsence = false;

          for (const absence of absences) {
            if (absence.employeeId === emp.id) {
              const absenceStart = parseLocalDate(absence.fromDate);
              const absenceEnd = parseLocalDate(absence.toDate);

              // Check if the week start date falls within the absence period
              if (weekStart >= absenceStart && weekStart <= absenceEnd) {
                daysWorked = absence.daysWorkedPerWeek;
                isAdjustedForAbsence = true;
                break;
              }
            }
          }

          const dailyRate = emp.weeklyRate / 5;
          const adjustedAmount = dailyRate * daysWorked;
          const deductionAmount = isAdjustedForAbsence ? (dailyRate * (5 - daysWorked)) : 0;
          const dueDate = new Date(weekEnd.getTime() + 86400000); // Next day after week ends

          generatedPayments.push({
            id: paymentId,
            employeeId: emp.id,
            employeeName: emp.name,
            employeePosition: emp.position,
            amount: adjustedAmount,
            weekStartDate: weekStartStr,
            weekEndDate: formatDateToString(weekEnd),
            dueDate: formatDateToString(dueDate),
            status: paymentStatus,
            paymentMethod: emp.paymentMethod,
            bankName: emp.bankName,
            routingNumber: emp.routingNumber,
            accountNumber: emp.accountNumber,
            accountType: emp.accountType,
            daysWorked: daysWorked,
            isAdjustedForAbsence: isAdjustedForAbsence,
            fullWeeklySalary: emp.weeklyRate,
            deductionAmount: deductionAmount,
            paidCheckNumber: emp.checkNumber, // Include employee's check number
          });
        }
      });

      // Move to next week
      weekStart.setDate(weekStart.getDate() + 7);
    }

    setPayments(generatedPayments);
  };

  const handleMarkAsPaid = (paymentId: string) => {
    console.log("📌 handleMarkAsPaid clicked - Opening payment modal");
    console.log("🔑 Payment ID:", paymentId);

    const payment = payments.find(p => p.id === paymentId);
    console.log("💰 Payment found:", payment?.employeeName, "-", payment?.amount);

    setSelectedPaymentId(paymentId);
    setPaidDate(getTodayDate());
    setPaidDeduction(0);
    setPaidCheckNumber("");
    setSelectedPaymentMethod(payment?.paymentMethod || "");
    setBankName("");
    setRoutingNumber("");
    setAccountNumber("");
    setIsPaymentModalOpen(true);

    console.log("🔓 Payment modal opened");
  };

  const handleConfirmPayment = () => {
    console.log("💳 handleConfirmPayment called");
    console.log("📅 paidDate:", paidDate);
    console.log("💳 selectedPaymentMethod:", selectedPaymentMethod);
    console.log("🔑 selectedPaymentId:", selectedPaymentId);

    // Basic validation
    if (!selectedPaymentId) {
      console.error("❌ No payment selected");
      alert("Error: No payment selected");
      return;
    }

    if (!paidDate) {
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

    console.log("✅ Payment found:", payment.employeeName);

    const updatedPayments = payments.map((p) =>
      p.id === selectedPaymentId
        ? {
            ...p,
            status: "paid",
            paidDate,
            paymentMethod: selectedPaymentMethod,
            deductionAmount: paidDeduction,
            paidCheckNumber: selectedPaymentMethod === "check" ? paidCheckNumber : undefined,
            paidAccountLast4: accountNumber ? accountNumber.slice(-4) : payment?.accountNumber?.slice(-4),
            paidBankName: bankName || payment?.bankName,
            bankName: bankName || payment?.bankName,
            routingNumber: routingNumber || payment?.routingNumber,
            accountNumber: accountNumber || payment?.accountNumber
          }
        : p
    );

    console.log("💾 handleConfirmPayment - Marking payment as paid");
    console.log("🔑 Payment ID:", selectedPaymentId);
    console.log("📅 Paid Date:", paidDate);
    console.log("🏦 Method:", selectedPaymentMethod);
    console.log("🔢 Check #:", paidCheckNumber);

    // Log the updated payment object
    const updatedPayment = updatedPayments.find(p => p.id === selectedPaymentId);
    console.log("📦 Full Updated Payment Object:", updatedPayment);

    setPayments(updatedPayments);

    // CRITICAL: Save via multiple methods to ensure persistence
    console.log("💾 SAVING PAYMENT DATA - Multiple methods...");

    // Method 1: Save via saveYearData utility
    try {
      saveYearData("payments", selectedYear, updatedPayments);
      console.log("✅ Method 1: Data saved via saveYearData");
    } catch (error) {
      console.error("❌ Method 1 FAILED:", error);
    }

    // Method 2: Direct localStorage save as backup
    try {
      const key = `payments_${selectedYear}`;
      const jsonString = JSON.stringify(updatedPayments);
      localStorage.setItem(key, jsonString);
      console.log("✅ Method 2: Data saved DIRECTLY to localStorage");
      console.log("🔑 Key:", key);
      console.log("📦 Size:", jsonString.length, "bytes");

      // Verify immediately
      const verified = localStorage.getItem(key);
      if (verified && verified.length > 0) {
        const parsed = JSON.parse(verified);
        const paidCount = parsed.filter((p: PaymentObligation) => p.status === "paid").length;
        console.log("✔️ Verification SUCCESSFUL: localStorage contains", parsed.length, "payments (", paidCount, "paid)");

        // Extra verification: check the specific payment we just updated
        const updatedPaymentId = selectedPaymentId;
        const savedPayment = parsed.find((p: PaymentObligation) => p.id === updatedPaymentId);
        if (savedPayment) {
          console.log("✅ Specific payment verified: Payment", updatedPaymentId, "is in localStorage as status=", savedPayment.status, "with check #", savedPayment.paidCheckNumber);
        } else {
          console.error("❌ Specific payment NOT found in localStorage!");
        }
      } else {
        console.error("❌ Verification FAILED: localStorage is empty or not readable");
      }
    } catch (error) {
      console.error("❌ Method 2 FAILED:", error);
    }

    // Capture values before resetting for toast message
    const checkNumber = paidCheckNumber;
    const method = selectedPaymentMethod;

    // Close modal
    setIsPaymentModalOpen(false);
    setPaidDate("");
    setPaidDeduction(0);
    setPaidCheckNumber("");
    setBankName("");
    setRoutingNumber("");
    setAccountNumber("");
    setSelectedPaymentMethod("");
    setSelectedPaymentId(null);

    // Show success notification
    const methodLabel = method === "check" ? `Check #${checkNumber}` : method?.replace(/_/g, " ") || "payment";
    toast({
      title: "✅ Payment Saved",
      description: `Payment marked as paid via ${methodLabel}`,
    });

    console.log("✅ handleConfirmPayment COMPLETED SUCCESSFULLY");
  };

  const handleMarkAsPending = (paymentId: string) => {
    const updatedPayments = payments.map((p) =>
      p.id === paymentId
        ? { ...p, status: "pending", paidDate: undefined }
        : p
    );
    setPayments(updatedPayments);
    saveYearData("payments", selectedYear, updatedPayments);
  };

  const handleEditAmount = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setEditingPaymentId(paymentId);
      setEditingAmount(payment.amount);
      setIsEditAmountOpen(true);
    }
  };

  const handleConfirmAmountEdit = () => {
    if (!editingPaymentId || editingAmount < 0) {
      alert("Please enter a valid amount");
      return;
    }

    const updatedPayments = payments.map((p) =>
      p.id === editingPaymentId
        ? { ...p, amount: editingAmount }
        : p
    );

    setPayments(updatedPayments);
    saveYearData("payments", selectedYear, updatedPayments);

    setIsEditAmountOpen(false);
    setEditingPaymentId(null);
    setEditingAmount(0);
  };

  const handleEditDays = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    if (payment) {
      setEditingDaysPaymentId(paymentId);
      setEditingDaysWorked(payment.daysWorked || 5);
      setIsEditDaysOpen(true);
    }
  };

  const handleConfirmDaysEdit = () => {
    if (!editingDaysPaymentId || editingDaysWorked < 1 || editingDaysWorked > 7) {
      alert("Please enter a valid number of days (1-7)");
      return;
    }

    const payment = payments.find(p => p.id === editingDaysPaymentId);
    if (!payment) return;

    // Calculate new amount based on days worked
    let weeklyRate = payment.fullWeeklySalary || 0;
    if (!weeklyRate && payment.amount && payment.daysWorked) {
      weeklyRate = (payment.amount / payment.daysWorked) * 5;
    }
    if (!weeklyRate && payment.amount) {
      weeklyRate = payment.amount / 5 * 5;
    }

    const dailyRate = weeklyRate > 0 ? weeklyRate / 5 : 0;
    const newAmount = dailyRate * editingDaysWorked;

    const updatedPayments = payments.map((p) =>
      p.id === editingDaysPaymentId
        ? {
            ...p,
            daysWorked: editingDaysWorked,
            amount: newAmount || payment.amount, // Fallback to original amount
          }
        : p
    );

    setPayments(updatedPayments);
    saveYearData("payments", selectedYear, updatedPayments);

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
      setEditingDownPaymentAmount(payment.downPayment || 0);
      setIsEditDownPaymentOpen(true);
      console.log("✅ Down payment modal opened");
    } else {
      console.error("❌ Payment not found for ID:", paymentId);
    }
  };

  const handleConfirmDownPaymentEdit = () => {
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

    console.log("✅ Found payment to update:", payment.employeeName);
    const downPaymentAmount = editingDownPaymentAmount;

    const updatedPayments = payments.map((p) =>
      p.id === editingDownPaymentPaymentId
        ? { ...p, downPayment: downPaymentAmount }
        : p
    );

    const updatedPayment = updatedPayments.find(p => p.id === editingDownPaymentPaymentId);
    console.log("✅ Updated payment object:", updatedPayment);

    setPayments(updatedPayments);

    // Save to localStorage with error handling
    try {
      saveYearData("payments", selectedYear, updatedPayments);
      console.log("✅ Down payment saved to localStorage");
    } catch (error) {
      console.error("❌ Error saving to localStorage:", error);
      alert("Error saving down payment. Please try again.");
      return;
    }

    // Close modal and reset state
    setIsEditDownPaymentOpen(false);
    setEditingDownPaymentPaymentId(null);
    setEditingDownPaymentAmount(0);

    // Show success message
    toast({
      title: "✅ Success",
      description: `Down payment updated to $${downPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    });

    console.log("✅ Down payment edit completed successfully");
  };

  const handleApplyBulkDays = () => {
    if (bulkDaysValue < 1 || bulkDaysValue > 7) {
      alert("Please enter a valid number of days (1-7)");
      return;
    }

    // Only update pending payments in the current filtered view (current week)
    const pendingPaymentsList = filteredPayments.filter(p => p.status === "pending");
    if (pendingPaymentsList.length === 0) {
      alert("No pending payments to update for this week");
      return;
    }

    // Store the current payments snapshot before making changes (for undo)
    setLastBulkOperation({
      paymentsSnapshot: payments.map(p => ({ ...p })), // Deep copy
    });

    // Get the IDs of payments we want to update
    const pendingPaymentIds = new Set(pendingPaymentsList.map(p => p.id));

    // Update only the pending payments in the filtered view
    const updatedPayments = payments.map((p) => {
      if (pendingPaymentIds.has(p.id)) {
        // Calculate new amount based on days worked
        // Use fullWeeklySalary if available, otherwise calculate from current amount
        let weeklyRate = p.fullWeeklySalary || 0;
        if (!weeklyRate && p.amount && p.daysWorked) {
          weeklyRate = (p.amount / p.daysWorked) * 5;
        }
        if (!weeklyRate && p.amount) {
          weeklyRate = p.amount / 5 * 5; // Assume it was 5 days
        }

        const dailyRate = weeklyRate > 0 ? weeklyRate / 5 : 0;
        const newAmount = dailyRate * bulkDaysValue;

        return {
          ...p,
          daysWorked: bulkDaysValue,
          amount: newAmount || p.amount, // Fallback to original amount if calculation fails
        };
      }
      return p;
    });

    setPayments(updatedPayments);
    saveYearData("payments", selectedYear, updatedPayments);
    setIsBulkDaysOpen(false);
    setBulkDaysValue(5);

    toast({
      title: "Success",
      description: `Updated ${pendingPaymentsList.length} pending payment${pendingPaymentsList.length !== 1 ? 's' : ''} for this week to ${bulkDaysValue} days worked`,
    });
  };

  const handleRevertBulkDays = () => {
    if (!lastBulkOperation) {
      alert("No recent bulk operation to revert");
      return;
    }

    // Restore the previous state
    setPayments(lastBulkOperation.paymentsSnapshot);
    saveYearData("payments", selectedYear, lastBulkOperation.paymentsSnapshot);
    setLastBulkOperation(null);

    toast({
      title: "✓ Reverted",
      description: "Bulk set days operation has been reverted.",
    });
  };

  const getCompanySettings = () => {
    const saved = localStorage.getItem("companySettings");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  };

  const handlePrintCheck = (paymentId: string) => {
    setSelectedCheckPaymentId(paymentId);
    setIsCheckPrintModalOpen(true);
  };

  const handleRemovePayment = (paymentId: string) => {
    setSelectedDeletePaymentId(paymentId);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmRemovePayment = () => {
    if (!selectedDeletePaymentId) return;

    const paymentToRemove = payments.find(p => p.id === selectedDeletePaymentId);
    setPayments(payments.filter(p => p.id !== selectedDeletePaymentId));

    setIsDeleteConfirmOpen(false);
    setSelectedDeletePaymentId(null);

    if (paymentToRemove) {
      toast({
        title: "Payment Removed",
        description: `Payment for ${paymentToRemove.employeeName} (${new Date(paymentToRemove.weekStartDate).toLocaleDateString()}) has been removed.`,
      });
    }
  };

  // Find the earliest pending payment date (coming week to pay)
  const upcomingPaymentWeek = (() => {
    // Find the earliest week with pending payments using string comparison to avoid timezone issues
    const pendingPayments = payments.filter(p => p.status === "pending");
    if (pendingPayments.length > 0) {
      // Use string comparison on YYYY-MM-DD format (lexicographic ordering works correctly)
      return pendingPayments.reduce((earliest, p) => {
        if (!earliest || p.weekStartDate < earliest) {
          return p.weekStartDate;
        }
        return earliest;
      }, null);
    }

    // If no pending payments, show the earliest week (first week of year)
    // This way, if week 1 is all paid, it shows week 1's paid status
    if (payments.length > 0) {
      // Use string comparison on YYYY-MM-DD format (lexicographic ordering works correctly)
      return payments.reduce((earliest, p) => {
        if (!earliest || p.weekStartDate < earliest) {
          return p.weekStartDate;
        }
        return earliest;
      }, null);
    }

    return null;
  })();

  const filteredPayments = payments
    .filter((p) => {
      const statusMatch = filterStatus === "all" || p.status === filterStatus;
      const employeeMatch = filterEmployee === "all" || p.employeeId === filterEmployee;

      let dateMatch = true;

      // If user set manual date filters, use those
      if (filterFromDate || filterToDate) {
        const paymentDate = parseLocalDate(p.dueDate);

        if (filterFromDate) {
          const fromDate = parseLocalDate(filterFromDate);
          if (paymentDate < fromDate) dateMatch = false;
        }
        if (filterToDate) {
          const toDate = parseLocalDate(filterToDate);
          if (paymentDate > toDate) dateMatch = false;
        }
      } else if (upcomingPaymentWeek) {
        // Otherwise, default to showing only the coming week's payments
        dateMatch = p.weekStartDate === upcomingPaymentWeek;
      }

      return statusMatch && employeeMatch && dateMatch;
    })
    .sort((a, b) => {
      // Primary sort: by Employee ID in ascending order (EMP-001, EMP-002, etc.)
      const aIdMatch = a.employeeId.match(/EMP-(\d+)/);
      const bIdMatch = b.employeeId.match(/EMP-(\d+)/);

      if (aIdMatch && bIdMatch) {
        const aNum = parseInt(aIdMatch[1], 10);
        const bNum = parseInt(bIdMatch[1], 10);
        if (aNum !== bNum) {
          return aNum - bNum;
        }
      }

      // Secondary sort: by dueDate in ascending order (oldest first)
      const aDate = parseLocalDate(a.dueDate);
      const bDate = parseLocalDate(b.dueDate);
      return aDate.getTime() - bDate.getTime();
    });

  const pendingPayments = filteredPayments.filter((p) => p.status === "pending");
  const paidPayments = filteredPayments.filter((p) => p.status === "paid");
  const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPaid = paidPayments.reduce((sum, p) => {
    const deduction = p.deductionAmount || 0;
    return sum + ((p.amount || 0) - deduction);
  }, 0);

  // Calculate all-time totals (across all weeks, not filtered by week)
  const allTimePaidPayments = payments.filter((p) => p.status === "paid");
  const allTimeTotalPaid = allTimePaidPayments.reduce((sum, p) => {
    const deduction = p.deductionAmount || 0;
    return sum + ((p.amount || 0) - deduction);
  }, 0);

  const allTimePendingPayments = payments.filter((p) => p.status === "pending");
  const allTimeTotalPending = allTimePendingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Calculate weekly obligation (total of all employees' weekly rates)
  const weeklyObligation = employees.reduce((sum, e) => sum + (e.weeklyRate || 0), 0);

  const allTimeOverduePayments = payments.filter((p) => p.status === "overdue");
  const allTimeTotalOverdue = allTimeOverduePayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const handleMarkAllAsPaid = () => {
    const today = getTodayDate();
    const pendingCount = filteredPayments.filter(p => p.status === "pending").length;

    if (!isAllMarkedAsPaid) {
      // Mark all pending as paid
      if (pendingCount === 0) {
        toast({ description: "No pending payments to mark as paid" });
        return;
      }

      const updatedPayments = payments.map((p) =>
        p.status === "pending"
          ? { ...p, status: "paid", paidDate: today }
          : p
      );
      setPayments(updatedPayments);
      saveYearData("payments", selectedYear, updatedPayments);

      setIsAllMarkedAsPaid(true);
      toast({
        title: "Success",
        description: `${pendingCount} payment${pendingCount !== 1 ? 's' : ''} marked as paid`,
      });
    } else {
      // Revert all paid payments back to pending (regardless of date)
      const updatedPayments = payments.map((p) =>
        p.status === "paid"
          ? { ...p, status: "pending", paidDate: undefined }
          : p
      );
      setPayments(updatedPayments);
      saveYearData("payments", selectedYear, updatedPayments);

      setIsAllMarkedAsPaid(false);
      toast({
        title: "Reverted",
        description: "All payments reverted to pending",
      });
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && new Date().toDateString() !== new Date(dueDate).toDateString();
  };

  const handleAddPayment = () => {
    if (!addPaymentEmployeeId) {
      alert("Please select an employee");
      return;
    }
    if (!addPaymentReason) {
      alert("Please enter a reason for this payment");
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

    // Validate that the date is in 2026
    const parts = addPaymentDate.split('-');
    const paymentYear = parseInt(parts[0], 10);
    if (paymentYear !== 2026) {
      alert("Payment dates must be in 2026. Please select a date within 2026.");
      return;
    }

    const employee = employees.find(emp => emp.id === addPaymentEmployeeId);
    if (!employee) {
      alert("Employee not found");
      return;
    }

    // Calculate week start date (Sunday) from the payment date
    const paymentDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const weekStartDate = new Date(paymentDateObj);
    weekStartDate.setDate(paymentDateObj.getDate() - paymentDateObj.getDay()); // Go to Sunday
    const weekStartYear = weekStartDate.getFullYear();
    const month = String(weekStartDate.getMonth() + 1).padStart(2, '0');
    const day = String(weekStartDate.getDate()).padStart(2, '0');
    const weekStartStr = `${weekStartYear}-${month}-${day}`;

    // Calculate week end date (Saturday)
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    const weekEndYear = weekEndDate.getFullYear();
    const weekEndMonth = String(weekEndDate.getMonth() + 1).padStart(2, '0');
    const weekEndDay = String(weekEndDate.getDate()).padStart(2, '0');
    const weekEndStr = `${weekEndYear}-${weekEndMonth}-${weekEndDay}`;

    // Calculate dueDate as the day after weekEndDate
    const dueDateObj = new Date(weekEndDate);
    dueDateObj.setDate(weekEndDate.getDate() + 1);
    const dueDateYear = dueDateObj.getFullYear();
    const dueDateMonth = String(dueDateObj.getMonth() + 1).padStart(2, '0');
    const dueDateDay = String(dueDateObj.getDate()).padStart(2, '0');
    const dueDateStr = `${dueDateYear}-${dueDateMonth}-${dueDateDay}`;

    // Create the payment
    const newPayment: PaymentObligation = {
      id: `MANUAL-${employee.id}-${weekStartStr}-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeePosition: employee.position,
      amount: addPaymentAmount,
      weekStartDate: weekStartStr,
      weekEndDate: weekEndStr,
      dueDate: dueDateStr,
      status: "pending",
      paymentMethod: employee.paymentMethod,
      bankName: employee.bankName,
      routingNumber: employee.routingNumber,
      accountNumber: employee.accountNumber,
      accountType: employee.accountType,
      daysWorked: 5,
      isAdjustedForAbsence: false,
      fullWeeklySalary: employee.weeklyRate,
      deductionAmount: 0,
      notes: addPaymentReason,
    };

    // Add payment to list and save
    const updatedPayments = [...payments, newPayment];
    setPayments(updatedPayments);

    // Explicitly save to localStorage immediately
    saveYearData("payments", selectedYear, updatedPayments);

    // Reset form and close modal
    setIsAddPaymentModalOpen(false);
    setAddPaymentEmployeeId("");
    setAddPaymentReason("");
    setAddPaymentAmount(0);
    setAddPaymentDate("");

    // Show success notification
    toast({
      title: "✓ Payment Added",
      description: `$${addPaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} payment for ${employee.name} has been added to pending payments.`,
    });
  };

  // Handler for adding weekly payments
  const handleAddWeekPayments = () => {
    if (!weekStartDate) {
      alert("Please select a week start date");
      return;
    }

    if (selectedEmployeesForWeek.size === 0) {
      alert("Please select at least one employee");
      return;
    }

    // Parse the week start date
    const parts = weekStartDate.split('-');
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
    const dueDate = new Date(weekEnd);
    dueDate.setDate(weekEnd.getDate() + 1);

    // Helper to format dates
    const formatDateStr = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const weekStartStr = formatDateStr(weekStart);
    const weekEndStr = formatDateStr(weekEnd);
    const dueDateStr = formatDateStr(dueDate);

    // Check if payments for this week already exist
    const existingPaymentIds = new Set<string>();
    payments.forEach(p => {
      if (p.weekStartDate === weekStartStr) {
        existingPaymentIds.add(p.employeeId);
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
    const newPayments: PaymentObligation[] = [];
    selectedEmployeesForWeek.forEach(empId => {
      const employee = employees.find(e => e.id === empId);
      if (employee) {
        // Calculate amount based on days worked
        const dailyRate = employee.weeklyRate / 5;
        const amount = dailyRate * weekDaysWorked;

        newPayments.push({
          id: `PAY-${employee.id}-${weekStartStr}`,
          employeeId: employee.id,
          employeeName: employee.name,
          employeePosition: employee.position,
          amount: amount,
          weekStartDate: weekStartStr,
          weekEndDate: weekEndStr,
          dueDate: dueDateStr,
          status: "pending",
          paymentMethod: employee.paymentMethod,
          bankName: employee.bankName,
          routingNumber: employee.routingNumber,
          accountNumber: employee.accountNumber,
          accountType: employee.accountType,
          daysWorked: weekDaysWorked,
          isAdjustedForAbsence: false,
          fullWeeklySalary: employee.weeklyRate,
          deductionAmount: 0,
        });
      }
    });

    // Add all new payments and save
    const updatedPayments = [...payments, ...newPayments];
    setPayments(updatedPayments);
    saveYearData("payments", selectedYear, updatedPayments);

    // Reset form and close modal
    setIsAddWeekModalOpen(false);
    setWeekStartDate("");
    setSelectedEmployeesForWeek(new Set());
    setWeekDaysWorked(5);

    // Show success notification
    toast({
      title: "✓ Week Added",
      description: `Added payments for ${newPayments.length} employee(s) for the week of ${weekStartStr}`,
    });
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
      saveYearData("payments", selectedYear, updatedPayments);
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
      saveYearData("payments", selectedYear, updatedPayments);
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
      setCheckDetailsNumber(payment.paidCheckNumber || "");
      setCheckDetailsBankName(payment.paidBankName || "");
      setCheckDetailsAccountLast4(payment.paidAccountLast4 || "");
      setIsCheckDetailsModalOpen(true);
    }
  };

  const handleConfirmCheckDetailsEdit = () => {
    if (!checkDetailsPaymentId) return;

    const updatedPayments = payments.map((p) =>
      p.id === checkDetailsPaymentId
        ? {
            ...p,
            paidCheckNumber: checkDetailsNumber,
            paidBankName: checkDetailsBankName,
            paidAccountLast4: checkDetailsAccountLast4,
          }
        : p
    );

    console.log("💾 handleConfirmCheckDetailsEdit - Updating check details");
    console.log("🔑 Payment ID:", checkDetailsPaymentId);
    console.log("🔢 Check Number:", checkDetailsNumber);
    console.log("🏦 Bank Name:", checkDetailsBankName);
    console.log("💳 Account Last 4:", checkDetailsAccountLast4);

    setPayments(updatedPayments);
    saveYearData("payments", selectedYear, updatedPayments);

    console.log("✅ Check details saved to localStorage");

    setIsCheckDetailsModalOpen(false);
    setCheckDetailsPaymentId(null);
    setCheckDetailsNumber("");
    setCheckDetailsBankName("");
    setCheckDetailsAccountLast4("");

    toast({
      title: "Success",
      description: "Check details updated successfully",
    });
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
          return payment?.paidCheckNumber ? `Check #${payment.paidCheckNumber}` : "Check";
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
        return `Direct Deposit (${payment.paidBankName || ""} ••••${payment.paidAccountLast4 || ""})`;
      case "check":
        return `Check #${payment.paidCheckNumber || "N/A"}`;
      case "ach":
        return `ACH Transfer (••••${payment.paidAccountLast4 || ""})`;
      case "wire":
        return `Wire Transfer (${payment.paidBankName || ""})`;
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
              const overdueAmount = pendingPayments.filter((p) => isOverdue(p.dueDate)).reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
              const overdueCount = pendingPayments.filter((p) => isOverdue(p.dueDate)).length;
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
                  disabled={filteredPayments.filter(p => p.status === "paid" && p.paymentMethod === "check").length === 0}
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
                        <p className="font-semibold">{payment.employeeId} - {payment.employeeName}</p>
                      </td>
                      <td className="p-3 text-slate-700 text-xs whitespace-nowrap">
                        <span>{new Date(payment.weekStartDate).toLocaleDateString()} to {new Date(payment.weekEndDate).toLocaleDateString()}</span>
                        {payment.daysWorked !== 5 && (
                          <span className="text-yellow-700 font-semibold ml-2">({payment.daysWorked}/5 days)</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        <div className="space-y-1">
                          {payment.isAdjustedForAbsence ? (
                            <div className="bg-orange-50 p-2 rounded border border-orange-200 text-xs space-y-1">
                              <div className="flex justify-between text-orange-900">
                                <span>Full Salary:</span>
                                <span className="line-through whitespace-nowrap">${(payment.fullWeeklySalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-red-700 font-semibold">
                                <span>Deduction:</span>
                                <span className="whitespace-nowrap">-${(payment.deductionAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                          {payment.downPayment && payment.downPayment > 0 && (
                            <div className="bg-cyan-50 p-2 rounded border border-cyan-200 text-xs space-y-1">
                              <div className="flex justify-between text-cyan-900">
                                <span>Down Payment:</span>
                                <span className="whitespace-nowrap">-${(payment.downPayment || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                              <div className="flex justify-between text-cyan-700 font-semibold border-t border-cyan-200 pt-1">
                                <span>Net Payment:</span>
                                <span className="whitespace-nowrap">${((payment.amount || 0) - (payment.downPayment || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isOverdue(payment.dueDate) && payment.status === "pending" && (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          )}
                          {formatDateString(payment.dueDate)}
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        {payment.status === "paid" && payment.paymentMethod === "check" ? (
                          <button
                            onClick={() => handleEditCheckDetails(payment.id)}
                            className={`px-3 py-1.5 rounded-full inline-block text-sm font-medium whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity ${
                              payment.paymentMethod === 'direct_deposit' ? 'bg-blue-100 text-blue-700' :
                              payment.paymentMethod === 'check' ? 'bg-purple-100 text-purple-700' :
                              payment.paymentMethod === 'cash' ? 'bg-green-100 text-green-700' :
                              payment.paymentMethod === 'ach' ? 'bg-teal-100 text-teal-700' :
                              payment.paymentMethod === 'wire' ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-700'
                            }`}
                            title="Click to edit check details"
                          >
                            <span>{getPaymentMethodDisplay(payment.paymentMethod, payment)}</span>
                          </button>
                        ) : (
                          <div className={`px-3 py-1.5 rounded-full inline-block text-sm font-medium whitespace-nowrap ${
                            payment.paymentMethod === 'direct_deposit' ? 'bg-blue-100 text-blue-700' :
                            payment.paymentMethod === 'check' ? 'bg-purple-100 text-purple-700' :
                            payment.paymentMethod === 'cash' ? 'bg-green-100 text-green-700' :
                            payment.paymentMethod === 'ach' ? 'bg-teal-100 text-teal-700' :
                            payment.paymentMethod === 'wire' ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            <span>{getPaymentMethodDisplay(payment.paymentMethod, payment)}</span>
                          </div>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {payment.status === "paid" ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-xs font-medium text-green-700">Paid {new Date(payment.paidDate!).toLocaleDateString()}</span>
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
                        {payment.status === "paid" && payment.deductionAmount && payment.deductionAmount > 0 && (
                          <div className="bg-red-50 p-2 rounded border border-red-200 text-xs mt-2">
                            <div className="text-red-700 font-medium">
                              Deduction: ${(payment.deductionAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-green-700 font-bold mt-1">
                              Paid Amount: ${((payment.amount || 0) - (payment.deductionAmount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      <span className="font-medium">Employee:</span> {selectedPayment.employeeName}
                    </p>
                    <p className="text-sm text-slate-600 mt-1 whitespace-nowrap">
                      <span className="font-medium">Original Amount:</span> ${(selectedPayment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">Payment Method:</span> {getPaymentMethodDisplay(selectedPayment.paymentMethod)}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="paidDate">Payment Date *</Label>
                  <Input
                    id="paidDate"
                    type="date"
                    value={paidDate}
                    onChange={(e) => setPaidDate(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method *</Label>
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
                    <Label htmlFor="paidCheckNumber">Check Number</Label>
                    <Input
                      id="paidCheckNumber"
                      type="text"
                      value={paidCheckNumber}
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
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="e.g., Wells Fargo, Chase Bank"
                        className="border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input
                        id="routingNumber"
                        type="text"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                        placeholder="9-digit routing number"
                        className="border-slate-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        type="password"
                        value={accountNumber}
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
                        value={paidCheckNumber}
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
                  {payment && `Adjust amount for ${payment.employeeName}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {payment && (
                  <>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Employee:</span> {payment.employeeName}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Week:</span> {new Date(payment.weekStartDate).toLocaleDateString()} - {new Date(payment.weekEndDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Days Worked:</span> {payment.daysWorked}/5
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
        let weeklyRate = payment.fullWeeklySalary || 0;
        if (!weeklyRate && payment.amount && payment.daysWorked) {
          weeklyRate = (payment.amount / payment.daysWorked) * 5;
        }
        if (!weeklyRate && payment.amount) {
          weeklyRate = payment.amount / 5 * 5;
        }

        const dailyRate = weeklyRate > 0 ? weeklyRate / 5 : 0;
        const newAmount = dailyRate * editingDaysWorked;

        return (
          <Dialog open={isEditDaysOpen} onOpenChange={setIsEditDaysOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Days Worked</DialogTitle>
                <DialogDescription>
                  {payment && `Adjust days worked for ${payment.employeeName}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {payment && (
                  <>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Employee:</span> {payment.employeeName}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Week:</span> {new Date(payment.weekStartDate).toLocaleDateString()} - {new Date(payment.weekEndDate).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Weekly Rate:</span> ${(weeklyRate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  {payment && `Adjust down payment for ${payment.employeeName}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {payment && (
                  <>
                    <div className="bg-slate-50 p-3 rounded border border-slate-200">
                      <p className="text-sm text-slate-600">
                        <span className="font-medium">Employee:</span> {payment.employeeName}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        <span className="font-medium">Week:</span> {new Date(payment.weekStartDate).toLocaleDateString()} - {new Date(payment.weekEndDate).toLocaleDateString()}
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
                        let weeklyRate = payment.fullWeeklySalary || 0;
                        if (!weeklyRate && payment.amount && payment.daysWorked) {
                          weeklyRate = (payment.amount / payment.daysWorked) * 5;
                        }
                        if (!weeklyRate && payment.amount) {
                          weeklyRate = payment.amount / 5 * 5;
                        }

                        const dailyRate = weeklyRate > 0 ? weeklyRate / 5 : 0;
                        const newAmount = dailyRate * bulkDaysValue;
                        return (
                          <div key={payment.id} className="text-xs text-slate-700 flex justify-between items-center py-1 px-2 hover:bg-slate-100 rounded">
                            <span className="flex-1">{payment.employeeName}</span>
                            <span className="text-slate-500 text-xs mx-2">{new Date(payment.weekStartDate).toLocaleDateString()}</span>
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
        const settings = getCompanySettings();

        if (!payment) return null;

        const checkNumber = settings?.checkStartNumber ? settings.checkStartNumber + payments.filter((p) => new Date(p.weekStartDate) <= new Date(payment.weekStartDate)).length : 1001;

        return (
          <Dialog open={isCheckPrintModalOpen} onOpenChange={setIsCheckPrintModalOpen}>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Print Check</DialogTitle>
                <DialogDescription>
                  Check for {payment.employeeName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Professional Check Template */}
                <div className="p-8 bg-white border-4 border-slate-800 rounded-lg" style={{ width: '100%', minHeight: '450px', fontFamily: '"Courier New", monospace', backgroundColor: '#fafafa', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {/* Bank routing box (top right) */}
                  <div style={{ float: 'right', textAlign: 'right', marginBottom: '10px', fontSize: '10px', color: '#666' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold' }}>{checkNumber.toString().padStart(4, '0')}</div>
                    <div style={{ fontSize: '9px' }}>Check #</div>
                  </div>

                  {/* Company Header */}
                  <div style={{ marginBottom: '15px', borderBottom: '3px solid #1f2937', paddingBottom: '10px' }}>
                    {settings?.companyName && (
                      <>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#1f2937' }}>{settings.companyName}</div>
                        <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>{settings.companyAddress}</div>
                        <div style={{ fontSize: '11px', color: '#4b5563' }}>{settings.companyCity}, {settings.companyState} {settings.companyZip}</div>
                        <div style={{ fontSize: '11px', color: '#4b5563' }}>{settings.companyPhone}</div>
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
                      {payment.employeeName}
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
                      {payment.isSeverance ? 'Severance Payment' : `Week of ${new Date(payment.weekStartDate).toLocaleDateString()}`}
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
                    |{settings?.routingNumber?.padEnd(9, '0') || '000000000'}|{payment.employeeId.padEnd(12, ' ')}|{checkNumber.toString().padStart(8, '0')}|
                  </div>

                  {/* Bank Info Footer */}
                  {settings && (
                    <div style={{ marginTop: '15px', fontSize: '9px', color: '#666', textAlign: 'center', borderTop: '2px dashed #ccc', paddingTop: '8px' }}>
                      <div>{settings.bankName} • Routing #: {settings.routingNumber} • Account: ••••{settings.accountNumber?.slice(-4)}</div>
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
                    onClick={() => generateCheckPDF(payment, checkNumber, settings)}
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
                    <span className="font-medium">Employee:</span> {paymentToDelete.employeeName}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Week:</span> {new Date(paymentToDelete.weekStartDate).toLocaleDateString()} to {new Date(paymentToDelete.weekEndDate).toLocaleDateString()}
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
                  {payment && `Upload check image for ${payment.employeeName}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {payment && (
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Employee:</span> {payment.employeeName}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">Amount:</span> ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-600 mt-1">
                      <span className="font-medium">Week:</span> {new Date(payment.weekStartDate).toLocaleDateString()} - {new Date(payment.weekEndDate).toLocaleDateString()}
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
                  {payment && `Update check information for ${payment.employeeName}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {payment && (
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Employee:</span> {payment.employeeName}
                    </p>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Amount:</span> ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Week:</span> {new Date(payment.weekStartDate).toLocaleDateString()} - {new Date(payment.weekEndDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">Paid Date:</span> {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : "N/A"}
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
            {filteredPayments.filter(p => p.status === "paid" && p.paymentMethod === "check").length === 0 ? (
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
                    .filter(p => p.status === "paid" && p.paymentMethod === "check")
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
                          <p className="font-medium text-slate-900">{payment.employeeName}</p>
                          <p className="text-sm text-slate-600">
                            Check #{payment.paidCheckNumber} • {new Date(payment.weekStartDate).toLocaleDateString()} • ${(payment.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                          .filter(p => p.status === "paid" && p.paymentMethod === "check")
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
              <Label htmlFor="weekStartDate">Week Start Date (Sunday) *</Label>
              <Input
                id="weekStartDate"
                type="date"
                value={weekStartDate}
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
                        {emp.name} ({emp.id}) - ${(emp.weeklyRate || 0).toLocaleString()}
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
