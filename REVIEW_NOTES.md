# Chat2API Web 版 代码审查报告

> 审查时间：2026-03-28 凌晨

## 已修复问题

### 安全
- **[HIGH] DeepSeek 适配器打印完整 credentials** — `console.log('[DeepSeek] Account credentials:', JSON.stringify(account.credentials))` 会把 token 明文写入日志，已删除

### 类型安全
- **[HIGH] 前端 TypeScript 0 个错误** — `electron.d.ts` 引入了不存在的 `'../../../shared/types'` 路径，导致 `Provider`、`BuiltinProviderConfig` 等类型字段全部报错。修复方案：复制 `server/types.ts` 到 `client/src/shared/types.ts`，修正 import 路径为 `'../shared/types'`。原有 73 个 TS 错误全部消除。

### 稳定性
- **[MEDIUM] 服务启动时账号 error 状态持久化** — 账号被标记 error 后写入文件，重启服务后仍是 error 状态，需要手动 API 重置。现在在 `app.listen` 回调里自动重置所有 error 账号为 active。
- **[LOW] roundRobinIndex 无限增长** — 负载均衡 round-robin 的计数器不断递增，修为取模后存储（实际影响不大，JS 数字足够大）。

## 代码质量观察（未修改，记录备用）

### 后端
- `providers.ts` 第 55 行：`store.addProvider(req.body)` 无字段验证，但 API 不对外暴露，风险可接受
- `store.ts` 每次 `getAccounts()` 都从文件读取，高并发下有 I/O 压力，但当前规模不需要优化
- 各适配器日志较多（`console.log`），生产环境建议统一替换为 `store.addLog`
- Perplexity 适配器的超时没有统一处理，403 时会挂起请求直到客户端超时

### 前端
- i18n 完全同步（910 个键，中英文无缺漏）✅
- 账号 error 状态 UI 已有红色提示和错误信息展示 ✅
- 所有关键操作都有 try-catch 或 .catch() ✅
- 无未使用的 import（tsc 检查通过）✅

### 生图能力
- GLM：✅ 已接入（cogview）
- Zai：有 `image_generation` 参数，token 修复后可测试开启
- 其余供应商：无生图能力

## 待办

- [ ] MiniMax / Perplexity / Zai token 更新
- [ ] Zai 开启 `image_generation: true` 测试
- [ ] 考虑将适配器 `console.log` 统一改为结构化日志
- [ ] Perplexity 403 时的优雅降级（当前直接超时）

## REVIEW COMPLETE
