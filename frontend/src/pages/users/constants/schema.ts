import { z } from "zod";

export const BROWSER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export const userSchema = z
    .object({
        first_name: z.string().trim().min(1, "Required"),
        last_name: z.string().trim().min(1, "Required"),
        email: z.email("Invalid email").trim().min(1, "Required"),
        username: z.string().trim().min(1, "Required"),
        timezone: z.string().min(1, "Required"),
        phone_number: z
            .string()
            .trim()
            .min(1, "Required")
            .regex(
                /^09\d{9}$/,
                "Must be a valid PH number starting with 09 (e.g. 09123456789)",
            ),
        password: z.string().superRefine((val, ctx) => {
            if (val && val.length < 8)
                ctx.addIssue({
                    code: "custom",
                    message: "Minimum 8 characters",
                });
        }),
        password_confirmation: z.string(),
    })
    .superRefine((data, ctx) => {
        if (data.password && data.password !== data.password_confirmation) {
            ctx.addIssue({
                code: "custom",
                path: ["password_confirmation"],
                message: "Passwords do not match",
            });
        }
    });
