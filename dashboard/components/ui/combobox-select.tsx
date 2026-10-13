"use client"

import * as React from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { cn } from "cn"

export interface ComboboxOption {
  value: string | number
  label: string
  disabled?: boolean
  badge?: string
  badgeVariant?: "default" | "secondary" | "destructive" | "outline" | "success"
}

export interface ComboboxSelectProps {
  value: string | number | null | undefined
  onValueChange: (value: string) => void
  options: ComboboxOption[]
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  className?: string
  contentClassName?: string
  size?: "sm" | "default" | "lg"
}

export function ComboboxSelect({
  value,
  onValueChange,
  options,
  placeholder = "اختر...",
  emptyText = "لا توجد نتائج مطابقة",
  disabled = false,
  className,
  contentClassName,
}: ComboboxSelectProps) {
  const selectedOption = React.useMemo(() => {
    if (value === null || value === undefined || value === "") return null
    return options.find((opt) => String(opt.value) === String(value)) ?? null
  }, [options, value])

  return (
    <Combobox<ComboboxOption | null>
      items={options}
      value={selectedOption}
      onValueChange={(option) => {
        if (!option) {
          onValueChange("")
        } else {
          onValueChange(String(option.value))
        }
      }}
      itemToStringLabel={(opt) => (opt ? opt.label : "")}
      itemToStringValue={(opt) => (opt ? String(opt.value) : "")}
      isItemEqualToValue={(a, b) => (a && b ? String(a.value) === String(b.value) : a === b)}
      autoHighlight
      openOnInputClick
    >
      <ComboboxInput
        placeholder={placeholder}
        disabled={disabled}
        className={cn("w-full min-w-36 text-xs sm:text-sm font-medium", className)}
      />
      <ComboboxContent className={cn("z-50 min-w-[max(var(--anchor-width),16rem)] max-w-[min(92vw,36rem)] shadow-lg border border-border/80", contentClassName)}>
        <ComboboxEmpty className="py-3 text-xs text-muted-foreground text-center">
          {emptyText}
        </ComboboxEmpty>
        <ComboboxList>
          {(option) => (
            <ComboboxItem
              key={option.value}
              value={option}
              disabled={option.disabled}
              className={cn(
                "flex items-center justify-between gap-3 cursor-pointer font-medium text-xs sm:text-sm py-2 px-3 hover:bg-accent data-highlighted:bg-accent transition-colors",
                option.disabled && "opacity-50 cursor-not-allowed text-muted-foreground"
              )}
            >
              <span className="whitespace-normal leading-snug">{option.label}</span>
              {option.badge && (
                <span
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-sm font-semibold border shrink-0",
                    option.badgeVariant === "destructive"
                      ? "bg-destructive/15 text-destructive border-destructive/20"
                      : option.badgeVariant === "success"
                      ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border/50"
                  )}
                >
                  {option.badge}
                </span>
              )}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
