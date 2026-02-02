"use client"

import ReactMarkdown from 'react-markdown'
import { Loader2, FileText, Edit3, Save, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface NewsletterPreviewProps {
    content: string
    isGenerating: boolean
    onSave?: (content: string) => void
}

export default function NewsletterPreview({ content, isGenerating, onSave }: NewsletterPreviewProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [editedContent, setEditedContent] = useState(content)
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (onSave) {
            setIsSaving(true)
            await onSave(editedContent)
            setIsSaving(false)
            setIsEditing(false)
        }
    }

    const handleCancel = () => {
        setEditedContent(content)
        setIsEditing(false)
    }

    // Update edited content when new content arrives
    if (content !== editedContent && !isEditing) {
        setEditedContent(content)
    }

    if (isGenerating) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
            </div>
        )
    }

    if (!content) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground mb-2">Inget innehåll genererat än</p>
                <p className="text-sm text-muted-foreground">
                    Lägg till punkter till vänster och klicka på "Generera med AI"
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Edit/Save controls */}
            {content && !isGenerating && onSave && (
                <div className="flex justify-end gap-2">
                    {!isEditing ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                        >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Redigera
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCancel}
                                disabled={isSaving}
                            >
                                <X className="h-4 w-4 mr-2" />
                                Avbryt
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                Spara
                            </Button>
                        </>
                    )}
                </div>
            )}

            {/* Content display */}
            {isEditing ? (
                <Textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="min-h-[500px] font-mono text-sm"
                    placeholder="Redigera innehållet här..."
                />
            ) : (
                <div className="prose prose-sm max-w-none prose-headings:font-bold prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3 prose-h2:border-b prose-h2:pb-2 prose-h3:text-lg prose-h3:mt-4 prose-h3:mb-2 prose-p:my-2 prose-ul:my-3 prose-li:my-1">
                    <ReactMarkdown>{content}</ReactMarkdown>
                </div>
            )}
        </div>
    )
}
