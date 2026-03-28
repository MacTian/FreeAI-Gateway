# Engineering Review — Chat2API Web 版改造

**状态：** APPROVED  
**日期：** 2026-03-26  
**Reviewer：** Eng Manager Agent

---

## 目标

把 Electron 桌面应用改造为纯 Web 应用，保留所有核心功能，支持 Docker 部署。

---

## 架构决策

### 整体结构

```
Chat2API/
├── src/                    # 原始代码，不修改
├── web/
│   ├── server/             # Express 后端
│   │   ├── index.ts        # 入口，监听 3000 端口
│   │   ├── routes/         # REST API 路由（对应 IPC channels）
│   │   ├── store/          # 直接复用 src/main/store/
│   │   ├── proxy/          # 直接复用 src/main/proxy/
│   │   ├── oauth/          # 复用 src/main/oauth/，inAppLogin 改 Playwright
│   │   └── middleware/     # auth、cors、logging
│   ├── client/             # React 前端
│   │   ├── src/            # 从 src/renderer/src/ 复制
│   │   ├── index.html
│   │   └── vite.config.ts  # 标准 Vite，proxy 到 :3000
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── README.md
```

### 后端：IPC → REST API 映射

| IPC Channel 前缀 | REST 路由前缀 | 方法 |
|-----------------|-------------|------|
| proxy:* | /api/proxy/* | GET/POST |
| config:* | /api/config/* | GET/PUT |
| providers:* | /api/providers/* | GET/POST/PUT/DELETE |
| accounts:* | /api/accounts/* | GET/POST/PUT/DELETE |
| oauth:* | /api/oauth/* | GET/POST |
| models:* | /api/models/* | GET |
| apiKeys:* | /api/keys/* | GET/POST/DELETE |
| requestLogs:* | /api/logs/* | GET/DELETE |
| session:* | /api/sessions/* | GET/DELETE |
| prompts:* | /api/prompts/* | GET/POST/PUT/DELETE |
| managementApi:* | /api/management/* | GET/PUT |
| app:getVersion | /api/app/version | GET |

### 前端改造规则

- 所有 `window.electron.ipcRenderer.invoke(channel, ...args)` 改为 `fetch('/api/<route>', {method, body})`
- 所有 `window.electron.ipcRenderer.on(channel, handler)` 改为 SSE 或 WebSocket（用于 proxy status push、oauth progress 等）
- 删除 `src/renderer/src/types/electron.d.ts` 中的类型定义，改为 API 类型
- 保留所有 store（zustand），只换数据源

### OAuth inAppLogin 改造

- 原：Electron `BrowserWindow` 打开登录页，监听 URL 变化提取 token
- 改：后端用 **Playwright**（`playwright-extra` + `puppeteer-extra-plugin-stealth`）无头浏览器
- 前端触发 `/api/oauth/start-in-app-login`，后端异步跑 Playwright，通过 SSE 推进度

### 存储

- 直接复用 `src/main/store/` 的 JSON 文件存储，数据目录改为 `~/.chat2api/` 或挂载 volume
- 不引入数据库，保持零依赖部署

---

## 新增依赖

```json
"dependencies": {
  "express": "^4.18",
  "cors": "^2.8",
  "express-sse": "^0.5",
  "playwright": "^1.40"
},
"devDependencies": {
  "@types/express": "^4.17",
  "@types/cors": "^2.8",
  "vite": "^5",
  "typescript": "^5"
}
```

---

## 边界条件 & 风险

1. **OAuth in-app 登录**：Playwright 无头浏览器可能被目标站点检测，需要 stealth 插件
2. **实时推送**：Electron 用 IPC push，Web 版用 SSE，前端需要改监听方式
3. **文件存储路径**：Docker 部署需要 volume 挂载，否则重启数据丢失
4. **管理 API secret**：原来存在 Electron store，Web 版需要持久化到文件

---

## 实施顺序（分阶段）

### Phase 1 — 后端 Express 服务
1. 创建 `web/server/index.ts`（Express 入口）
2. 创建 `web/server/routes/` 下各路由文件，映射所有 IPC handlers
3. 复用 `src/main/store/`、`src/main/proxy/`、`src/main/providers/`
4. OAuth 保留接口，inAppLogin 先返回 501（第二阶段实现）

### Phase 2 — 前端迁移
1. 复制 `src/renderer/src/` 到 `web/client/src/`
2. 创建 API 客户端替换 IPC 调用
3. 配置 Vite dev server proxy 到后端 :3000

### Phase 3 — OAuth Playwright + Docker
1. 实现 Playwright inAppLogin
2. Dockerfile + docker-compose.yml
3. README

---

## 测试计划

见 TEST_PLAN.md
