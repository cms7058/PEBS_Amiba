"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PageShell } from "../../../../../components/layout/PageShell";

// 「工具接入」不再作为独立页面：工具接入入口已并入「诊断引擎」诊断结论里，
// 对应到具体问题节点，由用户就地选择是否接入。此处仅做重定向，保留旧链接可用。
export default function IntegrationsRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/e/${params.id}/diagnosis`);
  }, [params.id, router]);

  return (
    <PageShell title="工具接入已并入诊断引擎" subtitle="正在跳转到诊断结论中的「对症工具接入建议」…">
      <div className="py-16 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
        工具接入入口已移到「诊断引擎」里，按问题节点对应工具。正在为你跳转…
      </div>
    </PageShell>
  );
}
