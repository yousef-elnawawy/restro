"use client"

import * as React from "react"
import { format } from "date-fns"
import { arEG } from "date-fns/locale/ar-EG"
import { CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  value?: string | Date | null
  onChange?: (date: string) => void
  onValueChange?: (date: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  clearable?: boolean
  required?: boolean
  id?: string
  name?: string
  align?: "center" | "start" | "end"
  size?: "default" | "sm" | "xs" | "lg"
  displayFormat?: "iso" | "short" | "full" | string
}

function parseDateValue(val: string | Date | null | undefined): Date | undefined {
  if (!val) return undefined
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? undefined : val
  }
  if (typeof val === "string") {
    const trimmed = val.trim()
    if (!trimmed) return undefined
    // Match YYYY-MM-DD
    const parts = trimmed.split("-").map(Number)
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      // Use midday (12:00) to avoid any timezone boundary shifts
      return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
    }
    const d = new Date(trimmed)
    return isNaN(d.getTime()) ? undefined : d
  }
  return undefined
}

function formatDateToIso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function DatePicker({
  value,
  onChange,
  onValueChange,
  placeholder = "اختر تاريخ...",
  className,
  disabled = false,
  clearable = true,
  required = false,
  id,
  name,
  align = "start",
  size = "default",
  displayFormat = "iso",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedDate = React.useMemo(() => parseDateValue(value), [value])

  const triggerChange = React.useCallback(
    (newIsoString: string) => {
      if (onValueChange) {
        onValueChange(newIsoString)
      }
      if (onChange) {
        onChange(newIsoString)
      }
    },
    [onChange, onValueChange]
  )

  const handleSelect = (date: Date | undefined) => {
    if (!date) {
      triggerChange("")
    } else {
      triggerChange(formatDateToIso(date))
    }
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    triggerChange("")
  }

  const displayText = React.useMemo(() => {
    if (!selectedDate) return ""
    if (displayFormat === "iso") {
      return formatDateToIso(selectedDate)
    }
    if (displayFormat === "full") {
      try {
        return format(selectedDate, "PPP", { locale: arEG })
      } catch {
        return formatDateToIso(selectedDate)
      }
    }
    if (displayFormat === "short") {
      try {
        return format(selectedDate, "d MMM yyyy", { locale: arEG })
      } catch {
        return formatDateToIso(selectedDate)
      }
    }
    try {
      return format(selectedDate, displayFormat, { locale: arEG })
    } catch {
      return formatDateToIso(selectedDate)
    }
  }, [selectedDate, displayFormat])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            size={size}
            disabled={disabled}
            className={cn(
              "group/date-picker w-full justify-between gap-2 px-3 text-start font-normal transition-all",
              "border-border/80 bg-background/50 hover:bg-muted/50 hover:border-border",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20",
              !selectedDate && "text-muted-foreground",
              className
            )}
          />
        }
      >
        <span className="flex items-center gap-2 truncate">
          <CalendarIcon className="size-3.5 shrink-0 opacity-60 text-muted-foreground group-hover/date-picker:opacity-100 transition-opacity" />
          <span className="truncate">{displayText || placeholder}</span>
        </span>

        {clearable && selectedDate && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            onClick={handleClear}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleClear(e as unknown as React.MouseEvent)
              }
            }}
            className="size-4 shrink-0 rounded-full flex items-center justify-center opacity-50 hover:opacity-100 hover:bg-muted-foreground/20 transition-all cursor-pointer"
            title="مسح التاريخ"
          >
            <X className="size-3" />
          </span>
        ) : null}

        {/* Hidden input for form submissions if required/name is used */}
        {name && (
          <input
            type="hidden"
            name={name}
            value={selectedDate ? formatDateToIso(selectedDate) : ""}
            required={required}
          />
        )}
      </PopoverTrigger>

      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-auto p-2 bg-popover/95 backdrop-blur-md border border-border/80 shadow-lg rounded-xl z-50"
      >
        <Calendar
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate || new Date()}
          onSelect={handleSelect}
          locale={arEG}
        />
        {selectedDate && (
          <div className="flex items-center justify-between border-t border-border/60 pt-2 mt-1 px-1 text-xs">
            <span className="text-muted-foreground text-[11px]">
              {format(selectedDate, "EEEE، d MMMM yyyy", { locale: arEG })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => handleSelect(undefined)}
              className="text-[11px] h-6 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              مسح
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
