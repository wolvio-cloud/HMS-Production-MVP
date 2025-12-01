"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
    if (isAuthenticated) {
      router.push("/doctor");
    } else {
      router.push("/login");
    }
  }, [isAuthenticated, router, initAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="glass-card p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    </div>
  );
}
