import { Badge } from "@/components/ui/badge"
import { priorityConfig, TaskPriority } from "@/lib/types"

interface PriorityBadgeProps {
    priority: TaskPriority;
    showLabel?: boolean;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
}

export function PriorityBadge({ priority, showLabel = false, className, onClick }: PriorityBadgeProps) {
    if (!priority) return null;

    const config = priorityConfig[priority];

    return (
        <Badge
            variant="outline"
            className={`${config.color} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${className || ''}`}
            onClick={onClick}
        >
            <span className="mr-1">{config.icon}</span>
            {showLabel ? config.label : config.shortLabel}
        </Badge>
    );
}
