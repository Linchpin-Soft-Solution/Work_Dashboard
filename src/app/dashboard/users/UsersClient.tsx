"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Edit, Trash2, Shield, User as UserIcon } from "lucide-react";


interface UsersClientProps {
  initialUsers: User[];
  currentUserId: string;
}

export default function UsersClient({ initialUsers, currentUserId }: UsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirm();

  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email") as string,
      password: formData.get("password") || undefined,
      role: formData.get("role"),
      designation: formData.get("designation"),
      baseMonthlySalary: formData.get("baseMonthlySalary"),
    };

    if (!data.email.endsWith("@linchpinsoftsolution.com")) {
      toast.error("Email must be a @linchpinsoftsolution.com address");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create user");
      }

      const newUser = await res.json();
      setUsers([...users, newUser]);
      setIsAddOpen(false);
      toast.success("User created successfully");
      router.refresh();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email") as string,
      password: formData.get("password") || undefined,
      role: formData.get("role"),
      designation: formData.get("designation"),
      baseMonthlySalary: formData.get("baseMonthlySalary"),
      isActive: formData.get("isActive") === "true",
    };

    if (data.email && !data.email.endsWith("@linchpinsoftsolution.com")) {
      toast.error("Email must be a @linchpinsoftsolution.com address");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update user");
      }

      const updatedUser = await res.json();
      setUsers(users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
      setIsEditOpen(false);
      setSelectedUser(null);
      toast.success("User updated successfully");
      router.refresh();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm(
      "Deactivate User",
      "Are you sure you want to deactivate this user? They will no longer be able to log in, but their data will be preserved."
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to deactivate user");

      const deactivatedUser = await res.json();
      setUsers(users.map((u) => (u.id === deactivatedUser.id ? deactivatedUser : u)));
      toast.success("User deactivated successfully");
      router.refresh();
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button />}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add User
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account. They will be able to log in with these credentials.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" required placeholder="John Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  placeholder="user@linchpinsoftsolution.com" 
                  pattern=".+@linchpinsoftsolution\.com"
                  title="Email must be a @linchpinsoftsolution.com address"
                />
                <p className="text-[10px] text-muted-foreground">Must be a @linchpinsoftsolution.com address</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" required placeholder="Enter a Password for the User" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue="EMPLOYEE">
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="INTERN">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input id="designation" name="designation" placeholder="Frontend Developer" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseMonthlySalary">Base Monthly Salary (₹)</Label>
                <Input id="baseMonthlySalary" name="baseMonthlySalary" type="number" min="0" step="1000" required defaultValue="0" />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Create User"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Salary</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No users found.</TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span>{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.designation || "No Designation"}</span>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "ADMIN" ? "default" : user.role === "INTERN" ? "secondary" : "outline"} className="flex w-fit items-center gap-1">
                      {user.role === "ADMIN" ? <Shield className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "success" : "destructive"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">₹{user.baseMonthlySalary.toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedUser(user);
                          setIsEditOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        disabled={user.id === currentUserId || !user.isActive}
                        onClick={() => handleDelete(user.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) setSelectedUser(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details and access level.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input id="edit-name" name="name" required defaultValue={selectedUser.name} />
              </div>
               <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input 
                  id="edit-email" 
                  name="email" 
                  type="email" 
                  required 
                  defaultValue={selectedUser.email}
                  pattern=".+@linchpinsoftsolution\.com"
                  title="Email must be a @linchpinsoftsolution.com address"
                />
                <p className="text-[10px] text-muted-foreground">Must be a @linchpinsoftsolution.com address</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password">New Password (Optional)</Label>
                <Input id="edit-password" name="password" type="password" placeholder="Leave blank to keep current" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Role</Label>
                <Select name="role" defaultValue={selectedUser.role} disabled={selectedUser.id === currentUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="INTERN">Intern</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-designation">Designation</Label>
                <Input id="edit-designation" name="designation" defaultValue={selectedUser.designation || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-baseMonthlySalary">Base Monthly Salary (₹)</Label>
                <Input id="edit-baseMonthlySalary" name="baseMonthlySalary" type="number" min="0" step="0.01" required defaultValue={selectedUser.baseMonthlySalary} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-isActive">Account Status</Label>
                <Select name="isActive" defaultValue={selectedUser.isActive ? "true" : "false"} disabled={selectedUser.id === currentUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  );
}
