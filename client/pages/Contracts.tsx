import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Edit2, Trash2, Download, Printer, ChevronRight, ChevronLeft, Paperclip, FileIcon, X, CircleDollarSign, FileText } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { getTodayDate, formatDateString, generateShortId } from "@/utils/yearStorage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  contractsService,
  materialsService,
  billsService,
  type Contract,
  type Material,
  type Bill,
} from "@/lib/supabase-service";
import { Toaster } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  isBankTransferMethod,
  isWireTransferMethod,
  paymentMethodEmojiLabel,
  paymentMethodPlainLabel,
} from "@/utils/payment-methods";

interface Payment {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid";
  paid_date?: string;
  payment_method?: string;
  
  // Credit Card & Debit Card fields
  cardholder_name?: string;
  card_last4?: string;
  card_expiration?: string;
  authorization_code?: string;
  payment_processor?: string; // Stripe, Square, etc.
  credit_card_last4?: string; // Keep for backwards compatibility
  
  // Cash fields
  received_by?: string;
  payment_location?: string;
  receipt_number?: string;
  notes?: string;
  
  // Wire Transfer fields
  sending_bank_name?: string;
  sender_name?: string;
  wire_reference_number?: string;
  account_last4?: string;
  transfer_date?: string;
  
  // Bank Transfer (ACH) fields
  bank_name?: string;
  routing_number?: string;
  account_number?: string;
  account_type?: string;
  ach_transaction_id?: string;
  
  // Zelle fields
  zelle_email?: string;
  zelle_phone?: string;
  zelle_confirmation_number?: string;
  
  // Direct Deposit fields
  depositor_name?: string;
  deposit_reference_number?: string;
  deposit_date?: string;
  
  // Check fields
  check_number?: string;
  check_bank_name?: string;
  check_account_holder?: string;
  check_deposit_date?: string;
  check_front_image?: string;
  check_back_image?: string;
  check_status?: "pending" | "cleared" | "bounced";
  check_attachment?: string; // Keep for backwards compatibility
  
  // Common fields
  transaction_reference?: string;
  receipt_attachment?: string;
  confirmation_upload?: string;

  // Partial payments tracking (optional)
  partial_payments?: PartialPayment[];
  partialPayments?: PartialPayment[];
}

interface PartialPayment {
  id: string;
  amount: number;
  date: string;
  method: "cash" | "check" | "wire" | "ach" | "credit_card" | "debit_card" | "direct_deposit" | "zelle";
  description?: string;
  receipt_attachment?: string;
  transaction_reference?: string;

  // Bank-like details (optional)
  bank_name?: string;
  routing_number?: string;
  account_number?: string;
  account_type?: string;

  // Check details (optional)
  check_number?: string;
  check_attachment?: string;

  // Card details (optional)
  card_last4?: string;
}

const normalizePaymentMethodValue = (
  value: any
):
  | "cash"
  | "credit_card"
  | "debit_card"
  | "check"
  | "direct_deposit"
  | "ach"
  | "wire"
  | "zelle" => {
  const v = String(value ?? "").trim();
  if (v === "wire_transfer") return "wire";
  if (v === "bank_transfer") return "ach";
  if (v === "cash") return "cash";
  if (v === "credit_card") return "credit_card";
  if (v === "debit_card") return "debit_card";
  if (v === "check") return "check";
  if (v === "direct_deposit") return "direct_deposit";
  if (v === "ach") return "ach";
  if (v === "wire") return "wire";
  if (v === "zelle") return "zelle";
  return "cash";
};

const normalizePartialPayment = (raw: any): PartialPayment => {
  const method = normalizePaymentMethodValue(raw?.method ?? raw?.paymentMethod);
  return {
    id: String(raw?.id ?? `PP-${Date.now()}-${Math.random().toString(36).slice(2)}`),
    amount: Number(raw?.amount ?? 0),
    date: String(raw?.date ?? raw?.paidDate ?? raw?.paid_date ?? getTodayDate()),
    method,
    description: raw?.description ?? "",
    receipt_attachment: raw?.receipt_attachment ?? raw?.receiptAttachment ?? "",
    transaction_reference:
      raw?.transaction_reference ?? raw?.transactionReference ?? raw?.authorizationCode ?? "",
    bank_name: raw?.bank_name ?? raw?.bankName ?? "",
    routing_number: raw?.routing_number ?? raw?.routingNumber ?? "",
    account_number: raw?.account_number ?? raw?.accountNumber ?? "",
    account_type: raw?.account_type ?? raw?.accountType ?? "",
    check_number: raw?.check_number ?? raw?.checkNumber ?? "",
    check_attachment: raw?.check_attachment ?? raw?.checkAttachment ?? "",
    card_last4: raw?.card_last4 ?? raw?.creditCardLast4 ?? raw?.cardLast4 ?? "",
  };
};

const normalizePayment = (raw: any): Payment => {
  const paymentMethod = normalizePaymentMethodValue(raw?.payment_method ?? raw?.paymentMethod);
  const partialsRaw = raw?.partial_payments ?? raw?.partialPayments;
  const partialPayments = Array.isArray(partialsRaw)
    ? partialsRaw.map(normalizePartialPayment)
    : [];

  return {
    id: String(raw?.id ?? ""),
    description: String(raw?.description ?? ""),
    amount: Number(raw?.amount ?? 0),
    due_date: String(raw?.due_date ?? raw?.dueDate ?? ""),
    status: (raw?.status === "paid" ? "paid" : "pending") as "pending" | "paid",
    paid_date: String(raw?.paid_date ?? raw?.paidDate ?? ""),
    payment_method: paymentMethod,
    transaction_reference:
      String(raw?.transaction_reference ?? raw?.transactionReference ?? ""),
    receipt_attachment: String(raw?.receipt_attachment ?? raw?.receiptAttachment ?? ""),
    bank_name: String(raw?.bank_name ?? raw?.bankName ?? ""),
    routing_number: String(raw?.routing_number ?? raw?.routingNumber ?? ""),
    account_number: String(raw?.account_number ?? raw?.accountNumber ?? ""),
    account_type: String(raw?.account_type ?? raw?.accountType ?? ""),
    check_number: String(raw?.check_number ?? raw?.checkNumber ?? ""),
    check_attachment: String(raw?.check_attachment ?? raw?.checkAttachment ?? ""),
    card_last4:
      String(
        raw?.card_last4 ??
          raw?.cardLast4 ??
          raw?.creditCardLast4 ??
          raw?.credit_card_last4 ??
          ""
      ),
    credit_card_last4:
      raw?.credit_card_last4 ?? raw?.creditCardLast4 ?? raw?.credit_card_last4,
    partial_payments: partialPayments,
  };
};

interface MaterialItem {
  id: string;
  name: string;
  unit_price: number;
  quantity: number;
  unit: string;
  supplier?: string;
}

interface LaborCost {
  calculation_method: "manual" | "daily" | "monthly" | "hours";
  amount: number;
  daily_rate?: number;
  days?: number;
  monthly_rate?: number;
  months?: number;
  hourly_rate?: number;
  hours?: number;
  description: string;
}

interface MiscellaneousItem {
  id: string;
  description: string;
  amount: number;
}

interface Expense {
  id: string;
  invoice_number: string;
  vendor: string;
  amount: number;
  purchase_date: string;
  category: "Materials" | "Labor" | "Permits" | "Other";
  description: string;
  notes: string;
  file_name?: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string;
  uploadDate?: string;
}

const normalizeAttachments = (raw: any): Attachment[] => {
  const list = Array.isArray(raw) ? raw : [];

  return list
    .map((att: any): Attachment | null => {
      if (!att) return null;

      // Already in the expected shape
      if (typeof att.fileName === "string" && typeof att.fileData === "string") {
        return {
          id: String(att.id ?? `ATT-${Date.now()}-${Math.random().toString(36).slice(2)}`),
          fileName: String(att.fileName ?? "Attachment"),
          fileType: String(att.fileType ?? ""),
          fileSize: Number(att.fileSize ?? 0) || 0,
          fileData: String(att.fileData ?? ""),
          uploadDate: att.uploadDate ? String(att.uploadDate) : undefined,
        };
      }

      // Stored contract attachment shape
      if (typeof att.file_name === "string" && typeof att.file_data === "string") {
        const dataUri = String(att.file_data ?? "");
        const inferredType = dataUri.startsWith("data:") ? dataUri.slice(5).split(";")[0] : "";

        return {
          id: String(att.id ?? `ATT-${Date.now()}-${Math.random().toString(36).slice(2)}`),
          fileName: String(att.file_name ?? "Attachment"),
          fileType: String(att.file_type ?? inferredType ?? ""),
          fileSize: Number(att.file_size ?? att.fileSize ?? 0) || 0,
          fileData: dataUri,
          uploadDate: att.upload_date ? String(att.upload_date) : undefined,
        };
      }

      return null;
    })
    .filter((a: Attachment | null): a is Attachment => Boolean(a && a.fileData && a.fileName));
};

interface ContractAttachment {
  id: string;
  file_name: string;
  file_data: string; // Base64 encoded file data
  upload_date: string;
  description?: string;
}



interface CostTracking {
  materials: MaterialItem[];
  labor_cost: LaborCost;
  miscellaneous: MiscellaneousItem[];
  profit_margin_percent: number;
}

interface FormData {
  client_name: string;
  client_address: string;
  client_city: string;
  client_state: string;
  client_zip: string;
  project_location: string;
  client_phone: string;
  client_email: string;
  project_description: string;
  project_name: string;
  deposit_amount: string;
  total_value: string;
  start_date: string;
  due_date: string;
  status: "pending" | "in-progress" | "completed";
  cabinet_type: string;
  material: string;
  custom_finish: string;
  installation_included: boolean;
  additional_notes: string;
}

const CABINET_TYPES = ["Kitchen", "Bathroom", "Office", "Bedroom", "Living Room", "Custom"];
const FINISHES = ["Paint", "Stain", "Both (Stain & Paint)", "Natural/Unfinished", "Other"];

const MONTH_LABELS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_LABELS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];


// Function to get materials from storage or defaults
const getMaterialsForContracts = (materials: Material[]): MaterialItem[] => {
  return materials.map(m => ({
    id: m.id,
    name: m.name,
    unit_price: m.unit_price,
    quantity: 0,
    unit: m.unit || "EA",
    supplier: m.supplier || ""
  }));
};

