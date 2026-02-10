import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Download, Printer } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useYear } from "@/contexts/YearContext";
import jsPDF from "jspdf";
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
import { materialsService, type Material } from "@/lib/supabase-service";

export default function Materials() {
  const { toast } = useToast();
  const { selectedYear } = useYear();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<Material>>({});
  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const data = await materialsService.getAll();
      setMaterials(data);
    } catch (error: any) {
      console.error("[Materials] Failed to load materials:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to load materials",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, [selectedYear]);

  const categories = [...new Set(materials.map((m) => m.category || "Uncategorized"))].sort();

  const filteredMaterials =
    filterCategory === "all"
      ? materials
      : materials.filter((m) => m.category === filterCategory);

  const handleAddMaterial = async () => {
    if (!formData.code || !formData.name || !formData.category || !formData.unit_price) {
      toast({ description: "Please fill in all required fields" });
      return;
    }

    try {
      const newMaterial = await materialsService.create({
        id: globalThis.crypto?.randomUUID?.(),
        code: formData.code,
        name: formData.name,
        category: formData.category,
        unit: formData.unit || "EA",
        unit_price: Number(formData.unit_price),
        description: formData.description,
        supplier: formData.supplier,
      });

      setMaterials([...materials, newMaterial]);
      setFormData({});
      setIsAddModalOpen(false);
      toast({ title: "Material Added", description: `${newMaterial.name} added successfully` });
    } catch (error: any) {
      console.error("[Materials] Failed to add material:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to add material",
      });
    }
  };

  const handleEditMaterial = async () => {
    if (!selectedMaterial || !formData.code || !formData.name || !formData.category || !formData.unit_price) {
      toast({ description: "Please fill in all required fields" });
      return;
    }

    try {
      const updatedMaterial = await materialsService.update(selectedMaterial.id, {
        code: formData.code,
        name: formData.name,
        category: formData.category,
        unit: formData.unit,
        unit_price: Number(formData.unit_price),
        description: formData.description,
        supplier: formData.supplier,
      });

      setMaterials(materials.map((m) => (m.id === updatedMaterial.id ? updatedMaterial : m)));
      setSelectedMaterial(null);
      setFormData({});
      setIsEditModalOpen(false);
      toast({ title: "Material Updated", description: "Material updated successfully" });
    } catch (error: any) {
      console.error("[Materials] Failed to update material:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to update material",
      });
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm("Are you sure you want to remove this material?")) return;

    try {
      await materialsService.delete(id);
      setMaterials(materials.filter((m) => m.id !== id));
      toast({
        title: "Material Removed",
        description: "Material removed successfully",
      });
    } catch (error: any) {
      console.error("[Materials] Failed to delete material:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error?.message || "Failed to delete material",
      });
    }
  };

  const handleEdit = (material: Material) => {
    setSelectedMaterial(material);
    setFormData(material);
    setIsEditModalOpen(true);
  };

  const exportToCSV = () => {
    const headers = ["Code", "Name", "Category", "Unit", "Price", "Supplier"];
    const rows = filteredMaterials.map((m) => [
      m.code,
      m.name,
      m.category,
      m.unit,
      (m.unit_price || 0).toFixed(2),
      m.supplier || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `materials-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast({ title: "Export Complete", description: "Materials exported to CSV" });
  };

  const totalValue = filteredMaterials.reduce((sum, m) => sum + (m.unit_price || 0), 0);

  const printMaterialsCatalog = () => {
    try {
      if (filteredMaterials.length === 0) {
        toast({ description: "No materials to print" });
        return;
      }

      const categoryLabel = filterCategory === "all" ? "All Materials" : `${filterCategory} Materials`;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 12;
      const margin = 12;
      const contentWidth = pageWidth - 2 * margin;

      // Company Header Background
      pdf.setFillColor(31, 41, 55); // Dark slate
      pdf.rect(0, 0, pageWidth, 22, "F");

      // Company Title
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont(undefined, "bold");
      pdf.text("SOUTH PARK CABINETS", margin, 10);
      yPosition = 18;

      // Subtitle
      pdf.setFontSize(11);
      pdf.setFont(undefined, "normal");
      pdf.text("Materials Catalog", margin, yPosition);
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(9);
      pdf.text(`Generated: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, pageWidth - margin - 60, yPosition);
      pdf.setTextColor(0, 0, 0);

      yPosition = 28;

      // Summary Statistics Boxes
      const boxWidth = (contentWidth - 9) / 4;
      const summaryData = [
        { label: "Total Materials", value: filteredMaterials.length, color: [59, 130, 246] },
        { label: "Categories", value: new Set(filteredMaterials.map(m => m.category)).size, color: [34, 197, 94] },
        { label: "Avg Price", value: `$${(totalValue / filteredMaterials.length || 0).toFixed(2)}`, color: [168, 85, 247] },
        { label: "Total Value", value: `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: [249, 115, 22] }
      ];

      summaryData.forEach((item, idx) => {
        const xPos = margin + (idx * (boxWidth + 3));
        const [r, g, b] = item.color;
        pdf.setFillColor(r, g, b);
        pdf.rect(xPos, yPosition, boxWidth, 12, "F");

        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont(undefined, "normal");
        pdf.text(item.label, xPos + 2, yPosition + 4);

        pdf.setFontSize(10);
        pdf.setFont(undefined, "bold");
        pdf.text(item.value.toString(), xPos + 2, yPosition + 10);
      });
      pdf.setTextColor(0, 0, 0);

      yPosition += 18;

      // Table headers with background - bigger, bolder
      const colWidths = [10, 100, 15, 18, 22];
      const headers = ["#", "Product and Description", "Unit", "Price", "Amount"];

      pdf.setFillColor(59, 70, 87); // Darker slate
      pdf.rect(margin, yPosition - 5, contentWidth, 8, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(11);
      let xPosition = margin + 2;
      headers.forEach((header, idx) => {
        if (idx === 0) {
          pdf.text(header, xPosition, yPosition);
          xPosition += colWidths[idx];
        } else if (idx === headers.length - 1) {
          pdf.text(header, xPosition + colWidths[idx] - 3, yPosition, { align: "right" });
          xPosition += colWidths[idx];
        } else if (idx === headers.length - 2) {
          pdf.text(header, xPosition + colWidths[idx] - 3, yPosition, { align: "right" });
          xPosition += colWidths[idx];
        } else {
          pdf.text(header, xPosition, yPosition);
          xPosition += colWidths[idx];
        }
      });

      pdf.setTextColor(0, 0, 0);
      yPosition += 12;

      // Table rows with full readable content
      let lineIndex = 0;

      filteredMaterials.forEach((material, materialIdx) => {
        // Calculate row height based on wrapped text
        const descLines = material.description ? pdf.splitTextToSize(material.description, colWidths[1] - 4) : [];
        const rowHeight = Math.max(8 + descLines.length * 4.5, 16);

        // Check if we need a new page
        if (yPosition + rowHeight > pageHeight - 15) {
          // Footer with page number
          pdf.setFontSize(9);
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Page ${pdf.internal.pages.length}`, pageWidth - margin - 10, pageHeight - 5);

          pdf.addPage();
          yPosition = 15;

          // Repeat header on new page
          pdf.setFillColor(59, 70, 87);
          pdf.rect(margin, yPosition - 5, contentWidth, 8, "F");
          pdf.setTextColor(255, 255, 255);
          pdf.setFont(undefined, "bold");
          pdf.setFontSize(11);
          xPosition = margin + 2;
          headers.forEach((header, idx) => {
            if (idx === 0) {
              pdf.text(header, xPosition, yPosition);
              xPosition += colWidths[idx];
            } else if (idx === headers.length - 1) {
              pdf.text(header, xPosition + colWidths[idx] - 3, yPosition, { align: "right" });
              xPosition += colWidths[idx];
            } else if (idx === headers.length - 2) {
              pdf.text(header, xPosition + colWidths[idx] - 3, yPosition, { align: "right" });
              xPosition += colWidths[idx];
            } else {
              pdf.text(header, xPosition, yPosition);
              xPosition += colWidths[idx];
            }
          });
          pdf.setTextColor(0, 0, 0);
          yPosition += 12;
          lineIndex = 0;
        }

        // Alternating row background (more contrast)
        if (lineIndex % 2 === 0) {
          pdf.setFillColor(240, 245, 250); // Light blue
        } else {
          pdf.setFillColor(255, 255, 255); // White
        }
        pdf.rect(margin, yPosition - 4, contentWidth, rowHeight, "F");

        // Border line
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.2);
        pdf.line(margin, yPosition - 4 + rowHeight, margin + contentWidth, yPosition - 4 + rowHeight);

        // Row content
        pdf.setTextColor(0, 0, 0);
        xPosition = margin + 2;
        let currentY = yPosition;

        // Line number (large, bold)
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(11);
        pdf.text((materialIdx + 1).toString(), xPosition, currentY + 1);
        xPosition += colWidths[0];

        // Product info section
        const prodStartX = xPosition;
        const prodStartY = currentY;

        // Code (bold)
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
        pdf.text(material.code, prodStartX, prodStartY);

        // Product Name (bold, larger)
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
        const nameWrapped = pdf.splitTextToSize(material.name, colWidths[1] - 4);
        pdf.text(nameWrapped[0] || material.name, prodStartX, prodStartY + 4);

        // Description (normal, smaller, gray)
        if (material.description) {
          pdf.setFont(undefined, "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(80, 80, 80);
          descLines.forEach((line: string, idx: number) => {
            pdf.text(line, prodStartX, prodStartY + 8 + (idx * 4));
          });
          pdf.setTextColor(0, 0, 0);
        }

        xPosition += colWidths[1];

        // Unit (right-aligned, larger)
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(10);
        pdf.text(material.unit, xPosition + colWidths[2] - 3, currentY + 1, { align: "right" });
        xPosition += colWidths[2];

        // Price (bold, right-aligned, larger)
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
        const priceText = `$${(material.unit_price || 0).toFixed(2)}`;
        pdf.text(priceText, xPosition + colWidths[3] - 3, currentY + 1, { align: "right" });
        xPosition += colWidths[3];

        // Amount (bold, right-aligned, larger)
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
        const amountText = `$${(material.unit_price || 0).toFixed(2)}`;
        pdf.text(amountText, xPosition + colWidths[4] - 3, currentY + 1, { align: "right" });

        yPosition += rowHeight;
        lineIndex++;
      });

      // Footer
      yPosition = pageHeight - 10;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);

      yPosition += 4;
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(9);
      pdf.text(`Total Materials: ${filteredMaterials.length} | Total Value: $${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, margin, yPosition);

      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Page ${pdf.internal.pages.length}`, pageWidth - margin - 10, yPosition);

      pdf.save(`Materials-Catalog-${categoryLabel.replace(/\s+/g, "-")}.pdf`);
      toast({ title: "Print Successful", description: "Materials catalog exported as PDF" });
    } catch (error) {
      console.error("Error generating materials catalog:", error);
      toast({ description: "Error generating report. Please try again." });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Materials Catalog</h1>
          <p className="text-slate-600 mt-1">Manage standard cabinet materials and pricing</p>
        </div>
        <div className="flex gap-2 w-full lg:w-auto">
          <Button
            onClick={printMaterialsCatalog}
            className="gap-2 bg-slate-600 hover:bg-slate-700"
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
          <Button onClick={exportToCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            onClick={() => {
              setFormData({});
              setIsAddModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Material
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Total Materials</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">{filteredMaterials.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{categories.length}</p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Avg Price</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-slate-900">
              ${filteredMaterials.length > 0 ? (totalValue / filteredMaterials.length).toFixed(2) : "0.00"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Price Range</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-700">
              ${filteredMaterials.length > 0 ? Math.min(...filteredMaterials.map((m) => m.unit_price || 0)).toFixed(2) : "0.00"} - $
              {filteredMaterials.length > 0 ? Math.max(...filteredMaterials.map((m) => m.unit_price || 0)).toFixed(2) : "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle>Materials List</CardTitle>
          <CardDescription>All materials in the catalog</CardDescription>
          <div className="mt-4">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-full lg:w-40 border-slate-300">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Code</th>
                  <th className="text-left p-3 font-semibold text-slate-900">Name</th>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Category</th>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Unit</th>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Price</th>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Supplier</th>
                  <th className="text-left p-3 font-semibold text-slate-900 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-3 text-center text-slate-500">
                      No materials found
                    </td>
                  </tr>
                ) : (
                  filteredMaterials.map((material, idx) => (
                    <tr key={material.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="p-3 text-slate-700 font-medium whitespace-nowrap">{material.code}</td>
                      <td className="p-3 text-slate-700">
                        <div className="space-y-1">
                          <p className="font-semibold">{material.name}</p>
                          {material.description && (
                            <p className="text-xs text-slate-500">{material.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded">
                          {material.category}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 whitespace-nowrap">{material.unit}</td>
                      <td className="p-3 text-slate-700 font-semibold whitespace-nowrap">
                        ${(material.unit_price || 0).toFixed(2)}
                      </td>
                      <td className="p-3 text-slate-700 text-xs whitespace-nowrap">
                        {material.supplier || "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-purple-600 hover:bg-purple-50 gap-1"
                            onClick={() => handleEdit(material)}
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 gap-1"
                            onClick={() => handleDeleteMaterial(material.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-4">
             {filteredMaterials.length === 0 ? (
                 <div className="text-center py-8 text-slate-500">
                      No materials found
                 </div>
             ) : (
               filteredMaterials.map((material) => (
                <div key={material.id} className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden p-4">
                  <div className="mb-2">
                    <h4 className="font-bold text-slate-900 mb-1">{material.name}</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {material.code}
                        </span>
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded whitespace-nowrap">
                            {material.category}
                        </span>
                    </div>
                  </div>
                  
                  {material.description && (
                      <p className="text-sm text-slate-600 mb-3">{material.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 text-sm mb-3 pt-2 border-t border-slate-100">
                     <div>
                        <span className="block text-xs text-slate-500">Price</span>
                        <span className="font-semibold text-slate-900">${(material.unit_price || 0).toFixed(2)}</span>
                     </div>
                     <div>
                        <span className="block text-xs text-slate-500">Unit</span>
                        <span className="font-medium text-slate-700">{material.unit}</span>
                     </div>
                     <div>
                        <span className="block text-xs text-slate-500">Supplier</span>
                        <span className="font-medium text-slate-700">{material.supplier || "-"}</span>
                     </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100 gap-2">
                       <Button
                            variant="ghost"
                            size="sm"
                            className="text-purple-600 hover:bg-purple-50 gap-1 h-8"
                            onClick={() => handleEdit(material)}
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 gap-1 h-8"
                            onClick={() => handleDeleteMaterial(material.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                  </div>
                </div>
               ))
             )}
          </div>
        </CardContent>
      </Card>

      {isAddModalOpen && (
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Material</DialogTitle>
              <DialogDescription>Add a new material to the catalog</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="code">Material Code *</Label>
                <Input
                  id="code"
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., PL170"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Material Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Plywood Birch"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  value={formData.category || ""}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Plywood, Lumber, Hardware"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit || "EA"}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., EA, SF, LF"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit_price">Price ($) *</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price || ""}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  value={formData.supplier || ""}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="Supplier name"
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Material description"
                  className="border-slate-300"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button onClick={handleAddMaterial} className="bg-blue-600 hover:bg-blue-700">
                Add Material
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isEditModalOpen && selectedMaterial && (
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Material</DialogTitle>
              <DialogDescription>Update material details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Material Code *</Label>
                <Input
                  id="edit-code"
                  value={formData.code || ""}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Material Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Input
                  id="edit-category"
                  value={formData.category || ""}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unit</Label>
                <Input
                  id="edit-unit"
                  value={formData.unit || "EA"}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-unit_price">Price ($) *</Label>
                <Input
                  id="edit-unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unit_price || ""}
                  onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-supplier">Supplier</Label>
                <Input
                  id="edit-supplier"
                  value={formData.supplier || ""}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="border-slate-300"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description || ""}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="border-slate-300"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedMaterial(null);
                  setFormData({});
                }}
                className="border-slate-300"
              >
                Cancel
              </Button>
              <Button onClick={handleEditMaterial} className="bg-blue-600 hover:bg-blue-700">
                Update Material
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Toaster />
    </div>
  );
}
