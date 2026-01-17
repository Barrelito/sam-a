"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    ListTodo,
    User,
    MessageSquare,
    Menu,
    Ambulance,
    Shield,
    Settings,
    LogOut,
    Building2,
    MapPin,
    Users,
    DollarSign,
    Calendar
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useState } from "react"
import { useAuth } from "@/lib/auth-context"

// Navigation for regular users (station managers)
const managerNavigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Årshjul", href: "/annual-cycle", icon: Calendar },
    { name: "Alla Uppgifter", href: "/tasks", icon: ListTodo },
    { name: "Mina Uppgifter", href: "/my-tasks", icon: User },
    { name: "Löneöversyn", href: "/salary-review", icon: DollarSign },
    { name: "Chefstöd", href: "/chefstod", icon: MessageSquare },
    { name: "Inställningar", href: "/settings", icon: Settings },
]

// Navigation for VO chiefs
const voChiefNavigation = [
    { name: "VO Dashboard", href: "/vo", icon: Building2 },
    { name: "Årshjul", href: "/annual-cycle", icon: Calendar },
    { name: "Alla Uppgifter", href: "/tasks", icon: ListTodo },
    { name: "Mina Uppgifter", href: "/my-tasks", icon: User },
    { name: "Löneöversyn", href: "/salary-review", icon: DollarSign },
    { name: "Chefstöd", href: "/chefstod", icon: MessageSquare },
    { name: "Inställningar", href: "/settings", icon: Settings },
]

// Navigation for admin users only
const adminNavigation = [
    { name: "Administration", href: "/admin", icon: Shield },
    { name: "Inställningar", href: "/settings", icon: Settings },
]

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    const pathname = usePathname()
    const { profile, signOut } = useAuth()

    const isAdmin = profile?.role === 'admin'

    const renderNavItem = (item: { name: string; href: string; icon: React.ComponentType<{ className?: string }> }) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '?')
        return (
            <Link
                key={item.name}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
            >
                <item.icon className="h-5 w-5" />
                {item.name}
            </Link>
        )
    }

    const handleLogout = async () => {
        await signOut()
    }

    const isVOChief = profile?.role === 'vo_chief'
    const navItems = isAdmin ? adminNavigation : (isVOChief ? voChiefNavigation : managerNavigation)

    return (
        <nav className="flex flex-col gap-1 h-full">
            <div className="flex-1">
                {isAdmin && (
                    <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Administration
                    </p>
                )}
                {navItems.map(renderNavItem)}
            </div>

            {/* User & Logout */}
            <div className="border-t pt-4 mt-auto">
                {profile && (
                    <div className="px-3 py-2 mb-2">
                        <p className="text-sm font-medium truncate">{profile.full_name || profile.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
                    </div>
                )}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full"
                >
                    <LogOut className="h-5 w-5" />
                    Logga ut
                </button>
            </div>
        </nav>
    )
}

export function AppSidebar() {
    const [open, setOpen] = useState(false)

    return (
        <>
            {/* Mobile Header */}
            <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:hidden">
                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger>
                        <span className="inline-flex items-center justify-center rounded-md p-2 hover:bg-secondary md:hidden cursor-pointer">
                            <Menu className="h-5 w-5" />
                            <span className="sr-only">Toggle menu</span>
                        </span>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col">
                        <SheetHeader>
                            <SheetTitle className="flex items-center gap-2">
                                <Ambulance className="h-6 w-6 text-primary" />
                                <span>Ambulansledning</span>
                            </SheetTitle>
                        </SheetHeader>
                        <div className="mt-6 flex-1">
                            <NavLinks onNavigate={() => setOpen(false)} />
                        </div>
                    </SheetContent>
                </Sheet>
                <div className="flex items-center gap-2">
                    <Ambulance className="h-6 w-6 text-primary" />
                    <span className="font-semibold">Station Manager</span>
                </div>
            </header>

            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 border-r bg-background md:flex md:flex-col">
                <div className="flex h-16 items-center gap-2 border-b px-6">
                    <Ambulance className="h-7 w-7 text-primary" />
                    <div className="flex flex-col">
                        <span className="font-bold text-lg">Ambulansledning</span>
                        <span className="text-xs text-muted-foreground">Station Manager Portal</span>
                    </div>
                </div>
                <div className="p-4 flex-1 flex flex-col">
                    <NavLinks />
                </div>
            </aside>
        </>
    )
}
