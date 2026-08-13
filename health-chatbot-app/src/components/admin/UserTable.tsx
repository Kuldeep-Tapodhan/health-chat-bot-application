'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronLeft, ChevronRight, MoreVertical, Shield, Ban, CheckCircle, Plus, X, Loader2, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { API_BASE_URL } from '@/lib/api-client';

interface User {
    uid: string;
    displayName: string;
    email: string;
    status: 'active' | 'blocked';
    role: string;
    createdAt: string;
    lastActive: string;
}

interface UserTableProps {
    refreshTrigger?: number;
}

export default function UserTable({ refreshTrigger }: UserTableProps) {
    const { t } = useLanguage();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [totalUsers, setTotalUsers] = useState(0);

    // Create User Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'user' });
    const [createError, setCreateError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const LIMIT = 10;

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const offset = page * LIMIT;
            const res = await fetch(`${API_BASE_URL}/admin/users?limit=${LIMIT}&offset=${offset}`);

            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
                setTotalUsers(data.total);
                setTotalPages(Math.ceil(data.total / LIMIT));
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, refreshTrigger]);

    const handleNext = () => {
        if (page < totalPages - 1) setPage(p => p + 1);
    };

    const handlePrev = () => {
        if (page > 0) setPage(p => p - 1);
    };

    if (loading && users.length === 0) {
        return (
            <div className="p-8 text-center text-neutral-500 animate-pulse">
                Loading users...
            </div>
        );
    }

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        setCreateError(null);

        try {
            const res = await fetch(`${API_BASE_URL}/admin/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to create user');
            }

            // Success
            setShowCreateModal(false);
            setNewUser({ email: '', password: '', name: '', role: 'user' });
            fetchUsers(); // Refresh table
        } catch (err: any) {
            console.error("Create User Error:", err);
            setCreateError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleUpdateRole = async (userId: string, newRole: string) => {
        setUpdating(userId);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to update role');
            }

            // Refresh locally
            setUsers(prev => prev.map(u =>
                u.uid === userId ? { ...u, role: newRole } : u
            ));
            setOpenMenuId(null);
        } catch (error: any) {
            console.error('Update Role Error:', error);
            alert(`Failed to update user role: ${error.message}`);
        } finally {
            setUpdating(null);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) return;

        setUpdating(userId);
        try {
            const res = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.detail || 'Failed to delete user');
            }

            // Remove from local state
            setUsers(prev => prev.filter(u => u.uid !== userId));
            setTotalUsers(prev => prev - 1);
            setOpenMenuId(null);
        } catch (error: any) {
            console.error('Delete User Error:', error);
            alert(`Failed to delete user: ${error.message}`);
        } finally {
            setUpdating(null);
        }
    };

    return (
        <div className="space-y-4 relative">
            {/* Create User Modal with Portal */}
            {showCreateModal && mounted && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[#0f172a] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
                            <h3 className="text-lg font-bold text-white">Create New User</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-neutral-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            {createError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-center gap-2">
                                    <Ban className="w-4 h-4 flex-shrink-0" />
                                    {createError}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    value={newUser.name}
                                    onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1">Email Address</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    value={newUser.email}
                                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1">Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                    value={newUser.password}
                                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1">Role</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setNewUser({ ...newUser, role: 'user' })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${newUser.role === 'user' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-white/5 text-neutral-400 border border-transparent hover:bg-white/10'}`}
                                    >
                                        User
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewUser({ ...newUser, role: 'admin' })}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${newUser.role === 'admin' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50' : 'bg-white/5 text-neutral-400 border border-transparent hover:bg-white/10'}`}
                                    >
                                        Admin
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                                    Create User
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    All Users
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-mono text-neutral-400">{totalUsers}</span>
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 mr-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add User
                    </button>
                    <button
                        onClick={handlePrev}
                        disabled={page === 0}
                        className="p-2 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4 text-white" />
                    </button>
                    <span className="text-sm text-neutral-400 py-2">
                        Page {page + 1} of {totalPages || 1}
                    </span>
                    <button
                        onClick={handleNext}
                        disabled={page >= totalPages - 1}
                        className="p-2 rounded-lg bg-white/5 disabled:opacity-30 hover:bg-white/10 transition-colors"
                    >
                        <ChevronRight className="w-4 h-4 text-white" />
                    </button>
                </div>
            </div>

            <div className="glass-card-dark rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">Profile</th>
                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-4 text-xs font-bold text-neutral-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {users.map((u) => (
                                <tr key={u.uid} className="hover:bg-white/5 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md border border-white/10">
                                                {u.displayName?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-semibold text-white">{u.displayName}</p>
                                                <p className="text-xs text-neutral-500">{u.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <Shield className={`w-3 h-3 ${u.role === 'admin' ? 'text-purple-400' : 'text-neutral-500'}`} />
                                            <span className={`text-sm capitalize ${u.role === 'admin' ? 'text-purple-400 font-bold' : 'text-neutral-300'}`}>{u.role}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold border flex w-fit items-center gap-1.5 ${u.status === 'active'
                                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                            }`}>
                                            {u.status === 'active' ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                                            <span className="capitalize">{u.status}</span>
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-neutral-400 font-mono">
                                        {new Date(u.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right relative">
                                        <button
                                            onClick={() => setOpenMenuId(openMenuId === u.uid ? null : u.uid)}
                                            className="p-2 text-neutral-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {openMenuId === u.uid && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setOpenMenuId(null)}
                                                />
                                                <div className="absolute right-0 mt-2 w-48 bg-[#0f172a] border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden">
                                                    <div className="p-1">
                                                        <button
                                                            onClick={() => handleUpdateRole(u.uid, 'admin')}
                                                            disabled={updating === u.uid || u.role === 'admin'}
                                                            className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                        >
                                                            <Shield className="w-4 h-4 text-purple-400" />
                                                            Make Admin
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateRole(u.uid, 'user')}
                                                            disabled={updating === u.uid || u.role === 'user'}
                                                            className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-300 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                        >
                                                            <div className="w-4 h-4" />
                                                            Revoke Admin
                                                        </button>
                                                        <div className="h-px bg-white/10 my-1" />
                                                        <button
                                                            onClick={() => handleDeleteUser(u.uid, u.displayName)}
                                                            className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete User
                                                        </button>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
