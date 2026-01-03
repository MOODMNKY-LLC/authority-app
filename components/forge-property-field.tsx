"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { X, Check, ChevronDown } from "lucide-react"
import { format } from "date-fns"

interface NotionProperty {
  id: string
  type: string
  name: string
  options?: Array<{ id?: string; name: string; color?: string }>
  format?: string
}

interface ForgePropertyFieldProps {
  property: NotionProperty
  value: any
  onChange: (value: any) => void
  disabled?: boolean
}

export function ForgePropertyField({ property, value, onChange, disabled }: ForgePropertyFieldProps) {
  const renderField = () => {
    switch (property.type) {
      case "title":
        return (
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${property.name}...`}
            disabled={disabled}
            className="backdrop-blur-xl bg-black/10 border-transparent"
            required
          />
        )

      case "rich_text":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${property.name}...`}
            disabled={disabled}
            className="backdrop-blur-xl bg-black/10 border-transparent min-h-[100px]"
            rows={4}
          />
        )

      case "select":
        return (
          <Select
            value={value || ""}
            onValueChange={onChange}
            disabled={disabled}
          >
            <SelectTrigger className="backdrop-blur-md bg-black/20 border-zinc-800/50">
              <SelectValue placeholder={`Select ${property.name}...`} />
            </SelectTrigger>
            <SelectContent>
              {property.options?.map((option) => (
                <SelectItem key={option.name} value={option.name}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case "multi_select":
        return (
          <MultiSelectField
            options={property.options || []}
            value={value || []}
            onChange={onChange}
            disabled={disabled}
            placeholder={`Select ${property.name}...`}
          />
        )

      case "number":
        return (
          <Input
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder={`Enter ${property.name}...`}
            disabled={disabled}
            className="backdrop-blur-xl bg-black/10 border-transparent"
            step={property.format === "percent" ? "0.01" : "1"}
          />
        )

      case "date":
        return (
          <Input
            type="date"
            value={value?.start ? format(new Date(value.start), "yyyy-MM-dd") : ""}
            onChange={(e) => onChange(e.target.value ? { start: e.target.value } : null)}
            disabled={disabled}
            className="backdrop-blur-xl bg-black/10 border-transparent"
          />
        )

      case "checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`property-${property.id}`}
              checked={value || false}
              onCheckedChange={onChange}
              disabled={disabled}
            />
            <Label
              htmlFor={`property-${property.id}`}
              className="text-sm font-normal cursor-pointer"
            >
              {value ? "Yes" : "No"}
            </Label>
          </div>
        )

      case "url":
        return (
          <Input
            type="url"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter URL...`}
            disabled={disabled}
            className="backdrop-blur-xl bg-black/10 border-transparent"
          />
        )

      case "email":
        return (
          <Input
            type="email"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter email...`}
            disabled={disabled}
            className="backdrop-blur-xl bg-black/10 border-transparent"
          />
        )

      case "phone_number":
        return (
          <Input
            type="tel"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter phone number...`}
            disabled={disabled}
            className="backdrop-blur-xl bg-black/10 border-transparent"
          />
        )

      default:
        return (
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Enter ${property.name}...`}
            disabled={disabled}
            className="backdrop-blur-xl bg-black/10 border-transparent"
          />
        )
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`property-${property.id}`} className="text-sm font-medium">
        {property.name}
        {property.type === "title" && <span className="text-red-400 ml-1">*</span>}
      </Label>
      {renderField()}
    </div>
  )
}

interface MultiSelectFieldProps {
  options: Array<{ id?: string; name: string; color?: string }>
  value: string[]
  onChange: (value: string[]) => void
  disabled?: boolean
  placeholder?: string
}

function MultiSelectField({ options, value = [], onChange, disabled, placeholder }: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false)

  const toggleOption = (optionName: string) => {
    if (disabled) return
    const newValue = value.includes(optionName)
      ? value.filter((v) => v !== optionName)
      : [...value, optionName]
    onChange(newValue)
  }

  const removeOption = (optionName: string) => {
    if (disabled) return
    onChange(value.filter((v) => v !== optionName))
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between backdrop-blur-md bg-black/20 border-zinc-800/50"
            disabled={disabled}
          >
            {value.length > 0 ? `${value.length} selected` : placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search options..." />
            <CommandList>
              <CommandEmpty>No option found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.name}
                    value={option.name}
                    onSelect={() => toggleOption(option.name)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(option.name) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((selected) => (
            <Badge
              key={selected}
              variant="secondary"
              className="backdrop-blur-md bg-black/20 border-zinc-800/50"
            >
              {selected}
              <button
                type="button"
                onClick={() => removeOption(selected)}
                disabled={disabled}
                className="ml-2 hover:text-red-400"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

