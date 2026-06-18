// ProfileCard.tsx
import React, { useState, useRef, useEffect } from "react";
import { User, Mail, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileCardProps {
    id: number;
    name?: string;
    email?: string;
    role?: string;
    imageUrl?: string;
    status?: "active" | "inactive";
    onDelete?: (id: number) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
    id,
    name = "Ruby A Arnold",
    email = "r.a.arnold@devify.com",
    role = "Partner",
    imageUrl,
    status = "active",
    onDelete,
}) => {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const initials = name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="relative w-full bg-white rounded-lg border border-gray-100 p-6 shadow-sm flex flex-col items-center font-sans">
            {/* ── Top action bar ── */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                {/* Status dot */}
                <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${
                            status === "active" ? "bg-green-500" : "bg-gray-300"
                        }`}
                    />
                    {status}
                </span>

                {/* Kebab menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((o) => !o)}
                        className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
                        aria-label="More options"
                    >
                        <MoreHorizontal size={18} />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-6 z-20 w-36 bg-white border border-gray-100 rounded-lg shadow-md py-1 text-sm">
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                navigate(`/users/${id}`);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            <Pencil size={13} className="text-gray-400" />
                            View / Edit
                            </button>
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    onDelete?.(id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 transition-colors"
                            >
                                <Trash2 size={13} />
                                Remove
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Avatar ── */}
            <div className="mt-4 mb-4">
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={name}
                        className="w-24 h-24 rounded-full object-cover border border-gray-100 shadow-sm"
                    />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-gray-100 border border-gray-100 flex items-center justify-center text-gray-500 text-2xl font-semibold shadow-sm">
                        {initials}
                    </div>
                )}
            </div>

            {/* ── Info ── */}
            <div className="text-center w-full flex flex-col items-center gap-2">
                <h3
                    onClick={() => navigate(`/users/${id}`)}
                    className="text-[#1a629d] font-semibold text-base hover:underline cursor-pointer"
                >
                    {name}
                </h3>

                <p className="text-gray-600 text-sm font-normal">{email}</p>

                <div className="flex items-center gap-1.5 text-[#1a629d] font-medium text-sm mt-1">
                    <User size={16} className="text-gray-400" />
                    <span>{role}</span>
                </div>

                <div className="flex items-center gap-2 text-[#1a629d] text-sm mt-1 max-w-full px-2">
                    <Mail size={16} className="text-gray-400 flex-shrink-0" />
                    <span className="truncate block" title={email}>
                        {email}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProfileCard;
