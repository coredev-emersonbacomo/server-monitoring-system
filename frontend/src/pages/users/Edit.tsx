// users/Edit.tsx
import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, AlertTriangle } from "lucide-react";

type Role = "admin" | "secoops";

interface User {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    role: Role;
    status: "active" | "inactive";
    avatar?: string;
}

// ─── Mock fetch (replace with useQuery / axios) ───────────────────────────────

const MOCK_USERS: User[] = [
    {
        id: 1,
        first_name: "Ruby",
        last_name: "Arnold",
        email: "r.arnold@devify.com",
        username: "ruby.arnold",
        role: "admin",
        status: "active",
        avatar: "https://i.pravatar.cc/150?img=47",
    },
    {
        id: 2,
        first_name: "James",
        last_name: "Whitfield",
        email: "j.whitfield@devify.com",
        username: "james.w",
        role: "admin",
        status: "active",
        avatar: "https://i.pravatar.cc/150?img=12",
    },
    {
        id: 3,
        first_name: "Lena",
        last_name: "Park",
        email: "l.park@devify.com",
        username: "lena.park",
        role: "secoops",
        status: "active",
        avatar: "https://i.pravatar.cc/150?img=32",
    },
    {
        id: 4,
        first_name: "Omar",
        last_name: "Hassan",
        email: "o.hassan@devify.com",
        username: "omar.h",
        role: "secoops",
        status: "inactive",
    },
];

function mockFindUser(id: number): User | undefined {
    return MOCK_USERS.find((u) => u.id === id);
}

// ─── Reusable field ───────────────────────────────────────────────────────────

