export function time(value?: string | null): string {
    if (!value) return "—";
    const normalized = value.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? String(value) : d.toLocaleString();
}
