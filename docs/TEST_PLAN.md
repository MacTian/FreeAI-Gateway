# TEST_PLAN.md — Chat2API Web 版测试计划

## Phase 1 — 后端 API

- [ ] GET /api/app/version 返回版本号
- [ ] GET /api/config 返回配置
- [ ] PUT /api/config 更新配置并持久化
- [ ] GET /api/providers 返回 provider 列表
- [ ] POST /api/providers 添加 provider
- [ ] GET /api/accounts 返回账号列表
- [ ] POST /api/proxy/start 启动代理，返回端口
- [ ] POST /api/proxy/stop 停止代理
- [ ] GET /api/proxy/status 返回运行状态
- [ ] GET /api/models 返回可用模型列表
- [ ] GET /api/logs 返回请求日志

## Phase 2 — 前端

- [ ] Dashboard 页面正常加载，显示代理状态
- [ ] Providers 页面可以添加/删除 provider
- [ ] Proxy Settings 可以启动/停止代理
- [ ] API Keys 页面可以生成/删除 key
- [ ] Logs 页面实时显示请求记录
- [ ] Settings 页面保存配置后刷新不丢失

## Phase 3 — 集成

- [ ] 用 OpenAI SDK 连接 http://localhost:8080/v1，发送 chat 请求成功返回
- [ ] 代理启动后，转发 DeepSeek/Kimi 等请求正常
- [ ] Docker 部署后，重启容器数据不丢失（volume 挂载验证）
- [ ] SSE 推送：代理状态变化前端实时更新
