// Presentation layout - no sidebar
export default function PresentationLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background">
            {children}
        </div>
    )
}
