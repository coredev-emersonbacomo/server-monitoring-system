// File Path: frontend\src\utils\helpers.ts

export function formatCurrency(
    value: number | string | null | undefined,
    options: {
        currency?: string;
        decimals?: number;
        suffix?: string;
    } = {},
): string {
    const { currency = "₱", decimals = 2, suffix = "" } = options;
    const num = Number(value) || 0;

    return `${currency}${num.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })}${suffix}`;
}


export function toLabelCase(
    key: string | null | undefined,
    preserveDash: boolean = false,
): string {
    let result = key ?? "";

    // Replace underscores with space
    result = result.replace(/_/g, " ");

    if (!preserveDash) {
        // Replace dashes with space unless preserving
        result = result.replace(/-/g, " ");
    }

    // Insert space before capital letters (but not before first letter)
    result = result.replace(/([a-z])([A-Z])/g, "$1 $2");

    // Capitalize words but retain all-uppercase acronyms
    result = result.replace(/\b\w+/g, (word) =>
        word === word.toUpperCase()
            ? word
            : word[0].toUpperCase() + word.slice(1).toLowerCase(),
    );

    return result.trim();
}

export function formatPhoneNumber(value: string): string {
    return value.replace(/\D/g, "").slice(0, 11);
}

export function formatContactNumber(value?: string | null): string {
    if (!value) return "";
    const digits = value.replace(/\D/g, "");
    if (digits.length === 11) {
        return `${digits.slice(0, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 12) {
        return `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`;
    }
    if (digits.length === 7) {
        return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    }
    if (digits.length === 8) {
        return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    }
    return value;
}
