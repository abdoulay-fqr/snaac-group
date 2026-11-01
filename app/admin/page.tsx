import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  return <AdminDashboardClient />;
}
