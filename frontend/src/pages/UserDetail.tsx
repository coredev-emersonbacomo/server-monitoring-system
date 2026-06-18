import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Upload, AlertTriangle } from "lucide-react";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { Button } from "@/components/ui/button";

type Role = "admin" | "secoops";

interface UserForm {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    role: Role;
    status: "active" | "inactive";
    password: string;
    password_confirmation: string;
    avatar: string | undefined;
}

const EMPTY_FORM: UserForm = {
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    role: "secoops",
    status: "active",
    password: "",
    password_confirmation: "",
    avatar: undefined,
};

interface UserRecord extends UserForm {
    id: number;
}

const MOCK_USERS: UserRecord[] = [
    { id: 1, first_name: "Ruby", last_name: "Arnold", email: "r.arnold@devify.com", username: "ruby.arnold", role: "admin", status: "active", password: "", password_confirmation: "", avatar: "https://i.pravatar.cc/150?img=47" },
    { id: 2, first_name: "James", last_name: "Whitfield", email: "j.whitfield@devify.com", username: "james.w", role: "admin", status: "active", password: "", password_confirmation: "", avatar: "https://i.pravatar.cc/150?img=12" },
    { id: 3, first_name: "Lena", last_name: "Park", email: "l.park@devify.com", username: "lena.park", role: "secoops", status: "active", password: "", password_confirmation: "", avatar: "https://i.pravatar.cc/150?img=32" },
    { id: 4, first_name: "Omar", last_name: "Hassan", email: "o.hassan@devify.com", username: "omar.h", role: "secoops", status: "inactive", password: "", password_confirmation: "", avatar: undefined },
];

