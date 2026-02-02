"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

interface ImportBulletsDialogProps {
    open: boolean
    bullets: string[]
    onImport: (selectedBullets: string[]) => void
    onSkip: () => void
    isCreating?: boolean
}

export default function ImportBulletsDialog({
    open,
    bullets,
    onImport,
    onSkip,
    isCreating = false
}: ImportBulletsDialogProps) {
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set(bullets.map((_, i) => i)))

    const toggleBullet = (index: number) => {
        const newSelected = new Set(selectedIndices)
        if (newSelected.has(index)) {
            newSelected.delete(index)
        } else {
            newSelected.add(index)
        }
        setSelectedIndices(newSelected)
    }

    const selectAll = () => {
        setSelectedIndices(new Set(bullets.map((_, i) => i)))
    }

    const deselectAll = () => {
        setSelectedIndices(new Set())
    }

    const handleImport = () => {
        const selected = bullets.filter((_, i) => selectedIndices.has(i))
        onImport(selected)
    }

    return (
        <Dialog open={open} onOpenChange={(open) => !open && !isCreating && onSkip()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Importera punkter från förra veckan?</DialogTitle>
                    <DialogDescription>
                        Välj vilka punkter från förra veckans veckobrev du vill återanvända.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={selectAll}
                            disabled={isCreating}
                        >
                            Välj alla
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={deselectAll}
                            disabled={isCreating}
                        >
                            Avmarkera alla
                        </Button>
                        <div className="ml-auto text-sm text-muted-foreground">
                            {selectedIndices.size} av {bullets.length} valda
                        </div>
                    </div>

                    <div className="h-[300px] rounded-md border p-4 overflow-y-auto">
                        <div className="space-y-3">
                            {bullets.map((bullet, index) => (
                                <div key={index} className="flex items-start space-x-3">
                                    <Checkbox
                                        id={`bullet-${index}`}
                                        checked={selectedIndices.has(index)}
                                        onCheckedChange={() => toggleBullet(index)}
                                        disabled={isCreating}
                                    />
                                    <label
                                        htmlFor={`bullet-${index}`}
                                        className="text-sm leading-relaxed cursor-pointer flex-1"
                                    >
                                        {bullet}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onSkip}
                        disabled={isCreating}
                    >
                        Skapa utan punkter
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={isCreating || selectedIndices.size === 0}
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Skapar...
                            </>
                        ) : (
                            `Skapa med ${selectedIndices.size} ${selectedIndices.size === 1 ? 'punkt' : 'punkter'}`
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