function Field({
    label,
    required,
    children,
    hint,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    hint?: string;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
                {label}
                {required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {children}
            {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
        </div>
    );
}

const inputCls =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-300 transition-colors";

// ─── Page ─────────────────────────────────────────────────────────────────────

const Edit = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const user = mockFindUser(Number(id));

    const [form, setForm] = useState({
        first_name: user?.first_name ?? "",
        last_name: user?.last_name ?? "",
        email: user?.email ?? "",
        username: user?.username ?? "",
        role: user?.role ?? ("secoops" as Role),
        status: user?.status ?? ("active" as "active" | "inactive"),
        password: "",
        password_confirmation: "",
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [showDelete, setShowDelete] = useState(false);

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                <AlertTriangle size={32} className="opacity-40" />
                <p className="text-sm">User not found.</p>
                <button
                    onClick={() => navigate("/users")}
                    className="text-sm text-gray-600 underline"
                >
                    Back to users
                </button>
            </div>
        );
    }

    const set =
        (key: string) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setForm((f) => ({ ...f, [key]: e.target.value }));

    const validate = (): boolean => {
        const e: Record<string, string> = {};
        if (!form.first_name.trim()) e.first_name = "Required";
        if (!form.last_name.trim()) e.last_name = "Required";
        if (!form.email.trim()) e.email = "Required";
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
        if (!form.username.trim()) e.username = "Required";
        if (form.password && form.password.length < 8)
            e.password = "Minimum 8 characters";
        if (form.password && form.password !== form.password_confirmation)
            e.password_confirmation = "Passwords do not match";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        // TODO: PUT /api/users/:id
        console.log("Update user payload:", { id: user.id, ...form });
        navigate("/users");
    };

    const handleDelete = () => {
        // TODO: DELETE /api/users/:id
        console.log("Delete user:", user.id);
        navigate("/users");
    };

    const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setAvatarPreview(URL.createObjectURL(file));
    };

    const currentAvatar = avatarPreview ?? user.avatar;
    const initials =
        `${form.first_name[0] ?? ""}${form.last_name[0] ?? ""}`.toUpperCase();

    return (
        <div className="w-full flex flex-col items-center px-4 py-6">
            <div className="w-full max-w-2xl flex flex-col gap-6">
                {/* ── Back ── */}
                <button
                    onClick={() => navigate("/users")}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit"
                >
                    <ArrowLeft size={15} /> Back to users
                </button>

                {/* ── Header ── */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-gray-900">
                            Edit user
                        </h1>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {form.first_name} {form.last_name} · @
                            {form.username}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowDelete(true)}
                        className="text-sm text-red-400 hover:text-red-600 transition-colors"
                    >
                        Remove user
                    </button>
                </div>

                {/* ── Form card ── */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-6"
                >
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {currentAvatar ? (
                                <img
                                    src={currentAvatar}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-xl text-gray-400 font-semibold">
                                    {initials || "?"}
                                </span>
                            )}
                        </div>
                        <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-gray-600">
                            <Upload size={14} /> Change photo
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatar}
                            />
                        </label>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="First name" required>
                            <input
                                className={inputCls}
                                value={form.first_name}
                                onChange={set("first_name")}
                            />
                            {errors.first_name && (
                                <p className="text-xs text-red-400">
                                    {errors.first_name}
                                </p>
                            )}
                        </Field>
                        <Field label="Last name" required>
                            <input
                                className={inputCls}
                                value={form.last_name}
                                onChange={set("last_name")}
                            />
                            {errors.last_name && (
                                <p className="text-xs text-red-400">
                                    {errors.last_name}
                                </p>
                            )}
                        </Field>
                    </div>

                    {/* Email + Username */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Email" required>
                            <input
                                className={inputCls}
                                type="email"
                                value={form.email}
                                onChange={set("email")}
                            />
                            {errors.email && (
                                <p className="text-xs text-red-400">
                                    {errors.email}
                                </p>
                            )}
                        </Field>
                        <Field label="Username" required>
                            <input
                                className={inputCls}
                                value={form.username}
                                onChange={set("username")}
                            />
                            {errors.username && (
                                <p className="text-xs text-red-400">
                                    {errors.username}
                                </p>
                            )}
                        </Field>
                    </div>

                    {/* Role + Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Role" required>
                            <select
                                className={inputCls}
                                value={form.role}
                                onChange={set("role")}
                            >
                                <option value="admin">Admin</option>
                                <option value="secoops">Secoops</option>
                            </select>
                        </Field>
                        <Field label="Status">
                            <select
                                className={inputCls}
                                value={form.status}
                                onChange={set("status")}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </Field>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Password – optional on edit */}
                    <div>
                        <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-3">
                            Change password{" "}
                            <span className="normal-case tracking-normal font-normal">
                                (leave blank to keep current)
                            </span>
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <Field label="New password">
                                <input
                                    className={inputCls}
                                    type="password"
                                    placeholder="Min. 8 characters"
                                    value={form.password}
                                    onChange={set("password")}
                                />
                                {errors.password && (
                                    <p className="text-xs text-red-400">
                                        {errors.password}
                                    </p>
                                )}
                            </Field>
                            <Field label="Confirm new password">
                                <input
                                    className={inputCls}
                                    type="password"
                                    placeholder="Repeat password"
                                    value={form.password_confirmation}
                                    onChange={set("password_confirmation")}
                                />
                                {errors.password_confirmation && (
                                    <p className="text-xs text-red-400">
                                        {errors.password_confirmation}
                                    </p>
                                )}
                            </Field>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => navigate("/users")}
                            className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            Save changes
                        </button>
                    </div>
                </form>

                {/* ── Delete confirm modal ── */}
                {showDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                        <div className="bg-white rounded-xl border border-gray-100 shadow-lg p-6 max-w-sm w-full mx-4">
                            <h2 className="text-base font-semibold text-gray-900 mb-1">
                                Remove user?
                            </h2>
                            <p className="text-sm text-gray-500 mb-5">
                                This will permanently delete{" "}
                                <strong>
                                    {form.first_name} {form.last_name}
                                </strong>{" "}
                                and cannot be undone.
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setShowDelete(false)}
                                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Edit;
