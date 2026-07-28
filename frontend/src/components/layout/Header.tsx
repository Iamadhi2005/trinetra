"use client";

import React, { useState, useEffect } from "react";
import { Bell, User as UserIcon, CheckCircle2, ShieldAlert } from "lucide-react";
import { fetchApi } from "@/lib/api";

interface UserProfile {
  username: string;
  name: string;
  role: string;
}

export default function Header() {
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  const [user, setUser] = useState<UserProfile | null>(null);
  const [hasAlerts, setHasAlerts] = useState<boolean>(false);

  useEffect(() => {
    // Update Clock live every second
    const timer = setInterval(() => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("en-US", { hour12: true }));
      setDateStr(
        now.toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      );
    }, 1000);

    // Initial immediate set
    const now = new Date();
    setTimeStr(now.toLocaleTimeString("en-US", { hour12: true }));
    setDateStr(
      now.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    );

    // Fetch User Info & Dashboard status
    fetchApi<UserProfile>("/auth/me")
      .then((data) => setUser(data))
      .catch(() => {
        setUser({ username: "admin", name: "Chief SOC Admin", role: "Admin" });
      });

    const checkAlerts = () => {
      fetchApi<{ active_alerts_count: number }>("/dashboard")
        .then((metrics) => {
          setHasAlerts(metrics.active_alerts_count > 0);
        })
        .catch(() => {});
    };

    checkAlerts();
    const alertInterval = setInterval(checkAlerts, 5000);

    return () => {
      clearInterval(timer);
      clearInterval(alertInterval);
    };
  }, []);

  return (
    <header className="h-16 bg-[#002855] text-white px-6 flex items-center justify-between shadow-md z-30 ml-[80px]">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-4">
        <img
          src="/logo.jpg"
          alt="TRINETRA"
          className="w-9 h-9 object-contain rounded bg-white p-0.5"
        />
        <div className="border-l border-[#33547A] pl-4">
          <h1 className="font-bold text-base tracking-wider leading-none text-white">
            TRINETRA
          </h1>
          <p className="text-[10px] text-[#A0AEC0] uppercase font-medium tracking-widest mt-0.5">
            Medical Intrusion Detection System
          </p>
        </div>
      </div>

      {/* Center Live System Diagnostics */}
      <div className="hidden md:flex items-center gap-6 text-xs bg-[#001D40] px-4 py-1.5 rounded-full border border-[#1A3F6B]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#2ECC71] animate-pulse"></span>
          <span className="text-[#CBD5E0]">Backend:</span>
          <span className="font-semibold text-white">Online</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-[#33547A] pl-4">
          <span className="w-2 h-2 rounded-full bg-[#2ECC71]"></span>
          <span className="text-[#CBD5E0]">DB:</span>
          <span className="font-semibold text-white">Healthy</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-[#33547A] pl-4">
          <span className="w-2 h-2 rounded-full bg-[#2ECC71]"></span>
          <span className="text-[#CBD5E0]">MQTT:</span>
          <span className="font-semibold text-white">Connected</span>
        </div>
        <div className="flex items-center gap-1.5 border-l border-[#33547A] pl-4">
          <span className="w-2 h-2 rounded-full bg-[#2ECC71]"></span>
          <span className="text-[#CBD5E0]">AI Engine:</span>
          <span className="font-semibold text-white">Active</span>
        </div>
      </div>

      {/* Right Controls: Clock, Alerts & User Profile */}
      <div className="flex items-center gap-5">
        {/* Live Date & Time */}
        <div className="text-right hidden sm:block">
          <div className="text-[10px] text-[#A0AEC0] font-semibold uppercase tracking-wider">
            System Clock
          </div>
          <div className="text-xs font-semibold tracking-wide text-white">
            {dateStr} | {timeStr}
          </div>
        </div>

        {/* System Threat Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold ${
            hasAlerts
              ? "bg-[#78281F] text-[#F1948A] border border-[#EC7063]"
              : "bg-[#145A32] text-[#82E0AA] border border-[#27AE60]"
          }`}
        >
          {hasAlerts ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>THREAT ISOLATED</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>SYSTEM SECURE</span>
            </>
          )}
        </div>

        {/* User Profile Badge */}
        <div className="flex items-center gap-2 border-l border-[#33547A] pl-4">
          <div className="w-8 h-8 rounded-full bg-[#1A3F6B] flex items-center justify-center text-white border border-[#2C5282]">
            <UserIcon className="w-4 h-4" />
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-xs font-semibold leading-tight text-white">
              {user?.name || "Chief SOC Admin"}
            </div>
            <div className="text-[10px] text-[#319795] font-bold uppercase tracking-wider">
              {user?.role || "Admin"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
