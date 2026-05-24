"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Shield, UserCircle } from "lucide-react";
import { PageShell } from "../../../../components/layout/PageShell";
import { Card, CardBody, CardHeader } from "../../../../components/ui/Card";
import { Button } from "../../../../components/ui/Button";
import { Input, Label } from "../../../../components/ui/Input";
import { Badge } from "../../../../components/ui/Badge";
import type { PublicUser, Role } from "../../../../lib/users-types";

type DialogState =
  | { mode: "create" }
  | { mode: "edit"; user: PublicUser }
  | null;

const ROLE_LABEL: Record<Role, string> = {
  admin: "管理员",
  consultant: "顾问",
  viewer: "查看者",
};

export default function UsersPage() {
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [me, setMe] = useState<{ id: string } | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error((await res.json()).error || "加载失败");
      const data = await res.json();
      setUsers(data.users);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => d.user && setMe({ id: d.user.id }))
      .catch(() => {});
  }, []);

  async function handleDelete(u: PublicUser) {
    if (!confirm(`确认删除用户「${u.displayName}」(${u.username})？`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      alert((await res.json()).error || "删除失败");
      return;
    }
    reload();
  }

  return (
    <PageShell title="用户管理" subtitle="管理可登录系统的账号、角色与密码">
      <div className="mx-auto max-w-5xl space-y-4">
        <Card>
          <CardHeader
            title="账号列表"
            desc={`共 ${users.length} 个账号`}
            action={
              <Button size="sm" onClick={() => setDialog({ mode: "create" })}>
                <Plus className="h-4 w-4" /> 新建用户
              </Button>
            }
          />
          <CardBody className="px-0 py-0">
            {loading ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 加载中
              </div>
            ) : error ? (
              <div className="m-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-5 py-2.5 text-left font-medium">用户</th>
                    <th className="px-5 py-2.5 text-left font-medium">角色</th>
                    <th className="px-5 py-2.5 text-left font-medium">最近登录</th>
                    <th className="px-5 py-2.5 text-left font-medium">创建时间</th>
                    <th className="px-5 py-2.5 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--primary)]/10 text-[color:var(--primary)]">
                            {u.role === "admin" ? <Shield className="h-4 w-4" /> : <UserCircle className="h-4 w-4" />}
                          </div>
                          <div>
                            <div className="font-medium">{u.displayName}</div>
                            <div className="text-xs text-muted-foreground">{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <Badge tone={u.role === "admin" ? "primary" : u.role === "consultant" ? "success" : "muted"}>
                          {ROLE_LABEL[u.role]}
                        </Badge>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("zh-CN") : "—"}
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setDialog({ mode: "edit", user: u })}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(u)}
                            disabled={me?.id === u.id}
                            title={me?.id === u.id ? "不能删除自己" : "删除"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>

      {dialog && (
        <UserDialog
          state={dialog}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            reload();
          }}
        />
      )}
    </PageShell>
  );
}

function UserDialog({
  state,
  onClose,
  onSaved,
}: {
  state: Exclude<DialogState, null>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = state.mode === "edit";
  const u = isEdit ? state.user : null;
  const [username, setUsername] = useState(u?.username || "");
  const [displayName, setDisplayName] = useState(u?.displayName || "");
  const [role, setRole] = useState<Role>(u?.role || "consultant");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const url = isEdit ? `/api/users/${u!.id}` : "/api/users";
      const method = isEdit ? "PATCH" : "POST";
      const body: Record<string, unknown> = { displayName, role };
      if (!isEdit) body.username = username;
      if (password) body.password = password;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error || "保存失败");
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        onSubmit={handleSave}
        className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-6 shadow-xl"
      >
        <div>
          <h3 className="text-lg font-semibold">{isEdit ? "编辑用户" : "新建用户"}</h3>
          <p className="text-xs text-muted-foreground">
            {isEdit ? "可修改显示名、角色与密码（不修改密码可留空）" : "创建一个新的可登录账号"}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="dlg-username">用户名（登录用）</Label>
            <Input
              id="dlg-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={isEdit}
              required
              placeholder="english_lowercase"
            />
          </div>
          <div>
            <Label htmlFor="dlg-name">显示名</Label>
            <Input
              id="dlg-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="如：王志强"
            />
          </div>
          <div>
            <Label>角色</Label>
            <div className="flex gap-2">
              {(["admin", "consultant", "viewer"] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 rounded-md border px-3 py-2 text-xs transition ${
                    role === r
                      ? "border-[color:var(--primary)] bg-[color:var(--primary)]/5 text-[color:var(--primary)]"
                      : "border-border hover:bg-muted"
                  }`}
                >
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label htmlFor="dlg-pw" hint={isEdit ? "留空 = 不修改" : "至少 6 位"}>
              密码
            </Label>
            <Input
              id="dlg-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEdit ? "留空则保持不变" : "至少 6 位"}
              required={!isEdit}
              minLength={isEdit ? 0 : 6}
            />
          </div>
        </div>

        {err && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{err}</div>
        )}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} 保存
          </Button>
        </div>
      </form>
    </div>
  );
}
