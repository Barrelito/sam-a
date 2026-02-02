"use client"

import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'

interface BulletEditorProps {
    bullets: string[]
    onChange: (bullets: string[]) => void
}

export default function BulletEditor({ bullets, onChange }: BulletEditorProps) {
    const handleBulletChange = (index: number, value: string) => {
        const newBullets = [...bullets]
        newBullets[index] = value
        onChange(newBullets)
    }

    const handleAddBullet = () => {
        onChange([...bullets, ''])
    }

    const handleRemoveBullet = (index: number) => {
        const newBullets = bullets.filter((_, i) => i !== index)
        onChange(newBullets)
    }

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault()
            handleAddBullet()
        }
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Punkter att inkludera</label>
                <span className="text-xs text-muted-foreground">
                    {bullets.filter(b => b.trim()).length} punkter
                </span>
            </div>

            {bullets.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <p className="text-muted-foreground mb-4">Inga punkter än</p>
                    <Button onClick={handleAddBullet} variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Lägg till första punkten
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {bullets.map((bullet, index) => (
                        <div key={index} className="flex gap-2 items-start">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary mt-2">
                                {index + 1}
                            </div>
                            <Textarea
                                value={bullet}
                                onChange={(e) => handleBulletChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, index)}
                                placeholder="Skriv din punkt här..."
                                className="flex-1 min-h-[60px] resize-none"
                                rows={2}
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveBullet(index)}
                                className="flex-shrink-0 mt-2"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {bullets.length > 0 && (
                <Button onClick={handleAddBullet} variant="outline" size="sm" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Lägg till punkt (Ctrl+Enter)
                </Button>
            )}

            <p className="text-xs text-muted-foreground">
                Skriv kort eller långt - AI:n omvandlar dina punkter till ett välformulerat brev
            </p>
        </div>
    )
}
