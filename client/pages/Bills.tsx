import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Loader2, Calendar, AlertCircle } from "lucide-react";
import { useState } from "react";
import { useYear } from "@/contexts/YearContext";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { billsService, type Bill } from "@/lib/supabase-service";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "sonner";
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
import { format } from "date-fns";

const BILL_CATEGORIES = [
  "materials",
  "labor",
  "permits",
  "other",
];

export default function Bills() {
  const { toast } = useToast();
  const { selectedYear } = useYear();
  const { user } = useSupabaseAuth();
  const queryClient = useQueryClient();

  // State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const [formData, setFormData] = useState<Partial<Bill>>({
    vendor: "",
    amount: 0,
    due_date: "",
    purchase_date: format(new Date(), "yyyy-MM-dd"),
    category: "materials",
    status: "pending",
    notes: "",
  });

  // Fetch Bills
  const { data: bills = [], isLoading } = useQuery<Bill[]>({
    queryKey: ['bills'],
    queryFn: billsService.getAll,
    enabled: !!user,
  });

  // Mutations
  const createBillMutation = useMutation({
    mutationFn: billsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setIsModalOpen(false);
      resetForm();
      toast({ title: "Success", description: "Bill added successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to add bill" });
    }
  });

  const updateBillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Bill> }) => billsService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      setIsModalOpen(false);
      resetForm();
      toast({ title: "Success", description: "Bill updated successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to update bill" });
    }
  });

  const deleteBillMutation = useMutation({
    mutationFn: billsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast({ title: "Success", description: "Bill deleted successfully" });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", description: err.message || "Failed to delete bill" });
    }
  });

  const resetForm = () => {
    setFormData({
      vendor: "",
      amount: 0,
      due_date: "",
      purchase_date: format(new Date(), "yyyy-MM-dd"),
      category: "materials",
      status: "pending",
      notes: "",
    });
    setSelectedBill(null);
    setIsEditMode(false);
  };

  const handleEdit = (bill: Bill) => {
    setSelectedBill(bill);
    setFormData({
      ...bill,
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string, vendor: string) => {
    if (confirm(`Are you sure you want to delete bill from ${vendor}?`)) {
      deleteBillMutation.mutate(id);
    }
  };

  const handleSave = () => {
    if (!formData.vendor || !formData.amount) {
      toast({ variant: "destructive", description: "Vendor and Amount are required" });
      return;
    }

    if (isEditMode && selectedBill) {
      updateBillMutation.mutate({ id: selectedBill.id, data: formData });
    } else {
      // Generate ID like BILL-2026-xxx
      const nextNum = bills.length + 1;
      const id = `BILL-${new Date().getFullYear()}-${nextNum.toString().padStart(3, '0')}`;
      
      createBillMutation.mutate({
        ...formData,
        id,
      } as Bill);
    }
  };

  const filteredBills = bills.filter(b => {
    if (filterStatus === 'all') return true;
    return b.status === filterStatus;
  });

  const totalAmount = filteredBills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const pendingAmount = filteredBills.filter(b => b.status === 'pending').reduce((sum, b) => sum + (b.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Bills</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Track company expenses and bills</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-orange-600 hover:bg-orange-700 gap-2 w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            Add Bill
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Bills</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              {filteredBills.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Outstanding Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              ${pendingAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              ${totalAmount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <Label className="text-sm">Filter Status:</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px] text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Bills</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {/* Mobile View - Cards */}
        <div className="md:hidden space-y-4">
          {filteredBills.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-6 text-center text-slate-500">
                <div className="flex flex-col items-center gap-2">
                  <AlertCircle className="w-8 h-8 text-slate-300" />
                  <p>No bills found</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredBills.map((bill) => (
              <Card key={bill.id} className="border-slate-200 shadow-sm">
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900 truncate pr-2">{bill.vendor}</CardTitle>
                      <CardDescription className="text-xs">{bill.category}</CardDescription>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize shrink-0 ${
                      bill.status === 'paid' ? 'bg-green-100 text-green-700' :
                      bill.status === 'overdue' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {bill.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-3">
                  {bill.notes && <div className="text-sm text-slate-500 italic">{bill.notes}</div>}
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-500">Amount:</div>
                    <div className="font-semibold text-slate-900 text-right">${(bill.amount || 0).toLocaleString()}</div>
                    
                    <div className="text-slate-500">Due Date:</div>
                    <div className="text-slate-900 text-right">{bill.due_date ? format(new Date(bill.due_date), "MMM d, yyyy") : "-"}</div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100 mt-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(bill)} className="text-blue-600 flex-1 justify-center bg-blue-50 hover:bg-blue-100">
                      <Edit2 className="w-4 h-4 mr-2" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(bill.id, bill.vendor)} className="text-red-600 flex-1 justify-center hover:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden md:block overflow-x-auto bg-white rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-3 text-left font-semibold text-slate-900">Vendor</th>
                <th className="p-3 text-left font-semibold text-slate-900">Category</th>
                <th className="p-3 text-left font-semibold text-slate-900">Amount</th>
                <th className="p-3 text-left font-semibold text-slate-900">Due Date</th>
                <th className="p-3 text-left font-semibold text-slate-900">Status</th>
                <th className="p-3 text-right font-semibold text-slate-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No bills found</td>
                </tr>
              ) : (
                filteredBills.map((bill) => (
                  <tr key={bill.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-900">
                      {bill.vendor}
                      {bill.notes && <div className="text-xs text-slate-500 font-normal">{bill.notes}</div>}
                    </td>
                    <td className="p-3 text-slate-600">{bill.category}</td>
                    <td className="p-3 font-semibold text-slate-900">${(bill.amount || 0).toLocaleString()}</td>
                    <td className="p-3 text-slate-600">{bill.due_date ? format(new Date(bill.due_date), "MMM d, yyyy") : "-"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        bill.status === 'paid' ? 'bg-green-100 text-green-700' :
                        bill.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {bill.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(bill)} className="h-8 w-8 text-blue-600"><Edit2 className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(bill.id, bill.vendor)} className="h-8 w-8 text-red-600"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Bill" : "Add Bill"}</DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update bill details" : "Register a new expense"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Input value={formData.vendor} onChange={e => setFormData({...formData, vendor: e.target.value})} placeholder="e.g. Home Depot" />
            </div>
            <div className="space-y-2">
              <Label>Notes/Description</Label>
              <Input value={formData.notes || ""} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="e.g. Monthly supplies" />
            </div>
            <div className="space-y-2">
              <Label>Amount ($) *</Label>
              <Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} />
            </div>
            <div className="space-y-2">
              <Label>Purchase Date *</Label>
              <Input type="date" value={formData.purchase_date || ""} onChange={e => setFormData({...formData, purchase_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={formData.due_date || ""} onChange={e => setFormData({...formData, due_date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={formData.category} onValueChange={val => setFormData({...formData, category: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BILL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={val => setFormData({...formData, status: val as any})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{isEditMode ? "Save Changes" : "Create Bill"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Toaster />
    </div>
  );
}
