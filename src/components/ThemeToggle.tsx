"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-400 mb-1">
        <div className="flex items-center gap-2">
          <Sun className="h-4 w-4" />
          <span>Dark Mode</span>
        </div>
        <div className="h-[18.4px] w-[32px] rounded-full bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>
    )
  }

  const isDark = resolvedTheme === "dark"

  return (
    <div 
      className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors mb-1 cursor-pointer group"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <div className="flex items-center gap-2">
        {isDark ? (
          <Moon className="h-4 w-4 transition-colors group-hover:text-primary" />
        ) : (
          <Sun className="h-4 w-4 transition-colors group-hover:text-primary" />
        )}
        <span className="font-medium">Dark Mode</span>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        onClick={(e) => e.stopPropagation()} // Prevent double toggle
      />
    </div>
  )
}
