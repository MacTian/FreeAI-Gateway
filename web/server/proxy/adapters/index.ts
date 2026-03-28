/**
 * Provider Adapter Index (Web Server Edition)
 */

export { DeepSeekAdapter, deepSeekAdapter } from './deepseek.js'
export { DeepSeekStreamHandler } from './deepseek-stream.js'
export { GLMAdapter, GLMStreamHandler, glmAdapter } from './glm.js'
export { KimiAdapter, KimiStreamHandler, kimiAdapter } from './kimi.js'
export { MiniMaxAdapter, MiniMaxStreamHandler, minimaxAdapter } from './minimax.js'
export { QwenAdapter, QwenStreamHandler, qwenAdapter } from './qwen.js'
// QwenAi 依赖 sessionManager 复杂会话管理，暂时禁用
// export { QwenAiAdapter, QwenAiStreamHandler, qwenAiAdapter } from './qwen-ai.js'
export { ZaiAdapter, ZaiStreamHandler, zaiAdapter } from './zai.js'
export { PerplexityAdapter, perplexityAdapter } from './perplexity.js'
export { PerplexityStreamHandler } from './perplexity-stream.js'
