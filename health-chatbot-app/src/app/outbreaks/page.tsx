import Sidebar from '@/components/Sidebar';
import OutbreakDashboard from '@/components/OutbreakDashboard';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function OutbreaksPage() {
    return (
        <ProtectedRoute>
            <div className="flex h-screen bg-slate-50 dark:bg-[#080c14]">
                <Sidebar />
                <main className="flex-1 lg:pl-64 overflow-auto">
                    <OutbreakDashboard />
                </main>
            </div>
        </ProtectedRoute>
    );
}
