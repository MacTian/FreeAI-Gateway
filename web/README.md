# Chat2API Web 版

Electron 桌面版改造为纯 Web 应用，支持 Docker 部署。

## 快速启动

### 开发模式

```bash
# 1. 启动后端
cd web/server
npm install
npm run dev
# 后端运行在 http://localhost:3000

# 2. 启动前端（新终端）
cd web/client
npm install
npm run dev
# 前端运行在 http://localhost:5173
```

### Docker 部署

```bash
# 在项目根目录运行
cd web
docker-compose up -d

# 访问
open http://localhost:3000
```

## 数据存储

- 默认数据目录：`~/.chat2api/`
- Docker 部署使用 named volume `chat2api_data`
- 可通过环境变量 `CHAT2API_DATA` 自定义路径

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `3000` | 后端监听端口 |
| `CHAT2API_DATA` | `~/.chat2api` | 数据存储目录 |
| `VITE_API_URL` | `http://localhost:3000` | 前端 API 地址（开发用）|

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /health | 健康检查 |
| GET | /api/app/version | 版本号 |
| GET/PUT | /api/config | 配置 |
| GET/POST/PUT/DELETE | /api/providers | Provider 管理 |
| GET/POST/PUT/DELETE | /api/accounts | 账号管理 |
| POST | /api/proxy/start | 启动代理 |
| POST | /api/proxy/stop | 停止代理 |
| GET | /api/proxy/status | 代理状态 |
| GET | /api/models | 可用模型列表 |
| GET/POST/DELETE | /api/keys | API Key 管理 |
| GET/DELETE | /api/logs | 请求日志 |
| POST | /v1/chat/completions | OpenAI 兼容 API |
| POST | /v1/messages | Anthropic 兼容 API（Claude Code）|

## 与桌面版的差异

- OAuth in-app 登录：暂未实现（可手动填入 token）
- 系统托盘：不支持（Web 版无需）
- 窗口控制按钮：不支持
