/**
 * Prompt Injection Service
 * Single entry point for all tool prompt injection logic
 * 
 * Responsibilities:
 * 1. Read configuration once
 * 2. Decide whether to inject (based on mode)
 * 3. Detect existing injection (based on mode)
 * 4. Handle existing client injection (based on clientInjectionBehavior)
 * 5. Generate prompt
 * 6. Inject to messages
 */

import { ChatMessage, ChatCompletionTool } from '../types'
import { storeManager } from '../../store/store'
import { PromptGenerator, ProtocolFormat } from './promptGenerator'
import { hasGeneralToolPromptSignature, detectClientFromSignatures, ClientType } from '../constants/signatures'

/**
 * Injection mode type
 */
export type InjectionMode = 'always' | 'smart' | 'never' | 'auto'

/**
 * Client injection behavior type
 */
export type ClientInjectionBehavior = 'skip' | 'replace' | 'append'

/**
 * Injection configuration (internal)
 */
interface InjectionConfig {
  mode: InjectionMode
  clientInjectionBehavior: ClientInjectionBehavior
  smartThreshold: number
  keywords: string[]
  protocolFormat: ProtocolFormat
  preferredVariant?: string
}

/**
 * Injection decision result
 */
interface InjectionDecision {
  shouldInject: boolean
  reason: string
  hasExistingInjection?: boolean
  detectedClient?: ClientType
  hasMCPTools?: boolean
}

/**
 * Injection result
 */
export interface InjectionResult {
  messages: ChatMessage[]
  injected: boolean
  reason?: string
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: InjectionConfig = {
  mode: 'auto',
  clientInjectionBehavior: 'skip',
  smartThreshold: 50,
  keywords: ['search', 'find', 'get', 'call', 'use', 'tool', 'query', 'fetch', 'read', 'write', 'list', 'delete', 'update', 'create'],
  protocolFormat: 'bracket',
}

/**
 * Check if messages contain MCP-style tool definitions
 */
function hasMCPToolDefinitions(messages: ChatMessage[]): boolean {
  for (const msg of messages) {
    if (msg.role === 'system' && typeof msg.content === 'string') {
      if (msg.content.includes('<tools>') && msg.content.includes('<tool>')) {
        return true
      }
      if (msg.content.includes('## Tool Use Available Tools')) {
        return true
      }
    }
  }
  return false
}

/**
 * Generate generic tool call protocol prompt
 * Used when we have MCP tools but no OpenAI tools
 */
function generateGenericToolCallPrompt(format: ProtocolFormat): string {
  if (format === 'xml') {
    return `## Tool Call Protocol
When you decide to call a tool, you MUST respond with NOTHING except a single <tool_use> block exactly like the template below:

<tool_use>
  <name>exact_tool_name_from_list</name>
  <arguments>{"argument": "value"}</arguments>
</tool_use>

CRITICAL RULES:
1. You MUST use the EXACT tool name as defined in the Available Tools list
2. The content inside <arguments> MUST be a raw JSON object
3. Do NOT wrap JSON in \`\`\`json blocks
4. Do NOT output any other text, explanation, or reasoning before or after the <tool_use> block
5. If you need to call multiple tools, output multiple <tool_use> blocks sequentially
6. JSON arguments MUST be valid JSON format

When you receive a tool result, it will be in the format:
[TOOL_RESULT for call_id] result_content`
  }

  return `## Tool Call Protocol
When you decide to call a tool, you MUST respond with NOTHING except a single [function_calls] block exactly like the template below:

[function_calls]
[call:exact_tool_name_from_list]{"argument": "value"}[/call]
[/function_calls]

CRITICAL RULES:
1. EVERY tool call MUST start with [call:exact_tool_name] and end with [/call]
2. You MUST use the EXACT tool name as defined in the Available Tools list
3. The content between [call:...] and [/call] MUST be a raw JSON object on ONE LINE - NO LINE BREAKS inside the JSON
4. Do NOT wrap JSON in \`\`\`json blocks
5. Do NOT output any other text, explanation, or reasoning before or after the [function_calls] block
6. If you need to call multiple tools, put them all inside the same [function_calls] block, each with its own [call:...]...[/call] wrapper
7. JSON arguments MUST be compact, all on one line, NO pretty printing, NO newlines

When you receive a tool result, it will be in the format:
[TOOL_RESULT for call_id] result_content`
}

/**
 * Prompt Injection Service
 */
export class PromptInjectionService {
  /**
   * Process messages and inject tool prompt if needed
   * This is the SINGLE ENTRY POINT for all injection logic
   */
  process(
    messages: ChatMessage[],
    tools: ChatCompletionTool[],
    model: string,
    provider?: string
  ): InjectionResult {
    const config = this.getConfig()
    
    console.log(`[PromptInjectionService] Processing: mode=${config.mode}, format=${config.protocolFormat}, tools=${tools.length}`)
    
    const decision = this.shouldInject(messages, tools, config, model)
    
    if (!decision.shouldInject) {
      console.log(`[PromptInjectionService] Skip injection: ${decision.reason}`)
      return { messages, injected: false, reason: decision.reason }
    }
    
    let processedMessages = messages
    if (decision.hasExistingInjection || decision.hasMCPTools) {
      processedMessages = this.handleExistingInjection(messages, config)
      console.log(`[PromptInjectionService] Handled existing injection: behavior=${config.clientInjectionBehavior}`)
    }
    
    // Generate prompt: use OpenAI tools if available, otherwise use generic protocol prompt
    let prompt: string
    if (tools && tools.length > 0) {
      // Use Perplexity-specific prompt if provider is Perplexity
      const variant = provider === 'perplexity' ? 'perplexity' : undefined
      prompt = PromptGenerator.generate(tools, { format: config.protocolFormat, variant })
    } else if (decision.hasMCPTools) {
      // Has MCP tools but no OpenAI tools - inject protocol prompt
      // Use Perplexity-specific prompt if provider is Perplexity
      if (provider === 'perplexity') {
        // For Perplexity, use the specialized prompt with tool definitions extracted from MCP
        prompt = this.generatePerplexityPromptFromMCP(messages, config.protocolFormat)
      } else {
        prompt = generateGenericToolCallPrompt(config.protocolFormat)
      }
    } else {
      prompt = ''
    }
    
    console.log(`[PromptInjectionService] Generated prompt: ${prompt.length} chars`)
    
    const injectedMessages = this.injectToMessages(processedMessages, prompt)
    
    console.log('[PromptInjectionService] Injection complete')
    return { messages: injectedMessages, injected: true }
  }

