"use client"

import type { ReactNode } from "react"
import { useState } from "react"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

type SortableListProps<T extends { id: string }> = {
  items: T[]
  onReorder: (items: T[]) => void
  renderItem: (item: T, index: number) => ReactNode
  className?: string
  itemClassName?: string
}

export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
  itemClassName,
}: SortableListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }
    const next = [...items]
    const [moved] = next.splice(dragIndex, 1)
    if (!moved) return
    next.splice(targetIndex, 0, moved)
    onReorder(next)
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item, index) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(event) => {
            event.preventDefault()
            setOverIndex(index)
          }}
          onDrop={() => handleDrop(index)}
          onDragEnd={() => {
            setDragIndex(null)
            setOverIndex(null)
          }}
          className={cn(
            "flex items-start gap-2 rounded-2xl border border-border bg-card p-3 transition-colors md:p-4",
            dragIndex === index && "opacity-60",
            overIndex === index && dragIndex !== index && "border-primary bg-primary/5",
            itemClassName
          )}
        >
          <button
            type="button"
            className="mt-1 cursor-grab touch-manipulation rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
            aria-label="Réorganiser"
            tabIndex={0}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">{renderItem(item, index)}</div>
        </li>
      ))}
    </ul>
  )
}
