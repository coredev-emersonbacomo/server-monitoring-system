import React, { useState, useRef, useEffect } from "react";
import { User, Mail, Pencil, Trash2, MoreHorizontal, Phone } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

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
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <Link
            to={`/users/${id}`}
            className="block rounded-lg transition-transform duration-200 hover:-translate-y-1"
        >
            <div className="relative w-full bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center font-sans transition-shadow hover:shadow-md">

                {/* ── Kebab menu ── */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onDelete?.(id);
                    }}
                    className="absolute top-4 right-4 text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded text-[11px]"
                >
                    Remove
                </button>

                {/* ── Avatar ── */}
                <div className="mt-4 mb-4">
                    <img
                        src={imageUrl || ""}
                        alt={name}
                        className="w-24 h-24 rounded-full object-cover border border-border shadow-sm"
                    />
                </div>

                {/* ── Info ── */}
                <div className="text-center w-full flex flex-col items-center gap-2">
                    <h3 className="text-primary font-semibold text-base">
                        {name}
                    </h3>

                    <div className="flex items-center gap-1.5 text-primary font-medium text-sm mt-1">
                        <User size={16} className="text-muted-foreground" />
                        <span>{role}</span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1 max-w-full px-2">
                        <Mail size={16} className="text-muted-foreground shrink-0" />
                        <span className="truncate block" title={email}>
                            {email}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1 max-w-full px-2">
                        <Phone size={16} className="text-muted-foreground shrink-0" />
                        <span className="truncate block" title={contact_number}>
                            {contact_number}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ProfileCard;