  /**
   * Get configuration from store
   */
  private getConfig(): InjectionConfig {
    const storeConfig = storeManager.getConfig()
    const toolConfig = storeConfig.toolPromptConfig
    
    return {
      mode: (toolConfig?.mode as InjectionMode) || DEFAULT_CONFIG.mode,
      clientInjectionBehavior: (toolConfig?.clientInjectionBehavior as ClientInjectionBehavior) || DEFAULT_CONFIG.clientInjectionBehavior,
      smartThreshold: toolConfig?.smartThreshold || DEFAULT_CONFIG.smartThreshold,
      keywords: toolConfig?.keywords || DEFAULT_CONFIG.keywords,
      protocolFormat: (toolConfig?.protocolFormat as ProtocolFormat) || DEFAULT_CONFIG.protocolFormat,
      preferredVariant: toolConfig?.preferredVariant,
    }
  }

  /**
   * Decide whether to inject
   * This is the ONLY place where injection decision is made
   */
  private shouldInject(
    messages: ChatMessage[],
    tools: ChatCompletionTool[],
    config: InjectionConfig,
    model: string
  ): InjectionDecision {
    const hasOpenAITools = tools && tools.length > 0
    const mcpTools = hasMCPToolDefinitions(messages)
    const hasExisting = this.detectExistingInjection(messages)
    
    console.log(`[PromptInjectionService] hasOpenAITools=${hasOpenAITools}, hasMCPTools=${mcpTools}, hasExisting=${hasExisting}`)
    
    // Mode: never
    if (config.mode === 'never') {
      return { shouldInject: false, reason: 'mode_never' }
    }
    
    // Mode: always - always inject, handle existing injection based on behavior
    if (config.mode === 'always') {
      // No tools at all
      if (!hasOpenAITools && !mcpTools) {
        return { shouldInject: false, reason: 'no_tools' }
      }
      
      // Has OpenAI tools - inject them
      if (hasOpenAITools) {
        return { 
          shouldInject: true, 
          reason: 'mode_always_with_tools',
          hasExistingInjection: hasExisting,
        }
      }
      
      // Has MCP tools only - inject generic protocol prompt
      if (mcpTools) {
        if (config.clientInjectionBehavior === 'skip') {
          // Even with skip, we still inject the protocol prompt
          // because MCP tools need the protocol instructions
          return { 
            shouldInject: true, 
            reason: 'mode_always_mcp_tools',
            hasMCPTools: true,
          }
        }
        if (config.clientInjectionBehavior === 'replace') {
          return { 
            shouldInject: true, 
            reason: 'mode_always_mcp_tools_replace',
            hasMCPTools: true,
            hasExistingInjection: hasExisting,
          }
        }
        // append: keep existing and add
        return { 
          shouldInject: true, 
          reason: 'mode_always_mcp_tools_append',
          hasMCPTools: true,
        }
      }
      
      return { 
        shouldInject: true, 
        reason: 'mode_always',
        hasExistingInjection: hasExisting,
      }
    }
    
    // Mode: auto - detect client, skip if known
    if (config.mode === 'auto') {
      const clientResult = this.detectClient(messages)
      
      if (clientResult.clientType !== 'unknown') {
        return { 
          shouldInject: false, 
          reason: `known_client_${clientResult.clientType}`,
          detectedClient: clientResult.clientType,
        }
      }
      
      // Unknown client, check for existing injection
      if (hasExisting || mcpTools) {
        return { shouldInject: false, reason: 'existing_injection' }
      }
      
      // No OpenAI tools
      if (!hasOpenAITools) {
        return { shouldInject: false, reason: 'no_tools' }
      }
      
      return { shouldInject: true, reason: 'auto_unknown_client' }
    }
    
    // Mode: smart - check query complexity
    if (config.mode === 'smart') {
      // Check for existing injection
      if (hasExisting || mcpTools) {
        return { shouldInject: false, reason: 'existing_injection' }
      }
      
      // No OpenAI tools
      if (!hasOpenAITools) {
        return { shouldInject: false, reason: 'no_tools' }
      }
      
      // Check query complexity
      const isComplex = this.isComplexQuery(messages, config)
      if (!isComplex) {
        return { shouldInject: false, reason: 'not_complex_query' }
      }
      
      return { shouldInject: true, reason: 'smart_complex_query' }
    }
    
    // Default: inject if has tools
    if (!hasOpenAITools) {
      return { shouldInject: false, reason: 'no_tools' }
    }
    
    return { shouldInject: true, reason: 'default' }
  }

