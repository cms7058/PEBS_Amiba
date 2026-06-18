import { redirect, notFound } from "next/navigation";
import { WorkspaceSidebar } from "../../../components/layout/WorkspaceSidebar";
import { getCurrentSession } from "../../../lib/auth";
import { getEnterprise } from "../../../lib/enterprises";

// 企业工作区布局：进入某企业后的单企业视图（首页=诊断）。
export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const ent = await getEnterprise(id);
  if (!ent) notFound();

  return (
    <div className="flex min-h-screen">
      <WorkspaceSidebar enterpriseId={ent.id} enterpriseName={ent.name} />
      {/* min-w-0 关键：否则内容列默认 min-width:auto，会被宽内容撑开整页 */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">{children}</div>
    </div>
  );
}
