"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AiIdsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
