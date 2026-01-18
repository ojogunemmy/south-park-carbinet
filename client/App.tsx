import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { YearProvider } from "@/contexts/YearContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SupabaseAuthProvider } from "@/contexts/SupabaseAuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import Employees from "./pages/Employees";
import Payments from "./pages/Payments";
import Contracts from "./pages/Contracts";
import Bills from "./pages/Bills";
import Costs from "./pages/Costs";
import Settings from "./pages/Settings";
import WorkLetters from "./pages/WorkLetters";
import Materials from "./pages/Materials";
import Workers from "./pages/Workers";
import EmployeeOnboarding from "./pages/EmployeeOnboarding";
import Login from "./pages/Login";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SupabaseAuthProvider>
        <AuthProvider>
          <YearProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/onboarding" element={<EmployeeOnboarding />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <Layout>
                        <Routes>
                          <Route path="/" element={<Index />} />
                          <Route path="/employees" element={<Employees />} />
                          <Route path="/payments" element={<Payments />} />
                          <Route path="/work-letters" element={<WorkLetters />} />
                          <Route path="/contracts" element={<Contracts />} />
                          <Route path="/bills" element={<Bills />} />
                          <Route path="/costs" element={<Costs />} />
                          <Route path="/materials" element={<Materials />} />
                          <Route path="/workers" element={<Workers />} />
                          <Route path="/settings" element={<ProtectedRoute requiredRole="admin"><Settings /></ProtectedRoute>} />
                          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </Layout>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </BrowserRouter>
          </YearProvider>
        </AuthProvider>
      </SupabaseAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
