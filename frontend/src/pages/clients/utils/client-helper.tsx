    // Path: frontend/src/pages/clients/utils/client-helper.tsx
    const MOBILE_REGEX = /^09\d{9}$/;
    const TELEPHONE_REGEX = /^0(?!9)\d{6,9}$/;

    export type ContactNumberType = "mobile" | "telephone" | "invalid";

    export function getContactNumberType(value: string): ContactNumberType {
        const digits = value.replace(/\D/g, "");
        if (MOBILE_REGEX.test(digits)) return "mobile";
        if (TELEPHONE_REGEX.test(digits)) return "telephone";
        return "invalid";
    }


    export function formatContactNumber(value: string): string {
        return value.replace(/[^\d-]/g, "");
    }

    export function validateContactNumber(value: string): string | undefined {
        const digits = value.replace(/\D/g, "");
        if (!digits) return "Contact number is required";

        const type = getContactNumberType(digits);
        if (type === "invalid") {
            return "Enter a valid mobile (09XXXXXXXXX) or telephone number";
        }
        return undefined;
    }