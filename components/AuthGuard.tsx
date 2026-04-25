"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push(`/auth?next=${encodeURIComponent(pathname)}`);
    }
  }, [mounted, user, loading, router, pathname]);

  if (!mounted || loading || !user) {
    return null;
  }

  return <>{children}</>;
}
