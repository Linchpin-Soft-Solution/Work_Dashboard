import { auth } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800">
        Welcome, {session?.user.name}
      </h1>
      <p className="text-gray-500 mt-1">
        Role: {session?.user.role}
      </p>
    </div>
  );
}