export default function Contracts() {
  const { selectedYear } = useYear();
  const { toast } = useToast();
  const { user } = useAuth();

  // Helper function to ensure costTracking is always fully initialized
  const initializeCostTracking = (partial?: any): CostTracking => {
    return {
      materials: partial?.materials || [],
      labor_cost: {
        calculation_method: partial?.labor_cost?.calculation_method ?? "manual",
        amount: partial?.labor_cost?.amount ?? 0,
        description: partial?.labor_cost?.description ?? "",
        daily_rate: partial?.labor_cost?.daily_rate ?? 900,
        days: partial?.labor_cost?.days ?? 0,
        monthly_rate: partial?.labor_cost?.monthly_rate ?? 18000,
        months: partial?.labor_cost?.months ?? 0,
        hourly_rate: partial?.labor_cost?.hourly_rate ?? 50,
        hours: partial?.labor_cost?.hours ?? 0,
      },
      miscellaneous: partial?.miscellaneous || [],
      profit_margin_percent: partial?.profit_margin_percent ?? 35,
    };
  };

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableMaterials, setAvailableMaterials] = useState<MaterialItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "in-progress" | "pending" | "completed">("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");
  const [filterPaymentMonth, setFilterPaymentMonth] = useState<string>("all");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [budgetSummaryContractId, setBudgetSummaryContractId] = useState<string | null>(null);
  const [pdfSelectContractId, setPdfSelectContractId] = useState<string | null>(null);
  const [detailsContractId, setDetailsContractId] = useState<string | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorMaterials, setCalculatorMaterials] = useState<MaterialItem[]>([]);
  const [paymentForm, setPaymentForm] = useState<Payment>({
    id: "",
    description: "",
    amount: 0,
    due_date: "",
    status: "pending",
    paid_date: "",
    payment_method: "cash",
    
    // Credit Card & Debit Card fields
    cardholder_name: "",
    card_last4: "",
    card_expiration: "",
    authorization_code: "",
    payment_processor: "",
    credit_card_last4: "",
    
    // Cash fields
    received_by: "",
    payment_location: "",
    receipt_number: "",
    notes: "",
    
    // Wire Transfer fields
    sending_bank_name: "",
    sender_name: "",
    wire_reference_number: "",
    account_last4: "",
    transfer_date: "",
    
    // Bank Transfer (ACH) fields
    bank_name: "",
    routing_number: "",
    account_number: "",
    account_type: "checking",
    ach_transaction_id: "",
    
    // Zelle fields
    zelle_email: "",
    zelle_phone: "",
    zelle_confirmation_number: "",
    
    // Direct Deposit fields
    depositor_name: "",
    deposit_reference_number: "",
    deposit_date: "",
    
    // Check fields
    check_number: "",
    check_bank_name: "",
    check_account_holder: "",
    check_deposit_date: "",
    check_front_image: "",
    check_back_image: "",
    check_status: "pending",
    check_attachment: "",
    
    // Common fields
    transaction_reference: "",
    receipt_attachment: "",
    confirmation_upload: "",
  });

  const [partialPaymentForm, setPartialPaymentForm] = useState<PartialPayment>({
    id: "",
    amount: 0,
    date: getTodayDate(),
    method: "cash",
    description: "",
    receipt_attachment: "",
    transaction_reference: "",
    bank_name: "",
    routing_number: "",
    account_number: "",
    account_type: "checking",
    check_number: "",
    check_attachment: "",
    card_last4: "",
  });
  const [showPartialPaymentForm, setShowPartialPaymentForm] = useState(false);

  const [isThankYouLetterModalOpen, setIsThankYouLetterModalOpen] = useState(false);
  const [thankYouLetterContractId, setThankYouLetterContractId] = useState<string | null>(null);
  const [thankYouLetterContent, setThankYouLetterContent] = useState<string>("");

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState<Expense>({
    id: "",
    invoice_number: "",
    vendor: "",
    amount: 0,
    purchase_date: getTodayDate(),
    category: "Materials",
    description: "",
    notes: "",
    file_name: undefined,
  });
  const [formData, setFormData] = useState<FormData>({
    client_name: "",
    client_address: "",
    client_city: "",
    client_state: "",
    client_zip: "",
    project_location: "",
    client_phone: "",
    client_email: "",
    project_description: "",
    project_name: "",
    deposit_amount: "",
    total_value: "",
    start_date: "",
    due_date: "",
    status: "pending",
    cabinet_type: CABINET_TYPES[0],
    material: FINISHES[0],
    custom_finish: "",
    installation_included: false,
    additional_notes: "",
  });

  const [costTracking, setCostTracking] = useState<CostTracking>(initializeCostTracking());

  const [contractAttachments, setContractAttachments] = useState<ContractAttachment[]>([]);
  const [lightboxImage, setLightboxImage] = useState<ContractAttachment | null>(null);

  // Helper function to check if file is an image
  const isImageFile = (fileName: string): boolean => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    return imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  // Helper function to get file icon based on type
  const getFileIcon = (fileName: string) => {
    if (isImageFile(fileName)) return '🖼️';
    if (fileName.toLowerCase().endsWith('.pdf')) return '📄';
    if (fileName.toLowerCase().endsWith('.doc') || fileName.toLowerCase().endsWith('.docx')) return '📝';
    if (fileName.toLowerCase().endsWith('.xls') || fileName.toLowerCase().endsWith('.xlsx')) return '📊';
    return '📎';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [contractsData, materialsData] = await Promise.all([
        contractsService.getAll(),
        materialsService.getAll()
      ]);
      setContracts(contractsData);
      const materialItems = getMaterialsForContracts(materialsData);
      setAvailableMaterials(materialItems);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update thank you letter content when contracts change and modal is open
  useEffect(() => {
    if (isThankYouLetterModalOpen && thankYouLetterContractId) {
      const contract = contracts.find((c) => c.id === thankYouLetterContractId);
      if (contract) {
        const template = generateThankYouLetterTemplate(contract);
        setThankYouLetterContent(template);
      }
    }
  }, [contracts, isThankYouLetterModalOpen, thankYouLetterContractId]);

  const filteredContracts = contracts
    .filter((contract) => {
      // Filter by Year using string parsing to avoid timezone issues
      let contractYear = 0;
      if (contract.due_date) {
        contractYear = parseInt(contract.due_date.split('-')[0]);
      } else if (contract.start_date) {
        contractYear = parseInt(contract.start_date.split('-')[0]);
      }

      if (contractYear && contractYear !== selectedYear) {
         return false;
      }

      const statusMatch = filterStatus === "all" || contract.status === filterStatus;

      let dateMatch = true;
      if (filterFromDate || filterToDate) {
        if (!contract.due_date) {
          dateMatch = false;
        } else {
          const dueDateParts = contract.due_date.split('-');
          const dueDate = new Date(parseInt(dueDateParts[0]), parseInt(dueDateParts[1]) - 1, parseInt(dueDateParts[2]));

          if (filterFromDate) {
            const fromDateParts = filterFromDate.split('-');
            const fromDate = new Date(parseInt(fromDateParts[0]), parseInt(fromDateParts[1]) - 1, parseInt(fromDateParts[2]));
            if (dueDate < fromDate) dateMatch = false;
          }
          if (filterToDate) {
            const toDateParts = filterToDate.split('-');
            const toDate = new Date(parseInt(toDateParts[0]), parseInt(toDateParts[1]) - 1, parseInt(toDateParts[2]));
            // Include the end date (don't add 1 day)
            if (dueDate > toDate) dateMatch = false;
          }
        }
      }

      return statusMatch && dateMatch;
    })
    .sort((a, b) => {
      // Sort by created_at in descending order (newest contracts first)
      if (!a.created_at) return 1;
      if (!b.created_at) return -1;
      const aDate = new Date(a.created_at);
      const bDate = new Date(b.created_at);
      return bDate.getTime() - aDate.getTime();
    });

  /* Summary Cards based on FILTERED data */
  const totalValue = filteredContracts.reduce((sum, c) => sum + (c.total_value || 0), 0);
  const totalDeposits = filteredContracts.reduce((sum, c) => sum + (c.deposit_amount || 0), 0);

  const getMonthFromISODate = (dateStr?: string): number | null => {
    if (!dateStr) return null;
    const parts = String(dateStr).split("-");
    const month = Number.parseInt(parts[1] ?? "", 10);
    return Number.isFinite(month) ? month : null;
  };

  const getPaymentPartialPayments = (payment: any): PartialPayment[] => {
    const fromSnake = payment?.partial_payments;
    const fromCamel = payment?.partialPayments;
    if (Array.isArray(fromSnake)) return fromSnake.map(normalizePartialPayment);
    if (Array.isArray(fromCamel)) return fromCamel.map(normalizePartialPayment);
    return [];
  };

  const getPaymentReceivedAmount = (payment: any): number => {
    const partialPayments = getPaymentPartialPayments(payment);
    const partialSum = partialPayments.reduce((sum, pp) => sum + Number(pp?.amount || 0), 0);
    if (partialPayments.length > 0) return partialSum;

    // Back-compat: if payment was marked paid without partial payments, treat as fully received.
    if (payment?.status === "paid") return Number(payment?.amount || 0);

    return 0;
  };

  const getPaymentRemainingAmount = (payment: any): number => {
    const amount = Number(payment?.amount || 0);
    const received = getPaymentReceivedAmount(payment);
    return Math.max(0, amount - received);
  };

  const isPaymentFullyReceived = (payment: any): boolean => {
    const amount = Number(payment?.amount || 0);
    if (amount <= 0) return false;
    return getPaymentReceivedAmount(payment) >= amount - 0.01;
  };

  const selectedPaymentMonth = filterPaymentMonth === "all" ? null : Number.parseInt(filterPaymentMonth, 10);
  const selectedPaymentMonthLabel = selectedPaymentMonth ? MONTH_LABELS_SHORT[selectedPaymentMonth - 1] : null;
  
  // Calculate total amount paid from payment schedules
  const totalAmountPaid = filteredContracts.reduce((sum, c) => {
    const paidPayments = (c.payment_schedule || [])
      .filter((p: any) => p.status === "paid")
      .filter((p: any) => {
        if (!selectedPaymentMonth) return true;
        const month = getMonthFromISODate(p.paid_date || p.paidDate || p.due_date || p.dueDate);
        return month === selectedPaymentMonth;
      });
    return sum + paidPayments.reduce((paySum: number, p: any) => paySum + Number(p.amount || 0), 0);
  }, 0);
  
  // Calculate total amount due (pending payments)
  const totalAmountDue = filteredContracts.reduce((sum, c) => {
    const pendingPayments = (c.payment_schedule || [])
      .filter((p: any) => p.status === "pending")
      .filter((p: any) => {
        if (!selectedPaymentMonth) return true;
        const month = getMonthFromISODate(p.due_date || p.dueDate);
        return month === selectedPaymentMonth;
      });
    return sum + pendingPayments.reduce((paySum: number, p: any) => paySum + Number(p.amount || 0), 0);
  }, 0);


  const generateDefaultPaymentSchedule = (total_value: number, start_date: string, due_date: string, contract_id?: string): Payment[] => {
    const downPayment = total_value * 0.5;
    const installment = total_value * 0.25;

    // Special case for CON-003 with specific due dates
    if (contract_id === "CON-003") {
      return [
        {
          id: `PAY-${Date.now()}-1`,
          description: "50% Down Payment",
          amount: Math.round(downPayment * 100) / 100,
          due_date: start_date,
          status: "pending",
        },
        {
          id: `PAY-${Date.now()}-2`,
          description: "25% First Installment",
          amount: Math.round(installment * 100) / 100,
          due_date: "2026-01-17",
          status: "pending",
        },
        {
          id: `PAY-${Date.now()}-3`,
          description: "25% Final Payment",
          amount: Math.round(installment * 100) / 100,
          due_date: "2026-01-27",
          status: "pending",
        },
      ];
    }

    // Calculate dates for installments (split across the contract duration)
    const start = new Date(start_date);
    const due = new Date(due_date);
    const totalDays = (due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    return [
      {
        id: `PAY-${Date.now()}-1`,
        description: "50% Down Payment",
        amount: Math.round(downPayment * 100) / 100,
        due_date: start_date,
        status: "pending",
      },
      {
        id: `PAY-${Date.now()}-2`,
        description: "25% First Installment",
        amount: Math.round(installment * 100) / 100,
        due_date: new Date(start.getTime() + (totalDays / 2) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "pending",
      },
      {
        id: `PAY-${Date.now()}-3`,
        description: "25% Final Payment",
        amount: Math.round(installment * 100) / 100,
        due_date: due_date,
        status: "pending",
      },
    ];
  };

  // Quick add contract with default values
  const handleQuickAddContract = async () => {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dueDate = futureDate.toISOString().split('T')[0];

    const defaultValue = 10000;
    const defaultDeposit = 5000;

    const newContract: Partial<Contract> = {
      client_name: "New Client",
      client_address: "",
      client_city: "",
      client_state: "NC",
      client_zip: "",
      project_location: "",
      client_phone: "",
      client_email: "",
      project_description: "Cabinet project",
      project_name: "New Project",
      deposit_amount: defaultDeposit,
      total_value: defaultValue,
      start_date: today,
      due_date: dueDate,
      status: "pending",
      cabinet_type: CABINET_TYPES[0],
      material: FINISHES[0],
      installation_included: true,
      additional_notes: "",
      cost_tracking: initializeCostTracking(),
      payment_schedule: [],
      attachments: [],
      down_payments: [],
      expenses: [],
    };

    try {
      await contractsService.create(newContract);
      toast({ title: "Success", description: "Quick contract created" });
      fetchData();
    } catch (error) {
      console.error("Error quick adding contract:", error);
    }
  };

  const handleFormChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate 50% down payment when total value changes
      if (field === "total_value" && value) {
        const downPayment = (parseFloat(value) * 0.5).toFixed(2);
        updated.deposit_amount = downPayment;
      }

      return updated;
    });
  };

  const resetFormData = () => {
    setFormData({
      client_name: "",
      client_address: "",
      client_city: "",
      client_state: "",
      client_zip: "",
      project_location: "",
      client_phone: "",
      client_email: "",
      project_description: "",
      project_name: "",
      deposit_amount: "",
      total_value: "",
      start_date: "",
      due_date: "",
      status: "pending",
      cabinet_type: CABINET_TYPES[0],
      material: FINISHES[0],
      custom_finish: "",
      installation_included: false,
      additional_notes: "",
    });
    setContractAttachments([]);
    setCostTracking({
      ...initializeCostTracking(),
      materials: availableMaterials.map(m => ({ ...m, quantity: 0 }))
    });
  };

  const handleAddContract = async () => {
    // Validate only essential required fields
    if (
      !formData.client_name.trim() ||
      !formData.project_name.trim() ||
      !formData.deposit_amount ||
      !formData.total_value ||
      !formData.start_date ||
      !formData.due_date
    ) {
      alert("Please fill in required fields: Client Name, Project Name, Total Value, Deposit Amount, Start Date, and Due Date");
      return;
    }

    try {
      if (isEditMode && editingContractId) {
        const updatedContract: Partial<Contract> = {
          client_name: formData.client_name,
          client_address: formData.client_address,
          client_city: formData.client_city,
          client_state: formData.client_state,
          client_zip: formData.client_zip,
          project_location: formData.project_location,
          client_phone: formData.client_phone,
          client_email: formData.client_email,
          project_description: formData.project_description,
          project_name: formData.project_name,
          deposit_amount: parseFloat(formData.deposit_amount),
          total_value: parseFloat(formData.total_value),
          start_date: formData.start_date,
          due_date: formData.due_date,
          status: formData.status,
          cabinet_type: formData.cabinet_type,
          material: formData.material,
          custom_finish: formData.custom_finish,
          installation_included: formData.installation_included,
          additional_notes: formData.additional_notes,
          cost_tracking: costTracking,
          attachments: contractAttachments,
        };

        await contractsService.update(editingContractId, updatedContract);
        toast({
          title: "✅ Contract Updated",
          description: `${formData.project_name || editingContractId} has been updated successfully.`,
        });

        setIsEditMode(false);
        setEditingContractId(null);
      } else {
        const total_value = parseFloat(formData.total_value);
        const newContract: Partial<Contract> = {
          id: `CNT-${Date.now()}`,
          client_name: formData.client_name,
          client_address: formData.client_address,
          client_city: formData.client_city,
          client_state: formData.client_state,
          client_zip: formData.client_zip,
          project_location: formData.project_location,
          client_phone: formData.client_phone,
          client_email: formData.client_email,
          project_description: formData.project_description,
          project_name: formData.project_name,
          deposit_amount: parseFloat(formData.deposit_amount),
          total_value: total_value,
          start_date: formData.start_date,
          due_date: formData.due_date,
          status: formData.status,
          cabinet_type: formData.cabinet_type,
          material: formData.material,
          custom_finish: formData.custom_finish,
          installation_included: formData.installation_included,
          additional_notes: formData.additional_notes,
          cost_tracking: costTracking,
          // Generate a default payment schedule
          payment_schedule: generateDefaultPaymentSchedule(total_value, formData.start_date, formData.due_date), 
          attachments: contractAttachments,
          down_payments: [],
          expenses: [],
        };

        await contractsService.create(newContract);
        toast({
          title: "✅ Contract Created",
          description: `${formData.project_name} contract has been created successfully.`,
        });
      }

      resetFormData();
      setIsModalOpen(false);
      fetchData(); // Refresh list from Supabase
    } catch (error) {
      console.error("Error saving contract:", error);
      toast({ title: "Error", description: "Failed to save contract", variant: "destructive" });
    }
  };

  const handleEditContract = (contract: Contract) => {
    setIsEditMode(true);
    setEditingContractId(contract.id);
    setTempPdfAttachments(contract.attachments || []);
    setFormData({
      client_name: contract.client_name,
      client_address: contract.client_address || "",
      client_city: contract.client_city || "",
      client_state: contract.client_state || "",
      client_zip: contract.client_zip || "",
      project_location: contract.project_location || "",
      client_phone: contract.client_phone || "",
      client_email: contract.client_email || "",
      project_description: contract.project_description || "",
      project_name: contract.project_name,
      deposit_amount: (contract.deposit_amount || 0).toString(),
      total_value: contract.total_value.toString(),
      start_date: contract.start_date || "",
      due_date: contract.due_date || "",
      status: contract.status,
      cabinet_type: contract.cabinet_type || CABINET_TYPES[0],
      material: contract.material || FINISHES[0],
      custom_finish: contract.custom_finish || "",
      installation_included: contract.installation_included || false,
      additional_notes: contract.additional_notes || "",
    });
    
    // Merge saved materials with currently available materials to ensure new standard items appear
    const savedMaterials = contract.cost_tracking?.materials || [];
    const mergedMaterials = availableMaterials.map(am => {
      const existing = savedMaterials.find(m => m.id === am.id);
      if (existing) {
        return {
          ...am,
          quantity: existing.quantity,
          unit_price: existing.unit_price || (existing as any).unitPrice || am.unit_price
        };
      }
      return { ...am, quantity: 0 };
    });

    // Also include any custom materials that might have been saved but aren't in availableMaterials
    savedMaterials.forEach(sm => {
      if (!availableMaterials.find(am => am.id === sm.id)) {
        mergedMaterials.push(sm);
      }
    });

    setCostTracking({
      ...initializeCostTracking(contract.cost_tracking),
      materials: mergedMaterials
    });
    
    setContractAttachments(contract.attachments || []);
    setIsModalOpen(true);
  };
  const handleDeleteContract = async (contractId: string) => {
    if (window.confirm("Are you sure you want to delete this contract?")) {
      try {
        await contractsService.delete(contractId);
        toast({ title: "Contract Deleted", description: "The contract has been permanently removed." });
        fetchData();
      } catch (error) {
        console.error("Error deleting contract:", error);
        toast({ title: "Error", description: "Failed to delete contract", variant: "destructive" });
      }
    }
  };

  const handleOpenPaymentModal = (contractId: string, payment?: Payment) => {
    setSelectedContractId(contractId);
    if (payment) {
      const normalized = normalizePayment(payment);
      setPaymentForm({
        ...(payment as any),
        ...normalized,
        partial_payments: normalized.partial_payments || [],
      });
      setEditingPaymentId(payment.id);
      setShowPartialPaymentForm(false);
    } else {
      const contract = contracts.find((c) => c.id === contractId);
      const newPaymentId = `PAY-${Date.now()}`;
      setPaymentForm({
        id: newPaymentId,
        description: "",
        amount: 0,
        due_date: contract?.due_date || "",
        status: "pending",
        paid_date: "",
        payment_method: "cash",
        bank_name: "",
        routing_number: "",
        account_number: "",
        account_type: "checking",
        check_attachment: "",
        check_number: "",
        card_last4: "",
        transaction_reference: "",
        receipt_attachment: "",
        partial_payments: [],
      });
      setEditingPaymentId(null);
      setShowPartialPaymentForm(false);
    }
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = async () => {
    if (!paymentForm.description.trim() || !paymentForm.amount || !paymentForm.due_date || !selectedContractId || !paymentForm.payment_method) {
      alert("Please fill in all payment details (description, amount, due date, payment method)");
      return;
    }

    if (
      paymentForm.payment_method === "wire" &&
      (!String((paymentForm as any).bank_name || "").trim() ||
        !String((paymentForm as any).transaction_reference || "").trim())
    ) {
      alert("Wire transfer requires Bank Name and TRN (Transaction Reference Number)");
      return;
    }

    // Note: Payment method specific fields are optional to accommodate irregular payment information

    try {
      const contract = contracts.find(c => c.id === selectedContractId);
      if (!contract) return;

      const existingSchedule = (contract.payment_schedule || []) as any[];
      const updatedSchedule = editingPaymentId
        ? existingSchedule.map((p: any) => (p.id === editingPaymentId ? { ...p, ...paymentForm } : p))
        : [...existingSchedule, paymentForm];

      const canonicalSchedule = (updatedSchedule || []).map((p: any) => {
        const normalized = normalizePayment(p);
        return {
          ...p,
          ...normalized,
          partial_payments: normalized.partial_payments || [],
        };
      });

      await contractsService.update(selectedContractId, { payment_schedule: canonicalSchedule });

      // Update local state immediately so the UI reflects the change even if refresh is slow
      setContracts((prev) =>
        prev.map((c) => (c.id === selectedContractId ? ({ ...c, payment_schedule: canonicalSchedule } as any) : c)),
      );
      
      toast({
        title: "✅ Success",
        description: `${editingPaymentId ? "Updated" : "Added"} payment: ${paymentForm.description}`,
      });

      setIsPaymentModalOpen(false);
      setPaymentForm({
        id: "",
        description: "",
        amount: 0,
        due_date: "",
        status: "pending",
        paid_date: "",
        payment_method: "cash",
        bank_name: "",
        routing_number: "",
        account_number: "",
        account_type: "checking",
        check_attachment: "",
        check_number: "",
        card_last4: "",
        transaction_reference: "",
        receipt_attachment: "",
        partial_payments: []
      });
      setEditingPaymentId(null);
      setSelectedContractId(null);
      setShowPartialPaymentForm(false);
      setPartialPaymentForm({
        id: "",
        amount: 0,
        date: getTodayDate(),
        method: "cash",
        description: "",
        transaction_reference: "",
        bank_name: "",
        routing_number: "",
        account_number: "",
        check_number: "",
        check_attachment: "",
        card_last4: "",
      });
      fetchData();
    } catch (error) {
      console.error("Error saving payment:", error);
      toast({ title: "Error", description: "Failed to save payment", variant: "destructive" });
    }
  };

  const handleDeletePayment = async (contractId: string, paymentId: string) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
      try {
        const contract = contracts.find(c => c.id === contractId);
        if (!contract) return;
        const updatedSchedule = ((contract.payment_schedule || []) as any[]).filter((p: any) => p.id !== paymentId);
        const canonicalSchedule = updatedSchedule.map((p: any) => {
          const normalized = normalizePayment(p);
          return { ...p, ...normalized, partial_payments: normalized.partial_payments || [] };
        });

        await contractsService.update(contractId, { payment_schedule: canonicalSchedule });
        setContracts((prev) =>
          prev.map((c) => (c.id === contractId ? ({ ...c, payment_schedule: canonicalSchedule } as any) : c)),
        );
        fetchData();
      } catch (error) {
        console.error("Error deleting payment:", error);
      }
    }
  };

  const handleAddPartialPayment = async () => {
    if (!selectedContractId) {
      alert("No contract selected");
      return;
    }

    if (!partialPaymentForm.amount || partialPaymentForm.amount <= 0 || !partialPaymentForm.date) {
      alert("Please enter a partial payment amount and date");
      return;
    }

    const newPartial: PartialPayment = {
      ...partialPaymentForm,
      id: `PP-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };

    // New payment (add mode): store partials on the unsaved paymentForm
    if (!editingPaymentId) {
      setPaymentForm((prev) => ({
        ...prev,
        partial_payments: [...(prev.partial_payments || []), newPartial],
      }));

      toast({
        title: "✅ Partial Payment Added",
        description: `$${partialPaymentForm.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} added`,
      });

      setPartialPaymentForm({
        id: "",
        amount: 0,
        date: getTodayDate(),
        method: "cash",
        description: "",
        receipt_attachment: "",
        transaction_reference: "",
        bank_name: "",
        routing_number: "",
        account_number: "",
        account_type: "checking",
        check_number: "",
        check_attachment: "",
        card_last4: "",
      });
      setShowPartialPaymentForm(false);
      return;
    }

    try {
      const contract = contracts.find((c) => c.id === selectedContractId);
      if (!contract) return;

      const schedule = (contract.payment_schedule || []) as any[];
      const updatedSchedule = schedule.map((payment: any) => {
        if (payment.id !== editingPaymentId) return payment;

        const existing = getPaymentPartialPayments(payment);

        return {
          ...payment,
          partial_payments: [...existing, newPartial],
        };
      });

      const canonicalSchedule = updatedSchedule.map((p: any) => {
        const normalized = normalizePayment(p);
        return { ...p, ...normalized, partial_payments: normalized.partial_payments || [] };
      });

      await contractsService.update(selectedContractId, { payment_schedule: canonicalSchedule });
      setContracts((prev) =>
        prev.map((c) => (c.id === selectedContractId ? ({ ...c, payment_schedule: canonicalSchedule } as any) : c)),
      );

      toast({
        title: "✅ Partial Payment Recorded",
        description: `$${partialPaymentForm.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} recorded`,
      });

      setPartialPaymentForm({
        id: "",
        amount: 0,
        date: getTodayDate(),
        method: "cash",
        description: "",
        receipt_attachment: "",
        transaction_reference: "",
        bank_name: "",
        routing_number: "",
        account_number: "",
        account_type: "checking",
        check_number: "",
        check_attachment: "",
        card_last4: "",
      });
      setShowPartialPaymentForm(false);

      fetchData();
    } catch (error) {
      console.error("Error adding partial payment:", error);
      toast({ title: "Error", description: "Failed to record partial payment", variant: "destructive" });
    }
  };

  const handleDeletePartialPayment = async (paymentId: string, partialPaymentId: string) => {
    if (!selectedContractId) return;
    if (!window.confirm("Delete this partial payment?")) return;

    try {
      const contract = contracts.find((c) => c.id === selectedContractId);
      if (!contract) return;

      const updatedSchedule = (contract.payment_schedule || []).map((payment: any) => {
        if (payment.id !== paymentId) return payment;
        const existing = getPaymentPartialPayments(payment);
        return {
          ...payment,
          partial_payments: existing.filter((pp) => pp.id !== partialPaymentId),
        };
      });

      const canonicalSchedule = updatedSchedule.map((p: any) => {
        const normalized = normalizePayment(p);
        return { ...p, ...normalized, partial_payments: normalized.partial_payments || [] };
      });

      await contractsService.update(selectedContractId, { payment_schedule: canonicalSchedule });
      setContracts((prev) =>
        prev.map((c) => (c.id === selectedContractId ? ({ ...c, payment_schedule: canonicalSchedule } as any) : c)),
      );
      fetchData();
    } catch (error) {
      console.error("Error deleting partial payment:", error);
    }
  };

  const generateThankYouLetterTemplate = (contract: Contract): string => {
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const totalReceived = (contract.payment_schedule || []).reduce((sum: number, payment: any) => {
      return sum + getPaymentReceivedAmount(payment);
    }, 0);

    const totalValue = Number(contract.total_value || 0);
    const remaining = Math.max(0, totalValue - totalReceived);

    const firstName = String(contract.client_name || "").trim().split(" ")[0] || "there";

    return `South Park Cabinets INC
[Company Address]
[City, State ZIP]

${currentDate}

${contract.client_name || ""}
${contract.client_address || ""}
${contract.client_city || ""}${contract.client_city && contract.client_state ? ", " : ""}${contract.client_state || ""} ${contract.client_zip || ""}

Dear ${firstName},

Thank you for your payment of $${totalReceived.toLocaleString(undefined, { maximumFractionDigits: 2 })} received on ${currentDate} for the ${contract.project_name} project located at ${contract.project_location}.

We greatly appreciate your prompt payment and your continued trust in South Park Cabinets INC. Your payment has been processed and applied to your contract.

Project Details:
Contract ID: ${contract.id}
Project Name: ${contract.project_name}
Total Contract Value: $${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
Amount Received: $${totalReceived.toLocaleString(undefined, { maximumFractionDigits: 2 })}
Remaining Balance: $${remaining.toLocaleString(undefined, { maximumFractionDigits: 2 })}

We look forward to completing your project to your satisfaction. If you have any questions or concerns, please do not hesitate to contact us.

Thank you again for your business!

Sincerely,

South Park Cabinets INC
[Your Name]
[Your Title]
[Phone Number]
[Email Address]`;
  };

  const generateThankYouLetterPDF = (contract: Contract, letterContent: string) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(10);

    const lines = String(letterContent || "").split("\n");
    let yPosition = margin;

    lines.forEach((line) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      if (line.includes("Project Details:") || line.includes("Dear ") || line.includes("Sincerely,")) {
        pdf.setFont(undefined, "bold");
      } else {
        pdf.setFont(undefined, "normal");
      }

      const splitText = pdf.splitTextToSize(line, contentWidth);
      splitText.forEach((textLine: string) => {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.text(textLine, margin, yPosition);
        yPosition += 6;
      });

      if (line === "") yPosition += 3;
    });

    pdf.save(`${contract.id}-Thank-You-Letter.pdf`);
  };

  const handleOpenThankYouLetterModal = (contractId: string) => {
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) return;
    const template = generateThankYouLetterTemplate(contract);
    setThankYouLetterContent(template);
    setThankYouLetterContractId(contractId);
    setIsThankYouLetterModalOpen(true);
  };

  const handleSaveExpense = async (contractId: string) => {
    if (!expenseForm.invoice_number.trim() || !expenseForm.vendor.trim() || !expenseForm.amount || !expenseForm.purchase_date) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const contract = contracts.find(c => c.id === contractId);
      if (!contract) return;

      const updatedExpenses = editingExpenseId
        ? contract.expenses.map((e: any) => e.id === editingExpenseId ? expenseForm : e)
        : [...(contract.expenses || []), { ...expenseForm, id: `EXP-${Date.now()}` }];

      await contractsService.update(contractId, { expenses: updatedExpenses });
      
      setExpenseForm({
        id: "",
        invoice_number: "",
        vendor: "",
        amount: 0,
        purchase_date: getTodayDate(),
        category: "Materials",
        description: "",
        notes: "",
        file_name: undefined,
      });
      setEditingExpenseId(null);
      fetchData();
    } catch (error) {
      console.error("Error saving expense:", error);
    }
  };

  const handleAddExpenseToBills = async (contractId: string, expense: Expense) => {
    try {
      const bill: Partial<Bill> = {
        vendor: expense.vendor,
        amount: expense.amount,
        due_date: expense.purchase_date,
        description: expense.description,
        status: "pending",
        contract_id: contractId,
        invoice_number: expense.invoice_number,
        category: expense.category,
      };

      await billsService.create(bill);
      alert(`Expense added to Bills! You can now manage it in the Bills page.`);
    } catch (error) {
      console.error("Error adding expense to bills:", error);
    }
  };

  const handleDeleteExpense = async (contractId: string, expenseId: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        const contract = contracts.find(c => c.id === contractId);
        if (!contract) return;
        const updatedExpenses = (contract.expenses || []).filter((e: any) => e.id !== expenseId);
        await contractsService.update(contractId, { expenses: updatedExpenses });
        fetchData();
      } catch (error) {
        console.error("Error deleting expense:", error);
      }
    }
  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, contractId?: string) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: ContractAttachment[] = [];
    
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      const fileDataPromise = new Promise<string>((resolve) => {
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });
      
      const fileData = await fileDataPromise;
      newAttachments.push({
        id: `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file_name: file.name,
        file_data: fileData,
        upload_date: getTodayDate(),
        description: "",
      });
    }

    if (contractId) {
      try {
        const contract = contracts.find(c => c.id === contractId);
        if (!contract) return;
        const updatedAttachments = [...(contract.attachments || []), ...newAttachments];
        await contractsService.update(contractId, { attachments: updatedAttachments });
        fetchData();
      } catch (error) {
        console.error("Error uploading attachments:", error);
      }
    } else {
      setContractAttachments([...contractAttachments, ...newAttachments]);
    }
  };

  const deleteAttachment = async (attachmentId: string, contractId?: string) => {
    if (contractId) {
      try {
        const contract = contracts.find(c => c.id === contractId);
        if (!contract) return;
        const updatedAttachments = contract.attachments.filter((att: any) => att.id !== attachmentId);
        await contractsService.update(contractId, { attachments: updatedAttachments });
        fetchData();
      } catch (error) {
        console.error("Error deleting attachment:", error);
      }
    } else {
      setContractAttachments(contractAttachments.filter(att => att.id !== attachmentId));
    }
  };

  // Helper to extract image format from data URI
  const getImageFormatFromDataURI = (dataURI: string): string | null => {
    if (!dataURI || typeof dataURI !== 'string') return 'PNG';

    // Extract MIME type from data URI (e.g., data:image/png;base64,... -> png)
    const mimeMatch = dataURI.match(/data:image\/([^;,]+)/);
    if (mimeMatch && mimeMatch[1]) {
      const mimeType = mimeMatch[1].toUpperCase();
      // Map MIME types to jsPDF format strings
      // Note: SVG is not supported by jsPDF, return null to skip it
      if (mimeType === 'SVG+XML' || mimeType === 'SVG') return null;
      if (mimeType === 'JPEG' || mimeType === 'JPG') return 'JPEG';
      if (mimeType === 'PNG') return 'PNG';
      if (mimeType === 'GIF') return 'GIF';
      if (mimeType === 'WEBP') return 'WEBP';
    }
    return 'PNG'; // Default fallback
  };

  const addLogoToPageTop = (pdf: any, pageWidth: number) => {
    const logoWidth = 40;
    const logoHeight = 22;
    const logoX = pageWidth - logoWidth - 12;
    const logoY = 8;

    // Add logo image
    const logoUrl = "https://cdn.builder.io/api/v1/image/assets%2F3547a9037a984aba998732807b68708a%2F3103a6a25491498d8cef3e752ef6d6e8?format=webp&width=800";
    try {
      pdf.addImage(logoUrl, "WEBP", logoX, logoY, logoWidth, logoHeight);
    } catch (error) {
      // Fallback: draw text if image fails to load
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(9);
      pdf.setFont(undefined, "bold");
      pdf.text("SPC", logoX + logoWidth / 2, logoY + 8, { align: "center" });
      pdf.setFontSize(6);
      pdf.setFont(undefined, "normal");
      pdf.text("South Park Cabinets INC", logoX + logoWidth / 2, logoY + 16, { align: "center" });
    }
  };

  // Helper to draw section headers with background
  const drawSectionHeader = (pdf: any, title: string, yPos: number, margin: number, pageWidth: number) => {
    const headerHeight = 8;
    const padding = 3;

    // Draw light gray background
    pdf.setFillColor(240, 243, 248);
    pdf.rect(margin - 2, yPos - padding, pageWidth - 2 * margin + 4, headerHeight, "F");

    // Draw border
    pdf.setDrawColor(200, 210, 220);
    pdf.setLineWidth(0.3);
    pdf.rect(margin - 2, yPos - padding, pageWidth - 2 * margin + 4, headerHeight);

    // Draw text
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(30, 60, 120);
    pdf.text(title, margin + 2, yPos + 4);
    pdf.setTextColor(0, 0, 0);

    return yPos + headerHeight + 2;
  };

  const generateCabinetInstallationPDF = (contract: Contract, attachments: Attachment[] = []) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    const margin = 15;
    const lineHeight = 6;
    const contentWidth = pageWidth - 2 * margin;

    // Add logo
    addLogoToPageTop(pdf, pageWidth);

    // Header
    pdf.setFontSize(18);
    pdf.setFont(undefined, "bold");
    pdf.text("CABINET INSTALLATION", margin, yPosition);
    yPosition += 8;
    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.text("Internal Documentation", margin, yPosition);
    yPosition += 15;

    // Contract ID and Date
    pdf.setFontSize(10);
    pdf.text(`Contract ID: ${contract.id}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 15;

    // Client Information
    pdf.setFont(undefined, "bold");
    pdf.text("CLIENT INFORMATION", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.text(`Name: ${contract.client_name}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Address: ${contract.client_address ? `${contract.client_address}, ` : ""}${contract.client_city ? `${contract.client_city}, ` : ""}${contract.client_state || ""} ${contract.client_zip || ""}`, margin, yPosition, { maxWidth: contentWidth });
    yPosition += lineHeight + 2;
    pdf.text(`Phone: ${contract.client_phone || ""}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Email: ${contract.client_email || ""}`, margin, yPosition);
    yPosition += 15;

    // Project Information
    pdf.setFont(undefined, "bold");
    pdf.text("PROJECT DETAILS", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.text(`Project: ${contract.project_name}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Description: ${contract.project_description || ""}`, margin, yPosition, { maxWidth: contentWidth });
    yPosition += lineHeight + 2;
    pdf.text(`Location: ${contract.project_location}`, margin, yPosition, { maxWidth: contentWidth });
    yPosition += 15;

    // Cabinet Specifications
    pdf.setFont(undefined, "bold");
    pdf.text("CABINET SPECIFICATIONS", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.text(`Type: ${contract.cabinet_type}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Finish: ${contract.material}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Installation: ${contract.installation_included ? "Yes" : "No"}`, margin, yPosition);
    yPosition += lineHeight;
    if (contract.additional_notes) {
      pdf.text(`Notes: ${contract.additional_notes}`, margin, yPosition, { maxWidth: contentWidth });
      yPosition += lineHeight + 2;
    }
    yPosition += 10;

    // Material Costs (Internal)
    const cost_tracking = contract.cost_tracking || {} as any;
    const materials = cost_tracking.materials || [];
    const labor_cost = cost_tracking.labor_cost || { calculation_method: "manual", amount: 0, description: "" };
    const miscellaneous = cost_tracking.miscellaneous || [];

    const materialCost = materials.reduce((sum: number, m: any) => sum + (m.quantity || 0) * (m.unit_price || 0), 0);
    const miscCost = miscellaneous.reduce((sum: number, m: any) => sum + (m.amount || 0), 0);

    pdf.setFont(undefined, "bold");
    pdf.text("MATERIAL LIST", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");

    if (materials.length > 0) {
      materials.forEach((material: any) => {
        if (material.quantity > 0) {
          const cost = material.quantity * (material.unit_price || 0);
          const predefinedMaterial = availableMaterials.find(m => m.id === material.id);
          const supplier = material.supplier || predefinedMaterial?.supplier;
          
          // Format: Name: Qty Unit @ Price = Total [Supplier]
          // Indent slightly for visibility
           pdf.setFontSize(9);
          const lineText = `${material.name}: ${material.quantity} ${material.unit} @ $${(material.unit_price || 0).toFixed(2)} = $${cost.toFixed(2)}${supplier ? ` [${supplier}]` : ""}`;
          
          const lines = pdf.splitTextToSize(lineText, contentWidth - 5);
          lines.forEach((line: string) => {
            pdf.text(line, margin + 5, yPosition);
            yPosition += lineHeight - 1;
          });
          yPosition += 2;
        }
      });
    }

    yPosition += 5;
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text(`Total Material Cost: $${materialCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, yPosition);
    yPosition += lineHeight + 8;

    // Labor Cost
    pdf.setFont(undefined, "bold");
    pdf.text("LABOR", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);

    const laborMethod = labor_cost.calculation_method || "manual";
    const laborDesc = labor_cost.description || "N/A";
    const laborAmount = labor_cost.amount || 0;

    pdf.text(`Method: ${laborMethod}`, margin + 5, yPosition);
    yPosition += lineHeight;
    const descLines = pdf.splitTextToSize(`Description: ${laborDesc}`, contentWidth - 5);
    descLines.forEach((line: string) => {
      pdf.text(line, margin + 5, yPosition);
      yPosition += lineHeight;
    });
    pdf.text(`Amount: $${laborAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin + 5, yPosition);
    yPosition += lineHeight + 8;

    // Cost Summary
    // Cost Summary
    const totalCosts = materialCost + laborAmount + miscCost;
    const profit = (contract.total_value || 0) - totalCosts;
    const profitMargin = (contract.total_value || 0) > 0 ? (profit / contract.total_value) * 100 : 0;

    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text("COST SUMMARY", margin, yPosition);
    yPosition += lineHeight;

    pdf.setFont(undefined, "normal");
    pdf.text(`Contract Value: $${(contract.total_value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin + 5, yPosition);
    yPosition += lineHeight;
    pdf.text(`Total Costs: $${totalCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin + 5, yPosition);
    yPosition += lineHeight;

    pdf.setFont(undefined, "bold");
    if (profit >= 0) {
      pdf.setTextColor(34, 139, 34); // Dark green
    } else {
      pdf.setTextColor(220, 20, 60); // Crimson red
    }
    pdf.text(`Profit: $${profit.toLocaleString(undefined, { maximumFractionDigits: 2 })} (${profitMargin.toFixed(1)}%)`, margin + 5, yPosition);
    pdf.setTextColor(0, 0, 0); // Reset color
    yPosition += 15;

    // Add Attachments (2 per page)
    const allAttachments = normalizeAttachments([...(contract.attachments || []), ...attachments]);
    if (allAttachments.length > 0) {
      // Start new page for attachments
      pdf.addPage();
      addLogoToPageTop(pdf, pageWidth);
      yPosition = 30;

      pdf.setFont(undefined, "bold");
      pdf.setFontSize(14);
      pdf.text("DESIGN & CONTRACT ATTACHMENTS", margin, yPosition);
      yPosition += 15;

      // Grid logic: 2 images per page
      // Page usable height: (pageHeight - 30 (top) - 15 (bottom)) = ~250mm
      // Slot 1: Y=45, Height=100
      // Slot 2: Y=160, Height=100
      
      let itemsOnPage = 0;
      
      allAttachments.forEach((attachment, index) => {
         // Determine position
         if (itemsOnPage >= 2) {
           pdf.addPage();
           addLogoToPageTop(pdf, pageWidth);
           yPosition = 30;
           itemsOnPage = 0;
           // Redraw header on new pages? Maybe not necessary, but consistent
         }

         const currentY = itemsOnPage === 0 ? 45 : 160;
         
         // Title
         pdf.setFont(undefined, "bold");
         pdf.setFontSize(10);
         pdf.setTextColor(0, 0, 0);
         pdf.text(`${index + 1}. ${attachment.fileName}`, margin, currentY);
         
         const imageY = currentY + 5;
         const availableHeight = 100;
         const availableWidth = pageWidth - 2 * margin;

         // Content
         const isImage = attachment.fileData.startsWith('data:image/');
         if (isImage) {
           const imageFormat = getImageFormatFromDataURI(attachment.fileData);
           if (imageFormat) {
             try {
                // Use original image dimensions, but scale down if too large
                const props = (pdf as any).getImageProperties
                  ? (pdf as any).getImageProperties(attachment.fileData)
                  : null;

                if (props?.width && props?.height) {
                  // Scale down if image is larger than available space, but maintain aspect ratio
                  let drawW = props.width;
                  let drawH = props.height;

                  // Convert pixels to mm (assuming 96 DPI)
                  const pixelsToMm = 25.4 / 96;
                  drawW = drawW * pixelsToMm;
                  drawH = drawH * pixelsToMm;

                  // Scale down if too large, but preserve aspect ratio
                  if (drawW > availableWidth || drawH > availableHeight) {
                    const scale = Math.min(availableWidth / drawW, availableHeight / drawH);
                    drawW *= scale;
                    drawH *= scale;
                  }

                  // Align to the left
                  const drawX = margin;
                  const drawY = imageY;

                  pdf.addImage(attachment.fileData, imageFormat, drawX, drawY, drawW, drawH, undefined, 'FAST');

                  // Add dimensions text below the image
                  pdf.setFont(undefined, "normal");
                  pdf.setFontSize(8);
                  pdf.setTextColor(100, 100, 100);
                  const dimensionsText = `${props.width} × ${props.height} px`;
                  pdf.text(dimensionsText, drawX, drawY + drawH + 3);
                } else {
                  // Fallback: no properties available, use original dimensions if possible
                  pdf.addImage(attachment.fileData, imageFormat, margin, imageY, availableWidth, availableHeight, undefined, 'FAST');
                }
             } catch (e) {
               console.error("Image add failed", e);
               pdf.text("[Image Error]", margin, imageY + 10);
             }
           } else {
             pdf.text("[Unsupported Image Format]", margin, imageY + 10);
           }
         } else {
           // Document placeholder
           pdf.setFont(undefined, "normal");
           pdf.rect(margin, imageY, availableWidth, availableHeight);
           pdf.text(`[Document: ${attachment.fileName}]`, margin + 10, imageY + 20);
         }
         
         itemsOnPage++;
      });
    }

    pdf.save(`${contract.id}-Cabinet-Installation.pdf`);
  };

  const generateClientAgreementPDF = (contract: Contract, attachments: Attachment[] = []) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    const margin = 15;
    const lineHeight = 6;
    const contentWidth = pageWidth - 2 * margin;

    // Add logo
    addLogoToPageTop(pdf, pageWidth);

    // Header
    pdf.setFontSize(16);
    pdf.setFont(undefined, "bold");
    pdf.text("CLIENT AGREEMENT", margin, yPosition);
    yPosition += 15;

    // Contract Header
    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.text(`Contract ID: ${contract.id}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 15;

    // Contact Information Box
    pdf.setDrawColor(200);
    pdf.rect(margin, yPosition, contentWidth, 35);
    const boxY = yPosition + 5;
    pdf.setFont(undefined, "bold");
    pdf.text("BETWEEN:", margin + 5, boxY);
    pdf.text("AND:", margin + contentWidth / 2 + 5, boxY);
    
    pdf.setFont(undefined, "normal");
    pdf.text("South Park Cabinets INC", margin + 5, boxY + 5);
    pdf.text("123 Cabinet Way, Suite 100", margin + 5, boxY + 10);
    pdf.text("City, State 12345", margin + 5, boxY + 15);
    pdf.text("(555) 123-4567", margin + 5, boxY + 20);

    pdf.text(contract.client_name, margin + contentWidth / 2 + 5, boxY + 5);
    pdf.text(contract.client_address || "", margin + contentWidth / 2 + 5, boxY + 10);
    pdf.text(`${contract.client_city || ""}, ${contract.client_state || ""} ${contract.client_zip || ""}`, margin + contentWidth / 2 + 5, boxY + 15);
    pdf.text(contract.client_phone || "", margin + contentWidth / 2 + 5, boxY + 20);
    yPosition += 45;

    // Project Information
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text("PROJECT DETAILS", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);

    const projectNameLines = pdf.splitTextToSize(`Project: ${contract.project_name}`, contentWidth);
    projectNameLines.forEach((line: string) => {
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    const descLines = pdf.splitTextToSize(`Description: ${contract.project_description || "N/A"}`, contentWidth);
    descLines.forEach((line: string) => {
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    const locLines = pdf.splitTextToSize(`Location: ${contract.project_location || "As specified above"}`, contentWidth);
    locLines.forEach((line: string) => {
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
    yPosition += 10;

    // Cabinet Work Specifications
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text("CABINET SPECIFICATIONS", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);

    pdf.text(`Type: ${contract.cabinet_type}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Finish: ${contract.material}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Installation: ${contract.installation_included ? "Yes" : "No"}`, margin, yPosition);
    yPosition += lineHeight;

    if (contract.additional_notes) {
      const noteLines = pdf.splitTextToSize(`Notes: ${contract.additional_notes}`, contentWidth);
      noteLines.forEach((line: string) => {
        pdf.text(line, margin, yPosition);
        yPosition += lineHeight;
      });
    }
    yPosition += 10;

    // Financial Information
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text("FINANCIAL TERMS", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);

    pdf.text(`Total Contract Value: $${(contract.total_value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Deposit Due: $${(contract.deposit_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, yPosition);
    yPosition += 15;

    // Payment Schedule
    if (contract.payment_schedule && contract.payment_schedule.length > 0) {
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(10);
      pdf.text("PAYMENT SCHEDULE", margin, yPosition);
      yPosition += lineHeight;
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(9);

      contract.payment_schedule.forEach((payment: any, index: number) => {
        const dueDate = new Date(payment.due_date).toLocaleDateString();
        const statusText = payment.status === "paid" ? `(PAID)` : "(Pending)";

        // Payment description
        pdf.setFont(undefined, "bold");
        pdf.text(`${index + 1}. ${payment.description}`, margin, yPosition);
        yPosition += lineHeight;

        // Amount and dates
        pdf.setFont(undefined, "normal");
        pdf.text(`Amount: $${payment.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin + 5, yPosition);
        yPosition += lineHeight;
        pdf.text(`Due Date: ${dueDate} ${statusText}`, margin + 5, yPosition);
        yPosition += lineHeight;

        // Payment method if paid
        if (payment.status === "paid" && payment.payment_method) {
          const methodLabel = paymentMethodPlainLabel(payment.payment_method);
          
          const methodText = `Payment Method: ${methodLabel}${payment.check_number ? ` #${payment.check_number}` : ""}`;
          pdf.setFont(undefined, "italic");
          pdf.setFontSize(8);
          pdf.text(methodText, margin + 5, yPosition);
          yPosition += lineHeight;
          pdf.setFont(undefined, "normal");
          pdf.setFontSize(9);
        }

        yPosition += 2;
      });
      yPosition += 10;
    }

    // Contract Terms - Start on new page
    pdf.addPage();
    addLogoToPageTop(pdf, pageWidth);
    yPosition = 30;

    pdf.setFont(undefined, "bold");
    pdf.setFontSize(14);
    pdf.text("TERMS & CONDITIONS", margin, yPosition);
    yPosition += 15;

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);

    const terms = [
      "1. SCOPE OF WORK",
      "The Contractor agrees to provide and install cabinets as specified in the work specifications section. All work will be performed in a professional and workmanlike manner in accordance with industry standards.",
      "",
      "2. PAYMENT TERMS",
      "- The Client agrees to pay the total contract amount as specified in the payment schedule.",
      "- A deposit is required before work begins.",
      "- All subsequent payments are due as outlined in the payment schedule.",
      "- Late payments may result in work stoppage until payment is received.",
      "",
      "3. MATERIALS AND SPECIFICATIONS",
      "- All materials will be as specified in the work specifications section.",
      "- Any changes to materials or specifications must be agreed upon in writing.",
      "- The Contractor will provide materials of good quality suitable for the intended purpose.",
      "",
      "4. TIMELINE",
      `- Work will commence on ${contract.start_date ? formatDateString(contract.start_date) : "TBD"}`,
      `- Expected completion date is ${contract.due_date ? formatDateString(contract.due_date) : "TBD"}`,
      "- Timeline is an estimate and may be subject to change due to unforeseen circumstances.",
      "",
      "5. WARRANTY",
      "- The Contractor warrants all work will be free from defects in workmanship for one (1) year from completion.",
      "- Cabinet hardware and materials are covered by manufacturer warranties.",
      "",
      "6. PERMITS AND COMPLIANCE",
      "- The Contractor will obtain all necessary permits required for the work.",
      "- All work will comply with local building codes and regulations.",
      "",
      "Both parties acknowledge they have read and agree to the terms and conditions of this Agreement.",
    ];

    terms.forEach((line) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        addLogoToPageTop(pdf, pageWidth);
        yPosition = 20;
      }
      if (line.startsWith("|")) {
        pdf.setFont(undefined, "bold");
      } else {
        pdf.setFont(undefined, "normal");
      }
      pdf.text(line, margin, yPosition, { maxWidth: contentWidth });
      yPosition += line === "" ? 3 : lineHeight;
    });

    yPosition += 10;

    // Signature area
    if (yPosition > pageHeight - 40) {
      pdf.addPage();
      addLogoToPageTop(pdf, pageWidth);
      yPosition = 20;
    }

    pdf.setFont(undefined, "bold");
    pdf.text("CLIENT ACCEPTANCE", margin, yPosition);
    yPosition += 10;
    pdf.setFontSize(8);
    pdf.setFont(undefined, "normal");
    pdf.text("By signing below, the Client acknowledges and agrees to all terms and conditions of this Agreement.", margin, yPosition, { maxWidth: contentWidth });
    yPosition += 12;

    pdf.text("Client Signature: _________________________________ Date: _______________", margin, yPosition);
    yPosition += 10;

    pdf.setFont(undefined, "bold");
    pdf.text("CONTRACTOR ACCEPTANCE", margin, yPosition);
    yPosition += 10;
    pdf.setFontSize(8);
    pdf.setFont(undefined, "normal");
    pdf.text("By signing below, the Contractor agrees to perform the work as specified in this Agreement.", margin, yPosition, { maxWidth: contentWidth });
    yPosition += 12;

    pdf.text("Contractor Signature: ______________________________ Date: _______________", margin, yPosition);

    // Add all attachments (images, maps, PDFs, documents, etc.)
    const allAttachments = normalizeAttachments([...(contract.attachments || []), ...attachments]);
    if (allAttachments.length > 0) {
      // Start new page for attachments
      pdf.addPage();
      addLogoToPageTop(pdf, pageWidth);
      yPosition = 30;

      pdf.setFont(undefined, "bold");
      pdf.setFontSize(14);
      pdf.text("DESIGN & CONTRACT ATTACHMENTS", margin, yPosition);
      yPosition += 15;

      // Grid logic: 2 images per page
      // Page usable height: (pageHeight - 30 (top) - 15 (bottom)) = ~250mm
      // Slot 1: Y=45, Height=100
      // Slot 2: Y=160, Height=100
      
      let itemsOnPage = 0;
      
      allAttachments.forEach((attachment, index) => {
         // Determine position
         if (itemsOnPage >= 2) {
           pdf.addPage();
           addLogoToPageTop(pdf, pageWidth);
           yPosition = 30;
           itemsOnPage = 0;
         }

         const currentY = itemsOnPage === 0 ? 45 : 160;
         
         // Title
         pdf.setFont(undefined, "bold");
         pdf.setFontSize(10);
         pdf.setTextColor(0, 0, 0);
         pdf.text(`${index + 1}. ${attachment.fileName}`, margin, currentY);
         
         const imageY = currentY + 5;
         const availableHeight = 100;
         const availableWidth = pageWidth - 2 * margin;

         // Content
         const isImage = attachment.fileData.startsWith('data:image/');
         if (isImage) {
           const imageFormat = getImageFormatFromDataURI(attachment.fileData);
           if (imageFormat) {
             try {
                // Use original image dimensions, but scale down if too large
                const props = (pdf as any).getImageProperties
                  ? (pdf as any).getImageProperties(attachment.fileData)
                  : null;

                if (props?.width && props?.height) {
                  // Scale down if image is larger than available space, but maintain aspect ratio
                  let drawW = props.width;
                  let drawH = props.height;

                  // Convert pixels to mm (assuming 96 DPI)
                  const pixelsToMm = 25.4 / 96;
                  drawW = drawW * pixelsToMm;
                  drawH = drawH * pixelsToMm;

                  // Scale down if too large, but preserve aspect ratio
                  if (drawW > availableWidth || drawH > availableHeight) {
                    const scale = Math.min(availableWidth / drawW, availableHeight / drawH);
                    drawW *= scale;
                    drawH *= scale;
                  }

                  // Align to the left
                  const drawX = margin;
                  const drawY = imageY;

                  pdf.addImage(attachment.fileData, imageFormat, drawX, drawY, drawW, drawH, undefined, 'FAST');

                  // Add dimensions text below the image
                  pdf.setFont(undefined, "normal");
                  pdf.setFontSize(8);
                  pdf.setTextColor(100, 100, 100);
                  const dimensionsText = `${props.width} × ${props.height} px`;
                  pdf.text(dimensionsText, drawX, drawY + drawH + 3);
                } else {
                  // Fallback: no properties available, use original dimensions if possible
                  pdf.addImage(attachment.fileData, imageFormat, margin, imageY, availableWidth, availableHeight, undefined, 'FAST');
                }
             } catch (e) {
               console.error("Image add failed", e);
               pdf.text("[Image Error]", margin, imageY + 10);
             }
           } else {
             pdf.text("[Unsupported Image Format]", margin, imageY + 10);
           }
         } else {
           // Document placeholder
           pdf.setFont(undefined, "normal");
           pdf.rect(margin, imageY, availableWidth, availableHeight);
           pdf.text(`[Document: ${attachment.fileName}]`, margin + 10, imageY + 20);
         }
         
         itemsOnPage++;
      });
    }

    pdf.save(`${contract.id}-Client-Agreement.pdf`);
  };

  // PDF Generation State
  const [pdfGenerationStep, setPdfGenerationStep] = useState<"type-selection" | "attachments">("type-selection");
  const [pdfAttachmentType, setPdfAttachmentType] = useState<"cabinet" | "client">("cabinet");
  const [tempPdfAttachments, setTempPdfAttachments] = useState<Attachment[]>([]);
  // pdfSelectContractId is defined below with other state

  const handlePdfAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setTempPdfAttachments(prev => [...prev, {
          id: `TEMP-${Date.now()}-${Math.random()}`,
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          uploadDate: new Date().toISOString(),
          fileData: base64
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const generatePDF = (contract: Contract, type: "cabinet" | "client", attachments?: Attachment[]) => {
    const contractWithAttachments = { 
      ...contract, 
      attachments: attachments !== undefined ? normalizeAttachments(attachments) : normalizeAttachments(contract.attachments)
    };
    
    if (type === "cabinet") {
      generateCabinetInstallationPDF(contractWithAttachments);
    } else {
      generateClientAgreementPDF(contractWithAttachments);
    }
  };

  const generateInvoicePDF = async (contractId: string) => {
    try {
      // Fetch the latest contract data from the database to ensure we have the most recent payments
      const latestContract = await contractsService.getById(contractId);
      if (!latestContract) {
        toast({ title: "Error", description: "Contract not found", variant: "destructive" });
        return;
      }

      const contract = latestContract;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;
      const margin = 15;
      const lineHeight = 6;
      const contentWidth = pageWidth - 2 * margin;

    // Add logo
    addLogoToPageTop(pdf, pageWidth);

    // Invoice Header
    pdf.setFontSize(22);
    pdf.setFont(undefined, "bold");
    pdf.text("INVOICE", margin, yPosition);
    yPosition += 12;

    // Invoice ID and Date
    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.text(`Invoice ID: ${contract.id}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Invoice Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
    yPosition += 15;

    // Company Information (From)
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text("FROM:", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);
    pdf.text("South Park Cabinets INC", margin, yPosition);
    yPosition += lineHeight;
    yPosition += 10;

    // Bill To
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text("BILL TO:", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);
    pdf.text(`${contract.client_name}`, margin, yPosition);
    yPosition += lineHeight;
    if (contract.client_address) {
      pdf.text(`${contract.client_address}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (contract.client_city || contract.client_state || contract.client_zip) {
      pdf.text(`${contract.client_city || ""}${contract.client_city && contract.client_state ? ", " : ""}${contract.client_state || ""} ${contract.client_zip || ""}`.trim(), margin, yPosition);
      yPosition += lineHeight;
    }
    if (contract.client_phone) {
      pdf.text(`Phone: ${contract.client_phone}`, margin, yPosition);
      yPosition += lineHeight;
    }
    yPosition += 10;

    // Project Details
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text("PROJECT DETAILS:", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);
    pdf.text(`Project: ${contract.project_name}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Location: ${contract.project_location}`, margin, yPosition);
    yPosition += lineHeight;
    yPosition += 10;

    // Contract Value Section
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, margin + contentWidth, yPosition);
    yPosition += 8;

    pdf.setFont(undefined, "bold");
    pdf.setFontSize(11);
    pdf.text("CONTRACT VALUE", margin, yPosition);
    yPosition += lineHeight + 2;

    pdf.setFont(undefined, "normal");
    pdf.setFontSize(10);
    pdf.text("Total Contract Value:", margin, yPosition);
    pdf.text(`$${(contract.total_value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin + 100, yPosition, { align: "right" });
    yPosition += lineHeight + 8;

    // Payments Section - include partial payments as receipts
    type ReceiptRow = {
      dateIso: string;
      description: string;
      methodLabel: string;
      transactionNumber: string;
      amount: number;
    };

    const schedule = (contract.payment_schedule || []) as any[];
    const downPayments = (contract as any).down_payments ?? (contract as any).downPayments ?? [];
    const receiptRows: ReceiptRow[] = [];

    // Include down payments (if any)
    if (Array.isArray(downPayments)) {
      downPayments.forEach((dp: any) => {
        const dateIso = String(dp?.date ?? dp?.paid_date ?? dp?.paidDate ?? "");
        const method = normalizePaymentMethodValue(dp?.method ?? dp?.payment_method ?? dp?.paymentMethod);
        const methodLabel = paymentMethodPlainLabel(method) || "N/A";
        const transactionNumberRaw =
          dp?.transaction_reference ||
          dp?.transactionReference ||
          dp?.ach_transaction_id ||
          dp?.wire_reference_number ||
          dp?.zelle_confirmation_number ||
          dp?.authorization_code ||
          dp?.deposit_reference_number ||
          dp?.receipt_number ||
          dp?.check_number ||
          dp?.checkNumber ||
          "";

        receiptRows.push({
          dateIso,
          description: String(dp?.description ?? "Down payment"),
          methodLabel,
          transactionNumber: String(transactionNumberRaw),
          amount: Number(dp?.amount || 0),
        });
      });
    }

    // Include scheduled payments:
    // - list partial payments as receipts
    // - keep paid payments included (if partials exist, include any remainder so paid is not omitted)
    schedule.forEach((payment: any) => {
      const partials = getPaymentPartialPayments(payment);
      const amount = Number(payment?.amount || 0);
      const partialSum = partials.reduce((sum, pp) => sum + Number(pp?.amount || 0), 0);

      // Prefer listing partial payments when they exist and have amounts.
      // If partials exist but are empty/zero (legacy data), fall back to the full paid amount.
      if (partials.length > 0 && partialSum > 0) {
        partials.forEach((pp) => {
          const dateIso = String(pp.date || payment.paid_date || payment.due_date || "");
          const methodLabel = paymentMethodPlainLabel(pp.method) || "N/A";
          const transactionNumberRaw =
            pp.transaction_reference ||
            (pp as any).transactionReference ||
            (pp as any).ach_transaction_id ||
            (pp as any).wire_reference_number ||
            (pp as any).zelle_confirmation_number ||
            (pp as any).authorization_code ||
            (pp as any).deposit_reference_number ||
            (pp as any).receipt_number ||
            pp.check_number ||
            "";

          receiptRows.push({
            dateIso,
            description: String(pp.description || payment.description || "Payment") + " - Partial",
            methodLabel,
            transactionNumber: String(transactionNumberRaw),
            amount: Number(pp.amount || 0),
          });
        });

        // If the scheduled payment is marked as paid, include any remaining amount as a final receipt line.
        if (payment?.status === "paid") {
          const remaining = amount - partialSum;
          if (remaining > 0.009) {
            const dateIso = String(payment.paid_date || payment.due_date || "");
            const methodLabel =
              paymentMethodPlainLabel(normalizePaymentMethodValue(payment.payment_method ?? payment.paymentMethod)) || "N/A";
            const transactionNumberRaw =
              payment.transaction_reference ||
              payment.transactionReference ||
              payment.ach_transaction_id ||
              payment.wire_reference_number ||
              payment.zelle_confirmation_number ||
              payment.authorization_code ||
              payment.deposit_reference_number ||
              payment.receipt_number ||
              payment.check_number ||
              "";

            receiptRows.push({
              dateIso,
              description: String(payment.description || "Payment") + " - Remainder",
              methodLabel,
              transactionNumber: String(transactionNumberRaw),
              amount: remaining,
            });
          }
        }

        return;
      }

      if (payment?.status === "paid") {
        const dateIso = String(payment.paid_date || payment.due_date || "");
        const methodLabel =
          paymentMethodPlainLabel(normalizePaymentMethodValue(payment.payment_method ?? payment.paymentMethod)) ||
          "N/A";
        const transactionNumberRaw =
          payment.transaction_reference ||
          payment.transactionReference ||
          payment.ach_transaction_id ||
          payment.wire_reference_number ||
          payment.zelle_confirmation_number ||
          payment.authorization_code ||
          payment.deposit_reference_number ||
          payment.receipt_number ||
          payment.check_number ||
          "";

        receiptRows.push({
          dateIso,
          description: String(payment.description || "Payment"),
          methodLabel,
          transactionNumber: String(transactionNumberRaw),
          amount,
        });
      }
    });

    const hasReceipts = receiptRows.length > 0;

    if (hasReceipts) {
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, margin + contentWidth, yPosition);
      yPosition += 8;

      pdf.setFont(undefined, "bold");
      pdf.setFontSize(11);
      pdf.text("PAYMENTS RECEIVED", margin, yPosition);
      yPosition += lineHeight + 3;

      // Table header
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(9);
      pdf.text("Date", margin, yPosition);
      pdf.text("Description", margin + 25, yPosition);
      pdf.text("Method", margin + 85, yPosition);
      pdf.text("Txn #", margin + 125, yPosition);
      pdf.text("Amount", margin + contentWidth, yPosition, { align: "right" });
      yPosition += lineHeight + 4;

      // Separator line for table
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, yPosition, margin + contentWidth, yPosition);
      yPosition += lineHeight + 3;

      // Payment rows - sort by paid date (earliest first)
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(9);
      let totalPaidAmount = 0;

      const sortedReceipts = [...receiptRows].sort((a, b) => {
        const aDate = new Date((a.dateIso || "").split("T")[0] || 0).getTime();
        const bDate = new Date((b.dateIso || "").split("T")[0] || 0).getTime();
        return aDate - bDate;
      });

      sortedReceipts.forEach((row) => {
        // Page break if needed
        if (yPosition > pageHeight - 35) {
          pdf.addPage();
          yPosition = 20;
          addLogoToPageTop(pdf, pageWidth);
          pdf.setFont(undefined, "bold");
          pdf.setFontSize(11);
          pdf.text("PAYMENTS RECEIVED (continued)", margin, yPosition);
          yPosition += lineHeight + 3;

          pdf.setFont(undefined, "bold");
          pdf.setFontSize(9);
          pdf.text("Date", margin, yPosition);
          pdf.text("Description", margin + 25, yPosition);
          pdf.text("Method", margin + 85, yPosition);
          pdf.text("Txn #", margin + 125, yPosition);
          pdf.text("Amount", margin + contentWidth, yPosition, { align: "right" });
          yPosition += lineHeight + 4;

          pdf.setDrawColor(220, 220, 220);
          pdf.line(margin, yPosition, margin + contentWidth, yPosition);
          yPosition += lineHeight + 3;
          pdf.setFont(undefined, "normal");
          pdf.setFontSize(9);
        }

        const dateOnly = String(row.dateIso || "").split("T")[0];
        const parts = dateOnly.split("-");
        const paymentDate =
          parts.length === 3
            ? `${parseInt(parts[1] || "0")}/${parseInt(parts[2] || "0")}/${parts[0]}`
            : "";

        const amountText = `$${(Number(row.amount) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

        const cleanedTxn = String(row.transactionNumber || "")
          .replace(/[()]/g, "")
          .trim();

        const transactionNumber =
          cleanedTxn.length > 16
            ? cleanedTxn.substring(0, 16)
            : cleanedTxn;

        const desc = String(row.description || "Payment");
        const truncatedDesc = desc.length > 25 ? desc.substring(0, 22) + "..." : desc;

        pdf.text(paymentDate, margin, yPosition);
        pdf.text(truncatedDesc, margin + 25, yPosition);
        pdf.text(row.methodLabel || "N/A", margin + 85, yPosition);
        pdf.text(transactionNumber, margin + 125, yPosition);
        pdf.text(amountText, margin + contentWidth, yPosition, { align: "right" });

        totalPaidAmount += Number(row.amount || 0);
        yPosition += lineHeight + 3;
      });

      // Total payments line
      yPosition += lineHeight + 2;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, margin + contentWidth, yPosition);
      yPosition += lineHeight + 4;

      pdf.setFont(undefined, "bold");
      pdf.setFontSize(10);
      pdf.text("Total Payments Received:", margin, yPosition);
      const totalPaymentText = `$${totalPaidAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      pdf.text(totalPaymentText, margin + contentWidth, yPosition, { align: "right" });
      yPosition += lineHeight + 8;

      // Pending Deposit (remaining balance on partially paid scheduled payments)
      let totalPendingDeposit = 0;
      schedule.forEach((payment: any) => {
        const received = getPaymentReceivedAmount(payment);
        const amt = Number(payment?.amount || 0);
        const pending = amt - received;
        if (received > 0 && pending > 0.009) totalPendingDeposit += pending;
      });

      if (totalPendingDeposit > 0.009) {
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(11);
        pdf.setTextColor(220, 20, 60);
        pdf.text("Pending Deposit:", margin, yPosition);
        pdf.text(
          `$${totalPendingDeposit.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          margin + contentWidth,
          yPosition,
          { align: "right" },
        );
        pdf.setTextColor(0, 0, 0);
        yPosition += lineHeight + 2;
      }

      // Total Remaining Due
      const balanceDue = (contract.total_value || 0) - totalPaidAmount;
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(10);
      if (balanceDue > 0) {
        pdf.setTextColor(220, 20, 60); // Red for amount due
      } else if (balanceDue < 0) {
        pdf.setTextColor(34, 139, 34); // Green for overpayment
      } else {
        pdf.setTextColor(0, 0, 0); // Black if zero
      }
      pdf.text("Total Remaining Due:", margin, yPosition);
      const balanceText = `$${Math.abs(balanceDue).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      pdf.text(balanceText, margin + contentWidth, yPosition, { align: "right" });
      pdf.setTextColor(0, 0, 0); // Reset color
    } else {
      // No paid payments
      yPosition += 10;
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(10);
      pdf.text("No payments recorded yet", margin, yPosition);
      yPosition += lineHeight + 2;
      
      // Still show balance due even if no payments
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(220, 20, 60); // Red
      pdf.text("Balance Due:", margin, yPosition);
      const balanceText = `$${(contract.total_value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      pdf.text(balanceText, margin + contentWidth, yPosition, { align: "right" });
      pdf.setTextColor(0, 0, 0); // Reset color
    }

    // Footer
    yPosition = pageHeight - 20;
    pdf.setDrawColor(200, 200, 200);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, margin + contentWidth, yPosition);
    yPosition += 5;

    pdf.setFontSize(8);
    pdf.setFont(undefined, "normal");
    pdf.text("Thank you for your business!", margin, yPosition);
    yPosition += 4;
    pdf.text("For questions about this invoice, please contact South Park Cabinets INC", margin, yPosition);

    pdf.save(`${contract.id}-Invoice.pdf`);
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({ title: "Error", description: "Failed to generate invoice", variant: "destructive" });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingContractId(null);
    setTermsAccepted(false);
    setFormData({
      client_name: "",
      client_address: "",
      client_city: "",
      client_state: "",
      client_zip: "",
      project_location: "",
      client_phone: "",
      client_email: "",
      project_description: "",
      project_name: "",
      deposit_amount: "",
      total_value: "",
      start_date: "",
      due_date: "",
      status: "pending",
      cabinet_type: CABINET_TYPES[0],
      material: FINISHES[0],
      custom_finish: "",
      installation_included: false,
      additional_notes: "",
    });
    setCostTracking(initializeCostTracking());
    setContractAttachments([]);
    // Don't clear draft here - keep it available for reopening the form
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      "in-progress": "bg-blue-100 text-blue-800",
      pending: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  const printAllContracts = () => {
    try {
      console.log("Print function called, contracts count:", contracts.length);

      if (contracts.length === 0) {
        alert("No contracts to print");
        return;
      }

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;
      const margin = 10;
      const lineHeight = 6;

      // Add logo
      addLogoToPageTop(pdf, pageWidth);

      // Title
      pdf.setFontSize(16);
      pdf.setFont(undefined, "bold");
      pdf.text("CONTRACTS REPORT", margin, yPosition);
      yPosition += 10;

      // Generated date
      pdf.setFontSize(9);
      pdf.setFont(undefined, "normal");
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
      yPosition += 8;
      pdf.text(`Total Contracts: ${contracts.length}`, margin, yPosition);
      yPosition += 10;

      // Contracts list
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(10);

      contracts.forEach((contract, idx) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          addLogoToPageTop(pdf, pageWidth);
          yPosition = 15;
        }

        // Contract header
        pdf.text(`${idx + 1}. ${contract.id} - ${contract.project_name || ""}`, margin, yPosition);
        yPosition += lineHeight;

        // Contract details
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(9);

        pdf.text(`Client: ${contract.client_name || ""}`, margin + 5, yPosition);
        yPosition += lineHeight;
        pdf.text(`Status: ${(contract.status || "").replace("-", " ")}`, margin + 5, yPosition);
        yPosition += lineHeight;
        pdf.text(
          `Value: $${Number(contract.total_value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })} | Deposit: $${Number(contract.deposit_amount || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
          margin + 5,
          yPosition,
        );
        yPosition += lineHeight;
        pdf.text(
          `Start: ${formatDateString(contract.start_date)} | Due: ${formatDateString(contract.due_date)}`,
          margin + 5,
          yPosition,
        );
        yPosition += lineHeight;

        if ((contract.payment_schedule || []).length > 0) {
          pdf.text(`Payments: ${(contract.payment_schedule || []).length}`, margin + 5, yPosition);
          yPosition += lineHeight;
        }

        yPosition += 4;
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
      });

      console.log("PDF created successfully");
      pdf.save("Contracts-Report.pdf");
      console.log("PDF saved");
    } catch (error) {
      console.error("Error generating contracts report:", error);
      alert(`Error generating report: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Contracts</h1>
          <p className="text-slate-600 mt-1 text-sm md:text-base">Handle client contracts, deposits, payment schedules, and project details</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* <Button
            onClick={() => setIsCalculatorOpen(true)}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            💡 Material Calculator
          </Button> */}
          <Button
            onClick={() => {
              // Clear any saved draft to start fresh
              localStorage.removeItem(`contract_draft_${selectedYear}`);
              setIsEditMode(false);
              setEditingContractId(null);
              setFormData({
                client_name: "",
                client_address: "",
                client_city: "",
                client_state: "NC",
                client_zip: "",
                project_location: "",
                client_phone: "",
                client_email: "",
                project_description: "",
                project_name: "",
                deposit_amount: "",
                total_value: "",
                start_date: "",
                due_date: "",
                status: "pending",
                cabinet_type: CABINET_TYPES[0],
                material: FINISHES[0],
                custom_finish: "",
                installation_included: false,
                additional_notes: "",
              });
              setCostTracking(initializeCostTracking({ materials: availableMaterials }));
              setContractAttachments([]);
              setTermsAccepted(false);
              setIsModalOpen(true);
            }}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Contract
          </Button>
          <Button
            onClick={printAllContracts}
            className="gap-2 bg-slate-600 hover:bg-slate-700"
            disabled={contracts.length === 0}
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
        <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Edit Contract" : "Add New Contract"}</DialogTitle>
              <DialogDescription>
                {isEditMode ? "Update the contract details below." : "Enter the contract and client details below. Fill in all required fields."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_name">Client Name *</Label>
                  <Input
                    id="client_name"
                    placeholder="e.g., Denver Home Renovations LLC"
                    value={formData.client_name ?? ""}
                    onChange={(e) => handleFormChange("client_name", e.target.value)}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project_name">Project Name *</Label>
                  <Input
                    id="project_name"
                    placeholder="e.g., Kitchen Cabinet Upgrade"
                    value={formData.project_name ?? ""}
                    onChange={(e) => handleFormChange("project_name", e.target.value)}
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_description">Project Description</Label>
                <Input
                  id="project_description"
                  placeholder="Describe the project details"
                  value={formData.project_description ?? ""}
                  onChange={(e) => handleFormChange("project_description", e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <h3 className="font-semibold text-slate-900">Client Address</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_address">Street Address</Label>
                <Input
                  id="client_address"
                  placeholder="e.g., 1234 Oak Street"
                  value={formData.client_address ?? ""}
                  onChange={(e) => handleFormChange("client_address", e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_city">City</Label>
                  <Input
                    id="client_city"
                    placeholder="e.g., Denver"
                    value={formData.client_city ?? ""}
                    onChange={(e) => handleFormChange("client_city", e.target.value)}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_state">State</Label>
                  <Input
                    id="client_state"
                    placeholder="e.g., CO"
                    maxLength={2}
                    value={formData.client_state ?? ""}
                    onChange={(e) => handleFormChange("client_state", e.target.value.toUpperCase())}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_zip">ZIP Code</Label>
                  <Input
                    id="client_zip"
                    placeholder="e.g., 80202"
                    value={formData.client_zip ?? ""}
                    onChange={(e) => handleFormChange("client_zip", e.target.value)}
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="project_location">Project Location / Installation Address</Label>
                <Input
                  id="project_location"
                  placeholder="Leave blank if same as client address"
                  value={formData.project_location ?? ""}
                  onChange={(e) => handleFormChange("project_location", e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <h3 className="font-semibold text-slate-900">Client Contact</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client_phone">Phone</Label>
                  <Input
                    id="client_phone"
                    placeholder="e.g., (303) 555-0101"
                    value={formData.client_phone ?? ""}
                    onChange={(e) => handleFormChange("client_phone", e.target.value)}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client_email">Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    placeholder="e.g., contact@example.com"
                    value={formData.client_email ?? ""}
                    onChange={(e) => handleFormChange("client_email", e.target.value)}
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <h3 className="font-semibold text-slate-900">Cabinet Work Specifications</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cabinetType">Cabinet Type</Label>
                  <Select value={formData.cabinet_type ?? ""} onValueChange={(value) => handleFormChange("cabinet_type", value)}>
                    <SelectTrigger id="cabinetType" className="border-slate-300">
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CABINET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="material">Finish Type</Label>
                  <Select value={formData.material ?? ""} onValueChange={(value) => handleFormChange("material", value)}>
                    <SelectTrigger id="material" className="border-slate-300">
                      <SelectValue placeholder="Select finish..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FINISHES.map((finish) => (
                        <SelectItem key={finish} value={finish}>
                          {finish}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customFinish">Finish Details / Customization</Label>
                  <Input
                    id="customFinish"
                    placeholder="e.g., Semi-gloss white, Oak stain #245, Matte polyurethane, Custom color code..."
                    value={formData.custom_finish ?? ""}
                    onChange={(e) => handleFormChange("custom_finish", e.target.value)}
                    className="border-slate-300"
                  />
                  <p className="text-xs text-slate-500">Describe the specific finish, color, sheen level, or any special customization</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="installation_included"
                  checked={formData.installation_included}
                  onChange={(e) => handleFormChange("installation_included", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 cursor-pointer"
                />
                <Label htmlFor="installation_included" className="cursor-pointer">
                  Installation Included
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additional_notes">Specifications</Label>
                <textarea
                  id="additional_notes"
                  placeholder="Add any special notes or requirements for this project..."
                  value={formData.additional_notes ?? ""}
                  onChange={(e) => handleFormChange("additional_notes", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2"><Paperclip className="w-4 h-4" /> Contract Attachments</h3>
                    <p className="text-sm text-slate-600 mt-1">Upload design files, sketches, or contract documents</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      accept="image/*,.pdf,.doc,.docx,.xlsx"
                      className="cursor-pointer"
                    />
                  </div>

                  {contractAttachments.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No attachments yet</p>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const images = contractAttachments.filter(att => isImageFile(att.file_name));
                        const others = contractAttachments.filter(att => !isImageFile(att.file_name));

                        return (
                          <div className="space-y-4">
                            {/* Image Thumbnails */}
                            {images.length > 0 && (
                              <div>
                                <p className="text-xs text-slate-600 font-medium mb-2">Design Images ({images.length})</p>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                  {images.map((att) => (
                                    <div
                                      key={att.id}
                                      className="relative group aspect-square rounded border border-slate-300 overflow-hidden bg-slate-100"
                                    >
                                      <img
                                        src={att.file_data}
                                        alt={att.file_name}
                                        className="w-full h-full object-cover"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => deleteAttachment(att.id)}
                                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Document Files */}
                            {others.length > 0 && (
                              <div>
                                <p className="text-xs text-slate-600 font-medium mb-2">Documents ({others.length})</p>
                                <div className="space-y-2">
                                  {others.map((att) => (
                                    <div key={att.id} className="flex items-center justify-between p-3 bg-white rounded border border-slate-200 hover:border-slate-300 transition-colors">
                                      <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <span className="text-lg flex-shrink-0">{getFileIcon(att.file_name)}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-slate-900 truncate">{att.file_name}</p>
                                          <p className="text-xs text-slate-500">{new Date(att.upload_date).toLocaleDateString()}</p>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => deleteAttachment(att.id)}
                                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 ml-2 flex-shrink-0 rounded transition-colors"
                                        title="Delete"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <h3 className="font-semibold text-slate-900">💼 Labor Cost Calculator</h3>
                <p className="text-sm text-slate-600">For Internal Use Only: Calculate labor costs to determine project profitability</p>
              </div>

              <div className="space-y-2">
                <Label>Calculation Method</Label>
                <div className="flex gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setCostTracking({ ...costTracking, labor_cost: { ...costTracking.labor_cost, calculation_method: "manual" } })}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      costTracking.labor_cost.calculation_method === "manual"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    Manual Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setCostTracking({ ...costTracking, labor_cost: { ...costTracking.labor_cost, calculation_method: "daily" } })}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      costTracking.labor_cost.calculation_method === "daily"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    Daily Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setCostTracking({ ...costTracking, labor_cost: { ...costTracking.labor_cost, calculation_method: "hours" } })}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      costTracking.labor_cost.calculation_method === "hours"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    Hours Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setCostTracking({ ...costTracking, labor_cost: { ...costTracking.labor_cost, calculation_method: "monthly" } })}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      costTracking.labor_cost.calculation_method === "monthly"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    Monthly Payment
                  </button>
                </div>
              </div>

              {costTracking.labor_cost.calculation_method === "manual" && (
                <div className="space-y-2">
                  <Label htmlFor="laborAmount">Labor Cost ($) *</Label>
                  <Input
                    id="laborAmount"
                    type="number"
                    placeholder="e.g., 5000.00"
                    value={String(costTracking.labor_cost.amount ?? 0)}
                    onChange={(e) =>
                      setCostTracking({
                        ...costTracking,
                        labor_cost: { ...costTracking.labor_cost, amount: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="border-slate-300"
                    step="0.01"
                    min="0"
                  />
                </div>
              )}

              {costTracking.labor_cost.calculation_method === "daily" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Daily Rate</Label>
                    <div className="text-lg font-semibold text-slate-900">$900 per day</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="laborDays">Number of Days *</Label>
                    <Input
                      id="laborDays"
                      type="number"
                      placeholder="e.g., 8"
                      value={String(costTracking.labor_cost.days ?? 0)}
                      onChange={(e) => {
                        const days = parseFloat(e.target.value) || 0;
                        setCostTracking({
                          ...costTracking,
                          labor_cost: {
                            ...costTracking.labor_cost,
                            days,
                            amount: days * 900,
                          },
                        });
                      }}
                      className="border-slate-300"
                      step="0.5"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {costTracking.labor_cost.calculation_method === "hours" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hourly Rate</Label>
                    <div className="text-lg font-semibold text-slate-900">$50 per hour</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="laborHours">Total Hours *</Label>
                    <Input
                      id="laborHours"
                      type="number"
                      placeholder="e.g., 40"
                      value={String(costTracking.labor_cost.hours ?? 0)}
                      onChange={(e) => {
                        const hours = parseFloat(e.target.value) || 0;
                        setCostTracking({
                          ...costTracking,
                          labor_cost: {
                            ...costTracking.labor_cost,
                            hourly_rate: 50,
                            hours,
                            amount: hours * 50,
                          },
                        });
                      }}
                      className="border-slate-300"
                      step="0.5"
                      min="0"
                    />
                  </div>
                </div>
              )}

              {costTracking.labor_cost.calculation_method === "monthly" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Monthly Rate</Label>
                    <div className="text-lg font-semibold text-slate-900">$18,000 per month</div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="laborMonths">Number of Months *</Label>
                    <Input
                      id="laborMonths"
                      type="number"
                      placeholder="e.g., 1"
                      value={String(costTracking.labor_cost.months ?? 0)}
                      onChange={(e) => {
                        const months = parseFloat(e.target.value) || 0;
                        setCostTracking({
                          ...costTracking,
                          labor_cost: {
                            ...costTracking.labor_cost,
                            months,
                            amount: months * 18000,
                          },
                        });
                      }}
                      className="border-slate-300"
                      step="0.5"
                      min="0"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
                <p className="text-sm font-semibold text-slate-900">Labor Cost: ${((costTracking?.labor_cost?.amount) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="laborDescription">Labor Description / Notes (Optional)</Label>
                <textarea
                  id="laborDescription"
                  placeholder="e.g., Installation, finishing, custom carpentry work..."
                  value={costTracking.labor_cost.description ?? ""}
                  onChange={(e) =>
                    setCostTracking({
                      ...costTracking,
                      labor_cost: { ...costTracking.labor_cost, description: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                />
              </div>

              <div className="space-y-4 border-t pt-4">
                <div>
                  <h3 className="font-semibold text-slate-900">💡 Material Cost Calculator</h3>
                  <p className="text-sm text-slate-600 mt-1">For Internal Use: Track your material costs to analyze profit margins</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-semibold text-slate-900">1 Main Project</h4>
                  </div>

                  <div className="space-y-3 mb-4">
                    <h5 className="font-medium text-slate-800 text-sm">Standard Cabinet Materials</h5>
                    {!costTracking.materials || costTracking.materials.length === 0 ? (
                      <p className="text-sm text-slate-600 italic">Loading materials...</p>
                    ) : costTracking.materials.map((material) => {
                      const price = material.unit_price || (material as any).unitPrice || 0;
                      const total = (material.quantity || 0) * price;
                      const predefinedMaterial = availableMaterials.find(m => m.id === material.id);
                      const supplier = material.supplier || predefinedMaterial?.supplier;
                      return (
                        <div key={material.id} className="flex items-center gap-3 p-3 bg-white rounded border border-slate-200">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{material.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-600">${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}/{material.unit}</span>
                              {supplier && (
                                <span className="text-xs text-slate-500 italic">• {supplier}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={String(material.quantity ?? 0)}
                              onChange={(e) => {
                                const newMaterials = (costTracking.materials || []).map((m) =>
                                  m.id === material.id ? { ...m, quantity: parseFloat(e.target.value) || 0 } : m
                                );
                                setCostTracking({ ...costTracking, materials: newMaterials });
                              }}
                              className="border-slate-300 w-16"
                              step="0.1"
                              min="0"
                            />
                            <span className="text-sm font-semibold text-slate-900 min-w-[100px] text-right">
                              ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t pt-3 mb-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Standard Materials Subtotal:{" "}
                      <span className="text-blue-600">
                        ${((costTracking.materials || []).reduce((sum, m) => sum + (m.quantity || 0) * (m.unit_price || (m as any).unitPrice || 0), 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h5 className="font-medium text-slate-800 text-sm">Other Materials</h5>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-xs"
                        onClick={() => {
                          const customMaterial: MaterialItem = {
                            id: `CUSTOM-${Date.now()}`,
                            name: "Custom Material",
                            unit_price: 0,
                            quantity: 0,
                            unit: "unit",
                          };
                          setCostTracking({
                            ...costTracking,
                            materials: [...costTracking.materials, customMaterial],
                          });
                        }}
                      >
                        + Add Material
                      </Button>
                    </div>

                    {costTracking.materials.filter((m) => m.id.startsWith("CUSTOM")).length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No custom materials added yet</p>
                    ) : (
                      <div className="space-y-3">
                        {costTracking.materials
                          .filter((m) => m.id.startsWith("CUSTOM"))
                          .map((material) => {
                            const total = (material.quantity || 0) * (material.unit_price || (material as any).unitPrice || 0);
                            return (
                              <div key={material.id} className="flex items-center gap-2 p-3 bg-white rounded border border-slate-200">
                                <Input
                                  type="text"
                                  placeholder="Material name"
                                  value={material.name ?? ""}
                                  onChange={(e) => {
                                    const newMaterials = costTracking.materials.map((m) =>
                                      m.id === material.id ? { ...m, name: e.target.value } : m
                                    );
                                    setCostTracking({ ...costTracking, materials: newMaterials });
                                  }}
                                  className="border-slate-300 text-xs flex-1"
                                />
                                <Input
                                  type="number"
                                  placeholder="Price"
                                  value={String(material.unit_price ?? 0)}
                                  onChange={(e) => {
                                    const newMaterials = costTracking.materials.map((m) =>
                                      m.id === material.id ? { ...m, unit_price: parseFloat(e.target.value) || 0 } : m
                                    );
                                    setCostTracking({ ...costTracking, materials: newMaterials });
                                  }}
                                  className="border-slate-300 w-20 text-xs"
                                  step="0.01"
                                  min="0"
                                />
                                <Input
                                  type="number"
                                  placeholder="Qty"
                                  value={String(material.quantity ?? 0)}
                                  onChange={(e) => {
                                    const newMaterials = costTracking.materials.map((m) =>
                                      m.id === material.id ? { ...m, quantity: parseFloat(e.target.value) || 0 } : m
                                    );
                                    setCostTracking({ ...costTracking, materials: newMaterials });
                                  }}
                                  className="border-slate-300 w-16 text-xs"
                                  step="0.1"
                                  min="0"
                                />
                                <span className="text-xs font-semibold text-slate-900 min-w-[70px] text-right">
                                  ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCostTracking({
                                      ...costTracking,
                                      materials: costTracking.materials.filter((m) => m.id !== material.id),
                                    });
                                  }}
                                  className="text-red-600 hover:text-red-800 p-1"
                                >
                                  ✕
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3 mt-4">
                    <p className="text-sm font-bold text-slate-900">
                      Total Material Cost (1 section):{" "}
                      <span className="text-green-600">
                        ${costTracking.materials.reduce((sum, m) => sum + (m.quantity || 0) * (m.unit_price || (m as any).unitPrice || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <div>
                  <h3 className="font-semibold text-slate-900">🔧 Miscellaneous Costs</h3>
                  <p className="text-sm text-slate-600 mt-1">For Internal Use: Track permits, inspections, shipping, and other miscellaneous expenses</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                  {(costTracking.miscellaneous || []).length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No miscellaneous items added yet</p>
                  ) : (
                    <div className="space-y-3">
                      {(costTracking.miscellaneous || []).map((item) => (
                        <div key={item.id} className="flex items-center gap-2 p-3 bg-white rounded border border-slate-200">
                          <Input
                            type="text"
                            placeholder="Description (e.g., Permits, Shipping, Inspection)"
                            value={item.description ?? ""}
                            onChange={(e) => {
                              const newMisc = (costTracking.miscellaneous || []).map((m) =>
                                m.id === item.id ? { ...m, description: e.target.value } : m
                              );
                              setCostTracking({ ...costTracking, miscellaneous: newMisc });
                            }}
                            className="border-slate-300 flex-1 text-sm"
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">$</span>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={String(item.amount ?? 0)}
                              onChange={(e) => {
                                const newMisc = (costTracking.miscellaneous || []).map((m) =>
                                  m.id === item.id ? { ...m, amount: parseFloat(e.target.value) || 0 } : m
                                );
                                setCostTracking({ ...costTracking, miscellaneous: newMisc });
                              }}
                              className="border-slate-300 w-24 text-sm"
                              step="0.01"
                              min="0"
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900 min-w-[70px] text-right">
                            ${(item.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCostTracking({
                                ...costTracking,
                                miscellaneous: (costTracking.miscellaneous || []).filter((m) => m.id !== item.id),
                              });
                            }}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => {
                      const newMiscItem = {
                        id: `MISC-${Date.now()}`,
                        description: "",
                        amount: 0,
                      };
                      setCostTracking({
                        ...costTracking,
                        miscellaneous: [...(costTracking.miscellaneous || []), newMiscItem],
                      });
                    }}
                  >
                    + Add Miscellaneous Item
                  </Button>

                  <div className="border-t pt-3">
                    <p className="text-sm font-bold text-slate-900">
                      Total Miscellaneous Costs:{" "}
                      <span className="text-orange-600">
                        ${costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4 bg-slate-50 p-4 rounded-lg">
                <h3 className="font-semibold text-slate-900">💼 Cost Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-700">Material Costs:</span>
                    <span className="font-semibold">${(costTracking.materials || []).reduce((sum, m) => sum + (m.quantity || 0) * (m.unit_price || (m as any).unitPrice || 0), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Labor Costs:</span>
                    <span className="font-semibold">${(costTracking.labor_cost.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Miscellaneous Costs:</span>
                    <span className="font-semibold">${(costTracking.miscellaneous || []).reduce((sum, m) => sum + m.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-slate-900 font-bold">Total Project Costs:</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${(
                        ((costTracking?.materials) || []).reduce((sum, m) => sum + (m.quantity || 0) * (m.unit_price || (m as any).unitPrice || 0), 0) +
                        ((costTracking?.labor_cost?.amount) || 0) +
                        ((costTracking?.miscellaneous) || []).reduce((sum, m) => sum + m.amount, 0)
                      ).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-t pt-4">
                <h3 className="font-semibold text-slate-900">Contract Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_value">Total Contract Value *</Label>
                  <Input
                    id="total_value"
                    type="number"
                    placeholder="0.00"
                    value={String(formData.total_value ?? 0)}
                    onChange={(e) => handleFormChange("total_value", e.target.value)}
                    className="border-slate-300"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deposit_amount">Deposit Amount *</Label>
                  <Input
                    id="deposit_amount"
                    type="number"
                    placeholder="0.00"
                    value={String(formData.deposit_amount ?? 0)}
                    onChange={(e) => handleFormChange("deposit_amount", e.target.value)}
                    className="border-slate-300"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date ?? ""}
                    onChange={(e) => handleFormChange("start_date", e.target.value)}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date ?? ""}
                    onChange={(e) => handleFormChange("due_date", e.target.value)}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select value={formData.status ?? "pending"} onValueChange={(value) => handleFormChange("status", value as any)}>
                    <SelectTrigger id="status" className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4 bg-blue-50 p-4 rounded-lg max-h-96 overflow-y-auto">
                <h3 className="font-semibold text-slate-900">📋 Contract Terms & Agreement</h3>
                <div className="space-y-2 text-sm text-slate-700 text-justify">
                  <p className="font-semibold text-slate-900">CABINET INSTALLATION AND CONSTRUCTION AGREEMENT</p>
                  <p>This Agreement is entered into between the Client and the Contractor for cabinet work services as specified in this contract.</p>

                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">1. SCOPE OF WORK</p>
                    <p>The Contractor agrees to provide and install cabinets as specified in the work specifications section of this contract. All work will be performed in a professional and workmanlike manner in accordance with industry standards.</p>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">2. PAYMENT TERMS</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>The Client agrees to pay the total contract amount as specified in the payment schedule.</li>
                      <li>A deposit is required before work begins.</li>
                      <li>All subsequent payments are due as outlined in the payment schedule.</li>
                      <li>Late payments may result in work stoppage until payment is received.</li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">3. MATERIALS AND SPECIFICATIONS</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>All materials will be as specified in the work specifications section.</li>
                      <li>Any changes to materials or specifications must be agreed upon in writing and may affect the total contract price.</li>
                      <li>The Contractor will provide materials of good quality suitable for the intended purpose.</li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">4. TIMELINE</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Work will commence on the start date specified in this contract.</li>
                      <li>The expected completion date is an estimate and may be subject to change due to unforeseen circumstances.</li>
                      <li>The Contractor will make reasonable efforts to complete the work within the specified timeframe.</li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">5. WARRANTY</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>The Contractor warrants that all work will be free from defects in workmanship for a period of one (1) year from the date of completion.</li>
                      <li>Cabinet hardware and materials are covered by manufacturer warranties.</li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <p className="font-semibold text-slate-900">6. PERMITS AND COMPLIANCE</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>The Contractor will obtain all necessary permits required for the work.</li>
                      <li>All work will comply with local building codes and regulations.</li>
                    </ul>
                  </div>

                  <p className="italic">By accepting these terms, you acknowledge that you have read and understood the complete contract agreement.</p>
                </div>

                <div className="flex items-center space-x-2 pt-2 border-t">
                  <input
                    id="termsAccepted"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 cursor-pointer"
                  />
                  <Label htmlFor="termsAccepted" className="cursor-pointer text-sm font-medium">
                    I have read and agree to the terms and conditions outlined in this Cabinet Installation and Construction Agreement
                  </Label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={handleCloseModal}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddContract}
                disabled={!isEditMode && !termsAccepted}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isEditMode ? "Update Contract" : "Add Contract"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>💡 Material Cost Calculator</DialogTitle>
              <DialogDescription>
                Calculate total material costs for your projects
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-slate-900 mb-3">Available Materials</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {availableMaterials.map((material) => (
                    <div key={material.id} className="flex items-center justify-between p-3 bg-white rounded border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{material.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-600">${material.unit_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}/{material.unit}</span>
                          {material.supplier && (
                            <span className="text-xs text-slate-500 italic">• {material.supplier}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (!calculatorMaterials.find(m => m.id === material.id)) {
                            setCalculatorMaterials([...calculatorMaterials, { ...material, quantity: 1 }]);
                          }
                        }}
                        disabled={calculatorMaterials.some(m => m.id === material.id)}
                      >
                        {calculatorMaterials.some(m => m.id === material.id) ? "Added" : "Add"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-slate-900 mb-3">Selected Materials</h3>
                {calculatorMaterials.length === 0 ? (
                  <p className="text-sm text-slate-600 italic text-center py-6">No materials selected yet. Add materials above to calculate costs.</p>
                ) : (
                  <div className="space-y-3">
                    {calculatorMaterials.map((material) => {
                      const total = material.quantity * material.unit_price;
                      return (
                        <div key={material.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-200">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{material.name}</p>
                            <p className="text-xs text-slate-600">${material.unit_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}/{material.unit}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="Qty"
                              value={String(material.quantity ?? 1)}
                              onChange={(e) => {
                                const newQuantity = parseFloat(e.target.value) || 0;
                                setCalculatorMaterials(
                                  calculatorMaterials.map(m =>
                                    m.id === material.id ? { ...m, quantity: newQuantity } : m
                                  )
                                );
                              }}
                              className="border-slate-300 w-20"
                              step="0.1"
                              min="0"
                            />
                            <span className="text-sm font-semibold text-slate-900 min-w-[100px] text-right">
                              ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCalculatorMaterials(calculatorMaterials.filter(m => m.id !== material.id));
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-900">Total Material Cost:</span>
                        <span className="text-2xl font-bold text-blue-600">
                          ${calculatorMaterials.reduce((sum, m) => sum + (m.quantity * m.unit_price), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        setCalculatorMaterials([]);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Total Contracts</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">{filteredContracts.length}</h3>
            <p className="text-xs text-slate-500 mt-1">All projects</p>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">Total Contract Value</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-2">${totalValue.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-1">Total revenue</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">
              Amount Paid{selectedPaymentMonthLabel ? ` (${selectedPaymentMonthLabel})` : ""}
            </p>
            <h3 className="text-2xl font-bold text-green-600 mt-2">${totalAmountPaid.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-1">
              From payment schedule{selectedPaymentMonthLabel ? " (month filter applied)" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-sm font-medium text-slate-500">
              Amount Due{selectedPaymentMonthLabel ? ` (${selectedPaymentMonthLabel})` : ""}
            </p>
            <h3 className="text-2xl font-bold text-orange-600 mt-2">${totalAmountDue.toLocaleString()}</h3>
            <p className="text-xs text-slate-500 mt-1">Pending payments</p>
          </CardContent>
        </Card>
      </div>

      <>
        {(() => {
          const getYearFromISODate = (dateStr?: string) => {
            if (!dateStr) return null;
            const parts = String(dateStr).split("-");
            const year = parseInt(parts[0] ?? "", 10);
            return Number.isFinite(year) ? year : null;
          };

          // Keep this visible even when filters yield 0 matches
          const overdueContracts = contracts
            .filter((c) => {
              const contractYear = getYearFromISODate(c.due_date) ?? getYearFromISODate(c.start_date);
              return contractYear ? contractYear === selectedYear : true;
            })
            .filter((c) => !!c.due_date && isOverdue(c.due_date));

          if (overdueContracts.length === 0) return null;

          return (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900">
                    {overdueContracts.length} Overdue Contract{overdueContracts.length !== 1 ? "s" : ""}
                  </p>
                  <p className="text-sm text-red-800">
                    {overdueContracts.map((c) => `${c.id} (${c.client_name})`).join(", ")}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Active Contracts</CardTitle>
            <CardDescription>
              All client contracts with deposit and payment schedule tracking
            </CardDescription>
            <div className="flex flex-col lg:flex-row gap-4 mt-4 items-start lg:items-center flex-wrap">
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger className="w-full sm:w-40 border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPaymentMonth} onValueChange={(value: any) => setFilterPaymentMonth(value)}>
                <SelectTrigger className="w-full sm:w-44 border-slate-300">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {MONTH_LABELS_LONG.map((label, idx) => (
                    <SelectItem key={label} value={String(idx + 1)}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-start sm:items-center w-full lg:w-auto">
                <Label className="text-sm text-slate-600 whitespace-nowrap">Due Date Range:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-2 w-full sm:w-auto">
                  <Input
                    id="filterFromDate"
                    type="date"
                    placeholder="From"
                    value={filterFromDate ?? ""}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                    className="border-slate-300 w-full sm:w-40"
                  />
                  <span className="hidden sm:inline text-slate-500 text-sm">to</span>
                  <Input
                    id="filterToDate"
                    type="date"
                    placeholder="To"
                    value={filterToDate ?? ""}
                    onChange={(e) => setFilterToDate(e.target.value)}
                    className="border-slate-300 w-full sm:w-40"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">ID</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Client</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Project</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Value</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Deposit</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">
                      Paid{selectedPaymentMonthLabel ? ` (${selectedPaymentMonthLabel})` : ""}
                    </th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">
                      Due{selectedPaymentMonthLabel ? ` (${selectedPaymentMonthLabel})` : ""}
                    </th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Due Date</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Status</th>
                    <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-6 text-center text-slate-600">
                        No contracts match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((contract, idx) => {
                      const paidPayments = (contract.payment_schedule || [])
                        .filter((p: any) => p.status === "paid")
                        .filter((p: any) => {
                          if (!selectedPaymentMonth) return true;
                          const month = getMonthFromISODate(p.paid_date || p.paidDate || p.due_date);
                          return month === selectedPaymentMonth;
                        });

                      const pendingPayments = (contract.payment_schedule || [])
                        .filter((p: any) => p.status === "pending")
                        .filter((p: any) => {
                          if (!selectedPaymentMonth) return true;
                          const month = getMonthFromISODate(p.due_date);
                          return month === selectedPaymentMonth;
                        });

                      const amountPaid = paidPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
                      const amountDue = pendingPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

                      return (
                        <tr key={contract.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td
                            className={`p-3 text-slate-700 font-medium whitespace-nowrap border-l-4 ${
                              (contract.payment_schedule?.filter((p) => p.status === "paid").length || 0) === 0
                                ? "border-l-red-500"
                                : "border-l-yellow-500"
                            }`}
                          >
                            <button
                              onClick={() => setDetailsContractId(contract.id)}
                              className="text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer font-semibold pl-2"
                              title="View contract details"
                            >
                              {contract.id}
                            </button>
                          </td>
                          <td className="p-3 text-slate-700 text-xs whitespace-nowrap">{contract.client_name}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">{contract.project_name}</td>
                          <td className="p-3 text-slate-700 font-medium whitespace-nowrap">${contract.total_value.toLocaleString()}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">${contract.deposit_amount.toLocaleString()}</td>
                          <td className="p-3 text-green-600 font-semibold whitespace-nowrap">${amountPaid.toLocaleString()}</td>
                          <td className="p-3 text-orange-600 font-semibold whitespace-nowrap">${amountDue.toLocaleString()}</td>
                          <td className={`p-3 whitespace-nowrap ${isOverdue(contract.due_date) ? "text-red-600 font-semibold" : "text-slate-700"}`}>
                            {formatDateString(contract.due_date)}
                            {isOverdue(contract.due_date) && " ⚠️"}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getStatusBadge(contract.status)}`}>
                                {contract.status.replace("-", " ")}
                              </span>
                              {(() => {
                                const totalPayments = contract.payment_schedule?.length || 0;
                                const paidPayments = contract.payment_schedule?.filter((p) => p.status === "paid").length || 0;
                                const badgeColor = paidPayments === 0
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-yellow-100 text-yellow-700 border-yellow-200";

                                return (
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${badgeColor}`}>
                                    {paidPayments}/{totalPayments} payments
                                  </span>
                                );
                              })()}
                            </div>
                          </td>
                          <td className="p-3 flex gap-2">
                            <button
                              onClick={() => setSelectedContractId(contract.id)}
                              className="text-green-600 hover:text-green-800 p-1.5 hover:bg-green-50 rounded transition-colors"
                              title="View payment schedule"
                            >
                              <CircleDollarSign className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setPdfSelectContractId(contract.id)}
                              className="text-indigo-600 hover:text-indigo-800 p-1.5 hover:bg-indigo-50 rounded transition-colors"
                              title="Download PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEditContract(contract)}
                              className="text-blue-600 hover:text-blue-800 p-1.5 hover:bg-blue-50 rounded transition-colors"
                              title="Edit contract"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteContract(contract.id)}
                              className="text-red-600 hover:text-red-800 p-1.5 hover:bg-red-50 rounded transition-colors"
                              title="Delete contract"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
              {filteredContracts.length === 0 ? (
                <div className="p-6 text-center text-slate-600 bg-white rounded-lg border border-slate-200">
                  No contracts match the current filters.
                </div>
              ) : (
                filteredContracts.map((contract) => (
                  <div key={contract.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                    <div
                      className={`p-4 border-b border-slate-100 flex justify-between items-start border-l-4 ${
                        (contract.payment_schedule?.filter((p) => p.status === "paid").length || 0) === 0
                          ? "border-l-red-500"
                          : "border-l-yellow-500"
                      }`}
                    >
                      <div>
                        <button
                          onClick={() => setDetailsContractId(contract.id)}
                          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer font-bold text-lg"
                          title="View contract details"
                        >
                          {contract.project_name}
                        </button>
                        <p className="text-sm text-slate-600">{contract.client_name}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getStatusBadge(contract.status)}`}>
                          {contract.status.replace("-", " ")}
                        </span>
                        {isOverdue(contract.due_date) && (
                          <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500">Contract Value</span>
                        <span className="font-bold text-slate-900 text-lg">${contract.total_value.toLocaleString()}</span>
                      </div>

                       <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="block text-slate-400">
                            Amount Paid{selectedPaymentMonthLabel ? ` (${selectedPaymentMonthLabel})` : ""}
                          </span>
                          <span className="font-semibold text-green-600">
                            ${
                              (contract.payment_schedule || [])
                                .filter((p: any) => p.status === "paid")
                                .filter((p: any) => {
                                  if (!selectedPaymentMonth) return true;
                                    const month = getMonthFromISODate(p.paid_date || p.paidDate || p.due_date);
                                  return month === selectedPaymentMonth;
                                })
                                .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
                                .toLocaleString()
                            }
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400">
                            Amount Due{selectedPaymentMonthLabel ? ` (${selectedPaymentMonthLabel})` : ""}
                          </span>
                          <span className="font-semibold text-orange-600">
                            ${
                              (contract.payment_schedule || [])
                                .filter((p: any) => p.status === "pending")
                                .filter((p: any) => {
                                  if (!selectedPaymentMonth) return true;
                                  const month = getMonthFromISODate(p.due_date);
                                  return month === selectedPaymentMonth;
                                })
                                .reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
                                .toLocaleString()
                            }
                          </span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Deposit</span>
                          <span className="text-slate-600">${contract.deposit_amount.toLocaleString()}</span>
                        </div>
                        <div>
                           <span className="block text-slate-400">Due Date</span>
                           <span className="text-slate-600">{formatDateString(contract.due_date)}</span>
                        </div>
                      </div>

                       <div className="pt-2">
                          <span className="block text-xs text-slate-400 mb-1">Payment Status</span>
                          {(() => {
                              const totalPayments = contract.payment_schedule?.length || 0;
                              const paidPayments = contract.payment_schedule?.filter(p => p.status === 'paid').length || 0;
                              const badgeColor = paidPayments === 0 
                                ? "bg-red-50 text-red-700 border-red-100" 
                                : "bg-yellow-50 text-yellow-700 border-yellow-100";
                              
                              return (
                                <div className={`inline-block px-2 py-1 rounded text-xs font-medium border ${badgeColor}`}>
                                  {paidPayments} of {totalPayments} payments completed
                                </div>
                              );
                            })()}
                       </div>
                    </div>

                    <div className="bg-slate-50 p-3 flex justify-between gap-2 border-t border-slate-100">
                      <button
                            onClick={() => setSelectedContractId(contract.id)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                            title="Payments"
                          >
                            <CircleDollarSign className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setPdfSelectContractId(contract.id)}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-full"
                            title="PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                           <button
                             onClick={() => setDetailsContractId(contract.id)}
                             className="p-2 text-slate-600 hover:bg-slate-200 rounded-full"
                             title="Details"
                           >
                             <FileIcon className="w-4 h-4" />
                           </button>
                          <button
                            onClick={() => handleEditContract(contract)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteContract(contract.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                    </div>
                  </div>
                )))}
              </div>
            </CardContent>
          </Card>

          {selectedContractId && (
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payment Schedule</CardTitle>
                  <CardDescription>
                    {contracts.find((c) => c.id === selectedContractId)?.project_name} - {contracts.find((c) => c.id === selectedContractId)?.client_name}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleOpenPaymentModal(selectedContractId)}
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payment
                  </Button>
                  <Button
                    onClick={() => handleOpenThankYouLetterModal(selectedContractId)}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <FileText className="w-4 h-4" />
                    Thank You Letter
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(() => {
                    const scheduleRaw =
                      contracts.find((c) => c.id === selectedContractId)?.payment_schedule ?? [];
                    const schedule = scheduleRaw.map(normalizePayment);

                    if (schedule.length === 0) {
                      return (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600">
                          No payments.
                        </div>
                      );
                    }

                    const sortedSchedule = [...schedule].sort((a: any, b: any) => {
                      const aIsDownPayment = String(a.description || "").toLowerCase().includes("down");
                      const bIsDownPayment = String(b.description || "").toLowerCase().includes("down");
                      if (aIsDownPayment && !bIsDownPayment) return -1;
                      if (!aIsDownPayment && bIsDownPayment) return 1;
                      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                    });

                    return sortedSchedule.map((payment: any) => {
                      const partialPayments = getPaymentPartialPayments(payment);
                      const received = getPaymentReceivedAmount(payment);
                      const remaining = getPaymentRemainingAmount(payment);
                      const progressPct = payment.amount > 0 ? (received / payment.amount) * 100 : 0;

                      return (
                        <div
                          key={payment.id}
                          className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-slate-900">{payment.description}</p>
                              <p className="text-sm text-slate-600">
                                Due: {formatDateString(payment.due_date)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-900">${Number(payment.amount || 0).toLocaleString()}</p>
                              <span
                                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  isPaymentFullyReceived(payment)
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {isPaymentFullyReceived(payment) ? "Received" : "Pending"}
                              </span>
                            </div>
                          </div>

                          {/* Payment progress display */}
                          {partialPayments.length > 0 && (
                            <div className="bg-white p-3 rounded border border-slate-200 space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600">
                                  Received:{" "}
                                  <span className="font-semibold text-green-700">
                                    ${received.toLocaleString()}
                                  </span>
                                </span>
                                <span className="text-slate-600">
                                  Pending Deposit:{" "}
                                  <span className="font-semibold text-orange-700">
                                    ${remaining.toLocaleString()}
                                  </span>
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full transition-all"
                                  style={{ width: `${Math.min(progressPct, 100)}%` }}
                                ></div>
                              </div>

                              <div className="space-y-2 mt-2">
                                {partialPayments.map((pp: PartialPayment) => (
                                  <div key={pp.id} className="bg-slate-50 p-2 rounded border border-slate-150 text-xs">
                                    <div className="mb-1">
                                      <p className="font-semibold text-slate-900">
                                        • {formatDateString(pp.date)}: ${pp.amount.toLocaleString()} ({paymentMethodPlainLabel(pp.method)})
                                      </p>
                                      {pp.transaction_reference && (
                                        <p className="text-green-700 font-semibold ml-2">
                                          Transaction #: {pp.transaction_reference}
                                        </p>
                                      )}
                                    </div>
                                    <div className="space-y-0.5 text-slate-600 ml-2">
                                      {(pp.method === "wire" || pp.method === "ach" || pp.method === "direct_deposit") && (
                                        <>
                                          {pp.bank_name && <p>Bank: {pp.bank_name}</p>}
                                          {pp.routing_number && <p>Routing: {pp.routing_number}</p>}
                                          {pp.account_number && <p>Account: {pp.account_number}</p>}
                                        </>
                                      )}
                                      {pp.method === "check" && (
                                        <>
                                          {pp.check_number && <p>Check #: {pp.check_number}</p>}
                                          {pp.check_attachment && <p className="text-green-600">✓ Check image attached</p>}
                                        </>
                                      )}
                                      {(pp.method === "credit_card" || pp.method === "debit_card") && (
                                        <>
                                          {pp.card_last4 && <p>Card Last 4: {pp.card_last4}</p>}
                                        </>
                                      )}
                                      {pp.description && <p className="italic">Note: {pp.description}</p>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {payment.status === "paid" && (
                            <div className="bg-white p-3 rounded border border-slate-200 space-y-2">
                              {payment.paid_date && (
                                <p className="text-sm text-slate-600">
                                  <span className="font-semibold">Paid Date:</span>{" "}
                                  {payment.paid_date ? formatDateString(payment.paid_date) : "-"}
                                </p>
                              )}
                              {payment.payment_method && (
                                <p className="text-sm text-slate-600">
                                  <span className="font-semibold">Method:</span>{" "}
                                  {paymentMethodEmojiLabel(payment.payment_method)}
                                  {payment.check_number && ` (#${payment.check_number})`}
                                  {(payment.card_last4 || payment.credit_card_last4) && ` (****${payment.card_last4 || payment.credit_card_last4})`}
                                </p>
                              )}
                              {payment.transaction_reference && (
                                <p className="text-sm text-slate-600">
                                  <span className="font-semibold">Reference:</span> {payment.transaction_reference}
                                </p>
                              )}
                              {payment.receipt_attachment && (
                                <p className="text-sm text-blue-600">📎 Receipt attached: {payment.receipt_attachment}</p>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleOpenPaymentModal(selectedContractId, payment)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                              title="Edit payment"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePayment(selectedContractId, payment.id)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                              title="Delete payment"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
      </>

      {isPaymentModalOpen && selectedContractId && (
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className={`text-lg font-bold ${editingPaymentId ? 'text-blue-600' : 'text-green-600'}`}>
                {editingPaymentId ? "✏️ Update Payment" : "➕ Add New Payment"}
              </DialogTitle>
              <DialogDescription className="text-sm">
                {editingPaymentId
                  ? "Modify the payment details below, or add partial payments to track multiple receipts toward this payment"
                  : "Create a new scheduled payment with its payment method and terms"}
              </DialogDescription>
            </DialogHeader>
            {/* Edit mode summary */}
            {editingPaymentId && (
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-blue-900 mb-2">✏️ Editing Payment</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium">Description:</p>
                    <p className="text-blue-900 font-semibold">{paymentForm.description}</p>
                  </div>
                  <div>
                    <p className="text-blue-700 font-medium">Current Amount:</p>
                    <p className="text-blue-900 font-semibold">${Number(paymentForm.amount || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  placeholder="e.g., 50% Down Payment"
                  value={paymentForm.description ?? ""}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={String(paymentForm.amount ?? 0)}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: parseFloat(e.target.value) || 0 })}
                  className="border-slate-300"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDueDate">Due Date *</Label>
                <Input
                  id="paymentDueDate"
                  type="date"
                  value={paymentForm.due_date ?? ""}
                  onChange={(e) => setPaymentForm({ ...paymentForm, due_date: e.target.value })}
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contractPaymentMethod">Payment Method *</Label>
                <Select
                  value={paymentForm.payment_method ?? "cash"}
                  onValueChange={(value) => {
                    setPaymentForm({ ...paymentForm, payment_method: value as any });

                    if (value === "wire") {
                      setTimeout(() => {
                        const wireSection = document.getElementById("wireTransferSection");
                        if (wireSection) {
                          wireSection.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }, 100);
                    }
                  }}
                >
                  <SelectTrigger id="contractPaymentMethod" className="border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                    <SelectItem value="ach">Bank Transfer (ACH)</SelectItem>
                    <SelectItem value="wire">Wire Transfer</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Select how the payment will be made</p>
              </div>

              {paymentForm.payment_method === "wire" && (
                <>
                  <div className="bg-red-600 text-white p-4 rounded-lg border-2 border-red-800 shadow-lg">
                    <p className="font-bold text-lg mb-2">🚨 WIRE TRANSFER SELECTED</p>
                    <p className="text-sm">You MUST fill the 2 fields below before you can save this payment:</p>
                    <ul className="text-sm mt-2 list-disc list-inside space-y-1">
                      <li>1️⃣ Bank Name</li>
                      <li>2️⃣ TRN (Transaction Reference Number)</li>
                    </ul>
                    <p className="text-xs mt-3 font-semibold">👇 Scroll down to see all fields</p>
                  </div>

                  {(() => {
                    const bankNameFilled = !!String((paymentForm as any).bank_name || "").trim();
                    const trnFilled = !!String((paymentForm as any).transaction_reference || "").trim();
                    const filledCount = [bankNameFilled, trnFilled].filter(Boolean).length;
                    const allFilled = filledCount === 2;

                    return (
                      <div
                        id="wireTransferSection"
                        className="bg-gradient-to-b from-red-50 to-orange-50 border-4 border-red-600 p-6 rounded-xl space-y-6 shadow-2xl"
                        style={{ scrollMarginTop: "20px" }}
                      >
                        <div className="text-center space-y-2 bg-red-600 text-white p-4 rounded-lg">
                          <p className="text-3xl font-bold">🔴 WIRE TRANSFER PAYMENT REQUIRED</p>
                          <p className="text-lg font-semibold">Fill ALL 2 fields below to save payment</p>
                          <div className="text-2xl font-bold mt-2">{filledCount}/2 Fields Completed</div>
                          <div className="w-full bg-red-400 rounded-full h-3 mt-3 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${
                                allFilled ? "bg-green-500" : "bg-yellow-400"
                              }`}
                              style={{ width: `${(filledCount / 2) * 100}%` }}
                            />
                          </div>
                        </div>

                        <div
                          className={`p-4 rounded-lg border-3 transition-all ${
                            bankNameFilled
                              ? "border-green-600 bg-green-100"
                              : "border-red-600 bg-red-100 animate-pulse"
                          }`}
                        >
                          <Label htmlFor="wireBankName" className="text-lg font-bold block mb-3">
                            <span className="text-2xl">1️⃣</span> Bank Name {bankNameFilled ? "✅" : "⚠️ REQUIRED"}
                          </Label>
                          <Input
                            id="wireBankName"
                            placeholder="e.g., Wells Fargo, Chase Bank, Truist Bank"
                            value={String((paymentForm as any).bank_name ?? "")}
                            onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                            className={`border-3 text-base p-3 font-semibold h-12 text-lg ${
                              !bankNameFilled ? "border-red-600 bg-white" : "border-green-600 bg-green-50"
                            }`}
                          />
                        </div>

                        <div
                          className={`p-4 rounded-lg border-3 transition-all ${
                            trnFilled
                              ? "border-green-600 bg-green-100"
                              : "border-red-600 bg-red-100 animate-pulse"
                          }`}
                        >
                          <Label htmlFor="wireTrn" className="text-lg font-bold block mb-3">
                            <span className="text-2xl">2️⃣</span> TRN (Transaction Reference Number) {trnFilled ? "✅" : "⚠️ REQUIRED"}
                          </Label>
                          <Input
                            id="wireTrn"
                            placeholder="e.g., 2026012900539475"
                            value={String((paymentForm as any).transaction_reference ?? "")}
                            onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                            className={`border-3 text-base p-3 font-semibold h-12 text-lg ${
                              !trnFilled ? "border-red-600 bg-white" : "border-green-600 bg-green-50"
                            }`}
                          />
                          <p className="text-xs text-green-900 font-semibold mt-2">✓ This is your bank confirmation/reference number</p>
                        </div>

                        <div
                          className={`p-4 rounded-lg border-3 font-mono text-sm ${
                            allFilled ? "border-green-600 bg-green-100" : "border-red-600 bg-red-100"
                          }`}
                        >
                          <p className="font-bold text-base mb-3">📋 Field Status Summary:</p>
                          <div className="space-y-2">
                            <p>1️⃣ Bank Name: {bankNameFilled ? "✅ FILLED" : "❌ EMPTY"}</p>
                            <p>2️⃣ TRN: {trnFilled ? "✅ FILLED" : "❌ EMPTY"}</p>
                          </div>
                          {!allFilled && (
                            <p className="text-red-700 font-bold mt-3 text-center">
                              🚫 YOU MUST FILL ALL 2 FIELDS ABOVE BEFORE SAVING
                            </p>
                          )}
                          {allFilled && (
                            <p className="text-green-700 font-bold mt-3 text-center text-base">
                              ✅ ALL 2 FIELDS COMPLETE - READY TO SAVE!
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Status *</Label>
                <Select
                  value={paymentForm.status ?? "pending"}
                  onValueChange={(value) => setPaymentForm({ ...paymentForm, status: value as "pending" | "paid" })}
                >
                  <SelectTrigger id="paymentStatus" className="border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentForm.status === "paid" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="paidDate">Paid Date</Label>
                    <Input
                      id="paidDate"
                      type="date"
                      value={paymentForm.paid_date ?? ""}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paid_date: e.target.value || "" })}
                      className="border-slate-300"
                    />
                  </div>

                  {paymentForm.payment_method !== "cash" && paymentForm.payment_method !== "wire" && (
                    <div className="space-y-2">
                      <Label htmlFor="transactionRef">Transaction Reference</Label>
                      <Input
                        id="transactionRef"
                        placeholder="e.g., TXN-001, Check #123, Auth Code"
                        value={(paymentForm as any).transaction_reference ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                        className="border-slate-300"
                      />
                      <p className="text-xs text-slate-500">
                        Transaction ID, reference number, or confirmation code
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="receiptAttachment">Receipt/Confirmation (optional)</Label>
                    <Input
                      id="receiptAttachment"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setPaymentForm({ ...paymentForm, receipt_attachment: e.target.files?.[0]?.name || "" })}
                      className="border-slate-300"
                    />
                    <p className="text-xs text-slate-500">
                      Upload payment receipt, confirmation email, or bank statement
                    </p>
                  </div>
                </>
              )}

              {(paymentForm.payment_method === "direct_deposit" || paymentForm.payment_method === "ach") && (
                <div className="bg-slate-50 p-4 rounded space-y-3 border border-slate-200">
                  <p className="text-sm font-semibold text-slate-700">Bank Information</p>

                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      placeholder="e.g., Wells Fargo, Chase Bank"
                      value={(paymentForm as any).bank_name ?? ""}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                      className="border-slate-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="routingNumber">Routing Number</Label>
                    <Input
                      id="routingNumber"
                      placeholder="9-digit routing number"
                      value={(paymentForm as any).routing_number ?? ""}
                      onChange={(e) => setPaymentForm({ ...paymentForm, routing_number: e.target.value })}
                      className="border-slate-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      type="password"
                      placeholder="Account number (will be masked)"
                      value={(paymentForm as any).account_number ?? ""}
                      onChange={(e) => setPaymentForm({ ...paymentForm, account_number: e.target.value })}
                      className="border-slate-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select
                      value={(paymentForm as any).account_type ?? "checking"}
                      onValueChange={(value) => setPaymentForm({ ...paymentForm, account_type: value as any })}
                    >
                      <SelectTrigger className="border-slate-300">
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Checking</SelectItem>
                        <SelectItem value="savings">Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {paymentForm.payment_method === "check" && (
                <div className="bg-slate-50 p-4 rounded space-y-3 border border-slate-200">
                  <p className="text-sm font-semibold text-slate-700">Check Information</p>

                  <div className="space-y-2">
                    <Label htmlFor="checkNumber">Check Number</Label>
                    <Input
                      id="checkNumber"
                      placeholder="e.g., 1001"
                      value={(paymentForm as any).check_number ?? ""}
                      onChange={(e) => setPaymentForm({ ...paymentForm, check_number: e.target.value })}
                      className="border-slate-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="checkBankName">Bank Name</Label>
                    <Input
                      id="checkBankName"
                      placeholder="e.g., Wells Fargo, Chase Bank"
                      value={(paymentForm as any).bank_name ?? ""}
                      onChange={(e) => setPaymentForm({ ...paymentForm, bank_name: e.target.value })}
                      className="border-slate-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="checkAttachment">Attach Check Image (optional)</Label>
                    <Input
                      id="checkAttachment"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setPaymentForm({ ...paymentForm, check_attachment: e.target.files?.[0]?.name || "" })}
                      className="border-slate-300"
                    />
                  </div>
                </div>
              )}

              {(paymentForm.payment_method === "credit_card" || paymentForm.payment_method === "debit_card") && (
                <div className="bg-slate-50 p-4 rounded space-y-3 border border-slate-200">
                  <p className="text-sm font-semibold text-slate-700">
                    {paymentForm.payment_method === "credit_card" ? "Credit Card Information" : "Debit Card Information"}
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="cardLast4">Last 4 Digits of Card</Label>
                    <Input
                      id="cardLast4"
                      placeholder="e.g., 4242"
                      value={(paymentForm as any).card_last4 ?? ""}
                      onChange={(e) => setPaymentForm({ ...paymentForm, card_last4: e.target.value })}
                      className="border-slate-300"
                      maxLength={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cardTxnRef">Transaction/Authorization Code</Label>
                    <Input
                      id="cardTxnRef"
                      placeholder="e.g., TXN-1234567890"
                      value={(paymentForm as any).transaction_reference ?? ""}
                      onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                      className="border-slate-300"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Record Partial Payment Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Record Partial Payment</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPartialPaymentForm(!showPartialPaymentForm)}
                  className="gap-2"
                >
                  {showPartialPaymentForm ? "Cancel" : "+ Add Partial Payment"}
                </Button>
              </div>

                {showPartialPaymentForm && (
                  <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-3 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="partialAmount">Amount *</Label>
                      <Input
                        id="partialAmount"
                        type="number"
                        placeholder="0.00"
                        value={partialPaymentForm.amount}
                        onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, amount: parseFloat(e.target.value) || 0 })}
                        className="border-slate-300"
                        step="0.01"
                        min="0"
                      />
                      {(() => {
                        if (editingPaymentId) {
                          const contract = contracts.find((c) => c.id === selectedContractId);
                          const current = contract?.payment_schedule?.find((p: any) => p.id === editingPaymentId);
                          if (!current) return null;
                          return (
                            <p className="text-xs text-slate-500">
                              Remaining balance: ${getPaymentRemainingAmount(current).toLocaleString()}
                            </p>
                          );
                        }

                        const partialSum = (paymentForm.partial_payments || []).reduce(
                          (sum, pp) => sum + Number(pp?.amount || 0),
                          0,
                        );
                        const remaining = Number(paymentForm.amount || 0) - partialSum;
                        if (!Number.isFinite(remaining) || remaining <= 0) return null;
                        return (
                          <p className="text-xs text-slate-500">
                            Remaining balance: ${remaining.toLocaleString()}
                          </p>
                        );
                      })()}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="partialPaymentDate">Date *</Label>
                      <Input
                        id="partialPaymentDate"
                        type="date"
                        value={partialPaymentForm.date}
                        onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, date: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="partialPaymentMethod">Payment Method *</Label>
                      <Select
                        value={partialPaymentForm.method}
                        onValueChange={(value) => setPartialPaymentForm({ ...partialPaymentForm, method: value as any })}
                      >
                        <SelectTrigger className="border-slate-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="wire">Wire Transfer</SelectItem>
                          <SelectItem value="ach">Bank Transfer (ACH)</SelectItem>
                          <SelectItem value="credit_card">Credit Card</SelectItem>
                          <SelectItem value="debit_card">Debit Card</SelectItem>
                          <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                          <SelectItem value="zelle">Zelle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="partialPaymentDesc">Description (Optional)</Label>
                      <Input
                        id="partialPaymentDesc"
                        placeholder="e.g., Partial deposit received"
                        value={partialPaymentForm.description || ""}
                        onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, description: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>

                    {partialPaymentForm.method && (
                      ["wire", "ach", "credit_card", "direct_deposit", "debit_card", "zelle"].includes(
                        partialPaymentForm.method
                      ) && (
                        <div className="space-y-2">
                          <Label htmlFor="partialPaymentTRN">
                            {partialPaymentForm.method === "wire"
                              ? "Transaction Reference Number (TRN)"
                              : partialPaymentForm.method === "credit_card" || partialPaymentForm.method === "debit_card"
                              ? "Authorization Code"
                              : "Reference Number"}
                            {" "}(Optional)
                          </Label>
                          <Input
                            id="partialPaymentTRN"
                            placeholder={partialPaymentForm.method === "wire" ? "e.g., WIR-20260210-001" : "e.g., REF-12345"}
                            value={partialPaymentForm.transaction_reference || ""}
                            onChange={(e) =>
                              setPartialPaymentForm({
                                ...partialPaymentForm,
                                transaction_reference: e.target.value,
                              })
                            }
                            className="border-slate-300"
                          />
                        </div>
                      )
                    )}

                    {partialPaymentForm.method && (
                      ["wire", "ach", "direct_deposit"].includes(partialPaymentForm.method) && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="partialPaymentBankName">Bank Name (Optional)</Label>
                            <Input
                              id="partialPaymentBankName"
                              placeholder="e.g., Chase Bank"
                              value={partialPaymentForm.bank_name || ""}
                              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, bank_name: e.target.value })}
                              className="border-slate-300"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="partialPaymentRoutingNumber">Routing Number (Optional)</Label>
                            <Input
                              id="partialPaymentRoutingNumber"
                              placeholder="e.g., 123456789"
                              value={partialPaymentForm.routing_number || ""}
                              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, routing_number: e.target.value })}
                              className="border-slate-300"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="partialPaymentAccountNumber">Account Number (Optional)</Label>
                            <Input
                              id="partialPaymentAccountNumber"
                              placeholder="e.g., ****5678"
                              type="password"
                              value={partialPaymentForm.account_number || ""}
                              onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, account_number: e.target.value })}
                              className="border-slate-300"
                            />
                          </div>
                        </>
                      )
                    )}

                    {partialPaymentForm.method === "check" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="partialPaymentCheckNumber">Check Number (Optional)</Label>
                          <Input
                            id="partialPaymentCheckNumber"
                            placeholder="e.g., 1001"
                            value={partialPaymentForm.check_number || ""}
                            onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, check_number: e.target.value })}
                            className="border-slate-300"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="partialPaymentCheckAttachment">Check Image/Document (Optional)</Label>
                          <Input
                            id="partialPaymentCheckAttachment"
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, check_attachment: e.target.files?.[0]?.name || "" })}
                            className="border-slate-300"
                          />
                          {partialPaymentForm.check_attachment && (
                            <p className="text-xs text-green-600">✓ File uploaded</p>
                          )}
                        </div>
                      </>
                    )}

                    {partialPaymentForm.method && ["credit_card", "debit_card"].includes(partialPaymentForm.method) && (
                      <div className="space-y-2">
                        <Label htmlFor="partialPaymentCardLast4">
                          Last 4 Digits of {partialPaymentForm.method === "credit_card" ? "Credit Card" : "Debit Card"} (Optional)
                        </Label>
                        <Input
                          id="partialPaymentCardLast4"
                          placeholder="e.g., 4242"
                          maxLength={4}
                          value={partialPaymentForm.card_last4 || ""}
                          onChange={(e) => setPartialPaymentForm({ ...partialPaymentForm, card_last4: e.target.value })}
                          className="border-slate-300"
                        />
                      </div>
                    )}

                    <Button
                      onClick={handleAddPartialPayment}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Record Partial Payment
                    </Button>
                  </div>
                )}

                {/* Display existing partial payments */}
                {(() => {
                  let pps: PartialPayment[] = [];
                  if (editingPaymentId) {
                    const contract = contracts.find((c) => c.id === selectedContractId);
                    const currentPayment = contract?.payment_schedule?.find((p: any) => p.id === editingPaymentId);
                    pps = currentPayment ? getPaymentPartialPayments(currentPayment) : [];
                  } else {
                    pps = paymentForm.partial_payments || [];
                  }

                  if (pps.length === 0) {
                    return <p className="text-sm text-slate-500 italic">No partial payments recorded yet</p>;
                  }

                  return (
                    <div className="space-y-2">
                      {pps.map((pp: PartialPayment) => (
                        <div key={pp.id} className="bg-white p-3 rounded border border-slate-200">
                          <div className="flex justify-between items-start mb-2">
                            <div className="text-sm">
                              <p className="font-semibold text-slate-900">${pp.amount.toLocaleString()}</p>
                              <p className="text-xs text-slate-600">
                                {formatDateString(pp.date)} • {paymentMethodPlainLabel(pp.method)}
                              </p>
                              {pp.description && <p className="text-xs text-slate-600 mt-1">{pp.description}</p>}
                            </div>
                            <button
                              onClick={() => {
                                if (editingPaymentId) {
                                  handleDeletePartialPayment(editingPaymentId, pp.id);
                                } else {
                                  setPaymentForm((prev) => ({
                                    ...prev,
                                    partial_payments: (prev.partial_payments || []).filter((p) => p.id !== pp.id),
                                  }));
                                }
                              }}
                              className="text-red-600 hover:text-red-800 p-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-2">
                            {(pp.method === "wire" || pp.method === "ach" || pp.method === "direct_deposit") && (
                              <>
                                {pp.bank_name && <p>Bank: {pp.bank_name}</p>}
                                {pp.routing_number && <p>Routing: {pp.routing_number}</p>}
                                {pp.account_number && <p>Account: {pp.account_number}</p>}
                                {pp.transaction_reference && <p>Reference: {pp.transaction_reference}</p>}
                              </>
                            )}
                            {pp.method === "check" && (
                              <>
                                {pp.check_number && <p>Check #: {pp.check_number}</p>}
                                {pp.check_attachment && <p className="text-green-600">✓ Check image attached</p>}
                              </>
                            )}
                            {(pp.method === "credit_card" || pp.method === "debit_card") && (
                              <>
                                {pp.card_last4 && <p>Card Last 4: {pp.card_last4}</p>}
                                {pp.transaction_reference && <p>Auth/Ref: {pp.transaction_reference}</p>}
                              </>
                            )}
                            {pp.method === "zelle" && (
                              <>
                                {pp.transaction_reference && <p>Reference: {pp.transaction_reference}</p>}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setPaymentForm({
                    id: "",
                    description: "",
                    amount: 0,
                    due_date: "",
                    status: "pending",
                    paid_date: "",
                    payment_method: "cash",
                    bank_name: "",
                    routing_number: "",
                    account_number: "",
                    account_type: "checking",
                    check_number: "",
                    check_attachment: "",
                    card_last4: "",
                    transaction_reference: "",
                    receipt_attachment: "",
                    partial_payments: [],
                  });
                  setEditingPaymentId(null);
                  setShowPartialPaymentForm(false);
                }}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSavePayment}
                className="bg-green-600 hover:bg-green-700"
              >
                {editingPaymentId ? "Update Payment" : "Add Payment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Thank You Letter Modal */}
      {isThankYouLetterModalOpen && thankYouLetterContractId && (
        <Dialog
          open={isThankYouLetterModalOpen}
          onOpenChange={(open) => !open && setIsThankYouLetterModalOpen(false)}
        >
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogTitle>Thank You Letter - {thankYouLetterContractId}</DialogTitle>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Edit your thank you letter:</label>
                <textarea
                  value={thankYouLetterContent}
                  onChange={(e) => setThankYouLetterContent(e.target.value)}
                  className="w-full h-96 p-3 border border-slate-300 rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Thank you letter content..."
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setIsThankYouLetterModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    const contract = contracts.find((c) => c.id === thankYouLetterContractId);
                    if (contract) {
                      generateThankYouLetterPDF(contract, thankYouLetterContent);
                      setIsThankYouLetterModalOpen(false);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download Letter
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {budgetSummaryContractId && (
        <Dialog open={!!budgetSummaryContractId} onOpenChange={(open) => !open && setBudgetSummaryContractId(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">Budget Summary</DialogTitle>
            {(() => {
              const contract = contracts.find((c) => c.id === budgetSummaryContractId);
              if (!contract) return null;

              const materialCost = (contract.cost_tracking?.materials || []).reduce((sum: number, m: any) => sum + m.quantity * (m.unit_price || 0), 0);
              const laborCost = contract.cost_tracking?.labor_cost?.amount || 0;
              const miscellaneousCost = (contract.cost_tracking?.miscellaneous || []).reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
              const totalCosts = materialCost + laborCost + miscellaneousCost;
              const projectedProfit = (contract.total_value || 0) - totalCosts;
              const profitMargin = (contract.total_value || 0) > 0 ? (projectedProfit / contract.total_value) * 100 : 0;

              const handlePrintBudgetSummary = () => {
                const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                const margin = 12;
                const contentWidth = pageWidth - 2 * margin;
                let yPosition = 12;

                const generatedLabel = `${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`;
                const contractTotal = contract.total_value || 0;

                // Build line items table
                const items: Array<{ category: string; item: string; qty: string; unit: string; cost: number }> = [];

                // Labor
                items.push({
                  category: "Labor",
                  item: contract.cost_tracking?.labor_cost?.description || "Labor",
                  qty:
                    contract.cost_tracking?.labor_cost?.calculation_method === "daily" && contract.cost_tracking?.labor_cost?.days
                      ? String(contract.cost_tracking.labor_cost.days)
                      : contract.cost_tracking?.labor_cost?.calculation_method === "monthly" && contract.cost_tracking?.labor_cost?.months
                        ? String(contract.cost_tracking.labor_cost.months)
                        : "-",
                  unit:
                    contract.cost_tracking?.labor_cost?.calculation_method === "daily"
                      ? "days"
                      : contract.cost_tracking?.labor_cost?.calculation_method === "monthly"
                        ? "months"
                        : "-",
                  cost: laborCost,
                });

                // Materials
                const materialsWithQty = (contract.cost_tracking?.materials || []).filter((m: any) => m.quantity > 0);
                materialsWithQty.forEach((material: any) => {
                  const cost = material.quantity * (material.unit_price || 0);
                  items.push({
                    category: "Materials",
                    item: material.name || "Material",
                    qty: String(material.quantity || 0),
                    unit: material.unit || "-",
                    cost,
                  });
                });

                // Misc
                (contract.cost_tracking?.miscellaneous || []).forEach((m: any) => {
                  items.push({
                    category: "Misc",
                    item: m.description || "Misc",
                    qty: "-",
                    unit: "-",
                    cost: m.amount || 0,
                  });
                });

                // Company Header Background
                pdf.setFillColor(31, 41, 55);
                pdf.rect(0, 0, pageWidth, 22, "F");
                pdf.setTextColor(255, 255, 255);
                pdf.setFontSize(20);
                pdf.setFont(undefined, "bold");
                pdf.text("SOUTH PARK CABINETS", margin, 10);

                pdf.setFontSize(11);
                pdf.setFont(undefined, "normal");
                pdf.text("Budget Summary", margin, 18);
                pdf.setTextColor(150, 150, 150);
                pdf.setFontSize(9);
                pdf.text(`Contract: ${contract.id}`, pageWidth - margin - 80, 14);
                pdf.text(`Generated: ${generatedLabel}`, pageWidth - margin - 80, 18);
                pdf.setTextColor(0, 0, 0);

                yPosition = 28;

                // Summary Statistics Boxes
                const boxWidth = (contentWidth - 9) / 4;
                const summaryData = [
                  { label: "Contract Total", value: `$${contractTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: [59, 130, 246] as const },
                  { label: "Total Costs", value: `$${totalCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: [168, 85, 247] as const },
                  { label: "Projected Profit", value: `$${projectedProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: [34, 197, 94] as const },
                  { label: "Profit Margin", value: `${profitMargin.toFixed(1)}%`, color: [249, 115, 22] as const },
                ];

                summaryData.forEach((item, idx) => {
                  const xPos = margin + idx * (boxWidth + 3);
                  const [r, g, b] = item.color;
                  pdf.setFillColor(r, g, b);
                  pdf.rect(xPos, yPosition, boxWidth, 12, "F");

                  pdf.setTextColor(255, 255, 255);
                  pdf.setFontSize(8);
                  pdf.setFont(undefined, "normal");
                  pdf.text(item.label, xPos + 2, yPosition + 4);

                  pdf.setFontSize(10);
                  pdf.setFont(undefined, "bold");
                  pdf.text(String(item.value), xPos + 2, yPosition + 10);
                });
                pdf.setTextColor(0, 0, 0);

                yPosition += 18;

                // Contract meta lines
                pdf.setFont(undefined, "bold");
                pdf.setFontSize(10);
                pdf.text(`Project: ${contract.project_name || "-"}`, margin, yPosition);
                yPosition += 6;
                pdf.setFont(undefined, "normal");
                pdf.text(`Client: ${contract.client_name || "-"}`, margin, yPosition);
                yPosition += 10;

                // Table headers
                const colWidths = [22, 135, 22, 22, 34];
                const headers = ["CATEGORY", "ITEM", "QTY", "UNIT", "COST"];
                pdf.setFillColor(59, 70, 87);
                pdf.rect(margin, yPosition - 5, contentWidth, 8, "F");
                pdf.setTextColor(255, 255, 255);
                pdf.setFont(undefined, "bold");
                pdf.setFontSize(11);
                let xPosition = margin + 2;
                headers.forEach((h, idx) => {
                  if (idx === headers.length - 1) {
                    pdf.text(h, xPosition + colWidths[idx] - 3, yPosition, { align: "right" });
                  } else {
                    pdf.text(h, xPosition, yPosition);
                  }
                  xPosition += colWidths[idx];
                });
                pdf.setTextColor(0, 0, 0);
                yPosition += 12;

                let lineIndex = 0;
                items.forEach((row) => {
                  const categoryLines = pdf.splitTextToSize(row.category || "-", colWidths[0] - 4);
                  const itemLines = pdf.splitTextToSize(row.item || "-", colWidths[1] - 4);
                  const qtyLines = pdf.splitTextToSize(row.qty || "-", colWidths[2] - 4);
                  const unitLines = pdf.splitTextToSize(row.unit || "-", colWidths[3] - 4);
                  const costLines = pdf.splitTextToSize(
                    `$${(row.cost || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                    colWidths[4] - 4,
                  );
                  const rowLines = Math.max(1, categoryLines.length, itemLines.length, qtyLines.length, unitLines.length, costLines.length);
                  const rowHeight = Math.max(10, 6 + rowLines * 4);

                  if (yPosition + rowHeight > pageHeight - 15) {
                    pdf.setFontSize(9);
                    pdf.setTextColor(150, 150, 150);
                    pdf.text(`Page ${pdf.internal.pages.length}`, pageWidth - margin - 10, pageHeight - 5);
                    pdf.setTextColor(0, 0, 0);

                    pdf.addPage();
                    yPosition = 15;

                    pdf.setFillColor(59, 70, 87);
                    pdf.rect(margin, yPosition - 5, contentWidth, 8, "F");
                    pdf.setTextColor(255, 255, 255);
                    pdf.setFont(undefined, "bold");
                    pdf.setFontSize(11);
                    xPosition = margin + 2;
                    headers.forEach((h, idx) => {
                      if (idx === headers.length - 1) {
                        pdf.text(h, xPosition + colWidths[idx] - 3, yPosition, { align: "right" });
                      } else {
                        pdf.text(h, xPosition, yPosition);
                      }
                      xPosition += colWidths[idx];
                    });
                    pdf.setTextColor(0, 0, 0);
                    yPosition += 12;
                    lineIndex = 0;
                  }

                  if (lineIndex % 2 === 0) {
                    pdf.setFillColor(240, 245, 250);
                  } else {
                    pdf.setFillColor(255, 255, 255);
                  }
                  pdf.rect(margin, yPosition - 6, contentWidth, rowHeight, "F");
                  pdf.setDrawColor(200, 200, 200);
                  pdf.setLineWidth(0.2);
                  pdf.line(margin, yPosition - 6 + rowHeight, margin + contentWidth, yPosition - 6 + rowHeight);

                  xPosition = margin + 2;
                  const baseY = yPosition;

                  pdf.setFont(undefined, "normal");
                  pdf.setFontSize(10);
                  pdf.text(categoryLines, xPosition, baseY);
                  xPosition += colWidths[0];

                  pdf.setFont(undefined, "normal");
                  pdf.setFontSize(9);
                  pdf.text(itemLines, xPosition, baseY);
                  xPosition += colWidths[1];

                  pdf.setFontSize(10);
                  pdf.text(qtyLines, xPosition, baseY);
                  xPosition += colWidths[2];

                  pdf.text(unitLines, xPosition, baseY);
                  xPosition += colWidths[3];

                  pdf.setFont(undefined, "bold");
                  pdf.text(costLines, xPosition + colWidths[4] - 3, baseY, { align: "right" });

                  yPosition += rowHeight;
                  lineIndex += 1;
                });

                // Footer
                const footerY = pageHeight - 10;
                pdf.setDrawColor(200, 200, 200);
                pdf.line(margin, footerY, pageWidth - margin, footerY);
                pdf.setFont(undefined, "bold");
                pdf.setFontSize(9);
                pdf.setTextColor(0, 0, 0);
                pdf.text(
                  `Total Costs: $${totalCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })} | Projected Profit: $${projectedProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
                  margin,
                  footerY + 5,
                );
                pdf.setFontSize(8);
                pdf.setTextColor(150, 150, 150);
                pdf.text(`Page ${pdf.internal.pages.length}`, pageWidth - margin - 10, footerY + 5);

                pdf.save(`${contract.id}-Budget-Summary-${new Date().toISOString().split("T")[0]}.pdf`);
              };

              return (
                <>
                  <DialogHeader className="flex flex-row items-center justify-between">
                    <div>
                      <DialogTitle>Budget Summary - {contract.id}</DialogTitle>
                      <DialogDescription>
                        {contract.project_name} | {contract.client_name}
                      </DialogDescription>
                    </div>
                    <Button
                      onClick={handlePrintBudgetSummary}
                      className="gap-2 bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
                      size="sm"
                    >
                      <Printer className="w-4 h-4" />
                      Print
                    </Button>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    <Card className="border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg">📊 Budget Summary</CardTitle>
                        <CardDescription>Labor and materials breakdown for this project</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div className="font-semibold text-slate-900">💼 Labor Costs</div>
                          <div className="bg-slate-50 p-3 rounded border border-slate-200">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-700">{contract.cost_tracking?.labor_cost?.description}</span>
                              <span className="font-semibold text-slate-900">${laborCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                            {contract.cost_tracking?.labor_cost?.calculation_method === "daily" && contract.cost_tracking?.labor_cost?.daily_rate && contract.cost_tracking?.labor_cost?.days && (
                              <p className="text-xs text-slate-600 mt-1">
                                ${contract.cost_tracking.labor_cost.daily_rate} × {contract.cost_tracking.labor_cost.days} days
                              </p>
                            )}
                            {contract.cost_tracking?.labor_cost?.calculation_method === "monthly" && contract.cost_tracking?.labor_cost?.monthly_rate && contract.cost_tracking?.labor_cost?.months && (
                              <p className="text-xs text-slate-600 mt-1">
                                ${contract.cost_tracking.labor_cost.monthly_rate} × {contract.cost_tracking.labor_cost.months} months
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="border-t pt-4 space-y-3">
                          <div className="font-semibold text-slate-900">🛠️ Material Costs</div>
                          <div className="space-y-2">
                            {(contract.cost_tracking?.materials || []).filter((m: any) => m.quantity > 0).length > 0 ? (
                              <div className="space-y-2">
                                {(contract.cost_tracking?.materials || [])
                                  .filter((m: any) => m.quantity > 0)
                                  .map((material: any) => {
                                    const predefinedMaterial = availableMaterials.find(m => m.id === material.id);
                                    const supplier = material.supplier || predefinedMaterial?.supplier;
                                    return (
                                    <div key={material.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                                      <div>
                                        <span className="text-slate-700">
                                          {material.name} ({material.quantity} {material.unit})
                                        </span>
                                        {supplier && (
                                          <div className="text-xs text-slate-500 italic">from {supplier}</div>
                                        )}
                                      </div>
                                      <span className="font-semibold text-slate-900">
                                        ${(material.quantity * (material.unit_price || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                      </span>
                                    </div>
                                    );
                                  })}
                                <div className="flex justify-between items-center p-3 bg-blue-50 rounded border border-blue-200 font-semibold mt-2">
                                  <span className="text-blue-900">Total Material Cost</span>
                                  <span className="text-blue-600">${materialCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 italic">No materials added</p>
                            )}
                          </div>
                        </div>

                        {(contract.cost_tracking?.miscellaneous || []).length > 0 && (
                          <div className="border-t pt-4 space-y-3">
                            <div className="font-semibold text-slate-900">📋 Miscellaneous Costs</div>
                            <div className="space-y-2">
                              {(contract.cost_tracking?.miscellaneous || []).map((item: any) => (
                                <div key={item.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                                  <span className="text-slate-700">{item.description}</span>
                                  <span className="font-semibold text-slate-900">
                                    ${(item.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                  </span>
                                </div>
                              ))}
                              <div className="flex justify-between items-center p-3 bg-orange-50 rounded border border-orange-200 font-semibold mt-2">
                                <span className="text-orange-900">Total Miscellaneous Cost</span>
                                <span className="text-orange-600">${miscellaneousCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg">💰 Expense Summary</CardTitle>
                        <CardDescription>Track all materials and purchases for this project. Total expenses are calculated separately from client payments.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <p className="text-sm text-slate-600 font-medium">Contract Total</p>
                              <p className="text-2xl font-bold text-slate-900 mt-1">
                                ${(contract.total_value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                              <p className="text-sm text-slate-600 font-medium">Total Material Cost</p>
                              <p className="text-2xl font-bold text-blue-600 mt-1">
                                ${materialCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className={`p-4 rounded-lg border ${projectedProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                              <p className={`text-sm font-medium ${projectedProfit >= 0 ? "text-green-600" : "text-red-600"}`}>Projected Profit</p>
                              <p className={`text-2xl font-bold mt-1 ${projectedProfit >= 0 ? "text-green-700" : "text-red-700"}`}>
                                ${projectedProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className={`p-4 rounded-lg border ${profitMargin >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                              <p className={`text-sm font-medium ${profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}>Profit Margin</p>
                              <p className={`text-2xl font-bold mt-1 ${profitMargin >= 0 ? "text-green-700" : "text-red-700"}`}>
                                {profitMargin.toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          <div className="border-t pt-4 space-y-2 text-sm">
                            <div className="flex justify-between text-slate-600">
                              <span>Material Costs:</span>
                              <span>${materialCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Labor Costs:</span>
                              <span>${laborCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Miscellaneous Costs:</span>
                              <span>${miscellaneousCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between font-bold text-slate-900 border-t pt-2">
                              <span>Total Expenses:</span>
                              <span>${totalCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-lg">📋 Expense Invoices</CardTitle>
                        <CardDescription>Track all materials and purchases for this project</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="invoice_number">Invoice Number *</Label>
                              <Input
                                id="invoice_number"
                                placeholder="INV-001"
                                value={expenseForm.invoice_number ?? ""}
                                onChange={(e) => setExpenseForm({ ...expenseForm, invoice_number: e.target.value })}
                                className="border-slate-300"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="vendor">Vendor/Company *</Label>
                              <Input
                                id="vendor"
                                placeholder="Home Depot"
                                value={expenseForm.vendor ?? ""}
                                onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                                className="border-slate-300"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="amount">Amount *</Label>
                              <div className="flex items-center">
                                <span className="text-slate-600 mr-2">$</span>
                                <Input
                                  id="amount"
                                  type="number"
                                  placeholder="0.00"
                                  value={String(expenseForm.amount ?? 0)}
                                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                                  className="border-slate-300"
                                  step="0.01"
                                  min="0"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="purchase_date">Purchase Date *</Label>
                              <Input
                                id="purchase_date"
                                type="date"
                                value={expenseForm.purchase_date ?? ""}
                                onChange={(e) => setExpenseForm({ ...expenseForm, purchase_date: e.target.value })}
                                className="border-slate-300"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Select
                              value={expenseForm.category ?? "Materials"}
                              onValueChange={(value) => setExpenseForm({ ...expenseForm, category: value as any })}
                            >
                              <SelectTrigger id="category" className="border-slate-300">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Materials">Materials</SelectItem>
                                <SelectItem value="Labor">Labor</SelectItem>
                                <SelectItem value="Permits">Permits</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Input
                              id="description"
                              placeholder="Plywood sheets for cabinet doors"
                              value={expenseForm.description ?? ""}
                              onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                              className="border-slate-300"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Input
                              id="notes"
                              placeholder="Additional notes..."
                              value={expenseForm.notes ?? ""}
                              onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                              className="border-slate-300"
                            />
                          </div>

                          <Button
                            onClick={() => handleSaveExpense(contract.id)}
                            className="w-full bg-blue-600 hover:bg-blue-700"
                          >
                            {editingExpenseId ? "Update Expense" : "Add Expense"}
                          </Button>
                        </div>

                        {(contract.expenses || []).length > 0 ? (
                          <div className="space-y-2">
                            {(contract.expenses || []).map((expense: any) => (
                              <div key={expense.id} className="flex justify-between items-start p-3 bg-white rounded border border-slate-200 text-sm">
                                <div className="flex-1">
                                  <p className="font-semibold text-slate-900">{expense.invoice_number} - {expense.vendor}</p>
                                  <p className="text-xs text-slate-600 mt-1">
                                    {expense.description}
                                  </p>
                                  <div className="flex gap-2 mt-1 text-xs">
                                    <span className="bg-slate-100 px-2 py-1 rounded">{expense.category}</span>
                                    <span className="text-slate-600">{formatDateString(expense.purchase_date)}</span>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                  <div>
                                    <p className="font-bold text-slate-900">${(expense.amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      onClick={() => handleAddExpenseToBills(contract.id, expense)}
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-xs"
                                      title="Add to Bills"
                                    >
                                      Add to Bills
                                    </Button>
                                    <button
                                      onClick={() => {
                                        setExpenseForm(expense);
                                        setEditingExpenseId(expense.id);
                                      }}
                                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded transition-colors"
                                      title="Edit expense"
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteExpense(contract.id, expense.id)}
                                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1.5 rounded transition-colors"
                                      title="Delete expense"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 italic text-center py-4">No expenses recorded yet</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button
                      onClick={() => setBudgetSummaryContractId(null)}
                      className="bg-slate-600 hover:bg-slate-700"
                    >
                      Close
                    </Button>
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}



      {pdfSelectContractId && (
        <Dialog 
          open={!!pdfSelectContractId} 
          onOpenChange={(open) => {
            if (!open) {
              setPdfSelectContractId(null);
              setPdfGenerationStep("type-selection");
              setTempPdfAttachments([]);
            }
          }}
        >
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {pdfGenerationStep === "type-selection" ? "Select PDF Document" : "Design & Contract Attachments"}
              </DialogTitle>
              <DialogDescription>
                {pdfGenerationStep === "type-selection" 
                  ? "Choose which document you want to download" 
                  : "Add images or documents to be included in the PDF (2 per page)"}
              </DialogDescription>
            </DialogHeader>

            {pdfGenerationStep === "type-selection" ? (
              <div className="space-y-3 py-2">
                <Button
                  onClick={() => {
                    const contract = contracts.find((c) => c.id === pdfSelectContractId);
                    if (contract) {
                      setTempPdfAttachments(normalizeAttachments(contract.attachments));
                      setPdfAttachmentType("cabinet");
                      setPdfGenerationStep("attachments");
                    }
                  }}
                  variant="outline"
                  className="w-full justify-start border-slate-300 h-16 text-lg px-6 hover:bg-slate-50 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-100 p-2 rounded text-blue-600">
                      <Download className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900">Cabinet Installation</div>
                      <div className="text-sm text-slate-500 font-normal">Technical specs, material list & shop drawings</div>
                    </div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => {
                    const contract = contracts.find((c) => c.id === pdfSelectContractId);
                    if (contract) {
                      setTempPdfAttachments(normalizeAttachments(contract.attachments));
                      setPdfAttachmentType("client");
                      setPdfGenerationStep("attachments");
                    }
                  }}
                  variant="outline"
                  className="w-full justify-start border-slate-300 h-16 text-lg px-6 hover:bg-slate-50 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-green-100 p-2 rounded text-green-600">
                      <Download className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900">Client Agreement</div>
                      <div className="text-sm text-slate-500 font-normal">Formal contract with terms & conditions</div>
                    </div>
                  </div>
                </Button>

                <Button
                  onClick={async () => {
                    const contract = contracts.find((c) => c.id === pdfSelectContractId);
                    if (contract) {
                      await generateInvoicePDF(contract.id);
                    }
                    setPdfSelectContractId(null);
                    setPdfGenerationStep("type-selection");
                    setTempPdfAttachments([]);
                  }}
                  variant="outline"
                  className="w-full justify-start border-slate-300 h-16 text-lg px-6 hover:bg-slate-50 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-100 p-2 rounded text-purple-700">
                      <Download className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-slate-900">Invoice</div>
                      <div className="text-sm text-slate-500 font-normal">Payment summary & balance due</div>
                    </div>
                  </div>
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-100 transition-colors">
                    <Input
                      type="file"
                      id="pdf-attachment-upload"
                      multiple
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handlePdfAttachmentUpload}
                    />
                    <label htmlFor="pdf-attachment-upload" className="cursor-pointer block">
                      <div className="mx-auto bg-white p-3 rounded-full shadow-sm w-12 h-12 flex items-center justify-center mb-3">
                        <Plus className="w-6 h-6 text-blue-600" />
                      </div>
                      <p className="font-medium text-slate-900">Click to upload images</p>
                      <p className="text-sm text-slate-500 mt-1">Supports JPG, PNG (2 images per page grid)</p>
                    </label>
                  </div>

                  {tempPdfAttachments.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-sm text-slate-700">Selected Attachments ({tempPdfAttachments.length})</h4>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-600 h-8 text-xs"
                          onClick={() => setTempPdfAttachments([])}
                        >
                          Clear All
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {tempPdfAttachments.map((att, idx) => (
                          <div key={att.id || idx} className="flex items-center gap-3 p-2 bg-white rounded border border-slate-200 group">
                            <div className="w-10 h-10 bg-slate-100 rounded flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {att.fileData?.startsWith('data:image') ? (
                                <img src={att.fileData} alt="thumb" className="w-full h-full object-cover" />
                              ) : (
                                <Paperclip className="w-5 h-5 text-slate-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{att.fileName}</p>
                              <p className="text-xs text-slate-500">{(att.fileSize / 1024).toFixed(0)} KB</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                setTempPdfAttachments(prev => prev.filter(p => p.id !== att.id));
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setPdfGenerationStep("type-selection")}
                    className="border-slate-300"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      const contract = contracts.find((c) => c.id === pdfSelectContractId);
                      if (contract) {
                        generatePDF(contract, pdfAttachmentType, tempPdfAttachments);
                      }
                      setPdfSelectContractId(null);
                      setPdfGenerationStep("type-selection");
                    }}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Generate PDF
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {detailsContractId && (() => {
        const contract = contracts.find((c) => c.id === detailsContractId);
        if (!contract) return null;

        const paidPayments = (contract.payment_schedule || []).filter((p: any) => p.status === "paid");
        const pendingPaymentCount = (contract.payment_schedule || []).filter((p: any) => p.status === "pending").length;
        const totalPaid = paidPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
        const totalRemaining = (contract.payment_schedule || []).reduce((sum: number, p: any) => sum + (p.status === "pending" ? p.amount : 0), 0);

        return (
          <Sheet open={!!detailsContractId} onOpenChange={(open) => !open && setDetailsContractId(null)}>
            <SheetContent className="w-full sm:w-[600px] max-h-[90vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-2xl">{contract.id}</SheetTitle>
                <SheetDescription>{contract.project_name}</SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Client Information */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Client Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-slate-600">Name:</span> <span className="font-medium">{contract.client_name}</span></div>
                    <div><span className="text-slate-600">Email:</span> <span className="font-medium">{contract.client_email}</span></div>
                    <div><span className="text-slate-600">Phone:</span> <span className="font-medium">{contract.client_phone}</span></div>
                    <div><span className="text-slate-600">Address:</span> <span className="font-medium">{contract.client_address}, {contract.client_city}, {contract.client_state} {contract.client_zip}</span></div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Project Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-slate-600">Location:</span> <span className="font-medium">{contract.project_location}</span></div>
                    <div><span className="text-slate-600">Cabinet Type:</span> <span className="font-medium">{contract.cabinet_type}</span></div>
                    <div><span className="text-slate-600">Finish Type:</span> <span className="font-medium">{contract.material}</span></div>
                    {contract.custom_finish && (
                      <div><span className="text-slate-600">Finish Customization:</span> <span className="font-medium text-blue-700">{contract.custom_finish}</span></div>
                    )}
                    <div><span className="text-slate-600">Installation:</span> <span className="font-medium">{contract.installation_included ? "Included" : "Not Included"}</span></div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Financial Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-600">Total Value:</span> <span className="font-bold text-slate-900">${(contract.total_value ?? 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Deposit:</span> <span className="font-medium">${(contract.deposit_amount ?? 0).toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Amount Paid:</span> <span className="font-medium text-green-600">${totalPaid.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Amount Remaining:</span> <span className="font-medium text-orange-600">${totalRemaining.toLocaleString()}</span></div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Timeline</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-slate-600">Start Date:</span> <span className="font-medium">{formatDateString(contract.start_date)}</span></div>
                    <div><span className="text-slate-600">Due Date:</span> <span className="font-medium">{formatDateString(contract.due_date)}</span></div>
                    <div><span className="text-slate-600">Status:</span> <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusBadge(contract.status)}`}>{contract.status.replace("-", " ")}</span></div>
                  </div>
                </div>

                {/* Payment Schedule Overview */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Payment Schedule</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Payments:</span>
                      <span className="font-medium">{(contract.payment_schedule || []).length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Paid:</span>
                      <span className="font-medium text-green-600">{paidPayments.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Pending:</span>
                      <span className="font-medium text-orange-600">{pendingPaymentCount}</span>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                {(contract.cost_tracking?.materials || []).length > 0 && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Materials</h3>
                    <div className="text-sm text-slate-600">
                      <span>{(contract.cost_tracking?.materials || []).length} material items added</span>
                    </div>
                  </div>
                )}

                {contract.attachments && contract.attachments.length > 0 && (
                  <div className="pb-4">
                    <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <span>📎 Design Files & Attachments</span>
                      <span className="text-sm font-normal text-slate-600">({contract.attachments.length})</span>
                    </h3>

                    {/* Separate images and other files */}
                    {(() => {
                      const images = (contract.attachments || []).filter((att: any) => isImageFile(att.file_name));
                      const others = (contract.attachments || []).filter((att: any) => !isImageFile(att.file_name));

                      return (
                        <div className="space-y-4">
                          {/* Image Gallery */}
                          {images.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-600 font-medium mb-2">Design Images ({images.length})</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {images.map((att: any) => (
                                  <button
                                    key={att.id}
                                    onClick={() => setLightboxImage(att)}
                                    className="group relative aspect-square rounded border border-slate-300 overflow-hidden hover:border-blue-500 transition-colors cursor-pointer bg-slate-100"
                                    title={att.file_name}
                                  >
                                    <img
                                      src={att.file_data}
                                      alt={att.file_name}
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                      <span className="text-white opacity-0 group-hover:opacity-100 text-2xl transition-opacity">🔍</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Other Files */}
                          {others.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-600 font-medium mb-2">Documents ({others.length})</p>
                              <div className="space-y-2">
                                {others.map((att: any) => (
                                  <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 transition-colors">
                                    <span className="text-xl flex-shrink-0">{getFileIcon(att.file_name)}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-900 truncate">{att.file_name}</p>
                                      <p className="text-xs text-slate-500">{new Date(att.upload_date).toLocaleDateString()}</p>
                                    </div>
                                    <a
                                      href={att.file_data}
                                      download={att.file_name}
                                      className="flex-shrink-0 text-blue-600 hover:text-blue-800 p-1"
                                      title="Download file"
                                    >
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-8 pt-6 border-t">
                <Button
                  onClick={() => {
                    handleEditContract(contract);
                    setDetailsContractId(null);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  onClick={() => setDetailsContractId(null)}
                  variant="outline"
                  className="border-slate-300"
                >
                  Close
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        );
      })()}



      {/* Material Calculator Modal */}
      <Dialog open={isCalculatorOpen} onOpenChange={setIsCalculatorOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Material Calculator</DialogTitle>
            <DialogDescription>Calculate material costs and quantities</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Materials List */}
            <div>
              <h3 className="font-semibold mb-4">Available Materials</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left p-3 font-medium">Material Name</th>
                      <th className="text-center p-3 font-medium">Unit Price</th>
                      <th className="text-center p-3 font-medium">Quantity</th>
                      <th className="text-center p-3 font-medium">Unit</th>
                      <th className="text-center p-3 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableMaterials.map((material) => {
                      const quantity = costTracking.materials.find(m => m.id === material.id)?.quantity || 0;
                      const subtotal = material.unit_price * quantity;
                      return (
                        <tr key={material.id} className="border-b hover:bg-slate-50">
                          <td className="p-3">{material.name}</td>
                          <td className="text-center p-3">${material.unit_price.toFixed(2)}</td>
                          <td className="text-center p-3">
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={quantity}
                              onChange={(e) => {
                                const newQuantity = parseFloat(e.target.value) || 0;
                                setCostTracking(prev => ({
                                  ...prev,
                                  materials: prev.materials.map(m =>
                                    m.id === material.id ? { ...m, quantity: newQuantity } : m
                                  ).length > 0
                                    ? prev.materials.map(m =>
                                        m.id === material.id ? { ...m, quantity: newQuantity } : m
                                      )
                                    : [...prev.materials, { ...material, quantity: newQuantity }]
                                }));
                              }}
                              className="w-16 text-center"
                            />
                          </td>
                          <td className="text-center p-3">{material.unit}</td>
                          <td className="text-center p-3 font-medium">${subtotal.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-100 p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="font-medium">Materials Total:</span>
                <span className="font-semibold">
                  ${costTracking.materials.reduce((sum, m) => {
                    const material = availableMaterials.find(am => am.id === m.id);
                    return sum + (material ? material.unit_price * m.quantity : 0);
                  }, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Labor Cost:</span>
                <span className="font-semibold">${costTracking.labor_cost.amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Miscellaneous:</span>
                <span className="font-semibold">
                  ${costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0).toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between">
                <span className="font-bold">Subtotal:</span>
                <span className="font-bold text-lg">
                  ${(
                    costTracking.materials.reduce((sum, m) => {
                      const material = availableMaterials.find(am => am.id === m.id);
                      return sum + (material ? material.unit_price * m.quantity : 0);
                    }, 0) +
                    costTracking.labor_cost.amount +
                    costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0)
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Profit Margin ({costTracking.profit_margin_percent}%):</span>
                <span className="font-semibold">
                  ${(
                    (costTracking.materials.reduce((sum, m) => {
                      const material = availableMaterials.find(am => am.id === m.id);
                      return sum + (material ? material.unit_price * m.quantity : 0);
                    }, 0) +
                    costTracking.labor_cost.amount +
                    costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0)) *
                    (costTracking.profit_margin_percent / 100)
                  ).toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between bg-blue-50 p-2 rounded">
                <span className="font-bold">Total Project Cost:</span>
                <span className="font-bold text-lg text-blue-600">
                  ${(
                    (costTracking.materials.reduce((sum, m) => {
                      const material = availableMaterials.find(am => am.id === m.id);
                      return sum + (material ? material.unit_price * m.quantity : 0);
                    }, 0) +
                    costTracking.labor_cost.amount +
                    costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0)) *
                    (1 + costTracking.profit_margin_percent / 100)
                  ).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setIsCalculatorOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                // Update the total value in the form based on calculator results
                const materialTotal = costTracking.materials.reduce((sum, m) => {
                  const material = availableMaterials.find(am => am.id === m.id);
                  return sum + (material ? material.unit_price * m.quantity : 0);
                }, 0);
                const subtotal = materialTotal + costTracking.labor_cost.amount + costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0);
                const total = subtotal * (1 + costTracking.profit_margin_percent / 100);

                setFormData(prev => ({
                  ...prev,
                  total_value: total.toFixed(2),
                  deposit_amount: (total * 0.5).toFixed(2)
                }));

                setIsCalculatorOpen(false);
              }}
            >
              Apply to Contract
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox Modal for Image Preview */}
      {lightboxImage && (
        <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
          <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col bg-black border-0">
            <DialogHeader className="sr-only">
              <DialogTitle>Image Preview</DialogTitle>
            </DialogHeader>

            <div className="flex-1 flex items-center justify-center relative overflow-auto">
              <button
                onClick={() => setLightboxImage(null)}
                className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 z-10 transition-colors"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>

              <img
                src={lightboxImage.file_data}
                alt={lightboxImage.file_name}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{lightboxImage.file_name}</p>
                <p className="text-sm text-slate-400">{new Date(lightboxImage.upload_date).toLocaleDateString()}</p>
              </div>
              <a
                href={lightboxImage.file_data}
                download={lightboxImage.file_name}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition-colors"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Toaster />
    </div>
  );
}
