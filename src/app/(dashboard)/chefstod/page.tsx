"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare, Send, Sparkles, FileText, Users, Calendar } from "lucide-react"

const suggestedPrompts = [
    {
        icon: FileText,
        title: "APT-mötesagenda",
        prompt: "Skriv en agenda för APT-mötet baserat på aktuella OSA-resultat"
    },
    {
        icon: Users,
        title: "Medarbetarsamtal",
        prompt: "Ge mig en mall för utvecklingssamtal med fokus på kompetensutveckling"
    },
    {
        icon: Calendar,
        title: "Månadsrapport",
        prompt: "Hjälp mig sammanfatta månadens arbete med sjukfrånvaro och övertid"
    }
]

export default function ChefstodPage() {
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSend = async (prompt?: string) => {
        const messageContent = prompt || input
        if (!messageContent.trim()) return

        setMessages(prev => [...prev, { role: 'user', content: messageContent }])
        setInput("")
        setIsLoading(true)

        // Placeholder response - will be replaced with Vercel AI SDK
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "⚠️ AI-assistenten är inte aktiverad än. Anslut Vercel AI SDK och en AI-modell för att aktivera denna funktion.\n\nNär den är aktiverad kan jag hjälpa dig med:\n- Skriva mötesagendor\n- Formulera handlingsplaner\n- Sammanfatta rapporter\n- Ge förslag på åtgärder"
            }])
            setIsLoading(false)
        }, 1000)
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                    <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Chefstöd</h1>
                    <p className="text-muted-foreground mt-1">
                        AI-assistent för administrativa uppgifter
                    </p>
                </div>
            </div>

            {/* Suggested Prompts */}
            {messages.length === 0 && (
                <div className="grid gap-4 md:grid-cols-3">
                    {suggestedPrompts.map((item, index) => (
                        <Card
                            key={index}
                            className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
                            onClick={() => handleSend(item.prompt)}
                        >
                            <CardHeader className="pb-2">
                                <div className="p-2 rounded-lg bg-primary/10 w-fit">
                                    <item.icon className="h-5 w-5 text-primary" />
                                </div>
                                <CardTitle className="text-base">{item.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription className="text-sm">
                                    {item.prompt}
                                </CardDescription>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Chat Messages */}
            <Card className="min-h-[400px] flex flex-col">
                <CardContent className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-center">
                            <div className="space-y-2">
                                <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/30" />
                                <p className="text-muted-foreground">
                                    Ställ en fråga eller välj ett förslag ovan
                                </p>
                            </div>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div
                                key={index}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-secondary'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-secondary rounded-lg px-4 py-2">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>

                {/* Input */}
                <div className="p-4 border-t">
                    <form
                        onSubmit={(e) => { e.preventDefault(); handleSend() }}
                        className="flex gap-2"
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Skriv ditt meddelande..."
                            className="flex-1 px-4 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={isLoading}
                        />
                        <Button type="submit" disabled={isLoading || !input.trim()}>
                            <Send className="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    )
}
