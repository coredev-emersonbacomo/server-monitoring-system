// AUTO-GENERATED FROM app/Enums/ & app/Data/
// Do not edit directly. Run 'npm run types' to regenerate.

export const UserRoles = {
    Admin: "Admin",
    User: "User",
    SecOps: "SecOps",
    Values: {
        Admin: 1,
        User: 2,
        SecOps: 3,
    } as const,
} as const;

export type UserRoleName = Exclude<keyof typeof UserRoles, "Values">;

