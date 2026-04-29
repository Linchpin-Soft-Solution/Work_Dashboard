"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLink {
  href: string;
  label: string;
}

interface SidebarNavProps {
  links: NavLink[];
}

export default function SidebarNav({ links }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-4 space-y-0.5">
      {links.map((link) => {
        const isActive = pathname === link.href;
        
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`group relative flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200 ${
              isActive
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {isActive && (
              <span className="absolute left-0 w-1 h-5 bg-blue-600 rounded-r-full" />
            )}
            <span className={isActive ? "ml-2" : ""}>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
