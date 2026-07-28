"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { setAuthToken, fetchApi } from "@/lib/api";
import { Lock, User as UserIcon, Shield } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetchApi<{ access_token: string; user: any }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      setAuthToken(res.access_token);
      localStorage.setItem("trinetra_user", JSON.stringify(res.user));
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to log in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg border border-[#E2E8F0] shadow-md p-8">
        {/* Logo Branding Header */}
        <div className="text-center mb-8">
          <img
            src="/logo.jpg"
            alt="TRINETRA Logo"
            className="w-16 h-16 object-contain mx-auto mb-3 rounded-md"
          />
          <h1 className="text-2xl font-bold text-[#002855] tracking-wide">
            TRINETRA
          </h1>
          <p className="text-xs text-[#718096] uppercase font-semibold tracking-wider mt-1">
            Medical Intrusion Detection System
          </p>
        </div>

        {/* Demo Credentials Hint */}
        <div className="bg-[#EBF3FA] border border-[#BEE3F8] rounded-md p-3 mb-6 text-xs text-[#2B6CB0]">
          <div className="font-semibold mb-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Authorized Enterprise Access</span>
          </div>
          <div>Admin: <code>admin</code> / <code>admin123</code></div>
          <div>Doctor: <code>doctor</code> / <code>doctor123</code></div>
          <div>Nurse: <code>nurse</code> / <code>nurse123</code></div>
        </div>

        {error && (
          <div className="bg-[#FDEDEC] border border-[#FADBD8] text-[#E74C3C] text-xs font-semibold p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#4A5568] uppercase mb-1">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A0AEC0]">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#CBD5E0] rounded text-sm text-[#1A202C] focus:outline-none focus:border-[#002855] focus:ring-1 focus:ring-[#002855]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#4A5568] uppercase mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#A0AEC0]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#CBD5E0] rounded text-sm text-[#1A202C] focus:outline-none focus:border-[#002855] focus:ring-1 focus:ring-[#002855]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#002855] hover:bg-[#001D40] text-white font-semibold rounded text-sm transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In to SOC Gateway"}
          </button>
        </form>
      </div>
    </div>
  );
}
