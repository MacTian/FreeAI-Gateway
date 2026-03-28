/**
 * Prompt Signature Detection Module
 * Detects if tool prompts have been injected by various AI clients
 * 
 * This module now imports from the unified signatures module
 * to eliminate duplication and ensure consistency
 */

import { ChatMessage } from '../types'
import {
  TOOL_PROMPT_SIGNATURES,
  TOOL_PROMPT_SECTION_MARKERS,
  ClientType,
  DetectionResult,
  detectClientFromSignatures,
  hasGeneralToolPromptSignature,
} from '../constants/signatures'

export type { ClientType, DetectionResult } from '../constants/signatures'

export {
  TOOL_PROMPT_SIGNATURES,
  TOOL_PROMPT_SECTION_MARKERS,
  detectClientFromSignatures,
  hasGeneralToolPromptSignature,
}

export function detectClientPromptType(messages: ChatMessage[]): DetectionResult {
  const allContent = extractAllContent(messages)
  
  if (!allContent) {
    return { clientType: 'unknown', confidence: 0, matchedSignatures: [] }
  }

  return detectClientFromSignatures(allContent)
}

export function hasAnyToolPromptInjected(messages: ChatMessage[]): boolean {
  const allContent = extractAllContent(messages)
  
  if (!allContent) {
    return false
  }

  return hasGeneralToolPromptSignature(allContent)
}

export function hasClientPromptInjected(
  messages: ChatMessage[],
  clientType: ClientType
): boolean {
  const allContent = extractAllContent(messages)
  
  if (!allContent) {
    return false
  }

  const result = detectClientFromSignatures(allContent)
  return result.clientType === clientType && result.confidence > 0
}

export function getMatchedSignatures(messages: ChatMessage[]): Map<ClientType, string[]> {
  const allContent = extractAllContent(messages)
  const result = new Map<ClientType, string[]>()

  if (!allContent) {
    return result
  }

  for (const [clientType, signatures] of Object.entries(TOOL_PROMPT_SIGNATURES.clients)) {
    if (clientType === 'unknown') continue

    const matched: string[] = []
    
    for (const sig of signatures) {
      if (allContent.includes(sig)) {
        matched.push(sig)
      }
    }

    if (matched.length > 0) {
      result.set(clientType as ClientType, matched)
    }
  }

  return result
}

function extractAllContent(messages: ChatMessage[]): string {
  const parts: string[] = []

  for (const msg of messages) {
    if (msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant') {
      if (typeof msg.content === 'string') {
        parts.push(msg.content)
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (typeof part === 'string') {
            parts.push(part)
          } else if (part && typeof part === 'object' && 'text' in part) {
            parts.push(part.text)
          }
        }
      }
    }
  }

  return parts.join('\n')
}

export function removeToolPromptSection(content: string): string {
  let cleanedContent = content
  
  for (const [clientName, markers] of Object.entries(TOOL_PROMPT_SECTION_MARKERS)) {
    const startIndex = cleanedContent.indexOf(markers.start)
    const endIndex = cleanedContent.indexOf(markers.end)
    
    if (startIndex !== -1) {
      if (endIndex !== -1 && endIndex > startIndex) {
        cleanedContent = cleanedContent.slice(0, startIndex) + cleanedContent.slice(endIndex)
        console.log(`[PromptSignatures] Removed ${clientName} tool prompt section`)
      } else {
        cleanedContent = cleanedContent.slice(0, startIndex)
        console.log(`[PromptSignatures] Removed ${clientName} tool prompt section (no end marker)`)
      }
    }
  }
  
  return cleanedContent.trim()
}

export function cleanClientToolPrompts(messages: ChatMessage[]): ChatMessage[] {
  return messages.map(msg => {
    if (msg.role === 'system' && typeof msg.content === 'string') {
      const cleanedContent = removeToolPromptSection(msg.content)
      if (cleanedContent !== msg.content) {
        console.log('[PromptSignatures] Cleaned system message, removed tool prompt section')
        return { ...msg, content: cleanedContent }
      }
    }
    return msg
  })
}

export function hasToolPromptInjected(messages: ChatMessage[]): boolean {
  return hasAnyToolPromptInjected(messages)
}
