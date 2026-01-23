import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase, type Profile } from "@/lib/supabase";
import { profilesService, remoteLog } from "@/lib/supabase-service";
import type { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: "admin" | "manager" | "worker" | "employee" | null;
  isVerified: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    console.log("[AuthContext] fetchUserProfile started for:", userId);
    try {
      const data = await profilesService.getById(userId);
      console.log("[AuthContext] fetchUserProfile data received:", data ? "Profile found" : "Profile NOT found");
      if (data) {
        setProfile(data);
      }
      return data;
    } catch (error: any) {
      console.error(
        "[AuthContext] Error fetching user profile:",
        error.message,
      );
      return null;
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log("[AuthContext] signIn started for:", email);
    try {
      console.log("[AuthContext] Calling supabase.auth.signInWithPassword");
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });
      
      console.log("[AuthContext] signInWithPassword result:", authError ? "Error" : "Success");
      if (authError) throw authError;

      if (authData.user) {
        console.log("[AuthContext] User authenticated, fetching profile...");
        const profileData = await fetchUserProfile(authData.user.id);
        
        console.log("[AuthContext] Profile data for verification:", profileData);
        // Explicitly block login for unverified non-admins
        if (
          profileData &&
          profileData.role !== "admin" &&
          profileData.is_verified !== true
        ) {
          console.warn("[AuthContext] Account not verified, signing out...");
          await supabase.auth.signOut();
          setProfile(null);
          throw new Error("ACCOUNT_NOT_VERIFIED");
        }
        console.log("[AuthContext] signIn complete");
      }
    } catch (err: any) {
      console.error("[AuthContext] Exception in signIn:", err.message);
      throw err;
    }
  };

  const signOut = async () => {
    setProfile(null);
    setUser(null);
    await supabase.auth.signOut();
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      setLoading(true);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (mounted) {
          setUser(session?.user ?? null);
          if (session?.user) {
            await fetchUserProfile(session.user.id);
          }
          setLoading(false);
        }
      } catch (e: any) {
        console.error(
          "[AuthContext] initializeAuth critical failure:",
          e.message,
        );
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthContext] onAuthStateChange event:", event);
      if (!mounted) return;

      setUser(session?.user ?? null);
      if (session?.user) {
        console.log("[AuthContext] onAuthStateChange has user, fetching profile...");
        await fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
      console.log("[AuthContext] onAuthStateChange handled, loading set to false");
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role ?? null,
        isVerified: profile?.is_verified === true || profile?.role === "admin",
        signIn,
        signOut,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useSupabaseAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useSupabaseAuth must be used within SupabaseAuthProvider");
  }
  return context;
};
