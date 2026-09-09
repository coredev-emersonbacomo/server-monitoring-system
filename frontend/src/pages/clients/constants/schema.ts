import { z } from "zod";

export const clientSchema = z.object({
    name: z.string().trim().min(2, "Minimum 2 characters"),
    description: z
        .string()
        .trim()
        .min(2, "Minimum 2 characters")
        .max(255, "Maximum 255 characters"),
    location: z.string().trim().min(2, "Minimum 2 characters"),
    email: z.email("Invalid email address").trim().min(1, "Required"),
    contact_number: z.string().trim().min(5, "Minimum 5 characters"),
    budget: z.union([z.string(), z.number()]).transform((val) => {
        if (val === "" || val === undefined || val === null) return 0;
        const num =
            typeof val === "number"
                ? val
                : parseFloat(String(val).replace(/,/g, ""));
        return isNaN(num) ? 0 : Math.max(0, num);
    }),
});


export type ClientForm = z.infer<typeof clientSchema>;
