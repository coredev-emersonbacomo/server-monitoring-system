// Path path: frontend/src/pages/Profile.tsx
import React from 'react';
import { useAuthContext } from '@/hooks/useAuthContext'; // Path to the hook created above
import { MoreHorizontal, User, Mail, LogOut, Loader2, ShieldCheck } from 'lucide-react';
import { Avatar } from 'radix-ui';

export const ProfilePage: React.FC = () => {
    const { user, isLoading, logout, isLoggingOut } = useAuthContext();

    // 1. Loading State
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                <p className="text-gray-500 text-sm font-medium">Loading user profile...</p>
            </div>
        );
    }

    // 2. Unauthenticated State
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
                <div className="bg-red-50 p-3 rounded-full text-red-500 mb-3">
                    <ShieldCheck size={32} />
                </div>
                <h2 className="text-xl font-bold text-gray-800">Access Denied</h2>
                <p className="text-gray-500 text-sm max-w-sm mt-1">
                    Please log in to view your profile settings and information.
                </p>
            </div>
        );
    }

    // 3. Fallback extraction based on standard schema patterns (adjust keys based on your real `UserData` keys)
    const fullName = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim();
    const emailAddress = user.email ?? "";
    const userRole = (user.role_id as any)?.role_name ?? "—";
    const initials = `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}`.toUpperCase();
    return (
        <div className="container mx-auto px-4 py-12 max-w-md flex flex-col items-center">

            {/* The Profile Card Container */}
            <div className="relative w-full max-w-[320px] bg-white rounded-xl border border-gray-100 p-6 shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col items-center font-sans">

                {/* Top Action Bar */}
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                    {/* Custom Checkbox / Status indicator */}
                    <input
                        type="checkbox"
                        defaultChecked
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    {/* More Options Menu */}
                    <button className="text-gray-400 hover:text-gray-600 transition-colors">
                        <MoreHorizontal size={20} />
                    </button>
                </div>

                {/* Profile Image */}
                <div className="mt-4 mb-4">
                    <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-50 shadow-sm flex items-center justify-center">
                        <span className="text-2xl font-semibold text-gray-500">{initials}</span>
                    </div>
                </div>

                {/* User Data Sections */}
                <div className="text-center w-full flex flex-col items-center gap-2">
                    {/* Dynamic Name */}
                    <h3 className="text-[#1a629d] font-semibold text-lg hover:underline cursor-pointer">
                        {fullName}
                    </h3>

                    {/* Primary Contact Email */}
                    <p className="text-gray-500 text-sm font-normal break-all px-2">
                        {emailAddress}
                    </p>

                    {/* Role badge */}
                    <div className="flex items-center gap-1.5 text-[#1a629d] font-medium text-sm mt-1">
                        <User size={16} className="text-gray-400" />
                        <span className="capitalize">{userRole}</span>
                    </div>

                    {/* Secondary Truncated Data Row */}
                    <div className="flex items-center gap-2 text-[#1a629d] text-sm mt-1 max-w-full px-2">
                        <Mail size={16} className="text-gray-400 flex-shrink-0" />
                        <span className="truncate block max-w-[180px]" title={emailAddress}>
                            {emailAddress}
                        </span>
                    </div>
                </div>

                {/* Action Button: Logout */}
                <div className="w-full mt-6 pt-4 border-t border-gray-100">
                    <button
                        onClick={() => logout()}
                        disabled={isLoggingOut}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
                    >
                        {isLoggingOut ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <LogOut size={16} />
                        )}
                        <span>{isLoggingOut ? "Logging out..." : "Log Out"}</span>
                    </button>
                </div>

            </div>

        </div>
    );
};

export default ProfilePage;