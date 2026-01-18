import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { CheckCircle, Loader2 } from "lucide-react";
import { employeesService } from "@/lib/supabase-service";
import { useToast } from "@/hooks/use-toast";

export default function EmployeeOnboarding() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    telephone: "",
    position: "",
    startDate: "",
    address: "",
    weeklyRate: "",
    paymentMethod: "cash",
    bankName: "",
    routingNumber: "",
    accountNumber: "",
    accountType: "checking",
    checkNumber: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Full name is required";
    if (!formData.telephone.trim()) newErrors.telephone = "Phone number is required";
    if (!formData.position.trim()) newErrors.position = "Position is required";
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (!formData.weeklyRate) newErrors.weeklyRate = "Weekly rate is required";
    if (formData.weeklyRate && isNaN(parseFloat(formData.weeklyRate))) {
      newErrors.weeklyRate = "Weekly rate must be a valid number";
    }

    if (formData.paymentMethod === "direct_deposit" || formData.paymentMethod === "ach" || formData.paymentMethod === "wire") {
      if (!formData.bankName.trim()) newErrors.bankName = "Bank name is required for this payment method";
      if (!formData.routingNumber.trim()) newErrors.routingNumber = "Routing number is required";
      if (!formData.accountNumber.trim()) newErrors.accountNumber = "Account number is required";
    }

    if (formData.paymentMethod === "check") {
      if (!formData.checkNumber.trim()) newErrors.checkNumber = "Check number is required for check payments";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({ variant: "destructive", description: "Please fix the errors before submitting." });
      return;
    }

    setIsSubmitting(true);

    try {
      // Construct the bank_details / extended info object
      // We are storing contact info here since the schema is minimal
      const extendedDetails = {
        email: formData.email,
        telephone: formData.telephone,
        address: formData.address,
        bankName: formData.bankName,
        routingNumber: formData.routingNumber,
        accountNumber: formData.accountNumber, // In a real app, encrypt this!
        accountType: formData.accountType,
        checkNumber: formData.checkNumber, // For reference
      };

      await employeesService.createPublic({
        name: formData.name,
        position: formData.position,
        weekly_rate: parseFloat(formData.weeklyRate),
        hire_date: formData.startDate,
        payment_method: formData.paymentMethod as any,
        status: "active",
        bank_details: extendedDetails,
      });

      setSubmitted(true);
      toast({ title: "Success", description: "Employee information submitted successfully!" });

      // Reset form after 3 seconds
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          telephone: "",
          position: "",
          startDate: "",
          address: "",
          weeklyRate: "",
          paymentMethod: "cash",
          bankName: "",
          routingNumber: "",
          accountNumber: "",
          accountType: "checking",
          checkNumber: "",
        });
        setSubmitted(false);
        setIsSubmitting(false);
      }, 3000);

    } catch (error: any) {
      console.error("Submission error:", error);
      toast({ 
        variant: "destructive", 
        title: "Submission Failed", 
        description: error.message || "Failed to submit employee information. Please try again." 
      });
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md border-green-200 shadow-lg w-full">
          <CardContent className="pt-8">
            <div className="text-center space-y-4">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-100 p-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Thank You!</h2>
              <p className="text-slate-600">
                Your information has been successfully submitted. Our HR team will review your details and add you to the system shortly.
              </p>
              <p className="text-sm text-slate-500 mt-4">
                Redirecting you back in a moment...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Welcome to South Park Cabinets
          </h1>
          <p className="text-slate-600 text-lg">
            Please complete your employee information below
          </p>
        </div>

        {/* Main Form Card */}
        <Card className="border-slate-200 shadow-lg">
          <CardHeader className="bg-blue-50 border-b">
            <CardTitle>Employee Information</CardTitle>
            <CardDescription>
              Fields marked with * are required
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Basic Information Section */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
                Basic Information
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-slate-700 font-medium">
                    Full Name *
                  </Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`mt-1 ${
                      errors.name ? "border-red-500" : "border-slate-300"
                    }`}
                  />
                  {errors.name && (
                    <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email" className="text-slate-700 font-medium">
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="mt-1 border-slate-300"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telephone" className="text-slate-700 font-medium">
                      Phone Number *
                    </Label>
                    <Input
                      id="telephone"
                      placeholder="(555) 123-4567"
                      value={formData.telephone}
                      onChange={(e) =>
                        setFormData({ ...formData, telephone: e.target.value })
                      }
                      className={`mt-1 ${
                        errors.telephone ? "border-red-500" : "border-slate-300"
                      }`}
                    />
                    {errors.telephone && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.telephone}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="address" className="text-slate-700 font-medium">
                    Home Address *
                  </Label>
                  <Input
                    id="address"
                    placeholder="123 Main St, Denver, CO 80202"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className={`mt-1 ${
                      errors.address ? "border-red-500" : "border-slate-300"
                    }`}
                  />
                  {errors.address && (
                    <p className="text-red-600 text-sm mt-1">{errors.address}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="position" className="text-slate-700 font-medium">
                      Position/Job Title *
                    </Label>
                    <Input
                      id="position"
                      placeholder="Cabinet Maker"
                      value={formData.position}
                      onChange={(e) =>
                        setFormData({ ...formData, position: e.target.value })
                      }
                      className={`mt-1 ${
                        errors.position ? "border-red-500" : "border-slate-300"
                      }`}
                    />
                    {errors.position && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.position}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="startDate" className="text-slate-700 font-medium">
                      Start Date *
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className={`mt-1 ${
                        errors.startDate ? "border-red-500" : "border-slate-300"
                      }`}
                    />
                    {errors.startDate && (
                      <p className="text-red-600 text-sm mt-1">
                        {errors.startDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Information Section */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-4 uppercase tracking-wide">
                Payment Information
              </h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="weeklyRate" className="text-slate-700 font-medium">
                    Weekly Rate ($) *
                  </Label>
                  <Input
                    id="weeklyRate"
                    type="number"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={formData.weeklyRate}
                    onChange={(e) =>
                      setFormData({ ...formData, weeklyRate: e.target.value })
                    }
                    className={`mt-1 ${
                      errors.weeklyRate ? "border-red-500" : "border-slate-300"
                    }`}
                  />
                  {errors.weeklyRate && (
                    <p className="text-red-600 text-sm mt-1">
                      {errors.weeklyRate}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="paymentMethod" className="text-slate-700 font-medium">
                    Preferred Payment Method *
                  </Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentMethod: value })
                    }
                  >
                    <SelectTrigger className="mt-1 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="direct_deposit">Direct Deposit</SelectItem>
                      <SelectItem value="ach">ACH Transfer</SelectItem>
                      <SelectItem value="wire">Wire Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional Bank Fields */}
                {(formData.paymentMethod === "direct_deposit" ||
                  formData.paymentMethod === "ach" ||
                  formData.paymentMethod === "wire") && (
                  <div className="bg-blue-50 p-4 rounded border border-blue-200 space-y-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Bank Information
                    </p>

                    <div>
                      <Label htmlFor="bankName" className="text-slate-700 font-medium">
                        Bank Name *
                      </Label>
                      <Input
                        id="bankName"
                        placeholder="Wells Fargo, Chase Bank, etc."
                        value={formData.bankName}
                        onChange={(e) =>
                          setFormData({ ...formData, bankName: e.target.value })
                        }
                        className={`mt-1 ${
                          errors.bankName ? "border-red-500" : "border-slate-300"
                        }`}
                      />
                      {errors.bankName && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.bankName}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="routingNumber" className="text-slate-700 font-medium">
                          Routing Number *
                        </Label>
                        <Input
                          id="routingNumber"
                          placeholder="9-digit routing number"
                          value={formData.routingNumber}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              routingNumber: e.target.value,
                            })
                          }
                          className={`mt-1 ${
                            errors.routingNumber ? "border-red-500" : "border-slate-300"
                          }`}
                        />
                        {errors.routingNumber && (
                          <p className="text-red-600 text-sm mt-1">
                            {errors.routingNumber}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="accountType" className="text-slate-700 font-medium">
                          Account Type *
                        </Label>
                        <Select
                          value={formData.accountType}
                          onValueChange={(value) =>
                            setFormData({ ...formData, accountType: value })
                          }
                        >
                          <SelectTrigger className="mt-1 border-slate-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking">Checking</SelectItem>
                            <SelectItem value="savings">Savings</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="accountNumber" className="text-slate-700 font-medium">
                        Account Number *
                      </Label>
                      <Input
                        id="accountNumber"
                        type="password"
                        placeholder="Your account number (will be masked)"
                        value={formData.accountNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            accountNumber: e.target.value,
                          })
                        }
                        className={`mt-1 ${
                          errors.accountNumber ? "border-red-500" : "border-slate-300"
                        }`}
                      />
                      {errors.accountNumber && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.accountNumber}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Check Payment Fields */}
                {formData.paymentMethod === "check" && (
                  <div className="bg-blue-50 p-4 rounded border border-blue-200 space-y-4">
                    <p className="text-sm font-semibold text-slate-700">
                      Check Payment Information
                    </p>

                    <div>
                      <Label htmlFor="checkNumber" className="text-slate-700 font-medium">
                        Check Number *
                      </Label>
                      <Input
                        id="checkNumber"
                        placeholder="e.g., 1001"
                        value={formData.checkNumber}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            checkNumber: e.target.value,
                          })
                        }
                        className={`mt-1 ${
                          errors.checkNumber ? "border-red-500" : "border-slate-300"
                        }`}
                      />
                      {errors.checkNumber && (
                        <p className="text-red-600 text-sm mt-1">
                          {errors.checkNumber}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-slate-50 p-4 rounded border border-slate-200">
              <p className="text-xs text-slate-600">
                <strong>Privacy Notice:</strong> Your information will be kept secure and used only for payroll processing and employment purposes in accordance with applicable laws.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 text-base font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Information"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-slate-600">
          <p>
            Questions? Contact HR at <strong>hr@southparkcabinets.com</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
