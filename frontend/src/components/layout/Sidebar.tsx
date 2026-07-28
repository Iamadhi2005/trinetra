"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthToken } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  ShieldAlert,
  Wifi,
  Cpu,
  Bell,
  HardDrive,
  FileText,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Patient Monitor", href: "/patients", icon: Users },
  { label: "Security Monitor", href: "/security", icon: ShieldAlert },
  { label: "Network Status", href: "/network", icon: Wifi },
  { label: "AI & IDS Status", href: "/ai-ids", icon: Cpu },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Device Management", href: "/devices", icon: HardDrive },
  { label: "Audit Logs", href: "/logs", icon: FileText },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "IPS Control", href: "/ips-control", icon: ShieldCheck },
  { label: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);

  const handleLogout = () => {
    clearAuthToken();
    router.push("/login");
  };

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`fixed top-0 left-0 h-screen bg-white border-r border-[#E2E8F0] shadow-sm z-40 transition-all duration-300 ease-in-out flex flex-col justify-between overflow-hidden ${
        isHovered ? "w-[280px]" : "w-[80px]"
      }`}
    >
      {/* Top Header Logo Branding */}
      <div>
        <div className="h-16 flex items-center px-4 border-b border-[#E2E8F0] gap-3">
          <img
            src="/logo.jpg"
            alt="TRINETRA Logo"
            className="w-10 h-10 object-contain rounded-md flex-shrink-0"
          />
          <div
            className={`transition-opacity duration-200 whitespace-nowrap overflow-hidden ${
              isHovered ? "opacity-100 w-auto" : "opacity-0 w-0"
            }`}
          >
            <h1 className="font-bold text-[#002855] text-lg tracking-wide leading-none">
              TRINETRA
            </h1>
            <p className="text-[10px] text-[#718096] uppercase font-semibold tracking-wider mt-1">
              Medical Intrusion Guard
            </p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center h-11 px-6 text-sm font-medium transition-colors relative whitespace-nowrap ${
                  isActive
                    ? "bg-[#EBF3FA] text-[#002855] border-l-4 border-[#002855] font-semibold"
                    : "text-[#4A5568] hover:bg-[#F8FAFC] hover:text-[#002855]"
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 transition-colors ${
                    isActive ? "text-[#002855]" : "text-[#718096] group-hover:text-[#002855]"
                  }`}
                />
                <span
                  className={`ml-4 transition-opacity duration-200 overflow-hidden ${
                    isHovered ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Logout Button */}
      <div className="p-3 border-t border-[#E2E8F0]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center h-11 px-3 text-sm font-medium text-[#E74C3C] hover:bg-[#FDEDEC] rounded-md transition-colors whitespace-nowrap overflow-hidden"
        >
          <LogOut className="w-5 h-5 flex-shrink-0 text-[#E74C3C]" />
          <span
            className={`ml-4 transition-opacity duration-200 overflow-hidden ${
              isHovered ? "opacity-100" : "opacity-0"
            }`}
          >
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