function StackField({
    label,
    required,
    readValue,
    editValue,
    hint,
}: {
    label: string;
    required?: boolean;
    readValue: React.ReactNode;
    editValue: React.ReactNode;
    hint?: string;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">
                {label}
                {required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            <div className="grid grid-cols-[1fr] grid-rows-[1fr]">
                <div className="col-start-1 row-start-1 [.nc-edit_&]:invisible [.nc-create_&]:invisible">
                    {readValue}
                </div>
                <div className="col-start-1 row-start-1 invisible [.nc-edit_&]:visible [.nc-create_&]:visible">
                    {editValue}
                </div>
            </div>
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
    );
}

const inputCls =
    "w-full px-3 py-2 text-sm border border-input rounded-lg bg-transparent focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

export default function UserDetail() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { setTrail } = useBreadcrumb();
    const isCreate = !id;

    const userId = Number(id);
    const userRecord = isCreate ? null : MOCK_USERS.find((u) => u.id === userId) ?? null;

    const [isEditing, setIsEditing] = useState(isCreate);

    const initForm = (): UserForm => {
        if (userRecord) {
            return {
                first_name: userRecord.first_name,
                last_name: userRecord.last_name,
                email: userRecord.email,
                username: userRecord.username,
                role: userRecord.role,
                status: userRecord.status,
                password: "",
                password_confirmation: "",
                avatar: userRecord.avatar,
            };
        }
        return EMPTY_FORM;
    };

    const [form, setForm] = useState<UserForm>(initForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [showDelete, setShowDelete] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isCreate) {
            setTrail([
                { label: "Users", href: "/users" },
                { label: "Create", href: "/users/create" },
            ]);
        } else if (userRecord) {
            setTrail([
                { label: "Users", href: "/users" },
                { label: `${userRecord.first_name} ${userRecord.last_name}`, href: `/users/${userRecord.id}` },
            ]);
        }
    }, [setTrail, isCreate, userRecord]);

    const update = (key: keyof UserForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm((f) => ({ ...f, [key]: e.target.value }));
    };

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.first_name.trim()) e.first_name = "Required";
        if (!form.last_name.trim()) e.last_name = "Required";
        if (!form.email.trim()) e.email = "Required";
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
        if (!form.username.trim()) e.username = "Required";
        if (isCreate) {
            if (!form.password) e.password = "Required";
            else if (form.password.length < 8) e.password = "Minimum 8 characters";
        } else {
            if (form.password && form.password.length < 8) e.password = "Minimum 8 characters";
        }
        if (form.password && form.password !== form.password_confirmation)
            e.password_confirmation = "Passwords do not match";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            if (isCreate) {
                await fetch("/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    body: JSON.stringify({
                        first_name: form.first_name,
                        last_name: form.last_name,
                        email: form.email,
                        username: form.username,
                        role_id: form.role === "admin" ? 1 : 2,
                        password: form.password,
                        password_confirmation: form.password_confirmation,
                    }),
                });
                navigate("/users");
            } else {
                // TODO: PUT /api/users/:id
                console.log("Update user payload:", { id: userId, ...form });
                setIsEditing(false);
            }
        } catch (err) {
            console.error("Failed to save user:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        // TODO: DELETE /api/users/:id
        console.log("Delete user:", userId);
        navigate("/users");
    };

    const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setAvatarPreview(URL.createObjectURL(file));
    };

    if (!isCreate && !userRecord) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <AlertTriangle size={32} className="opacity-40" />
                <p className="text-sm">User not found.</p>
                <button onClick={() => navigate("/users")} className="text-sm underline">
                    Back to users
                </button>
            </div>
        );
    }

    const showEdit = isEditing || isCreate;
    const currentAvatar = avatarPreview ?? form.avatar;
    const initials = `${form.first_name[0] ?? ""}${form.last_name[0] ?? ""}`.toUpperCase() || "?";

    return (
        <div className={`w-full flex flex-col items-center px-4 py-6 ${showEdit ? "nc-edit" : ""} ${isCreate ? "nc-create" : ""}`}>
            <div className="w-full max-w-2xl flex flex-col gap-6">
                {/* Back + actions */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate("/users")}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft size={15} /> Users
                    </button>
                    <div className="flex items-center gap-2">
                        {!isCreate && !showEdit && (
                            <Button variant="outline" icon={<Pencil className="w-4 h-4" />} label="Edit" onClick={() => setIsEditing(true)} />
                        )}
                        {showEdit && (
                            <Button
                                variant="outline"
                                label="Cancel"
                                onClick={() => {
                                    if (isCreate) navigate("/users");
                                    else { setIsEditing(false); if (userRecord) setForm({ ...userRecord, password: "", password_confirmation: "" }); }
                                }}
                            />
                        )}
                        {!isCreate && !showEdit && (
                            <button onClick={() => setShowDelete(true)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
                                Delete
                            </button>
                        )}
                    </div>
                </div>

                {/* Header */}
                <div className="grid grid-cols-[1fr] grid-rows-[1fr]">
                    <div className="col-start-1 row-start-1 [.nc-edit_&]:invisible [.nc-create_&]:invisible">
                        <h1 className="text-xl font-semibold text-foreground">
                            {userRecord ? `${userRecord.first_name} ${userRecord.last_name}` : "User"}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {userRecord ? `${userRecord.email} · @${userRecord.username}` : ""}
                        </p>
                    </div>
                    <div className="col-start-1 row-start-1 invisible [.nc-edit_&]:visible [.nc-create_&]:visible">
                        <h1 className="text-xl font-semibold text-foreground">
                            {isCreate ? "Add User" : "Edit User"}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {isCreate ? "Create a new account and assign a role." : `${form.first_name || "..."} ${form.last_name || "..."} · @${form.username || "..."}`}
                        </p>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="bg-card border border-border/60 rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                            {currentAvatar ? (
                                <img src={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-xl text-muted-foreground font-semibold">{initials}</span>
                            )}
                        </div>
                        <div className="grid grid-cols-[1fr] grid-rows-[1fr]">
                            <div className="col-start-1 row-start-1 [.nc-edit_&]:invisible [.nc-create_&]:invisible">
                                {currentAvatar && (
                                    <p className="text-sm text-muted-foreground">Photo uploaded</p>
                                )}
                            </div>
                            <div className="col-start-1 row-start-1 invisible [.nc-edit_&]:visible [.nc-create_&]:visible">
                                <label className="flex items-center gap-2 px-3 py-2 text-sm border border-input rounded-lg cursor-pointer hover:bg-muted/50 transition-colors text-muted-foreground">
                                    <Upload size={14} />
                                    {currentAvatar ? "Change photo" : "Upload photo"}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StackField
                            label="First name"
                            required
                            readValue={<p className="text-sm text-foreground">{userRecord?.first_name}</p>}
                            editValue={
                                <div>
                                    <input className={inputCls} placeholder="Ruby" value={form.first_name} onChange={update("first_name")} />
                                    {errors.first_name && <p className="text-xs text-destructive mt-1">{errors.first_name}</p>}
                                </div>
                            }
                        />
                        <StackField
                            label="Last name"
                            required
                            readValue={<p className="text-sm text-foreground">{userRecord?.last_name}</p>}
                            editValue={
                                <div>
                                    <input className={inputCls} placeholder="Arnold" value={form.last_name} onChange={update("last_name")} />
                                    {errors.last_name && <p className="text-xs text-destructive mt-1">{errors.last_name}</p>}
                                </div>
                            }
                        />
                    </div>

                    {/* Email + Username */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StackField
                            label="Email"
                            required
                            readValue={<p className="text-sm text-foreground">{userRecord?.email}</p>}
                            editValue={
                                <div>
                                    <input className={inputCls} type="email" placeholder="ruby@devify.com" value={form.email} onChange={update("email")} />
                                    {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
                                </div>
                            }
                        />
                        <StackField
                            label="Username"
                            required
                            hint="Letters, numbers, and dots only"
                            readValue={<p className="text-sm text-foreground">@{userRecord?.username}</p>}
                            editValue={
                                <div>
                                    <input className={inputCls} placeholder="ruby.arnold" value={form.username} onChange={update("username")} />
                                    {errors.username && <p className="text-xs text-destructive mt-1">{errors.username}</p>}
                                </div>
                            }
                        />
                    </div>

                    {/* Role + Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StackField
                            label="Role"
                            required
                            readValue={
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    userRecord?.role === "admin" ? "bg-primary/10 text-foreground" : "bg-muted text-muted-foreground"
                                }`}>
                                    {userRecord?.role === "admin" ? "Admin" : "Secoops"}
                                </span>
                            }
                            editValue={
                                <select className={inputCls} value={form.role} onChange={update("role")}>
                                    <option value="admin">Admin</option>
                                    <option value="secoops">Secoops</option>
                                </select>
                            }
                        />
                        <StackField
                            label="Status"
                            readValue={
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                    userRecord?.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                                }`}>
                                    {userRecord?.status === "active" ? "Active" : "Inactive"}
                                </span>
                            }
                            editValue={
                                <select className={inputCls} value={form.status} onChange={update("status")}>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            }
                        />
                    </div>

                    <div className="h-px bg-border" />

                    {/* Password */}
                    <div>
                        <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">
                            {isCreate ? "Password" : "Change password"}
                            {!isCreate && <span className="normal-case tracking-normal font-normal text-muted-foreground"> (leave blank to keep current)</span>}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <StackField
                                label="New password"
                                required={isCreate}
                                readValue={<p className="text-sm text-muted-foreground">••••••••</p>}
                                editValue={
                                    <div>
                                        <input className={inputCls} type="password" placeholder={isCreate ? "Min. 8 characters" : "New password"} value={form.password} onChange={update("password")} />
                                        {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
                                    </div>
                                }
                            />
                            <StackField
                                label="Confirm password"
                                required={isCreate}
                                readValue={<p className="text-sm text-muted-foreground">••••••••</p>}
                                editValue={
                                    <div>
                                        <input className={inputCls} type="password" placeholder="Repeat password" value={form.password_confirmation} onChange={update("password_confirmation")} />
                                        {errors.password_confirmation && <p className="text-xs text-destructive mt-1">{errors.password_confirmation}</p>}
                                    </div>
                                }
                            />
                        </div>
                    </div>

                    {/* Actions */}
                    {showEdit && (
                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
                            <Button type="submit" label={saving ? "Saving..." : isCreate ? "Create User" : "Save Changes"} disabled={saving} />
                        </div>
                    )}
                </form>

                {/* Delete confirm modal */}
                {showDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="bg-card border border-border/60 rounded-xl p-6 max-w-sm w-full mx-4 shadow-lg">
                            <h2 className="text-base font-semibold mb-1">Remove user?</h2>
                            <p className="text-sm text-muted-foreground mb-5">
                                This will permanently delete <strong className="text-foreground">{form.first_name} {form.last_name}</strong> and cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" label="Cancel" onClick={() => setShowDelete(false)} />
                                <Button variant="danger" label="Remove" onClick={handleDelete} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
