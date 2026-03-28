import deepseekIcon from '@/assets/providers/deepseek.svg'
import glmIcon from '@/assets/providers/glm.svg'
import kimiIcon from '@/assets/providers/kimi.svg'
import minimaxIcon from '@/assets/providers/minimax.svg'
import perplexityIcon from '@/assets/providers/perplexity.svg'
import qwenIcon from '@/assets/providers/qwen.svg'
import zaiIcon from '@/assets/providers/zai.svg'

export const providerIcons: Record<string, string> = {
  deepseek: deepseekIcon,
  glm: glmIcon,
  kimi: kimiIcon,
  minimax: minimaxIcon,
  perplexity: perplexityIcon,
  qwen: qwenIcon,
  'qwen-ai': qwenIcon,
  zai: zaiIcon,
}

export function inferProviderIconKey(provider?: {
  id?: string
  name?: string
  apiEndpoint?: string
  baseUrl?: string
  description?: string
}) {
  const text = [provider?.id, provider?.name, provider?.apiEndpoint, provider?.baseUrl, provider?.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (text.includes('deepseek')) return 'deepseek'
  if (text.includes('chatglm') || text.includes('zhipu') || text.includes('智谱') || text.includes('glm')) return 'glm'
  if (text.includes('moonshot') || text.includes('kimi')) return 'kimi'
  if (text.includes('minimax') || text.includes('abab')) return 'minimax'
  if (text.includes('perplexity')) return 'perplexity'
  if (text.includes('dashscope') || text.includes('qwen-ai')) return 'qwen-ai'
  if (text.includes('qwen') || text.includes('tongyi') || text.includes('通义')) return 'qwen'
  if (text.includes('z.ai') || text.includes('zai')) return 'zai'
  return provider?.id || ''
}

export function getProviderIcon(provider?: {
  id?: string
  name?: string
  apiEndpoint?: string
  baseUrl?: string
  description?: string
}) {
  return providerIcons[inferProviderIconKey(provider)]
}
