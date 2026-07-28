import React from "react";
import { Mail, Phone, MoreVertical, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

interface ProfileCardProps {
    uuid: string;
    name: string;
    email: string;
    phone_number: string;
    imageUrl: string;
    onDelete: (uuid: string) => void;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({
    uuid,
    name,
    email,
    phone_number,
    imageUrl,
    onDelete,
}) => {
    return (
        <Link
            to={`/users/${uuid}`}
            className="block rounded-lg transition-transform duration-200 hover:-translate-y-1"
        >
            <div className="relative w-full bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center font-sans transition-shadow hover:shadow-md">
                <div className="absolute top-3 right-3">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors pl-1 pr-0 py-1 rounded-md cursor-pointer"
                                tabIndex={-1}
                            >
                                <MoreVertical className="size-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={4}>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onDelete(uuid);
                                }}
                                className="text-destructive focus:text-destructive cursor-pointer"
                            >
                                <Trash2 className="size-3.5" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* ── Avatar ── */}
                <div className="mt-4 mb-4">
                    <img
                        src={
                            imageUrl ||
                            import.meta.env.VITE_DEFAULT_PROFILE_PICTURE ||
                            ""
                        }
                        alt={name}
                        className="w-24 h-24 rounded-full object-cover border border-border shadow-sm"
                    />
                </div>

                {/* ── Info ── */}
                <div className="text-center w-full flex flex-col items-center gap-2">
                    <h3 className="text-primary font-semibold text-base">
                        {name}
                    </h3>

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
                        <span className="truncate block" title={phone_number}>
                            {phone_number}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default ProfileCard;
