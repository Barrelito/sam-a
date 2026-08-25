"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, Check } from "lucide-react"

interface SelectProps {
    value?: string
    onValueChange?: (value: string) => void
    children: React.ReactNode
}

interface SelectContextType {
    value?: string
    onValueChange?: (value: string) => void
    open: boolean
    setOpen: (open: boolean) => void
    labels: Map<string, React.ReactNode>
}

const SelectContext = React.createContext<SelectContextType | null>(null)

function useSelectContext() {
    const context = React.useContext(SelectContext)
    if (!context) {
        throw new Error("Select components must be used within a Select")
    }
    return context
}

/**
 * Plockar ut etiketten för varje SelectItem ur elementträdet så att triggern kan
 * visa etiketten i stället för det råa värdet (stationens namn i stället för
 * dess UUID). Alternativen renderas bara när listan är öppen, men själva
 * elementen finns i children hela tiden - därför läses de härifrån.
 */
function collectItemLabels(
    children: React.ReactNode,
    labels: Map<string, React.ReactNode> = new Map()
): Map<string, React.ReactNode> {
    React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) return

        const props = child.props as { value?: unknown; children?: React.ReactNode }

        if (child.type === SelectItem && typeof props.value === "string") {
            labels.set(props.value, props.children)
        }

        if (props.children) collectItemLabels(props.children, labels)
    })

    return labels
}

const Select = ({ value, onValueChange, children }: SelectProps) => {
    const [open, setOpen] = React.useState(false)
    const labels = React.useMemo(() => collectItemLabels(children), [children])

    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen, labels }}>
            <div className="relative">
                {children}
            </div>
        </SelectContext.Provider>
    )
}

interface SelectTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode
    className?: string
}

const SelectTrigger = React.forwardRef<HTMLButtonElement, SelectTriggerProps>(
    ({ children, className, ...props }, ref) => {
        const { open, setOpen } = useSelectContext()

        return (
            <button
                ref={ref}
                type="button"
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                {...props}
            >
                {children}
                <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
            </button>
        )
    }
)
SelectTrigger.displayName = "SelectTrigger"

interface SelectValueProps {
    placeholder?: string
}

const SelectValue = ({ placeholder }: SelectValueProps) => {
    const { value, labels } = useSelectContext()

    const label = value ? labels.get(value) : undefined

    // Saknas matchande alternativ (t.ex. medan listan fortfarande laddas) visas
    // platshållaren - ett rått id ska aldrig läcka ut i gränssnittet.
    const showPlaceholder = label === undefined && placeholder !== undefined

    return (
        <span
            className={cn(
                "min-w-0 flex-1 truncate text-left",
                showPlaceholder && "text-muted-foreground"
            )}
        >
            {showPlaceholder ? placeholder : label ?? value}
        </span>
    )
}

interface SelectContentProps {
    children: React.ReactNode
    className?: string
}

const SelectContent = ({ children, className }: SelectContentProps) => {
    const { open, setOpen } = useSelectContext()
    const ref = React.useRef<HTMLDivElement>(null)

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }

        if (open) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [open, setOpen])

    if (!open) return null

    return (
        <div
            ref={ref}
            className={cn(
                "absolute top-full left-0 z-50 mt-1 w-full min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
                className
            )}
        >
            <div className="p-1 max-h-[200px] overflow-y-auto">
                {children}
            </div>
        </div>
    )
}

interface SelectItemProps {
    value: string
    children: React.ReactNode
    className?: string
}

const SelectItem = ({ value, children, className }: SelectItemProps) => {
    const { value: selectedValue, onValueChange, setOpen } = useSelectContext()
    const isSelected = value === selectedValue

    return (
        <div
            onClick={() => {
                onValueChange?.(value)
                setOpen(false)
            }}
            className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                isSelected && "bg-accent",
                className
            )}
        >
            {isSelected && (
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                </span>
            )}
            {children}
        </div>
    )
}

interface SelectGroupProps {
    children: React.ReactNode
    className?: string
}

const SelectGroup = ({ children, className }: SelectGroupProps) => {
    return (
        <div className={cn("py-1", className)}>
            {children}
        </div>
    )
}

interface SelectLabelProps {
    children: React.ReactNode
    className?: string
}

const SelectLabel = ({ children, className }: SelectLabelProps) => {
    return (
        <div className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)}>
            {children}
        </div>
    )
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, SelectGroup, SelectLabel }

