import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Edit2, Trash2, Download, Printer, ChevronRight, ChevronLeft, Paperclip, FileIcon, X } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import JSZip from "jszip";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { getYearData, saveYearData, shouldUseExampleData, getTodayDate, formatDateString, generateShortId } from "@/utils/yearStorage";
import { useAutoSave } from "@/hooks/useAutoSave";
import { useToast } from "@/hooks/use-toast";
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

interface Payment {
  id: string;
  description: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid";
  paidDate?: string;
  paymentMethod?: "check" | "direct_deposit" | "bank_transfer" | "wire_transfer" | "credit_card" | "debit_card" | "cash";
  bankName?: string;
  routingNumber?: string;
  accountNumber?: string;
  accountType?: string;
  checkNumber?: string;
  checkAttachment?: string;
  transactionReference?: string;
  creditCardLast4?: string;
  receiptAttachment?: string;
}

interface MaterialItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
  unit: string;
  supplier?: string;
}

interface LaborCost {
  calculationMethod: "manual" | "daily" | "monthly" | "hours";
  amount: number;
  dailyRate?: number;
  days?: number;
  monthlyRate?: number;
  months?: number;
  hourlyRate?: number;
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
  invoiceNumber: string;
  vendor: string;
  amount: number;
  purchaseDate: string;
  category: "Materials" | "Labor" | "Permits" | "Other";
  description: string;
  notes: string;
  fileName?: string;
}

interface ContractAttachment {
  id: string;
  fileName: string;
  fileData: string; // Base64 encoded file data
  uploadDate: string;
  description?: string;
}

interface DownPayment {
  id: string;
  amount: number;
  date: string;
  method: "cash" | "check" | "wire_transfer" | "bank_transfer" | "credit_card" | "direct_deposit";
  description?: string;
  receiptAttachment?: string;
}

interface CostTracking {
  materials: MaterialItem[];
  laborCost: LaborCost;
  miscellaneous: MiscellaneousItem[];
  profitMarginPercent: number;
}

interface Contract {
  id: string;
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  projectLocation: string;
  clientPhone: string;
  clientEmail: string;
  projectDescription: string;
  projectName: string;
  depositAmount: number;
  totalValue: number;
  startDate: string;
  dueDate: string;
  status: "pending" | "in-progress" | "completed";
  paymentSchedule: Payment[];
  cabinetType: string;
  material: string;
  customFinish?: string;
  installationIncluded: boolean;
  additionalNotes: string;
  costTracking: CostTracking;
  expenses: Expense[];
  attachments: ContractAttachment[];
  downPayments?: DownPayment[];
}

interface FormData {
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  projectLocation: string;
  clientPhone: string;
  clientEmail: string;
  projectDescription: string;
  projectName: string;
  depositAmount: string;
  totalValue: string;
  startDate: string;
  dueDate: string;
  status: "pending" | "in-progress" | "completed";
  cabinetType: string;
  material: string;
  customFinish: string;
  installationIncluded: boolean;
  additionalNotes: string;
}

const CABINET_TYPES = ["Kitchen", "Bathroom", "Office", "Bedroom", "Living Room", "Custom"];
const FINISHES = ["Paint", "Stain", "Both (Stain & Paint)", "Natural/Unfinished", "Other"];

const DEFAULT_MATERIALS: MaterialItem[] = [
  { id: "MAT-001", name: "Plywood Birch Prefinished 3/4\" 4x8 C2", unitPrice: 38.51, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-002", name: "Plywood Birch Prefinished 1/4\" 4x8", unitPrice: 22.83, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-003", name: "Plywood White Oak Natural 1/4\" 4x8 Rifcut", unitPrice: 52.00, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-004", name: "Plywood White Oak Natural 3/4\" 4x8 Rifcut B2", unitPrice: 110.01, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-005", name: "Plywood White Oak 3/4\" 4x10 A1 Rift Cut Garnica", unitPrice: 219.95, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-006", name: "Lumber Poplar S3S 16' 13/16\" 12\"+", unitPrice: 2.86, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-007", name: "Lumber Soft Maple UNS 13/16\" Stain Grade S3S 14'", unitPrice: 3.65, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-008", name: "Lumber White Oak R1E 13/16\" S3S", unitPrice: 6.99, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-009", name: "Lumber White Oak Rift Cut 13/16\" S3S", unitPrice: 13.98, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-010", name: "Drawer Side 4\"x96\" 5/8\" Rubberwood Flat Edge UV", unitPrice: 11.37, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-011", name: "Drawer Side 6\"x96\" 5/8\" Rubberwood Flat Edge UV", unitPrice: 19.12, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-012", name: "Drawer Side 8\"x96\" 5/8\" Rubberwood Flat Edge UV", unitPrice: 21.65, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-013", name: "Drawer Side 10\"x96\" 5/8\" Rubberwood Flat Edge UV", unitPrice: 25.34, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-014", name: "Tandem Plus Blumotion 563 Full Extension 21\" Zinc-Plated", unitPrice: 18.90, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-015", name: "Tandem Plus Blumotion 563 Full Extension 18\" Zinc-Plated", unitPrice: 17.70, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-016", name: "Tandem Plus Blumotion 563 Full Extension 15\" Zinc-Plated", unitPrice: 19.94, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-017", name: "Blum Clip Top Blumotion 110° Hinges Full Overlay Nickel", unitPrice: 3.95, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-018", name: "Clip Mounting Plates Cam Height Adjustable Nickel", unitPrice: 0.87, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-019", name: "MDF Raw 3/4\" 4x8 A1 Door Core", unitPrice: 45.33, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-020", name: "MDF Ultra Light 3/8\" 4x8", unitPrice: 24.25, quantity: 0, unit: "EA", supplier: "Imeca Charlotte" },
  { id: "MAT-021", name: "Plywood Birch 18mm 4x8 C2 WPF UV1S Prefinished VC", unitPrice: 39.39, quantity: 0, unit: "EA", supplier: "Atlantic Plywood" },
  { id: "MAT-022", name: "Plywood Birch 18mm 4x8 C2 WPF UV2S Prefinished VC", unitPrice: 41.78, quantity: 0, unit: "EA", supplier: "Atlantic Plywood" },
  { id: "MAT-023", name: "Plywood White Oak 3/4\" 4x8 A1 Rift Cut Prefinished VC", unitPrice: 134.13, quantity: 0, unit: "EA", supplier: "Atlantic Plywood" },
  { id: "MAT-024", name: "Plywood White Oak 3/4\" 4x10 A1 Rift Cut Prefinished VC", unitPrice: 239.98, quantity: 0, unit: "EA", supplier: "Atlantic Plywood" },
  { id: "MAT-025", name: "Blum Clip Top Hinge 110 Blumotion F-OL Inserta", unitPrice: 3.70, quantity: 0, unit: "EA", supplier: "Atlantic Plywood" },
  { id: "MAT-026", name: "Tandem Plus Blumotion 563H 21\" Full Ext Drawer Zinc", unitPrice: 17.82, quantity: 0, unit: "EA", supplier: "Atlantic Plywood" },
  { id: "MAT-027", name: "Tandem Plus Blumotion 563H 18\" Full Ext Drawer Zinc", unitPrice: 16.97, quantity: 0, unit: "EA", supplier: "Atlantic Plywood" },
  { id: "MAT-028", name: "Tandem Plus Blumotion 563/9 Locking Device Left", unitPrice: 1.33, quantity: 0, unit: "EA", supplier: "Atlantic Plywood" },
  { id: "MAT-029", name: "Tandem Plus Blumotion 563/9 Locking Device Right", unitPrice: 1.33, quantity: 0, unit: "EA", supplier: "Atlantic Plywood" },
  { id: "MAT-030", name: "Blum Plates", unitPrice: 0.80, quantity: 0, unit: "EA", supplier: "Atlantic Plywood" },
  { id: "MAT-031", name: "Paint", unitPrice: 130.00, quantity: 0, unit: "unit", supplier: "Local" },
  { id: "MAT-032", name: "Primer", unitPrice: 130.00, quantity: 0, unit: "unit", supplier: "Local" },
];

