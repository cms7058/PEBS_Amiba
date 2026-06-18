# 阿米巴子项目（子智能体）目录

本目录用于在 PEBS_amiba 主仓内**派生与管理子项目智能体**——每个子项目是一个相对独立的智能体/工具，
既能独立部署使用，也能通过统一的**连接器契约**插拔接入主阿米巴系统，把现场数据上传过来做成本归因。

> 这与外部四大工具（Worktime / APS / BOM / LeanAI）走的是同一套契约（见
> [`../阿米巴5M1E扩展设计方案.md`](../阿米巴5M1E扩展设计方案.md) §9）。区别只是：外部工具是独立仓库，
> 这里的子项目放在主仓子文件夹内、随主仓一起版本管理，便于协同演进。

## 目录约定

```
subprojects/
  README.md            # 本文件：约定与脚手架说明
  _template/           # 子项目脚手架模板（复制它来新建子项目）
  <子项目A>/           # 例如 supply-chain-agent / cost-attribution-agent
  <子项目B>/
```

每个子项目自带独立的 `package.json` / `Dockerfile` / `.env.example`，**不与主 `app/` 共享构建**，
保证「独立可用」。它只依赖一份薄薄的「阿米巴连接器」与主系统通信。

## 新建一个子项目

1. 复制模板：`cp -r subprojects/_template subprojects/<your-agent>`
2. 改名：编辑 `<your-agent>/package.json` 的 `name`、`<your-agent>/README.md`。
3. 实现智能体本体（任意技术栈：Node / Python / …）。
4. 接入主阿米巴（可选，三选一档次）：
   - **L1 文件互通**：导出符合中间模型的 JSON，由主系统 `工具接入` 页手工导入。
   - **L2 主动推送**：实现连接器 `push()`，结果产出后 `POST {AMIBA_ENDPOINT}/api/ingest`。
   - **L3 拉取**：暴露只读 API，由主系统侧适配器定时拉取。
5. 在主系统注册工具：把子项目加入 [`../app/src/lib/tools-registry.ts`](../app/src/lib/tools-registry.ts)
   的 `TOOLS` 列表（含 `id` / `name` / `factors` / `registerUrl` / `capabilities`），
   主系统的「工具接入」页就会出现它，并支持「接入并跳转注册」。

## 连接器契约（与主系统对接的唯一接口）

子项目对主阿米巴**零硬依赖**，仅靠环境变量激活（不配 = 独立模式）：

```bash
AMIBA_ENDPOINT=https://amiba.example.com   # 主系统地址；为空则连接器休眠
AMIBA_TOKEN=amk_xxx                         # 主系统「工具接入」生成的连接器令牌
AMIBA_ENTERPRISE_ID=ent_xxx                 # 数据归属企业
AMIBA_SOURCE=<your-agent>                   # 本子项目标识（= tools-registry 里的 id）
AMIBA_SYNC_MODE=push                        # push | manual | off
```

上报数据结构（中间模型，详见 [`../app/src/lib/factory-types.ts`](../app/src/lib/factory-types.ts)）：

```jsonc
POST {AMIBA_ENDPOINT}/api/ingest
Authorization: Bearer {AMIBA_TOKEN}
{
  "source": "<your-agent>",
  "enterpriseId": "ent_xxx",
  "batchId": "batch_20260614_001",   // 幂等键
  "schemaVersion": "v2",
  "metrics":  [ /* FactorMetric[] */ ],
  "wasteItems": [ /* WasteItem[] */ ]
}
```

注册页约定：主系统「接入」时会跳转到 `registerUrl`，并带上查询参数
`amiba_endpoint / amiba_token / enterprise_id / source`，子项目注册页读取后写入自身配置即完成接入。

## 端口分配建议（本地开发，避免冲突）

| 用途 | 端口 |
|---|---|
| 主阿米巴 app | 3000 |
| Worktime | 8000 |
| APS | 8787 |
| BOM | 3000(前)/8000(后) |
| LeanAI | 5173 |
| **子项目（本目录）** | **从 9100 起顺延** |
