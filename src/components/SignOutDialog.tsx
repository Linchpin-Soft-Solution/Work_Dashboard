"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";

export default function SignOutDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <button className="w-full text-left px-3 py-2 rounded-lg text-sm bg-red-100 text-red-500 hover:bg-red-200 transition flex items-center gap-2 mb-1" />
        }
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be redirected to the login page.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            className="bg-red-500 hover:bg-red-600 text-white"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
