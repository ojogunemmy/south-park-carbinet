import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Users,
  LayoutDashboard,
  Menu,
  X,
  TrendingUp,
  CreditCard,
  Settings as SettingsIcon,
  FileCheck,
  Package,
  Briefcase,
  Receipt,
  LogOut,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SouthParkLogo } from "@/components/SouthParkLogo";
import { cn } from "@/lib/utils";
import { HiMenuAlt1 } from "react-icons/hi";
import { useSupabaseAuth } from "@/contexts/SupabaseAuthContext";
import { useYear } from "@/contexts/YearContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { role, profile, signOut } = useSupabaseAuth();
  const { selectedYear, setSelectedYear, availableYears } = useYear();
  const isAdmin = role === "admin";

  const isActive = (path: string) => location.pathname === path;

  const navSections = [
    {
      items: [
        {
          label: "Dashboard",
          path: "/",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Human Resoures",
      items: [
        {
          label: "Employees",
          path: "/employees",
          icon: Users,
        },
         {
          label: "Payroll",
          path: "/payments",
          icon: CreditCard,
        },
        {
          label: "Payment Ledger",
          path: "/payment-history",
          icon: History,
        },
        {
          label: "Employee Documents",
          path: "/work-letters",
          icon: FileCheck,
        },
      ],
      adminOnly: true,
    },
    {
      title: "Projects",
      items: [
        {
          label: "Contracts",
          path: "/contracts",
          icon: Briefcase,
        },
        {
          label: "Costs",
          path: "/costs",
          icon: TrendingUp,
        },
      ],
      adminOnly: true,
    },
    {
      title: "Accounting",
      items: [
        {
          label: "Bills",
          path: "/bills",
          icon: Receipt,
        },
      ],
      adminOnly: true,
    },
    {
      title: "Operations",
      items: [
        {
          label: "Materials",
          path: "/materials",
          icon: Package,
        },
      ],
      adminOnly: true,
    },
    {
      items: [
        {
          label: "Settings",
          path: "/settings",
          icon: SettingsIcon,
        },
      ],
      adminOnly: true,
    },
  ].filter((section) => !section.adminOnly || isAdmin);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white text-slate-900 border-r border-slate-200">
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <SouthParkLogo size={32} />
          <div>
            <h1 className="text-sm font-bold text-slate-900">South Park</h1>
            <p className="text-xs text-slate-500">Cabinets Management</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            {section.title && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 p-4 space-y-4">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
            {profile?.name?.charAt(0) || profile?.email?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {profile?.name || "User"}
            </p>
            <p className="text-[10px] text-slate-500 capitalize">{role}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50 gap-3"
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </Button>

        <p className="text-[10px] text-slate-400 text-center">
          v1.2.0 • South Park Cabinets
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 flex-shrink-0 fixed inset-y-0 left-0 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out shadow-xl",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-screen transition-all duration-300 min-w-0 w-full pt-16 lg:pt-0">
        <header className="fixed top-0 inset-x-0 lg:sticky lg:top-0 z-40 w-full border-b border-slate-200 bg-white shadow-sm h-16 px-4 flex items-center justify-between lg:w-full">
          <div className="flex items-center gap-4">
            <div
              className="lg:hidden text-slate-700 hover:bg-slate-100 px-2 py-2 rounded-lg"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <HiMenuAlt1 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 truncate">
              <span className="md:hidden">SP Cabinets</span>
              <span className="hidden md:inline">South Park Cabinet Management</span>
            </h2>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500 hidden sm:inline">Year:</span>
              <Select
                value={String(selectedYear)}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
