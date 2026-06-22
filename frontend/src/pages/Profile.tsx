// frontend/src/pages/Profile.tsx
import React from "react";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Loader2, ShieldCheck, Mail, User, AtSign, Shield } from "lucide-react";

export const Profile: React.FC = () => {
    const { user, isLoading } = useAuthContext();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                <p className="text-gray-400 text-sm">Loading profile...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center">
                <div className="bg-gray-100 p-3 rounded-full">
                    <ShieldCheck size={28} className="text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">Please log in to view your profile.</p>
            </div>
        );
    }

    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    const email = user.email ?? "";
    const username = user.username ?? email.split("@")[0];
    const roleName = (user.role as any)?.role_name ?? "—";
    const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();

    return (
        <div className="flex flex-col gap-6 w-full h-full">

            {/* ── Page header ── */}
            <div>
                <h1 className="text-xl font-semibold text-gray-900">Profile</h1>
                <p className="text-sm text-gray-400 mt-0.5">Your account information and preferences.</p>
            </div>

            {/* ── Main card ── */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">

                {/* Top banner */}
                <div className="h-24 bg-gray-900" />

                {/* Identity row */}
                <div className="px-8 pb-8">
                    <div className="flex flex-col items-center -mt-12 mb-6">
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center flex-shrink-0">
                            <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center">
                                <span className="text-2xl font-semibold text-gray-500">{initials}</span>
                            </div>
                        </div>

                        {/* Name + role */}
                        <div className="mt-4 flex flex-col items-center">
                            <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
                            <span className="inline-flex items-center font-semibold gap-1 mt-1.5 px-2 py-0.5 text-xs border border-gray-200 rounded-full text-gray-500">
                                <Shield size={11} />
                                {roleName}
                            </span>
                        </div>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
                        <InfoBlock icon={<Mail size={15} />} label="Email" value={email} />
                        <InfoBlock icon={<AtSign size={15} />} label="Username" value={`@${username}`} />
                        <InfoBlock icon={<User size={15} />} label="Full name" value={fullName} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Info block ────────────────────────────────────────────────────────────────

function InfoBlock({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                {icon}
                <span className="text-[10px] uppercase tracking-widest font-medium">{label}</span>
            </div>
            <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
        </div>
    );
}

export default Profile;