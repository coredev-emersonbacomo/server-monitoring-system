// users/Create.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";

type Role = "admin" | "secoops";

interface FormState {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    role: Role;
    status: "active" | "inactive";
    password: string;
    password_confirmation: string;
}

const EMPTY: FormState = {
    first_name: "",
    last_name: "",
    email: "",
    username: "",
    role: "secoops",
    status: "active",
    password: "",
    password_confirmation: "",
};

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

const Create = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState<FormState>(EMPTY);
    const [errors, setErrors] = useState<
        Partial<Record<keyof FormState, string>>
    >({});
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    const set =
        (key: keyof FormState) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setForm((f) => ({ ...f, [key]: e.target.value }));

    const validate = (): boolean => {
        const e: Partial<Record<keyof FormState, string>> = {};
        if (!form.first_name.trim()) e.first_name = "Required";
        if (!form.last_name.trim()) e.last_name = "Required";
        if (!form.email.trim()) e.email = "Required";
        else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
        if (!form.username.trim()) e.username = "Required";
        if (!form.password) e.password = "Required";
        else if (form.password.length < 8) e.password = "Minimum 8 characters";
        if (form.password !== form.password_confirmation)
            e.password_confirmation = "Passwords do not match";
        setErrors(e);
        return Object.keys(e).length === 0;
    };

   const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
        const res = await fetch("/api/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify({
                first_name:            form.first_name,
                last_name:             form.last_name,
                email:                 form.email,
                username:              form.username,
                role_id:               form.role === "admin" ? 1 : 2,
                password:              form.password,
                password_confirmation: form.password_confirmation,
            }),
        });

        if (!res.ok) {
            const data = await res.json();
            // surface Laravel validation errors if any
            if (data.errors) {
                setErrors(data.errors);
            }
            return;
        }

        navigate("/users");
    } catch (err) {
        console.error("Failed to create user:", err);
    }
};      

    const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setAvatarPreview(URL.createObjectURL(file));
    };

    return (
        <div className="w-full flex flex-col items-center px-4 py-6">
            {/* ── Inner container – centered, responsive ── */}
            <div className="w-full max-w-2xl flex flex-col gap-6">
                {/* Back */}
                <button
                    onClick={() => navigate("/users")}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors w-fit"
                >
                    <ArrowLeft size={15} /> Back to users
                </button>

                {/* Header */}
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">
                        Add user
                    </h1>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Create a new account and assign a role.
                    </p>
                </div>

                {/* Form card */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-6"
                >
                    {/* Avatar upload */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Preview"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-xl text-gray-400 font-semibold">
                                    {form.first_name?.[0]?.toUpperCase() || "?"}
                                </span>
                            )}
                        </div>
                        <label className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-gray-600">
                            <Upload size={14} />
                            Upload photo
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatar}
                            />
                        </label>
                    </div>

                    <div className="h-px bg-gray-100" />

                    {/* Name row – stacks on mobile */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="First name" required>
                            <input
                                className={inputCls}
                                placeholder="Ruby"
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
                                placeholder="Arnold"
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
                                placeholder="ruby@devify.com"
                                value={form.email}
                                onChange={set("email")}
                            />
                            {errors.email && (
                                <p className="text-xs text-red-400">
                                    {errors.email}
                                </p>
                            )}
                        </Field>
                        <Field
                            label="Username"
                            required
                            hint="Letters, numbers, and dots only"
                        >
                            <input
                                className={inputCls}
                                placeholder="ruby.arnold"
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

                    {/* Password */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Password" required>
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
                        <Field label="Confirm password" required>
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
                            Create user
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Create;
