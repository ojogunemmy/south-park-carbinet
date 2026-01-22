import { Navigate } from "react-router-dom";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "admin" | "manager" | "worker"; 
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, profile, loading, isVerified } = useSupabaseAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-lg mb-4">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Handle verification (only for non-admins)
  if (profile?.role !== "admin" && !isVerified) {
    // If not verified, they shouldn't even be here based on SupabaseAuthContext signIn logic,
    // but this is a safety check.
    return <Navigate to="/login" replace />;
  }

  // Check role if specified
  if (requiredRole) {
    const roleHierarchy: Record<string, number> = {
      admin: 3,
      manager: 2,
      worker: 1,
      employee: 1, // Handle both designations
    };

    const userRole = profile?.role || "worker";
    const mappedUserRole = userRole === "employee" ? "worker" : userRole;

    if (roleHierarchy[mappedUserRole] < roleHierarchy[requiredRole]) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
