import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function todayIST(): Date {
  const dateString = new Date().toLocaleDateString("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [month, day, year] = dateString.split("/");
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
}
