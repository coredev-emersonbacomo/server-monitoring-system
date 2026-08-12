import { z } from "zod";

export const serverInfoSchema = z.object({
    name: z.string().min(1, "Server name is required."),
    description: z.string(),
    subscription_fee: z.union([z.string(), z.number()]).transform((val) => {
        if (typeof val === "number") return val;
        const num = parseFloat(val.replace(/,/g, ""));
        return isNaN(num) ? 0 : num;
    }),
});

export type TimeSpan =
    | "1H"
    | "1D"
    | "1W"
    | "1M"
    | "3M"
    | "6M"
    | "1Y"
    | "3Y"
    | "6Y"
    | "9Y"
    | "12Y"
    | "Custom";

export type TimeSpanArgs = {
    subtract?: string;
    unit: number;
    minUnit?: number;
    fromTime?: string;
    toTime?: string;
};
