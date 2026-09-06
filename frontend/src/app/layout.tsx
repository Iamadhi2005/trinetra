import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/layout/ClientLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TRINETRA - Medical Intrusion Detection System",
  description: "Enterprise-grade SOC Dashboard for IoMT Hospital Cyber Guard",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                if (e && e.message && e.message.includes('startTime')) {
                  e.stopImmediatePropagation();
                  e.preventDefault();
                }
              }, true);
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-[#F5F7FA] text-[#1A202C]`}>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
