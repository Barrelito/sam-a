import { AppSidebar } from "@/components/app-sidebar";
import { PasswordGuard } from "@/components/password-guard";
import { RequireMFAGuard } from "@/components/require-mfa-guard";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <RequireMFAGuard>
            <div className="min-h-screen bg-background">
                <PasswordGuard />
                <AppSidebar />
                <main className="md:pl-64">
                    <div className="container py-6 px-4 md:px-8 pt-4 md:pt-6">
                        {children}
                    </div>
                </main>
            </div>
        </RequireMFAGuard>
    );
}
