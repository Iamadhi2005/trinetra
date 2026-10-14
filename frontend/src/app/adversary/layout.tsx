import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TRINETRA // ADVERSARY ATTACKER HUB",
  description:
    "External adversary C2 penetration console for TRINETRA IoMT adversarial testing. Isolated lab environment only.",
};

export default function AdversaryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Bypass the main ClientLayout (sidebar, header, alert banner) entirely.
  // This page is a standalone full-screen console.
  return <>{children}</>;
}
