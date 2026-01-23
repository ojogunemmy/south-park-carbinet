import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, ChevronLeft, Edit2, Trash2, Eye, ChevronDown, Download, Printer, FileText, Settings, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import {
  employeesService,
  paymentsService,
  absencesService,
  salaryHistoryService,
  type Employee as SupabaseEmployee,
  type Payment as SupabasePayment,
  type EmployeeAbsence as SupabaseAbsence,
  type SalaryHistory as SupabaseSalaryHistory
} from "@/lib/supabase-service";
import { formatDateString, getTodayDate, getWeekStartDate, formatDateToString, generateWednesdayPayments, generateAllPaymentsForYear } from "@/utils/yearStorage";
import { generateEmployeeTemplate } from "@/utils/employeeTemplate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface EmployeeAbsence {
  id: string;
  employeeId: string;
  fromDate: string;
  toDate: string;
  daysWorkedPerWeek: number;
  reason?: string;
}

interface WeeklyPayment {
  id: string;
  employeeId: string;
  weekStartDate: string;
  daysWorked: number;
  weeklyRate: number;
  calculatedAmount: number;
  overrideAmount?: number;
  finalAmount: number;
  status: "pending" | "paid" | "cancelled";
  paidDate?: string;
  paymentMethod?: "check" | "direct_deposit" | "bank_transfer" | "wire_transfer" | "credit_card" | "cash";
  checkNumber?: string;
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  accountType?: string;
  creditCardLast4?: string;
  transactionReference?: string;
  receiptAttachment?: string;
  notes?: string;
}

interface Employee {
  id: string;
  name: string;
  position: string;
  weeklyRate: number;
  startDate: string;
  paymentStartDate?: string;
  ssn?: string;
  address?: string;
  telephone?: string;
  email?: string;
  paymentMethod?: string;
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  accountType?: string;
  checkAttachment?: string;
  checkNumber?: string;
  directDeposit?: boolean;
  paymentDay?: string;
  paymentStatus?: "active" | "paused" | "leaving" | "laid_off";
  defaultDaysWorkedPerWeek?: number;
}



interface EmployeeFormData {
  name: string;
  position: string;
  telephone: string;
  email: string;
  startDate: string;
  paymentStartDate: string;
  address: string;
  ssn: string;
  itin: string;
  weeklyRate: string;
  paymentMethod: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: string;
  checkAttachment: string;
  checkNumber: string;
  paymentDay: string;
  paymentStatus: "active" | "paused" | "leaving" | "laid_off";
  defaultDaysWorkedPerWeek: string;
}

interface SalaryHistory {
  id: string;
  employeeId: string;
  effectiveDate: string;
  previousSalary: number;
  newSalary: number;
  reason?: string;
  isRetroactive?: boolean;
}

