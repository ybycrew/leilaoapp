"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AccordionItemProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className="border-b border-border">
      <button
        className="flex w-full items-center justify-between py-4 text-left font-semibold transition-colors hover:text-primary"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && (
        <div className="pb-4 text-muted-foreground leading-relaxed">
          {children}
        </div>
      )}
    </div>
  )
}

export function Accordion({ children }: { children: React.ReactNode }) {
  return <div className="space-y-0">{children}</div>
}

