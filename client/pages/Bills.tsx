import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, Edit2, Trash2, Printer, Paperclip, Download, Eye, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { getTodayDate, formatDateString } from "@/utils/yearStorage";
import jsPDF from "jspdf";
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
import { billsService, type Bill } from "@/lib/supabase-service";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

interface Attachment {
  id: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  data: string; // base64 encoded data
}

type PaymentMethod = "credit_card" | "debit_card" | "cash" | "bank_transfer" | "wire_transfer";

const BILL_CATEGORIES = [
  "Materials",
  "Office Supplies",
  "Energy",
  "Gas",
  "Water",
  "Landscaping",
  "Waste",
  "Insurance",
  "Rent & Lease Payments",
  "Accounting",
  "Contadora",
  "Advertising & Marketing",
  "Staff & Technology Services",
  "Uniforms & Staff Apparel",
  "IT Services & Internet",
  "Multiple / Miscellaneous Services",
  "Taxes",
  "Others",
];

interface FormData {
  vendor: string;
  description: string;
  category: string;
  amount: string;
  due_date: string;
  invoice_number: string;
  recurrent: boolean;
  recurrence_frequency: "weekly" | "monthly" | "yearly" | "";
  autopay: boolean;
  autopay_method: PaymentMethod | "";
  autopay_card_number?: string;
  autopay_card_holder?: string;
  autopay_card_expiry?: string;
  autopay_card_cvv?: string;
  autopay_bank_name?: string;
  autopay_account_holder?: string;
  autopay_account_number?: string;
  autopay_routing_number?: string;
  autopay_wire_reference?: string;
}

// exampleBills removed

