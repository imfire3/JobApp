export type PromptTraceEntry = {
  id: string
  timestamp: number
  feature: string
  promptVersion?: string | null
  model?: string | null
  route?: string | null
  systemPrompt?: string | null
  userPrompt?: string | null
  systemPreview?: string
  userPreview?: string
}

const traces: PromptTraceEntry[] = []
const MAX_TRACES = 200

export function logPromptTrace(entry: Omit<PromptTraceEntry, "id" | "timestamp" | "systemPreview" | "userPreview">) {
  if (process.env.NODE_ENV !== "development") return

  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const timestamp = Date.now()
  const systemPreview = entry.systemPrompt ? entry.systemPrompt.slice(0, 200).replace(/\s+/g, " ").trim() : undefined
  const userPreview = entry.userPrompt ? entry.userPrompt.slice(0, 200).replace(/\s+/g, " ").trim() : undefined
  
  const trace: PromptTraceEntry = {
    id,
    timestamp,
    systemPreview,
    userPreview,
    ...entry,
  }
  
  traces.unshift(trace)
  if (traces.length > MAX_TRACES) {
    traces.length = MAX_TRACES
  }
  
  return trace
}

export function getPromptTraces(limit = 50): PromptTraceEntry[] {
  return traces.slice(0, limit)
}

export function clearPromptTraces() {
  traces.length = 0
}
