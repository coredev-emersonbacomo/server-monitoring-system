import { z } from "zod";

export const profileSchema = z    .object({
        first_name: z.string().min(1, "Required"),
        last_name: z.string().min(1, "Required"),
        email: z.string().min(1, "Required"),
        username: z.string().min(1, "Required"),
        phone_number: z.string(),
        timezone: z.string(),
        password: z.string(),
        password_confirmation: z.string(),
    })
    .superRefine((data, ctx) => {
        const password = data.password ?? "";
        const confirmation = data.password_confirmation ?? "";
        if (confirmation && confirmation !== password) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["password_confirmation"],
                message: "Passwords must match",
            });
        }
    });


export type ProfileForm = z.infer<typeof profileSchema>;
