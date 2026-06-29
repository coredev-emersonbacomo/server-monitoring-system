// File Path: frontend/src/utils/helpers.ts
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
