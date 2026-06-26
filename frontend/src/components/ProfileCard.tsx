import React, { useState, useRef, useEffect } from "react";
import { User, Mail, Pencil, Trash2, MoreHorizontal, Phone } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

interface ProfileCardProps {
    id: string; 
    name?: string;
    email?: string;
    contact_number?: string;
    imageUrl?: string;
    onDelete?: (id: string) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
    id,
    name = "Ruby A Arnold",
    email = "r.a.arnold@devify.com",
    contact_number = "09123456789",
    imageUrl,
    onDelete,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const toggleMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen((prev) => !prev);
    };

    return (
        <Link
            to={`/users/${id}`}
            className="block rounded-lg transition-transform duration-200 hover:-translate-y-1"
        >
            <div className="relative w-full bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center font-sans transition-shadow hover:shadow-md">
                
                <div ref={menuRef} className="absolute right-4 top-4 z-10">
                    <button
                        onClick={toggleMenu}
                        className="p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
                    >
                        <MoreHorizontal size={20} />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-7 z-20 w-36 bg-card border border-border rounded-lg shadow-lg py-1 text-sm">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    setMenuOpen(false);
                                    navigate(`/users/${id}`);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted transition-colors"
                            >
                                <Pencil size={13} className="text-muted-foreground" />
                                View / Edit
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
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

                <div className="mt-4 mb-4">
                    <img
                        src={imageUrl || import.meta.env.VITE_DEFAULT_PROFILE_PICTURE || ''}
                        alt={name}
                        className="w-24 h-24 rounded-full object-cover border border-border shadow-sm"
                    />
                </div>

                <div className="text-center w-full flex flex-col items-center gap-2">
                    <h3 className="text-primary font-semibold text-base">
                        {name}
                    </h3>

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
        </Link >
    );
};

export default ProfileCard;