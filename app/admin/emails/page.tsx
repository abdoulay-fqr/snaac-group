import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/auth";
import { listEmailAccounts } from "@/lib/email-accounts";
import EmailsClient from "./EmailsClient";

export default async function AdminEmailsPage() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin/login");
  }
  return <EmailsClient accounts={listEmailAccounts()} />;
}
