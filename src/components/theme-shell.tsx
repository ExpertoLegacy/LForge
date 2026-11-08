"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { applyTheme, getTheme } from "@/lib/themes";
import ForgeBackground from "@/components/forge-background";

export default function ThemeShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    applyTheme(getTheme("forge"));
  }, []);

  return (
    <>
      {/* Sparks belong to the landing page; the workspace is for reading. */}
      {pathname === "/" && <ForgeBackground />}
      <div className="relative z-10 flex min-h-screen flex-col">
        {children}
      </div>
    </>
  );
}
