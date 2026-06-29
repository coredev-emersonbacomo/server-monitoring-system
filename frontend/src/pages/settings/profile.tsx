// frontend/src/pages/Profile.tsx
import React from "react";
import { useAuthContext } from "@/hooks/useAuthContext";
import {
    Loader2,
    ShieldCheck,
    Mail,
    User,
    AtSign,
    UserCircle,
} from "lucide-react";

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
                <p className="text-gray-500 text-sm">
                    Please log in to view your profile.
                </p>
            </div>
        );
    }
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    const email = user.email ?? "";
    const username = user.username ?? email.split("@")[0];
    const phone_number = user.phone_number
        ? user.phone_number
              .replace(/\D/g, "")
              .replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3")
        : "—";
    const avatarSrc = user.profile_picture_url || import.meta.env.VITE_DEFAULT_PROFILE_PICTURE || null;
    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
            {/* ── Page header ── */}
            <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div>
                    <div className="flex items-start justify-between gap-4 py-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                                <UserCircle className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight">
                                    Profile
                                </h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Your account information and preferences.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="py-6 w-full flex-1 min-h-0 overflow-auto flex flex-col gap-6">
                {/* ── Main card ── */}
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                    {/* Top banner */}
                    <div className="h-24 bg-gray-900" />

                    {/* Identity row */}
                    <div className="px-8 pb-8">
                        <div className="flex flex-col items-center -mt-12 mb-6">
                            {/* Avatar */}
                            <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-sm overflow-hidden flex-shrink-0">
                                {avatarSrc ? (
                                    <img src={avatarSrc} alt="Avatar" className="w-full h-full object-cover" />
                                ) : null}
                            </div>

                            <div className="mt-4 flex flex-col items-center">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {fullName}
                                </h2>
                            </div>
                        </div>

                        {/* Info grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 w-full">
                            <InfoBlock
                                icon={<Mail size={15} />}
                                label="Email"
                                value={email}
                            />
                            <InfoBlock
                                icon={<AtSign size={15} />}
                                label="Username"
                                value={`@${username}`}
                            />
                            <InfoBlock
                                icon={<User size={15} />}
                                label="Full name"
                                value={fullName}
                            />
                            <InfoBlock
                                icon={<User size={15} />}
                                label="Phone Number"
                                value={phone_number}
                            />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// ── Info block ────────────────────────────────────────────────────────────────

function InfoBlock({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                {icon}
                <span className="text-[10px] uppercase tracking-widest font-medium">
                    {label}
                </span>
            </div>
            <p className="text-sm font-medium text-gray-800 truncate">
                {value}
            </p>
        </div>
    );
}

export default Profile;
