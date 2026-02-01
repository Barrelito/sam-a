import { Badge } from "@/components/ui/badge"
import { priorityConfig, TaskPriority } from "@/lib/types"

interface PriorityBadgeProps {
    priority: TaskPriority;
    showLabel?: boolean;
    className?: string;
}

export function PriorityBadge({ priority, showLabel = false, className }: PriorityBadgeProps) {
    if (!priority) return null;

    const config = priorityConfig[priority];

    return (
        <Badge
            variant="outline"
            className={`${config.color} ${className || ''}`}
        >
            <span className="mr-1">{config.icon}</span>
            {showLabel ? config.label : config.shortLabel}
        </Badge>
    );
}
