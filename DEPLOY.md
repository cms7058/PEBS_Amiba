# 部署指南 · Amoeba Copilot

> 上海零参科技 · 阿米巴动态智能体系统  
> 默认部署方式：单机 Docker + Caddy/Nginx 反代 + HTTPS  
> 最小要求：1 vCPU / 2 GB 内存 / 20 GB 磁盘 / Ubuntu 22.04+ / Docker 24+ + docker compose v2

---

## 一、3 分钟在云服务器上跑起来

```bash
# 1) 安装 Docker（已安装可跳过）
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER       # 注销重登录后生效

# 2) 把代码拷到服务器
rsync -avz --exclude='node_modules' --exclude='.next' --exclude='data' \
  app/ user@your-server:/opt/amoeba-copilot/

# 或者用 git:
ssh user@your-server "git clone <your-repo> /opt/amoeba-copilot && cd /opt/amoeba-copilot/app"

# 3) 一键部署（自动生成 .env、构建、启动、等健康）
cd /opt/amoeba-copilot
./deploy.sh
```

`deploy.sh` 第一次运行会：
- 自动 `cp .env.example .env`
- 用 `openssl rand` 生成强 `AMIBA_AUTH_SECRET`
- 生成一次性 `AMIBA_ADMIN_PASSWORD` 并打印到终端 — **请立即记录**
- 跑 `docker compose build`
- 跑 `docker compose up -d`
- 轮询健康检查最多 60 秒，绿了打印 ✓

启动后访问 `http://your-server:3000`，用 `admin` + 终端打印的密码登录。

---

## 二、配置反向代理 + HTTPS（生产必备）

**不要**把 3000 端口直接暴露公网。在前面挂一个 Caddy / Nginx。

### Caddy（自动 HTTPS，推荐）
`/etc/caddy/Caddyfile`：

```caddy
copilot.your-domain.com {
    reverse_proxy localhost:3000
    encode gzip
    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

```bash
sudo systemctl reload caddy
```

### Nginx

```nginx
server {
  listen 443 ssl http2;
  server_name copilot.your-domain.com;

  ssl_certificate     /etc/letsencrypt/live/copilot.your-domain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/copilot.your-domain.com/privkey.pem;

  client_max_body_size 5m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # 必须开启，否则 LLM 流式响应会被缓冲到完成才下发，丢失打字机效果
    proxy_buffering off;
    proxy_request_buffering off;
    proxy_read_timeout 300s;
  }
}
```

挂上 HTTPS 之后，记得回去把公网域名写入 `.env`：
```
NEXT_PUBLIC_PUBLIC_URL=https://copilot.your-domain.com
```

然后重新构建（这个变量是 build-time 的）：
```bash
./deploy.sh
```

主页右侧的"移动端 H5 二维码"才会扫到正确地址。

---

## 三、环境变量一览

`.env` 文件（与 `docker-compose.yml` 同目录）：

| 变量 | 必填 | 说明 |
|---|---|---|
| `AMIBA_AUTH_SECRET` | ✅ | 用来签 session JWT。`openssl rand -base64 48` 生成 |
| `AMIBA_ADMIN_PASSWORD` | 可选 | 仅在 `data/users.json` 首次创建时使用；之后改密码请在 `/admin/users` 里改 |
| `NEXT_PUBLIC_PUBLIC_URL` | 强烈推荐 | 公网域名，二维码使用。**变更需重新 build**（`NEXT_PUBLIC_*` 在打包时烘进客户端 bundle） |
| `HOST_PORT` | 可选 | 默认 3000；如 80/8080 被占用可改 |

`AMIBA_DATA_DIR` 不需要设置，容器内已固定为 `/app/data`。

---

## 四、deploy.sh 使用速查

```bash
./deploy.sh              # 构建 + 启动（首次会自动生成 .env）
./deploy.sh logs         # tail 容器日志
./deploy.sh restart      # 重启容器
./deploy.sh down         # 停止并删除容器（数据卷保留）
./deploy.sh backup       # 把 data 卷快照成 amoeba-backup-YYYYMMDD-HHMMSS.tgz
./deploy.sh restore F.tgz # 用 F.tgz 覆盖恢复数据卷（会提示确认）
```

---

## 五、数据持久化

所有持久化数据放在 Docker 命名卷 `amoeba-data` 中，对应容器内 `/app/data/`：

| 文件 | 内容 |
|---|---|
| `users.json` | 登录账号（含 bcrypt 密码哈希） |
| `enterprises.json` | 企业档案 + 长期记忆 + 最新画像 |
| `conversations.json` | 全部诊断对话历史 |
| `questions.json` | 题库（含 admin 增删改 + AI 建议批准后入库） |
| `suggestions.json` | AI 提出但待审核的建议题目 |
| `benchmark.json` | 匿名化的行业基准样本（每个诊断 finalize 时追加） |

**升级 / 重建镜像**：
```bash
git pull         # 或重新 rsync
./deploy.sh      # 重新 build + rolling update — 数据卷不动
```

**备份策略**（建议）：
```bash
# crontab: 每天凌晨 3 点备份
0 3 * * * cd /opt/amoeba-copilot && ./deploy.sh backup >> /var/log/amoeba-backup.log 2>&1

