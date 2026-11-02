import ResetPasswordClient from "./ResetPasswordClient";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function AdminResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;
  return <ResetPasswordClient token={typeof token === "string" ? token : ""} />;
}
