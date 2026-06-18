"use client";

import { Sliders } from "lucide-react";
import type { FlowStyle } from "../../lib/flow-style";

// 流程图节点"形式与内容"可配置面板。
export function FlowStylePanel({ style, onChange }: { style: FlowStyle; onChange: (s: FlowStyle) => void }) {
  const set = (p: Partial<FlowStyle>) => onChange({ ...style, ...p });

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm font-semibold">
        <Sliders className="h-4 w-4 text-[color:var(--primary)]" /> 节点样式配置
        <span className="text-[11px] font-normal text-muted-foreground">实时预览，本地保存</span>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 px-3 py-3 text-xs sm:grid-cols-3">
        <Row label="节点形状">
          <select value={style.shape} onChange={(e) => set({ shape: e.target.value as FlowStyle["shape"] })} className={sel}>
            <option value="rounded">圆角矩形</option>
            <option value="rect">直角矩形</option>
          </select>
        </Row>
        <Row label="取色方式">
          <select value={style.accent} onChange={(e) => set({ accent: e.target.value as FlowStyle["accent"] })} className={sel}>
            <option value="amiba">按阿米巴</option>
            <option value="fixed">固定主题色</option>
          </select>
        </Row>
        <Row label="泳道高度">
          <input type="range" min={72} max={140} value={style.laneH} onChange={(e) => set({ laneH: Number(e.target.value) })} className="w-full" />
        </Row>
        <Row label="节点宽度">
          <input type="range" min={120} max={240} value={style.nodeW} onChange={(e) => set({ nodeW: Number(e.target.value) })} className="w-full" />
        </Row>
        <Row label="节点高度">
          <input type="range" min={44} max={88} value={style.nodeH} onChange={(e) => set({ nodeH: Number(e.target.value) })} className="w-full" />
        </Row>
        {style.accent === "fixed" && (
          <Row label="填充 / 描边">
            <div className="flex items-center gap-1.5">
              <input type="color" value={style.fill} onChange={(e) => set({ fill: e.target.value })} className="h-7 w-7 rounded border border-border" />
              <input type="color" value={style.stroke} onChange={(e) => set({ stroke: e.target.value })} className="h-7 w-7 rounded border border-border" />
            </div>
          </Row>
        )}
        <Toggle label="显示序号" v={style.showSeq} on={(v) => set({ showSeq: v })} />
        <Toggle label="显示活动名" v={style.showName} on={(v) => set({ showName: v })} />
        <Toggle label="节点显部门" v={style.showDept} on={(v) => set({ showDept: v })} />
        <Toggle label="开始/结束事件" v={style.showEvents} on={(v) => set({ showEvents: v })} />
        <Toggle label="跨泳道虚线" v={style.dashCrossLane} on={(v) => set({ dashCrossLane: v })} />
      </div>
    </div>
  );
}

const sel = "w-full rounded-md border border-border bg-background px-2 py-1";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] text-muted-foreground">{label}</div>
      {children}
    </div>
  );
}

function Toggle({ label, v, on }: { label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} className="h-3.5 w-3.5" />
      <span>{label}</span>
    </label>
  );
}
