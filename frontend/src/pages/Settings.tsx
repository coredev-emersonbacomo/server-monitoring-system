import { useState, useRef, useEffect } from "react";
import { UserCircle, Loader2, Camera } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/LoadingOverlay";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function Settings() {
    const { user, isLoading: authLoading } = useAuthContext();
    const { setTrail } = useBreadcrumb();
    const updateProfile = useUpdateProfile();
    const abortRef = useRef<AbortController | null>(null);

    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(-1);
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [fileError, setFileError] = useState<string | null>(null);

    useEffect(() => {
        setTrail([{ label: "Settings", href: "/settings" }]);
    }, [setTrail]);

    useEffect(() => {
        if (user) {
            setFirstName(user.first_name ?? "");
            setLastName(user.last_name ?? "");
            setEmail(user.email ?? "");
            setUsername(user.username ?? "");
            setAvatarPreview(user.avatar ?? null);
        }
    }, [user]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setFileError(null);

        if (!file) {
            setAvatarFile(null);
            setAvatarPreview(user?.avatar ?? null);
            return;
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            setFileError("Only JPEG, PNG, and WebP images are allowed.");
            e.target.value = "";
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setFileError("File size must not exceed 5 MB.");
            e.target.value = "";
            return;
        }

        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!firstName.trim()) newErrors.first_name = "Required";
        if (!lastName.trim()) newErrors.last_name = "Required";
        if (!email.trim()) newErrors.email = "Required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email";
        if (!username.trim()) newErrors.username = "Required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate() || !user) return;

        setIsSaving(true);
        setUploadProgress(-1);
        abortRef.current = new AbortController();

        try {
            await updateProfile.mutateAsync({
                userId: user.id,
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim(),
                username: username.trim(),
                roleId: user.role_id,
                status: "active",
                avatarFile,
                onUploadProgress: setUploadProgress,
                signal: abortRef.current.signal,
            });

            setAvatarFile(null);
        } catch {
            // Error handled in mutation
        } finally {
            setIsSaving(false);
            setUploadProgress(-1);
            abortRef.current = null;
        }
    };

    const hasChanges =
        firstName !== (user?.first_name ?? "") ||
        lastName !== (user?.last_name ?? "") ||
        email !== (user?.email ?? "") ||
        username !== (user?.username ?? "") ||
        avatarFile !== null;

    if (authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                <p className="text-muted-foreground text-sm">Loading settings...</p>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
                <p className="text-muted-foreground text-sm">Please log in to access settings.</p>
            </div>
        );
    }

    return (
        <>
            <LoadingOverlay
                visible={isSaving}
                progress={uploadProgress}
                message="Saving profile..."
            />

            <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
                <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                    <div className="flex items-start justify-between gap-4 py-3 px-6 sm:px-8 lg:px-10">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                                <UserCircle className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Manage your profile information.
                                </p>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="py-6 w-full flex-1 min-h-0 overflow-auto">
                    <div className="max-w-2xl mx-auto px-6 sm:px-8 lg:px-10 flex flex-col gap-6">
                        <form
                            onSubmit={handleSubmit}
                            className="bg-card border border-border/60 rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-8"
                        >
                            {/* Avatar */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="relative group">
                                    <div className="w-24 h-24 rounded-full bg-card border-4 border-border shadow-sm overflow-hidden">
                                        <img
                                            src={avatarPreview || ''}
                                            alt="Avatar"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                        <Camera className="w-6 h-6 text-white" />
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                                {avatarFile && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setAvatarFile(null);
                                            setAvatarPreview(user.avatar ?? null);
                                            setFileError(null);
                                        }}
                                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Remove
                                    </button>
                                )}
                                {fileError && (
                                    <p className="text-xs text-destructive">{fileError}</p>
                                )}
                            </div>

                            {/* Name */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <Label>
                                        First name <span className="text-destructive ml-0.5">*</span>
                                    </Label>
                                    <Input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className={errors.first_name ? "border-destructive" : ""}
                                    />
                                    {errors.first_name && (
                                        <p className="text-xs text-destructive">{errors.first_name}</p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label>
                                        Last name <span className="text-destructive ml-0.5">*</span>
                                    </Label>
                                    <Input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className={errors.last_name ? "border-destructive" : ""}
                                    />
                                    {errors.last_name && (
                                        <p className="text-xs text-destructive">{errors.last_name}</p>
                                    )}
                                </div>
                            </div>

                            <div className="h-px bg-border" />

                            {/* Account */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <Label>
                                        Email <span className="text-destructive ml-0.5">*</span>
                                    </Label>
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={errors.email ? "border-destructive" : ""}
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-destructive">{errors.email}</p>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1">
                                    <Label>
                                        Username <span className="text-destructive ml-0.5">*</span>
                                    </Label>
                                    <Input
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className={errors.username ? "border-destructive" : ""}
                                    />
                                    {errors.username && (
                                        <p className="text-xs text-destructive">{errors.username}</p>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="h-px bg-border" />
                            <div className="flex items-center justify-end gap-3">
                                <Button
                                    type="submit"
                                    disabled={isSaving || !hasChanges}
                                    label={isSaving ? "Saving..." : "Save Changes"}
                                />
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </>
    );
}

export default Settings;
