"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "./Sidebar";
import Header from "./Header";
import UrgentAlertBanner from "../ui/UrgentAlertBanner";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [queryClient] = useState(() => new QueryClient());
  const isBypassedPage = pathname === "/login" || pathname === "/attacker";

  if (isBypassedPage) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-[#F5F7FA]">
        <Sidebar />
        <Header />
        <UrgentAlertBanner />
        <main className="ml-[80px] p-6 transition-all duration-300">
          {children}
        </main>
      </div>
    </QueryClientProvider>
  );
}