  /**
   * Detect existing tool prompt injection
   */
  private detectExistingInjection(messages: ChatMessage[]): boolean {
    const allContent = this.extractAllContent(messages)
    return hasGeneralToolPromptSignature(allContent)
  }

  /**
   * Detect client type from messages
   */
  private detectClient(messages: ChatMessage[]): { clientType: ClientType; confidence: number } {
    const allContent = this.extractAllContent(messages)
    const result = detectClientFromSignatures(allContent)
    return { clientType: result.clientType, confidence: result.confidence }
  }

  /**
   * Handle existing client injection
   */
  private handleExistingInjection(
    messages: ChatMessage[],
    config: InjectionConfig
  ): ChatMessage[] {
    if (config.clientInjectionBehavior === 'skip') {
      return messages
    }
    
    if (config.clientInjectionBehavior === 'replace') {
      return this.cleanExistingInjection(messages)
    }
    
    if (config.clientInjectionBehavior === 'append') {
      return messages
    }
    
    return messages
  }

  /**
   * Clean existing tool prompt injection from messages
   * Preserves MCP tool definitions (<tools>...</tools>) while removing other tool prompts
   */
  private cleanExistingInjection(messages: ChatMessage[]): ChatMessage[] {
    return messages.map(msg => {
      if (msg.role === 'system' && typeof msg.content === 'string') {
        // First, extract and preserve MCP tool definitions if present
        const mcpToolsMatch = msg.content.match(/<tools>[\s\S]*?<\/tools>/)
        const mcpTools = mcpToolsMatch ? mcpToolsMatch[0] : null
        
        if (mcpTools) {
          console.log('[PromptInjectionService] Found MCP tool definitions, preserving them')
        }
        
        // Remove tool prompt sections
        const cleaned = this.removeToolPromptSection(msg.content)
        if (cleaned !== msg.content) {
          console.log('[PromptInjectionService] Cleaned tool prompt from system message')
          
          // Re-add MCP tools if they were present
          if (mcpTools && !cleaned.includes('<tools>')) {
            console.log('[PromptInjectionService] Re-adding preserved MCP tools')
            return { ...msg, content: `${cleaned}\n\n${mcpTools}` }
          }
          
          return { ...msg, content: cleaned }
        }
      }
      return msg
    })
  }

