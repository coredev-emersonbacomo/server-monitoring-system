// ProfileCard.tsx
import React, { useState, useRef, useEffect } from "react";
import { User, Mail, Pencil, Trash2, MoreHorizontal, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileCardProps {
    id: number;
    name?: string;
    email?: string;
    contact_number?: string;
    role?: string;
    imageUrl?: string;
    onDelete?: (id: number) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
    id,
    name = "Ruby A Arnold",
    email = "r.a.arnold@devify.com",
    contact_number = "09123456789",
    role = "Partner",
    imageUrl,
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

    return (
        <div className="relative w-full bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center font-sans transition-shadow hover:shadow-md">
            {/* ── Top action bar ── */}
            <div className="absolute top-4 right-4">
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
                <img
                    src={imageUrl || ''}
                    alt={name}
                    className="w-24 h-24 rounded-full object-cover border border-border shadow-sm"
                />
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
                <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1 max-w-full px-2">
                    <Phone
                        size={16}
                        className="text-muted-foreground shrink-0"
                    />
                    <span className="truncate block" title={contact_number}>
                        {contact_number.replace(/\D/g, "").replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3")}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default ProfileCard;
