import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Users,
  FileText,
  Receipt,
  LayoutDashboard,
  Menu,
  X,
  TrendingUp,
  CreditCard,
  Settings as SettingsIcon,
  FileCheck,
  Package,
  Briefcase,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { SouthParkLogo } from "@/components/SouthParkLogo";
import { useState } from "react";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [open, setOpen] = useState(true);

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
      title: "Team Management",
      items: [
        {
          label: "Employees",
          path: "/employees",
          icon: Users,
        },
        {
          label: "Work Letters",
          path: "/work-letters",
          icon: FileCheck,
        },
        {
          label: "Workers",
          path: "/workers",
          icon: Users,
        },
      ],
    },
    {
      title: "Financial",
      items: [
        {
          label: "Contracts",
          path: "/contracts",
          icon: Briefcase,
        },
        {
          label: "Payments",
          path: "/payments",
          icon: CreditCard,
        },
        {
          label: "Bills",
          path: "/bills",
          icon: Receipt,
        },
        {
          label: "Costs",
          path: "/costs",
          icon: TrendingUp,
        },
      ],
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
    },
    {
      items: [
        {
          label: "Settings",
          path: "/settings",
          icon: SettingsIcon,
        },
      ],
    },
  ];

  return (
    <SidebarProvider defaultOpen={open} onOpenChange={setOpen}>
      <Sidebar className="bg-slate-900 text-slate-50 border-r border-slate-800">
        <SidebarHeader className="border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3 px-2">
            <SouthParkLogo size={40} />
            <div>
              <h1 className="text-sm font-bold text-slate-50">South Park</h1>
              <p className="text-xs text-slate-400">Cabinets Management</p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <div className="space-y-4">
            {navSections.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                {section.title && (
                  <h3 className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}
                <SidebarMenu className="gap-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.path)}
                          className={`${
                            isActive(item.path)
                              ? "bg-blue-600 text-white hover:bg-blue-700"
                              : "text-slate-300 hover:bg-slate-800 hover:text-slate-50"
                          }`}
                        >
                          <Link to={item.path}>
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
                {section.title && sectionIdx < navSections.length - 1 && (
                  <div className="my-2 border-b border-slate-700" />
                )}
              </div>
            ))}
          </div>
        </SidebarContent>

        <SidebarFooter className="border-t border-slate-800 pt-4">
          <p className="text-xs text-slate-400 text-center">South Park Cabinets v1.0</p>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-slate-50">
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-slate-700 hover:bg-slate-100" />
              <h2 className="text-lg font-semibold text-slate-900">
                South Park Cabinets Management
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-slate-600">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
