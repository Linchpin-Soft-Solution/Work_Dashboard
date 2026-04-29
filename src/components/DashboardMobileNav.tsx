"use client";

import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardMobileNav({ sidebarContent }: { sidebarContent: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-border shrink-0">
      <div className="flex items-center">
        <Image src="/linchpin-logo.png" alt="Linchpin Logo" width={120} height={24} className="h-6 w-auto" priority />
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" />}>
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle Menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 flex flex-col bg-white">
          <SheetHeader className="sr-only">
             <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto flex flex-col">
            {sidebarContent}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