# 备份保留 7 天
find /opt/amoeba-copilot -name 'amoeba-backup-*.tgz' -mtime +7 -delete
```

---

## 六、运维要点

### 模型 API Key 在哪
- 每个用户在浏览器 `localStorage` 里保存自己的 DeepSeek / MiniMax / Kimi API Key
- **API Key 永远不会上传到服务器，也不会进 data 卷**
- 服务端只在用户对话时把 Key 转发给上游模型，立刻丢弃

如果想做组织级集中托管，告诉我，我能加一个 admin-only 的"组织级密钥"配置（存 users.json 旁的 secrets.json，前端拉不到原文）。

### MiniMax 接 Anthropic 协议
默认配置已设：
- `baseUrl: https://api.minimaxi.com/anthropic`
- `model: MiniMax-M2.7`
- `protocol: anthropic`

API Key 由用户在「模型与设置」里填。若需切换其它 MiniMax 模型，只改 model 名即可。

### 健康检查 / 故障排查

```bash
docker compose ps        # 看 STATUS 是否 healthy
./deploy.sh logs         # 看应用日志
docker stats             # 看资源占用
```

常见问题：

| 现象 | 排查方向 |
|---|---|
| 502 / 容器 unhealthy | `./deploy.sh logs` 看启动报错；最常见是 `AMIBA_AUTH_SECRET` 没设 |
| 登录后立即被踢回 /login | `AMIBA_AUTH_SECRET` 在重启间发生变化，session 失效。固定该变量后所有用户都需重登录 |
| LLM 对话没有打字机效果（要等响应完才一次出现） | Nginx/网关把 SSE 缓冲了；检查 `proxy_buffering off;` 和 `proxy_request_buffering off;` |
| 主页 QR 码扫到错误地址 | `NEXT_PUBLIC_PUBLIC_URL` 没设或没重新 build。改 `.env` 后 `./deploy.sh` 即可 |
| 升级后丢用户/数据 | 检查 `docker volume ls` 是否还有 `amoeba_amoeba-data`；如果被 `docker compose down -v` 清了，需从备份恢复 |
| `pnpm-lock.yaml` 改了 build 失败 | 删 `.next` 与 image，再 `./deploy.sh` |
| docker stop 卡住等 10 秒 | 已用 tini 处理，正常应该 < 2 秒。若仍慢，看是否被 SSE 长连接挂住 |

---

## 七、资源使用预估

| 部分 | 内存 | 磁盘 |
|---|---|---|
| 镜像本身 | — | 约 350-400 MB |
| 运行时 | 250-700 MB（多用户对话峰值） | — |
| 数据卷 | — | 100 MB 以内可服务 100 家企业 |

`docker-compose.yml` 已写默认资源限制：CPU 1.5 核 / 内存 1024 MB。要改成你 VM 的实际配置，编辑 `deploy.resources.limits`。

---

## 八、首次部署后清单

- [ ] 用 admin 登录，**立即修改默认密码** (`/admin/users`)
- [ ] 创建 1-2 个 consultant / viewer 账号给同事
- [ ] 在「模型与设置」配置至少一个 LLM API Key 并"测试连接"通过
- [ ] 在主页扫一次二维码确认 `/m` 移动端能正常打开
- [ ] 设置每日数据备份 cron
- [ ] 把 `.env` 文件权限改严：`chmod 600 .env`
- [ ] 把 `/opt/amoeba-copilot/` 目录加入服务器的 systemd 自启或 docker 默认重启策略（已配置 `restart: unless-stopped`）

部署完成后告诉我 URL，我帮你跑一次 smoke test 清单。
