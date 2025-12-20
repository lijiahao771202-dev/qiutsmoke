import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Rain Admin",
    description: "Management dashboard for Rain Meditation App",
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0">
                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Rain Admin
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <Link
                        href="/admin/users"
                        className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors mb-1"
                    >
                        <span className="mr-3">👥</span>
                        用户管理
                    </Link>
                    <Link
                        href="/admin/push"
                        className="flex items-center px-4 py-2 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
                    >
                        <span className="mr-3">📢</span>
                        推送广播
                    </Link>
                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <Link
                            href="/"
                            className="flex items-center px-4 py-2 text-sm font-medium text-slate-500 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition-colors"
                        >
                            <span className="mr-3">⬅️</span>
                            返回应用
                        </Link>
                    </div>
                </nav>

                <div className="p-4 border-t border-slate-100 text-xs text-slate-400">
                    Rain Meditation v1.0
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-7xl mx-auto p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
