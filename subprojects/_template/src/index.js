// 子项目入口示例。把这里换成你的智能体本体逻辑。
// 演示：启动时 hello，产出结果后 push 到主阿米巴（接入模式下）。

import { hello, push, amibaEnabled } from "./amiba-connector.js";

async function main() {
  console.log("[subproject] 启动。阿米巴接入：", amibaEnabled() ? "已开启" : "独立模式");

  // 能力发现
  await hello(["example_metric"], "0.1.0");

  // ……此处运行你的分析/计算，得到现场要素数据……
  const metrics = [
    {
      factor: "method",
      key: "example_metric",
      label: "示例指标",
      value: 42,
      unit: "%",
      benchmark: 60,
      source: process.env.AMIBA_SOURCE || "subproject-template",
      capturedAt: new Date().toISOString(),
    },
  ];

  const result = await push({ metrics, batchId: `batch_${Date.now()}` });
  console.log("[subproject] 上报结果：", result);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
