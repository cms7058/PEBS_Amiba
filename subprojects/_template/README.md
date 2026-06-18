# 子项目脚手架模板

复制本目录新建子项目智能体：`cp -r subprojects/_template subprojects/<your-agent>`

## 运行（独立模式）

```bash
cp .env.example .env   # 不填 AMIBA_ENDPOINT 即独立模式
npm run dev
```

## 接入主阿米巴

1. 在主系统「工具接入」页为目标企业生成本工具的连接器令牌（需先把本子项目登记进
   `app/src/lib/tools-registry.ts` 的 `TOOLS`）。
2. 把生成的 `amiba_endpoint / amiba_token / enterprise_id / source` 写入 `.env`，
   并设 `AMIBA_SYNC_MODE=push`。
3. 子项目产出结果后会自动 `POST /api/ingest` 上传现场数据。

连接器实现见 `src/amiba-connector.js`，契约见
[`../../app/src/lib/factory-types.ts`](../../app/src/lib/factory-types.ts) 与
[`../README.md`](../README.md)。
