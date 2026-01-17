import * as React from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

export interface LoadingButtonProps extends ButtonProps {
    isLoading?: boolean
    loadingText?: string
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
    ({ children, isLoading, loadingText, disabled, ...props }, ref) => {
        return (
            <Button
                ref={ref}
                disabled={isLoading || disabled}
                {...props}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? (loadingText || 'Sparar...') : children}
            </Button>
        )
    }
)

LoadingButton.displayName = 'LoadingButton'

export { LoadingButton }
