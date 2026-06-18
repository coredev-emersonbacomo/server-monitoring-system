// ProfileCard.tsx
import React, { useState, useRef, useEffect } from "react";
import { User, Mail, Pencil, Trash2, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

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
        <div className="relative w-full bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center font-sans transition-shadow hover:shadow-md">
            {/* ── Top action bar ── */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                {/* Status badge */}
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span
                        className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            status === "active"
                                ? "bg-emerald-500"
                                : "bg-muted-foreground/40",
                        )}
                    />
                    {status}
                </span>

                {/* Kebab menu */}
                <div className="relative" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((o) => !o)}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                        aria-label="More options"
                    >
                        <MoreHorizontal size={18} />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-6 z-20 w-36 bg-card border border-border rounded-lg shadow-lg py-1 text-sm">
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    navigate(`/users/${id}`);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted transition-colors"
                            >
                                <Pencil
                                    size={13}
                                    className="text-muted-foreground"
                                />
                                View / Edit
                            </button>
                            <button
                                onClick={() => {
                                    setMenuOpen(false);
                                    onDelete?.(id);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 transition-colors"
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
                        className="w-24 h-24 rounded-full object-cover border border-border shadow-sm"
                    />
                ) : (
                    <div className="w-24 h-24 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground text-2xl font-semibold shadow-sm">
                        {initials}
                    </div>
                )}
            </div>

            {/* ── Info ── */}
            <div className="text-center w-full flex flex-col items-center gap-2">
                <h3
                    onClick={() => navigate(`/users/${id}`)}
                    className="text-primary font-semibold text-base hover:underline cursor-pointer"
                >
                    {name}
                </h3>

                <p className="text-muted-foreground text-sm font-normal">
                    {email}
                </p>

                <div className="flex items-center gap-1.5 text-primary font-medium text-sm mt-1">
                    <User size={16} className="text-muted-foreground" />
                    <span>{role}</span>
                </div>

                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1 max-w-full px-2">
                    <Mail
                        size={16}
                        className="text-muted-foreground shrink-0"
                    />
                    <span className="truncate block" title={email}>
                        {email}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProfileCard;