export default function Employees() {
  const { selectedYear } = useYear();
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize with empty states - will be populated by fetchData
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [weeklyPayments, setWeeklyPayments] = useState<WeeklyPayment[]>([]);
  const [absences, setAbsences] = useState<EmployeeAbsence[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absenceEmployeeId, setAbsenceEmployeeId] = useState<string | null>(null);
  const [absenceFromDate, setAbsenceFromDate] = useState<string>("");
  const [absenceToDate, setAbsenceToDate] = useState<string>("");
  const [absenceDaysWorked, setAbsenceDaysWorked] = useState<number>(5);
  const [absenceReason, setAbsenceReason] = useState<string>("");
  const [isAddingNewAbsence, setIsAddingNewAbsence] = useState(false);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<string | null>(null);
  const [isSeveranceModalOpen, setIsSeveranceModalOpen] = useState(false);
  const [severanceEmployeeId, setSeveranceEmployeeId] = useState<string | null>(null);
  const [severanceReason, setSeveranceReason] = useState<string>("");
  const [severanceDate, setSeveranceDate] = useState<string>("");
  const [severanceMode, setSeveranceMode] = useState<"quick" | "custom">("quick");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "paused" | "leaving" | "laid_off">("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<WeeklyPayment | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    weekStartDate: "",
    daysWorked: 5,
    overrideAmount: "",
    paymentMethod: "cash" as "check" | "direct_deposit" | "bank_transfer" | "wire_transfer" | "credit_card" | "cash",
    checkNumber: "",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
    creditCardLast4: "",
    transactionReference: "",
    receiptAttachment: "",
  });
  const [formData, setFormData] = useState<EmployeeFormData>({
    name: "",
    position: "",
    telephone: "",
    email: "",
    startDate: "",
    paymentStartDate: "",
    address: "",
    ssn: "",
    itin: "",
    weeklyRate: "",
    paymentMethod: "cash",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
    checkAttachment: "",
    checkNumber: "",
    paymentDay: "wednesday",
    paymentStatus: "active",
    defaultDaysWorkedPerWeek: "5",
  });
  const [isGeneratePaymentsModalOpen, setIsGeneratePaymentsModalOpen] = useState(false);
  const [automaticPaymentsEnabled, setAutomaticPaymentsEnabled] = useState(true);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promoteEmployeeId, setPromoteEmployeeId] = useState<string | null>(null);
  const [promoteNewSalary, setPromoteNewSalary] = useState<string>("");
  const [promoteEffectiveDate, setPromoteEffectiveDate] = useState<string>("");
  const [promoteRetroactive, setPromoteRetroactive] = useState<boolean>(false);
  const [promoteReason, setPromoteReason] = useState<string>("promotion");

  // Mappers
  const mapSupabaseEmployeeToLocal = (emp: SupabaseEmployee): Employee => ({
    id: emp.id,
    name: emp.name,
    position: emp.position || "",
    weeklyRate: emp.weekly_rate || 0,
    startDate: emp.hire_date || "",
    paymentStartDate: emp.payment_start_date || "",
    ssn: emp.ssn || "",
    address: emp.address || "",
    telephone: emp.telephone || "",
    email: emp.email || "",
    paymentMethod: emp.payment_method || "",
    bankName: emp.bank_details?.bank_name || "",
    routingNumber: emp.bank_details?.routing_number || "",
    accountNumber: emp.bank_details?.account_number || "",
    accountType: emp.bank_details?.account_type || "",
    checkAttachment: "", 
    checkNumber: "",
    directDeposit: emp.direct_deposit,
    paymentDay: emp.payment_day || "",
    paymentStatus: emp.payment_status,
    defaultDaysWorkedPerWeek: emp.default_days_worked || 5,
  });

  const mapSupabasePaymentToLocal = (pay: SupabasePayment): WeeklyPayment => ({
    id: pay.id,
    employeeId: pay.employee_id,
    weekStartDate: pay.week_start_date,
    daysWorked: pay.days_worked,
    weeklyRate: 0, // Will be enriched from employee data if needed
    calculatedAmount: pay.gross_amount || 0,
    overrideAmount: undefined,
    finalAmount: pay.amount,
    status: pay.status as any,
    paymentMethod: pay.payment_method as any,
    checkNumber: pay.check_number || undefined,
    bankName: pay.bank_name || undefined,
    routingNumber: pay.routing_number || undefined,
    accountNumber: pay.account_number || undefined,
    accountType: pay.account_type || undefined,
    creditCardLast4: pay.account_last_four || undefined,
    transactionReference: undefined,
    receiptAttachment: undefined,
    notes: pay.notes || undefined
  });

  const mapSupabaseAbsenceToLocal = (abs: SupabaseAbsence): EmployeeAbsence => ({
    id: abs.id,
    employeeId: abs.employee_id,
    fromDate: abs.from_date,
    toDate: abs.to_date,
    daysWorkedPerWeek: abs.days_worked_per_week,
    reason: abs.reason || undefined
  });

  const mapSupabaseSalaryHistoryToLocal = (hist: SupabaseSalaryHistory): SalaryHistory => ({
    id: hist.id,
    employeeId: hist.employee_id,
    effectiveDate: hist.effective_date,
    previousSalary: hist.previous_salary,
    newSalary: hist.new_salary,
    reason: hist.reason || "",
    isRetroactive: hist.is_retroactive
  });

  // Fetch data from Supabase
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [empData, payData, absData, salData] = await Promise.all([
        employeesService.getAll(),
        paymentsService.getAll(),
        absencesService.getAll(),
        salaryHistoryService.getAll().catch(() => [])
      ]);
      
      const mappedEmployees = empData.map(mapSupabaseEmployeeToLocal);
      const mappedPayments = payData.map(mapSupabasePaymentToLocal);
      
      // Enrich payments with weeklyRate from employees
      const enrichedPayments = mappedPayments.map(p => {
        const emp = mappedEmployees.find(e => e.id === p.employeeId);
        return { ...p, weeklyRate: emp ? emp.weeklyRate : 0 };
      });

      setEmployees(mappedEmployees);
      setWeeklyPayments(enrichedPayments);
      setAbsences(absData.map(mapSupabaseAbsenceToLocal));
      setSalaryHistory(salData.map(mapSupabaseSalaryHistoryToLocal));
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const parseLocalDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };


  const filteredEmployees = employees
    .filter((emp) => {
      const statusMatch = filterStatus === "all" || emp.paymentStatus === filterStatus;

      let dateMatch = true;
      if (filterFromDate || filterToDate) {
        const empDate = parseLocalDate(emp.startDate);

        if (filterFromDate) {
          const fromDate = parseLocalDate(filterFromDate);
          if (empDate < fromDate) dateMatch = false;
        }
        if (filterToDate) {
          const toDate = parseLocalDate(filterToDate);
          if (empDate > toDate) dateMatch = false;
        }
      }

      return statusMatch && dateMatch;
    })
    .sort((a, b) => {
      const aIdMatch = a.id.match(/EMP-(\d+)/);
      const bIdMatch = b.id.match(/EMP-(\d+)/);

      if (aIdMatch && bIdMatch) {
        const aNum = parseInt(aIdMatch[1], 10);
        const bNum = parseInt(bIdMatch[1], 10);
        return aNum - bNum;
      }

      return a.id.localeCompare(b.id);
    })
    .filter((emp, index, self) => {
      const firstIndex = self.findIndex(e => e.id === emp.id);
      if (firstIndex !== index) {
        console.warn(`Removing duplicate employee in filtered list: ${emp.id}`);
        return false;
      }
      return true;
    });

  const totalWeeklyPayments = filteredEmployees.reduce((sum, emp) => sum + emp.weeklyRate, 0);
  const pendingPaymentsData = (() => {
    const employeeIds = new Set(employees.map(e => e.id));
    const allPendingPayments = weeklyPayments.filter((payment) => payment.status === "pending" && employeeIds.has(payment.employeeId));
    if (allPendingPayments.length === 0) return { count: 0, total: 0 };

    const firstPendingWeek = Math.min(...allPendingPayments.map(p => new Date(p.weekStartDate).getTime()));
    const thisWeekPayments = allPendingPayments.filter(p => new Date(p.weekStartDate).getTime() === firstPendingWeek);
    const totalAmount = thisWeekPayments.reduce((sum, p) => sum + p.finalAmount, 0);
    return { count: thisWeekPayments.length, total: totalAmount };
  })();

  const pendingPaymentsCount = pendingPaymentsData.count;

  const handleFormChange = (field: keyof EmployeeFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculatePaymentAmount = (weeklyRate: number, daysWorked: number): number => {
    return (weeklyRate / 5) * daysWorked;
  };

  const handleOpenPaymentModal = (employeeId: string, payment?: WeeklyPayment) => {
    if (payment) {
      setEditingPayment(payment);
      setPaymentFormData({
        weekStartDate: payment.weekStartDate,
        daysWorked: payment.daysWorked,
        overrideAmount: payment.overrideAmount?.toString() || "",
        paymentMethod: payment.paymentMethod || "cash",
        checkNumber: payment.checkNumber || "",
        bankName: payment.bankName || "",
        routingNumber: payment.routingNumber || "",
        accountNumber: payment.accountNumber || "",
        accountType: payment.accountType || "checking",
        creditCardLast4: payment.creditCardLast4 || "",
        transactionReference: payment.transactionReference || "",
        receiptAttachment: payment.receiptAttachment || "",
      });
    } else {
      setEditingPayment(null);
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      setPaymentFormData({
        weekStartDate: formatDateToString(weekStart),
        daysWorked: 5,
        overrideAmount: "",
        paymentMethod: "cash",
        checkNumber: "",
        bankName: "",
        routingNumber: "",
        accountNumber: "",
        accountType: "checking",
        creditCardLast4: "",
        transactionReference: "",
        receiptAttachment: "",
      });
    }
    setIsPaymentModalOpen(true);
  };

  const handlePaymentFormChange = (field: string, value: any) => {
    setPaymentFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePayment = async (employeeId: string) => {
    if (!paymentFormData.weekStartDate) {
      alert("Please select a week start date");
      return;
    }

    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;

    const calculatedAmount = calculatePaymentAmount(employee.weeklyRate, paymentFormData.daysWorked);
    const overrideAmount = paymentFormData.overrideAmount ? parseFloat(paymentFormData.overrideAmount) : undefined;
    const finalAmount = overrideAmount || calculatedAmount;

    // Calculate dates
    const startDate = parseLocalDate(paymentFormData.weekStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    const weekEndDate = formatDateToString(endDate);
    
    const dueDate = new Date(endDate);
    dueDate.setDate(endDate.getDate() + 1);
    const dueDateStr = formatDateToString(dueDate);

    try {
      if (editingPayment) {
        const updateData: Partial<SupabasePayment> = {
          week_start_date: paymentFormData.weekStartDate,
          week_end_date: weekEndDate,
          due_date: dueDateStr,
          days_worked: paymentFormData.daysWorked,
          amount: finalAmount,
          gross_amount: calculatedAmount,
          bonus_amount: 0,
          deduction_amount: 0,
          down_payment: 0,
          payment_method: paymentFormData.paymentMethod as any, // 'check' | ...
          check_number: paymentFormData.checkNumber || null,
          bank_name: paymentFormData.bankName || null,
          routing_number: paymentFormData.routingNumber || null,
          account_number: paymentFormData.accountNumber || null,
          account_type: paymentFormData.accountType || null,
          account_last_four: paymentFormData.creditCardLast4 || null,
          notes: null
        };

        await paymentsService.update(editingPayment.id, updateData);
      } else {
        const newPayment: Omit<SupabasePayment, "created_at" | "updated_at"> = {
          id: `PAY-${Date.now()}`,
          employee_id: employeeId,
          week_start_date: paymentFormData.weekStartDate,
          week_end_date: weekEndDate,
          due_date: dueDateStr,
          days_worked: paymentFormData.daysWorked,
          amount: finalAmount,
          gross_amount: calculatedAmount,
          bonus_amount: 0,
          deduction_amount: 0,
          down_payment: 0,
          status: "pending",
          payment_method: paymentFormData.paymentMethod as any,
          check_number: paymentFormData.checkNumber || null,
          bank_name: paymentFormData.bankName || null,
          routing_number: paymentFormData.routingNumber || null,
          account_number: paymentFormData.accountNumber || null,
          account_type: paymentFormData.accountType || null,
          account_last_four: paymentFormData.creditCardLast4 || null,
          notes: null,
          paid_date: null
        };
        await paymentsService.create(newPayment as SupabasePayment);
      }

      await fetchData();
      setIsPaymentModalOpen(false);
      setEditingPayment(null);

    } catch (error) {
      console.error("Error saving payment:", error);
      alert("Failed to save payment.");
    }
  };

  const handleGeneratePayments = async () => {
    const newPayments = generateWednesdayPayments(employees, weeklyPayments, selectedYear);
    if (newPayments.length > 0) {
      try {
        setIsLoading(true);
        
        const paymentsToCreate = newPayments.map((payment) => {
           // Calculate dates
           const startDate = parseLocalDate(payment.weekStartDate);
           const endDate = new Date(startDate);
           endDate.setDate(startDate.getDate() + 6);
           const weekEndDate = formatDateToString(endDate);
           
           const dueDate = new Date(endDate);
           dueDate.setDate(endDate.getDate() + 1);
           const dueDateStr = formatDateToString(dueDate);

           const newPayment: Omit<SupabasePayment, "created_at" | "updated_at"> = {
             id: payment.id,
             employee_id: payment.employeeId,
             week_start_date: payment.weekStartDate,
             week_end_date: weekEndDate,
             due_date: dueDateStr,
             days_worked: payment.daysWorked,
             amount: payment.finalAmount,
             gross_amount: payment.calculatedAmount,
             bonus_amount: 0,
             deduction_amount: 0,
             down_payment: 0,
             status: payment.status,
             payment_method: payment.paymentMethod as any,
             check_number: payment.checkNumber || null,
             bank_name: payment.bankName || null,
             routing_number: payment.routingNumber || null,
             account_number: payment.accountNumber || null,
             account_type: payment.accountType || null,
             account_last_four: payment.creditCardLast4 || null,
             notes: null,
             paid_date: null
           };
           return newPayment;
        });

        // Use bulk creation
        await paymentsService.createBulk(paymentsToCreate as Partial<SupabasePayment>[]);
        
        await fetchData();
        alert(`✓ Successfully generated ${newPayments.length} payment${newPayments.length !== 1 ? 's' : ''} for this week`);
      } catch (error) {
        console.error("Error generating payments:", error);
        alert("Failed to save generated payments.");
      } finally {
        setIsLoading(false);
      }
    } else {
      alert("No new payments were generated. Either all employees already have payments for this week, or no employees have reached their payment start date.");
    }
    setIsGeneratePaymentsModalOpen(false);
  };

  const getEmployeePayments = (employeeId: string): WeeklyPayment[] => {
    return weeklyPayments.filter((p) => p.employeeId === employeeId).sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime());
  };

  const getEmployeeAbsences = (employeeId: string): EmployeeAbsence[] => {
    return absences.filter((a) => a.employeeId === employeeId).sort((a, b) => new Date(b.fromDate).getTime() - new Date(a.fromDate).getTime());
  };

  const handleOpenAbsenceModal = (employeeId: string) => {
    setAbsenceEmployeeId(employeeId);
    setIsAddingNewAbsence(false);
    resetAbsenceForm();
    setIsAbsenceModalOpen(true);
  };

  const resetAbsenceForm = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    setAbsenceFromDate(formatDateToString(weekStart));
    setAbsenceToDate(formatDateToString(weekEnd));
    setAbsenceDaysWorked(5);
    setAbsenceReason("");
  };

  const handleStartAddingAbsence = () => {
    resetAbsenceForm();
    setIsAddingNewAbsence(true);
  };

  const handleCancelAddAbsence = () => {
    resetAbsenceForm();
    setIsAddingNewAbsence(false);
  };

  const handleAddAbsencePeriod = async () => {
    if (!absenceEmployeeId || !absenceFromDate || !absenceToDate) {
      alert("Please select from and to dates");
      return;
    }

    if (new Date(absenceFromDate) > new Date(absenceToDate)) {
      alert("From date cannot be after To date");
      return;
    }

    try {
      const newAbsence: Partial<SupabaseAbsence> = {
        id: `ABS-${absenceEmployeeId}-${Date.now()}`,
        employee_id: absenceEmployeeId,
        from_date: absenceFromDate,
        to_date: absenceToDate,
        days_worked_per_week: absenceDaysWorked,
        reason: absenceReason,
      };

      await absencesService.create(newAbsence);
      await fetchData();

      resetAbsenceForm();
      setIsAddingNewAbsence(false);
      alert("Absence added successfully!");
    } catch (error) {
      console.error("Error adding absence:", error);
      alert("Failed to add absence.");
    }
  };

  const handleDeleteAbsence = async (absenceId: string) => {
    if (window.confirm("Are you sure you want to delete this absence?")) {
      try {
        await absencesService.delete(absenceId);
        await fetchData();
      } catch (error) {
        console.error("Error deleting absence:", error);
        alert("Failed to delete absence.");
      }
    }
  };

  const calculateAbsenceAmount = () => {
    if (!absenceFromDate || !absenceToDate || !absenceEmployeeId) return 0;

    const fromDate = parseLocalDate(absenceFromDate);
    const toDate = parseLocalDate(absenceToDate);

    const daysDiff = Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const weeksCount = Math.ceil(daysDiff / 7);

    const employee = employees.find((e) => e.id === absenceEmployeeId);
    if (!employee) return 0;

    const dailyRate = employee.weeklyRate / 5;
    const totalAmount = dailyRate * absenceDaysWorked * weeksCount;

    return totalAmount;
  };

  const getWeekCount = () => {
    if (!absenceFromDate || !absenceToDate) return 0;

    const fromDate = parseLocalDate(absenceFromDate);
    const toDate = parseLocalDate(absenceToDate);
    const daysDiff = Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return Math.ceil(daysDiff / 7);
  };

  const calculateWeekdaysInRange = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 0;

    const start = parseLocalDate(startStr);
    const end = parseLocalDate(endStr);
    let weekdayCount = 0;

    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        weekdayCount++;
      }
      current.setDate(current.getDate() + 1);
    }

    return weekdayCount;
  };

  const handleAbsenceDateChange = (fromDate: string, toDate: string) => {
    setAbsenceFromDate(fromDate);
    setAbsenceToDate(toDate);

    if (fromDate && toDate) {
      const weekdayCount = calculateWeekdaysInRange(fromDate, toDate);
      const daysPerWeek = Math.min(weekdayCount, 5);
      setAbsenceDaysWorked(daysPerWeek);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.name && formData.name.trim() &&
          formData.position && formData.position.trim()
        );
      case 2:
        return true;
      case 3:
        // When editing, require bank info. When creating new, bank info is optional (can be added later)
        if (isEditMode && formData.paymentMethod && formData.paymentMethod !== "cash") {
          if (formData.paymentMethod === "direct_deposit" || formData.paymentMethod === "ach" || formData.paymentMethod === "wire") {
            if (!formData.bankName || !formData.bankName.trim()) return false;
            if (!formData.routingNumber || !formData.routingNumber.trim()) return false;
            if (!formData.accountNumber || !formData.accountNumber.trim()) return false;
          }
        }
        return true;
      default:
        return false;
    }
  };

  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    } else {
      alert("Please fill in all required fields for this step");
    }
  };

  const handlePreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleAddEmployee = async () => {
    if (!validateStep(3)) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      if (isEditMode && editingEmployeeId) {
        const updateData: Partial<SupabaseEmployee> = {
          name: formData.name,
          position: formData.position,
          telephone: formData.telephone,
          email: formData.email,
          hire_date: formData.startDate,
          payment_start_date: formData.paymentStartDate,
          address: formData.address,
          ssn: formData.ssn || formData.itin,
          weekly_rate: parseFloat(formData.weeklyRate),
          payment_method: formData.paymentMethod as any, // 'direct_deposit' | 'check' | 'cash' ...
          bank_details: {
            bank_name: formData.bankName,
            routing_number: formData.routingNumber,
            account_number: formData.accountNumber,
            account_type: formData.accountType
          },
          direct_deposit: formData.paymentMethod === "direct_deposit",
          payment_day: formData.paymentDay,
          payment_status: formData.paymentStatus,
          default_days_worked: parseInt(formData.defaultDaysWorkedPerWeek, 10) || 5,
        };

        await employeesService.update(editingEmployeeId, updateData);
        await fetchData();

        setIsEditMode(false);
        setEditingEmployeeId(null);
        alert("Employee updated successfully!");
      } else {
        // Find max ID to generate next ID
        let maxId = 0;
        employees.forEach((emp) => {
          const match = emp.id.match(/EMP-(\d+)/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxId) maxId = num;
          }
        });
        const nextId = maxId + 1;
        const newId = `EMP-${String(nextId).padStart(3, "0")}`;

        const newEmployee: Omit<SupabaseEmployee, "created_at" | "updated_at"> = {
          id: newId, 
          user_id: null, // explicit null if required or omitted
          name: formData.name,
          position: formData.position,
          telephone: formData.telephone,
          email: formData.email,
          hire_date: formData.startDate,
          payment_start_date: formData.paymentStartDate,
          address: formData.address,
          ssn: formData.ssn || formData.itin,
          weekly_rate: parseFloat(formData.weeklyRate),
          payment_method: formData.paymentMethod as any,
          bank_details: {
            bank_name: formData.bankName,
            routing_number: formData.routingNumber,
            account_number: formData.accountNumber,
            account_type: formData.accountType
          },
          direct_deposit: formData.paymentMethod === "direct_deposit",
          payment_day: formData.paymentDay,
          payment_status: formData.paymentStatus,
          default_days_worked: parseInt(formData.defaultDaysWorkedPerWeek, 10) || 5,
        };

        await employeesService.create(newEmployee as SupabaseEmployee);
        await fetchData();
        alert("Employee added successfully!");
      }

      setFormData({
        name: "",
        position: "",
        telephone: "",
        email: "",
        startDate: "",
        paymentStartDate: "",
        address: "",
        ssn: "",
        itin: "",
        weeklyRate: "",
        paymentMethod: "cash",
        bankName: "",
        routingNumber: "",
        accountNumber: "",
        accountType: "checking",
        checkAttachment: "",
        checkNumber: "",
        paymentDay: "wednesday",
        paymentStatus: "active",
        defaultDaysWorkedPerWeek: "5",
      });
      setCurrentStep(1);
      setIsModalOpen(false);

    } catch (error) {
      console.error("Error saving employee:", error);
      alert("Failed to save employee. Please try again.");
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setFormData({
      name: employee.name,
      position: employee.position,
      telephone: employee.telephone,
      email: employee.email || "",
      startDate: employee.startDate,
      paymentStartDate: employee.paymentStartDate || "",
      address: employee.address || "",
      ssn: employee.ssn || "",
      itin: "",
      weeklyRate: employee.weeklyRate.toString(),
      paymentMethod: employee.paymentMethod || "cash",
      bankName: employee.bankName || "",
      routingNumber: employee.routingNumber || "",
      accountNumber: employee.accountNumber || "",
      accountType: employee.accountType || "checking",
      checkAttachment: employee.checkAttachment || "",
      checkNumber: employee.checkNumber || "",
      paymentDay: employee.paymentDay || "friday",
      paymentStatus: employee.paymentStatus || "active",
      defaultDaysWorkedPerWeek: (employee.defaultDaysWorkedPerWeek || 5).toString(),
    });
    setEditingEmployeeId(employee.id);
    setIsEditMode(true);
    setCurrentStep(1);
    setIsModalOpen(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      try {
        await employeesService.delete(employeeId);
        await fetchData();
      } catch (error) {
        console.error("Error deleting employee:", error);
        alert("Failed to delete employee.");
      }
    }
  };

  const handleStatusChange = async (employeeId: string, newStatus: "active" | "paused" | "leaving" | "laid_off") => {
    try {
      await employeesService.update(employeeId, { payment_status: newStatus });
      await fetchData();

      if (viewingEmployee && viewingEmployee.id === employeeId) {
        setViewingEmployee({
          ...viewingEmployee,
          paymentStatus: newStatus,
        });
      }
      setOpenStatusMenuId(null);

      if (newStatus === "paused") {
        setAbsenceEmployeeId(employeeId);
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        setAbsenceFromDate(formatDateToString(weekStart));
        setAbsenceToDate(formatDateToString(weekEnd));
        setAbsenceDaysWorked(5);
        setAbsenceReason("");
        setIsAbsenceModalOpen(true);
      }

      if (newStatus === "laid_off") {
        setSeveranceEmployeeId(employeeId);
        setSeveranceDate(getTodayDate());
        setSeveranceReason("");
        setIsSeveranceModalOpen(true);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  const handleAdjustSalary = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (!employee) return;
    setPromoteEmployeeId(employeeId);
    setPromoteNewSalary(employee.weeklyRate.toString());
    setPromoteEffectiveDate(getTodayDate());
    setPromoteRetroactive(false);
    setPromoteReason("promotion");
    setIsPromoteModalOpen(true);
  };

  const handleConfirmPromote = async () => {
    if (!promoteEmployeeId || !promoteNewSalary || !promoteEffectiveDate) {
      alert("Please fill in all fields");
      return;
    }

    const newSalary = parseFloat(promoteNewSalary);
    if (isNaN(newSalary) || newSalary <= 0) {
      alert("Please enter a valid salary amount");
      return;
    }

    const employee = employees.find(e => e.id === promoteEmployeeId);
    const oldSalary = employee?.weeklyRate || 0;

    try {
      // Record salary change in history before updating employee
      if (newSalary !== oldSalary) {
        const reasonLabels: { [key: string]: string } = {
          promotion: "Promotion",
          demotion: "Demotion",
          correction: "Salary Correction",
          market: "Market Adjustment",
          other: "Other"
        };
        const salaryChangeRecord: Partial<SupabaseSalaryHistory> = {
          id: `SAL-${promoteEmployeeId}-${Date.now()}`,
          employee_id: promoteEmployeeId,
          effective_date: promoteEffectiveDate,
          previous_salary: oldSalary,
          new_salary: newSalary,
          reason: reasonLabels[promoteReason] || promoteReason,
          is_retroactive: promoteRetroactive
        };

        // We can let backend handle ID generation or use client ID. 
        // Supabase schema has UUID likely, so we skip ID or let it autogenerate if it's serial/uuid
        // If we want to force ID: id: `SAL-...`
        
        await salaryHistoryService.create(salaryChangeRecord);
      }

      await employeesService.update(promoteEmployeeId, { weekly_rate: newSalary });
      await fetchData();

      if (viewingEmployee && viewingEmployee.id === promoteEmployeeId) {
        setViewingEmployee({
          ...viewingEmployee,
          weeklyRate: newSalary,
        });
      }

      // Show success message
      const salaryChange = newSalary - oldSalary;
      const changeDisplay = salaryChange > 0 ? `+$${salaryChange.toLocaleString()}` : `$${salaryChange.toLocaleString()}`;
      const reasonLabels: { [key: string]: string } = {
        promotion: "Promotion",
        demotion: "Demotion",
        correction: "Salary Correction",
        market: "Market Adjustment",
        other: "Other"
      };
      const reasonDisplay = reasonLabels[promoteReason] || promoteReason;

      alert(`✅ ${employee?.name} - ${reasonDisplay}\nOld: $${oldSalary.toLocaleString()}/week\nNew: $${newSalary.toLocaleString()}/week\nChange: ${changeDisplay}\nEffective: ${promoteEffectiveDate}${promoteRetroactive ? "\n(Applied to previous year)" : ""}`);

      // Reset and close modal
      setIsPromoteModalOpen(false);
      setPromoteEmployeeId(null);
      setPromoteNewSalary("");
      setPromoteEffectiveDate("");
      setPromoteRetroactive(false);
      setPromoteReason("promotion");

    } catch (error) {
      console.error("Error promoting employee:", error);
      alert("Failed to promote employee.");
    }
  };

  const getLatestPendingPaymentForEmployee = (employeeId: string) => {
    // Use weeklyPayments state from context/fetchData instead of direct localStorage access
    const employeePayments = weeklyPayments.filter(
      (p) => p.employeeId === employeeId && p.status === "pending" && !p.notes?.toLowerCase().includes("severance")
    );
    if (employeePayments.length === 0) return null;
    employeePayments.sort((a, b) => {
      return new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime();
    });
    return employeePayments[0];
  };

  const getUpcomingPaymentWeek = (): string | null => {
    // Use weeklyPayments state
    const pendingPayments = weeklyPayments.filter((p) => p.status === "pending");
    let earliestWeekStart: string | null = null;

    if (pendingPayments.length > 0) {
      earliestWeekStart = pendingPayments.reduce((earliest: string | null, p) => {
        if (!earliest || p.weekStartDate < earliest) {
          return p.weekStartDate;
        }
        return earliest;
      }, null);
    } else if (weeklyPayments.length > 0) {
      earliestWeekStart = weeklyPayments.reduce((earliest: string | null, p) => {
        if (!earliest || p.weekStartDate < earliest) {
          return p.weekStartDate;
        }
        return earliest;
      }, null);
    }

    return earliestWeekStart;
  };

  const handleConfirmSeverance = async () => {
    const employee = employees.find(e => e.id === severanceEmployeeId);
    if (!employee) return;

    let severanceAmount = employee.weeklyRate;
    let finalReason = severanceReason;

    if (severanceMode === "quick") {
      const latestPayment = getLatestPendingPaymentForEmployee(severanceEmployeeId);
      if (latestPayment) {
        severanceAmount = latestPayment.finalAmount;
        const weekStr = new Date(latestPayment.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        finalReason = `Severance - Week of ${weekStr}`;
      } else {
        finalReason = "Severance Payment";
      }
    } else {
      if (!severanceReason) {
        alert("Please enter a reason for the severance");
        return;
      }
    }

    let weekStartStr: string | null = null;
    const employeeLatestPayment = getLatestPendingPaymentForEmployee(severanceEmployeeId);
    if (employeeLatestPayment) {
      weekStartStr = employeeLatestPayment.weekStartDate;
    } else {
      weekStartStr = getUpcomingPaymentWeek();
    }

    if (!weekStartStr) {
      const parts = severanceDate.split('-');
      const severanceDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      weekStartStr = getWeekStartDate(severanceDateObj);
    }

    // Calculate/Validate dates
    const weekStartParts = weekStartStr.split('-');
    const weekStartDate = new Date(parseInt(weekStartParts[0]), parseInt(weekStartParts[1]) - 1, parseInt(weekStartParts[2]));
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6);
    const weekEndStr = formatDateToString(weekEndDate);

    const dueDateObj = new Date(weekEndDate);
    dueDateObj.setDate(weekEndDate.getDate() + 1);
    const dueDateStr = formatDateToString(dueDateObj);

    try {
        const newPayment: Omit<SupabasePayment, "created_at" | "updated_at"> = {
          id: `SEVER-${employee.id}-${weekStartStr}`,
          employee_id: employee.id,
          week_start_date: weekStartStr,
          week_end_date: weekEndStr,
          due_date: dueDateStr,
          days_worked: 5,
          amount: severanceAmount,
          gross_amount: severanceAmount, 
          bonus_amount: 0,
          deduction_amount: 0,
          down_payment: 0,
          status: "pending",
          payment_method: employee.paymentMethod as any,
          check_number: null,
          bank_name: employee.bankName || null,
          routing_number: employee.routingNumber || null,
          account_number: employee.accountNumber || null,
          account_type: employee.accountType || null as any,
          account_last_four: null,
          notes: finalReason,
          paid_date: null
        };

        await paymentsService.create(newPayment as SupabasePayment);
        await fetchData();

        setIsSeveranceModalOpen(false);
        setSeveranceEmployeeId(null);
        setSeveranceReason("");
        setSeveranceDate("");
        setSeveranceMode("quick");
    } catch (error) {
        console.error("Error creating severance payment:", error);
        alert("Failed to create severance payment.");
    }
  };

   const handleModalOpenChange = (open: boolean) => {
    if (!open) {
      setCurrentStep(1);
      setIsEditMode(false);
      setEditingEmployeeId(null);
      setFormData({
        name: "",
        position: "",
        telephone: "",
        email: "",
        startDate: "",
        paymentStartDate: "",
        address: "",
        ssn: "",
        itin: "",
        weeklyRate: "",
        paymentMethod: "cash",
        bankName: "",
        routingNumber: "",
        accountNumber: "",
        accountType: "checking",
        checkAttachment: "",
        checkNumber: "",
        paymentDay: "wednesday",
        paymentStatus: "active",
        defaultDaysWorkedPerWeek: "5",
      });
    }
    setIsModalOpen(open);
  };


  const printEmployeesList = () => {
    try {
      if (employees.length === 0) {
        alert("No employees to print");
        return;
      }

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;
      const margin = 10;
      const lineHeight = 5;

      pdf.setFontSize(14);
      pdf.setFont(undefined, "bold");
      pdf.text("Employee Roster", margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(9);
      pdf.setFont(undefined, "normal");
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
      yPosition += 8;

      const totalWeeklyPayroll = employees.reduce((sum, e) => sum + e.weeklyRate, 0);
      const activeEmployees = employees.filter((e) => e.paymentStatus === "active").length;
      pdf.setFontSize(9);
      pdf.text(`Total Employees: ${employees.length} | Active: ${activeEmployees} | Weekly Payroll: $${totalWeeklyPayroll.toLocaleString()}`, margin, yPosition);
      yPosition += 6;

      const colWidths = [15, 40, 35, 25, 25, 35, 20];
      const headers = ["ID", "Name", "Position", "Weekly Rate", "Start Date", "Payment Method", "Status"];
      const cellPadding = 1.5;
      let xPosition = margin;

      pdf.setFont(undefined, "bold");
      pdf.setFontSize(9);
      headers.forEach((header, idx) => {
        pdf.text(header, xPosition + cellPadding, yPosition);
        xPosition += colWidths[idx];
      });
      yPosition += lineHeight + 1;
      pdf.setDrawColor(200);
      pdf.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
      yPosition += 2;

      pdf.setFont(undefined, "normal");
      pdf.setFontSize(8);

      employees.forEach((emp) => {
        if (yPosition > pageHeight - 10) {
          pdf.addPage();
          yPosition = 15;
        }

        xPosition = margin;
        const cellTextHeight = lineHeight;

        pdf.text(emp.id, xPosition + cellPadding, yPosition);
        xPosition += colWidths[0];

        let nameToPrint = emp.name;
        if (nameToPrint.length > 25) {
          nameToPrint = nameToPrint.substring(0, 22) + "...";
        }
        pdf.text(nameToPrint, xPosition + cellPadding, yPosition);
        xPosition += colWidths[1];

        let positionToPrint = emp.position;
        if (positionToPrint.length > 25) {
          positionToPrint = positionToPrint.substring(0, 22) + "...";
        }
        pdf.text(positionToPrint, xPosition + cellPadding, yPosition);
        xPosition += colWidths[2];

        pdf.text(`$${emp.weeklyRate.toLocaleString()}`, xPosition + cellPadding, yPosition);
        xPosition += colWidths[3];

        const startDateFormatted = formatDateString(emp.startDate);
        pdf.text(startDateFormatted, xPosition + cellPadding, yPosition);
        xPosition += colWidths[4];

        let paymentMethod = emp.paymentMethod
          ? emp.paymentMethod.charAt(0).toUpperCase() + emp.paymentMethod.slice(1).replace(/_/g, " ")
          : "-";
        if (paymentMethod.length > 20) {
          paymentMethod = paymentMethod.substring(0, 17) + "...";
        }
        pdf.text(paymentMethod, xPosition + cellPadding, yPosition);
        xPosition += colWidths[5];

        const status = emp.paymentStatus ? emp.paymentStatus.charAt(0).toUpperCase() + emp.paymentStatus.slice(1) : "Active";
        pdf.text(status, xPosition + cellPadding, yPosition);

        yPosition += cellTextHeight + 1;
      });

      yPosition += 3;
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(9);
      pdf.text(`Total Employees: ${employees.length}`, margin, yPosition);
      pdf.text(`Weekly Payroll: $${totalWeeklyPayroll.toLocaleString()}`, margin + 50, yPosition);

      pdf.save(`Employee-Roster-${new Date().toISOString().split("T")[0]}.pdf`);
      alert("✓ Employee roster printed successfully");
    } catch (error) {
      console.error("Error generating employee roster:", error);
      alert("Error generating roster. Please try again.");
    }
  };

  const getEmployeeLastYearEarnings = (employeeId: string): { total: number; paidCount: number; breakdown: Array<{ month: string; amount: number }>; adjustmentAmount?: number } => {
    const previousYear = selectedYear - 1;
    const payments = weeklyPayments.filter((p) => new Date(p.weekStartDate).getFullYear() === previousYear);

    const employeePayments = payments.filter(
      (p) => p.employeeId === employeeId && p.status === "paid"
    );

    // Check for retroactive salary changes
    const retroactiveSalaryChanges = salaryHistory.filter(
      (sh) => sh.employeeId === employeeId && sh.isRetroactive
    );

    let adjustmentAmount = 0;
    let adjustedPayments = employeePayments;

    if (retroactiveSalaryChanges.length > 0) {
      adjustedPayments = employeePayments.map((payment) => {
        const paymentDate = new Date(payment.weekStartDate);

        // Find applicable salary change (most recent one before this payment)
        let salaryAdjustment = 0;
        retroactiveSalaryChanges.forEach((change) => {
          const changeDate = new Date(change.effectiveDate);
          if (changeDate <= paymentDate) {
            const salaryDifference = change.newSalary - change.previousSalary;
            const daysInPayment = payment.daysWorked || 5;
            const dailyRate = salaryDifference / 5;
            salaryAdjustment = dailyRate * daysInPayment;
          }
        });

        if (salaryAdjustment > 0) {
          adjustmentAmount += salaryAdjustment;
          return { ...payment, finalAmount: payment.finalAmount + salaryAdjustment };
        }
        return payment;
      });
    }

    const total = adjustedPayments.reduce((sum, p) => sum + p.finalAmount, 0);
    const paidCount = adjustedPayments.length;

    // Create month breakdown
    const monthlyData: { [key: string]: number } = {};
    adjustedPayments.forEach((payment) => {
      const date = new Date(payment.weekStartDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[monthKey] = (monthlyData[monthKey] || 0) + payment.finalAmount;
    });

    const breakdown = Object.keys(monthlyData)
      .sort()
      .map((monthKey) => {
        const [year, month] = monthKey.split('-');
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        return {
          month: `${monthNames[parseInt(month) - 1]} ${year}`,
          amount: monthlyData[monthKey]
        };
      });

    return { total, paidCount, breakdown, adjustmentAmount: adjustmentAmount > 0 ? adjustmentAmount : undefined };
  };

  const downloadAnnualEarningsReport = (employee: Employee) => {
    const previousYear = selectedYear - 1;
    const { total, paidCount, breakdown, adjustmentAmount } = getEmployeeLastYearEarnings(employee.id);

    // Check if employee was working in the previous year
    const startDateObj = new Date(employee.startDate);
    const previousYearStart = new Date(previousYear, 0, 1);
    const previousYearEnd = new Date(previousYear, 11, 31);

    if (startDateObj > previousYearEnd) {
      alert(`${employee.name} did not start working in ${previousYear}. Start date: ${formatDateString(employee.startDate)}`);
      return;
    }

    if (total === 0) {
      alert(`No paid payments found for ${employee.name} in ${previousYear}`);
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;
    const margin = 12;
    const col1X = margin;
    const col2X = margin + 50;

    // Header
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("Annual Earnings Report", col1X, yPosition);
    yPosition += 8;

    // Subheader with year
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Year: ${previousYear}`, col1X, yPosition);
    yPosition += 6;

    // Generated date
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, col1X, yPosition);
    yPosition += 10;

    // Employee Information Section
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Employee Information", col1X, yPosition);
    yPosition += 6;

    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    const employeeInfo = [
      { label: "Name:", value: employee.name },
      { label: "Employee ID:", value: employee.id },
      { label: "Position:", value: employee.position },
      { label: "Start Date:", value: formatDateString(employee.startDate) },
      { label: "Weekly Rate:", value: `$${employee.weeklyRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}` }
    ];

    employeeInfo.forEach((info) => {
      doc.setFont(undefined, "bold");
      doc.text(info.label, col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(info.value, col2X, yPosition);
      yPosition += 5;
    });

    yPosition += 5;

    // Earnings Summary
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Earnings Summary", col1X, yPosition);
    yPosition += 6;

    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    const summaryInfo = [
      { label: "Total Paid Earnings:", value: `$${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}` },
      { label: "Number of Payments:", value: paidCount.toString() },
      { label: "Average Payment:", value: `$${(total / paidCount).toLocaleString(undefined, { maximumFractionDigits: 2 })}` }
    ];

    summaryInfo.forEach((info) => {
      doc.setFont(undefined, "bold");
      doc.text(info.label, col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(info.value, col2X, yPosition);
      yPosition += 5;
    });

    if (adjustmentAmount) {
      yPosition += 2;
      doc.setFillColor(200, 220, 255);
      doc.rect(col1X - 2, yPosition - 3, pageWidth - margin * 2 + 4, 8, "F");
      doc.setFont(undefined, "bold");
      doc.setTextColor(0, 51, 102);
      doc.text("Retroactive Salary Increase:", col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(`+$${adjustmentAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, col2X, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 5;
    }

    yPosition += 5;

    // Monthly Breakdown
    if (breakdown.length > 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, "bold");
      doc.text("Monthly Breakdown", col1X, yPosition);
      yPosition += 6;

      doc.setFont(undefined, "normal");
      doc.setFontSize(9);

      // Table header
      const tableLeft = col1X;
      const tableRight = col2X + 30;

      doc.setFont(undefined, "bold");
      doc.text("Month", tableLeft, yPosition);
      doc.text("Amount", tableRight - 30, yPosition);
      yPosition += 5;
      doc.setDrawColor(200);
      doc.line(tableLeft, yPosition - 2, pageWidth - margin, yPosition - 2);
      yPosition += 1;

      doc.setFont(undefined, "normal");
      breakdown.forEach((item) => {
        if (yPosition > pageHeight - 15) {
          doc.addPage();
          yPosition = 15;
        }
        doc.text(item.month, tableLeft, yPosition);
        doc.text(`$${item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, tableRight - 30, yPosition);
        yPosition += 5;
      });
    }

    // Footer
    yPosition = pageHeight - 10;
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.setTextColor(150, 150, 150);
    doc.text(
      `This is an official earnings record for ${previousYear}. `,
      margin,
      yPosition
    );

    const fileName = `${employee.name.replace(/\s+/g, '_')}_earnings_${previousYear}.pdf`;
    doc.save(fileName);
    alert(`✓ Annual earnings report downloaded for ${employee.name}`);
  };

  const downloadEmployeeDetailsReport = () => {
    if (employees.length === 0) {
      alert("No employees to print");
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 15;
    const margin = 12;
    const col1X = margin;
    const col2X = margin + 50;

    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("Employee Details Report", col1X, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, col1X, yPosition);
    yPosition += 8;

    const totalWeeklyPayroll = employees.reduce((sum, e) => sum + e.weeklyRate, 0);
    const activeEmployees = employees.filter((e) => e.paymentStatus === "active").length;

    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Summary", col1X, yPosition);
    yPosition += 5;

    doc.setFont(undefined, "normal");
    const summaryLines = [
      { label: "Total Employees:", value: employees.length.toString() },
      { label: "Active Employees:", value: activeEmployees.toString() },
      { label: "Weekly Payroll Total:", value: `$${totalWeeklyPayroll.toLocaleString()}` },
    ];

    summaryLines.forEach((line) => {
      doc.text(line.label, col1X, yPosition);
      doc.text(line.value, col2X, yPosition);
      yPosition += 5;
    });

    yPosition += 5;

    employees.forEach((emp, index) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFont(undefined, "bold");
      doc.setFontSize(10);
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, yPosition - 3, pageWidth - margin * 2, 7, "F");
      doc.text(`${emp.id} - ${emp.name}`, margin + 3, yPosition + 1);
      yPosition += 8;

      doc.setFont(undefined, "normal");
      doc.setFontSize(9);

      doc.setFont(undefined, "bold");
      doc.text("Position:", col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(emp.position, col2X, yPosition);
      yPosition += 5;

      doc.setFont(undefined, "bold");
      doc.text("Weekly Rate:", col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(`$${emp.weeklyRate.toLocaleString()}`, col2X, yPosition);
      yPosition += 5;

      doc.setFont(undefined, "bold");
      doc.text("Start Date:", col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(emp.startDate || "-", col2X, yPosition);
      yPosition += 5;

      doc.setFont(undefined, "bold");
      doc.text("Payment Method:", col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(emp.paymentMethod || "-", col2X, yPosition);
      yPosition += 5;

      doc.setFont(undefined, "bold");
      doc.text("Status:", col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(emp.paymentStatus || "active", col2X, yPosition);
      yPosition += 8;

      doc.setFont(undefined, "bold");
      doc.text("Personal Information", col1X, yPosition);
      yPosition += 5;

      doc.setFont(undefined, "normal");
      doc.setFont(undefined, "bold");
      doc.text("Email:", col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(emp.email || "-", col2X, yPosition, { maxWidth: pageWidth - col2X - 10 });
      yPosition += 5;

      doc.setFont(undefined, "bold");
      doc.text("Telephone:", col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(emp.telephone || "-", col2X, yPosition);
      yPosition += 5;

      doc.setFont(undefined, "bold");
      doc.text("Address:", col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(emp.address || "-", col2X, yPosition, { maxWidth: pageWidth - col2X - 10 });
      yPosition += 5;

      doc.setFont(undefined, "bold");
      doc.text("Social/TIN:", col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(emp.ssn || "-", col2X, yPosition);
      yPosition += 10;
    });

    const fileName = `employees_details_${formatDateToString(new Date())}.pdf`;
    doc.save(fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employee Management</h1>
          <p className="text-slate-600 mt-1">Manage employee information, weekly payments, and payroll</p>
          {employees.length > 0 && (
            <p className="text-sm text-slate-500 mt-2">
              Total: <span className="font-semibold text-slate-900">{employees.length}</span> employees |
              Active: <span className="font-semibold text-green-600">{employees.filter(e => e.paymentStatus === 'active').length}</span> |
              Paused: <span className="font-semibold text-orange-600">{employees.filter(e => e.paymentStatus === 'paused').length}</span> |
              Leaving: <span className="font-semibold text-red-600">{employees.filter(e => e.paymentStatus === 'leaving').length}</span>
            </p>
          )}
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={generateEmployeeTemplate}
            className="gap-2 bg-slate-700 hover:bg-slate-800"
          >
            <Download className="w-3.8 h-3.8" />
            Download Template
          </Button>
          <Button
            onClick={downloadEmployeeDetailsReport}
            className="gap-2 bg-slate-700 hover:bg-slate-800"
            title="Download employee details report with all information"
          >
            <FileText className="w-3.8 h-3.8" />
            Employee Details
          </Button>
          <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-3.8 h-3.8" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Edit Employee" : "Add New Employee"}</DialogTitle>
                <DialogDescription>
                  Step {currentStep} of 4: {currentStep === 1 && "Basic Information"}
                  {currentStep === 2 && "Tax Information"}
                  {currentStep === 3 && "Payment Schedule"}
                  {currentStep === 4 && "Review & Confirm"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {currentStep === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="Enter full name"
                        value={formData.name || ""}
                        onChange={(e) => handleFormChange("name", e.target.value)}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position">Position *</Label>
                      <Input
                        id="position"
                        placeholder="Enter position (e.g., Cabinet Maker)"
                        value={formData.position || ""}
                        onChange={(e) => handleFormChange("position", e.target.value)}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telephone">Phone Number</Label>
                      <Input
                        id="telephone"
                        placeholder="(555) 123-4567"
                        value={formData.telephone || ""}
                        onChange={(e) => handleFormChange("telephone", e.target.value)}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="employee@example.com"
                        value={formData.email || ""}
                        onChange={(e) => handleFormChange("email", e.target.value)}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate || ""}
                        onChange={(e) => handleFormChange("startDate", e.target.value)}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        placeholder="Enter full address"
                        value={formData.address || ""}
                        onChange={(e) => handleFormChange("address", e.target.value)}
                        className="border-slate-300"
                      />
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <p className="text-sm text-slate-600 mb-4">
                      Please provide at least one form of tax identification for IRS reporting purposes.
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="ssn">Social Security Number (SSN)</Label>
                      <Input
                        id="ssn"
                        placeholder="XXX-XX-XXXX"
                        value={formData.ssn || ""}
                        onChange={(e) => handleFormChange("ssn", e.target.value)}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="itin">ITIN (W-7)</Label>
                      <Input
                        id="itin"
                        placeholder="XXX-XX-XXXX"
                        value={formData.itin || ""}
                        onChange={(e) => handleFormChange("itin", e.target.value)}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                      At least one tax ID is required to proceed with payroll setup.
                    </div>
                  </>
                )}

                {currentStep === 3 && (
                  <>
                    <div className="bg-slate-50 p-4 rounded border border-slate-200 mb-4">
                      <p className="text-sm font-semibold text-slate-900 mb-2">Payment Method Requirements:</p>
                      <ul className="text-xs text-slate-700 space-y-1">
                        <li><span className="font-medium">Cash</span> - No additional details needed</li>
                        <li><span className="font-medium">Direct Deposit / ACH / Wire</span> - Requires bank name, routing number, and account number</li>
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="weeklyRate">Weekly Rate ($) *</Label>
                      <Input
                        id="weeklyRate"
                        type="number"
                        placeholder="0.00"
                        value={formData.weeklyRate || ""}
                        onChange={(e) => handleFormChange("weeklyRate", e.target.value)}
                        className="border-slate-300"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="defaultDaysWorkedPerWeek">Days Worked per Week</Label>
                      <Select value={formData.defaultDaysWorkedPerWeek || "5"} onValueChange={(value) => handleFormChange("defaultDaysWorkedPerWeek", value)}>
                        <SelectTrigger className="border-slate-300">
                          <SelectValue placeholder="Select days per week" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day per week</SelectItem>
                          <SelectItem value="2">2 days per week</SelectItem>
                          <SelectItem value="3">3 days per week</SelectItem>
                          <SelectItem value="4">4 days per week</SelectItem>
                          <SelectItem value="5">5 days per week (Full-time)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        Default days worked per week for this employee. Can be overridden per-week in Payments.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentStartDate">First 2026 Payment Date *</Label>
                      <Input
                        id="paymentStartDate"
                        type="date"
                        value={formData.paymentStartDate || ""}
                        onChange={(e) => handleFormChange("paymentStartDate", e.target.value)}
                        className="border-slate-300"
                      />
                      <p className="text-xs text-slate-500">
                        The date when weekly 2026 payments begin for this employee
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentMethod">Payment Method</Label>
                      <Select value={formData.paymentMethod || "cash"} onValueChange={(value) => handleFormChange("paymentMethod", value)}>
                        <SelectTrigger className="border-slate-300">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                          <SelectItem value="ach">ACH Transfer</SelectItem>
                          <SelectItem value="wire">Wire Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-500">
                        {formData.paymentMethod === "cash" && "✓ No additional details needed for cash payments"}
                        {!isEditMode && (formData.paymentMethod === "direct_deposit" || formData.paymentMethod === "ach" || formData.paymentMethod === "wire") && "ℹ️ Bank details are optional - you can add them later"}
                        {isEditMode && (formData.paymentMethod === "direct_deposit" || formData.paymentMethod === "ach" || formData.paymentMethod === "wire") && "⚠️ Bank details are required to save changes"}
                      </p>
                    </div>

                    {!isEditMode && formData.paymentMethod === "cash" && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                        Cash payments will be handled at the address provided in Step 1
                      </div>
                    )}

                    {!isEditMode && (formData.paymentMethod === "direct_deposit" || formData.paymentMethod === "ach" || formData.paymentMethod === "wire") && (
                      <>
                        <div className="border-t pt-4">
                          <p className="text-sm font-semibold text-slate-700 mb-3">Bank Information (Optional)</p>
                          <p className="text-xs text-slate-600 mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                            💡 You can add or update bank details later when you have the employee's information
                          </p>

                          <div className="space-y-2">
                            <Label htmlFor="bankName">Bank Name</Label>
                            <Input
                              id="bankName"
                              placeholder="e.g., Wells Fargo, Chase Bank"
                              value={formData.bankName || ""}
                              onChange={(e) => handleFormChange("bankName", e.target.value)}
                              className="border-slate-300"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="routingNumber">Routing Number</Label>
                            <Input
                              id="routingNumber"
                              placeholder="9-digit routing number"
                              value={formData.routingNumber || ""}
                              onChange={(e) => handleFormChange("routingNumber", e.target.value)}
                              className="border-slate-300"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="accountNumber">Account Number</Label>
                            <Input
                              id="accountNumber"
                              placeholder="Account number"
                              value={formData.accountNumber || ""}
                              onChange={(e) => handleFormChange("accountNumber", e.target.value)}
                              className="border-slate-300"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="accountType">Account Type</Label>
                            <Select value={formData.accountType || "checking"} onValueChange={(value) => handleFormChange("accountType", value)}>
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
                      </>
                    )}
                  </>
                )}

                {currentStep === 4 && (
                  <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-3">
                    <p className="font-semibold text-slate-900">Review Employee Information</p>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Name:</span> {formData.name}</p>
                      <p><span className="font-medium">Position:</span> {formData.position}</p>
                      <p><span className="font-medium">Weekly Rate:</span> ${parseFloat(formData.weeklyRate || "0").toLocaleString()}</p>
                      <p><span className="font-medium">Payment Method:</span> {formData.paymentMethod}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-between pt-4">
                <div className="flex gap-2">
                  {currentStep > 1 && (
                    <Button variant="outline" onClick={handlePreviousStep} className="border-slate-300">
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  {currentStep < 4 ? (
                    <Button onClick={handleNextStep} className="bg-blue-600 hover:bg-blue-700">
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleAddEmployee}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isEditMode ? "Update Employee" : "Add Employee"}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button
            onClick={printEmployeesList}
            className="gap-2 bg-slate-700 hover:bg-slate-800"
            title="Print employee roster as PDF"
          >
            <Printer className="w-4 h-4" />
            Print List
          </Button>
        </div>
      </div>

      {employees.length > 0 ? (
        <>
          <Card className="border-slate-200" data-print-section>
            <CardHeader>
              <CardTitle>Employee List</CardTitle>
              <CardDescription>
                All employees and their information
              </CardDescription>
              <div className="mt-4 space-y-4">
                <div>
                  <Label className="text-sm font-medium text-slate-700 mb-2 block">Payment Status</Label>
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger className="w-40 border-slate-300 whitespace-nowrap">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="leaving">Leaving</SelectItem>
                      <SelectItem value="laid_off">Laid Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-3 items-center">
                  <Label className="text-sm font-medium text-slate-700 whitespace-nowrap">Start Date Range:</Label>
                  <Input
                    id="filterFromDate"
                    type="date"
                    placeholder="From"
                    value={filterFromDate}
                    onChange={(e) => setFilterFromDate(e.target.value)}
                    className="border-slate-300 w-40"
                  />
                  <span className="text-slate-500 text-sm">to</span>
                  <Input
                    id="filterToDate"
                    type="date"
                    placeholder="To"
                    value={filterToDate}
                    onChange={(e) => setFilterToDate(e.target.value)}
                    className="border-slate-300 w-40"
                  />
                  {(filterFromDate || filterToDate) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFilterFromDate("");
                        setFilterToDate("");
                      }}
                      className="border-slate-300 text-slate-600"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">ID</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Name</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Position</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Weekly Rate</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Start Date</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Payment Method</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Status</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-3 text-center text-slate-500">
                          No employees found matching your filters
                        </td>
                      </tr>
                    ) : (
                      filteredEmployees.map((emp, idx) => (
                        <tr key={emp.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                          <td className="p-3 text-slate-700 font-medium whitespace-nowrap">{emp.id}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">{emp.name}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">{emp.position}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">${emp.weeklyRate.toLocaleString()}</td>
                          <td className="p-3 text-slate-700 whitespace-nowrap">{formatDateString(emp.startDate)}</td>
                          <td className="p-3 text-slate-700 text-xs whitespace-nowrap">
                            <span className="bg-slate-100 px-2 py-1 rounded inline-block">
                              {emp.paymentMethod === "cash" && "Cash"}
                              {emp.paymentMethod === "direct_deposit" && "Direct Deposit"}
                              {emp.paymentMethod === "check" && "Check"}
                              {emp.paymentMethod === "ach" && "ACH Transfer"}
                              {emp.paymentMethod === "wire" && "Wire Transfer"}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="relative">
                              <Button
                                variant="outline"
                                size="sm"
                                className={`gap-2 border-0 text-xs font-semibold whitespace-nowrap ${
                                  emp.paymentStatus === "active"
                                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                                    : emp.paymentStatus === "paused"
                                    ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                                    : emp.paymentStatus === "leaving"
                                    ? "bg-red-50 text-red-700 hover:bg-red-100"
                                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                                }`}
                                onClick={() => setOpenStatusMenuId(openStatusMenuId === emp.id ? null : emp.id)}
                              >
                                <span className={`inline-block w-2 h-2 rounded-full ${
                                  emp.paymentStatus === "active" ? "bg-green-600" :
                                  emp.paymentStatus === "paused" ? "bg-yellow-600" :
                                  emp.paymentStatus === "leaving" ? "bg-red-600" :
                                  "bg-slate-600"
                                }`}></span>
                                {emp.paymentStatus || "active"}
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              {openStatusMenuId === emp.id && (
                                <div className="absolute top-full mt-1 left-0 bg-white border border-slate-200 rounded shadow-lg z-10">
                                  <button
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 text-green-700 font-medium flex items-center gap-2"
                                    onClick={() => handleStatusChange(emp.id, "active")}
                                  >
                                    <span className="inline-block w-2 h-2 rounded-full bg-green-600"></span>
                                    Active
                                  </button>
                                  <button
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 text-yellow-700 font-medium flex items-center gap-2 border-t border-slate-200"
                                    onClick={() => handleStatusChange(emp.id, "paused")}
                                  >
                                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-600"></span>
                                    Paused
                                  </button>
                                  <button
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 text-red-700 font-medium flex items-center gap-2 border-t border-slate-200"
                                    onClick={() => handleStatusChange(emp.id, "leaving")}
                                  >
                                    <span className="inline-block w-2 h-2 rounded-full bg-red-600"></span>
                                    Leaving
                                  </button>
                                  <button
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 text-slate-700 font-medium flex items-center gap-2 border-t border-slate-200"
                                    onClick={() => handleStatusChange(emp.id, "laid_off")}
                                  >
                                    <span className="inline-block w-2 h-2 rounded-full bg-slate-600"></span>
                                    Laid Off
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setViewingEmployee(emp);
                                  setIsViewModalOpen(true);
                                }}
                                title="View employee details"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600 hover:bg-green-50"
                                onClick={() => handleAdjustSalary(emp.id)}
                                title="Adjust employee salary (increase, decrease, or customize)"
                              >
                                <TrendingUp className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-600 hover:bg-amber-50"
                                onClick={() => handleEditEmployee(emp)}
                                title="Edit employee"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:bg-red-50"
                                onClick={() => handleDeleteEmployee(emp.id)}
                                title="Delete employee"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
        </>
      ) : (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle>Employee Management</CardTitle>
            <CardDescription>
              Track employee information, generate automatic employee numbers, manage weekly payments, and handle IRS tax reporting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <svg
                className="w-16 h-16 text-slate-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M17 20h5v-2a3 3 0 00-5.856-1.487M15 10a3 3 0 11-6 0 3 3 0 016 0zM16 16a5 5 0 01-10 0"
                />
              </svg>
              <p className="text-slate-600 mb-2">No employees yet</p>
              <p className="text-sm text-slate-500">Create your first employee to get started</p>
              <Button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                Add Your First Employee
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isViewModalOpen && viewingEmployee && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingEmployee.name}</DialogTitle>
              <DialogDescription>{viewingEmployee.position}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded">
                  <p className="text-xs text-slate-600 font-medium">Employee ID</p>
                  <p className="text-sm font-semibold text-slate-900">{viewingEmployee.id}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <p className="text-xs text-slate-600 font-medium">Weekly Rate</p>
                  <p className="text-sm font-semibold text-slate-900">${viewingEmployee.weeklyRate.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <p className="text-xs text-slate-600 font-medium">Start Date</p>
                  <p className="text-sm font-semibold text-slate-900">{formatDateString(viewingEmployee.startDate)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded">
                  <p className="text-xs text-slate-600 font-medium">Payment Method</p>
                  <p className="text-sm font-semibold text-slate-900">{viewingEmployee.paymentMethod || "-"}</p>
                </div>
              </div>

              <div className="border-t pt-4 space-y-2">
                <h3 className="font-semibold text-slate-900">Contact Information</h3>
                {viewingEmployee.email && (
                  <p className="text-sm text-slate-700"><span className="font-medium">Email:</span> {viewingEmployee.email}</p>
                )}
                {viewingEmployee.telephone && (
                  <p className="text-sm text-slate-700"><span className="font-medium">Telephone:</span> {viewingEmployee.telephone}</p>
                )}
                {viewingEmployee.address && (
                  <p className="text-sm text-slate-700"><span className="font-medium">Address:</span> {viewingEmployee.address}</p>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-slate-900 mb-3">Absence Records</h3>
                {getEmployeeAbsences(viewingEmployee.id).length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getEmployeeAbsences(viewingEmployee.id).map((absence) => (
                      <div key={absence.id} className="p-3 bg-white rounded border border-yellow-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatDateString(absence.fromDate)} to {formatDateString(absence.toDate)}
                            </p>
                            <p className="text-xs text-slate-600">{absence.daysWorkedPerWeek} days working per week</p>
                            {absence.reason && (
                              <p className="text-xs text-yellow-700 mt-1">Reason: {absence.reason}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteAbsence(absence.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete absence record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">No absence records. Employee is working full week.</p>
                )}
              </div>

              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Weekly Payments</h3>
                  <Button
                    onClick={() => handleOpenPaymentModal(viewingEmployee.id)}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Payment
                  </Button>
                </div>
                {getEmployeePayments(viewingEmployee.id).length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {getEmployeePayments(viewingEmployee.id).map((payment) => (
                      <div key={payment.id} className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Week of {formatDateString(payment.weekStartDate)}</p>
                            <p className="text-xs text-slate-600">{payment.daysWorked}/5 days worked</p>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <p className="text-lg font-bold text-slate-900 whitespace-nowrap">${payment.finalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                              payment.status === "paid" ? "bg-green-100 text-green-800" :
                              payment.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {payment.status}
                            </span>
                          </div>
                        </div>

                        {payment.overrideAmount && (
                          <p className="text-xs text-blue-600">Override amount: ${payment.overrideAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                        )}

                        {payment.paymentMethod && (
                          <div className="bg-white p-2 rounded border border-slate-200 text-xs space-y-1">
                            <p className="text-slate-600">
                              <span className="font-semibold">Method:</span>{" "}
                              {payment.paymentMethod === "check" && "Check"}
                              {payment.paymentMethod === "direct_deposit" && "Direct Deposit"}
                              {payment.paymentMethod === "bank_transfer" && "Bank Transfer"}
                              {payment.paymentMethod === "wire_transfer" && "Wire Transfer"}
                              {payment.paymentMethod === "credit_card" && "Credit Card"}
                              {payment.paymentMethod === "cash" && "Cash"}
                            </p>
                            {payment.checkNumber && (
                              <p className="text-slate-600"><span className="font-semibold">Check #:</span> {payment.checkNumber}</p>
                            )}
                            {payment.bankName && (
                              <p className="text-slate-600"><span className="font-semibold">Bank:</span> {payment.bankName}</p>
                            )}
                            {payment.routingNumber && (
                              <p className="text-slate-600"><span className="font-semibold">Routing:</span> {payment.routingNumber}</p>
                            )}
                            {payment.accountNumber && (
                              <p className="text-slate-600"><span className="font-semibold">Account:</span> {'•'.repeat(Math.max(0, (payment.accountNumber?.length || 0) - 4))} {payment.accountNumber?.slice(-4)}</p>
                            )}
                            {payment.creditCardLast4 && (
                              <p className="text-slate-600"><span className="font-semibold">Card:</span> ****{payment.creditCardLast4}</p>
                            )}
                            {payment.transactionReference && (
                              <p className="text-slate-600"><span className="font-semibold">Reference:</span> {payment.transactionReference}</p>
                            )}
                            {payment.receiptAttachment && (
                              <p className="text-blue-600">📎 {payment.receiptAttachment}</p>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 justify-end">
                          <Button
                            onClick={() => handleOpenPaymentModal(viewingEmployee.id, payment)}
                            variant="ghost"
                            className="h-8 px-2 text-xs"
                          >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            onClick={() => setWeeklyPayments(weeklyPayments.filter((p) => p.id !== payment.id))}
                            variant="ghost"
                            className="h-8 px-2 text-xs text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600">No payment records yet. Add the first payment entry.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsViewModalOpen(false)}
                className="border-slate-300"
              >
                Close
              </Button>
              <Button
                onClick={() => downloadAnnualEarningsReport(viewingEmployee)}
                className="gap-2 bg-slate-700 hover:bg-slate-800"
                title={`Download ${viewingEmployee.name}'s earnings report for ${selectedYear - 1}`}
              >
                <Download className="w-4 h-4" />
                Last Year Report
              </Button>
              <Button
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEditEmployee(viewingEmployee);
                }}
                className="bg-amber-600 hover:bg-amber-700 gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Employee
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isAbsenceModalOpen && absenceEmployeeId && (
        <Dialog open={isAbsenceModalOpen} onOpenChange={setIsAbsenceModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Absence Records</DialogTitle>
              <DialogDescription>
                Add and track absence periods for this employee
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Absence Records</h3>
                {getEmployeeAbsences(absenceEmployeeId).length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getEmployeeAbsences(absenceEmployeeId).map((absence) => {
                      const absenceWeekCount = getWeekCount();
                      const dailyRate = Math.round((employees.find(e => e.id === absenceEmployeeId)?.weeklyRate || 0) / 5);
                      const absenceDays = Math.ceil((new Date(absence.toDate).getTime() - new Date(absence.fromDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
                      const absenceWeeks = Math.ceil(absenceDays / 7);
                      const amountForAbsence = dailyRate * absence.daysWorkedPerWeek * absenceWeeks;

                      return (
                        <div key={absence.id} className="p-3 bg-slate-50 rounded border border-slate-200 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-slate-900">
                                {formatDateString(absence.fromDate)} to {formatDateString(absence.toDate)}
                              </p>
                              <p className="text-xs text-slate-600 mt-1">{absence.daysWorkedPerWeek}/5 days working per week</p>
                              {absence.reason && (
                                <p className="text-xs text-slate-700 mt-1 bg-blue-50 p-1 rounded">📝 {absence.reason}</p>
                              )}
                            </div>
                            <div className="text-right space-y-2">
                              <p className="text-sm font-bold text-green-700">${amountForAbsence.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                              <button
                                onClick={() => handleDeleteAbsence(absence.id)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                                title="Delete absence record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 bg-slate-100 p-3 rounded">No absence records yet</p>
                )}
              </div>

              <div className="border-t pt-4">
                {!isAddingNewAbsence ? (
                  <Button
                    onClick={handleStartAddingAbsence}
                    className="w-full gap-2 bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Absence Period
                  </Button>
                ) : (
                  <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h4 className="font-semibold text-slate-900">New Absence Period</h4>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="absenceFromDate">From Date *</Label>
                        <Input
                          id="absenceFromDate"
                          type="date"
                          value={absenceFromDate}
                          onChange={(e) => handleAbsenceDateChange(e.target.value, absenceToDate)}
                          className="border-slate-300"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="absenceToDate">To Date *</Label>
                        <Input
                          id="absenceToDate"
                          type="date"
                          value={absenceToDate}
                          onChange={(e) => handleAbsenceDateChange(absenceFromDate, e.target.value)}
                          className="border-slate-300"
                        />
                      </div>
                    </div>

                    {absenceFromDate && absenceToDate && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                        📅 <strong>{calculateWeekdaysInRange(absenceFromDate, absenceToDate)} weekdays</strong> in this period
                      </div>
                    )}

                    {absenceFromDate && absenceToDate ? (
                      <div className="space-y-3 p-3 bg-green-50 border border-green-200 rounded">
                        <div className="flex items-center justify-between">
                          <Label className="text-green-900">Days Working Per Week</Label>
                          <span className="text-2xl font-bold text-green-700">{absenceDaysWorked}</span>
                        </div>
                        <p className="text-xs text-green-700">
                          ✓ Auto-calculated from {calculateWeekdaysInRange(absenceFromDate, absenceToDate)} weekdays in date range
                        </p>
                        <div className="grid grid-cols-6 gap-2 text-xs">
                          {[0, 1, 2, 3, 4, 5].map((days) => (
                            <button
                              key={days}
                              onClick={() => setAbsenceDaysWorked(days)}
                              className={`p-2 rounded font-semibold transition-colors ${
                                absenceDaysWorked === days
                                  ? "bg-green-600 text-white"
                                  : "bg-white text-slate-700 border border-green-300 hover:bg-green-100"
                              }`}
                            >
                              {days}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-100 border border-slate-300 rounded text-sm text-slate-600">
                        💡 Enter dates above to auto-calculate working days
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="absenceReason">Reason (optional)</Label>
                      <Input
                        id="absenceReason"
                        placeholder="e.g., Sick leave, Personal, Training"
                        value={absenceReason}
                        onChange={(e) => setAbsenceReason(e.target.value)}
                        className="border-slate-300"
                      />
                    </div>

                    {absenceFromDate && absenceToDate && (
                      <div className="p-3 bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300 rounded-lg space-y-2">
                        <p className="text-xs font-semibold text-green-900">Preview Amount for this Period</p>
                        <p className="text-2xl font-bold text-green-900">
                          ${calculateAbsenceAmount().toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-green-800">
                          (${Math.round((employees.find(e => e.id === absenceEmployeeId)?.weeklyRate || 0) / 5)}/day × {absenceDaysWorked} working days/week)
                        </p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={handleCancelAddAbsence}
                        variant="outline"
                        className="flex-1 border-slate-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddAbsencePeriod}
                        className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                      >
                        Add Period
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAbsenceModalOpen(false);
                  setAbsenceEmployeeId(null);
                  setIsAddingNewAbsence(false);
                  resetAbsenceForm();
                }}
                className="border-slate-300"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isSeveranceModalOpen && severanceEmployeeId && (() => {
        const employee = employees.find(e => e.id === severanceEmployeeId);
        if (!employee) return null;

        const latestPayment = getLatestPendingPaymentForEmployee(severanceEmployeeId);
        const quickAmount = latestPayment ? latestPayment.finalAmount : employee.weeklyRate;
        const displayAmount = severanceMode === "quick" ? quickAmount : employee.weeklyRate;

        return (
          <Dialog open={isSeveranceModalOpen} onOpenChange={setIsSeveranceModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Severance Payment</DialogTitle>
                <DialogDescription>
                  Create a final severance payment for {employee.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Employee:</span> {employee.name}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Position:</span> {employee.position}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Weekly Salary:</span> ${(employee.weeklyRate || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Choose Payment Type</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSeveranceMode("quick")}
                      className={`flex-1 px-3 py-2 rounded border-2 text-sm font-medium transition-colors ${
                        severanceMode === "quick"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      ⚡ Quick
                      {latestPayment && <div className="text-xs mt-1">${quickAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
                    </button>
                    <button
                      onClick={() => setSeveranceMode("custom")}
                      className={`flex-1 px-3 py-2 rounded border-2 text-sm font-medium transition-colors ${
                        severanceMode === "custom"
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      ⚙️ Custom
                      <div className="text-xs mt-1">${employee.weeklyRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {severanceMode === "quick"
                      ? latestPayment
                        ? "Uses the latest pending payment amount"
                        : "No pending payments found, using weekly salary"
                      : "Enter custom amount and reason"}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="severanceDate">Severance Date *</Label>
                  <Input
                    id="severanceDate"
                    type="date"
                    value={severanceDate}
                    onChange={(e) => setSeveranceDate(e.target.value)}
                    className="border-slate-300"
                  />
                </div>

                {severanceMode === "custom" && (
                  <div className="space-y-2">
                    <Label htmlFor="severanceReason">Reason for Severance *</Label>
                    <textarea
                      id="severanceReason"
                      value={severanceReason}
                      onChange={(e) => setSeveranceReason(e.target.value)}
                      placeholder="e.g., Layoff, Resignation, Contract end, etc."
                      className="w-full p-2 border border-slate-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <p className="text-xs text-slate-500">This will be stored with the payment for reference</p>
                  </div>
                )}

                <div className={`p-3 rounded border-2 ${severanceMode === "quick" ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}>
                  <p className={`text-sm font-medium ${severanceMode === "quick" ? "text-green-900" : "text-blue-900"}`}>
                    Severance Payment Amount
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${severanceMode === "quick" ? "text-green-700" : "text-blue-700"}`}>
                    ${displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className={`text-xs mt-1 ${severanceMode === "quick" ? "text-green-800" : "text-blue-800"}`}>
                    {severanceMode === "quick" ? "Based on latest pending payment" : "One week final payment"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSeveranceModalOpen(false);
                    setSeveranceEmployeeId(null);
                    setSeveranceReason("");
                    setSeveranceDate("");
                    setSeveranceMode("quick");
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmSeverance}
                  className={severanceMode === "quick" ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}
                >
                  Create Severance Payment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {isGeneratePaymentsModalOpen && (
        <Dialog open={isGeneratePaymentsModalOpen} onOpenChange={setIsGeneratePaymentsModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Generate Weekly Payments</DialogTitle>
              <DialogDescription>
                Create payment records for all eligible employees
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <p className="text-sm text-slate-700 mb-3">
                  This will generate weekly payments for:
                </p>
                <ul className="text-sm space-y-1 text-slate-600">
                  <li>✓ All active employees</li>
                  <li>✓ Who have reached their payment start date</li>
                  <li>✓ Without existing payments for this week</li>
                </ul>
              </div>
              <p className="text-sm text-slate-600">
                Are you sure you want to proceed?
              </p>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsGeneratePaymentsModalOpen(false)}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleGeneratePayments}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Generate Payments
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isPaymentModalOpen && viewingEmployee && (
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPayment ? "Edit Payment" : "Add Payment"}</DialogTitle>
              <DialogDescription>
                {editingPayment ? "Update the payment record" : "Add a new weekly payment"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Employee:</span> {viewingEmployee.name}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium">Weekly Rate:</span> ${viewingEmployee.weeklyRate.toLocaleString()}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="weekStart">Week Start Date *</Label>
                <Input
                  id="weekStart"
                  type="date"
                  value={paymentFormData.weekStartDate}
                  onChange={(e) => handlePaymentFormChange("weekStartDate", e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daysWorked">Days Worked (0-5) *</Label>
                <Input
                  id="daysWorked"
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  value={paymentFormData.daysWorked}
                  onChange={(e) => handlePaymentFormChange("daysWorked", parseFloat(e.target.value))}
                  className="border-slate-300"
                />
                <p className="text-xs text-slate-500">
                  Calculated amount: ${calculatePaymentAmount(viewingEmployee.weeklyRate, paymentFormData.daysWorked).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overrideAmount">Override Amount (optional)</Label>
                <Input
                  id="overrideAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Leave blank to use calculated amount"
                  value={paymentFormData.overrideAmount}
                  onChange={(e) => handlePaymentFormChange("overrideAmount", e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <Select value={paymentFormData.paymentMethod} onValueChange={(value) => handlePaymentFormChange("paymentMethod", value)}>
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentFormData.paymentMethod === "check" && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="checkNumber" className="text-sm">Check Number</Label>
                    <Input
                      id="checkNumber"
                      placeholder="e.g., 1001"
                      value={paymentFormData.checkNumber}
                      onChange={(e) => handlePaymentFormChange("checkNumber", e.target.value)}
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="checkBankName" className="text-sm">Bank Name</Label>
                    <Input
                      id="checkBankName"
                      placeholder="e.g., Wells Fargo"
                      value={paymentFormData.bankName}
                      onChange={(e) => handlePaymentFormChange("bankName", e.target.value)}
                      className="border-slate-300"
                    />
                  </div>
                </div>
              )}

              {(paymentFormData.paymentMethod === "direct_deposit" || paymentFormData.paymentMethod === "bank_transfer" || paymentFormData.paymentMethod === "wire_transfer") && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="bankName2" className="text-sm">Bank Name</Label>
                    <Input
                      id="bankName2"
                      placeholder="e.g., Wells Fargo"
                      value={paymentFormData.bankName}
                      onChange={(e) => handlePaymentFormChange("bankName", e.target.value)}
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="routingNumber" className="text-sm">Routing Number</Label>
                    <Input
                      id="routingNumber"
                      placeholder="9-digit routing number"
                      value={paymentFormData.routingNumber}
                      onChange={(e) => handlePaymentFormChange("routingNumber", e.target.value)}
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="accountNumber" className="text-sm">Account Number</Label>
                    <Input
                      id="accountNumber"
                      type="password"
                      placeholder="Account number (masked)"
                      value={paymentFormData.accountNumber}
                      onChange={(e) => handlePaymentFormChange("accountNumber", e.target.value)}
                      className="border-slate-300"
                    />
                  </div>
                </div>
              )}

              {paymentFormData.paymentMethod === "credit_card" && (
                <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="creditCardLast4" className="text-sm">Last 4 Digits</Label>
                    <Input
                      id="creditCardLast4"
                      placeholder="e.g., 4242"
                      value={paymentFormData.creditCardLast4}
                      onChange={(e) => handlePaymentFormChange("creditCardLast4", e.target.value)}
                      className="border-slate-300"
                      maxLength={4}
                    />
                  </div>
                </div>
              )}

              {paymentFormData.paymentMethod !== "cash" && (
                <div className="space-y-1">
                  <Label htmlFor="transactionRef" className="text-sm">Transaction Reference (optional)</Label>
                  <Input
                    id="transactionRef"
                    placeholder="e.g., TXN-001, Confirmation Code"
                    value={paymentFormData.transactionReference}
                    onChange={(e) => handlePaymentFormChange("transactionReference", e.target.value)}
                    className="border-slate-300"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsPaymentModalOpen(false);
                  setEditingPayment(null);
                }}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSavePayment(viewingEmployee.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                {editingPayment ? "Update Payment" : "Add Payment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isPromoteModalOpen && promoteEmployeeId && (() => {
        const employee = employees.find(e => e.id === promoteEmployeeId);
        if (!employee) return null;

        return (
          <Dialog open={isPromoteModalOpen} onOpenChange={setIsPromoteModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Adjust Employee Salary</DialogTitle>
                <DialogDescription>
                  {employee.name} - Modify salary and set effective date
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <p className="text-xs text-slate-600 font-medium">Current Weekly Rate</p>
                  <p className="text-lg font-semibold text-slate-900">${(employee.weeklyRate || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newSalary" className="text-sm font-medium">New Weekly Salary *</Label>
                  <Input
                    id="newSalary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={promoteNewSalary}
                    onChange={(e) => setPromoteNewSalary(e.target.value)}
                    className="border-slate-300"
                    placeholder="Enter new weekly salary"
                  />
                  {promoteNewSalary && parseFloat(promoteNewSalary) > (employee.weeklyRate || 0) && (
                    <p className="text-xs text-green-700 font-medium">
                      ✓ Increase: +${(parseFloat(promoteNewSalary) - (employee.weeklyRate || 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })} per week
                    </p>
                  )}
                  {promoteNewSalary && parseFloat(promoteNewSalary) < (employee.weeklyRate || 0) && (
                    <p className="text-xs text-red-700 font-medium">
                      ⓘ Decrease: -${((employee.weeklyRate || 0) - parseFloat(promoteNewSalary)).toLocaleString(undefined, { maximumFractionDigits: 2 })} per week
                    </p>
                  )}
                  {promoteNewSalary && parseFloat(promoteNewSalary) === (employee.weeklyRate || 0) && (
                    <p className="text-xs text-slate-500 font-medium">
                      ◆ No change in salary
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason" className="text-sm font-medium">Reason for Change *</Label>
                  <Select value={promoteReason} onValueChange={setPromoteReason}>
                    <SelectTrigger className="border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="promotion">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">↑</span> Promotion
                        </div>
                      </SelectItem>
                      <SelectItem value="demotion">
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">↓</span> Demotion
                        </div>
                      </SelectItem>
                      <SelectItem value="correction">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600">◇</span> Salary Correction
                        </div>
                      </SelectItem>
                      <SelectItem value="market">
                        <div className="flex items-center gap-2">
                          <span className="text-purple-600">⇄</span> Market Adjustment
                        </div>
                      </SelectItem>
                      <SelectItem value="other">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-600">◆</span> Other
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-600">This will be recorded in the salary history</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effectiveDate" className="text-sm font-medium">Effective Date *</Label>
                  <Input
                    id="effectiveDate"
                    type="date"
                    value={promoteEffectiveDate}
                    onChange={(e) => setPromoteEffectiveDate(e.target.value)}
                    className="border-slate-300"
                  />
                  <p className="text-xs text-slate-600">Payments from this date onwards will use the new salary</p>
                </div>

                <div className="border-t pt-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Apply Change to Previous Year Report?</Label>
                    <div className="space-y-2">
                      <button
                        onClick={() => setPromoteRetroactive(false)}
                        className={`w-full p-3 rounded border-2 text-sm text-left transition-colors ${
                          !promoteRetroactive
                            ? "border-blue-500 bg-blue-50"
                            : "border-slate-300 bg-white hover:border-slate-400"
                        }`}
                      >
                        <p className="font-medium text-slate-900">Going Forward Only</p>
                        <p className="text-xs text-slate-600 mt-1">Salary change starts from the effective date</p>
                      </button>
                      <button
                        onClick={() => setPromoteRetroactive(true)}
                        className={`w-full p-3 rounded border-2 text-sm text-left transition-colors ${
                          promoteRetroactive
                            ? "border-green-500 bg-green-50"
                            : "border-slate-300 bg-white hover:border-slate-400"
                        }`}
                      >
                        <p className="font-medium text-slate-900">Include Previous Year</p>
                        <p className="text-xs text-slate-600 mt-1">Adjust all {new Date().getFullYear() - 1} earnings with new salary rate</p>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsPromoteModalOpen(false);
                    setPromoteEmployeeId(null);
                    setPromoteNewSalary("");
                    setPromoteEffectiveDate("");
                    setPromoteRetroactive(false);
                    setPromoteReason("promotion");
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmPromote}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Apply Salary Change
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