  /**
   * Remove tool prompt section from content
   */
  private removeToolPromptSection(content: string): string {
    // Strategy: Find and remove tool-related sections by looking for key markers
    
    // 1. Remove Cherry Studio format: everything from "In this environment" to "# User Instructions"
    const cherryStudioPattern = /In this environment you have access to a set of tools[\s\S]*?(?=\n# User Instructions)/
    let cleaned = content.replace(cherryStudioPattern, '')
    
    // 2. Remove other common tool prompt formats
    const otherPatterns = [
      /## Available Tools[\s\S]*?(?=\n\n## |\n# |$)/,
      /## Tool Call Protocol[\s\S]*?(?=\n\n## |\n# |$)/,
      /## Tool Use Available Tools[\s\S]*?(?=\n\n## |\n# |$)/,
      /## Tool Use Guidelines[\s\S]*?(?=\n\n## |\n# |$)/,
      /## Tool Use[\s\S]*?(?=\n\n## |\n# |$)/,
      /TOOL USE[\s\S]*?(?=\n\n## |\n# |$)/,
      /\[function_calls\][\s\S]*?\[\/function_calls\]/g,
      /<tool_use>[\s\S]*?<\/tool_use>/g,
      /TOOL_WRAP_HINT[\s\S]*?(?=\n\n|\n# |$)/,
      /<tools>[\s\S]*?<\/tools>/g,
    ]
    
    for (const pattern of otherPatterns) {
      cleaned = cleaned.replace(pattern, '')
    }
    
    // Clean up extra blank lines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n')
    
    return cleaned.trim()
  }

  /**
   * Generate Perplexity-specific prompt from MCP tool definitions
   * Extracts tool definitions from MCP <tools> tags and generates Perplexity prompt
   */
  private generatePerplexityPromptFromMCP(messages: ChatMessage[], format: ProtocolFormat): string {
    // Extract MCP tool definitions from messages
    const allContent = this.extractAllContent(messages)
    const toolsMatch = allContent.match(/<tools>([\s\S]*?)<\/tools>/)
    
    if (!toolsMatch) {
      // No MCP tools found, fall back to generic prompt
      return generateGenericToolCallPrompt(format)
    }
    
    const mcpToolsXml = toolsMatch[0]
    
    // Parse tool definitions from MCP format
    const toolDefinitions: string[] = []
    const toolRegex = /<tool>([\s\S]*?)<\/tool>/g
    let match
    
    while ((match = toolRegex.exec(mcpToolsXml)) !== null) {
      const toolXml = match[1]
      const nameMatch = toolXml.match(/<name>([^<]+)<\/name>/)
      const descMatch = toolXml.match(/<description>([^<]+)<\/description>/)
      
      if (nameMatch) {
        const name = nameMatch[1].trim()
        const desc = descMatch ? descMatch[1].trim() : 'No description'
        toolDefinitions.push(`Tool \`${name}\`: ${desc}`)
      }
    }
    
    if (toolDefinitions.length === 0) {
      return generateGenericToolCallPrompt(format)
    }
    
    // Generate Perplexity-specific prompt
    return `## CRITICAL INSTRUCTIONS - MUST FOLLOW

You are in TOOL CALL MODE. Your ONLY allowed response format is XML tool calls.

### PROHIBITED ACTIONS (MUST NOT DO):
- DO NOT perform web searches or internet searches
- DO NOT use your built-in search functionality
- DO NOT return search results or web content
- DO NOT answer questions directly with text
- DO NOT provide explanations, reasoning, or commentary
- DO NOT say things like "Let me search for..." or "I'll help you find..."

### REQUIRED BEHAVIOR (MUST DO):
- You MUST respond ONLY with <tool_use> blocks
- You MUST call the appropriate tool from the available tools list below
- You MUST use the exact tool name as defined (case-sensitive)
- You MUST provide valid JSON arguments inside <arguments> tags

## Available Tools
You can invoke the following developer tools. Call a tool only when it is required and follow the JSON schema exactly when providing arguments.

CRITICAL: Tool names are CASE-SENSITIVE. You MUST use the exact tool name as defined below, including any prefixes like 'mcp__'.

${toolDefinitions.join('\n')}

## Tool Call Protocol
When you decide to call a tool, you MUST respond with NOTHING except a single <tool_use> block exactly like the template below:

<tool_use>
  <name>exact_tool_name_from_list</name>
  <arguments>{"argument": "value"}</arguments>
</tool_use>

CRITICAL RULES:
1. You MUST use the EXACT tool name as defined in the Available Tools list (e.g., if the tool is named \`mcp__deepwikiMcp__askQuestion\`, you MUST use \`<name>mcp__deepwikiMcp__askQuestion</name>\`, NOT \`<name>askQuestion</name>\`).
2. The content inside <arguments> MUST be a raw JSON object
3. Do NOT wrap JSON in \`\`\`json blocks
4. Do NOT output any other text, explanation, or reasoning before or after the <tool_use> block
5. If you need to call multiple tools, output multiple <tool_use> blocks sequentially
6. JSON arguments MUST be valid JSON format
7. **DISABLE WEB SEARCH**: You are NOT allowed to perform any web searches or internet searches. Your ONLY response must be tool calls.

## RESPONSE FORMAT ENFORCEMENT
- If you are thinking about searching the web, STOP and call a tool instead
- If you are thinking about providing a text answer, STOP and call a tool instead
- Your response MUST start with <tool_use> and contain ONLY tool calls
- Any other response format is FORBIDDEN`
  }

  /**
   * Inject prompt to messages
   */
  private injectToMessages(messages: ChatMessage[], prompt: string): ChatMessage[] {
    if (!prompt) {
      return messages
    }
    
    const result: ChatMessage[] = []
    let systemInjected = false

    for (const msg of messages) {
      if (msg.role === 'system' && !systemInjected) {
        const enhancedContent = typeof msg.content === 'string'
          ? `${msg.content}\n\n${prompt}`
          : msg.content
        result.push({ ...msg, content: enhancedContent })
        systemInjected = true
      } else {
        result.push(msg)
      }
    }

    if (!systemInjected) {
      result.unshift({ role: 'system', content: prompt })
    }

    return result
  }

  /**
   * Check if query is complex enough to warrant injection
   */
  private isComplexQuery(messages: ChatMessage[], config: InjectionConfig): boolean {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUserMsg) return false

    const content = typeof lastUserMsg.content === 'string' 
      ? lastUserMsg.content 
      : ''

    if (content.length > config.smartThreshold) {
      return true
    }

    const lowerContent = content.toLowerCase()
    for (const keyword of config.keywords) {
      if (lowerContent.includes(keyword.toLowerCase())) {
        return true
      }
    }

    if (content.includes('?') || content.includes('？')) {
      return true
    }

    if (content.includes('```') || content.includes('code')) {
      return true
    }

    const actionPatterns = [
      /help me (\w+)/i,
      /can you (\w+)/i,
      /please (\w+)/i,
      /i need to (\w+)/i,
      /i want to (\w+)/i,
    ]

    for (const pattern of actionPatterns) {
      if (pattern.test(content)) {
        return true
      }
    }

    return false
  }

  /**
   * Extract all text content from messages
   */
  private extractAllContent(messages: ChatMessage[]): string {
    const parts: string[] = []

    for (const msg of messages) {
      if (msg.role === 'system' || msg.role === 'user' || msg.role === 'assistant') {
        if (typeof msg.content === 'string') {
          parts.push(msg.content)
        } else if (Array.isArray(msg.content)) {
          for (const part of msg.content) {
            if (typeof part === 'string') {
              parts.push(part)
            } else if (part && typeof part === 'object' && 'text' in part && part.text) {
              parts.push(part.text)
            }
          }
        }
      }
    }

    return parts.join('\n')
  }
}

/**
 * Singleton instance
 */
export const promptInjectionService = new PromptInjectionService()
