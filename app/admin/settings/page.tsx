import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import SettingsClient from "./SettingsClient";

export default async function AdminSettingsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  return <SettingsClient />;
}
