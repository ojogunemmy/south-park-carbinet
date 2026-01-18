import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, Download, Printer } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useYear } from "@/contexts/YearContext";
import { getYearData, saveYearData, shouldUseExampleData } from "@/utils/yearStorage";
import { useAutoSave } from "@/hooks/useAutoSave";
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

interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  description?: string;
  supplier?: string;
}

const defaultMaterials: Material[] = [
  {
    id: "MAT-001",
    code: "PL170",
    name: "Plywood Birch Prefinished 3/4\" 4x8 C2",
    category: "Plywood",
    unit: "EA",
    price: 38.51,
    description: "Prefinished birch plywood",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-002",
    code: "PL71",
    name: "Plywood Birch Prefinished 1/4\" 4x8",
    category: "Plywood",
    unit: "EA",
    price: 22.83,
    description: "1/4 inch birch plywood sheet",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-003",
    code: "PL119",
    name: "Plywood White Oak Natural 1/4\" 4x8 Rifcut",
    category: "Plywood",
    unit: "EA",
    price: 52.00,
    description: "White oak rift cut plywood",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-004",
    code: "PL118RC",
    name: "Plywood White Oak Natural 3/4\" 4x8 Rifcut B2",
    category: "Plywood",
    unit: "EA",
    price: 110.01,
    description: "Premium white oak rift cut plywood",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-005",
    code: "PL6134-410-GAR",
    name: "Plywood White Oak 3/4\" 4x10 A1 Rift Cut Garnica",
    category: "Plywood",
    unit: "EA",
    price: 219.95,
    description: "Premium white oak rift cut garnica",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-006",
    code: "LUM69",
    name: "Lumber Poplar S3S 16' 13/16\" 12\"+",
    category: "Lumber",
    unit: "EA",
    price: 2.86,
    description: "Poplar dimensional lumber",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-007",
    code: "LUM71",
    name: "Lumber Soft Maple UNS 13/16\" Stain Grade S3S 14'",
    category: "Lumber",
    unit: "EA",
    price: 3.65,
    description: "Soft maple stain grade lumber",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-008",
    code: "LUM48",
    name: "Lumber White Oak R1E 13/16\" S3S",
    category: "Lumber",
    unit: "EA",
    price: 6.99,
    description: "White oak rough lumber",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-009",
    code: "LUM58",
    name: "Lumber White Oak Rift Cut 13/16\" S3S",
    category: "Lumber",
    unit: "EA",
    price: 13.98,
    description: "White oak rift cut lumber",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-010",
    code: "DS58RW04P800",
    name: "Drawer Side 4\"x96\" 5/8\" Rubberwood Flat Edge UV 3-Sides w/ 1/4\" Groove",
    category: "Drawer Parts",
    unit: "EA",
    price: 11.37,
    description: "Rubberwood drawer side",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-011",
    code: "DS58RW06P800",
    name: "Drawer Side 6\"x96\" 5/8\" Rubberwood Flat Edge UV 3-Sides w/ 1/4\" Groove",
    category: "Drawer Parts",
    unit: "EA",
    price: 19.12,
    description: "Rubberwood drawer side 6 inch",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-012",
    code: "DS58RW08P800",
    name: "Drawer Side 8\"x96\" 5/8\" Rubberwood Flat Edge UV 3-Sides w/ 1/4\" Groove",
    category: "Drawer Parts",
    unit: "EA",
    price: 21.65,
    description: "Rubberwood drawer side 8 inch",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-013",
    code: "DS58RW10P800",
    name: "Drawer Side 10\"x96\" 5/8\" Rubberwood Flat Edge UV 3-Sides w/ 1/4\" Groove",
    category: "Drawer Parts",
    unit: "EA",
    price: 25.34,
    description: "Rubberwood drawer side 10 inch",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-014",
    code: "563H5330B",
    name: "Tandem Plus Blumotion 563 Full Extension Drawer Runners 21\" Zinc-Plated",
    category: "Hardware",
    unit: "EA",
    price: 18.90,
    description: "Blum drawer runner system",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-015",
    code: "563H4570B",
    name: "Tandem Plus Blumotion 563 Full Extension Drawer Runners 18\" Zinc-Plated",
    category: "Hardware",
    unit: "EA",
    price: 17.70,
    description: "Blum drawer runner 18 inch",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-016",
    code: "563H3810B",
    name: "Tandem Plus Blumotion 563 Full Extension Drawer Runners 15\" Zinc-Plated",
    category: "Hardware",
    unit: "EA",
    price: 19.94,
    description: "Blum drawer runner 15 inch",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-017",
    code: "71B3590",
    name: "Blum Clip Top Blumotion 110° Hinges Full Overlay Inserta Nickel",
    category: "Hardware",
    unit: "EA",
    price: 3.95,
    description: "Blum cabinet hinges",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-018",
    code: "175H6000",
    name: "Clip Mounting Plates Cam Height Adjustable 0mm Nickel",
    category: "Hardware",
    unit: "EA",
    price: 0.87,
    description: "Cabinet hinge mounting plates",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-019",
    code: "MDF1-D",
    name: "MDF Raw 3/4\" 4x8 A1 Door Core",
    category: "MDF/Panels",
    unit: "EA",
    price: 45.33,
    description: "Medium density fiberboard",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-020",
    code: "MDF-U38-48",
    name: "MDF Ultra Light 3/8\" 4x8",
    category: "MDF/Panels",
    unit: "EA",
    price: 24.25,
    description: "Ultra light MDF sheet",
    supplier: "Imeca Charlotte",
  },
  {
    id: "MAT-021",
    code: "056815",
    name: "Plywood Birch 18mm 4x8 C2 WPF UV1S Prefinished VC",
    category: "Plywood",
    unit: "EA",
    price: 39.39,
    description: "Prefinished birch plywood 18mm",
    supplier: "Atlantic Plywood",
  },
  {
    id: "MAT-022",
    code: "056820",
    name: "Plywood Birch 18mm 4x8 C2 WPF UV2S Prefinished VC",
    category: "Plywood",
    unit: "EA",
    price: 41.78,
    description: "Prefinished birch plywood 18mm UV2S",
    supplier: "Atlantic Plywood",
  },
  {
    id: "MAT-023",
    code: "055150",
    name: "Plywood White Oak 3/4\" 4x8 A1 Rift Cut Prefinished VC",
    category: "Plywood",
    unit: "EA",
    price: 134.13,
    description: "White oak rift cut prefinished plywood",
    supplier: "Atlantic Plywood",
  },
  {
    id: "MAT-024",
    code: "055200",
    name: "Plywood White Oak 3/4\" 4x10 A1 Rift Cut Prefinished VC",
    category: "Plywood",
    unit: "EA",
    price: 239.98,
    description: "White oak rift cut prefinished plywood 4x10",
    supplier: "Atlantic Plywood",
  },
  {
    id: "MAT-025",
    code: "71B3590",
    name: "Blum Clip Top Hinge 110 Blumotion F-OL Inserta",
    category: "Hardware",
    unit: "EA",
    price: 3.70,
    description: "Blum hinges full overlay inserta",
    supplier: "Atlantic Plywood",
  },
  {
    id: "MAT-026",
    code: "563H5330B",
    name: "Tandem Plus Blumotion 563H 21\" Full Ext Drawer Zinc",
    category: "Hardware",
    unit: "EA",
    price: 17.82,
    description: "Blum drawer runner 21 inch full extension",
    supplier: "Atlantic Plywood",
  },
  {
    id: "MAT-027",
    code: "563H4570B",
    name: "Tandem Plus Blumotion 563H 18\" Full Ext Drawer Zinc",
    category: "Hardware",
    unit: "EA",
    price: 16.97,
    description: "Blum drawer runner 18 inch full extension",
    supplier: "Atlantic Plywood",
  },
  {
    id: "MAT-028",
    code: "T51.1901L",
    name: "Tandem Plus Blumotion 563/9 Locking Device Left",
    category: "Hardware",
    unit: "EA",
    price: 1.33,
    description: "Blum locking device left",
    supplier: "Atlantic Plywood",
  },
  {
    id: "MAT-029",
    code: "T51.1901R",
    name: "Tandem Plus Blumotion 563/9 Locking Device Right",
    category: "Hardware",
    unit: "EA",
    price: 1.33,
    description: "Blum locking device right",
    supplier: "Atlantic Plywood",
  },
];

