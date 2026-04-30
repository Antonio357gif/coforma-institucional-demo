"use client";

import { usePathname } from "next/navigation";

export default function InstitutionalBrandBadge() {
  const pathname = usePathname();

  const ocultarBadge =
    pathname === "/login" ||
    pathname === "/dashboard" ||
    pathname === "/";

  if (ocultarBadge) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute left-1/2 top-[14px] z-30 -translate-x-1/2">
      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-400 bg-white p-1 shadow-lg">
        <img
          src="/coforma-isotipo.png"
          alt="Coforma"
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
}