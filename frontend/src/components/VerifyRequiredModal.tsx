import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { useJwtAuth } from "@/hooks/useJwtAuth";

interface VerifyRequiredModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userName?: string;
    userUuid?: string;
}

export function VerifyRequiredModal({
    open,
    onOpenChange,
    userName,
    userUuid,
}: VerifyRequiredModalProps) {
    const navigate = useNavigate();
    const { user } = useJwtAuth();
    const isSelf = userUuid != null && user?.uuid === userUuid;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        Email Verification Required
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{userName}</strong> must
                    verify their email before they can be assigned to clients.
                    Go to profile to complete verification.
                </p>
                <div className="flex justify-end gap-3 pt-4">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            label="OK"
                            onClick={() => onOpenChange(false)}
                        />
                    </DialogClose>
                    {isSelf && (
                        <Button
                            label="Go to Profile"
                            onClick={() => {
                                onOpenChange(false);
                                navigate("/profile");
                            }}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
