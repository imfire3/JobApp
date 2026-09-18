"use client"

import type { ReactNode } from "react"
import { useRef, useState } from "react"
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
  const [armedIndex, setArmedIndex] = useState<number | null>(null)
  const armedIndexRef = useRef<number | null>(null)
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map())

  const armHandle = (index: number, itemId: string) => {
    armedIndexRef.current = index
    setArmedIndex(index)
    const li = itemRefs.current.get(itemId)
    // Sync DOM so HTML5 drag can start on the same mousedown gesture
    if (li) li.setAttribute("draggable", "true")
  }

  const disarmAll = () => {
    armedIndexRef.current = null
    setArmedIndex(null)
    itemRefs.current.forEach((li) => li.setAttribute("draggable", "false"))
  }

  const handleDrop = (targetIndex: number) => {
    const from = dragIndex
    if (from === null || from === targetIndex) {
      setDragIndex(null)
      setOverIndex(null)
      disarmAll()
      return
    }
    const next = [...items]
    const [moved] = next.splice(from, 1)
    if (!moved) return
    next.splice(targetIndex, 0, moved)
    onReorder(next)
    setDragIndex(null)
    setOverIndex(null)
    disarmAll()
  }

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item, index) => (
        <li
          key={item.id}
          ref={(node) => {
            if (node) itemRefs.current.set(item.id, node)
            else itemRefs.current.delete(item.id)
          }}
          draggable={false}
          onDragStart={(event) => {
            if (armedIndexRef.current !== index) {
              event.preventDefault()
              return
            }
            setDragIndex(index)
            event.dataTransfer.effectAllowed = "move"
            event.dataTransfer.setData("text/plain", item.id)
          }}
          onDragOver={(event) => {
            event.preventDefault()
            setOverIndex(index)
          }}
          onDrop={(event) => {
            event.preventDefault()
            handleDrop(index)
          }}
          onDragEnd={() => {
            setDragIndex(null)
            setOverIndex(null)
            disarmAll()
          }}
          className={cn(
            "group relative flex items-start gap-2 rounded-[18px] border border-transparent p-0 transition-colors",
            dragIndex === index && "opacity-60",
            overIndex === index &&
              dragIndex !== null &&
              dragIndex !== index &&
              "border-[#00D492]",
            itemClassName
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-2">
              <div
                role="button"
                className={cn(
                  "mt-2 shrink-0 touch-manipulation rounded-md p-1 text-[#A1A1A1] transition-opacity",
                  "cursor-grab active:cursor-grabbing",
                  "opacity-40 hover:bg-[rgba(255,255,255,0.08)] hover:text-[#FAFAFA] hover:opacity-100",
                  "md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
                  armedIndex === index && "opacity-100 bg-[rgba(255,255,255,0.08)] text-[#FAFAFA]"
                )}
                aria-label="Glisser pour réorganiser"
                title="Glisser pour réorganiser"
                tabIndex={0}
                onMouseDown={() => armHandle(index, item.id)}
                onTouchStart={() => armHandle(index, item.id)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowUp" && index > 0) {
                    event.preventDefault()
                    const next = [...items]
                    const [moved] = next.splice(index, 1)
                    if (!moved) return
                    next.splice(index - 1, 0, moved)
                    onReorder(next)
                  }
                  if (event.key === "ArrowDown" && index < items.length - 1) {
                    event.preventDefault()
                    const next = [...items]
                    const [moved] = next.splice(index, 1)
                    if (!moved) return
                    next.splice(index + 1, 0, moved)
                    onReorder(next)
                  }
                }}
              >
                <GripVertical className="h-4 w-4" aria-hidden />
              </div>
              {renderItem(item, index)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
