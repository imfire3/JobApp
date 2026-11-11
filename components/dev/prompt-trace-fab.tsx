"use client"

import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Code, X, RefreshCw, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PromptTraceEntry } from "@/lib/ai/prompt-trace"

export function PromptTraceFab() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [traces, setTraces] = useState<PromptTraceEntry[]>([])
  const [selected, setSelected] = useState<PromptTraceEntry | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchTraces = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/debug/prompts")
      const data = await res.json()
      setTraces(data.traces || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const clearTraces = async () => {
    try {
      await fetch("/api/debug/prompts", { method: "DELETE" })
      setTraces([])
      setSelected(null)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (open) {
      fetchTraces()
    }
  }, [open])

  if (pathname === "/") return null

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString("fr-FR")
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg"
        title="Voir les prompts appelés"
      >
        <Code className="h-5 w-5" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
          <SheetHeader className="flex flex-row items-center justify-between space-y-0">
            <SheetTitle>Prompts appelés</SheetTitle>
            <div className="flex gap-2">
              <Button size="icon" variant="ghost" onClick={fetchTraces} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
              <Button size="icon" variant="ghost" onClick={clearTraces}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 flex overflow-hidden">
            {!selected ? (
              <div className="flex-1 overflow-auto">
                <div className="space-y-2 p-1">
                  {traces.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun prompt appelé pour l'instant
                    </p>
                  )}
                  {traces.map((trace) => (
                    <button
                      key={trace.id}
                      onClick={() => setSelected(trace)}
                      className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{trace.feature}</span>
                        <span className="text-xs text-muted-foreground">{formatTime(trace.timestamp)}</span>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground mb-1">
                        {trace.promptVersion && <span>v{trace.promptVersion}</span>}
                        {trace.model && <span>{trace.model}</span>}
                        {trace.route && <span className="truncate max-w-[150px]">{trace.route}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {trace.systemPreview || trace.userPreview}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between pb-2 border-b mb-2">
                  <div>
                    <div className="font-medium">{selected.feature}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTime(selected.timestamp)} • {selected.promptVersion} • {selected.model}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => setSelected(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex-1 overflow-auto">
                  <div className="space-y-4 pr-4">
                    {selected.systemPrompt && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">System Prompt</h4>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                          {selected.systemPrompt}
                        </pre>
                      </div>
                    )}
                    {selected.userPrompt && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">User Prompt</h4>
                        <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                          {selected.userPrompt}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
