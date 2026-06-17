// users/Index.tsx
import React, { useState, useMemo } from "react";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProfileCard from "@/components/ProfileCard";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Mock data (replace with API call) ────────────────────────────────────────

const INITIAL_USERS: User[] = [
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
        avatar: undefined,
    },
   
];

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    sub,
}: {
    label: string;
    value: number | string;
    sub?: string;
}) {
    return (
        <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-0.5">
                {label}
            </p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = "all" | "active" | "inactive" | Role;

const TABS: { label: string; value: FilterTab }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "Admin", value: "admin" },
    { label: "Secoops", value: "secoops" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

const Users = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<User[]>(INITIAL_USERS);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterTab>("all");

    const visible = useMemo(() => {
        const q = search.toLowerCase();
        return users.filter((u) => {
            const matchSearch =
                !q ||
                `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q);
            const matchFilter =
                filter === "all" || u.status === filter || u.role === filter;
            return matchSearch && matchFilter;
        });
    }, [search, filter, users]);

    const handleDelete = (id: number) => {
        if (confirm("Remove this user?")) {
            setUsers((prev) => prev.filter((u) => u.id !== id));
        }
    };

    const activeCount = users.filter((u) => u.status === "active").length;
    const inactiveCount = users.filter((u) => u.status === "inactive").length;
    const adminCount = users.filter((u) => u.role === "admin").length;

    return (
        <div className="flex flex-col gap-5">
            {/* ── Header ── */}
            <div>
                <h1 className="text-xl font-semibold text-gray-900">
                    User Management
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                    Manage accounts and assign roles.
                </p>
            </div>
            
            {/* ── Toolbar ── */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="relative flex-1 max-w-xs">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            placeholder="Search users…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400"
                        />
                    </div>
                    <div className="flex gap-1">
                        {TABS.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => setFilter(t.value)}
                                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                                    filter === t.value
                                        ? "bg-gray-900 text-white border-gray-900"
                                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => navigate("/users/create")}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                    <Plus size={15} /> Add user
                </button>
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-4 gap-3">
                <StatCard label="Total users" value={users.length} />
                <StatCard
                    label="Active"
                    value={activeCount}
                    sub={`${Math.round((activeCount / users.length) * 100)}% of total`}
                />
                <StatCard label="Inactive" value={inactiveCount} />
                <StatCard
                    label="Admins"
                    value={adminCount}
                    sub="Secoops below admin"
                />
            </div>

            {/* ── Section label ── */}
            <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">
                {visible.length} user{visible.length !== 1 ? "s" : ""}
            </p>

            {/* ── Card grid ── */}
            {visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Search size={32} className="mb-3 opacity-30" />
                    <p className="text-sm">No users match your search.</p>
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                    {visible.map((u) => (
                        <ProfileCard
                            key={u.id}
                            id={u.id}
                            name={`${u.first_name} ${u.last_name}`}
                            email={u.email}
                            role={u.role === "admin" ? "Admin" : "Secoops"}
                            imageUrl={u.avatar}
                            status={u.status}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default Users;
