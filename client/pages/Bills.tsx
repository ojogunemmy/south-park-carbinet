import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Loader2, Calendar } from "lucide-react";
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
  "Materials",
  "Energy",
  "Water",
  "Cleaning",
  "Landscape",
  "Insurance",
  "Rent",
  "Uniform",
  "Other",
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
    category: "Materials",
    status: "pending",
    description: "",
  });

  // Fetch Bills
  const { data: bills = [], isLoading } = useQuery({
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
      category: "Materials",
      status: "pending",
      description: "",
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
      createBillMutation.mutate(formData as Omit<Bill, "id" | "created_at" | "updated_at">);
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
      <div className="flex items-center justify-between">
         <div>
          <h1 className="text-3xl font-bold text-slate-900">Bills</h1>
          <p className="text-slate-600 mt-1">Track company expenses and bills</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => { resetForm(); setIsModalOpen(true); }}
            className="bg-orange-600 hover:bg-orange-700 gap-2"
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

      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center gap-4">
        <Label>Filter Status:</Label>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]">
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

      <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
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
                        {bill.description && <div className="text-xs text-slate-500 font-normal">{bill.description}</div>}
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

       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
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
               <Label>Description</Label>
               <Input value={formData.description || ""} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="e.g. Monthly supplies" />
             </div>
             <div className="space-y-2">
               <Label>Amount ($) *</Label>
               <Input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: parseFloat(e.target.value) || 0})} />
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
