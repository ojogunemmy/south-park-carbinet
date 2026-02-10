import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2, Printer } from "lucide-react";
import { useState, useEffect } from "react";
import {
  employeesService,
  type Employee
} from "@/lib/supabase-service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
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
import { formatDateString } from "@/utils/yearStorage";

export default function Workers() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [workers, setWorkers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({
    payment_status: "active",
    payment_method: "direct_deposit",
  });

  const fetchWorkers = async () => {
    try {
      setLoading(true);
      const data = await employeesService.getAll();
      setWorkers(data);
    } catch (error) {
      console.error("Error fetching workers:", error);
      toast({ 
        title: "Error", 
        description: "Failed to load workers", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  const handleAddWorker = async () => {
    if (!formData.name || !formData.position || !formData.weekly_rate || !formData.hire_date) {
      toast({ description: "Please fill in all required fields" });
      return;
    }

    try {
      await employeesService.create({
        ...formData,
        weekly_rate: Number(formData.weekly_rate),
      });

      fetchWorkers();
      setFormData({ payment_status: "active", payment_method: "direct_deposit" });
      setIsAddModalOpen(false);
      toast({ title: "Worker Added", description: `${formData.name} added successfully` });
    } catch (error) {
      console.error("Error adding worker:", error);
      toast({ title: "Error", description: "Failed to add worker", variant: "destructive" });
    }
  };

  const handleEditWorker = async () => {
    if (!editingWorkerId || !formData.name || !formData.position || !formData.weekly_rate) {
      toast({ description: "Please fill in all required fields" });
      return;
    }

    try {
      await employeesService.update(editingWorkerId, {
        ...formData,
        weekly_rate: Number(formData.weekly_rate),
      });

      fetchWorkers();
      setEditingWorkerId(null);
      setFormData({ payment_status: "active", payment_method: "direct_deposit" });
      setIsEditModalOpen(false);
      toast({ title: "Worker Updated", description: "Worker information updated successfully" });
    } catch (error) {
      console.error("Error updating worker:", error);
      toast({ title: "Error", description: "Failed to update worker", variant: "destructive" });
    }
  };

  const handleDeleteWorker = async (id: string) => {
    if (window.confirm("Are you sure you want to remove this worker?")) {
      try {
        await employeesService.delete(id);
        fetchWorkers();
        toast({
          title: "Worker Removed",
          description: "Worker removed successfully",
        });
      } catch (error) {
        console.error("Error removing worker:", error);
        toast({ title: "Error", description: "Failed to remove worker", variant: "destructive" });
      }
    }
  };

  const handleEdit = (worker: Employee) => {
    setEditingWorkerId(worker.id);
    setFormData(worker);
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

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = 12;

      const totalWeeklyPayroll = workers.reduce((sum, w) => sum + (Number(w.weekly_rate) || 0), 0);
      const activeWorkers = workers.filter((w) => w.payment_status === 'active').length;
      const uniquePositions = new Set(workers.map((w) => w.position).filter(Boolean)).size;

      // Company Header Background
      pdf.setFillColor(31, 41, 55);
      pdf.rect(0, 0, pageWidth, 22, 'F');

      // Company Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('SOUTH PARK CABINETS', margin, 10);
      yPosition = 18;

      // Subtitle
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'normal');
      pdf.text('Workers List', margin, yPosition);
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(9);
      pdf.text(
        `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        pageWidth - margin - 60,
        yPosition,
      );
      pdf.setTextColor(0, 0, 0);

      yPosition = 28;

      // Summary Statistics Boxes
      const boxWidth = (contentWidth - 9) / 4;
      const summaryData = [
        { label: 'Total Workers', value: workers.length, color: [59, 130, 246] as const },
        { label: 'Active', value: activeWorkers, color: [34, 197, 94] as const },
        { label: 'Positions', value: uniquePositions, color: [168, 85, 247] as const },
        { label: 'Weekly Payroll', value: `$${totalWeeklyPayroll.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: [249, 115, 22] as const },
      ];

      summaryData.forEach((item, idx) => {
        const xPos = margin + idx * (boxWidth + 3);
        const [r, g, b] = item.color;
        pdf.setFillColor(r, g, b);
        pdf.rect(xPos, yPosition, boxWidth, 12, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text(item.label, xPos + 2, yPosition + 4);

        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text(String(item.value), xPos + 2, yPosition + 10);
      });
      pdf.setTextColor(0, 0, 0);

      yPosition += 18;

      // Table headers with background
      const colWidths = [18, 52, 44, 26, 24, 34, 27];
      const headers = ['ID', 'Name', 'Position', 'Weekly Rate', 'Start Date', 'Payment Method', 'Status'];

      pdf.setFillColor(59, 70, 87);
      pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F');

      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);
      let xPosition = margin + 2;
      headers.forEach((header, idx) => {
        if (idx === 3) {
          pdf.text(header, xPosition + colWidths[idx] - 3, yPosition, { align: 'right' });
        } else {
          pdf.text(header, xPosition, yPosition);
        }
        xPosition += colWidths[idx];
      });

      pdf.setTextColor(0, 0, 0);
      yPosition += 12;

      let lineIndex = 0;
      const pageFooter = () => {
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${pdf.internal.pages.length}`, pageWidth - margin - 10, pageHeight - 5);
        pdf.setTextColor(0, 0, 0);
      };

      workers.forEach((worker) => {
        const nameLines = pdf.splitTextToSize(String(worker.name || ''), colWidths[1] - 4);
        const positionLines = pdf.splitTextToSize(String(worker.position || ''), colWidths[2] - 4);
        const methodLabel = worker.payment_method
          ? worker.payment_method.charAt(0).toUpperCase() + worker.payment_method.slice(1).replace(/_/g, ' ')
          : '-';
        const methodLines = pdf.splitTextToSize(String(methodLabel), colWidths[5] - 4);
        const statusLabel = worker.payment_status
          ? worker.payment_status.charAt(0).toUpperCase() + worker.payment_status.slice(1)
          : 'Active';

        const maxLines = Math.max(1, nameLines.length, positionLines.length, methodLines.length);
        const rowHeight = Math.max(12, 6 + maxLines * 4);

        if (yPosition + rowHeight > pageHeight - 15) {
          pageFooter();
          pdf.addPage();
          yPosition = 15;

          // Repeat table header
          pdf.setFillColor(59, 70, 87);
          pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont(undefined, 'bold');
          pdf.setFontSize(11);
          xPosition = margin + 2;
          headers.forEach((header, idx) => {
            if (idx === 3) {
              pdf.text(header, xPosition + colWidths[idx] - 3, yPosition, { align: 'right' });
            } else {
              pdf.text(header, xPosition, yPosition);
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
        pdf.rect(margin, yPosition - 6, contentWidth, rowHeight, 'F');
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.2);
        pdf.line(margin, yPosition - 6 + rowHeight, margin + contentWidth, yPosition - 6 + rowHeight);

        xPosition = margin + 2;
        const baseY = yPosition;

        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(10);
        pdf.text(String(worker.id || ''), xPosition, baseY);
        xPosition += colWidths[0];

        pdf.setFont(undefined, 'bold');
        pdf.text(nameLines[0] || '', xPosition, baseY);
        if (nameLines.length > 1) {
          pdf.setFont(undefined, 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(80, 80, 80);
          pdf.text(nameLines.slice(1), xPosition, baseY + 4);
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(10);
        }
        xPosition += colWidths[1];

        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        pdf.text(positionLines, xPosition, baseY);
        pdf.setFontSize(10);
        xPosition += colWidths[2];

        pdf.setFont(undefined, 'bold');
        pdf.text(
          `$${(Number(worker.weekly_rate) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          xPosition + colWidths[3] - 3,
          baseY,
          { align: 'right' },
        );
        xPosition += colWidths[3];

        const hireDate = worker.hire_date ? new Date(worker.hire_date).toLocaleDateString() : '-';
        pdf.setFont(undefined, 'normal');
        pdf.text(hireDate, xPosition, baseY);
        xPosition += colWidths[4];

        pdf.setFontSize(9);
        pdf.text(methodLines, xPosition, baseY);
        pdf.setFontSize(10);
        xPosition += colWidths[5];

        pdf.text(statusLabel, xPosition, baseY);

        yPosition += rowHeight;
        lineIndex += 1;
      });

      // Footer
      const footerY = pageHeight - 10;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, footerY, pageWidth - margin, footerY);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text(
        `Total Workers: ${workers.length} | Active: ${activeWorkers} | Weekly Payroll: $${totalWeeklyPayroll.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        margin,
        footerY + 5,
      );
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Page ${pdf.internal.pages.length}`, pageWidth - margin - 10, footerY + 5);

      pdf.save(`Workers-List-${new Date().toISOString().split('T')[0]}.pdf`);
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

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = 12;

      const totalWeeklyPayroll = workers.reduce((sum, w) => sum + (Number(w.weekly_rate) || 0), 0);
      const activeWorkers = workers.filter((w) => w.payment_status === 'active').length;

      // Company Header Background
      pdf.setFillColor(31, 41, 55);
      pdf.rect(0, 0, pageWidth, 22, 'F');

      // Company Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont(undefined, 'bold');
      pdf.text('SOUTH PARK CABINETS', margin, 10);
      yPosition = 18;

      // Subtitle
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'normal');
      pdf.text('Workers Details', margin, yPosition);
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(9);
      pdf.text(
        `Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
        pageWidth - margin - 60,
        yPosition,
      );
      pdf.setTextColor(0, 0, 0);

      yPosition = 28;

      // Summary Statistics Boxes
      const boxWidth = (contentWidth - 9) / 4;
      const summaryData = [
        { label: 'Total Workers', value: workers.length, color: [59, 130, 246] as const },
        { label: 'Active', value: activeWorkers, color: [34, 197, 94] as const },
        { label: 'Weekly Payroll', value: `$${totalWeeklyPayroll.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: [168, 85, 247] as const },
        { label: 'Monthly (est.)', value: `$${(totalWeeklyPayroll * 4.33).toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: [249, 115, 22] as const },
      ];

      summaryData.forEach((item, idx) => {
        const xPos = margin + idx * (boxWidth + 3);
        const [r, g, b] = item.color;
        pdf.setFillColor(r, g, b);
        pdf.rect(xPos, yPosition, boxWidth, 12, 'F');

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text(item.label, xPos + 2, yPosition + 4);

        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text(String(item.value), xPos + 2, yPosition + 10);
      });
      pdf.setTextColor(0, 0, 0);

      yPosition += 18;

      // Table
      const colWidths = [18, 46, 40, 24, 24, 28, 20, 43, 30];
      const headers = ['ID', 'Name', 'Position', 'Weekly Rate', 'Start Date', 'Method', 'Status', 'Email', 'Telephone'];

      pdf.setFillColor(59, 70, 87);
      pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(11);

      let xPosition = margin + 2;
      headers.forEach((header, idx) => {
        if (idx === 3) {
          pdf.text(header, xPosition + colWidths[idx] - 3, yPosition, { align: 'right' });
        } else {
          pdf.text(header, xPosition, yPosition);
        }
        xPosition += colWidths[idx];
      });

      pdf.setTextColor(0, 0, 0);
      yPosition += 12;

      let lineIndex = 0;
      workers.forEach((worker) => {
        const nameLines = pdf.splitTextToSize(String(worker.name || ''), colWidths[1] - 4);
        const positionLines = pdf.splitTextToSize(String(worker.position || ''), colWidths[2] - 4);
        const methodLabel = worker.payment_method
          ? worker.payment_method.charAt(0).toUpperCase() + worker.payment_method.slice(1).replace(/_/g, ' ')
          : '-';
        const methodLines = pdf.splitTextToSize(String(methodLabel), colWidths[5] - 4);
        const emailLines = pdf.splitTextToSize(String(worker.email || '-'), colWidths[7] - 4);
        const phoneLines = pdf.splitTextToSize(String(worker.telephone || '-'), colWidths[8] - 4);
        const statusLabel = worker.payment_status
          ? worker.payment_status.charAt(0).toUpperCase() + worker.payment_status.slice(1)
          : 'Active';

        const maxLines = Math.max(1, nameLines.length, positionLines.length, methodLines.length, emailLines.length, phoneLines.length);
        const rowHeight = Math.max(12, 6 + maxLines * 4);

        if (yPosition + rowHeight > pageHeight - 15) {
          pdf.setFontSize(9);
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Page ${pdf.internal.pages.length}`, pageWidth - margin - 10, pageHeight - 5);
          pdf.setTextColor(0, 0, 0);

          pdf.addPage();
          yPosition = 15;

          pdf.setFillColor(59, 70, 87);
          pdf.rect(margin, yPosition - 5, contentWidth, 8, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont(undefined, 'bold');
          pdf.setFontSize(11);
          xPosition = margin + 2;
          headers.forEach((header, idx) => {
            if (idx === 3) {
              pdf.text(header, xPosition + colWidths[idx] - 3, yPosition, { align: 'right' });
            } else {
              pdf.text(header, xPosition, yPosition);
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
        pdf.rect(margin, yPosition - 6, contentWidth, rowHeight, 'F');
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.2);
        pdf.line(margin, yPosition - 6 + rowHeight, margin + contentWidth, yPosition - 6 + rowHeight);

        xPosition = margin + 2;
        const baseY = yPosition;

        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(10);
        pdf.text(String(worker.id || ''), xPosition, baseY);
        xPosition += colWidths[0];

        pdf.text(nameLines[0] || '', xPosition, baseY);
        if (nameLines.length > 1) {
          pdf.setFont(undefined, 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(80, 80, 80);
          pdf.text(nameLines.slice(1), xPosition, baseY + 4);
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'bold');
        }
        xPosition += colWidths[1];

        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        pdf.text(positionLines, xPosition, baseY);
        xPosition += colWidths[2];

        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(10);
        pdf.text(
          `$${(Number(worker.weekly_rate) || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
          xPosition + colWidths[3] - 3,
          baseY,
          { align: 'right' },
        );
        xPosition += colWidths[3];

        const hireDate = worker.hire_date ? new Date(worker.hire_date).toLocaleDateString() : '-';
        pdf.setFont(undefined, 'normal');
        pdf.text(hireDate, xPosition, baseY);
        xPosition += colWidths[4];

        pdf.setFontSize(9);
        pdf.text(methodLines, xPosition, baseY);
        pdf.setFontSize(10);
        xPosition += colWidths[5];

        pdf.text(statusLabel, xPosition, baseY);
        xPosition += colWidths[6];

        pdf.setFontSize(9);
        pdf.text(emailLines, xPosition, baseY);
        pdf.setFontSize(10);
        xPosition += colWidths[7];

        pdf.setFontSize(9);
        pdf.text(phoneLines, xPosition, baseY);
        pdf.setFontSize(10);

        yPosition += rowHeight;
        lineIndex += 1;
      });

      const footerY = pageHeight - 10;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, footerY, pageWidth - margin, footerY);
      pdf.setFont(undefined, 'bold');
      pdf.setFontSize(9);
      pdf.setTextColor(0, 0, 0);
      pdf.text(
        `Total Workers: ${workers.length} | Active: ${activeWorkers} | Weekly Payroll: $${totalWeeklyPayroll.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
        margin,
        footerY + 5,
      );
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Page ${pdf.internal.pages.length}`, pageWidth - margin - 10, footerY + 5);

      pdf.save(`Workers-Details-${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: "Print Successful", description: "Workers details exported as PDF" });
    } catch (error) {
      console.error("Error generating workers details:", error);
      toast({ description: "Error generating report. Please try again." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Workers Management</h1>
          <p className="text-slate-600 mt-1">Manage team members and track worker information</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={printWorkersDetails}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
          >
            <Printer className="w-4 h-4" />
            Print Details
          </Button>
          <Button
            onClick={printWorkersList}
            className="gap-2 bg-slate-600 hover:bg-slate-700"
          >
            <Printer className="w-4 h-4" />
            Print List
          </Button>
          {user?.role === "admin" || user?.role === "manager" ? (
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    setFormData({ payment_status: "active", payment_method: "direct_deposit" });
                  }}
                >
                  <Plus className="w-4 h-4" />
                  Add Worker
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Worker</DialogTitle>
                  <DialogDescription>Add a new team member</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Worker name"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="position">Position *</Label>
                    <Input
                      id="position"
                      value={formData.position || ""}
                      onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                      placeholder="e.g., Cabinet Maker"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekly_rate">Weekly Rate ($) *</Label>
                    <Input
                      id="weekly_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.weekly_rate || ""}
                      onChange={(e) => setFormData({ ...formData, weekly_rate: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hire_date">Start Date *</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date || ""}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_method">Payment Method</Label>
                    <Select
                      value={formData.payment_method || "direct_deposit"}
                      onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}
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
                      value={formData.payment_status || "active"}
                      onValueChange={(value: any) => setFormData({ ...formData, payment_status: value })}
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
                      value={formData.email || ""}
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
                      value={formData.telephone || ""}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Street address"
                      className="border-slate-300"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ssn">Social/TIN</Label>
                    <Input
                      id="ssn"
                      value={formData.ssn || ""}
                      onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
                      placeholder="XXX-XX-XXXX"
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

      {/* Workers List */}
      <Card className="border-slate-200">
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
            <>
              <div className="hidden lg:block overflow-x-auto">
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
                        <td className="p-3 text-slate-700 font-medium">{worker.id}</td>
                        <td className="p-3 text-slate-700">{worker.name}</td>
                        <td className="p-3 text-slate-700">{worker.position}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">${worker.weekly_rate.toLocaleString()}</td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">{formatDateString(worker.hire_date)}</td>
                        <td className="p-3">
                          <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(worker.payment_status)}`}>
                            {worker.payment_status || "active"}
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
                                  onClick={() => handleDeleteWorker(worker.id)}
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

              <div className="lg:hidden space-y-3">
                {workers.map((worker) => (
                  <div key={worker.id} className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate">{worker.name}</div>
                        <div className="text-sm text-slate-600 truncate">{worker.position}</div>
                        <div className="text-[11px] text-slate-400 mt-1 truncate">ID: {worker.id}</div>
                      </div>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${getStatusColor(worker.payment_status)}`}>
                        {worker.payment_status || "active"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>
                        <span className="block text-slate-400">Weekly Rate</span>
                        <span className="font-medium text-slate-900">${worker.weekly_rate.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400">Start Date</span>
                        <span className="font-medium text-slate-900">{formatDateString(worker.hire_date)}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end gap-2">
                      {user?.role === "admin" || user?.role === "manager" ? (
                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-slate-300 w-full"
                            onClick={() => handleEdit(worker)}
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 border-red-200 text-red-700 hover:bg-red-50 w-full"
                            onClick={() => handleDeleteWorker(worker.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">View only</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {isEditModalOpen && editingWorkerId && user?.role === "admin" || user?.role === "manager" ? (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Worker</DialogTitle>
              <DialogDescription>Update worker information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-position">Position *</Label>
                <Input
                  id="edit-position"
                  value={formData.position || ""}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-weekly_rate">Weekly Rate ($) *</Label>
                <Input
                  id="edit-weekly_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weekly_rate || ""}
                  onChange={(e) => setFormData({ ...formData, weekly_rate: parseFloat(e.target.value) || 0 })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-hire_date">Start Date *</Label>
                <Input
                  id="edit-hire_date"
                  type="date"
                  value={formData.hire_date || ""}
                  onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method || "direct_deposit"}
                  onValueChange={(value: any) => setFormData({ ...formData, payment_method: value })}
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
                  value={formData.payment_status || "active"}
                  onValueChange={(value: any) => setFormData({ ...formData, payment_status: value })}
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
                  value={formData.email || ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-telephone">Telephone</Label>
                <Input
                  id="edit-telephone"
                  type="tel"
                  value={formData.telephone || ""}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-address">Address</Label>
                <Input
                  id="edit-address"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ssn">Social/TIN</Label>
                <Input
                  id="edit-ssn"
                  value={formData.ssn || ""}
                  onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
                  className="border-slate-300"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingWorkerId(null);
                    setFormData({});
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
