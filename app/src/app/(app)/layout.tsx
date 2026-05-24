import { redirect } from "next/navigation";
import { Sidebar } from "../../components/layout/Sidebar";
import { getCurrentSession } from "../../lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.role} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
