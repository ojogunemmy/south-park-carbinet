import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "admin" | "manager" | "worker";

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  users: StoredUser[];
  updateUsers: (users: StoredUser[]) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default users for demo
const DEFAULT_USERS: StoredUser[] = [
  { id: "USR-001", name: "Emmanuel Camarena", email: "emmanuelcamarena33@gmail.com", password: "Cam@9686", role: "admin" },
  { id: "USR-002", name: "Maira Parra", email: "manager@example.com", password: "manager123", role: "manager" },
  { id: "USR-003", name: "John Smith", email: "worker@example.com", password: "worker123", role: "worker" },
  { id: "USR-004", name: "Maria Garcia", email: "maria@example.com", password: "maria123", role: "worker" },
];

const USERS_STORAGE_KEY = "cabinet_users";

// Helper function to get all users from localStorage
const getStoredUsers = (): StoredUser[] => {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_USERS;
  } catch {
    return DEFAULT_USERS;
  }
};

// Helper function to save users to localStorage
const saveStoredUsers = (users: StoredUser[]): void => {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<StoredUser[]>([]);

  // Initialize users and check if user is already logged in on mount
  useEffect(() => {
    const storedUsers = getStoredUsers();
    setUsers(storedUsers);

    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        setUser(null);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get latest users from state
    const currentUsers = users.length > 0 ? users : getStoredUsers();

    // Find user with matching email and password
    const foundUser = currentUsers.find((u) => u.email === email && u.password === password);

    if (!foundUser) {
      setIsLoading(false);
      throw new Error("Invalid email or password");
    }

    const loggedInUser: User = {
      id: foundUser.id,
      name: foundUser.name,
      email: foundUser.email,
      role: foundUser.role,
    };

    setUser(loggedInUser);
    localStorage.setItem("currentUser", JSON.stringify(loggedInUser));
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("currentUser");
  };

  const updateUsers = (newUsers: StoredUser[]) => {
    setUsers(newUsers);
    saveStoredUsers(newUsers);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated: !!user, users, updateUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