export default function Bills() {
  const { selectedYear } = useYear();
  const { toast } = useToast();

  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [selectedBills, setSelectedBills] = useState<Set<string>>(new Set());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit_card");
  const [paymentDate, setPaymentDate] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [filterFromDate, setFilterFromDate] = useState<string>("");
  const [filterToDate, setFilterToDate] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [paymentDetails, setPaymentDetails] = useState({
    creditCardNumber: "",
    creditCardHolder: "",
    cardExpiry: "",
    cardCvv: "",
    bankName: "",
    accountHolder: "",
    accountNumber: "",
    routingNumber: "",
    wireReference: "",
    cashReference: "",
  });
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState<PaymentMethod>("credit_card");
  const [formData, setFormData] = useState<FormData>({
    vendor: "",
    description: "",
    category: "",
    amount: "",
    due_date: "",
    invoice_number: "",
    recurrent: false,
    recurrence_frequency: "",
    autopay: false,
    autopay_method: "",
    autopay_card_number: "",
    autopay_card_holder: "",
    autopay_card_expiry: "",
    autopay_card_cvv: "",
    autopay_bank_name: "",
    autopay_account_holder: "",
    autopay_account_number: "",
    autopay_routing_number: "",
    autopay_wire_reference: "",
  });
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [selectedBillForAttachment, setSelectedBillForAttachment] = useState<string | null>(null);
  const [isViewAttachmentOpen, setIsViewAttachmentOpen] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const data = await billsService.getAll();
      // Filter by year if necessary (assuming dueDate contains year)
      const yearBills = data.filter(bill => {
        if (!bill.due_date) return true;
        return bill.due_date.startsWith(selectedYear.toString());
      });
      setBills(yearBills);
    } catch (error: any) {
      console.error("Error loading bills:", error);
      toast({
        title: "Error",
        description: "Failed to load bills from Supabase",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [selectedYear]);

  const totalExpenses = bills.reduce((sum, b) => sum + b.amount, 0);
  const overdueBills = bills.filter((b) => b.status === "overdue").length;
  const totalOverdueAmount = bills
    .filter((b) => b.status === "overdue")
    .reduce((sum, b) => sum + b.amount, 0);

  const filteredBills = bills
    .filter((bill) => {
      const statusMatch = filterStatus === "all" || bill.status === filterStatus;
      const categoryMatch = filterCategory === "all" || bill.category === filterCategory;

      let dateMatch = true;
      if ((filterFromDate || filterToDate) && bill.due_date) {
        const dueDateParts = bill.due_date.split('-');
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

      return statusMatch && dateMatch && categoryMatch;
    })
    .sort((a, b) => {
      // Sort by due_date in descending order (most recent first)
      if (!a.due_date || !b.due_date) return 0;
      const aParts = a.due_date.split('-');
      const bParts = b.due_date.split('-');
      const aDate = new Date(parseInt(aParts[0]), parseInt(aParts[1]) - 1, parseInt(aParts[2]));
      const bDate = new Date(parseInt(bParts[0]), parseInt(bParts[1]) - 1, parseInt(bParts[2]));
      return bDate.getTime() - aDate.getTime();
    });
  const filteredTotal = filteredBills.reduce((sum, b) => sum + b.amount, 0);

  const handleFormChange = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddBill = async () => {
    if (
      !formData.vendor.trim() ||
      !formData.description.trim() ||
      !formData.category ||
      !formData.amount ||
      !formData.due_date
    ) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate autopay details... (keeping validation as is)
    if (formData.autopay && (formData.autopay_method === "credit_card" || formData.autopay_method === "debit_card")) {
      if (!formData.autopay_card_number?.trim() || !formData.autopay_card_holder?.trim() || !formData.autopay_card_expiry?.trim() || !formData.autopay_card_cvv?.trim()) {
        alert("Please fill in all card details for autopay");
        return;
      }
    }

    const payment_details: any = {
      autopay_method: formData.autopay_method || undefined,
      autopay_card_last4: (formData.autopay_method === "credit_card" || formData.autopay_method === "debit_card") && formData.autopay_card_number ? formData.autopay_card_number.slice(-4) : undefined,
      autopay_card_type: (formData.autopay_method === "credit_card" || formData.autopay_method === "debit_card") ? formData.autopay_method : undefined,
      autopay_bank_name: (formData.autopay_method === "bank_transfer" || formData.autopay_method === "wire_transfer") ? formData.autopay_bank_name : undefined,
      autopay_account_last4: (formData.autopay_method === "bank_transfer" || formData.autopay_method === "wire_transfer") && formData.autopay_account_number ? formData.autopay_account_number.slice(-4) : undefined,
      autopay_account_holder: (formData.autopay_method === "bank_transfer" || formData.autopay_method === "wire_transfer") ? formData.autopay_account_holder : undefined,
    };

    try {
      if (isEditMode && editingBillId) {
        await billsService.update(editingBillId, {
          vendor: formData.vendor,
          description: formData.description,
          category: formData.category,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date,
          invoice_number: formData.invoice_number || null,
          recurrent: formData.recurrent,
          autopay: formData.autopay,
          payment_details,
        });
        toast({ title: "Success", description: "Bill updated successfully" });
      } else {
        await billsService.create({
          id: `BILL-${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(1 + Math.random() * 9)}`,
          vendor: formData.vendor,
          description: formData.description,
          category: formData.category,
          amount: parseFloat(formData.amount),
          due_date: formData.due_date,
          invoice_number: formData.invoice_number || null,
          status: "pending",
          recurrent: formData.recurrent,
          autopay: formData.autopay,
          payment_details,
          attachments: [],
        });
        toast({ title: "Success", description: "Bill created successfully" });
      }
      fetchBills();
      handleCloseModal(false);
    } catch (error) {
      console.error("Error saving bill:", error);
      toast({ title: "Error", description: "Failed to save bill", variant: "destructive" });
    }
  };

  const handleEditBill = (bill: Bill) => {
    setFormData({
      vendor: bill.vendor,
      description: bill.description || "",
      category: bill.category || "",
      amount: bill.amount.toString(),
      due_date: bill.due_date || "",
      invoice_number: bill.invoice_number || "",
      recurrent: bill.recurrent || false,
      recurrence_frequency: "",
      autopay: bill.autopay || false,
      autopay_method: (bill.payment_details as any)?.autopay_method || "",
    });
    setEditingBillId(bill.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteBill = async (billId: string) => {
    if (window.confirm("Are you sure you want to delete this bill?")) {
      try {
        await billsService.delete(billId);
        toast({ title: "Success", description: "Bill deleted successfully" });
        fetchBills();
      } catch (error) {
        console.error("Error deleting bill:", error);
        toast({ title: "Error", description: "Failed to delete bill", variant: "destructive" });
      }
    }
  };

  const handleCloseModal = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setIsEditMode(false);
      setEditingBillId(null);
      setFormData({
        vendor: "",
        description: "",
        category: "",
        amount: "",
        due_date: "",
        invoice_number: "",
        recurrent: false,
        recurrence_frequency: "",
        autopay: false,
        autopay_method: "",
        autopay_card_number: "",
        autopay_card_holder: "",
        autopay_card_expiry: "",
        autopay_card_cvv: "",
        autopay_bank_name: "",
        autopay_account_holder: "",
        autopay_account_number: "",
        autopay_routing_number: "",
        autopay_wire_reference: "",
      });
    }
  };

  const handleSelectBill = (billId: string) => {
    const newSelected = new Set(selectedBills);
    if (newSelected.has(billId)) {
      newSelected.delete(billId);
    } else {
      newSelected.add(billId);
    }
    setSelectedBills(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedBills.size === bills.length) {
      setSelectedBills(new Set());
    } else {
      setSelectedBills(new Set(bills.map((bill) => bill.id)));
    }
  };

  const handleSetPayment = () => {
    if (selectedBills.size === 0) {
      alert("Please select at least one bill");
      return;
    }

    if (!paymentDate) {
      alert("Please select a payment date");
      return;
    }

    // Validate payment details based on method
    if (paymentMethod === "credit_card") {
      if (!paymentDetails.creditCardNumber || !paymentDetails.creditCardHolder || !paymentDetails.cardExpiry || !paymentDetails.cardCvv) {
        alert("Please fill in all credit card details");
        return;
      }
    } else if (paymentMethod === "debit_card") {
      if (!paymentDetails.creditCardNumber || !paymentDetails.creditCardHolder || !paymentDetails.cardExpiry || !paymentDetails.cardCvv) {
        alert("Please fill in all debit card details");
        return;
      }
    } else if (paymentMethod === "bank_transfer") {
      if (!paymentDetails.bankName || !paymentDetails.accountHolder || !paymentDetails.accountNumber) {
        alert("Please fill in all bank transfer details");
        return;
      }
    } else if (paymentMethod === "wire_transfer") {
      if (!paymentDetails.bankName || !paymentDetails.accountHolder || !paymentDetails.routingNumber) {
        alert("Please fill in all wire transfer details");
        return;
      }
    } else if (paymentMethod === "cash") {
      if (!paymentDetails.cashReference) {
        alert("Please enter a reference number for cash payment");
        return;
      }
    }

    const updatedBills = bills.map((bill) =>
      selectedBills.has(bill.id)
        ? {
            ...bill,
            status: "paid" as const,
            paymentMethod,
            paymentDate,
            paidCreditCardLast4: paymentMethod === "credit_card" ? paymentDetails.creditCardNumber.slice(-4) : undefined,
            paidDebitCardLast4: paymentMethod === "debit_card" ? paymentDetails.creditCardNumber.slice(-4) : undefined,
            paidAccountLast4: paymentMethod === "bank_transfer" ? paymentDetails.accountNumber.slice(-4) : undefined,
            paidBankName: paymentMethod === "bank_transfer" || paymentMethod === "wire_transfer" ? paymentDetails.bankName : undefined,
            paidReference: paymentMethod === "cash" ? paymentDetails.cashReference : paymentMethod === "wire_transfer" ? paymentDetails.wireReference : undefined,
          }
        : bill
    );

    setBills(updatedBills);
    setSelectedBills(new Set());
    setPaymentMethod("credit_card");
    setPaymentDate("");
    setPaymentDetails({
      creditCardNumber: "",
      creditCardHolder: "",
      cardExpiry: "",
      cardCvv: "",
      bankName: "",
      accountHolder: "",
      accountNumber: "",
      routingNumber: "",
      wireReference: "",
      cashReference: "",
    });
    setIsPaymentModalOpen(false);

    const count = selectedBills.size;
    alert(`✓ Payment recorded for ${count} bill${count !== 1 ? "s" : ""}`);
  };

  const formatPaymentMethod = (method: string | null, bill?: Bill) => {
    const formats: Record<string, string> = {
      credit_card: "Credit Card",
      debit_card: "Debit Card",
      cash: "Cash",
      bank_transfer: "Bank Transfer",
      wire_transfer: "Wire Transfer",
    };

    if (!method) return "-";

    const details = (bill?.payment_details as any) || {};

    // Show autopay card details if available
    if (bill && (details.autopay_card_last4 || details.autopay_card_type)) {
      switch (details.autopay_card_type) {
        case "credit_card":
          return details.autopay_card_last4 ? `Credit Card ••••${details.autopay_card_last4}` : "Credit Card";
        case "debit_card":
          return details.autopay_card_last4 ? `Debit Card ••••${details.autopay_card_last4}` : "Debit Card";
      }
    }

    // Show autopay bank details if available
    if (bill && details.autopay_bank_name) {
      if (method === "bank_transfer") {
        return details.autopay_account_last4
          ? `Bank Transfer (${details.autopay_bank_name} ••••${details.autopay_account_last4})`
          : `Bank Transfer (${details.autopay_bank_name})`;
      }
      if (method === "wire_transfer") {
        return `Wire Transfer (${details.autopay_bank_name})`;
      }
    }

    if (!bill || bill.status !== "paid") {
      return formats[method] || method;
    }

    // Show details for paid bills
    switch (method) {
      case "credit_card":
        return details.paid_credit_card_last4 ? `Credit Card ••••${details.paid_credit_card_last4}` : "Credit Card";
      case "debit_card":
        return details.paid_credit_card_last4 ? `Debit Card ••••${details.paid_credit_card_last4}` : "Debit Card";
      case "bank_transfer":
        return details.paid_bank_name && details.paid_account_last4
          ? `Bank Transfer (${details.paid_bank_name} ••••${details.paid_account_last4})`
          : "Bank Transfer";
      case "wire_transfer":
        return details.paid_bank_name ? `Wire Transfer (${details.paid_bank_name})` : "Wire Transfer";
      case "cash":
        return details.paid_reference ? `Cash (Ref: ${details.paid_reference})` : "Cash";
      default:
        return formats[method] || method;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      overdue: "bg-red-100 text-red-800",
    };
    return styles[status] || "bg-gray-100 text-gray-800";
  };

  const handleAttachFile = (billId: string) => {
    setSelectedBillForAttachment(billId);
    setIsAttachmentModalOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBillForAttachment) {
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
    reader.onload = async (event) => {
      const base64Data = event.target?.result as string;
      const newAttachment: Attachment = {
        id: `ATT-${Date.now()}`,
        filename: file.name,
        fileType: file.type,
        fileSize: file.size,
        uploadDate: getTodayDate(),
        data: base64Data,
      };

      try {
        const bill = bills.find(b => b.id === selectedBillForAttachment);
        if (!bill) return;

        await billsService.update(selectedBillForAttachment, {
          attachments: [...(bill.attachments || []), newAttachment]
        });

        toast({ title: "Success", description: "Invoice attached successfully" });
        setIsAttachmentModalOpen(false);
        setSelectedBillForAttachment(null);
        fetchBills();
      } catch (error) {
        console.error("Error uploading attachment:", error);
        toast({ title: "Error", description: "Failed to upload attachment", variant: "destructive" });
      }
    };

    reader.readAsDataURL(file);
  };

  const handleRemoveAttachment = async (billId: string, attachmentId: string) => {
    if (window.confirm("Are you sure you want to remove this attachment?")) {
      try {
        const bill = bills.find(b => b.id === billId);
        if (!bill) return;

        await billsService.update(billId, {
          attachments: (bill.attachments || []).filter((att: any) => att.id !== attachmentId)
        });

        toast({ title: "Success", description: "Attachment removed" });
        fetchBills();
      } catch (error) {
        console.error("Error removing attachment:", error);
        toast({ title: "Error", description: "Failed to remove attachment", variant: "destructive" });
      }
    }
  };

  const handleDownloadAttachment = (attachment: Attachment) => {
    const link = document.createElement("a");
    link.href = attachment.data;
    link.download = attachment.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewAttachment = (attachment: Attachment) => {
    setSelectedAttachment(attachment);
    setIsViewAttachmentOpen(true);
  };

  const handlePrintAttachment = (attachment: Attachment) => {
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

  const billsByCategory = bills.reduce(
    (acc, bill) => {
      acc[bill.category] = (acc[bill.category] || 0) + bill.amount;
      return acc;
    },
    {} as Record<string, number>
  );

  const scheduledPayments = bills
    .filter((bill) => bill.autopay && bill.recurrent && bill.due_date)
    .map((bill) => ({
      ...bill,
      nextPaymentDate: bill.due_date ? new Date(bill.due_date) : new Date(),
      autopay_method: (bill.payment_details as any)?.autopay_method as string | undefined,
    }))
    .sort((a, b) => a.nextPaymentDate.getTime() - b.nextPaymentDate.getTime());

  const totalScheduledAmount = scheduledPayments.reduce((sum, payment) => sum + payment.amount, 0);

  const generateAnnualReport = () => {
    try {
      const billsToPrint = filteredBills;
      if (billsToPrint.length === 0) {
        alert("No bills to print");
        return;
      }

      const statusLabel = filterStatus === "all" ? "All Bills" : filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1) + " Bills";
      const totalAmount = billsToPrint.reduce((sum, b) => sum + b.amount, 0);

      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;
      const margin = 10;
      const lineHeight = 5;

      // Title
      pdf.setFontSize(14);
      pdf.setFont(undefined, "bold");
      pdf.text(statusLabel, margin, yPosition);
      yPosition += 8;

      // Generated date
      pdf.setFontSize(9);
      pdf.setFont(undefined, "normal");
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
      yPosition += 8;

      // Table headers
      const colWidths = [18, 18, 22, 28, 15, 15, 15, 15];
      const headers = ["ID", "Category", "Vendor", "Description", "Amount", "Due Date", "Status", "Payment Method"];
      let xPosition = margin;

      pdf.setFont(undefined, "bold");
      pdf.setFontSize(9);
      headers.forEach((header, idx) => {
        pdf.text(header, xPosition, yPosition);
        xPosition += colWidths[idx];
      });
      yPosition += lineHeight + 1;
      pdf.setDrawColor(200);
      pdf.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
      yPosition += 2;

      // Table rows
      pdf.setFont(undefined, "normal");
      pdf.setFontSize(8);

      billsToPrint.forEach((bill) => {
        if (yPosition > pageHeight - 10) {
          pdf.addPage();
          yPosition = 15;
        }

        xPosition = margin;
        pdf.text(bill.id.substring(0, 10), xPosition, yPosition);
        xPosition += colWidths[0];
        pdf.text(bill.category.substring(0, 12), xPosition, yPosition);
        xPosition += colWidths[1];
        pdf.text(bill.vendor.substring(0, 15), xPosition, yPosition);
        xPosition += colWidths[2];
        pdf.text(bill.description.substring(0, 20), xPosition, yPosition);
        xPosition += colWidths[3];
        pdf.text(`$${bill.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, xPosition, yPosition);
        xPosition += colWidths[4];
        pdf.text(formatDateString(bill.due_date), xPosition, yPosition);
        xPosition += colWidths[5];
        pdf.text(bill.status, xPosition, yPosition);
        xPosition += colWidths[6];
        pdf.text(bill.payment_method ? bill.payment_method.replace(/_/g, " ") : "-", xPosition, yPosition);

        yPosition += lineHeight + 1;
      });

      // Total footer
      yPosition += 3;
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(9);
      pdf.text(`Total: $${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, yPosition);
      pdf.text(`Count: ${billsToPrint.length}`, margin + 50, yPosition);

      pdf.save(`Bills-${statusLabel.replace(/\s+/g, "-")}.pdf`);
    } catch (error) {
      console.error("Error generating annual report:", error);
      alert("Error generating report. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Bills</h1>
          <p className="text-slate-600 mt-1">Track company expenses and bills with automatic number generation by category</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
            <DialogTrigger asChild>
              <Button
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  setIsEditMode(false);
                  setFormData({
                    vendor: "",
                    description: "",
                    category: "",
                    amount: "",
                    due_date: getTodayDate(),
                    invoice_number: "",
                    recurrent: false,
                    recurrence_frequency: "",
                    autopay: false,
                    autopay_method: "",
                  });
                  setIsModalOpen(true);
                }}
              >
                <Plus className="w-4 h-4" />
                Add Bill
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? "Edit Bill" : "Add New Bill"}</DialogTitle>
              <DialogDescription>
                {isEditMode ? "Update the bill details below." : "Enter the bill details below. Fill in all required fields."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 pr-4">
              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor *</Label>
                <Input
                  id="vendor"
                  placeholder="e.g., Colorado Electric Company"
                  value={formData.vendor}
                  onChange={(e) => handleFormChange("vendor", e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input
                  id="description"
                  placeholder="e.g., Monthly electric bill"
                  value={formData.description}
                  onChange={(e) => handleFormChange("description", e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select value={formData.category} onValueChange={(value) => handleFormChange("category", value)}>
                  <SelectTrigger id="category" className="border-slate-300">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BILL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => handleFormChange("amount", e.target.value)}
                    className="border-slate-300"
                    step="0.01"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_number">Invoice Number</Label>
                  <Input
                    id="invoice_number"
                    placeholder="e.g., INV-001"
                    value={formData.invoice_number}
                    onChange={(e) => handleFormChange("invoice_number", e.target.value)}
                    className="border-slate-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date *</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleFormChange("due_date", e.target.value)}
                  className="border-slate-300"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  id="recurrent"
                  type="checkbox"
                  checked={formData.recurrent}
                  onChange={(e) => handleFormChange("recurrent", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 cursor-pointer"
                />
                <Label htmlFor="recurrent" className="cursor-pointer">
                  Recurrent Bill
                </Label>
              </div>

              {formData.recurrent && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence_frequency">Recurrence Frequency *</Label>
                  <Select
                    value={formData.recurrence_frequency}
                    onValueChange={(value) => handleFormChange("recurrence_frequency", value)}
                  >
                    <SelectTrigger id="recurrence_frequency" className="border-slate-300">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center space-x-2 pt-4 border-t">
                <input
                  id="autopay"
                  type="checkbox"
                  checked={formData.autopay}
                  onChange={(e) => handleFormChange("autopay", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 cursor-pointer"
                />
                <Label htmlFor="autopay" className="cursor-pointer">
                  Enable Autopay
                </Label>
              </div>

              {formData.autopay && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="autopay_method">Autopay Method *</Label>
                    <Select
                      value={formData.autopay_method || ""}
                      onValueChange={(value) => handleFormChange("autopay_method", value as PaymentMethod | "")}
                    >
                      <SelectTrigger id="autopay_method" className="border-slate-300">
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="credit_card">Credit Card</SelectItem>
                        <SelectItem value="debit_card">Debit Card</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {(formData.autopay_method === "credit_card" || formData.autopay_method === "debit_card") && (
                    <div className="bg-slate-50 p-4 rounded space-y-3 border border-slate-200">
                      <p className="text-sm font-semibold text-slate-700">
                        {formData.autopay_method === "credit_card" ? "Credit Card" : "Debit Card"} Details *
                      </p>

                      <div className="space-y-2">
                        <Label htmlFor="autopay_card_number">Card Number *</Label>
                        <Input
                          id="autopay_card_number"
                          placeholder="1234 5678 9012 3456"
                          value={formData.autopay_card_number || ""}
                          onChange={(e) => handleFormChange("autopay_card_number", e.target.value)}
                          className="border-slate-300"
                          maxLength={19}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="autopay_card_holder">Cardholder Name *</Label>
                        <Input
                          id="autopay_card_holder"
                          placeholder="John Doe"
                          value={formData.autopay_card_holder || ""}
                          onChange={(e) => handleFormChange("autopay_card_holder", e.target.value)}
                          className="border-slate-300"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="autopay_card_expiry">Expiry (MM/YY) *</Label>
                          <Input
                            id="autopay_card_expiry"
                            placeholder="12/25"
                            value={formData.autopay_card_expiry || ""}
                            onChange={(e) => handleFormChange("autopay_card_expiry", e.target.value)}
                            className="border-slate-300"
                            maxLength={5}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="autopay_card_cvv">CVV *</Label>
                          <Input
                            id="autopay_card_cvv"
                            placeholder="123"
                            value={formData.autopay_card_cvv || ""}
                            onChange={(e) => handleFormChange("autopay_card_cvv", e.target.value)}
                            className="border-slate-300"
                            maxLength={4}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {formData.autopay_method === "bank_transfer" && (
                    <div className="bg-slate-50 p-4 rounded space-y-3 border border-slate-200">
                      <p className="text-sm font-semibold text-slate-700">Bank Transfer Details *</p>

                      <div className="space-y-2">
                        <Label htmlFor="autopay_bank_name">Bank Name *</Label>
                        <Input
                          id="autopay_bank_name"
                          placeholder="e.g., Wells Fargo, Chase Bank"
                          value={formData.autopay_bank_name || ""}
                          onChange={(e) => handleFormChange("autopay_bank_name", e.target.value)}
                          className="border-slate-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="autopay_account_holder">Account Holder *</Label>
                        <Input
                          id="autopay_account_holder"
                          placeholder="John Doe"
                          value={formData.autopay_account_holder || ""}
                          onChange={(e) => handleFormChange("autopay_account_holder", e.target.value)}
                          className="border-slate-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="autopay_account_number">Account Number *</Label>
                        <Input
                          id="autopay_account_number"
                          type="password"
                          placeholder="Account number (will be masked)"
                          value={formData.autopay_account_number || ""}
                          onChange={(e) => handleFormChange("autopay_account_number", e.target.value)}
                          className="border-slate-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="autopay_routing_number">Routing Number *</Label>
                        <Input
                          id="autopay_routing_number"
                          placeholder="9-digit routing number"
                          value={formData.autopay_routing_number || ""}
                          onChange={(e) => handleFormChange("autopay_routing_number", e.target.value)}
                          className="border-slate-300"
                        />
                      </div>
                    </div>
                  )}

                  {formData.autopay_method === "wire_transfer" && (
                    <div className="bg-slate-50 p-4 rounded space-y-3 border border-slate-200">
                      <p className="text-sm font-semibold text-slate-700">Wire Transfer Details *</p>

                      <div className="space-y-2">
                        <Label htmlFor="autopayWireBankName">Bank Name *</Label>
                        <Input
                          id="autopayWireBankName"
                          placeholder="e.g., Wells Fargo, Chase Bank"
                          value={formData.autopay_bank_name || ""}
                          onChange={(e) => handleFormChange("autopay_bank_name", e.target.value)}
                          className="border-slate-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="autopayWireAccountHolder">Account Holder *</Label>
                        <Input
                          id="autopayWireAccountHolder"
                          placeholder="John Doe"
                          value={formData.autopay_account_holder || ""}
                          onChange={(e) => handleFormChange("autopay_account_holder", e.target.value)}
                          className="border-slate-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="autopayWireAccountNumber">Account Number *</Label>
                        <Input
                          id="autopayWireAccountNumber"
                          type="password"
                          placeholder="Account number (will be masked)"
                          value={formData.autopay_account_number || ""}
                          onChange={(e) => handleFormChange("autopay_account_number", e.target.value)}
                          className="border-slate-300"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="autopay_wire_reference">Wire Reference (optional)</Label>
                        <Input
                          id="autopay_wire_reference"
                          placeholder="e.g., Invoice #12345"
                          value={formData.autopay_wire_reference || ""}
                          onChange={(e) => handleFormChange("autopay_wire_reference", e.target.value)}
                          className="border-slate-300"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => handleCloseModal(false)}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddBill}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isEditMode ? "Update Bill" : "Add Bill"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Button
            onClick={generateAnnualReport}
            className="gap-2 bg-slate-600 hover:bg-slate-700"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>

      {bills.length > 0 && (
        <>
          {overdueBills > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900">{overdueBills} Overdue Bill{overdueBills !== 1 ? "s" : ""}</p>
                  <p className="text-sm text-red-800">Total overdue amount: ${totalOverdueAmount.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {scheduledPayments.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-blue-900">Scheduled Payments</CardTitle>
                <CardDescription className="text-blue-800">
                  Upcoming automatic payments ({scheduledPayments.length} bills)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scheduledPayments.map((payment) => (
                    <div key={payment.id} className="flex justify-between items-center p-3 bg-white rounded border border-blue-200">
                      <div>
                        <p className="font-semibold text-slate-900">{payment.vendor}</p>
                        <p className="text-sm text-slate-600">{payment.category} • {payment.description}</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Autopay via {payment.autopay_method ? formatPaymentMethod(payment.autopay_method) : "Default Method"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-900">${payment.amount.toLocaleString()}</p>
                        <p className="text-sm text-slate-600">{formatDateString(payment.due_date)}</p>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-blue-200 mt-3">
                    <p className="font-semibold text-blue-900">
                      Total Scheduled: ${totalScheduledAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Bills & Expenses</CardTitle>
                <CardDescription>
                  All company bills organized by category
                </CardDescription>
              </div>
              {selectedBills.size > 0 && (
                <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2 bg-green-600 hover:bg-green-700">
                      Set Payment ({selectedBills.size})
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Record Payment</DialogTitle>
                      <DialogDescription>
                        Set payment details for {selectedBills.size} selected bill{selectedBills.size !== 1 ? "s" : ""}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Payment Method *</Label>
                        <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}>
                          <SelectTrigger id="paymentMethod" className="border-slate-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="credit_card">Credit Card</SelectItem>
                            <SelectItem value="debit_card">Debit Card</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                            <SelectItem value="wire_transfer">Wire Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="paymentDate">Payment Date *</Label>
                        <Input
                          id="paymentDate"
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                          className="border-slate-300"
                        />
                      </div>

                      {/* Credit Card Fields */}
                      {paymentMethod === "credit_card" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="creditCardNumber">Card Number *</Label>
                            <Input
                              id="creditCardNumber"
                              placeholder="1234 5678 9012 3456"
                              value={paymentDetails.creditCardNumber}
                              onChange={(e) => setPaymentDetails({...paymentDetails, creditCardNumber: e.target.value})}
                              className="border-slate-300"
                              maxLength={19}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="creditCardHolder">Cardholder Name *</Label>
                            <Input
                              id="creditCardHolder"
                              placeholder="John Doe"
                              value={paymentDetails.creditCardHolder}
                              onChange={(e) => setPaymentDetails({...paymentDetails, creditCardHolder: e.target.value})}
                              className="border-slate-300"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="cardExpiry">Expiry (MM/YY) *</Label>
                              <Input
                                id="cardExpiry"
                                placeholder="12/25"
                                value={paymentDetails.cardExpiry}
                                onChange={(e) => setPaymentDetails({...paymentDetails, cardExpiry: e.target.value})}
                                className="border-slate-300"
                                maxLength={5}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="cardCvv">CVV *</Label>
                              <Input
                                id="cardCvv"
                                placeholder="123"
                                value={paymentDetails.cardCvv}
                                onChange={(e) => setPaymentDetails({...paymentDetails, cardCvv: e.target.value})}
                                className="border-slate-300"
                                maxLength={4}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Debit Card Fields */}
                      {paymentMethod === "debit_card" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="debitCardNumber">Card Number *</Label>
                            <Input
                              id="debitCardNumber"
                              placeholder="1234 5678 9012 3456"
                              value={paymentDetails.creditCardNumber}
                              onChange={(e) => setPaymentDetails({...paymentDetails, creditCardNumber: e.target.value})}
                              className="border-slate-300"
                              maxLength={19}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="debitCardHolder">Cardholder Name *</Label>
                            <Input
                              id="debitCardHolder"
                              placeholder="John Doe"
                              value={paymentDetails.creditCardHolder}
                              onChange={(e) => setPaymentDetails({...paymentDetails, creditCardHolder: e.target.value})}
                              className="border-slate-300"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="debitCardExpiry">Expiry (MM/YY) *</Label>
                              <Input
                                id="debitCardExpiry"
                                placeholder="12/25"
                                value={paymentDetails.cardExpiry}
                                onChange={(e) => setPaymentDetails({...paymentDetails, cardExpiry: e.target.value})}
                                className="border-slate-300"
                                maxLength={5}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="debitCardCvv">CVV *</Label>
                              <Input
                                id="debitCardCvv"
                                placeholder="123"
                                value={paymentDetails.cardCvv}
                                onChange={(e) => setPaymentDetails({...paymentDetails, cardCvv: e.target.value})}
                                className="border-slate-300"
                                maxLength={4}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {/* Bank Transfer Fields */}
                      {paymentMethod === "bank_transfer" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="bankName">Bank Name *</Label>
                            <Input
                              id="bankName"
                              placeholder="e.g., Wells Fargo, Chase"
                              value={paymentDetails.bankName}
                              onChange={(e) => setPaymentDetails({...paymentDetails, bankName: e.target.value})}
                              className="border-slate-300"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="accountHolder">Account Holder Name *</Label>
                            <Input
                              id="accountHolder"
                              placeholder="John Doe"
                              value={paymentDetails.accountHolder}
                              onChange={(e) => setPaymentDetails({...paymentDetails, accountHolder: e.target.value})}
                              className="border-slate-300"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="accountNumber">Account Number *</Label>
                            <Input
                              id="accountNumber"
                              placeholder="XXXX1234"
                              value={paymentDetails.accountNumber}
                              onChange={(e) => setPaymentDetails({...paymentDetails, accountNumber: e.target.value})}
                              className="border-slate-300"
                            />
                          </div>
                        </>
                      )}

                      {/* Wire Transfer Fields */}
                      {paymentMethod === "wire_transfer" && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="wireBank">Bank Name *</Label>
                            <Input
                              id="wireBank"
                              placeholder="e.g., JP Morgan Chase"
                              value={paymentDetails.bankName}
                              onChange={(e) => setPaymentDetails({...paymentDetails, bankName: e.target.value})}
                              className="border-slate-300"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wireAccountHolder">Account Holder Name *</Label>
                            <Input
                              id="wireAccountHolder"
                              placeholder="Company Name"
                              value={paymentDetails.accountHolder}
                              onChange={(e) => setPaymentDetails({...paymentDetails, accountHolder: e.target.value})}
                              className="border-slate-300"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="routingNumber">Routing Number *</Label>
                            <Input
                              id="routingNumber"
                              placeholder="XXXXXXXXX"
                              value={paymentDetails.routingNumber}
                              onChange={(e) => setPaymentDetails({...paymentDetails, routingNumber: e.target.value})}
                              className="border-slate-300"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="wireReference">Wire Reference</Label>
                            <Input
                              id="wireReference"
                              placeholder="Reference number (optional)"
                              value={paymentDetails.wireReference}
                              onChange={(e) => setPaymentDetails({...paymentDetails, wireReference: e.target.value})}
                              className="border-slate-300"
                            />
                          </div>
                        </>
                      )}

                      {/* Cash Fields */}
                      {paymentMethod === "cash" && (
                        <div className="space-y-2">
                          <Label htmlFor="cashReference">Reference Number *</Label>
                          <Input
                            id="cashReference"
                            placeholder="e.g., Receipt #, Reference #"
                            value={paymentDetails.cashReference}
                            onChange={(e) => setPaymentDetails({...paymentDetails, cashReference: e.target.value})}
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
                          setPaymentDate("");
                          setPaymentMethod("credit_card");
                          setPaymentDetails({
                            creditCardNumber: "",
                            creditCardHolder: "",
                            cardExpiry: "",
                            cardCvv: "",
                            bankName: "",
                            accountHolder: "",
                            accountNumber: "",
                            routingNumber: "",
                            wireReference: "",
                            cashReference: "",
                          });
                        }}
                        className="border-slate-300"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSetPayment}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Confirm Payment
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </CardHeader>
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex gap-2 flex-wrap items-center">
                <Button
                  onClick={() => setFilterStatus("all")}
                  variant={filterStatus === "all" ? "default" : "outline"}
                  className={filterStatus === "all" ? "bg-blue-600 hover:bg-blue-700" : "border-slate-300"}
                >
                  All ({bills.length})
                </Button>
                <Button
                  onClick={() => setFilterStatus("pending")}
                  variant={filterStatus === "pending" ? "default" : "outline"}
                  className={filterStatus === "pending" ? "bg-yellow-600 hover:bg-yellow-700" : "border-slate-300"}
                >
                  Pending ({bills.filter(b => b.status === "pending").length})
                </Button>
                <Button
                  onClick={() => setFilterStatus("paid")}
                  variant={filterStatus === "paid" ? "default" : "outline"}
                  className={filterStatus === "paid" ? "bg-green-600 hover:bg-green-700" : "border-slate-300"}
                >
                  Paid ({bills.filter(b => b.status === "paid").length})
                </Button>
                <Button
                  onClick={() => setFilterStatus("overdue")}
                  variant={filterStatus === "overdue" ? "default" : "outline"}
                  className={filterStatus === "overdue" ? "bg-red-600 hover:bg-red-700" : "border-slate-300"}
                >
                  Overdue ({bills.filter(b => b.status === "overdue").length})
                </Button>

                <div className="border-l border-slate-200 mx-2 h-6"></div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[180px] border-slate-300">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {BILL_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  placeholder="From"
                  value={filterFromDate}
                  onChange={(e) => setFilterFromDate(e.target.value)}
                  className="border-slate-300 w-36"
                />
                <Input
                  type="date"
                  placeholder="To"
                  value={filterToDate}
                  onChange={(e) => setFilterToDate(e.target.value)}
                  className="border-slate-300 w-36"
                />
                {(filterFromDate || filterToDate) && (
                  <Button
                    onClick={() => {
                      setFilterFromDate("");
                      setFilterToDate("");
                    }}
                    variant="outline"
                    className="border-slate-300"
                  >
                    Clear Dates
                  </Button>
                )}
              </div>
            </div>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">ID</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Category</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Vendor</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Description</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Amount</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Due Date</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBills.map((bill, idx) => (
                      <tr key={bill.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="p-3 text-slate-700 font-medium whitespace-nowrap">{bill.id}</td>
                        <td className="p-3 text-slate-700 text-xs whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                            {bill.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 text-xs whitespace-nowrap">{bill.vendor}</td>
                        <td className="p-3 text-slate-700 text-xs whitespace-nowrap">{bill.description}</td>
                        <td className="p-3 text-slate-700 font-semibold whitespace-nowrap">${bill.amount.toLocaleString()}</td>
                        <td className="p-3 whitespace-nowrap text-slate-700">
                          {formatDateString(bill.due_date)}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEditBill(bill)}
                                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                                title="Edit bill"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleAttachFile(bill.id)}
                                className="text-purple-600 hover:text-purple-800 hover:bg-purple-50 p-2 rounded transition-colors"
                                title="Attach invoice"
                              >
                                <Paperclip className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBill(bill.id)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                                title="Delete bill"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            {bill.attachments && bill.attachments.length > 0 && (
                              <div className="flex flex-col gap-1">
                                <div className="text-xs text-purple-700 font-medium">
                                  {bill.attachments.length} attachment{bill.attachments.length !== 1 ? "s" : ""}
                                </div>
                                <div className="flex gap-1 flex-wrap">
                                  {bill.attachments.map((att) => (
                                    <div key={att.id} className="flex gap-0.5">
                                      <button
                                        onClick={() => handleViewAttachment(att)}
                                        className="text-blue-600 hover:text-blue-800 p-0.5"
                                        title="View"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handlePrintAttachment(att)}
                                        className="text-purple-600 hover:text-purple-800 p-0.5"
                                        title="Print"
                                      >
                                        <Printer className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDownloadAttachment(att)}
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
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredBills.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                  <p className="text-slate-700">
                    Showing <span className="font-semibold">{filteredBills.length}</span> {filterStatus === "all" ? "bill" : filterStatus} bill{filteredBills.length !== 1 ? "s" : ""}
                  </p>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">Total</p>
                    <p className="text-2xl font-bold text-slate-900">${filteredTotal.toLocaleString()}</p>
                  </div>
                </div>
              )}
              {filteredBills.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-600">No {filterStatus === "all" ? "bills" : filterStatus + " bills"} found</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle>By Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(billsByCategory).map(([category, amount]) => (
                    <div key={category} className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-slate-700">{category}</span>
                      <span className="font-semibold text-slate-900">${amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Total Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{bills.length}</p>
                </CardContent>
              </Card>
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg">Overdue Bills</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-red-600">{overdueBills}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {isAttachmentModalOpen && selectedBillForAttachment && (() => {
            const bill = bills.find(b => b.id === selectedBillForAttachment);
            return (
              <Dialog open={isAttachmentModalOpen} onOpenChange={setIsAttachmentModalOpen}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Attach Invoice</DialogTitle>
                    <DialogDescription>
                      {bill && `Upload invoice for ${bill.vendor}`}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    {bill && (
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <p className="text-sm text-slate-600">
                          <span className="font-medium">Vendor:</span> {bill.vendor}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          <span className="font-medium">Amount:</span> ${bill.amount.toLocaleString()}
                        </p>
                        <p className="text-sm text-slate-600 mt-1">
                          <span className="font-medium">Due Date:</span> {formatDateString(bill.due_date)}
                        </p>
                        {bill.attachments && bill.attachments.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <p className="text-sm font-medium text-slate-900 mb-2">Current Attachments:</p>
                            <div className="space-y-2">
                              {bill.attachments.map((att) => (
                                <div key={att.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-900 truncate">{att.filename}</p>
                                    <p className="text-xs text-slate-500">{(att.fileSize / 1024).toFixed(2)} KB • {att.uploadDate}</p>
                                  </div>
                                  <div className="flex gap-1 ml-2">
                                    <button
                                      onClick={() => handleViewAttachment(att)}
                                      className="text-blue-600 hover:text-blue-800 p-1"
                                      title="View"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handlePrintAttachment(att)}
                                      className="text-purple-600 hover:text-purple-800 p-1"
                                      title="Print"
                                    >
                                      <Printer className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleDownloadAttachment(att)}
                                      className="text-green-600 hover:text-green-800 p-1"
                                      title="Download"
                                    >
                                      <Download className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveAttachment(bill.id, att.id)}
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
                      <Label htmlFor="invoice-file">Upload Invoice (PDF, JPG, PNG - Max 5MB)</Label>
                      <input
                        id="invoice-file"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAttachmentModalOpen(false);
                        setSelectedBillForAttachment(null);
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

          {isViewAttachmentOpen && selectedAttachment && (
            <Dialog open={isViewAttachmentOpen} onOpenChange={setIsViewAttachmentOpen}>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>View Attachment</DialogTitle>
                  <DialogDescription>{selectedAttachment.filename}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {selectedAttachment.fileType.startsWith("image/") ? (
                    <div className="w-full bg-slate-50 rounded border border-slate-200">
                      <img
                        src={selectedAttachment.data}
                        alt={selectedAttachment.filename}
                        className="w-full h-auto"
                      />
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-8 rounded border border-slate-200 text-center">
                      <Paperclip className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-slate-600 mb-3">{selectedAttachment.filename}</p>
                      <p className="text-sm text-slate-500">File type: {selectedAttachment.fileType}</p>
                      <p className="text-sm text-slate-500">Size: {(selectedAttachment.fileSize / 1024).toFixed(2)} KB</p>
                      <Button
                        onClick={() => handleDownloadAttachment(selectedAttachment)}
                        className="gap-2 bg-blue-600 hover:bg-blue-700 mt-4"
                      >
                        <Download className="w-4 h-4" />
                        Download File
                      </Button>
                    </div>
                  )}
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm text-slate-600">
                    <p><span className="font-medium">Uploaded:</span> {selectedAttachment.uploadDate}</p>
                    <p><span className="font-medium">Size:</span> {(selectedAttachment.fileSize / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsViewAttachmentOpen(false)}
                    className="border-slate-300"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => handlePrintAttachment(selectedAttachment)}
                    className="gap-2 bg-purple-600 hover:bg-purple-700"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </Button>
                  <Button
                    onClick={() => handleDownloadAttachment(selectedAttachment)}
                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{bills.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">${totalExpenses.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Overdue Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${overdueBills > 0 ? "text-red-600" : "text-slate-900"}`}>
              ${totalOverdueAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
