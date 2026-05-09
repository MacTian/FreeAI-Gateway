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

- [ ] 用 OpenAI SDK 连接 http://localhost:3000/v1，发送 chat 请求成功返回
- [ ] 代理启动后，转发 DeepSeek/Kimi 等请求正常
- [ ] Docker 部署后，重启容器数据不丢失（volume 挂载验证）
- [ ] SSE 推送：代理状态变化前端实时更新

## Phase 4 — Anthropic 兼容 API

### 基础请求/响应

- [ ] POST /v1/messages 非流式：发送请求，返回 Anthropic 格式响应
- [ ] POST /v1/messages 流式：发送 stream 请求，返回 Anthropic SSE 事件序列
- [ ] Anthropic 请求中的 system 字段正确转换为 OpenAI messages[0]
- [ ] Anthropic stop_sequences 映射为 OpenAI stop 参数
- [ ] 流式事件顺序正确：message_start → content_block_start → content_block_delta → content_block_stop → message_delta → message_stop
- [ ] API Key 验证：x-api-key 和 Authorization header 均可使用
- [ ] 模型映射：Claude 模型名正确映射到实际供应商模型

### 工具调用（Agent 多轮）— 请求转换

- [ ] Anthropic `tool_use` content blocks → OpenAI `tool_calls`：`name` → `function.name`，`input` → `function.arguments`（JSON 序列化），`id` → `id`
- [ ] Anthropic `tool_result` content blocks → OpenAI `role: tool` 消息：`tool_use_id` → `tool_call_id`，`content` → `content`
- [ ] 混合 content（text + tool_use）正确拆分：text 作为 assistant content，tool_use 作为 tool_calls
- [ ] 混合 content（text + tool_result）正确拆分：tool_result 转为 role: tool 消息，剩余 text 作为 user 消息
- [ ] Anthropic `tools` 定义转换：`input_schema` → `parameters`，`name`/`description` 保留
- [ ] Anthropic `tool_choice` 转换：`{ type: 'auto' }` → `'auto'`，`{ type: 'any' }` → `'required'`，`{ type: 'tool', name: 'X' }` → `{ type: 'function', function: { name: 'X' } }`

### 工具调用（Agent 多轮）— 响应转换（非流式）

- [ ] OpenAI `tool_calls` → Anthropic `tool_use` content blocks：`function.name` → `name`，`function.arguments` → `input`（JSON 解析），`id` → `id`
- [ ] 响应 `stop_reason` 映射：`tool_calls` → `tool_use`
- [ ] 同时包含 content 和 tool_calls 时，content blocks 包含 text + tool_use
- [ ] 纯文本响应时，content blocks 仅包含 text

### 工具调用（Agent 多轮）— 流式响应

- [ ] 流式 tool_use：按 `index` 聚合 tool_call chunks
- [ ] 流式事件顺序：`content_block_start`（type=tool_use，含 id/name/input）→ `content_block_delta`（type=input_json_delta，含 partial_json）→ `content_block_stop`
- [ ] tool_use block index 与 text block index 独立递增，不冲突
- [ ] 先输出 text content_block，遇到 tool_use 时正确关闭 text block 再开启 tool_use block
- [ ] 流式 `stop_reason`：`tool_calls` → `tool_use`

### Agent 多轮会话

- [ ] Session 模式默认 `multi`：同一 provider/account 的多轮请求复用会话
- [ ] 第一轮：user 消息 → 模型返回 tool_use → 网关正确保留 tool_calls 上下文
- [ ] 第二轮：user 发送 tool_result → 网关转换为 role: tool 消息 → 模型收到完整上下文继续推理
- [ ] 多轮后 `maxMessagesPerSession` 超限自动创建新会话
- [ ] providerSessionId 在多轮间正确传递（供应商原生多轮支持）