const exampleContracts: Contract[] = [
  {
    id: "CON-001",
    clientName: "Marconi",
    clientAddress: "2231 Hessell pl",
    clientCity: "Charlotte",
    clientState: "NC",
    clientZip: "28202",
    projectLocation: "2231 Hessell pl Charlotte",
    clientPhone: "",
    clientEmail: "",
    projectDescription: "Cabinet project",
    projectName: "2231 Hessell pl Charlotte",
    depositAmount: 0,
    totalValue: 7600,
    startDate: "2026-01-01",
    dueDate: "2026-01-31",
    status: "pending",
    cabinetType: "Kitchen",
    material: "Wood",
    installationIncluded: true,
    additionalNotes: "",
    costTracking: {
      materials: [
        {
          id: "MAT-001",
          name: "Materials",
          unitPrice: 1042.96,
          quantity: 1,
          unit: "lot",
          supplier: "Marconi"
        }
      ],
      laborCost: {
        calculationMethod: "manual",
        amount: 1000,
        description: "Labor costs"
      },
      miscellaneous: [],
      profitMarginPercent: 73.1
    },
    expenses: [],
    paymentSchedule: [
      {
        id: "PAY-001-1",
        description: "Full Payment",
        amount: 7600,
        dueDate: "2026-01-31",
        status: "pending"
      }
    ],
    attachments: [
      {
        id: "ATT-CON-001-1",
        fileName: "Kitchen Cabinet Design.png",
        fileData: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjxyZWN0IHg9IjUwIiB5PSI1MCIgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNkY2EiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iNjAiIHk9IjYwIiB3aWR0aD0iNzAiIGhlaWdodD0iOTAiIGZpbGw9IiNmZmYiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iMTQ1IiB5PSI2MCIgd2lkdGg9IjcwIiBoZWlnaHQ9IjkwIiBmaWxsPSIjZmZmIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjIzMCIgeT0iNjAiIHdpZHRoPSI3MCIgaGVpZ2h0PSI5MCIgZmlsbD0iI2ZmZiIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz48Y2lyY2xlIGN4PSI5NSIgY3k9IjEwNSIgcj0iNiIgZmlsbD0iIzMzMyIvPjxjaXJjbGUgY3g9IjE4MCIgY3k9IjEwNSIgcj0iNiIgZmlsbD0iIzMzMyIvPjxjaXJjbGUgY3g9IjI2NSIgY3k9IjEwNSIgcj0iNiIgZmlsbD0iIzMzMyIvPjwvc3ZnPg==",
        uploadDate: "2026-01-01",
        description: "Kitchen cabinet design with three doors"
      },
      {
        id: "ATT-CON-001-2",
        fileName: "Project Sketch.png",
        fileData: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2VlZSIvPjxwb2x5Z29uIHBvaW50cz0iNTAsMjUwIDEwMCw1MCAxNTAsMjUwIiBmaWxsPSIjZTAwIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMiIvPjxyZWN0IHg9IjcwIiB5PSIyNTAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI1MCIgZmlsbD0iI2U0NzEyYiIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjIiLz48cmVjdCB4PSIyMTAiIHk9IjEwMCIgd2lkdGg9IjEwMCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiNkMzAiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PHBvbHlnb24gcG9pbnRzPSIyNTAsMTAwIDIzMCw1MCAyNzAsNTAiIGZpbGw9IiNmZGQiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+",
        uploadDate: "2026-01-01",
        description: "Initial project sketch"
      }
    ]
  },
  {
    id: "CON-002",
    clientName: "PSR Construction",
    clientAddress: "709 Woodcliff",
    clientCity: "Charlotte",
    clientState: "NC",
    clientZip: "28202",
    projectLocation: "709 woodcliff709",
    clientPhone: "",
    clientEmail: "",
    projectDescription: "Cabinet project",
    projectName: "709 Woodcliff",
    depositAmount: 7300,
    totalValue: 14600,
    startDate: "2026-01-05",
    dueDate: "2026-01-28",
    status: "pending",
    cabinetType: "Kitchen",
    material: "Wood",
    installationIncluded: true,
    additionalNotes: "",
    costTracking: {
      materials: [
        {
          id: "MAT-001",
          name: "Plywood Birch Prefinished 3/4\" 4x8 C2",
          unitPrice: 38.51,
          quantity: 25,
          unit: "EA",
          supplier: "Imeca Charlotte"
        },
        {
          id: "MAT-012",
          name: "Drawer Side 8\"x96\" 5/8\" Rubberwood Flat Edge UV",
          unitPrice: 21.65,
          quantity: 15,
          unit: "EA",
          supplier: "Atlantic Plywood"
        },
        {
          id: "MAT-025",
          name: "Blum Clip Top Hinge 110 Blumotion F-OL Inserta",
          unitPrice: 3.70,
          quantity: 55,
          unit: "EA",
          supplier: "Atlantic Plywood"
        },
        {
          id: "MAT-027",
          name: "Tandem Plus Blumotion 563H 18\" Full Ext Drawer Zinc",
          unitPrice: 16.97,
          quantity: 15,
          unit: "EA",
          supplier: "Atlantic Plywood"
        },
        {
          id: "MAT-028",
          name: "Tandem Plus Blumotion 563/9 Locking Device Left",
          unitPrice: 1.33,
          quantity: 15,
          unit: "EA",
          supplier: "Atlantic Plywood"
        },
        {
          id: "MAT-029",
          name: "Tandem Plus Blumotion 563/9 Locking Device Right",
          unitPrice: 1.33,
          quantity: 15,
          unit: "EA",
          supplier: "Atlantic Plywood"
        },
        {
          id: "MAT-030",
          name: "Blum Plates",
          unitPrice: 0.80,
          quantity: 55,
          unit: "EA",
          supplier: "Atlantic Plywood"
        },
        {
          id: "MAT-031",
          name: "Paint",
          unitPrice: 130.00,
          quantity: 5,
          unit: "unit",
          supplier: "Local"
        },
        {
          id: "MAT-032",
          name: "Primer",
          unitPrice: 130.00,
          quantity: 5,
          unit: "unit",
          supplier: "Local"
        }
      ],
      laborCost: {
        calculationMethod: "manual",
        amount: 3000,
        description: "Labor costs"
      },
      miscellaneous: [],
      profitMarginPercent: 35.0
    },
    expenses: [],
    paymentSchedule: [
      {
        id: "PAY-002-1",
        description: "50% Down Payment",
        amount: 7300,
        dueDate: "2026-01-05",
        status: "pending"
      },
      {
        id: "PAY-002-2",
        description: "25% First Installment",
        amount: 3650,
        dueDate: "2026-01-18",
        status: "pending"
      },
      {
        id: "PAY-002-3",
        description: "25% Final Payment",
        amount: 3650,
        dueDate: "2026-01-28",
        status: "pending"
      }
    ],
    attachments: [
      {
        id: "ATT-CON-002-1",
        fileName: "709 Woodcliff Design.png",
        fileData: "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Y1ZjUmMzMzMzMzMzMiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PHJlY3QgeD0iNjAiIHk9IjcwIiB3aWR0aD0iODAiIGhlaWdodD0iMTYwIiBmaWxsPSIjZGNhIiBzdHJva2U9IiMzMzMiIHN0cm9rZS13aWR0aD0iMyIvPjxyZWN0IHg9IjE2MCIgeT0iNzAiIHdpZHRoPSI4MCIgaGVpZ2h0PSIxNjAiIGZpbGw9IiNkY2EiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIzIi8+PHJlY3QgeD0iMjYwIiB5PSI3MCIgd2lkdGg9IjgwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2RjYSIgc3Ryb2tlPSIjMzMzIiBzdHJva2Utd2lkdGg9IjMiLz48Y2lyY2xlIGN4PSIxMDAiIGN5PSIxNTAiIHI9IjgiIGZpbGw9IiMzMzMiLz48Y2lyY2xlIGN4PSIyMDAiIGN5PSIxNTAiIHI9IjgiIGZpbGw9IiMzMzMiLz48Y2lyY2xlIGN4PSIzMDAiIGN5PSIxNTAiIHI9IjgiIGZpbGw9IiMzMzMiLz48L3N2Zz4=",
        uploadDate: "2026-01-05",
        description: "Woodcliff cabinet design"
      },
      {
        id: "ATT-CON-002-2",
        fileName: "Material Specs.pdf",
        fileData: "data:application/pdf;base64,JVBERi0xLjQKJeLjz9MNCjEgMCBvYmo8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PmVuZG9iagoyIDAgb2JqPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj5lbmRvYmoKMyAwIG9iajw8L1R5cGUvUGFnZS9QYXJlbnQgMiAwIFIvUmVzb3VyY2VzPDwvRm9udDwxIDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj5lbmRvYmoKNCAwIG9iajw8L0xlbmd0aCAxNDQ+PnN0cmVhbQpCVAovRjEgMTIgVGYKNTAgNzUwIFRkCihNYXRlcmlhbCBTcGVjaWZpY2F0aW9ucykgVGoKRVQKZW5kc3RyZWFtCmVuZG9iagovRjEgMSAwIG9iajw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+ZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDA5NyAwMDAwMCBuIAowMDAwMDAwMTczIDAwMDAwIG4gCjAwMDAwMDAyNjAgMDAwMDAgbiAKMDAwMDAwMDQ1MyAwMDAwMCBuIAp0cmFpbGVyPDwvU2l6ZSA1L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKNjU4CiUlRU9G",
        uploadDate: "2026-01-05",
        description: "Material specifications document"
      }
    ]
  },
  {
    id: "CON-003",
    clientName: "PRS Construction",
    clientAddress: "207 bellmeade Ct",
    clientCity: "Charlotte",
    clientState: "NC",
    clientZip: "28202",
    projectLocation: "207 bellmeade Ct Charlotte",
    clientPhone: "",
    clientEmail: "",
    projectDescription: "Cabinet project",
    projectName: "207 bellmeade Ct",
    depositAmount: 39000,
    totalValue: 78000,
    startDate: "2026-01-01",
    dueDate: "2026-01-09",
    status: "pending",
    cabinetType: "Kitchen",
    material: "Wood",
    installationIncluded: true,
    additionalNotes: "",
    costTracking: {
      materials: [
        {
          id: "MAT-001",
          name: "Materials",
          unitPrice: 25000,
          quantity: 1,
          unit: "lot",
          supplier: "Various"
        }
      ],
      laborCost: {
        calculationMethod: "manual",
        amount: 15000,
        description: "Labor costs"
      },
      miscellaneous: [],
      profitMarginPercent: 38.0
    },
    expenses: [],
    paymentSchedule: [
      {
        id: "PAY-003-1",
        description: "50% Down Payment",
        amount: 39000,
        dueDate: "2026-01-01",
        status: "pending"
      },
      {
        id: "PAY-003-2",
        description: "25% First Installment",
        amount: 19500,
        dueDate: "2026-01-04",
        status: "pending"
      },
      {
        id: "PAY-003-3",
        description: "25% Final Payment",
        amount: 19500,
        dueDate: "2026-01-09",
        status: "pending"
      }
    ],
    attachments: [],
    downPayments: [
      {
        id: "DP-003-1",
        amount: 21000,
        date: "2026-01-12",
        method: "wire_transfer",
        description: "First down payment - wire transfer"
      },
      {
        id: "DP-003-2",
        amount: 15000,
        date: "2025-11-26",
        method: "wire_transfer",
        description: "Second down payment - wire transfer"
      },
      {
        id: "DP-003-3",
        amount: 18000,
        date: "2026-01-11",
        method: "wire_transfer",
        description: "This week payment"
      }
    ]
  },
  {
    id: "CON-004",
    clientName: "Onnit Construction",
    clientAddress: "2125 mirow PL",
    clientCity: "Charlotte",
    clientState: "NC",
    clientZip: "",
    projectLocation: "",
    clientPhone: "",
    clientEmail: "",
    projectDescription: "Cabinet project",
    projectName: "",
    depositAmount: 23750,
    totalValue: 47500,
    startDate: "2026-01-01",
    dueDate: "2026-01-31",
    status: "pending",
    cabinetType: "Kitchen",
    material: "Wood",
    installationIncluded: true,
    additionalNotes: "",
    costTracking: {
      materials: [],
      laborCost: {
        calculationMethod: "hours",
        amount: 15000,
        hourlyRate: 50,
        hours: 300,
        description: "300 hrs fabrication, assembly, and preparation"
      },
      miscellaneous: [],
      profitMarginPercent: 0
    },
    expenses: [],
    paymentSchedule: [],
    attachments: [],
    downPayments: [
      {
        id: "DP-004-1",
        amount: 23750,
        date: "2026-01-14",
        method: "check",
        description: "Check #1243 - BOA (Bank of America)"
      }
    ]
  }
];

// Function to get materials from storage or defaults
const getMaterialsForContracts = (year: number): MaterialItem[] => {
  // Try to load materials from the Materials page storage
  const savedMaterials = getYearData<any[]>("materials", year, null);

  if (savedMaterials && savedMaterials.length > 0) {
    // Convert from Material format to MaterialItem format
    return savedMaterials.map(m => ({
      id: m.id,
      name: m.name,
      unitPrice: m.price,
      quantity: 0,
      unit: m.unit || "EA",
      supplier: m.supplier || ""
    }));
  }

  // Fallback to default materials
  return DEFAULT_MATERIALS.map(m => ({ ...m }));
};

