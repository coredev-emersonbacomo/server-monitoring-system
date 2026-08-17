import { z } from "zod";

export const profileSchema = z.object({
    first_name: z.string().min(1, "Required"),
    last_name: z.string().min(1, "Required"),
    email: z.string().min(1, "Required"),
    username: z.string().min(1, "Required"),
    phone_number: z.string(),
    timezone: z.string(),
    password: z.string(),
    password_confirmation: z.string(),
});
