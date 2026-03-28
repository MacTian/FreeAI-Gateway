/**
 * Unified Signature Definitions
 * Central definition for all tool prompt signatures
 * Eliminates duplication across tools.ts, promptSignatures.ts, and DefaultPromptAdapter.ts
 */

/**
 * Client types that may inject tool prompts
 */
export type ClientType =
  | 'cline'
  | 'kilocode'
  | 'rooCode'
  | 'vscodeCopilot'
  | 'cherryStudio'
  | 'anthropic'
  | 'openai'
  | 'unknown'

/**
 * Tool call output format
 */
export type ToolCallFormat = 'bracket' | 'xml' | 'anthropic' | 'json' | 'native'

/**
 * Unified tool prompt signatures
 */
export const TOOL_PROMPT_SIGNATURES = {
  /**
   * General tool prompt signatures
   * Used to detect if any tool prompt has been injected
   */
  general: [
    '## Available Tools',
    '## Tool Call Protocol',
    '[function_calls]',
    'TOOL_WRAP_HINT',
    'You can invoke the following developer tools',
    'Tool Call Formatting',
  ],

  /**
   * Client-specific signatures
   * Used to detect which client has injected the prompt
   */
  clients: {
    cline: [
      'TOOL USE',
      'When using tools, follow this format',
      'function_calls block',
      '## Tool Use',
      'When invoking a tool',
      'tool_use_format',
      '## Available Tools',
      'Tool Call Protocol',
      '[function_calls]',
      'TOOL_WRAP_HINT',
    ],
    kilocode: [
      'You are Kilo',
      '## Tools',
      'Tool definitions:',
      'You are an expert software engineer',
      '## Tool Use',
      'When using tools',
    ],
    rooCode: [
      '## Tool Use Guidelines',
      'TOOL USE',
      'You have access to tools',
      '## Tool Use',
      'When invoking a tool',
      'tool_use_format',
      '## Capabilities',
      '## Rules',
      '## Objective',
    ],
    vscodeCopilot: [
      'You are an AI programming assistant',
      'Copilot',
      'tool_use_format',
      'You have access to tools',
      'When using tools',
      '## Tools',
      'VS Code',
    ],
    cherryStudio: [
      'In this environment you have access to a set of tools',
      'Tool Use Formatting',
      '<tool_use>',
      '<tool_use_result>',
      '## Tool Use Available Tools',
      'Tool Use Rules',
      'Tool Use Examples',
    ],
    anthropic: [
      'In this environment you have access to tools',
      '<antml:function_calls>',
      'antml:function_calls',
      'In this environment',
      'you have access to a set of tools',
    ],
    openai: [
      'You are a helpful assistant',
      'function_call',
      'tool_calls',
      'You have access to functions',
    ],
  } as Record<ClientType, string[]>,

  /**
   * Format-specific signatures
   * Used to detect the output format of tool calls
   */
  formats: {
    bracket: ['[function_calls]', '[call:', '[/function_calls]', '[/call]'],
    xml: ['<tool_use>', '<name>', '<arguments>', '</tool_use>'],
    anthropic: ['<antml:function_calls>', 'antml:invoke', '</antml:function_calls>'],
    json: ['"tool_calls"', '"function"', '"arguments"'],
  } as Record<ToolCallFormat, string[]>,
}

/**
 * Tool prompt section markers used by various clients
 * These mark the beginning and end of tool prompt sections
 */
export const TOOL_PROMPT_SECTION_MARKERS = {
  cherryStudio: {
    start: 'In this environment you have access to a set of tools',
    end: '# User Instructions',
  },
  cline: {
    start: 'TOOL USE',
    end: "USER'S CURRENT REQUEST",
  },
  default: {
    start: '## Available Tools',
    end: 'When you receive a tool result',
  },
} as const

/**
 * Detection result with confidence level
 */
export interface DetectionResult {
  clientType: ClientType
  confidence: number
  matchedSignatures: string[]
}

/**
 * Check if content contains any general tool prompt signature
 */
export function hasGeneralToolPromptSignature(content: string): boolean {
  return TOOL_PROMPT_SIGNATURES.general.some((sig) => content.includes(sig))
}

/**
 * Check if content contains any client-specific signature
 */
export function hasClientSignature(content: string, clientType: ClientType): boolean {
  if (clientType === 'unknown') return false
  const signatures = TOOL_PROMPT_SIGNATURES.clients[clientType]
  return signatures.some((sig) => content.includes(sig))
}

/**
 * Detect client type from content
 */
export function detectClientFromSignatures(content: string): {
  clientType: ClientType
  confidence: number
  matchedSignatures: string[]
} {
  const results: Array<{
    clientType: ClientType
    confidence: number
    matchedSignatures: string[]
  }> = []

  for (const [clientType, signatures] of Object.entries(
    TOOL_PROMPT_SIGNATURES.clients
  )) {
    const matchedSignatures = signatures.filter((sig) => content.includes(sig))

    if (matchedSignatures.length > 0) {
      const confidence = matchedSignatures.length / signatures.length
      results.push({
        clientType: clientType as ClientType,
        confidence,
        matchedSignatures,
      })
    }
  }

  if (results.length === 0) {
    return { clientType: 'unknown', confidence: 0, matchedSignatures: [] }
  }

  results.sort((a, b) => b.confidence - a.confidence)
  return results[0]
}

/**
 * Detect tool call format from content
 */
export function detectToolCallFormat(content: string): ToolCallFormat {
  for (const [format, signatures] of Object.entries(
    TOOL_PROMPT_SIGNATURES.formats
  )) {
    if (signatures.some((sig) => content.includes(sig))) {
      return format as ToolCallFormat
    }
  }
  return 'bracket'
}

/**
 * Get all known client types
 */
export function getKnownClientTypes(): ClientType[] {
  return Object.keys(TOOL_PROMPT_SIGNATURES.clients).filter(
    (key) => key !== 'unknown'
  ) as ClientType[]
}
