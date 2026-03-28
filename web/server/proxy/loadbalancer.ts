import { store } from '../store.js'
import type { Account, Provider, LoadBalanceStrategy } from '../types.js'

export interface SelectedTarget {
  provider: Provider
  account: Account
}

const roundRobinIndex = new Map<string, number>()

export function selectTarget(
  requestedProviderId?: string,
  requestedAccountId?: string,
  requestedModel?: string
): SelectedTarget | null {
  const providers = store.getProviders().filter(p => p.enabled)
  const accounts = store.getAccounts()
  const config = store.getConfig()
  const strategy: LoadBalanceStrategy = config.loadBalanceStrategy || 'round-robin'

  // Filter active accounts with their providers
  const candidates: SelectedTarget[] = []
  for (const provider of providers) {
    if (requestedProviderId && provider.id !== requestedProviderId) continue
    // 如果指定了模型名，只选支持该模型的供应商
    if (requestedModel && !requestedProviderId && provider.supportedModels && provider.supportedModels.length > 0) {
      const modelLower = requestedModel.toLowerCase()
      const supported = provider.supportedModels.some((m: string) =>
        m.toLowerCase() === modelLower || requestedModel === m
      )
      // 同时检查 modelMappings
      const inMappings = provider.modelMappings && Object.keys(provider.modelMappings).some(
        (k: string) => k.toLowerCase() === modelLower || k === requestedModel
      )
      if (!supported && !inMappings) continue
    }
    const providerAccounts = accounts.filter(
      a => a.providerId === provider.id && a.status === 'active'
    )
    for (const account of providerAccounts) {
      if (requestedAccountId && account.id !== requestedAccountId) continue
      candidates.push({ provider, account })
    }
  }

  if (candidates.length === 0) return null

  if (strategy === 'round-robin') {
    const key = requestedProviderId || 'all'
    const current = (roundRobinIndex.get(key) || 0) % candidates.length
    roundRobinIndex.set(key, current + 1)
    return candidates[current]
  }

  if (strategy === 'fill-first') {
    // Pick account with lowest usage
    return candidates.sort((a, b) => (a.account.requestCount || 0) - (b.account.requestCount || 0))[0]
  }

  if (strategy === 'failover') {
    // Always pick first unless it has errors
    return candidates.find(c => c.account.status === 'active') || candidates[0]
  }

  return candidates[0]
}
