import {
  supabase,
  type Employee,
  type Payment,
  type Contract,
  type Bill,
  type Material,
  type Settings,
  type Profile,
  type EmployeeAbsence
} from "./supabase";
export type { Employee, Payment, Contract, Bill, Material, Settings, Profile, EmployeeAbsence };

const API_BASE = "/api";

export async function remoteLog(
  message: string,
  level: "info" | "error" = "info",
) {
  try {
    fetch(`${API_BASE}/debug/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, level }),
    });
  } catch (e) {}
}

let currentToken: string | null = null;

// Initialize token listener
supabase.auth.onAuthStateChange((event, session) => {
  currentToken = session?.access_token ?? null;
});

// Helper for API calls
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 10000,
): Promise<T> {
  let token = currentToken;

  // Only get session if we don't have a token cached
  if (!token) {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      token = session?.access_token ?? null;
      if (token) {
        currentToken = token;
      }
    } catch (e) {
      console.error("[apiFetch] Failed to get session:", e);
    }
  }

  const url = `${API_BASE}${endpoint}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        ...options.headers,
      },
    });

    clearTimeout(id);

    if (!response.ok) {
      if (response.status === 401) {
        console.warn(
          "[apiFetch] 401 Unauthorized - token might be invalid or expired",
        );
      }
      const errorContent = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(
        errorContent.error || `API Request failed: ${response.statusText}`,
      );
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === "AbortError") {
      throw new Error(`API Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

// Public API fetch for unauthenticated endpoints (e.g., employee onboarding)
export async function publicApiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 10000,
): Promise<T> {
  const url = `${API_BASE}${endpoint}`;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    clearTimeout(id);

    if (!response.ok) {
      const errorContent = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(
        errorContent.error || `API Request failed: ${response.statusText}`,
      );
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === "AbortError") {
      throw new Error(`API Request timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

// ============================================
// EMPLOYEES SERVICE
// ============================================
export const employeesService = {
  async getAll() {
    return apiFetch<Employee[]>("/employees");
  },

  async getById(id: string) {
    return apiFetch<Employee>(`/employees/${id}`);
  },

  async create(employee: Partial<Employee>) {
    return apiFetch<Employee>("/employees", {
      method: "POST",
      body: JSON.stringify(employee),
    });
  },

  async upsertPublic(employee: Partial<Employee>) {
    return publicApiFetch<{ message: string }>("/employees/upsert-public", {
      method: "POST",
      body: JSON.stringify(employee),
    });
  },

  async update(id: string, employee: Partial<Employee>) {
    return apiFetch<Employee>(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(employee),
    });
  },

  async delete(id: string) {
    return apiFetch<void>(`/employees/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// PROFILES SERVICE
// ============================================
export const profilesService = {
  async update(id: string, profile: Partial<Profile>) {
    return apiFetch<Profile>(`/profiles/${id}`, {
      method: "PATCH",
      body: JSON.stringify(profile),
    });
  },

  async getAll() {
    return apiFetch<Profile[]>("/profiles");
  },

  async getById(id: string) {
    return apiFetch<Profile>(`/profiles/${id}`);
  },
};

// ============================================
// PAYMENTS SERVICE
// ============================================
export const paymentsService = {
  async getAll() {
    return apiFetch<any[]>("/payments");
  },
  async getByEmployee(employeeId: string) {
    return apiFetch<Payment[]>(`/payments?employeeId=${employeeId}`);
  },

  async create(payment: Partial<Payment>) {
    return apiFetch<Payment>("/payments", {
      method: "POST",
      body: JSON.stringify(payment),
    });
  },

  async createBulk(payments: Partial<Payment>[]) {
    return apiFetch<Payment[]>("/payments/bulk", {
      method: "POST",
      body: JSON.stringify(payments),
    });
  },

  async update(id: string, payment: Partial<Payment>) {
    return apiFetch<Payment>(`/payments/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payment),
    });
  },

  async delete(id: string) {
    return apiFetch<void>(`/payments/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// ABSENCES SERVICE
// ============================================
export const absencesService = {
  async getAll() {
    return apiFetch<EmployeeAbsence[]>("/absences");
  },

  async getByEmployee(employeeId: string) {
    return apiFetch<EmployeeAbsence[]>(`/absences?employeeId=${employeeId}`);
  },

  async create(absence: Partial<EmployeeAbsence>) {
    return apiFetch<EmployeeAbsence>("/absences", {
      method: "POST",
      body: JSON.stringify(absence),
    });
  },

  async update(id: string, absence: Partial<EmployeeAbsence>) {
    return apiFetch<EmployeeAbsence>(`/absences/${id}`, {
      method: "PATCH",
      body: JSON.stringify(absence),
    });
  },

  async delete(id: string) {
    return apiFetch<void>(`/absences/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// CONTRACTS SERVICE
// ============================================
export const contractsService = {
  async getAll() {
    return apiFetch<Contract[]>("/contracts");
  },

  async getById(id: string) {
    return apiFetch<Contract>(`/contracts/${id}`);
  },

  async create(contract: Partial<Contract>) {
    return apiFetch<Contract>("/contracts", {
      method: "POST",
      body: JSON.stringify(contract),
    });
  },

  async update(id: string, contract: Partial<Contract>) {
    return apiFetch<Contract>(`/contracts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(contract),
    });
  },

  async delete(id: string) {
    return apiFetch<void>(`/contracts/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// BILLS SERVICE
// ============================================
export const billsService = {
  async getAll() {
    return apiFetch<Bill[]>("/bills");
  },

  async create(bill: Partial<Bill>) {
    return apiFetch<Bill>("/bills", {
      method: "POST",
      body: JSON.stringify(bill),
    });
  },

  async update(id: string, bill: Partial<Bill>) {
    return apiFetch<Bill>(`/bills/${id}`, {
      method: "PATCH",
      body: JSON.stringify(bill),
    });
  },

  async delete(id: string) {
    return apiFetch<void>(`/bills/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// MATERIALS SERVICE (Proxy to server if needed, or keep for now)
// ============================================
export const materialsService = {
  async getAll() {
    return apiFetch<Material[]>("/materials");
  },

  async create(material: Partial<Material>) {
    return apiFetch<Material>("/materials", {
      method: "POST",
      body: JSON.stringify(material),
    });
  },

  async update(id: string, material: Partial<Material>) {
    return apiFetch<Material>(`/materials/${id}`, {
      method: "PATCH",
      body: JSON.stringify(material),
    });
  },

  async delete(id: string) {
    return apiFetch<void>(`/materials/${id}`, {
      method: "DELETE",
    });
  },
};

// ============================================
// SETTINGS SERVICE
// ============================================
export const settingsService = {
  async get() {
    return apiFetch<Settings>("/settings");
  },
  async update(settings: Partial<Settings>) {
    return apiFetch<Settings>("/settings", {
      method: "POST",
      body: JSON.stringify(settings),
    });
  },
};
