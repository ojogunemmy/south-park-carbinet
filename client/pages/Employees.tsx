import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, ChevronLeft, Edit2, Trash2, Eye, ChevronDown, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { getYearData, saveYearData, shouldUseExampleData, formatDateString, generateWednesdayPayments, generateAllPaymentsForYear, getTodayDate, getWeekStartDate, formatDateToString } from "@/utils/yearStorage";
import { useAutoSave } from "@/hooks/useAutoSave";
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
  daysWorkedPerWeek: number; // 0-5 days per week
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
  paymentStartDate?: string; // Date when employee first receives payment (can be different from startDate)
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
  defaultDaysWorkedPerWeek?: number; // Default days worked per week (1-5, default: 5)
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
    defaultDaysWorkedPerWeek: 5,
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
    defaultDaysWorkedPerWeek: 5,
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
    defaultDaysWorkedPerWeek: 5,
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
    defaultDaysWorkedPerWeek: 5,
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
    defaultDaysWorkedPerWeek: 5,
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
    defaultDaysWorkedPerWeek: 5,
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
    defaultDaysWorkedPerWeek: 5,
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
    defaultDaysWorkedPerWeek: 5,
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
    defaultDaysWorkedPerWeek: 5,
  },
];

interface EmployeeFormData {
  name: string;
  position: string;
  telephone: string;
  email: string;
  startDate: string;
  paymentStartDate: string; // Separate payment start date
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

export default function Employees() {
  const { selectedYear } = useYear();

  // Load employees from localStorage or use defaults
  const getInitialEmployees = () => {
    const saved = getYearData<Employee[]>("employees", selectedYear, null);
    if (saved) {
      try {
        // Deduplicate by ID to prevent duplicate key warnings
        const seenIds = new Set<string>();
        return saved.filter((emp: Employee) => {
          if (seenIds.has(emp.id)) {
            return false;
          }
          seenIds.add(emp.id);
          return true;
        });
      } catch {
        return exampleEmployees;
      }
    }

    // No saved data, use example employees
    if (exampleEmployees && exampleEmployees.length > 0) {
      saveYearData("employees", selectedYear, exampleEmployees);
      return exampleEmployees;
    }

    return [];
  };

  const [employees, setEmployees] = useState<Employee[]>(getInitialEmployees());
  const [weeklyPayments, setWeeklyPayments] = useState<WeeklyPayment[]>(() => {
    // For 2026, regenerate payments with correct Sunday 1/4 start date but KEEP existing employees
    if (selectedYear === 2026) {
      // Clear ONLY payment cache keys to force regeneration, do NOT clear employees
      localStorage.removeItem(`weeklyPayments_2026`);
      localStorage.removeItem("payments_2026");

      const currentEmployees = getInitialEmployees();
      if (currentEmployees && currentEmployees.length > 0) {
        const generated = generateAllPaymentsForYear(currentEmployees, [], selectedYear);
        saveYearData("weeklyPayments", selectedYear, generated);
        return generated;
      }
    }

    const saved = getYearData<WeeklyPayment[]>("weeklyPayments", selectedYear, []);

    let payments = saved;

    // If no payments exist for this year, generate them
    if (!payments || payments.length === 0) {
      const currentEmployees = getInitialEmployees();
      if (currentEmployees && currentEmployees.length > 0) {
        const generated = generateAllPaymentsForYear(currentEmployees, [], selectedYear);
        payments = generated;
      }
    }

    // Deduplicate payments by ID on load
    const seenIds = new Set<string>();
    return payments.filter((payment: WeeklyPayment) => {
      if (seenIds.has(payment.id)) {
        return false;
      }
      seenIds.add(payment.id);
      return true;
    });
  });
  const [absences, setAbsences] = useState<EmployeeAbsence[]>(() => {
    return getYearData<EmployeeAbsence[]>("employeeAbsences", selectedYear, []);
  });
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
  const [automaticPaymentsEnabled, setAutomaticPaymentsEnabled] = useState(() => {
    return getYearData<boolean>("automaticPaymentsEnabled", selectedYear, true);
  });
  const [isBulkDaysOpen, setIsBulkDaysOpen] = useState(false);
  const [bulkDaysValue, setBulkDaysValue] = useState<string>("5");

  // Reload data when year changes
  useEffect(() => {
    setEmployees(getInitialEmployees());

    // For 2026, try to copy payments from 2025 if empty
    let payments = getYearData<WeeklyPayment[]>("weeklyPayments", selectedYear, []);
    if (selectedYear === 2026 && (!payments || payments.length === 0)) {
      const payments2025 = getYearData<WeeklyPayment[]>("weeklyPayments", 2025, []);
      if (payments2025 && payments2025.length > 0) {
        payments = payments2025;
        saveYearData("weeklyPayments", 2026, payments2025);
      }
    }
    setWeeklyPayments(payments);

    setAbsences(getYearData<EmployeeAbsence[]>("employeeAbsences", selectedYear, []));
  }, [selectedYear]);

  // Auto-save employees whenever they change
  useAutoSave({
    data: employees,
    key: "employees",
    year: selectedYear,
    debounceMs: 500,
  });

  // Auto-save weekly payments whenever they change
  useAutoSave({
    data: weeklyPayments,
    key: "weeklyPayments",
    year: selectedYear,
    debounceMs: 500,
  });

  // Auto-save absences whenever they change
  useAutoSave({
    data: absences,
    key: "employeeAbsences",
    year: selectedYear,
    debounceMs: 500,
  });

  // Auto-repair ID gaps on component mount
  useEffect(() => {
    if (employees.length === 0) return;

    // Check for ID gaps
    const empIds = employees
      .map(emp => {
        const match = emp.id.match(/EMP-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .sort((a, b) => a - b)
      .filter(id => id > 0);

    // Check if there are gaps in the sequence
    let hasGaps = false;
    for (let i = 0; i < empIds.length; i++) {
      if (empIds[i] !== i + 1) {
        hasGaps = true;
        break;
      }
    }

    // Auto-repair if gaps detected
    if (hasGaps) {
      console.warn(`⚠️ ID gaps detected. Auto-repairing...`);
      const sorted = [...employees].sort((a, b) => {
        const aMatch = a.id.match(/EMP-(\d+)/);
        const bMatch = b.id.match(/EMP-(\d+)/);
        if (aMatch && bMatch) {
          return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
        }
        return 0;
      });

      const repaired = sorted.map((emp, index) => ({
        ...emp,
        id: `EMP-${String(index + 1).padStart(3, "0")}`,
      }));

      setEmployees(repaired);
      saveYearData("employees", selectedYear, repaired);
      console.log(`✓ Auto-repaired ID gaps. Renumbered ${repaired.length} employees.`);
    }
  }, [employees.length]); // Run when employee count changes

  // Automatically remove duplicate employees from state (run synchronously on every render)
  useEffect(() => {
    const seenIds = new Set<string>();
    const uniqueEmployees: Employee[] = [];
    const duplicateIds: string[] = [];

    for (const emp of employees) {
      if (emp && emp.id && !seenIds.has(emp.id)) {
        seenIds.add(emp.id);
        uniqueEmployees.push(emp);
      } else if (emp && emp.id) {
        if (!duplicateIds.includes(emp.id)) {
          duplicateIds.push(emp.id);
        }
      }
    }

    // Always check and update if there are any duplicates
    if (uniqueEmployees.length !== employees.length) {
      if (duplicateIds.length > 0) {
        console.error(`⚠️ DUPLICATE EMPLOYEES DETECTED: ${duplicateIds.join(", ")}`);
        console.error(`Total: ${employees.length}, Unique: ${uniqueEmployees.length}`);
      }
      setEmployees(uniqueEmployees);
    }
  }, [employees]);

  // Automatically remove duplicate payments from state
  useEffect(() => {
    const seenIds = new Set<string>();
    let hasDuplicates = false;
    const uniquePayments = weeklyPayments.filter((payment: WeeklyPayment) => {
      if (seenIds.has(payment.id)) {
        hasDuplicates = true;
        return false;
      }
      seenIds.add(payment.id);
      return true;
    });

    if (hasDuplicates) {
      setWeeklyPayments(uniquePayments);
    }
  }, [weeklyPayments]);

  // Save employees to localStorage whenever they change (with deduplication)
  useEffect(() => {
    // Deduplicate employees by ID before saving
    const seenIds = new Set<string>();
    const deduplicatedEmployees = employees.filter((emp: Employee) => {
      if (seenIds.has(emp.id)) {
        return false;
      }
      seenIds.add(emp.id);
      return true;
    });
    saveYearData("employees", selectedYear, deduplicatedEmployees);

    // Dispatch custom event to notify Payments page (same tab)
    window.dispatchEvent(new CustomEvent("employeesUpdated", { detail: { employees: deduplicatedEmployees } }));
  }, [employees, selectedYear]);

  // Save weekly payments to localStorage whenever they change (with deduplication)
  useEffect(() => {
    // Deduplicate payments by ID before saving
    const seenPaymentIds = new Set<string>();
    const deduplicatedPayments = weeklyPayments.filter((payment: WeeklyPayment) => {
      if (seenPaymentIds.has(payment.id)) {
        return false;
      }
      seenPaymentIds.add(payment.id);
      return true;
    });
    saveYearData("weeklyPayments", selectedYear, deduplicatedPayments);
  }, [weeklyPayments, selectedYear]);

  // Save absences to localStorage whenever they change
  useEffect(() => {
    saveYearData("employeeAbsences", selectedYear, absences);
  }, [absences, selectedYear]);

  // Save automatic payments setting
  useEffect(() => {
    saveYearData("automaticPaymentsEnabled", selectedYear, automaticPaymentsEnabled);
  }, [automaticPaymentsEnabled, selectedYear]);

  // Automatically add a demo employee on first load (when no employees exist)
  useEffect(() => {
    if (employees.length === 0 && selectedYear === 2026) {
      const demoEmployee: Employee = {
        id: "EMP-001",
        name: "Fusion Assistant",
        position: "Demo Employee",
        weeklyRate: 1000,
        startDate: "",
        paymentStartDate: "",
        address: "123 Demo Street",
        telephone: "(555) 123-4567",
        email: "demo@example.com",
        paymentMethod: "direct_deposit",
        bankName: "Demo Bank",
        routingNumber: "123456789",
        accountNumber: "9876543210",
        accountType: "checking",
        paymentDay: "wednesday",
        paymentStatus: "active",
      };

      setEmployees([demoEmployee]);
      console.log("✅ Demo employee added automatically");
    }
  }, [employees.length, selectedYear]);

  // Automatically generate weekly payments for the year (if enabled)
  // This runs when employees are added/changed, year changes, or auto-payment toggle changes
  useEffect(() => {
    if (employees.length > 0 && automaticPaymentsEnabled) {
      const newPayments = selectedYear === 2026
        ? generateAllPaymentsForYear(employees, weeklyPayments, selectedYear)
        : generateWednesdayPayments(employees, weeklyPayments, selectedYear);
      if (newPayments.length > 0) {
        setWeeklyPayments([...weeklyPayments, ...newPayments]);
      }
    }
  }, [employees.length, selectedYear, automaticPaymentsEnabled]); // Run when employees added, year changes, or toggle clicked

  // Load fresh data from localStorage when component mounts and when page becomes visible
  useEffect(() => {
    const loadFreshData = () => {
      console.log("Loading fresh employee data from localStorage for year:", selectedYear);
      const updatedEmployees = getInitialEmployees();
      console.log("Loaded employees count:", updatedEmployees.length);
      setEmployees(updatedEmployees);
    };

    // Load on mount
    loadFreshData();

    // Listen for page visibility changes to reload data when user returns to this tab
    window.addEventListener("pageshow", loadFreshData);
    window.addEventListener("focus", loadFreshData);

    return () => {
      window.removeEventListener("pageshow", loadFreshData);
      window.removeEventListener("focus", loadFreshData);
    };
  }, [selectedYear]);

  // Automatically detect and repair ID gaps on component load or when employees change
  useEffect(() => {
    if (employees.length > 0) {
      const sortedEmpIds = employees
        .map(emp => {
          const match = emp.id.match(/EMP-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .sort((a, b) => a - b)
        .filter(id => id > 0);

      // Check if there are gaps in the sequence
      let hasGaps = false;
      for (let i = 0; i < sortedEmpIds.length; i++) {
        if (sortedEmpIds[i] !== i + 1) {
          hasGaps = true;
          break;
        }
      }

      // Auto-repair if gaps detected
      if (hasGaps) {
        console.log(`🔧 Auto-repairing ${employees.length} employees - detected ID gap...`);

        // Sort by current ID and renumber sequentially
        const sorted = [...employees].sort((a, b) => {
          const aMatch = a.id.match(/EMP-(\d+)/);
          const bMatch = b.id.match(/EMP-(\d+)/);
          if (aMatch && bMatch) {
            return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
          }
          return 0;
        });

        const repaired = sorted.map((emp, index) => ({
          ...emp,
          id: `EMP-${String(index + 1).padStart(3, "0")}`,
        }));

        setEmployees(repaired);
        console.log(`✓ Auto-repaired! Renumbered all ${repaired.length} employees to sequential IDs (EMP-001 → EMP-${String(repaired.length).padStart(3, "0")})`);
      }
    }
  }, [selectedYear]); // Run only when year changes to avoid infinite loops

  // Parse date string in local timezone (not UTC)
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
          // Include the end date (don't add 1 day)
          if (empDate > toDate) dateMatch = false;
        }
      }

      return statusMatch && dateMatch;
    })
    .sort((a, b) => {
      // Sort by Employee ID in ascending order (EMP-001, EMP-002, EMP-003, etc.)
      const aIdMatch = a.id.match(/EMP-(\d+)/);
      const bIdMatch = b.id.match(/EMP-(\d+)/);

      if (aIdMatch && bIdMatch) {
        const aNum = parseInt(aIdMatch[1], 10);
        const bNum = parseInt(bIdMatch[1], 10);
        return aNum - bNum; // Ascending order
      }

      // Fallback to string comparison if format is unexpected
      return a.id.localeCompare(b.id);
    })
    // Final deduplication before rendering to catch any remaining duplicates
    .filter((emp, index, self) => {
      const firstIndex = self.findIndex(e => e.id === emp.id);
      if (firstIndex !== index) {
        console.warn(`Removing duplicate employee in filtered list: ${emp.id}`);
        return false;
      }
      return true;
    });

  const totalWeeklyPayments = filteredEmployees.reduce((sum, emp) => sum + emp.weeklyRate, 0);
  // Calculate pending payments for THIS WEEK only (only for existing employees)
  const pendingPaymentsData = (() => {
    const employeeIds = new Set(employees.map(e => e.id));
    const allPendingPayments = weeklyPayments.filter((payment) => payment.status === "pending" && employeeIds.has(payment.employeeId));
    if (allPendingPayments.length === 0) return { count: 0, total: 0 };

    // Get only this week's pending payments
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

  const handleSavePayment = (employeeId: string) => {
    if (!paymentFormData.weekStartDate) {
      alert("Please select a week start date");
      return;
    }

    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return;

    const calculatedAmount = calculatePaymentAmount(employee.weeklyRate, paymentFormData.daysWorked);
    const overrideAmount = paymentFormData.overrideAmount ? parseFloat(paymentFormData.overrideAmount) : undefined;
    const finalAmount = overrideAmount || calculatedAmount;

    if (editingPayment) {
      setWeeklyPayments(
        weeklyPayments.map((p) =>
          p.id === editingPayment.id
            ? {
                ...p,
                weekStartDate: paymentFormData.weekStartDate,
                daysWorked: paymentFormData.daysWorked,
                calculatedAmount,
                overrideAmount,
                finalAmount,
                paymentMethod: paymentFormData.paymentMethod as any,
                checkNumber: paymentFormData.checkNumber,
                bankName: paymentFormData.bankName,
                routingNumber: paymentFormData.routingNumber,
                accountNumber: paymentFormData.accountNumber,
                accountType: paymentFormData.accountType,
                creditCardLast4: paymentFormData.creditCardLast4,
                transactionReference: paymentFormData.transactionReference,
                receiptAttachment: paymentFormData.receiptAttachment,
              }
            : p
        )
      );
    } else {
      const newPayment: WeeklyPayment = {
        id: `PAY-${Date.now()}`,
        employeeId,
        weekStartDate: paymentFormData.weekStartDate,
        daysWorked: paymentFormData.daysWorked,
        weeklyRate: employee.weeklyRate,
        calculatedAmount,
        overrideAmount,
        finalAmount,
        status: "pending",
        paymentMethod: paymentFormData.paymentMethod as any,
        checkNumber: paymentFormData.checkNumber,
        bankName: paymentFormData.bankName,
        routingNumber: paymentFormData.routingNumber,
        accountNumber: paymentFormData.accountNumber,
        accountType: paymentFormData.accountType,
        creditCardLast4: paymentFormData.creditCardLast4,
        transactionReference: paymentFormData.transactionReference,
        receiptAttachment: paymentFormData.receiptAttachment,
      };
      setWeeklyPayments([...weeklyPayments, newPayment]);
    }

    setIsPaymentModalOpen(false);
    setEditingPayment(null);
  };

  const handleGeneratePayments = () => {
    const newPayments = generateWednesdayPayments(employees, weeklyPayments, selectedYear);
    if (newPayments.length > 0) {
      setWeeklyPayments([...weeklyPayments, ...newPayments]);
      alert(`✓ Successfully generated ${newPayments.length} payment${newPayments.length !== 1 ? 's' : ''} for this week`);
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

  const handleAddAbsencePeriod = () => {
    if (!absenceEmployeeId || !absenceFromDate || !absenceToDate) {
      alert("Please select from and to dates");
      return;
    }

    if (new Date(absenceFromDate) > new Date(absenceToDate)) {
      alert("From date cannot be after To date");
      return;
    }

    const absenceId = `ABS-${absenceEmployeeId}-${Date.now()}`;
    // Add absence record
    setAbsences([
      ...absences,
      {
        id: absenceId,
        employeeId: absenceEmployeeId,
        fromDate: absenceFromDate,
        toDate: absenceToDate,
        daysWorkedPerWeek: absenceDaysWorked,
        reason: absenceReason,
      },
    ]);

    resetAbsenceForm();
    setIsAddingNewAbsence(false);
  };

  const handleDeleteAbsence = (absenceId: string) => {
    setAbsences(absences.filter((a) => a.id !== absenceId));
  };

  const calculateAbsenceAmount = () => {
    if (!absenceFromDate || !absenceToDate || !absenceEmployeeId) return 0;

    const fromDate = parseLocalDate(absenceFromDate);
    const toDate = parseLocalDate(absenceToDate);

    // Calculate number of days
    const daysDiff = Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Calculate number of weeks (rough estimate: divide by 7)
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
      // 0 = Sunday, 6 = Saturday
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

    // Auto-calculate days working based on weekdays in the range
    if (fromDate && toDate) {
      const weekdayCount = calculateWeekdaysInRange(fromDate, toDate);
      // Convert weekdays to "days per week" (cap at 5)
      // E.g., 5 weekdays = 5/5 = 1 week of work, 3 weekdays = 3/5 days
      const daysPerWeek = Math.min(weekdayCount, 5); // Cap at 5 days per week
      setAbsenceDaysWorked(daysPerWeek);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          formData.name && formData.name.trim() &&
          formData.position && formData.position.trim()
          // Start date, telephone and address are optional for flexibility with bulk imports
        );
      case 2:
        // Tax ID is optional - can be filled in later
        return true;
      case 3:
        // All payment details are optional - can be filled in later
        // Skip bank details validation when editing
        if (!isEditMode && formData.paymentMethod && formData.paymentMethod !== "cash") {
          if (formData.paymentMethod === "direct_deposit" || formData.paymentMethod === "ach" || formData.paymentMethod === "wire") {
            // Bank transfers require bank name, routing number, and account number if payment method is set
            if (!formData.bankName || !formData.bankName.trim()) return false;
            if (!formData.routingNumber || !formData.routingNumber.trim()) return false;
            if (!formData.accountNumber || !formData.accountNumber.trim()) return false;
          }
        }
        // All fields are optional if no payment method selected
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

  const handleAddEmployee = () => {
    if (!validateStep(3)) {
      alert("Please fill in all required fields");
      return;
    }

    if (isEditMode && editingEmployeeId) {
      const updatedEmployees = employees.map((emp) =>
        emp.id === editingEmployeeId
          ? {
              ...emp,
              name: formData.name,
              position: formData.position,
              telephone: formData.telephone,
              email: formData.email,
              startDate: formData.startDate,
              paymentStartDate: formData.paymentStartDate,
              address: formData.address,
              ssn: formData.ssn || formData.itin,
              weeklyRate: parseFloat(formData.weeklyRate),
              paymentMethod: formData.paymentMethod,
              bankName: formData.bankName,
              routingNumber: formData.routingNumber,
              accountNumber: formData.accountNumber,
              accountType: formData.accountType,
              checkAttachment: formData.checkAttachment,
              checkNumber: formData.checkNumber,
              directDeposit: formData.paymentMethod === "direct_deposit",
              paymentDay: formData.paymentDay,
              paymentStatus: formData.paymentStatus,
              defaultDaysWorkedPerWeek: parseInt(formData.defaultDaysWorkedPerWeek, 10) || 5,
            }
          : emp
      );
      setEmployees(updatedEmployees);
      setIsEditMode(false);
      setEditingEmployeeId(null);
      alert("Employee updated successfully!");
    } else {
      // Calculate next ID by finding the max numeric ID from existing employees
      let maxId = 0;
      employees.forEach((emp) => {
        const match = emp.id.match(/EMP-(\d+)/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxId) maxId = num;
        }
      });
      const nextId = maxId + 1;

      const newEmployee: Employee = {
        id: `EMP-${String(nextId).padStart(3, "0")}`,
        name: formData.name,
        position: formData.position,
        telephone: formData.telephone,
        email: formData.email,
        startDate: formData.startDate,
        paymentStartDate: formData.paymentStartDate,
        address: formData.address,
        ssn: formData.ssn || formData.itin,
        weeklyRate: parseFloat(formData.weeklyRate),
        paymentMethod: formData.paymentMethod,
        bankName: formData.bankName,
        routingNumber: formData.routingNumber,
        accountNumber: formData.accountNumber,
        accountType: formData.accountType,
        checkAttachment: formData.checkAttachment,
        checkNumber: formData.checkNumber,
        directDeposit: formData.paymentMethod === "direct_deposit",
        paymentDay: formData.paymentDay,
        paymentStatus: formData.paymentStatus,
        defaultDaysWorkedPerWeek: parseInt(formData.defaultDaysWorkedPerWeek, 10) || 5,
      };

      setEmployees([...employees, newEmployee]);
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

  const handleDeleteEmployee = (employeeId: string) => {
    if (window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      setEmployees(employees.filter((emp) => emp.id !== employeeId));
    }
  };

  const handleStatusChange = (employeeId: string, newStatus: "active" | "paused" | "leaving" | "laid_off") => {
    const updatedEmployees = employees.map((emp) =>
      emp.id === employeeId
        ? { ...emp, paymentStatus: newStatus }
        : emp
    );
    setEmployees(updatedEmployees);
    saveYearData("employees", selectedYear, updatedEmployees);
    if (viewingEmployee && viewingEmployee.id === employeeId) {
      setViewingEmployee({
        ...viewingEmployee,
        paymentStatus: newStatus,
      });
    }
    setOpenStatusMenuId(null);

    // If employee is being marked as paused, immediately open absence modal
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

    // If employee is being marked as laid off, open severance modal
    if (newStatus === "laid_off") {
      setSeveranceEmployeeId(employeeId);
      setSeveranceDate(getTodayDate());
      setSeveranceReason("");
      setIsSeveranceModalOpen(true);
    }
  };

  const getLatestPendingPaymentForEmployee = (employeeId: string) => {
    const payments = getYearData("payments", selectedYear, []) || [];
    const employeePayments = payments.filter(
      (p: any) => p.employeeId === employeeId && p.status === "pending" && !p.isSeverance
    );
    if (employeePayments.length === 0) return null;
    // Sort by weekStartDate descending to get the latest
    employeePayments.sort((a: any, b: any) => {
      return new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime();
    });
    return employeePayments[0];
  };

  const getUpcomingPaymentWeek = (): string | null => {
    const payments = getYearData("payments", selectedYear, []) || [];
    // Find the earliest week with pending payments
    const pendingPayments = payments.filter((p: any) => p.status === "pending");
    let earliestWeekStart: string | null = null;

    if (pendingPayments.length > 0) {
      // Find the earliest weekStartDate
      earliestWeekStart = pendingPayments.reduce((earliest: string, p: any) => {
        if (!earliest || p.weekStartDate < earliest) {
          return p.weekStartDate;
        }
        return earliest;
      }, null);
    } else if (payments.length > 0) {
      // If no pending payments, find the earliest week from all payments
      earliestWeekStart = payments.reduce((earliest: string, p: any) => {
        if (!earliest || p.weekStartDate < earliest) {
          return p.weekStartDate;
        }
        return earliest;
      }, null);
    }

    return earliestWeekStart;
  };

  const handleConfirmSeverance = () => {
    const employee = employees.find(e => e.id === severanceEmployeeId);
    if (!employee) return;

    // Determine the amount based on mode
    let severanceAmount = employee.weeklyRate;
    let finalReason = severanceReason;

    if (severanceMode === "quick") {
      // Use latest pending payment amount
      const latestPayment = getLatestPendingPaymentForEmployee(severanceEmployeeId);
      if (latestPayment) {
        severanceAmount = latestPayment.amount;
        const weekStr = new Date(latestPayment.weekStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        finalReason = `Severance - Week of ${weekStr}`;
      } else {
        finalReason = "Severance Payment";
      }
    } else {
      // Custom mode - validate reason is provided
      if (!severanceReason) {
        alert("Please enter a reason for the severance");
        return;
      }
    }

    // Calculate the week start date for the severance
    // Use the employee's latest pending payment week if available, otherwise use the upcoming payment week
    let weekStartStr: string | null = null;

    // First, try to use the employee's latest pending payment week
    const employeeLatestPayment = getLatestPendingPaymentForEmployee(severanceEmployeeId);
    if (employeeLatestPayment) {
      weekStartStr = employeeLatestPayment.weekStartDate;
    } else {
      // If employee has no pending payments, use the upcoming payment week
      weekStartStr = getUpcomingPaymentWeek();
    }

    if (!weekStartStr) {
      // No existing payments at all, use the week of the severance date
      const parts = severanceDate.split('-');
      const severanceDateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      weekStartStr = getWeekStartDate(severanceDateObj);
    }

    // Calculate week end date (Saturday) based on the week start date
    const weekStartParts = weekStartStr.split('-');
    const weekStartDate = new Date(parseInt(weekStartParts[0]), parseInt(weekStartParts[1]) - 1, parseInt(weekStartParts[2]));
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekStartDate.getDate() + 6); // Go to Saturday of the week
    const year = weekEndDate.getFullYear();
    const month = String(weekEndDate.getMonth() + 1).padStart(2, '0');
    const day = String(weekEndDate.getDate()).padStart(2, '0');
    const weekEndStr = `${year}-${month}-${day}`;

    // Calculate dueDate as the day after weekEndDate (same pattern as normal payments)
    const dueDateObj = new Date(weekEndDate);
    dueDateObj.setDate(weekEndDate.getDate() + 1);
    const dueDateYear = dueDateObj.getFullYear();
    const dueDateMonth = String(dueDateObj.getMonth() + 1).padStart(2, '0');
    const dueDateDay = String(dueDateObj.getDate()).padStart(2, '0');
    const dueDateStr = `${dueDateYear}-${dueDateMonth}-${dueDateDay}`;

    // Create a severance payment for one week
    const severancePayment = {
      id: `SEVER-${employee.id}-${weekStartStr}`,
      employeeId: employee.id,
      employeeName: employee.name,
      employeePosition: employee.position,
      amount: severanceAmount,
      weekStartDate: weekStartStr,
      weekEndDate: weekEndStr,
      dueDate: dueDateStr,
      status: "pending" as const,
      paymentMethod: employee.paymentMethod,
      bankName: employee.bankName,
      routingNumber: employee.routingNumber,
      accountNumber: employee.accountNumber,
      accountType: employee.accountType,
      daysWorked: 5,
      isAdjustedForAbsence: false,
      fullWeeklySalary: employee.weeklyRate,
      deductionAmount: 0,
      isSeverance: true,
      severanceReason: finalReason,
      severanceDate: severanceDate,
    };

    // Load existing payments and add the severance payment
    const existingPayments = getYearData("payments", selectedYear, []) || [];
    const updatedPayments = [...existingPayments, severancePayment];
    saveYearData("payments", selectedYear, updatedPayments);

    // Close modal and reset form
    setIsSeveranceModalOpen(false);
    setSeveranceEmployeeId(null);
    setSeveranceReason("");
    setSeveranceDate("");
    setSeveranceMode("quick");

    // Dispatch event to notify Payments page of update
    window.dispatchEvent(new Event("employeesUpdated"));

    alert(`✓ Severance payment of $${severanceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} created for ${employee.name}`);
  };

  const handleApplyBulkDays = () => {
    const daysValue = parseInt(bulkDaysValue, 10);
    if (isNaN(daysValue) || daysValue < 1 || daysValue > 5) {
      alert("Please select a valid number of days (1-5)");
      return;
    }

    const updatedEmployees = employees.map((emp) => ({
      ...emp,
      defaultDaysWorkedPerWeek: daysValue,
    }));

    setEmployees(updatedEmployees);
    saveYearData("employees", selectedYear, updatedEmployees);
    setIsBulkDaysOpen(false);
    alert(`✓ Set ${daysValue} days/week as default for all ${employees.length} employees`);
  };

  const downloadEmployeeList = () => {
    if (employees.length === 0) {
      alert("No employees to download");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("Employee List", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 10;

    // Date and count
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    doc.text(`Generated: ${today}`, 14, yPosition);
    doc.text(`Total Employees: ${employees.length}`, pageWidth - 14, yPosition, { align: "right" });
    yPosition += 12;

    // Table headers
    const headers = ["ID", "Name", "Position", "Weekly Rate", "Start Date", "Payment Method"];
    const columnWidths = [18, 35, 28, 25, 25, 20];

    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.setFillColor(200, 200, 200);

    let xPosition = 14;
    headers.forEach((header, index) => {
      doc.rect(xPosition, yPosition - 5, columnWidths[index], 7, "F");
      doc.text(header, xPosition + 2, yPosition, { maxWidth: columnWidths[index] - 2 });
      xPosition += columnWidths[index];
    });
    yPosition += 10;

    // Table rows
    doc.setFont(undefined, "normal");
    doc.setFontSize(9);

    employees.forEach((emp, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = 20;

        // Repeat headers on new page
        doc.setFontSize(10);
        doc.setFont(undefined, "bold");
        doc.setFillColor(200, 200, 200);

        let headerXPos = 14;
        headers.forEach((header, idx) => {
          doc.rect(headerXPos, yPosition - 5, columnWidths[idx], 7, "F");
          doc.text(header, headerXPos + 2, yPosition, { maxWidth: columnWidths[idx] - 2 });
          headerXPos += columnWidths[idx];
        });
        yPosition += 10;

        doc.setFont(undefined, "normal");
        doc.setFontSize(9);
      }

      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        xPosition = 14;
        headers.forEach((_, idx) => {
          doc.rect(xPosition, yPosition - 5, columnWidths[idx], 7, "F");
          xPosition += columnWidths[idx];
        });
      }

      // Row data
      const rowData = [
        emp.id,
        emp.name,
        emp.position,
        `$${emp.weeklyRate}`,
        emp.startDate,
        emp.paymentMethod || "-"
      ];

      xPosition = 14;
      doc.setTextColor(0, 0, 0);
      rowData.forEach((cell, idx) => {
        doc.text(String(cell), xPosition + 2, yPosition, { maxWidth: columnWidths[idx] - 4 });
        xPosition += columnWidths[idx];
      });
      yPosition += 7;
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: "center" }
      );
    }

    // Save PDF
    const fileName = `employee_list_${formatDateToString(new Date())}.pdf`;
    doc.save(fileName);
  };

  const downloadEmployeesAsCSV = () => {
    if (employees.length === 0) {
      alert("No employees to download");
      return;
    }

    // Define CSV headers
    const headers = [
      "ID",
      "Name",
      "Position",
      "Weekly Rate",
      "Start Date",
      "Payment Start Date",
      "SSN",
      "Address",
      "Telephone",
      "Email",
      "Payment Method",
      "Bank Name",
      "Routing Number",
      "Account Number",
      "Account Type",
      "Check Number",
      "Direct Deposit",
      "Payment Day",
      "Payment Status",
      "Default Days Worked Per Week"
    ];

    // Create CSV content
    const csvContent = [
      headers.join(","),
      ...employees.map(emp => [
        emp.id,
        `"${emp.name}"`, // Quote names in case they have commas
        `"${emp.position}"`,
        emp.weeklyRate || "",
        emp.startDate || "",
        emp.paymentStartDate || "",
        emp.ssn || "",
        `"${emp.address || ""}"`,
        `"${emp.telephone || ""}"`,
        `"${emp.email || ""}"`,
        emp.paymentMethod || "",
        `"${emp.bankName || ""}"`,
        emp.routingNumber || "",
        emp.accountNumber || "",
        emp.accountType || "",
        emp.checkNumber || "",
        emp.directDeposit ? "Yes" : "No",
        emp.paymentDay || "",
        emp.paymentStatus || "active",
        emp.defaultDaysWorkedPerWeek || "5"
      ].join(","))
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `employees_${formatDateToString(new Date())}.csv`);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadEmployeeDetailsReport = () => {
    if (employees.length === 0) {
      alert("No employees to download");
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;

    // Title
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text("Workers Details Report", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;

    // Date
    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    doc.text(`Generated: ${dateStr} at ${timeStr}`, 14, yPosition);
    yPosition += 10;

    // Summary Section
    const activeCount = employees.filter(e => e.paymentStatus === "active").length;
    const weeklyTotal = employees.reduce((sum, e) => sum + (e.weeklyRate || 0), 0);

    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("Summary", 14, yPosition);
    yPosition += 6;

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    doc.text(`Total Workers:`, 14, yPosition);
    doc.text(`${employees.length}`, 100, yPosition);
    yPosition += 5;

    doc.text(`Active Workers:`, 14, yPosition);
    doc.text(`${activeCount}`, 100, yPosition);
    yPosition += 5;

    doc.text(`Weekly Payroll Total:`, 14, yPosition);
    doc.text(`$${weeklyTotal.toLocaleString()}`, 100, yPosition);
    yPosition += 12;

    // Employee Details
    employees.forEach((emp, empIndex) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      // Employee Header
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.setFillColor(220, 220, 220);
      doc.rect(14, yPosition - 5, pageWidth - 28, 7, "F");
      doc.text(`${emp.id} - ${emp.name}`, 16, yPosition);
      yPosition += 10;

      // Job Information
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      const col1X = 14;
      const col2X = 110;

      doc.setFont(undefined, "bold");
      doc.text("Position:", col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(emp.position || "-", col2X, yPosition);
      yPosition += 5;

      doc.setFont(undefined, "bold");
      doc.text("Weekly Rate:", col1X, yPosition);
      doc.setFont(undefined, "normal");
      doc.text(`$${emp.weeklyRate}`, col2X, yPosition);
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

      // Personal Information
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

    // Save PDF
    const fileName = `workers_details_${formatDateToString(new Date())}.pdf`;
    doc.save(fileName);
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
      });
    }
    setIsModalOpen(open);
  };

  const handleBulkImportFromList = () => {
    // Prevent multiple simultaneous imports
    if (isBulkImporting) {
      alert("Import in progress, please wait...");
      return;
    }

    setIsBulkImporting(true);

    try {
      // Find the highest existing employee ID number
      const existingIds = employees
        .map(emp => {
          const match = emp.id.match(/EMP-(\d+)/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => num > 0);

      const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
      let nextId = maxId + 1;

      const bulkEmployees: Employee[] = [
        {
          id: `EMP-${String(nextId++).padStart(3, "0")}`,
          name: "Steven Sadler",
          position: "Painter",
          weeklyRate: 900,
          startDate: "2026-01-12",
          paymentStartDate: "2026-01-12",
          paymentDay: "wednesday",
          paymentStatus: "active",
        },
        {
          id: `EMP-${String(nextId++).padStart(3, "0")}`,
          name: "Julio Paraguassu",
          position: "Painter",
          weeklyRate: 900,
          startDate: "2026-12-02",
          paymentStartDate: "2026-12-02",
          paymentDay: "wednesday",
          paymentStatus: "active",
        },
        {
          id: `EMP-${String(nextId++).padStart(3, "0")}`,
          name: "Julio Funez",
          position: "Painter",
          weeklyRate: 900,
          startDate: "2026-12-01",
          paymentStartDate: "2026-12-01",
          paymentDay: "wednesday",
          paymentStatus: "active",
        },
        {
          id: `EMP-${String(nextId++).padStart(3, "0")}`,
          name: "Cairo Calderon",
          position: "Painter",
          weeklyRate: 900,
          startDate: "2026-04-18",
          paymentStartDate: "2026-04-18",
          paymentDay: "wednesday",
          paymentStatus: "active",
        },
        {
          id: `EMP-${String(nextId++).padStart(3, "0")}`,
          name: "Wilson Hernandez",
          position: "Painter",
          weeklyRate: 900,
          startDate: "2026-07-20",
          paymentStartDate: "2026-07-20",
          paymentDay: "wednesday",
          paymentStatus: "active",
        },
        {
          id: `EMP-${String(nextId++).padStart(3, "0")}`,
          name: "Lucas Mora",
          position: "Painter",
          weeklyRate: 900,
          startDate: "2026-02-19",
          paymentStartDate: "2026-02-19",
          paymentDay: "wednesday",
          paymentStatus: "active",
        },
        {
          id: `EMP-${String(nextId++).padStart(3, "0")}`,
          name: "Guillermo Reyes",
          position: "Painter",
          weeklyRate: 900,
          startDate: "2026-02-19",
          paymentStartDate: "2026-02-19",
          paymentDay: "wednesday",
          paymentStatus: "active",
        },
        {
          id: `EMP-${String(nextId++).padStart(3, "0")}`,
          name: "Jose Zapata",
          position: "Painter",
          weeklyRate: 900,
          startDate: "2026-12-13",
          paymentStartDate: "2026-12-13",
          paymentDay: "wednesday",
          paymentStatus: "active",
        },
      ];

      // Check for duplicates before adding
      const existingIdSet = new Set(employees.map(emp => emp.id));
      const duplicates = bulkEmployees.filter(emp => existingIdSet.has(emp.id));

      if (duplicates.length > 0) {
        alert(`⚠ Some employees are already in the system. Skipping duplicates.`);
        const newEmployees = bulkEmployees.filter(emp => !existingIdSet.has(emp.id));
        setEmployees([...employees, ...newEmployees]);
      } else {
        // Merge and deduplicate
        const merged = [...employees, ...bulkEmployees];
        const seenIds = new Set<string>();
        const deduplicated = merged.filter(emp => {
          if (seenIds.has(emp.id)) {
            return false;
          }
          seenIds.add(emp.id);
          return true;
        });
        setEmployees(deduplicated);
        alert(`✓ Successfully added ${bulkEmployees.length} employees from your handwritten list!`);
      }
    } finally {
      setIsBulkImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Employees</h1>
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
        <div className="flex gap-3">
          <Button
            onClick={generateEmployeeTemplate}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            Download Template
          </Button>
          <Button
            onClick={downloadEmployeesAsCSV}
            className="gap-2 bg-cyan-600 hover:bg-cyan-700"
            title="Download all employee details including SSN as editable CSV"
          >
            <Download className="w-4 h-4" />
            Download Employees
          </Button>
          <Button
            onClick={downloadEmployeeDetailsReport}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
            title="Download detailed PDF report with all employee information including SSN"
          >
            <Download className="w-4 h-4" />
            Detailed Report
          </Button>
          <Button
            onClick={() => setIsBulkDaysOpen(true)}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
            title="Set same days worked for all employees"
          >
            <Plus className="w-4 h-4" />
            Bulk Set Days
          </Button>
          <Dialog open={isModalOpen} onOpenChange={handleModalOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4" />
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
                      {!isEditMode && (formData.paymentMethod === "direct_deposit" || formData.paymentMethod === "ach" || formData.paymentMethod === "wire") && "⚠️ Bank details are required"}
                      {isEditMode && (formData.paymentMethod === "direct_deposit" || formData.paymentMethod === "ach" || formData.paymentMethod === "wire") && "ℹ️ Bank details can be updated if needed"}
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
                        <p className="text-sm font-semibold text-slate-700 mb-3">Bank Information *</p>

                        <div className="space-y-2">
                          <Label htmlFor="bankName">Bank Name *</Label>
                          <Input
                            id="bankName"
                            placeholder="e.g., Wells Fargo, Chase Bank"
                            value={formData.bankName || ""}
                            onChange={(e) => handleFormChange("bankName", e.target.value)}
                            className="border-slate-300"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="routingNumber">Routing Number *</Label>
                          <Input
                            id="routingNumber"
                            placeholder="9-digit routing number"
                            value={formData.routingNumber || ""}
                            onChange={(e) => handleFormChange("routingNumber", e.target.value)}
                            className="border-slate-300"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">Account Number *</Label>
                          <Input
                            id="accountNumber"
                            type="password"
                            placeholder="Account number (will be masked)"
                            value={formData.accountNumber || ""}
                            onChange={(e) => handleFormChange("accountNumber", e.target.value)}
                            className="border-slate-300"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="accountType">Account Type *</Label>
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
                <>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">Full Name</p>
                        <p className="text-slate-900">{formData.name}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">Position</p>
                        <p className="text-slate-900">{formData.position}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">Contact Info</p>
                        <p className="text-slate-900">{formData.telephone}</p>
                        {formData.email && <p className="text-slate-700">{formData.email}</p>}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">Start Date</p>
                        <p className="text-slate-900">
                          {formatDateString(formData.startDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">First 2026 Payment Date</p>
                        <p className="text-slate-900">
                          {formatDateString(formData.paymentStartDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">Address</p>
                        <p className="text-slate-900">{formData.address}</p>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">Tax ID</p>
                        <p className="text-slate-900">
                          {formData.ssn ? "SSN provided" : "ITIN provided"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">Weekly Rate</p>
                        <p className="text-slate-900 text-lg font-semibold">${parseFloat(formData.weeklyRate || "0").toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">Payment Method</p>
                        <p className="text-slate-900">
                          {formData.paymentMethod === "cash" && "Cash"}
                          {formData.paymentMethod === "direct_deposit" && "Direct Deposit"}
                          {formData.paymentMethod === "check" && "Check"}
                          {formData.paymentMethod === "ach" && "ACH Transfer"}
                          {formData.paymentMethod === "wire" && "Wire Transfer"}
                        </p>
                      </div>
                    </div>


                    {(formData.paymentMethod === "direct_deposit" || formData.paymentMethod === "ach" || formData.paymentMethod === "wire") && (
                      <div className="bg-blue-50 p-4 rounded border border-blue-200 space-y-3">
                        <p className="text-sm font-semibold text-blue-900">Bank Transfer Details</p>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">Bank Name</p>
                          <p className="text-slate-900">{formData.bankName}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">Routing Number</p>
                          <p className="text-slate-900">{formData.routingNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">Account Number</p>
                          <p className="text-slate-900">
                            {'•'.repeat(Math.max(0, formData.accountNumber.length - 4))} {formData.accountNumber.slice(-4)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600 uppercase">Account Type</p>
                          <p className="text-slate-900">
                            {formData.accountType === "checking" ? "Checking" : "Savings"}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                      ✓ All information is complete and ready to be saved
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 justify-between pt-4">
              <div>
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    className="border-slate-300 gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => handleModalOpenChange(false)}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                {currentStep < 4 ? (
                  <Button
                    onClick={handleNextStep}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                  >
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{filteredEmployees.length}</p>
            {(filterStatus !== "all" || filterFromDate || filterToDate) && (
              <p className="text-sm text-slate-600 mt-2">
                {filteredEmployees.length} of {employees.length} employees
              </p>
            )}
            {(filterFromDate || filterToDate) && (
              <p className="text-xs text-slate-500 mt-1">
                {filterFromDate && `From ${formatDateString(filterFromDate)}`}{filterFromDate && filterToDate && " - "}{filterToDate && `To ${formatDateString(filterToDate)}`}
              </p>
            )}
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Weekly Payments Due</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">${totalWeeklyPayments.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{pendingPaymentsCount}</p>
          </CardContent>
        </Card>
      </div>

      {isViewModalOpen && viewingEmployee && (
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingEmployee.name}</DialogTitle>
              <DialogDescription>
                Employee ID: {viewingEmployee.id}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Position</p>
                    <p className="text-slate-900">{viewingEmployee.position}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Start Date</p>
                    <p className="text-slate-900">{formatDateString(viewingEmployee.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Phone</p>
                    <p className="text-slate-900">{viewingEmployee.telephone}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Email</p>
                    <p className="text-slate-900">{viewingEmployee.email || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-slate-900">Address</h3>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Full Address</p>
                  <p className="text-slate-900">{viewingEmployee.address}</p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-slate-900">Tax Information</h3>
                <div>
                  <p className="text-xs font-semibold text-slate-600 uppercase">Tax ID</p>
                  <p className="text-slate-900">••••••••{viewingEmployee.ssn?.slice(-4) || "Not provided"}</p>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-slate-900">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Weekly Rate</p>
                    <p className="text-lg font-semibold text-slate-900">${viewingEmployee.weeklyRate.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Payment Method</p>
                    <p className="text-slate-900">
                      {viewingEmployee.paymentMethod === "cash" && "Cash"}
                      {viewingEmployee.paymentMethod === "direct_deposit" && "Direct Deposit"}
                      {viewingEmployee.paymentMethod === "check" && "Check"}
                      {viewingEmployee.paymentMethod === "ach" && "ACH Transfer"}
                      {viewingEmployee.paymentMethod === "wire" && "Wire Transfer"}
                    </p>
                  </div>
                </div>

                {viewingEmployee.paymentMethod === "check" ? (
                  <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase">Bank Name</p>
                      <p className="text-slate-900">{viewingEmployee.bankName}</p>
                    </div>
                    {viewingEmployee.checkNumber && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">Check Number</p>
                        <p className="text-slate-900">{viewingEmployee.checkNumber}</p>
                      </div>
                    )}
                  </div>
                ) : viewingEmployee.paymentMethod !== "cash" ? (
                  <div className="bg-slate-50 p-4 rounded border border-slate-200 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase">Bank Name</p>
                      <p className="text-slate-900">{viewingEmployee.bankName}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase">Routing Number</p>
                      <p className="text-slate-900">{viewingEmployee.routingNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase">Account Number</p>
                      <p className="text-slate-900">
                        {'•'.repeat(Math.max(0, (viewingEmployee.accountNumber?.length || 0) - 4))} {viewingEmployee.accountNumber?.slice(-4)}
                      </p>
                    </div>
                    {(viewingEmployee.paymentMethod === "direct_deposit" || viewingEmployee.paymentMethod === "ach" || viewingEmployee.paymentMethod === "wire") && (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase">Account Type</p>
                        <p className="text-slate-900">
                          {viewingEmployee.accountType === "checking" ? "Checking" : "Savings"}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-slate-900">Payment Schedule</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Payment Day</p>
                    <p className="text-slate-900 capitalize">{viewingEmployee.paymentDay || "Friday"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase">Payment Status</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-block w-2 h-2 rounded-full ${
                        viewingEmployee.paymentStatus === "active" ? "bg-green-600" :
                        viewingEmployee.paymentStatus === "paused" ? "bg-yellow-600" :
                        viewingEmployee.paymentStatus === "leaving" ? "bg-red-600" :
                        "bg-slate-600"
                      }`}></span>
                      <p className="text-slate-900 capitalize">{viewingEmployee.paymentStatus === "laid_off" ? "Laid Off" : viewingEmployee.paymentStatus || "Active"}</p>
                    </div>
                  </div>
                </div>
                {viewingEmployee.paymentStatus === "paused" && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    ⏸️ Payments are paused for this employee. Resume to restart automatic payments.
                  </div>
                )}
                {viewingEmployee.paymentStatus === "leaving" && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    🚪 Employee is leaving. Payments will stop automatically.
                  </div>
                )}
                {viewingEmployee.paymentStatus === "laid_off" && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded text-sm text-slate-800">
                    ❌ Employee has been laid off. Payments are inactive.
                  </div>
                )}
              </div>

              {viewingEmployee.paymentStatus === "paused" && (
                <div className="space-y-4 border-t pt-4 bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">Absence Management</h3>
                      <p className="text-xs text-slate-600 mt-1">Set which days the employee will work this week</p>
                    </div>
                    <Button
                      onClick={() => handleOpenAbsenceModal(viewingEmployee.id)}
                      className="gap-2 bg-yellow-600 hover:bg-yellow-700"
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add Absence
                    </Button>
                  </div>
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
              )}

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
              {/* List of existing absences */}
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
        const quickAmount = latestPayment ? latestPayment.amount : employee.weeklyRate;
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

                {/* Mode Selection */}
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
                className="bg-green-600 hover:bg-green-700"
              >
                Generate Payments
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isPaymentModalOpen && viewingEmployee && (
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPayment ? "Edit Payment" : "Add Weekly Payment"}</DialogTitle>
              <DialogDescription>
                Employee: {viewingEmployee.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="weekStartDate">Week Start Date *</Label>
                <Input
                  id="weekStartDate"
                  type="date"
                  value={paymentFormData.weekStartDate}
                  onChange={(e) => handlePaymentFormChange("weekStartDate", e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="daysWorked">Days Worked (out of 5) *</Label>
                <select
                  id="daysWorked"
                  value={paymentFormData.daysWorked}
                  onChange={(e) => handlePaymentFormChange("daysWorked", parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="0">0 days</option>
                  <option value="1">1 day</option>
                  <option value="2">2 days</option>
                  <option value="3">3 days</option>
                  <option value="4">4 days</option>
                  <option value="5">5 days</option>
                </select>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="text-xs font-semibold text-slate-600 uppercase">Calculated Amount</p>
                <p className="text-2xl font-bold text-green-600">
                  ${calculatePaymentAmount(viewingEmployee.weeklyRate, paymentFormData.daysWorked).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  (${viewingEmployee.weeklyRate} ÷ 5) × {paymentFormData.daysWorked} days
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overrideAmount">Override Amount (Optional)</Label>
                <Input
                  id="overrideAmount"
                  type="number"
                  placeholder="Leave empty to use calculated amount"
                  value={paymentFormData.overrideAmount}
                  onChange={(e) => handlePaymentFormChange("overrideAmount", e.target.value)}
                  className="border-slate-300"
                  step="0.01"
                  min="0"
                />
                {paymentFormData.overrideAmount && (
                  <p className="text-xs text-blue-600">
                    ✓ Final amount will be ${parseFloat(paymentFormData.overrideAmount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold text-slate-900 mb-3">Payment Method</h3>
                <select
                  value={paymentFormData.paymentMethod}
                  onChange={(e) => handlePaymentFormChange("paymentMethod", e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                >
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="direct_deposit">Direct Deposit</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="wire_transfer">Wire Transfer</option>
                  <option value="credit_card">Credit Card</option>
                </select>
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
                      maxLength="4"
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

      {isBulkDaysOpen && (
        <Dialog open={isBulkDaysOpen} onOpenChange={setIsBulkDaysOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Set Days Worked for All Employees</DialogTitle>
              <DialogDescription>
                Apply the same default days/week to all {employees.length} employees
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <p className="text-sm text-slate-700 mb-3">
                  This will set the default "Days Worked per Week" for:
                </p>
                <ul className="text-sm space-y-1 text-slate-600">
                  <li>✓ All {employees.length} employees in the system</li>
                  <li>✓ This becomes their baseline for payment calculations</li>
                  <li>✓ Can still be overridden per-week in Payments page</li>
                </ul>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bulkDaysWorked">Days per Week</Label>
                <Select value={bulkDaysValue} onValueChange={setBulkDaysValue}>
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="Select days" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day per week (20% FTE)</SelectItem>
                    <SelectItem value="2">2 days per week (40% FTE)</SelectItem>
                    <SelectItem value="3">3 days per week (60% FTE)</SelectItem>
                    <SelectItem value="4">4 days per week (80% FTE)</SelectItem>
                    <SelectItem value="5">5 days per week (Full-time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                💡 <strong>Tip:</strong> If you need different days for specific employees, set them individually in the employee edit form.
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsBulkDaysOpen(false)}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApplyBulkDays}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Apply to All
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