export default function Contracts() {
  const { selectedYear } = useYear();
  const { toast } = useToast();

  // Helper function to ensure costTracking is always fully initialized
  const initializeCostTracking = (partial?: Partial<CostTracking>): CostTracking => {
    return {
      materials: partial?.materials || [],
      laborCost: {
        calculationMethod: partial?.laborCost?.calculationMethod ?? "manual",
        amount: partial?.laborCost?.amount ?? 0,
        description: partial?.laborCost?.description ?? "",
        dailyRate: partial?.laborCost?.dailyRate ?? 900,
        days: partial?.laborCost?.days ?? 0,
        monthlyRate: partial?.laborCost?.monthlyRate ?? 18000,
        months: partial?.laborCost?.months ?? 0,
        hourlyRate: partial?.laborCost?.hourlyRate ?? 50,
        hours: partial?.laborCost?.hours ?? 0,
      },
      miscellaneous: partial?.miscellaneous || [],
      profitMarginPercent: partial?.profitMarginPercent ?? 35,
    };
  };

  const getInitialContracts = () => {
    const saved = getYearData<Contract[]>("contracts", selectedYear, null);
    if (saved && saved.length > 0) {
      // Ensure all contracts have attachments and downPayments fields for backwards compatibility
      // Also merge downPayments and updated values from example data if available
      return saved.map(contract => {
        const exampleContract = exampleContracts.find(ex => ex.id === contract.id);
        return {
          ...contract,
          // Update totalValue and depositAmount from example data if example exists
          totalValue: exampleContract?.totalValue ?? contract.totalValue,
          depositAmount: exampleContract?.depositAmount ?? contract.depositAmount,
          attachments: contract.attachments || [],
          // Always use downPayments from example data if available, otherwise keep stored ones
          downPayments: exampleContract?.downPayments && exampleContract.downPayments.length > 0
            ? exampleContract.downPayments
            : (contract.downPayments || [])
        };
      });
    }

    // For 2026, load example contracts and save them
    if (selectedYear === 2026 && exampleContracts.length > 0) {
      saveYearData("contracts", selectedYear, exampleContracts);
      return exampleContracts;
    }

    return shouldUseExampleData(selectedYear) ? exampleContracts : [];
  };

  const [contracts, setContracts] = useState<Contract[]>(getInitialContracts());
  const [availableMaterials, setAvailableMaterials] = useState<MaterialItem[]>(getMaterialsForContracts(selectedYear));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingContractId, setEditingContractId] = useState<string | null>(null);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "in-progress" | "pending" | "completed">("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [budgetSummaryContractId, setBudgetSummaryContractId] = useState<string | null>(null);
  const [pdfSelectContractId, setPdfSelectContractId] = useState<string | null>(null);
  const [detailsContractId, setDetailsContractId] = useState<string | null>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorMaterials, setCalculatorMaterials] = useState<MaterialItem[]>([]);
  const [isDownPaymentModalOpen, setIsDownPaymentModalOpen] = useState(false);
  const [downPaymentForm, setDownPaymentForm] = useState<DownPayment>({
    id: "",
    amount: 0,
    date: "",
    method: "wire_transfer",
    description: ""
  });
  const [editingDownPaymentId, setEditingDownPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<Payment>({
    id: "",
    description: "",
    amount: 0,
    dueDate: "",
    status: "pending",
    paidDate: "",
    paymentMethod: "cash",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
    checkAttachment: "",
    checkNumber: "",
    creditCardLast4: "",
    transactionReference: "",
    receiptAttachment: "",
  });
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseForm, setExpenseForm] = useState<Expense>({
    id: "",
    invoiceNumber: "",
    vendor: "",
    amount: 0,
    purchaseDate: getTodayDate(),
    category: "Materials",
    description: "",
    notes: "",
    fileName: undefined,
  });
  const [formData, setFormData] = useState<FormData>({
    clientName: "",
    clientAddress: "",
    clientCity: "",
    clientState: "",
    clientZip: "",
    projectLocation: "",
    clientPhone: "",
    clientEmail: "",
    projectDescription: "",
    projectName: "",
    depositAmount: "",
    totalValue: "",
    startDate: "",
    dueDate: "",
    status: "pending",
    cabinetType: CABINET_TYPES[0],
    material: FINISHES[0],
    customFinish: "",
    installationIncluded: false,
    additionalNotes: "",
  });

  const [costTracking, setCostTracking] = useState<CostTracking>({
    materials: getMaterialsForContracts(selectedYear),
    laborCost: {
      calculationMethod: "manual",
      amount: 0,
      description: "",
      dailyRate: 900,
      days: 0,
      monthlyRate: 18000,
      months: 0,
      hourlyRate: 50,
      hours: 0,
    },
    miscellaneous: [],
    profitMarginPercent: 35,
  });

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

  // Reload contracts and materials when year changes
  useEffect(() => {
    setContracts(getInitialContracts());
    const freshMaterials = getMaterialsForContracts(selectedYear);
    setAvailableMaterials(freshMaterials);
    // Also update costTracking with fresh materials
    setCostTracking((prev) => ({
      ...prev,
      materials: freshMaterials
    }));
  }, [selectedYear]);

  // Ensure materials are loaded when modal opens
  useEffect(() => {
    if (isModalOpen && !isEditMode && (!costTracking.materials || costTracking.materials.length === 0)) {
      const freshMaterials = getMaterialsForContracts(selectedYear);
      setCostTracking((prev) => ({
        ...prev,
        materials: freshMaterials
      }));
    }
  }, [isModalOpen, isEditMode, selectedYear]);

  useEffect(() => {
    saveYearData("contracts", selectedYear, contracts);
  }, [contracts, selectedYear]);

  // Auto-save draft when form data or cost tracking changes
  useEffect(() => {
    // Auto-save whenever modal is open (all changes are saved)
    if (isModalOpen) {
      const timer = setTimeout(() => {
        const draft = { formData, costTracking };
        localStorage.setItem(`contract_draft_${selectedYear}`, JSON.stringify(draft));
      }, 500); // Debounce by 500ms to avoid excessive saving

      return () => clearTimeout(timer);
    }
  }, [formData, costTracking, isModalOpen, selectedYear]);

  // Load draft when modal opens
  useEffect(() => {
    if (isModalOpen && !isEditMode) {
      const savedDraft = localStorage.getItem(`contract_draft_${selectedYear}`);
      if (savedDraft) {
        try {
          const { formData: draftFormData, costTracking: draftCostTracking } = JSON.parse(savedDraft);
          // Merge draft with defaults to ensure no undefined fields
          const defaultFormData: FormData = {
            clientName: "",
            clientAddress: "",
            clientCity: "",
            clientState: "",
            clientZip: "",
            projectLocation: "",
            clientPhone: "",
            clientEmail: "",
            projectDescription: "",
            projectName: "",
            depositAmount: "",
            totalValue: "",
            startDate: "",
            dueDate: "",
            status: "pending",
            cabinetType: CABINET_TYPES[0],
            material: FINISHES[0],
            installationIncluded: false,
            additionalNotes: "",
          };
          setFormData({ ...defaultFormData, ...draftFormData });

          const defaultCostTracking = initializeCostTracking({
            materials: getMaterialsForContracts(selectedYear),
          });
          // Merge draft with defaults, handling nested objects properly
          setCostTracking(initializeCostTracking({
            ...draftCostTracking,
            materials: draftCostTracking?.materials || defaultCostTracking.materials,
          }));
        } catch (e) {
          // Draft is corrupted, ignore
        }
      }
    }
  }, [isModalOpen, isEditMode, selectedYear]);

  const totalValue = contracts.reduce((sum, c) => sum + c.totalValue, 0);
  const totalDeposits = contracts.reduce((sum, c) => sum + c.depositAmount, 0);
  const pendingPayments = totalValue - totalDeposits;

  const filteredContracts = contracts
    .filter((contract) => {
      const statusMatch = filterStatus === "all" || contract.status === filterStatus;

      let dateMatch = true;
      if (filterFromDate || filterToDate) {
        const dueDateParts = contract.dueDate.split('-');
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

      return statusMatch && dateMatch;
    })
    .sort((a, b) => {
      // Sort by dueDate in descending order (most recent first)
      const aParts = a.dueDate.split('-');
      const bParts = b.dueDate.split('-');
      const aDate = new Date(parseInt(aParts[0]), parseInt(aParts[1]) - 1, parseInt(aParts[2]));
      const bDate = new Date(parseInt(bParts[0]), parseInt(bParts[1]) - 1, parseInt(bParts[2]));
      return bDate.getTime() - aDate.getTime();
    });

  const handleFormChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-calculate 50% down payment when total value changes
      if (field === "totalValue" && value) {
        const downPayment = (parseFloat(value) * 0.5).toFixed(2);
        updated.depositAmount = downPayment;
      }

      return updated;
    });
  };

  const generateDefaultPaymentSchedule = (totalValue: number, startDate: string, dueDate: string, contractId?: string): Payment[] => {
    const downPayment = totalValue * 0.5;
    const installment = totalValue * 0.25;

    // Special case for CON-003 with specific due dates
    if (contractId === "CON-003") {
      return [
        {
          id: `PAY-${Date.now()}-1`,
          description: "50% Down Payment",
          amount: Math.round(downPayment * 100) / 100,
          dueDate: startDate,
          status: "pending",
        },
        {
          id: `PAY-${Date.now()}-2`,
          description: "25% First Installment",
          amount: Math.round(installment * 100) / 100,
          dueDate: "2026-01-17",
          status: "pending",
        },
        {
          id: `PAY-${Date.now()}-3`,
          description: "25% Final Payment",
          amount: Math.round(installment * 100) / 100,
          dueDate: "2026-01-27",
          status: "pending",
        },
      ];
    }

    // Calculate dates for installments (split across the contract duration)
    const start = new Date(startDate);
    const due = new Date(dueDate);
    const totalDays = (due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);

    return [
      {
        id: `PAY-${Date.now()}-1`,
        description: "50% Down Payment",
        amount: Math.round(downPayment * 100) / 100,
        dueDate: startDate,
        status: "pending",
      },
      {
        id: `PAY-${Date.now()}-2`,
        description: "25% First Installment",
        amount: Math.round(installment * 100) / 100,
        dueDate: new Date(start.getTime() + (totalDays / 2) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: "pending",
      },
      {
        id: `PAY-${Date.now()}-3`,
        description: "25% Final Payment",
        amount: Math.round(installment * 100) / 100,
        dueDate: dueDate,
        status: "pending",
      },
    ];
  };

  // Quick add contract with default values
  const handleQuickAddContract = () => {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const dueDate = futureDate.toISOString().split('T')[0];

    const contractId = `CON-${String(contracts.length + 1).padStart(3, "0")}`;
    const defaultValue = 10000;
    const defaultDeposit = 5000;

    const newContract: Contract = {
      id: contractId,
      clientName: "New Client",
      clientAddress: "",
      clientCity: "",
      clientState: "NC",
      clientZip: "",
      projectLocation: "",
      clientPhone: "",
      clientEmail: "",
      projectDescription: "Cabinet project",
      projectName: "New Project",
      depositAmount: defaultDeposit,
      totalValue: defaultValue,
      startDate: today,
      dueDate: dueDate,
      status: "pending",
      cabinetType: CABINET_TYPES[0],
      material: FINISHES[0],
      installationIncluded: true,
      additionalNotes: "",
      costTracking: initializeCostTracking(),
      paymentSchedule: generateDefaultPaymentSchedule(defaultValue, today, dueDate, contractId),
      attachments: [],
      downPayments: [],
    };

    setContracts([...contracts, newContract]);
  };

  const handleAddContract = () => {
    // Validate only essential required fields
    if (
      !formData.clientName.trim() ||
      !formData.projectName.trim() ||
      !formData.depositAmount ||
      !formData.totalValue ||
      !formData.startDate ||
      !formData.dueDate
    ) {
      alert("Please fill in required fields: Client Name, Project Name, Total Value, Deposit Amount, Start Date, and Due Date");
      return;
    }

    if (isEditMode) {
      const updatedContracts = contracts.map((contract) =>
        contract.id === editingContractId
          ? {
              ...contract,
              clientName: formData.clientName,
              clientAddress: formData.clientAddress,
              clientCity: formData.clientCity,
              clientState: formData.clientState,
              clientZip: formData.clientZip,
              projectLocation: formData.projectLocation,
              clientPhone: formData.clientPhone,
              clientEmail: formData.clientEmail,
              projectDescription: formData.projectDescription,
              projectName: formData.projectName,
              depositAmount: parseFloat(formData.depositAmount),
              totalValue: parseFloat(formData.totalValue),
              startDate: formData.startDate,
              dueDate: formData.dueDate,
              status: formData.status,
              cabinetType: formData.cabinetType,
              material: formData.material,
              customFinish: formData.customFinish,
              installationIncluded: formData.installationIncluded,
              additionalNotes: formData.additionalNotes,
              costTracking: costTracking,
              paymentSchedule: contract.paymentSchedule,
              attachments: contractAttachments,
              downPayments: contract.downPayments,
            }
          : contract
      );
      setContracts(updatedContracts);

      // Show success notification
      toast({
        title: "✅ Contract Updated",
        description: `${formData.projectName || editingContractId} has been updated successfully.`,
      });

      setIsEditMode(false);
      setEditingContractId(null);
    } else {
      const totalValue = parseFloat(formData.totalValue);
      const contractId = `CON-${String(contracts.length + 1).padStart(3, "0")}`;
      const newContract: Contract = {
        id: contractId,
        clientName: formData.clientName,
        clientAddress: formData.clientAddress,
        clientCity: formData.clientCity,
        clientState: formData.clientState,
        clientZip: formData.clientZip,
        projectLocation: formData.projectLocation,
        clientPhone: formData.clientPhone,
        clientEmail: formData.clientEmail,
        projectDescription: formData.projectDescription,
        projectName: formData.projectName,
        depositAmount: parseFloat(formData.depositAmount),
        totalValue: totalValue,
        startDate: formData.startDate,
        dueDate: formData.dueDate,
        status: formData.status,
        cabinetType: formData.cabinetType,
        material: formData.material,
        customFinish: formData.customFinish,
        installationIncluded: formData.installationIncluded,
        additionalNotes: formData.additionalNotes,
        costTracking: costTracking,
        paymentSchedule: generateDefaultPaymentSchedule(totalValue, formData.startDate, formData.dueDate, contractId),
        attachments: contractAttachments,
        downPayments: [],
      };
      setContracts([...contracts, newContract]);

      // Show success notification
      toast({
        title: "✅ Contract Created",
        description: `${formData.projectName} contract has been created successfully.`,
      });
    }

    setFormData({
      clientName: "",
      clientAddress: "",
      clientCity: "",
      clientState: "",
      clientZip: "",
      projectLocation: "",
      clientPhone: "",
      clientEmail: "",
      projectDescription: "",
      projectName: "",
      depositAmount: "",
      totalValue: "",
      startDate: "",
      dueDate: "",
      status: "pending",
      cabinetType: CABINET_TYPES[0],
      material: FINISHES[0],
      customFinish: "",
      installationIncluded: false,
      additionalNotes: "",
    });
    // Clear draft after saving
    localStorage.removeItem(`contract_draft_${selectedYear}`);
    setIsModalOpen(false);
  };

  const handleEditContract = (contract: Contract) => {
    setFormData({
      clientName: contract.clientName,
      clientAddress: contract.clientAddress,
      clientCity: contract.clientCity,
      clientState: contract.clientState,
      clientZip: contract.clientZip,
      projectLocation: contract.projectLocation,
      clientPhone: contract.clientPhone,
      clientEmail: contract.clientEmail,
      projectDescription: contract.projectDescription,
      projectName: contract.projectName,
      depositAmount: contract.depositAmount.toString(),
      totalValue: contract.totalValue.toString(),
      startDate: contract.startDate,
      dueDate: contract.dueDate,
      status: contract.status,
      cabinetType: contract.cabinetType,
      material: contract.material,
      customFinish: contract.customFinish || "",
      installationIncluded: contract.installationIncluded,
      additionalNotes: contract.additionalNotes,
    });
    // Ensure all costTracking fields are properly initialized with defaults
    setCostTracking(initializeCostTracking(contract.costTracking));
    setContractAttachments(contract.attachments || []);
    setEditingContractId(contract.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteContract = (contractId: string) => {
    if (window.confirm("Are you sure you want to delete this contract?")) {
      setContracts(contracts.filter((contract) => contract.id !== contractId));
    }
  };

  const handleOpenPaymentModal = (contractId: string, payment?: Payment) => {
    setSelectedContractId(contractId);
    if (payment) {
      setPaymentForm({
        id: payment.id,
        description: payment.description || "",
        amount: payment.amount || 0,
        dueDate: payment.dueDate || "",
        status: payment.status || "pending",
        paidDate: payment.paidDate || "",
        paymentMethod: payment.paymentMethod || "cash",
        bankName: payment.bankName || "",
        routingNumber: payment.routingNumber || "",
        accountNumber: payment.accountNumber || "",
        accountType: payment.accountType || "checking",
        checkAttachment: payment.checkAttachment || "",
        checkNumber: payment.checkNumber || "",
        creditCardLast4: payment.creditCardLast4 || "",
        transactionReference: payment.transactionReference || "",
        receiptAttachment: payment.receiptAttachment || "",
      });
      setEditingPaymentId(payment.id);
    } else {
      const contract = contracts.find((c) => c.id === contractId);
      const newPaymentId = `PAY-${Date.now()}`;
      setPaymentForm({
        id: newPaymentId,
        description: "",
        amount: 0,
        dueDate: contract?.dueDate || "",
        status: "pending",
        paidDate: "",
        paymentMethod: "cash",
        bankName: "",
        routingNumber: "",
        accountNumber: "",
        accountType: "checking",
        checkAttachment: "",
        checkNumber: "",
        creditCardLast4: "",
        transactionReference: "",
        receiptAttachment: "",
      });
      setEditingPaymentId(null);
    }
    setIsPaymentModalOpen(true);
  };

  const handleSavePayment = () => {
    console.log("💳 handleSavePayment called");
    console.log("📋 Payment form:", paymentForm);

    if (!paymentForm.description.trim() || !paymentForm.amount || !paymentForm.dueDate || !selectedContractId || !paymentForm.paymentMethod) {
      console.error("❌ Missing required payment details");
      alert("Please fill in all payment details (description, amount, due date, payment method)");
      return;
    }

    console.log("✅ Basic validation passed");

    // Payment method specific validation
    if (paymentForm.paymentMethod === "cash") {
      // Cash doesn't need additional info
      console.log("✅ Cash payment - no additional details needed");
    } else if (paymentForm.paymentMethod === "check") {
      // Check only needs check number (optional), no bank details needed
      console.log("✅ Check payment - no bank details needed");
    } else if (paymentForm.paymentMethod === "direct_deposit" || paymentForm.paymentMethod === "ach" || paymentForm.paymentMethod === "wire") {
      // Bank transfers require bank details
      if (!paymentForm.bankName?.trim() || !paymentForm.routingNumber?.trim() || !paymentForm.accountNumber?.trim() || !paymentForm.accountType) {
        console.error("❌ Missing bank transfer details");
        alert("Please fill in all bank details (bank name, routing number, account number, account type)");
        return;
      }
      console.log("✅ Bank transfer validation passed");
    } else if (paymentForm.paymentMethod === "credit_card" || paymentForm.paymentMethod === "debit_card") {
      // Card payments require card details
      if (!paymentForm.creditCardLast4?.trim() || !paymentForm.transactionReference?.trim()) {
        console.error("❌ Missing card details");
        alert("Please fill in all card details (last 4 digits, transaction/authorization code)");
        return;
      }
      console.log("✅ Card payment validation passed");
    }

    const updatedContracts = contracts.map((contract) =>
      contract.id === selectedContractId
        ? {
            ...contract,
            paymentSchedule: editingPaymentId
              ? contract.paymentSchedule.map((p) =>
                  p.id === editingPaymentId ? paymentForm : p
                )
              : [...contract.paymentSchedule, paymentForm],
          }
        : contract
    );

    setContracts(updatedContracts);

    // Save to localStorage
    try {
      saveYearData("contracts", selectedYear, updatedContracts);
      console.log("✅ Payment saved to localStorage");
    } catch (error) {
      console.error("❌ Error saving to localStorage:", error);
    }

    // Show success notification
    const action = editingPaymentId ? "Updated" : "Added";
    toast({
      title: "✅ Success",
      description: `${action} payment: ${paymentForm.description}`,
    });

    // Reset form and close modal
    setIsPaymentModalOpen(false);
    setPaymentForm({
      id: "",
      description: "",
      amount: 0,
      dueDate: "",
      status: "pending",
      paidDate: "",
      paymentMethod: "cash",
      bankName: "",
      routingNumber: "",
      accountNumber: "",
      accountType: "checking",
      checkAttachment: "",
      checkNumber: "",
      creditCardLast4: "",
      transactionReference: "",
      receiptAttachment: ""
    });
    setEditingPaymentId(null);
    setSelectedContractId(null);

    console.log("✅ handleSavePayment COMPLETED SUCCESSFULLY");
  };

  const handleDeletePayment = (contractId: string, paymentId: string) => {
    if (window.confirm("Are you sure you want to delete this payment?")) {
      setContracts(
        contracts.map((contract) =>
          contract.id === contractId
            ? {
                ...contract,
                paymentSchedule: contract.paymentSchedule.filter((p) => p.id !== paymentId),
              }
            : contract
        )
      );
    }
  };

  const handleSaveExpense = (contractId: string) => {
    if (!expenseForm.invoiceNumber.trim() || !expenseForm.vendor.trim() || !expenseForm.amount || !expenseForm.purchaseDate) {
      alert("Please fill in all required fields");
      return;
    }

    setContracts(
      contracts.map((contract) =>
        contract.id === contractId
          ? {
              ...contract,
              expenses: editingExpenseId
                ? contract.expenses.map((e) =>
                    e.id === editingExpenseId ? expenseForm : e
                  )
                : [...contract.expenses, { ...expenseForm, id: generateShortId('EXP') }],
            }
          : contract
      )
    );

    setExpenseForm({
      id: "",
      invoiceNumber: "",
      vendor: "",
      amount: 0,
      purchaseDate: getTodayDate(),
      category: "Materials",
      description: "",
      notes: "",
      fileName: undefined,
    });
    setEditingExpenseId(null);
  };

  const handleAddExpenseToBills = (contractId: string, expense: Expense) => {
    // Create a bill ID that shows it's an expense from the contract (e.g., EXP-CON-001)
    const billId = `EXP-${contractId}`;
    const bill = {
      id: billId,
      category: "Materials",
      vendor: expense.vendor,
      amount: expense.amount,
      dueDate: expense.purchaseDate,
      description: expense.description,
      status: "pending" as const,
      contractId: contractId,
      invoiceNumber: expense.invoiceNumber,
    };

    // Save to year-based storage so Bills page can access it
    const existingBills = getYearData<any[]>("contractExpenseBills", selectedYear, []);
    const updatedBills = existingBills.some((b: any) => b.id === billId)
      ? existingBills.map((b: any) => b.id === billId ? bill : b)
      : [...existingBills, bill];
    saveYearData("contractExpenseBills", selectedYear, updatedBills);

    alert(`Expense added to Bills! You can now set the payment method in the Bills page.`);
  };

  const handleDeleteExpense = (contractId: string, expenseId: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      setContracts(
        contracts.map((contract) =>
          contract.id === contractId
            ? {
                ...contract,
                expenses: contract.expenses.filter((e) => e.id !== expenseId),
              }
            : contract
        )
      );
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const fileData = event.target?.result as string;
        const newAttachment: ContractAttachment = {
          id: `ATT-${Date.now()}`,
          fileName: file.name,
          fileData: fileData,
          uploadDate: getTodayDate(),
          description: "",
        };
        setContractAttachments([...contractAttachments, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
  };

  const deleteAttachment = (attachmentId: string) => {
    setContractAttachments(contractAttachments.filter(att => att.id !== attachmentId));
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

  const generateCabinetInstallationPDF = (contract: Contract) => {
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
    pdf.text(`Name: ${contract.clientName}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Address: ${contract.clientAddress}, ${contract.clientCity}, ${contract.clientState} ${contract.clientZip}`, margin, yPosition, { maxWidth: contentWidth });
    yPosition += lineHeight + 2;
    pdf.text(`Phone: ${contract.clientPhone}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Email: ${contract.clientEmail}`, margin, yPosition);
    yPosition += 15;

    // Project Information
    pdf.setFont(undefined, "bold");
    pdf.text("PROJECT DETAILS", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.text(`Project: ${contract.projectName}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Description: ${contract.projectDescription}`, margin, yPosition, { maxWidth: contentWidth });
    yPosition += lineHeight + 2;
    pdf.text(`Location: ${contract.projectLocation}`, margin, yPosition, { maxWidth: contentWidth });
    yPosition += 15;

    // Cabinet Specifications
    pdf.setFont(undefined, "bold");
    pdf.text("CABINET SPECIFICATIONS", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.text(`Type: ${contract.cabinetType}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Finish: ${contract.material}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Installation: ${contract.installationIncluded ? "Yes" : "No"}`, margin, yPosition);
    yPosition += lineHeight;
    if (contract.additionalNotes) {
      pdf.text(`Notes: ${contract.additionalNotes}`, margin, yPosition, { maxWidth: contentWidth });
      yPosition += lineHeight + 2;
    }
    yPosition += 10;

    // Material Costs (Internal)
    const materialCost = contract.costTracking.materials.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0);
    const miscCost = contract.costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0);

    pdf.setFont(undefined, "bold");
    pdf.text("MATERIAL LIST", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");

    if (contract.costTracking.materials.length > 0) {
      contract.costTracking.materials.forEach((material) => {
        if (material.quantity > 0) {
          const cost = material.quantity * material.unitPrice;
          const predefinedMaterial = availableMaterials.find(m => m.id === material.id);
          const supplier = material.supplier || predefinedMaterial?.supplier;

          // Material name on first line
          pdf.setFontSize(8);
          const nameLines = pdf.splitTextToSize(`${material.name}`, contentWidth - 5);
          nameLines.forEach((line: string) => {
            pdf.text(line, margin + 5, yPosition);
            yPosition += lineHeight - 1;
          });

          // Quantity, price, and supplier on next line
          const detailsLine = `${material.quantity} ${material.unit} @ $${material.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} = $${cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}${supplier ? ` [${supplier}]` : ""}`;
          const detailsLines = pdf.splitTextToSize(detailsLine, contentWidth - 10);
          detailsLines.forEach((line: string) => {
            pdf.text(line, margin + 10, yPosition);
            yPosition += lineHeight - 1;
          });

          yPosition += 2;
        }
      });
    }

    yPosition += 8;
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text(`Total Material Cost: $${materialCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, yPosition);
    yPosition += lineHeight + 4;

    // Labor Cost
    pdf.setFont(undefined, "bold");
    pdf.text("LABOR", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);
    pdf.text(`Method: ${contract.costTracking.laborCost.calculationMethod}`, margin + 3, yPosition);
    yPosition += lineHeight;
    const descLines = pdf.splitTextToSize(`Description: ${contract.costTracking.laborCost.description}`, contentWidth - 5);
    descLines.forEach((line: string) => {
      pdf.text(line, margin + 3, yPosition);
      yPosition += lineHeight;
    });
    pdf.setFont(undefined, "bold");
    pdf.text(`Amount: $${contract.costTracking.laborCost.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin + 3, yPosition);
    yPosition += lineHeight + 5;

    // Misc Costs
    if (miscCost > 0) {
      pdf.setFont(undefined, "bold");
      pdf.text("MISCELLANEOUS COSTS", margin, yPosition);
      yPosition += lineHeight;
      pdf.setFont(undefined, "normal");

      contract.costTracking.miscellaneous.forEach((item) => {
        const line = `${item.description}: $${item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
        pdf.text(line, margin + 5, yPosition);
        yPosition += lineHeight;
      });
      yPosition += 5;
    }

    // Cost Summary
    const totalCosts = materialCost + contract.costTracking.laborCost.amount + miscCost;
    const profit = contract.totalValue - totalCosts;
    const profitMargin = contract.totalValue > 0 ? (profit / contract.totalValue) * 100 : 0;

    // Add separator line
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, margin + contentWidth, yPosition);
    yPosition += lineHeight + 2;

    pdf.setFont(undefined, "bold");
    pdf.setFontSize(11);
    pdf.text("COST SUMMARY", margin, yPosition);
    yPosition += lineHeight + 2;

    pdf.setFontSize(10);
    pdf.setFont(undefined, "normal");
    pdf.text(`Contract Value: $${contract.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin + 3, yPosition);
    yPosition += lineHeight;

    pdf.text(`Total Costs: $${totalCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin + 3, yPosition);
    yPosition += lineHeight + 2;

    pdf.setFont(undefined, "bold");
    pdf.setFontSize(11);
    // Green for profit, red for loss
    if (profit >= 0) {
      pdf.setTextColor(34, 139, 34); // Dark green
    } else {
      pdf.setTextColor(220, 20, 60); // Crimson red
    }
    pdf.text(`Profit: $${profit.toLocaleString(undefined, { maximumFractionDigits: 2 })} (${profitMargin.toFixed(1)}%)`, margin + 3, yPosition);
    pdf.setTextColor(0, 0, 0); // Reset color

    // Add all attachments (images, maps, PDFs, documents, etc.)
    if (contract.attachments && contract.attachments.length > 0) {
      // Start new page for attachments
      pdf.addPage();
      addLogoToPageTop(pdf, pageWidth);
      yPosition = 30;

      pdf.setFont(undefined, "bold");
      pdf.setFontSize(14);
      pdf.text("DESIGN & CONTRACT ATTACHMENTS", margin, yPosition);
      yPosition += 15;

      pdf.setFont(undefined, "normal");
      pdf.setFontSize(10);

      // Add each attachment
      contract.attachments.forEach((attachment, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          addLogoToPageTop(pdf, pageWidth);
          yPosition = 30;
        }

        // Add attachment title
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
        pdf.text(`${index + 1}. ${attachment.fileName}`, margin, yPosition);
        yPosition += 8;

        // Check if it's an image and try to embed it
        const isImage = attachment.fileData.startsWith('data:image/');

        if (isImage) {
          const imageFormat = getImageFormatFromDataURI(attachment.fileData);

          if (imageFormat === null) {
            // SVG is not supported by jsPDF - show placeholder
            pdf.setFont(undefined, "normal");
            pdf.setFontSize(9);
            pdf.text(`[SVG Image: ${attachment.fileName} - Not supported in PDF]`, margin, yPosition);
            yPosition += 8;
          } else {
            try {
              const imgWidth = pageWidth - 2 * margin;
              const imgHeight = 100; // Fixed height for images
              pdf.addImage(attachment.fileData, imageFormat, margin, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 10;
            } catch (error) {
              console.error(`Failed to add image ${attachment.fileName}:`, error);
              pdf.setFont(undefined, "normal");
              pdf.setFontSize(9);
              pdf.text(`[Image: ${attachment.fileName} - Unable to display]`, margin, yPosition);
              yPosition += 10;
            }
          }
        } else {
          // For non-image files, show file info
          pdf.setFont(undefined, "normal");
          pdf.setFontSize(9);
          const ext = attachment.fileName.split('.').pop()?.toUpperCase() || 'FILE';
          pdf.text(`[${ext} Document: ${attachment.fileName}]`, margin, yPosition);
          yPosition += 8;
        }

        yPosition += 5;
      });
    }

    pdf.save(`${contract.id}-Cabinet-Installation.pdf`);
  };

  const generateClientAgreementPDF = (contract: Contract) => {
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

    // Client Information
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text("CLIENT INFORMATION", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);

    pdf.text(`Name: ${contract.clientName}`, margin, yPosition);
    yPosition += lineHeight;
    const clientAddress = `${contract.clientAddress}, ${contract.clientCity}, ${contract.clientState} ${contract.clientZip}`;
    const clientAddrLines = pdf.splitTextToSize(`Address: ${clientAddress}`, contentWidth);
    clientAddrLines.forEach((line: string) => {
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });
    pdf.text(`Phone: ${contract.clientPhone}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Email: ${contract.clientEmail}`, margin, yPosition);
    yPosition += 15;

    // Project Information
    pdf.setFont(undefined, "bold");
    pdf.setFontSize(10);
    pdf.text("PROJECT DETAILS", margin, yPosition);
    yPosition += lineHeight;
    pdf.setFont(undefined, "normal");
    pdf.setFontSize(9);

    const projectNameLines = pdf.splitTextToSize(`Project: ${contract.projectName}`, contentWidth);
    projectNameLines.forEach((line: string) => {
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    const descLines = pdf.splitTextToSize(`Description: ${contract.projectDescription}`, contentWidth);
    descLines.forEach((line: string) => {
      pdf.text(line, margin, yPosition);
      yPosition += lineHeight;
    });

    const locLines = pdf.splitTextToSize(`Location: ${contract.projectLocation}`, contentWidth);
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

    pdf.text(`Type: ${contract.cabinetType}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Finish: ${contract.material}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Installation: ${contract.installationIncluded ? "Yes" : "No"}`, margin, yPosition);
    yPosition += lineHeight;

    if (contract.additionalNotes) {
      const noteLines = pdf.splitTextToSize(`Notes: ${contract.additionalNotes}`, contentWidth);
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

    pdf.text(`Total Contract Value: $${contract.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Deposit Due: $${contract.depositAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, yPosition);
    yPosition += 15;

    // Payment Schedule
    if (contract.paymentSchedule.length > 0) {
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(10);
      pdf.text("PAYMENT SCHEDULE", margin, yPosition);
      yPosition += lineHeight;
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(9);

      contract.paymentSchedule.forEach((payment, index) => {
        const dueDate = new Date(payment.dueDate).toLocaleDateString();
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
        if (payment.status === "paid" && payment.paymentMethod) {
          const methodText = `Payment Method: ${payment.paymentMethod === "check" ? "Check" : payment.paymentMethod === "direct_deposit" ? "Direct Deposit" : payment.paymentMethod === "bank_transfer" ? "Bank Transfer" : payment.paymentMethod === "wire_transfer" ? "Wire Transfer" : payment.paymentMethod === "credit_card" ? "Credit Card" : "Cash"}${payment.checkNumber ? ` #${payment.checkNumber}` : ""}`;
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
      `- Work will commence on ${formatDateString(contract.startDate)}`,
      `- Expected completion date is ${formatDateString(contract.dueDate)}`,
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
    if (contract.attachments && contract.attachments.length > 0) {
      // Start new page for attachments
      pdf.addPage();
      addLogoToPageTop(pdf, pageWidth);
      yPosition = 30;

      pdf.setFont(undefined, "bold");
      pdf.setFontSize(14);
      pdf.text("DESIGN & CONTRACT ATTACHMENTS", margin, yPosition);
      yPosition += 15;

      pdf.setFont(undefined, "normal");
      pdf.setFontSize(10);

      // Add each attachment
      contract.attachments.forEach((attachment, index) => {
        // Check if we need a new page
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          addLogoToPageTop(pdf, pageWidth);
          yPosition = 30;
        }

        // Add attachment title
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
        pdf.text(`${index + 1}. ${attachment.fileName}`, margin, yPosition);
        yPosition += 8;

        // Check if it's an image and try to embed it
        const isImage = attachment.fileData.startsWith('data:image/');

        if (isImage) {
          const imageFormat = getImageFormatFromDataURI(attachment.fileData);

          if (imageFormat === null) {
            // SVG is not supported by jsPDF - show placeholder
            pdf.setFont(undefined, "normal");
            pdf.setFontSize(9);
            pdf.text(`[SVG Image: ${attachment.fileName} - Not supported in PDF]`, margin, yPosition);
            yPosition += 8;
          } else {
            try {
              const imgWidth = pageWidth - 2 * margin;
              const imgHeight = 100; // Fixed height for images
              pdf.addImage(attachment.fileData, imageFormat, margin, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 10;
            } catch (error) {
              console.error(`Failed to add image ${attachment.fileName}:`, error);
              pdf.setFont(undefined, "normal");
              pdf.setFontSize(9);
              pdf.text(`[Image: ${attachment.fileName} - Unable to display]`, margin, yPosition);
              yPosition += 10;
            }
          }
        } else {
          // For non-image files, show file info
          pdf.setFont(undefined, "normal");
          pdf.setFontSize(9);
          const ext = attachment.fileName.split('.').pop()?.toUpperCase() || 'FILE';
          pdf.text(`[${ext} Document: ${attachment.fileName}]`, margin, yPosition);
          yPosition += 8;
        }

        yPosition += 5;
      });
    }

    pdf.save(`${contract.id}-Client-Agreement.pdf`);
  };

  const generatePDF = (contract: Contract, type: "cabinet" | "client") => {
    if (type === "cabinet") {
      generateCabinetInstallationPDF(contract);
    } else {
      generateClientAgreementPDF(contract);
    }
  };

  const generateInvoicePDF = (contract: Contract) => {
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
    pdf.text(`${contract.clientName}`, margin, yPosition);
    yPosition += lineHeight;
    if (contract.clientAddress) {
      pdf.text(`${contract.clientAddress}`, margin, yPosition);
      yPosition += lineHeight;
    }
    if (contract.clientCity || contract.clientState || contract.clientZip) {
      pdf.text(`${contract.clientCity || ""}${contract.clientCity && contract.clientState ? ", " : ""}${contract.clientState || ""} ${contract.clientZip || ""}`.trim(), margin, yPosition);
      yPosition += lineHeight;
    }
    if (contract.clientPhone) {
      pdf.text(`Phone: ${contract.clientPhone}`, margin, yPosition);
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
    pdf.text(`Project: ${contract.projectName}`, margin, yPosition);
    yPosition += lineHeight;
    pdf.text(`Location: ${contract.projectLocation}`, margin, yPosition);
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
    pdf.text(`$${contract.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin + 100, yPosition, { align: "right" });
    yPosition += lineHeight + 8;

    // Down Payments Section
    if (contract.downPayments && contract.downPayments.length > 0) {
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
      pdf.text("Method", margin + 40, yPosition);
      pdf.text("Amount", margin + 90, yPosition, { align: "right" });
      yPosition += lineHeight + 4;

      // Separator line for table
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, yPosition, margin + contentWidth, yPosition);
      yPosition += lineHeight + 3;

      // Payment rows - sort by date (earliest first)
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(9);
      let totalDownPayments = 0;

      const sortedPayments = [...contract.downPayments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      sortedPayments.forEach((payment) => {
        // Format date as M/D/YYYY to avoid timezone issues
        const [year, month, day] = payment.date.split('-');
        const paymentDate = `${parseInt(month)}/${parseInt(day)}/${year}`;

        // For checks, extract check number from description; otherwise use method label
        let methodLabel = payment.method.replace(/_/g, " ").toUpperCase();
        if (payment.method === "check" && payment.description) {
          // Extract "Check #1243" from description like "Check #1243 - BOA (Bank of America)"
          const checkMatch = payment.description.match(/Check #\d+/);
          if (checkMatch) {
            methodLabel = checkMatch[0];
          }
        }

        const amountText = `$${payment.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

        pdf.text(paymentDate, margin, yPosition);
        pdf.text(methodLabel, margin + 40, yPosition);
        pdf.text(amountText, margin + 90, yPosition, { align: "right" });

        totalDownPayments += payment.amount;
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
      const totalPaymentText = `$${totalDownPayments.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      pdf.text(totalPaymentText, margin + 90, yPosition, { align: "right" });
      yPosition += lineHeight + 8;

      // Balance Due
      const balanceDue = contract.totalValue - totalDownPayments;
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(10);
      if (balanceDue > 0) {
        pdf.setTextColor(220, 20, 60); // Red for amount due
      } else if (balanceDue < 0) {
        pdf.setTextColor(34, 139, 34); // Green for overpayment
      } else {
        pdf.setTextColor(0, 0, 0); // Black if zero
      }
      pdf.text("Balance Due:", margin, yPosition);
      const balanceText = `$${Math.abs(balanceDue).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
      pdf.text(balanceText, margin + 90, yPosition, { align: "right" });
      pdf.setTextColor(0, 0, 0); // Reset color
    } else {
      // No down payments
      yPosition += 10;
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(10);
      pdf.text("No payments recorded yet", margin, yPosition);
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
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsEditMode(false);
    setEditingContractId(null);
    setTermsAccepted(false);
    setFormData({
      clientName: "",
      clientAddress: "",
      clientCity: "",
      clientState: "",
      clientZip: "",
      projectLocation: "",
      clientPhone: "",
      clientEmail: "",
      projectDescription: "",
      projectName: "",
      depositAmount: "",
      totalValue: "",
      startDate: "",
      dueDate: "",
      status: "pending",
      cabinetType: CABINET_TYPES[0],
      material: FINISHES[0],
      customFinish: "",
      installationIncluded: false,
      additionalNotes: "",
    });
    setCostTracking({
      materials: getMaterialsForContracts(selectedYear),
      laborCost: {
        calculationMethod: "manual",
        amount: 0,
        description: "",
        dailyRate: 900,
        days: 0,
        monthlyRate: 18000,
        months: 0,
        hourlyRate: 50,
        hours: 0,
      },
      miscellaneous: [],
      profitMarginPercent: 35,
    });
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
        pdf.text(`${idx + 1}. ${contract.id} - ${contract.projectName}`, margin, yPosition);
        yPosition += lineHeight;

        // Contract details
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(9);

        pdf.text(`Client: ${contract.clientName}`, margin + 5, yPosition);
        yPosition += lineHeight;
        pdf.text(`Status: ${contract.status.replace("-", " ")}`, margin + 5, yPosition);
        yPosition += lineHeight;
        pdf.text(`Value: $${contract.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} | Deposit: $${contract.depositAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, margin + 5, yPosition);
        yPosition += lineHeight;
        pdf.text(`Start: ${formatDateString(contract.startDate)} | Due: ${formatDateString(contract.dueDate)}`, margin + 5, yPosition);
        yPosition += lineHeight;

        if (contract.paymentSchedule.length > 0) {
          pdf.text(`Payments: ${contract.paymentSchedule.length}`, margin + 5, yPosition);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Contracts</h1>
          <p className="text-slate-600 mt-1">Handle client contracts, deposits, payment schedules, and project details</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCalculatorOpen(true)}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            💡 Material Calculator
          </Button>
          <Button
            onClick={printAllContracts}
            className="gap-2 bg-slate-600 hover:bg-slate-700"
            disabled={contracts.length === 0}
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button
            onClick={() => {
              // Clear any saved draft to start fresh
              localStorage.removeItem(`contract_draft_${selectedYear}`);
              setIsEditMode(false);
              setEditingContractId(null);
              setFormData({
                clientName: "",
                clientAddress: "",
                clientCity: "",
                clientState: "NC",
                clientZip: "",
                projectLocation: "",
                clientPhone: "",
                clientEmail: "",
                projectDescription: "",
                projectName: "",
                depositAmount: "",
                totalValue: "",
                startDate: "",
                dueDate: "",
                status: "pending",
                cabinetType: CABINET_TYPES[0],
                material: FINISHES[0],
                customFinish: "",
                installationIncluded: false,
                additionalNotes: "",
              });
              setCostTracking(initializeCostTracking());
              setContractAttachments([]);
              setTermsAccepted(false);
              setIsModalOpen(true);
            }}
            className="gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Contract
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
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    placeholder="e.g., Denver Home Renovations LLC"
                    value={formData.clientName ?? ""}
                    onChange={(e) => handleFormChange("clientName", e.target.value)}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectName">Project Name *</Label>
                  <Input
                    id="projectName"
                    placeholder="e.g., Kitchen Cabinet Upgrade"
                    value={formData.projectName ?? ""}
                    onChange={(e) => handleFormChange("projectName", e.target.value)}
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectDescription">Project Description</Label>
                <Input
                  id="projectDescription"
                  placeholder="Describe the project details"
                  value={formData.projectDescription ?? ""}
                  onChange={(e) => handleFormChange("projectDescription", e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <h3 className="font-semibold text-slate-900">Client Address</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="clientAddress">Street Address</Label>
                <Input
                  id="clientAddress"
                  placeholder="e.g., 1234 Oak Street"
                  value={formData.clientAddress ?? ""}
                  onChange={(e) => handleFormChange("clientAddress", e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientCity">City</Label>
                  <Input
                    id="clientCity"
                    placeholder="e.g., Denver"
                    value={formData.clientCity ?? ""}
                    onChange={(e) => handleFormChange("clientCity", e.target.value)}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientState">State</Label>
                  <Input
                    id="clientState"
                    placeholder="e.g., CO"
                    maxLength="2"
                    value={formData.clientState ?? ""}
                    onChange={(e) => handleFormChange("clientState", e.target.value.toUpperCase())}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientZip">ZIP Code</Label>
                  <Input
                    id="clientZip"
                    placeholder="e.g., 80202"
                    value={formData.clientZip ?? ""}
                    onChange={(e) => handleFormChange("clientZip", e.target.value)}
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="projectLocation">Project Location / Installation Address</Label>
                <Input
                  id="projectLocation"
                  placeholder="Leave blank if same as client address"
                  value={formData.projectLocation ?? ""}
                  onChange={(e) => handleFormChange("projectLocation", e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-2 border-t pt-4">
                <h3 className="font-semibold text-slate-900">Client Contact</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Phone</Label>
                  <Input
                    id="clientPhone"
                    placeholder="e.g., (303) 555-0101"
                    value={formData.clientPhone ?? ""}
                    onChange={(e) => handleFormChange("clientPhone", e.target.value)}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Email</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="e.g., contact@example.com"
                    value={formData.clientEmail ?? ""}
                    onChange={(e) => handleFormChange("clientEmail", e.target.value)}
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
                  <Select value={formData.cabinetType ?? ""} onValueChange={(value) => handleFormChange("cabinetType", value)}>
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
                    value={formData.customFinish ?? ""}
                    onChange={(e) => handleFormChange("customFinish", e.target.value)}
                    className="border-slate-300"
                  />
                  <p className="text-xs text-slate-500">Describe the specific finish, color, sheen level, or any special customization</p>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  id="installationIncluded"
                  type="checkbox"
                  checked={formData.installationIncluded}
                  onChange={(e) => handleFormChange("installationIncluded", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 cursor-pointer"
                />
                <Label htmlFor="installationIncluded" className="cursor-pointer">
                  Installation Included
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalNotes">Specifications</Label>
                <textarea
                  id="additionalNotes"
                  placeholder="Add any special notes or requirements for this project..."
                  value={formData.additionalNotes ?? ""}
                  onChange={(e) => handleFormChange("additionalNotes", e.target.value)}
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
                        const images = contractAttachments.filter(att => isImageFile(att.fileName));
                        const others = contractAttachments.filter(att => !isImageFile(att.fileName));

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
                                        src={att.fileData}
                                        alt={att.fileName}
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
                                        <span className="text-lg flex-shrink-0">{getFileIcon(att.fileName)}</span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-slate-900 truncate">{att.fileName}</p>
                                          <p className="text-xs text-slate-500">{new Date(att.uploadDate).toLocaleDateString()}</p>
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
                    onClick={() => setCostTracking({ ...costTracking, laborCost: { ...costTracking.laborCost, calculationMethod: "manual" } })}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      costTracking.laborCost.calculationMethod === "manual"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    Manual Entry
                  </button>
                  <button
                    type="button"
                    onClick={() => setCostTracking({ ...costTracking, laborCost: { ...costTracking.laborCost, calculationMethod: "daily" } })}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      costTracking.laborCost.calculationMethod === "daily"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    Daily Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setCostTracking({ ...costTracking, laborCost: { ...costTracking.laborCost, calculationMethod: "hours" } })}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      costTracking.laborCost.calculationMethod === "hours"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    Hours Rate
                  </button>
                  <button
                    type="button"
                    onClick={() => setCostTracking({ ...costTracking, laborCost: { ...costTracking.laborCost, calculationMethod: "monthly" } })}
                    className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                      costTracking.laborCost.calculationMethod === "monthly"
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                    }`}
                  >
                    Monthly Payment
                  </button>
                </div>
              </div>

              {costTracking.laborCost.calculationMethod === "manual" && (
                <div className="space-y-2">
                  <Label htmlFor="laborAmount">Labor Cost ($) *</Label>
                  <Input
                    id="laborAmount"
                    type="number"
                    placeholder="e.g., 5000.00"
                    value={String(costTracking.laborCost.amount ?? 0)}
                    onChange={(e) =>
                      setCostTracking({
                        ...costTracking,
                        laborCost: { ...costTracking.laborCost, amount: parseFloat(e.target.value) || 0 },
                      })
                    }
                    className="border-slate-300"
                    step="0.01"
                    min="0"
                  />
                </div>
              )}

              {costTracking.laborCost.calculationMethod === "daily" && (
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
                      value={String(costTracking.laborCost.days ?? 0)}
                      onChange={(e) => {
                        const days = parseFloat(e.target.value) || 0;
                        setCostTracking({
                          ...costTracking,
                          laborCost: {
                            ...costTracking.laborCost,
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

              {costTracking.laborCost.calculationMethod === "hours" && (
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
                      value={String(costTracking.laborCost.hours ?? 0)}
                      onChange={(e) => {
                        const hours = parseFloat(e.target.value) || 0;
                        setCostTracking({
                          ...costTracking,
                          laborCost: {
                            ...costTracking.laborCost,
                            hourlyRate: 50,
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

              {costTracking.laborCost.calculationMethod === "monthly" && (
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
                      value={String(costTracking.laborCost.months ?? 0)}
                      onChange={(e) => {
                        const months = parseFloat(e.target.value) || 0;
                        setCostTracking({
                          ...costTracking,
                          laborCost: {
                            ...costTracking.laborCost,
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
                <p className="text-sm font-semibold text-slate-900">Labor Cost: ${((costTracking?.laborCost?.amount) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="laborDescription">Labor Description / Notes (Optional)</Label>
                <textarea
                  id="laborDescription"
                  placeholder="e.g., Installation, finishing, custom carpentry work..."
                  value={costTracking.laborCost.description ?? ""}
                  onChange={(e) =>
                    setCostTracking({
                      ...costTracking,
                      laborCost: { ...costTracking.laborCost, description: e.target.value },
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
                      const total = material.quantity * material.unitPrice;
                      const predefinedMaterial = availableMaterials.find(m => m.id === material.id);
                      const supplier = material.supplier || predefinedMaterial?.supplier;
                      return (
                        <div key={material.id} className="flex items-center gap-3 p-3 bg-white rounded border border-slate-200">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{material.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-600">${material.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}/{material.unit}</span>
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
                        ${((costTracking.materials || []).reduce((sum, m) => sum + m.quantity * m.unitPrice, 0)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
                            unitPrice: 0,
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
                            const total = material.quantity * material.unitPrice;
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
                                  value={String(material.unitPrice ?? 0)}
                                  onChange={(e) => {
                                    const newMaterials = costTracking.materials.map((m) =>
                                      m.id === material.id ? { ...m, unitPrice: parseFloat(e.target.value) || 0 } : m
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
                        ${costTracking.materials.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
                                const newMisc = costTracking.miscellaneous.map((m) =>
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
                            ${item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setCostTracking({
                                ...costTracking,
                                miscellaneous: costTracking.miscellaneous.filter((m) => m.id !== item.id),
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
                      const newMiscItem: MiscellaneousItem = {
                        id: `MISC-${Date.now()}`,
                        description: "",
                        amount: 0,
                      };
                      setCostTracking({
                        ...costTracking,
                        miscellaneous: [...costTracking.miscellaneous, newMiscItem],
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
                    <span className="font-semibold">${costTracking.materials.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Labor Costs:</span>
                    <span className="font-semibold">${costTracking.laborCost.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-700">Miscellaneous Costs:</span>
                    <span className="font-semibold">${costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="text-slate-900 font-bold">Total Project Costs:</span>
                    <span className="text-lg font-bold text-blue-600">
                      ${(
                        ((costTracking?.materials) || []).reduce((sum, m) => sum + m.quantity * m.unitPrice, 0) +
                        ((costTracking?.laborCost?.amount) || 0) +
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
                  <Label htmlFor="totalValue">Total Contract Value *</Label>
                  <Input
                    id="totalValue"
                    type="number"
                    placeholder="0.00"
                    value={String(formData.totalValue ?? 0)}
                    onChange={(e) => handleFormChange("totalValue", e.target.value)}
                    className="border-slate-300"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Deposit Amount *</Label>
                  <Input
                    id="depositAmount"
                    type="number"
                    placeholder="0.00"
                    value={String(formData.depositAmount ?? 0)}
                    onChange={(e) => handleFormChange("depositAmount", e.target.value)}
                    className="border-slate-300"
                    step="0.01"
                    min="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate ?? ""}
                    onChange={(e) => handleFormChange("startDate", e.target.value)}
                    className="border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate ?? ""}
                    onChange={(e) => handleFormChange("dueDate", e.target.value)}
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
                          <span className="text-xs text-slate-600">${material.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}/{material.unit}</span>
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
                      const total = material.quantity * material.unitPrice;
                      return (
                        <div key={material.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-200">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-900">{material.name}</p>
                            <p className="text-xs text-slate-600">${material.unitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}/{material.unit}</p>
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
                          ${calculatorMaterials.reduce((sum, m) => sum + (m.quantity * m.unitPrice), 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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

      {contracts.length > 0 && (
        <>
          {(() => {
            const overdueContracts = contracts.filter((c) => isOverdue(c.dueDate));
            if (overdueContracts.length > 0) {
              return (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-red-900">{overdueContracts.length} Overdue Contract{overdueContracts.length !== 1 ? "s" : ""}</p>
                      <p className="text-sm text-red-800">
                        {overdueContracts.map((c) => `${c.id} (${c.clientName})`).join(", ")}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            return null;
          })()}

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle>Active Contracts</CardTitle>
              <CardDescription>
                All client contracts with deposit and payment schedule tracking
              </CardDescription>
              <div className="flex gap-4 mt-4 flex-wrap">
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="w-40 border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex gap-3 items-center">
                  <Label className="text-sm text-slate-600 whitespace-nowrap">Due Date Range:</Label>
                  <Input
                    type="date"
                    placeholder="From"
                    value={filterFromDate ?? ""}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                    className="border-slate-300"
                  />
                  <span className="text-slate-500 text-sm">to</span>
                  <Input
                    type="date"
                    placeholder="To"
                    value={filterToDate ?? ""}
                  onChange={(e) => setFilterToDate(e.target.value)}
                    className="border-slate-300"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">ID</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Client</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Project</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Value</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Deposit</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Due Date</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Status</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map((contract, idx) => (
                      <tr key={contract.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="p-3 text-slate-700 font-medium whitespace-nowrap">
                          <button
                            onClick={() => setDetailsContractId(contract.id)}
                            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer font-semibold"
                            title="View contract details"
                          >
                            {contract.id}
                          </button>
                        </td>
                        <td className="p-3 text-slate-700 text-xs whitespace-nowrap">{contract.clientName}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{contract.projectName}</td>
                        <td className="p-3 text-slate-700 font-medium whitespace-nowrap">${contract.totalValue.toLocaleString()}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">${contract.depositAmount.toLocaleString()}</td>
                        <td className={`p-3 whitespace-nowrap ${isOverdue(contract.dueDate) ? "text-red-600 font-semibold" : "text-slate-700"}`}>
                          {formatDateString(contract.dueDate)}
                          {isOverdue(contract.dueDate) && " ⚠️"}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusBadge(contract.status)}`}>
                            {contract.status.replace("-", " ")}
                          </span>
                        </td>
                        <td className="p-3 flex gap-2">
                          <button
                            onClick={() => setSelectedContractId(contract.id)}
                            className="text-green-600 hover:text-green-800 hover:bg-green-50 p-2 rounded transition-colors"
                            title="View payment schedule"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setPdfSelectContractId(contract.id)}
                            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-2 rounded transition-colors"
                            title="Download PDF"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditContract(contract)}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                            title="Edit contract"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteContract(contract.id)}
                            className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                            title="Delete contract"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {selectedContractId && (
            <Card className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payment Schedule</CardTitle>
                  <CardDescription>
                    {contracts.find((c) => c.id === selectedContractId)?.projectName} - {contracts.find((c) => c.id === selectedContractId)?.clientName}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => handleOpenPaymentModal(selectedContractId)}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                  Add Payment
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contracts
                    .find((c) => c.id === selectedContractId)
                    ?.paymentSchedule.map((payment) => (
                      <div
                        key={payment.id}
                        className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-slate-900">{payment.description}</p>
                            <p className="text-sm text-slate-600">
                              Due: {formatDateString(payment.dueDate)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-slate-900">${payment.amount.toLocaleString()}</p>
                            <span
                              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                payment.status === "paid"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {payment.status}
                            </span>
                          </div>
                        </div>

                        {payment.status === "paid" && (
                          <div className="bg-white p-3 rounded border border-slate-200 space-y-2">
                            {payment.paidDate && (
                              <p className="text-sm text-slate-600">
                                <span className="font-semibold">Paid Date:</span> {payment.paidDate ? formatDateString(payment.paidDate) : '-'}
                              </p>
                            )}
                            {payment.paymentMethod && (
                              <p className="text-sm text-slate-600">
                                <span className="font-semibold">Method:</span>{" "}
                                {payment.paymentMethod === "check" && "Check"}
                                {payment.paymentMethod === "direct_deposit" && "Direct Deposit"}
                                {payment.paymentMethod === "bank_transfer" && "Bank Transfer"}
                                {payment.paymentMethod === "wire_transfer" && "Wire Transfer"}
                                {payment.paymentMethod === "credit_card" && "Credit Card"}
                                {payment.paymentMethod === "debit_card" && "Debit Card"}
                                {payment.paymentMethod === "cash" && "Cash"}
                                {payment.checkNumber && ` (#${payment.checkNumber})`}
                                {payment.creditCardLast4 && ` (****${payment.creditCardLast4})`}
                              </p>
                            )}
                            {payment.transactionReference && (
                              <p className="text-sm text-slate-600">
                                <span className="font-semibold">Reference:</span> {payment.transactionReference}
                              </p>
                            )}
                            {payment.receiptAttachment && (
                              <p className="text-sm text-blue-600">
                                📎 Receipt attached: {payment.receiptAttachment}
                              </p>
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
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {isPaymentModalOpen && selectedContractId && (
        <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPaymentId ? "Edit Payment" : "Add Payment"}</DialogTitle>
              <DialogDescription>
                {editingPaymentId ? "Update payment details and method" : "Add a new payment to the schedule with payment method"}
              </DialogDescription>
            </DialogHeader>
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
                  value={paymentForm.dueDate ?? ""}
                  onChange={(e) => setPaymentForm({ ...paymentForm, dueDate: e.target.value })}
                  className="border-slate-300"
                />
              </div>

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
                      value={paymentForm.paidDate ?? ""}
                      onChange={(e) => setPaymentForm({ ...paymentForm, paidDate: e.target.value || "" })}
                      className="border-slate-300"
                    />
                  </div>

                  {paymentForm.paymentMethod !== "cash" && (
                    <div className="space-y-2">
                      <Label htmlFor="transactionRef">Transaction Reference</Label>
                      <Input
                        id="transactionRef"
                        placeholder="e.g., TXN-001, Check #123, Auth Code"
                        value={paymentForm.transactionReference ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
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
                      onChange={(e) => setPaymentForm({ ...paymentForm, receiptAttachment: e.target.files?.[0]?.name || "" })}
                      className="border-slate-300"
                    />
                    <p className="text-xs text-slate-500">
                      Upload payment receipt, confirmation email, or bank statement
                    </p>
                  </div>
                </>
              )}

              <div className="border-t pt-4">
                <h3 className="font-semibold text-slate-900 mb-3">Payment Method *</h3>
                <Select value={paymentForm.paymentMethod ?? "cash"} onValueChange={(value) => setPaymentForm({ ...paymentForm, paymentMethod: value as any })}>
                  <SelectTrigger className="border-slate-300">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="debit_card">Debit Card</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(paymentForm.paymentMethod === "direct_deposit" || paymentForm.paymentMethod === "bank_transfer" || paymentForm.paymentMethod === "wire_transfer") && (
                <>
                  <div className="bg-slate-50 p-4 rounded space-y-3 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">Bank Information *</p>

                    <div className="space-y-2">
                      <Label htmlFor="bankName">Bank Name *</Label>
                      <Input
                        id="bankName"
                        placeholder="e.g., Wells Fargo, Chase Bank"
                        value={paymentForm.bankName ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="routingNumber">Routing Number *</Label>
                      <Input
                        id="routingNumber"
                        placeholder="9-digit routing number"
                        value={paymentForm.routingNumber ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, routingNumber: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number *</Label>
                      <Input
                        id="accountNumber"
                        type="password"
                        placeholder="Account number (will be masked)"
                        value={paymentForm.accountNumber ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountType">Account Type *</Label>
                      <Select value={paymentForm.accountType ?? "checking"} onValueChange={(value) => setPaymentForm({ ...paymentForm, accountType: value as any })}>
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

              {paymentForm.paymentMethod === "check" && (
                <>
                  <div className="bg-slate-50 p-4 rounded space-y-3 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">Check Information *</p>

                    <div className="space-y-2">
                      <Label htmlFor="checkNumber">Check Number *</Label>
                      <Input
                        id="checkNumber"
                        placeholder="e.g., 1001"
                        value={paymentForm.checkNumber ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, checkNumber: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkBankName">Bank Name *</Label>
                      <Input
                        id="checkBankName"
                        placeholder="e.g., Wells Fargo, Chase Bank"
                        value={paymentForm.bankName ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, bankName: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkRoutingNumber">Routing Number</Label>
                      <Input
                        id="checkRoutingNumber"
                        placeholder="9-digit routing number"
                        value={paymentForm.routingNumber ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, routingNumber: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkAccountNumber">Account Number</Label>
                      <Input
                        id="checkAccountNumber"
                        type="password"
                        placeholder="Account number (will be masked)"
                        value={paymentForm.accountNumber ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, accountNumber: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkAttachment">Attach Check Image (optional)</Label>
                      <Input
                        id="checkAttachment"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setPaymentForm({ ...paymentForm, checkAttachment: e.target.files?.[0]?.name || "" })}
                        className="border-slate-300"
                      />
                      <p className="text-xs text-slate-500">
                        Upload a photo of a sample check or bank letter
                      </p>
                    </div>
                  </div>
                </>
              )}

              {paymentForm.paymentMethod === "credit_card" && (
                <>
                  <div className="bg-slate-50 p-4 rounded space-y-3 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">Credit Card Information *</p>

                    <div className="space-y-2">
                      <Label htmlFor="creditCardLast4">Last 4 Digits of Card *</Label>
                      <Input
                        id="creditCardLast4"
                        placeholder="e.g., 4242"
                        value={paymentForm.creditCardLast4 ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, creditCardLast4: e.target.value })}
                        className="border-slate-300"
                        maxLength="4"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transactionReference">Transaction/Authorization Code *</Label>
                      <Input
                        id="transactionReference"
                        placeholder="e.g., TXN-1234567890"
                        value={paymentForm.transactionReference ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>
                  </div>
                </>
              )}

              {paymentForm.paymentMethod === "debit_card" && (
                <>
                  <div className="bg-slate-50 p-4 rounded space-y-3 border border-slate-200">
                    <p className="text-sm font-semibold text-slate-700">Debit Card Information *</p>

                    <div className="space-y-2">
                      <Label htmlFor="debitCardLast4">Last 4 Digits of Card *</Label>
                      <Input
                        id="debitCardLast4"
                        placeholder="e.g., 4242"
                        value={paymentForm.creditCardLast4 ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, creditCardLast4: e.target.value })}
                        className="border-slate-300"
                        maxLength="4"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="debitTransactionReference">Transaction/Authorization Code *</Label>
                      <Input
                        id="debitTransactionReference"
                        placeholder="e.g., TXN-1234567890"
                        value={paymentForm.transactionReference ?? ""}
                        onChange={(e) => setPaymentForm({ ...paymentForm, transactionReference: e.target.value })}
                        className="border-slate-300"
                      />
                    </div>
                  </div>
                </>
              )}
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
                    dueDate: "",
                    status: "pending",
                    paymentMethod: "cash",
                    bankName: "",
                    routingNumber: "",
                    accountNumber: "",
                    accountType: "checking",
                    checkAttachment: "",
                    checkNumber: "",
                    creditCardLast4: "",
                    transactionReference: "",
                    receiptAttachment: ""
                  });
                  setEditingPaymentId(null);
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

      {budgetSummaryContractId && (
        <Dialog open={!!budgetSummaryContractId} onOpenChange={(open) => !open && setBudgetSummaryContractId(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">Budget Summary</DialogTitle>
            {(() => {
              const contract = contracts.find((c) => c.id === budgetSummaryContractId);
              if (!contract) return null;

              const materialCost = contract.costTracking.materials.reduce((sum, m) => sum + m.quantity * m.unitPrice, 0);
              const laborCost = contract.costTracking.laborCost.amount;
              const miscellaneousCost = contract.costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0);
              const totalCosts = materialCost + laborCost + miscellaneousCost;
              const projectedProfit = contract.totalValue - totalCosts;
              const profitMargin = contract.totalValue > 0 ? (projectedProfit / contract.totalValue) * 100 : 0;

              const handlePrintBudgetSummary = () => {
                const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
                const margin = 20;
                const pageWidth = pdf.internal.pageSize.getWidth();
                const pageHeight = pdf.internal.pageSize.getHeight();
                let yPosition = 20;
                const lineHeight = 6;
                const contentWidth = pageWidth - 2 * margin;

                // Header
                pdf.setFontSize(16);
                pdf.setFont(undefined, "bold");
                pdf.text("BUDGET SUMMARY", margin, yPosition);
                yPosition += 8;

                pdf.setFontSize(10);
                pdf.setFont(undefined, "normal");
                pdf.text(`Contract ID: ${contract.id}`, margin, yPosition);
                yPosition += lineHeight;
                pdf.text(`Project: ${contract.projectName}`, margin, yPosition);
                yPosition += lineHeight;
                pdf.text(`Client: ${contract.clientName}`, margin, yPosition);
                yPosition += lineHeight;
                pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
                yPosition += 15;

                // Labor Costs
                pdf.setFont(undefined, "bold");
                pdf.text("💼 Labor Costs", margin, yPosition);
                yPosition += lineHeight;
                pdf.setFont(undefined, "normal");
                pdf.text(contract.costTracking.laborCost.description, margin + 3, yPosition);
                yPosition += lineHeight;
                pdf.text(`$${laborCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin + 3, yPosition);
                yPosition += lineHeight;
                if (contract.costTracking.laborCost.dailyRate && contract.costTracking.laborCost.days) {
                  pdf.setFontSize(8);
                  pdf.text(`$${contract.costTracking.laborCost.dailyRate} × ${contract.costTracking.laborCost.days} days`, margin + 5, yPosition);
                  yPosition += lineHeight;
                  pdf.setFontSize(10);
                }
                yPosition += 10;

                // Material Costs
                pdf.setFont(undefined, "bold");
                pdf.text("🛠️ Material Costs", margin, yPosition);
                yPosition += lineHeight;
                pdf.setFont(undefined, "normal");

                const materialsWithQty = contract.costTracking.materials.filter((m) => m.quantity > 0);
                if (materialsWithQty.length > 0) {
                  materialsWithQty.forEach((material) => {
                    const cost = material.quantity * material.unitPrice;
                    const predefinedMaterial = availableMaterials.find(m => m.id === material.id);
                    const supplier = material.supplier || predefinedMaterial?.supplier;
                    const supplierText = supplier ? ` (${supplier})` : "";
                    const text = `${material.name} (${material.quantity} ${material.unit}) - $${cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}${supplierText}`;
                    pdf.text(text, margin + 3, yPosition, { maxWidth: contentWidth - 3 });
                    yPosition += lineHeight;
                  });
                  yPosition += 5;
                  pdf.setFont(undefined, "bold");
                  pdf.text(`Total Material Cost: $${materialCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, yPosition);
                } else {
                  pdf.text("No materials added", margin + 3, yPosition);
                }
                yPosition += lineHeight + 10;

                // Miscellaneous
                if (contract.costTracking.miscellaneous.length > 0) {
                  pdf.setFont(undefined, "bold");
                  pdf.text("📋 Miscellaneous Costs", margin, yPosition);
                  yPosition += lineHeight;
                  pdf.setFont(undefined, "normal");

                  contract.costTracking.miscellaneous.forEach((item) => {
                    pdf.text(`${item.description}: $${item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin + 3, yPosition);
                    yPosition += lineHeight;
                  });
                  yPosition += 5;
                  pdf.setFont(undefined, "bold");
                  pdf.text(`Total Miscellaneous: $${miscellaneousCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, yPosition);
                  yPosition += lineHeight + 10;
                }

                // Summary
                pdf.setFont(undefined, "bold");
                pdf.setFontSize(12);
                pdf.text("EXPENSE SUMMARY", margin, yPosition);
                yPosition += 10;

                pdf.setFontSize(10);
                pdf.setFont(undefined, "normal");
                const summaryItems = [
                  [`Contract Total:`, `$${contract.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
                  [`Material Costs:`, `$${materialCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
                  [`Labor Costs:`, `$${laborCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
                  [`Miscellaneous Costs:`, `$${miscellaneousCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
                  [`Total Expenses:`, `$${totalCosts.toLocaleString(undefined, { maximumFractionDigits: 2 })}`],
                ];

                summaryItems.forEach(([label, value]) => {
                  pdf.text(label, margin + 5, yPosition);
                  pdf.text(value, margin + 80, yPosition);
                  yPosition += lineHeight;
                });

                yPosition += 10;
                pdf.setFont(undefined, "bold");
                pdf.setFontSize(11);
                const profitColor = projectedProfit >= 0 ? [0, 100, 0] : [200, 0, 0];
                pdf.setTextColor(...profitColor);
                pdf.text(`Projected Profit: $${projectedProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, yPosition);
                yPosition += lineHeight;
                pdf.text(`Profit Margin: ${profitMargin.toFixed(1)}%`, margin, yPosition);

                pdf.save(`${contract.id}-Budget-Summary.pdf`);
              };

              return (
                <>
                  <DialogHeader className="flex flex-row items-center justify-between">
                    <div>
                      <DialogTitle>Budget Summary - {contract.id}</DialogTitle>
                      <DialogDescription>
                        {contract.projectName} | {contract.clientName}
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
                              <span className="text-slate-700">{contract.costTracking.laborCost.description}</span>
                              <span className="font-semibold text-slate-900">${laborCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                            </div>
                            {contract.costTracking.laborCost.calculationMethod === "daily" && contract.costTracking.laborCost.dailyRate && contract.costTracking.laborCost.days && (
                              <p className="text-xs text-slate-600 mt-1">
                                ${contract.costTracking.laborCost.dailyRate} × {contract.costTracking.laborCost.days} days
                              </p>
                            )}
                            {contract.costTracking.laborCost.calculationMethod === "monthly" && contract.costTracking.laborCost.monthlyRate && contract.costTracking.laborCost.months && (
                              <p className="text-xs text-slate-600 mt-1">
                                ${contract.costTracking.laborCost.monthlyRate} × {contract.costTracking.laborCost.months} months
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="border-t pt-4 space-y-3">
                          <div className="font-semibold text-slate-900">🛠️ Material Costs</div>
                          <div className="space-y-2">
                            {contract.costTracking.materials.filter((m) => m.quantity > 0).length > 0 ? (
                              <div className="space-y-2">
                                {contract.costTracking.materials
                                  .filter((m) => m.quantity > 0)
                                  .map((material) => {
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
                                        ${(material.quantity * material.unitPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}
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

                        {contract.costTracking.miscellaneous.length > 0 && (
                          <div className="border-t pt-4 space-y-3">
                            <div className="font-semibold text-slate-900">📋 Miscellaneous Costs</div>
                            <div className="space-y-2">
                              {contract.costTracking.miscellaneous.map((item) => (
                                <div key={item.id} className="flex justify-between items-center p-2 bg-slate-50 rounded border border-slate-200 text-sm">
                                  <span className="text-slate-700">{item.description}</span>
                                  <span className="font-semibold text-slate-900">
                                    ${item.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
                                ${contract.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
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
                              <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                              <Input
                                id="invoiceNumber"
                                placeholder="INV-001"
                                value={expenseForm.invoiceNumber ?? ""}
                                onChange={(e) => setExpenseForm({ ...expenseForm, invoiceNumber: e.target.value })}
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
                              <Label htmlFor="purchaseDate">Purchase Date *</Label>
                              <Input
                                id="purchaseDate"
                                type="date"
                                value={expenseForm.purchaseDate ?? ""}
                                onChange={(e) => setExpenseForm({ ...expenseForm, purchaseDate: e.target.value })}
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

                        {contract.expenses.length > 0 ? (
                          <div className="space-y-2">
                            {contract.expenses.map((expense) => (
                              <div key={expense.id} className="flex justify-between items-start p-3 bg-white rounded border border-slate-200 text-sm">
                                <div className="flex-1">
                                  <p className="font-semibold text-slate-900">{expense.invoiceNumber} - {expense.vendor}</p>
                                  <p className="text-xs text-slate-600 mt-1">
                                    {expense.description}
                                  </p>
                                  <div className="flex gap-2 mt-1 text-xs">
                                    <span className="bg-slate-100 px-2 py-1 rounded">{expense.category}</span>
                                    <span className="text-slate-600">{formatDateString(expense.purchaseDate)}</span>
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end gap-2">
                                  <div>
                                    <p className="font-bold text-slate-900">${expense.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{contracts.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Contract Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">${totalValue.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Pending Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">${pendingPayments.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {pdfSelectContractId && (
        <Dialog open={!!pdfSelectContractId} onOpenChange={(open) => !open && setPdfSelectContractId(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Select PDF to Download</DialogTitle>
              <DialogDescription>
                Choose which document you want to download
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Button
                onClick={() => {
                  const contract = contracts.find((c) => c.id === pdfSelectContractId);
                  if (contract) {
                    generatePDF(contract, "cabinet");
                  }
                  setPdfSelectContractId(null);
                }}
                variant="outline"
                className="w-full justify-start border-slate-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Cabinet Installation
              </Button>
              <Button
                onClick={() => {
                  const contract = contracts.find((c) => c.id === pdfSelectContractId);
                  if (contract) {
                    generatePDF(contract, "client");
                  }
                  setPdfSelectContractId(null);
                }}
                variant="outline"
                className="w-full justify-start border-slate-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Client Agreement
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {detailsContractId && (() => {
        const contract = contracts.find((c) => c.id === detailsContractId);
        if (!contract) return null;

        const paidPayments = contract.paymentSchedule.filter((p) => p.status === "paid");
        const pendingPaymentCount = contract.paymentSchedule.filter((p) => p.status === "pending").length;
        const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalRemaining = contract.paymentSchedule.reduce((sum, p) => sum + (p.status === "pending" ? p.amount : 0), 0);

        return (
          <Sheet open={!!detailsContractId} onOpenChange={(open) => !open && setDetailsContractId(null)}>
            <SheetContent className="w-full sm:w-[600px] max-h-[90vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-2xl">{contract.id}</SheetTitle>
                <SheetDescription>{contract.projectName}</SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Client Information */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Client Information</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-slate-600">Name:</span> <span className="font-medium">{contract.clientName}</span></div>
                    <div><span className="text-slate-600">Email:</span> <span className="font-medium">{contract.clientEmail}</span></div>
                    <div><span className="text-slate-600">Phone:</span> <span className="font-medium">{contract.clientPhone}</span></div>
                    <div><span className="text-slate-600">Address:</span> <span className="font-medium">{contract.clientAddress}, {contract.clientCity}, {contract.clientState} {contract.clientZip}</span></div>
                  </div>
                </div>

                {/* Project Details */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Project Details</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-slate-600">Location:</span> <span className="font-medium">{contract.projectLocation}</span></div>
                    <div><span className="text-slate-600">Cabinet Type:</span> <span className="font-medium">{contract.cabinetType}</span></div>
                    <div><span className="text-slate-600">Finish Type:</span> <span className="font-medium">{contract.material}</span></div>
                    {contract.customFinish && (
                      <div><span className="text-slate-600">Finish Customization:</span> <span className="font-medium text-blue-700">{contract.customFinish}</span></div>
                    )}
                    <div><span className="text-slate-600">Installation:</span> <span className="font-medium">{contract.installationIncluded ? "Included" : "Not Included"}</span></div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Financial Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-600">Total Value:</span> <span className="font-bold text-slate-900">${contract.totalValue.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Deposit:</span> <span className="font-medium">${contract.depositAmount.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Amount Paid:</span> <span className="font-medium text-green-600">${totalPaid.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">Amount Remaining:</span> <span className="font-medium text-orange-600">${totalRemaining.toLocaleString()}</span></div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Timeline</h3>
                  <div className="space-y-2 text-sm">
                    <div><span className="text-slate-600">Start Date:</span> <span className="font-medium">{formatDateString(contract.startDate)}</span></div>
                    <div><span className="text-slate-600">Due Date:</span> <span className="font-medium">{formatDateString(contract.dueDate)}</span></div>
                    <div><span className="text-slate-600">Status:</span> <span className={`inline-block px-2 py-1 rounded text-xs font-medium mt-1 ${getStatusBadge(contract.status)}`}>{contract.status.replace("-", " ")}</span></div>
                  </div>
                </div>

                {/* Payment Schedule Overview */}
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-slate-900 mb-3">Payment Schedule</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Payments:</span>
                      <span className="font-medium">{contract.paymentSchedule.length}</span>
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

                {/* Down Payments */}
                <div className="border-b pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-slate-900">Down Payments</h3>
                    <Button
                      size="sm"
                      onClick={() => {
                        setDownPaymentForm({
                          id: `DP-${generateShortId()}`,
                          amount: 0,
                          date: "",
                          method: "wire_transfer",
                          description: ""
                        });
                        setEditingDownPaymentId(null);
                        setIsDownPaymentModalOpen(true);
                      }}
                      className="h-8 gap-2 bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="w-3 h-3" />
                      Add Down Payment
                    </Button>
                  </div>

                  {contract.downPayments && contract.downPayments.length > 0 ? (
                    <div className="space-y-2">
                      {contract.downPayments.map((dp) => (
                        <div key={dp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200 text-sm">
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">${dp.amount.toLocaleString()}</div>
                            <div className="text-xs text-slate-600">{new Date(dp.date).toLocaleDateString()} • {dp.method.replace("_", " ")}</div>
                            {dp.description && <div className="text-xs text-slate-600 mt-1">{dp.description}</div>}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              const downPayment = contract.downPayments!.find(p => p.id === dp.id);
                              if (downPayment) {
                                setDownPaymentForm(downPayment);
                                setEditingDownPaymentId(dp.id);
                                setIsDownPaymentModalOpen(true);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                          >
                            Edit
                          </Button>
                        </div>
                      ))}
                      <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-slate-900">Total Down Payments:</span>
                              <span className="font-bold text-green-600">${(contract.downPayments.reduce((sum, dp) => sum + dp.amount, 0)).toLocaleString()}</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => generateInvoicePDF(contract)}
                            className="ml-3 bg-green-600 hover:bg-green-700"
                            title="Generate invoice PDF"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Invoice
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 italic">No down payments recorded yet</p>
                  )}
                </div>

                {/* Additional Info */}
                {contract.costTracking.materials.length > 0 && (
                  <div className="border-b pb-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Materials</h3>
                    <div className="text-sm text-slate-600">
                      <span>{contract.costTracking.materials.length} material items added</span>
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
                      const images = contract.attachments.filter(att => isImageFile(att.fileName));
                      const others = contract.attachments.filter(att => !isImageFile(att.fileName));

                      return (
                        <div className="space-y-4">
                          {/* Image Gallery */}
                          {images.length > 0 && (
                            <div>
                              <p className="text-xs text-slate-600 font-medium mb-2">Design Images ({images.length})</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {images.map((att) => (
                                  <button
                                    key={att.id}
                                    onClick={() => setLightboxImage(att)}
                                    className="group relative aspect-square rounded border border-slate-300 overflow-hidden hover:border-blue-500 transition-colors cursor-pointer bg-slate-100"
                                    title={att.fileName}
                                  >
                                    <img
                                      src={att.fileData}
                                      alt={att.fileName}
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
                                {others.map((att) => (
                                  <div key={att.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded border border-slate-200 hover:bg-slate-100 transition-colors">
                                    <span className="text-xl flex-shrink-0">{getFileIcon(att.fileName)}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-slate-900 truncate">{att.fileName}</p>
                                      <p className="text-xs text-slate-500">{new Date(att.uploadDate).toLocaleDateString()}</p>
                                    </div>
                                    <a
                                      href={att.fileData}
                                      download={att.fileName}
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
                  onClick={() => {
                    setPdfSelectContractId(contract.id);
                    setDetailsContractId(null);
                  }}
                  variant="outline"
                  className="flex-1 border-slate-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  PDF
                </Button>
                <Button
                  onClick={() => {
                    generateInvoicePDF(contract);
                    setDetailsContractId(null);
                  }}
                  variant="outline"
                  className="flex-1 border-slate-300"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Invoice
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

      {/* Down Payment Modal */}
      <Dialog open={isDownPaymentModalOpen} onOpenChange={setIsDownPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingDownPaymentId ? "Edit Down Payment" : "Add Down Payment"}</DialogTitle>
            <DialogDescription>
              Record a down payment for the selected contract
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="downPaymentAmount">Amount *</Label>
              <Input
                id="downPaymentAmount"
                type="number"
                placeholder="0.00"
                value={String(downPaymentForm.amount || "")}
                onChange={(e) =>
                  setDownPaymentForm({
                    ...downPaymentForm,
                    amount: parseFloat(e.target.value) || 0
                  })
                }
                className="border-slate-300"
                step="0.01"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="downPaymentDate">Date *</Label>
              <Input
                id="downPaymentDate"
                type="date"
                value={downPaymentForm.date}
                onChange={(e) =>
                  setDownPaymentForm({
                    ...downPaymentForm,
                    date: e.target.value
                  })
                }
                className="border-slate-300"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="downPaymentMethod">Payment Method *</Label>
              <Select
                value={downPaymentForm.method}
                onValueChange={(value) =>
                  setDownPaymentForm({
                    ...downPaymentForm,
                    method: value as DownPayment["method"]
                  })
                }
              >
                <SelectTrigger className="border-slate-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="downPaymentDescription">Description (Optional)</Label>
              <textarea
                id="downPaymentDescription"
                placeholder="e.g., Wire transfer for down payment"
                value={downPaymentForm.description || ""}
                onChange={(e) =>
                  setDownPaymentForm({
                    ...downPaymentForm,
                    description: e.target.value
                  })
                }
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  if (!downPaymentForm.amount || !downPaymentForm.date) {
                    alert("Please fill in Amount and Date");
                    return;
                  }

                  const currentContract = contracts.find(c => c.id === detailsContractId);
                  if (!currentContract) return;

                  const updatedContracts = contracts.map(contract =>
                    contract.id === detailsContractId
                      ? {
                          ...contract,
                          downPayments: editingDownPaymentId
                            ? (contract.downPayments || []).map(dp =>
                                dp.id === editingDownPaymentId ? downPaymentForm : dp
                              )
                            : [...(contract.downPayments || []), { ...downPaymentForm, id: `DP-${Date.now()}` }]
                        }
                      : contract
                  );

                  setContracts(updatedContracts);

                  // Auto-generate invoice when down payment is recorded
                  const updatedContract = updatedContracts.find(c => c.id === detailsContractId);
                  if (updatedContract && !editingDownPaymentId) {
                    // Small delay to ensure state is updated
                    setTimeout(() => {
                      generateInvoicePDF(updatedContract);

                      // Show success message
                      toast({
                        title: "✅ Down Payment Recorded",
                        description: `Down payment of $${downPaymentForm.amount.toFixed(2)} recorded. Invoice generated.`,
                      });
                    }, 100);
                  } else if (updatedContract && editingDownPaymentId) {
                    toast({
                      title: "✅ Down Payment Updated",
                      description: `Down payment updated. Invoice regenerated.`,
                    });
                    setTimeout(() => {
                      generateInvoicePDF(updatedContract);
                    }, 100);
                  }

                  setIsDownPaymentModalOpen(false);
                  setDownPaymentForm({
                    id: "",
                    amount: 0,
                    date: "",
                    method: "wire_transfer",
                    description: ""
                  });
                  setEditingDownPaymentId(null);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {editingDownPaymentId ? "Update" : "Add"} Down Payment & Generate Invoice
              </Button>
              {editingDownPaymentId && (
                <Button
                  onClick={() => {
                    const updatedContracts = contracts.map(contract =>
                      contract.id === detailsContractId
                        ? {
                            ...contract,
                            downPayments: (contract.downPayments || []).filter(dp => dp.id !== editingDownPaymentId)
                          }
                        : contract
                    );
                    setContracts(updatedContracts);
                    setIsDownPaymentModalOpen(false);
                    setDownPaymentForm({
                      id: "",
                      amount: 0,
                      date: "",
                      method: "wire_transfer",
                      description: ""
                    });
                    setEditingDownPaymentId(null);
                  }}
                  variant="destructive"
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                      const subtotal = material.unitPrice * quantity;
                      return (
                        <tr key={material.id} className="border-b hover:bg-slate-50">
                          <td className="p-3">{material.name}</td>
                          <td className="text-center p-3">${material.unitPrice.toFixed(2)}</td>
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
                    return sum + (material ? material.unitPrice * m.quantity : 0);
                  }, 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Labor Cost:</span>
                <span className="font-semibold">${costTracking.laborCost.amount.toFixed(2)}</span>
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
                      return sum + (material ? material.unitPrice * m.quantity : 0);
                    }, 0) +
                    costTracking.laborCost.amount +
                    costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0)
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Profit Margin ({costTracking.profitMarginPercent}%):</span>
                <span className="font-semibold">
                  ${(
                    (costTracking.materials.reduce((sum, m) => {
                      const material = availableMaterials.find(am => am.id === m.id);
                      return sum + (material ? material.unitPrice * m.quantity : 0);
                    }, 0) +
                    costTracking.laborCost.amount +
                    costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0)) *
                    (costTracking.profitMarginPercent / 100)
                  ).toFixed(2)}
                </span>
              </div>
              <div className="border-t pt-2 flex justify-between bg-blue-50 p-2 rounded">
                <span className="font-bold">Total Project Cost:</span>
                <span className="font-bold text-lg text-blue-600">
                  ${(
                    (costTracking.materials.reduce((sum, m) => {
                      const material = availableMaterials.find(am => am.id === m.id);
                      return sum + (material ? material.unitPrice * m.quantity : 0);
                    }, 0) +
                    costTracking.laborCost.amount +
                    costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0)) *
                    (1 + costTracking.profitMarginPercent / 100)
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
                  return sum + (material ? material.unitPrice * m.quantity : 0);
                }, 0);
                const subtotal = materialTotal + costTracking.laborCost.amount + costTracking.miscellaneous.reduce((sum, m) => sum + m.amount, 0);
                const total = subtotal * (1 + costTracking.profitMarginPercent / 100);

                setFormData(prev => ({
                  ...prev,
                  totalValue: total.toFixed(2),
                  depositAmount: (total * 0.5).toFixed(2)
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
                src={lightboxImage.fileData}
                alt={lightboxImage.fileName}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{lightboxImage.fileName}</p>
                <p className="text-sm text-slate-400">{new Date(lightboxImage.uploadDate).toLocaleDateString()}</p>
              </div>
              <a
                href={lightboxImage.fileData}
                download={lightboxImage.fileName}
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
