import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, Printer, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useYear } from "@/contexts/YearContext";
import { formatDateString } from "@/utils/yearStorage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { employeesService, type Employee } from "@/lib/supabase-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

interface WorkerFormData {
  name: string;
  position: string;
  weeklyRate: string;
  startDate: string;
  paymentStartDate: string;
  paymentMethod: string;
  paymentStatus: string;
  email: string;
  telephone: string;
  address: string;
  bankName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: string;
  checkNumber: string;
  paymentDay: string;
  defaultDaysWorkedPerWeek: string;
}

export default function Workers() {
  const { toast } = useToast();
  const { selectedYear } = useYear();
  const { user } = useAuth();
  const { user: supabaseUser } = useSupabaseAuth();
  const queryClient = useQueryClient();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<WorkerFormData>({
    name: "",
    position: "",
    weeklyRate: "",
    startDate: "",
    paymentStartDate: "",
    paymentMethod: "direct_deposit",
    paymentStatus: "active",
    email: "",
    telephone: "",
    address: "",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
    checkNumber: "",
    paymentDay: "wednesday",
    defaultDaysWorkedPerWeek: "5",
  });

  // Fetch Employees from Supabase
  const { data: workers = [], isLoading } = useQuery<Employee[]>({
    queryKey: ['employees'],
    queryFn: employeesService.getAll,
    enabled: !!supabaseUser,
  });

  // Mutations
  const createWorkerMutation = useMutation({
    mutationFn: employeesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsAddModalOpen(false);
      resetForm();
      toast({ title: "Worker Added", description: "Worker added successfully" });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to add worker" });
    }
  });

  const updateWorkerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Employee> }) => 
      employeesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setIsEditModalOpen(false);
      resetForm();
      toast({ title: "Worker Updated", description: "Worker information updated successfully" });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to update worker" });
    }
  });

  const deleteWorkerMutation = useMutation({
    mutationFn: employeesService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: "Worker Removed", description: "Worker removed successfully" });
    },
    onError: (err: any) => {
      toast({ description: err.message || "Failed to delete worker" });
    }
  });

  const resetForm = () => {
    setFormData({
      name: "",
      position: "",
      weeklyRate: "",
      startDate: "",
      paymentStartDate: "",
      paymentMethod: "direct_deposit",
      paymentStatus: "active",
      email: "",
      telephone: "",
      address: "",
      tin: "",
      ssn: "",
      itin: "",
      bankName: "",
      routingNumber: "",
      accountNumber: "",
      accountType: "checking",
      checkNumber: "",
      paymentDay: "wednesday",
      defaultDaysWorkedPerWeek: "5",
    });
    setEditingWorkerId(null);
  };

  const handleAddWorker = () => {
    if (!formData.name || !formData.position || !formData.weeklyRate || !formData.startDate) {
      toast({ description: "Please fill in all required fields" });
      return;
    }

    const extendedDetails = {
      telephone: formData.telephone,
      email: formData.email,
      paymentStartDate: formData.paymentStartDate,
      address: formData.address,
      bankName: formData.bankName,
      routingNumber: formData.routingNumber,
      accountNumber: formData.accountNumber,
      accountType: formData.accountType,
      checkNumber: formData.checkNumber,
      paymentDay: formData.paymentDay,
      defaultDaysWorkedPerWeek: formData.defaultDaysWorkedPerWeek,
    };

    const payload = {
      name: formData.name,
      position: formData.position,
      weekly_rate: parseFloat(formData.weeklyRate),
      hire_date: formData.startDate,
      payment_method: formData.paymentMethod,
      status: formData.paymentStatus,
      bank_details: extendedDetails,
    };

    createWorkerMutation.mutate(payload);
  };

  const handleEditWorker = () => {
    if (!editingWorkerId || !formData.name || !formData.position || !formData.weeklyRate) {
      toast({ description: "Please fill in all required fields" });
      return;
    }

    const extendedDetails = {
      telephone: formData.telephone,
      email: formData.email,
      paymentStartDate: formData.paymentStartDate,
      address: formData.address,
      bankName: formData.bankName,
      routingNumber: formData.routingNumber,
      accountNumber: formData.accountNumber,
      accountType: formData.accountType,
      checkNumber: formData.checkNumber,
      paymentDay: formData.paymentDay,
      defaultDaysWorkedPerWeek: formData.defaultDaysWorkedPerWeek,
    };

    const payload = {
      name: formData.name,
      position: formData.position,
      weekly_rate: parseFloat(formData.weeklyRate),
      hire_date: formData.startDate || null,
      payment_method: formData.paymentMethod,
      status: formData.paymentStatus,
      bank_details: extendedDetails,
    };

    updateWorkerMutation.mutate({ id: editingWorkerId, data: payload });
  };

  const handleDeleteWorker = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteWorkerMutation.mutate(id);
    }
  };

  const handleEdit = (worker: Employee) => {
    const details = worker.bank_details || {};
    setEditingWorkerId(worker.id);
    setFormData({
      name: worker.name,
      position: worker.position || "",
      weeklyRate: worker.weekly_rate?.toString() || "",
      startDate: worker.hire_date || "",
      paymentMethod: worker.payment_method || "direct_deposit",
      paymentStatus: worker.status || "active",
      telephone: details.telephone || "",
      email: details.email || "",
      paymentStartDate: details.paymentStartDate || "",
      address: details.address || "",
      bankName: details.bankName || "",
      routingNumber: details.routingNumber || "",
      accountNumber: details.accountNumber || "",
      accountType: details.accountType || "checking",
      checkNumber: details.checkNumber || "",
      paymentDay: details.paymentDay || "wednesday",
      defaultDaysWorkedPerWeek: details.defaultDaysWorkedPerWeek?.toString() || "5",
    });
    setIsEditModalOpen(true);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "leaving":
        return "bg-red-100 text-red-800";
      default:
        return "bg-slate-100 text-slate-800";
    }
  };

  const printWorkersList = () => {
    try {
      if (workers.length === 0) {
        toast({ description: "No workers to print" });
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
      pdf.text("Workers Management", margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(9);
      pdf.setFont(undefined, "normal");
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
      yPosition += 8;

      const totalWeeklyPayroll = workers.reduce((sum, w) => sum + (w.weekly_rate || 0), 0);
      const activeWorkers = workers.filter((w) => w.status === "active").length;
      pdf.setFontSize(9);
      pdf.text(`Total Workers: ${workers.length} | Active: ${activeWorkers} | Weekly Payroll: $${totalWeeklyPayroll.toLocaleString()}`, margin, yPosition);
      yPosition += 6;

      const colWidths = [15, 45, 42, 25, 25, 35, 20];
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

      workers.forEach((worker) => {
        if (yPosition > pageHeight - 10) {
          pdf.addPage();
          yPosition = 15;
        }

        xPosition = margin;
        const cellTextHeight = lineHeight;

        pdf.text(worker.id.substring(0, 8), xPosition + cellPadding, yPosition);
        xPosition += colWidths[0];

        let nameToPrint = worker.name;
        if (nameToPrint.length > 30) {
          nameToPrint = nameToPrint.substring(0, 27) + "...";
        }
        pdf.text(nameToPrint, xPosition + cellPadding, yPosition);
        xPosition += colWidths[1];

        let positionToPrint = worker.position || "";
        if (positionToPrint.length > 28) {
          positionToPrint = positionToPrint.substring(0, 25) + "...";
        }
        pdf.text(positionToPrint, xPosition + cellPadding, yPosition);
        xPosition += colWidths[2];

        pdf.text(`$${(worker.weekly_rate || 0).toLocaleString()}`, xPosition + cellPadding, yPosition);
        xPosition += colWidths[3];

        const startDateFormatted = worker.hire_date ? new Date(worker.hire_date).toLocaleDateString() : "-";
        pdf.text(startDateFormatted, xPosition + cellPadding, yPosition);
        xPosition += colWidths[4];

        let paymentMethod = worker.payment_method
          ? worker.payment_method.charAt(0).toUpperCase() + worker.payment_method.slice(1).replace(/_/g, " ")
          : "-";
        if (paymentMethod.length > 20) {
          paymentMethod = paymentMethod.substring(0, 17) + "...";
        }
        pdf.text(paymentMethod, xPosition + cellPadding, yPosition);
        xPosition += colWidths[5];

        const status = worker.status ? worker.status.charAt(0).toUpperCase() + worker.status.slice(1) : "Active";
        pdf.text(status, xPosition + cellPadding, yPosition);

        yPosition += cellTextHeight + 1;
      });

      yPosition += 3;
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(9);
      pdf.text(`Total Workers: ${workers.length}`, margin, yPosition);
      pdf.text(`Weekly Payroll: $${totalWeeklyPayroll.toLocaleString()}`, margin + 50, yPosition);

      pdf.save(`Workers-List-${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "Print Successful", description: "Workers list exported as PDF" });
    } catch (error) {
      console.error("Error generating workers list:", error);
      toast({ description: "Error generating report. Please try again." });
    }
  };

  const printWorkersDetails = () => {
    try {
      if (workers.length === 0) {
        toast({ description: "No workers to print" });
        return;
      }

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;
      const margin = 12;
      const contentWidth = pageWidth - margin * 2;

      pdf.setFontSize(16);
      pdf.setFont(undefined, "bold");
      pdf.text("Workers Details Report", margin, yPosition);
      yPosition += 8;

      pdf.setFontSize(9);
      pdf.setFont(undefined, "normal");
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, margin, yPosition);
      yPosition += 7;

      const totalWeeklyPayroll = workers.reduce((sum, w) => sum + (w.weekly_rate || 0), 0);
      const activeWorkers = workers.filter((w) => w.status === "active").length;

      pdf.setFontSize(9);
      pdf.setFont(undefined, "bold");
      pdf.text("Summary", margin, yPosition);
      yPosition += 5;

      pdf.setFont(undefined, "normal");
      const summaryLines = [
        { label: "Total Workers:", value: workers.length.toString() },
        { label: "Active Workers:", value: activeWorkers.toString() },
        { label: "Weekly Payroll Total:", value: `$${totalWeeklyPayroll.toLocaleString()}` },
      ];

      summaryLines.forEach((line) => {
        pdf.text(line.label, margin, yPosition);
        pdf.text(line.value, margin + 50, yPosition);
        yPosition += 5;
      });

      yPosition += 5;

      workers.forEach((worker) => {
        if (yPosition > pageHeight - 40) {
          pdf.addPage();
          yPosition = 15;
        }

        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
        pdf.setFillColor(230, 230, 230);
        pdf.rect(margin, yPosition - 3, contentWidth, 7, "F");
        pdf.text(`${worker.id.substring(0, 8)} - ${worker.name}`, margin + 3, yPosition + 1);
        yPosition += 8;

        pdf.setFont(undefined, "normal");
        pdf.setFontSize(9);

        const details = worker.bank_details || {};
        const detailLines = [
          { label: "Position:", value: worker.position || "-" },
          { label: "Weekly Rate:", value: `$${(worker.weekly_rate || 0).toLocaleString()}` },
          { label: "Start Date:", value: worker.hire_date ? formatDateString(worker.hire_date) : "-" },
          { label: "Payment Method:", value: worker.payment_method ? worker.payment_method.charAt(0).toUpperCase() + worker.payment_method.slice(1).replace(/_/g, " ") : "-" },
          { label: "Status:", value: worker.status ? worker.status.charAt(0).toUpperCase() + worker.status.slice(1) : "Active" },
        ];

        const labelColumnWidth = contentWidth * 0.35;
        const valueX = margin + labelColumnWidth + 3;

        detailLines.forEach((line) => {
          pdf.text(line.label, margin, yPosition, { maxWidth: labelColumnWidth });
          pdf.text(line.value, valueX, yPosition, { maxWidth: contentWidth - labelColumnWidth - 3 });
          yPosition += 5;
        });

        yPosition += 3;
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(8);
        pdf.text("Personal Information", margin, yPosition);
        yPosition += 4;

        pdf.setFont(undefined, "normal");
        const personalLines = [
          { label: "Email:", value: details.email || "-" },
          { label: "Telephone:", value: details.telephone || "-" },
          { label: "Address:", value: details.address || "-" },
        ];

        personalLines.forEach((line) => {
          pdf.text(line.label, margin, yPosition, { maxWidth: labelColumnWidth });
          pdf.text(line.value, valueX, yPosition, { maxWidth: contentWidth - labelColumnWidth - 3 });
          yPosition += 5;
        });

        yPosition += 4;
      });

      yPosition += 5;
      if (yPosition > pageHeight - 15) {
        pdf.addPage();
        yPosition = 15;
      }

      pdf.setFont(undefined, "bold");
      pdf.setFontSize(10);
      pdf.text("Payroll Summary", margin, yPosition);
      yPosition += 6;

      pdf.setFont(undefined, "normal");
      pdf.setFontSize(9);
      pdf.text(`Total Weekly Payroll: $${totalWeeklyPayroll.toLocaleString()}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Monthly Payroll (est.): $${(totalWeeklyPayroll * 4.33).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, yPosition);

      pdf.save(`Workers-Details-${new Date().toISOString().split("T")[0]}.pdf`);
      toast({ title: "Print Successful", description: "Workers details exported as PDF" });
    } catch (error) {
      console.error("Error generating workers details:", error);
      toast({ description: "Error generating report. Please try again." });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Workers Management</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Manage team members and track worker information</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={printWorkersDetails}
            className="gap-2 bg-amber-600 hover:bg-amber-700 w-full sm:w-auto justify-center"
          >
            <Printer className="w-4 h-4" />
            Print Details
          </Button>
          <Button
            onClick={printWorkersList}
            className="gap-2 bg-slate-600 hover:bg-slate-700 w-full sm:w-auto justify-center"
          >
            <Printer className="w-4 h-4" />
            Print List
          </Button>
          {user?.role === "admin" || user?.role === "manager" ? (
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 bg-blue-600 hover:bg-blue-700 w-full sm:w-auto justify-center"
                  onClick={() => resetForm()}
                >
                  <Plus className="w-4 h-4" />
                  Add Worker
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Worker</DialogTitle>
                  <DialogDescription>Add a new team member</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Worker name"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Input
                      id="position"
                      value={formData.position}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="e.g., Cabinet Maker"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weeklyRate">Weekly Rate ($) *</Label>
                    <Input
                      id="weeklyRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.weeklyRate}
                      onChange={(e) => setFormData({ ...formData, weeklyRate: e.target.value })}
                      placeholder="0.00"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                    >
                      <SelectTrigger className="border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.paymentStatus}
                      onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}
                    >
                      <SelectTrigger className="border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                        <SelectItem value="leaving">Leaving</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telephone">Telephone</Label>
                    <Input
                      id="telephone"
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street address"
                      className="border-slate-300"
                    />
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsAddModalOpen(false)}
                      className="border-slate-300"
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleAddWorker} className="bg-blue-600 hover:bg-blue-700">
                      Add Worker
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-4">
          {workers.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-6 text-center text-slate-500">
                No workers added yet
              </CardContent>
            </Card>
          ) : (
            workers.map((worker) => (
              <Card key={worker.id} className="border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">{worker.name}</CardTitle>
                      <CardDescription>{worker.position || "-"}</CardDescription>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(worker.status)}`}>
                      {worker.status || "active"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-500">Weekly Rate:</div>
                    <div className="font-medium text-slate-900 text-right">${(worker.weekly_rate || 0).toLocaleString()}</div>
                    
                    <div className="text-slate-500">Start Date:</div>
                    <div className="font-medium text-slate-900 text-right">{worker.hire_date ? formatDateString(worker.hire_date) : "-"}</div>
                    
                    <div className="text-slate-500">ID:</div>
                    <div className="font-mono text-slate-900 text-right">{worker.id.substring(0, 8)}</div>
                  </div>

                  {(user?.role === "admin" || user?.role === "manager") && (
                    <div className="flex gap-2 pt-2 border-t border-slate-100 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-purple-600 hover:bg-purple-50"
                        onClick={() => handleEdit(worker)}
                      >
                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteWorker(worker.id, worker.name)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop View - Table */}
        <Card className="hidden md:block border-slate-200">
          <CardHeader>
            <CardTitle>Workers List</CardTitle>
            <CardDescription>All team members ({workers.length})</CardDescription>
          </CardHeader>
          <CardContent>
            {workers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">No workers added yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="text-left p-3 font-semibold text-slate-900">ID</th>
                      <th className="text-left p-3 font-semibold text-slate-900">Name</th>
                      <th className="text-left p-3 font-semibold text-slate-900">Position</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Weekly Rate</th>
                      <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Start Date</th>
                      <th className="text-left p-3 font-semibold text-slate-900">Status</th>
                      <th className="text-left p-3 font-semibold text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workers.map((worker, idx) => (
                      <tr key={worker.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="p-3 text-slate-700 font-medium">{worker.id.substring(0, 8)}</td>
                        <td className="p-3 text-slate-700">{worker.name}</td>
                        <td className="p-3 text-slate-700">{worker.position || "-"}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">${(worker.weekly_rate || 0).toLocaleString()}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">
                          {worker.hire_date ? formatDateString(worker.hire_date) : "-"}
                        </td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(worker.status)}`}>
                            {worker.status || "active"}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            {user?.role === "admin" || user?.role === "manager" ? (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-purple-600 hover:bg-purple-50 gap-1"
                                  onClick={() => handleEdit(worker)}
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50 gap-1"
                                  onClick={() => handleDeleteWorker(worker.id, worker.name)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </Button>
                              </>
                            ) : (
                              <span className="text-xs text-slate-500">View only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      {isEditModalOpen && editingWorkerId && (user?.role === "admin" || user?.role === "manager") ? (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Worker</DialogTitle>
              <DialogDescription>Update worker information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-position">Position *</Label>
                <Input
                  id="edit-position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-weeklyRate">Weekly Rate ($) *</Label>
                <Input
                  id="edit-weeklyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weeklyRate}
                  onChange={(e) => setFormData({ ...formData, weeklyRate: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">Start Date *</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-paymentMethod">Payment Method</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => setFormData({ ...formData, paymentMethod: value })}
                >
                  <SelectTrigger className="border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.paymentStatus}
                  onValueChange={(value) => setFormData({ ...formData, paymentStatus: value })}
                >
                  <SelectTrigger className="border-slate-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="leaving">Leaving</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telephone">Telephone</Label>
                <Input
                  id="edit-telephone"
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="border-slate-300"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingWorkerId(null);
                    resetForm();
                  }}
                  className="border-slate-300"
                >
                  Cancel
                </Button>
                <Button onClick={handleEditWorker} className="bg-blue-600 hover:bg-blue-700">
                  Update Worker
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}