export default function Materials() {
  const { toast } = useToast();
  const { selectedYear } = useYear();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [formData, setFormData] = useState<Partial<Material>>({});

  // Load materials from localStorage or use defaults
  const getMaterials = () => {
    if (shouldUseExampleData(selectedYear)) {
      return getYearData<Material[]>("materials", selectedYear, defaultMaterials);
    }
    // For 2026-2030, start with empty array
    return getYearData<Material[]>("materials", selectedYear, []);
  };

  useEffect(() => {
    const loaded = getMaterials();
    setMaterials(loaded);
  }, [selectedYear]);

  // Auto-save materials whenever they change
  useAutoSave({
    data: materials,
    key: "materials",
    year: selectedYear,
    debounceMs: 500,
  });

  const saveMaterials = (updated: Material[]) => {
    setMaterials(updated);
    // Auto-save will handle persistence
  };

  const categories = [...new Set(materials.map((m) => m.category))].sort();

  const filteredMaterials =
    filterCategory === "all"
      ? materials
      : materials.filter((m) => m.category === filterCategory);

  const handleAddMaterial = () => {
    if (!formData.code || !formData.name || !formData.category || !formData.price) {
      toast({ description: "Please fill in all required fields" });
      return;
    }

    const newMaterial: Material = {
      id: `MAT-${Date.now()}`,
      code: formData.code || "",
      name: formData.name || "",
      category: formData.category || "",
      unit: formData.unit || "EA",
      price: formData.price || 0,
      description: formData.description,
      supplier: formData.supplier,
    };

    const updated = [...materials, newMaterial];
    saveMaterials(updated);
    setFormData({});
    setIsAddModalOpen(false);
    toast({ title: "Material Added", description: `${newMaterial.name} added successfully` });
  };

  const handleEditMaterial = () => {
    if (!selectedMaterial || !formData.code || !formData.name || !formData.category || !formData.price) {
      toast({ description: "Please fill in all required fields" });
      return;
    }

    const updated = materials.map((m) =>
      m.id === selectedMaterial.id
        ? {
            ...m,
            code: formData.code || m.code,
            name: formData.name || m.name,
            category: formData.category || m.category,
            unit: formData.unit || m.unit,
            price: formData.price || m.price,
            description: formData.description,
            supplier: formData.supplier,
          }
        : m
    );

    saveMaterials(updated);
    setSelectedMaterial(null);
    setFormData({});
    setIsEditModalOpen(false);
    toast({ title: "Material Updated", description: "Material updated successfully" });
  };

  const handleDeleteMaterial = (id: string) => {
    const material = materials.find((m) => m.id === id);
    const updated = materials.filter((m) => m.id !== id);
    saveMaterials(updated);
    toast({
      title: "Material Removed",
      description: `${material?.name} removed successfully`,
    });
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
      m.price.toFixed(2),
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

  const totalValue = filteredMaterials.reduce((sum, m) => sum + m.price, 0);

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
        { label: "Avg Price", value: `$${(totalValue / filteredMaterials.length).toFixed(2)}`, color: [168, 85, 247] },
        { label: "Total Value", value: `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, color: [249, 115, 22] }
      ];

      summaryData.forEach((item, idx) => {
        const xPos = margin + (idx * (boxWidth + 3));
        pdf.setFillColor(...item.color);
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
      const colWidths = [10, 85, 15, 18, 22];
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
        const priceText = `$${material.price.toFixed(2)}`;
        pdf.text(priceText, xPosition + colWidths[3] - 3, currentY + 1, { align: "right" });
        xPosition += colWidths[3];

        // Amount (bold, right-aligned, larger)
        pdf.setFont(undefined, "bold");
        pdf.setFontSize(10);
        const amountText = `$${material.price.toFixed(2)}`;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Materials Catalog</h1>
          <p className="text-slate-600 mt-1">Manage standard cabinet materials and pricing</p>
        </div>
        <div className="flex gap-2">
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              ${(totalValue / filteredMaterials.length).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg">Price Range</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium text-slate-700">
              ${Math.min(...filteredMaterials.map((m) => m.price)).toFixed(2)} - $
              {Math.max(...filteredMaterials.map((m) => m.price)).toFixed(2)}
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
              <SelectTrigger className="w-40 border-slate-300">
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
          <div className="overflow-x-auto">
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
                        ${material.price.toFixed(2)}
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
                <Label htmlFor="price">Price ($) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
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
                <Label htmlFor="edit-price">Price ($) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price || ""}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
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
