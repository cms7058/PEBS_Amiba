import type { Graph } from "@antv/x6";

// 统一的图形交互：左键点击显示区域激活 → 滚轮缩放；按住右键拖动平移；双击复位到初始 zoomToFit。
// 配合 Graph 配置 panning:{ enabled:true, eventTypes:["rightMouseDown"] }、mousewheel 关闭使用。
export function attachZoomPan(graph: Graph, container: HTMLElement, padding = 20): () => void {
  let active = false;
  const fit = () => graph.zoomToFit({ padding, maxScale: 1 });

  const onContainerDown = () => { active = true; };
  const onDocDown = (e: MouseEvent) => { if (!container.contains(e.target as Node)) active = false; };
  const onWheel = (e: WheelEvent) => {
    if (!active) return;
    e.preventDefault();
    const next = Math.max(0.3, Math.min(3, graph.zoom() + (e.deltaY < 0 ? 0.1 : -0.1)));
    graph.zoom(next, { absolute: true });
  };
  const onContextMenu = (e: MouseEvent) => e.preventDefault();
  const onDblClick = () => fit();

  container.addEventListener("mousedown", onContainerDown);
  document.addEventListener("mousedown", onDocDown);
  container.addEventListener("wheel", onWheel, { passive: false });
  container.addEventListener("contextmenu", onContextMenu);
  container.addEventListener("dblclick", onDblClick);

  return () => {
    container.removeEventListener("mousedown", onContainerDown);
    document.removeEventListener("mousedown", onDocDown);
    container.removeEventListener("wheel", onWheel);
    container.removeEventListener("contextmenu", onContextMenu);
    container.removeEventListener("dblclick", onDblClick);
  };
}
