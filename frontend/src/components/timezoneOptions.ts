// Timezone list + GMT offset labels. Split from TimezoneCombobox so the
// component file only exports components (react-refresh).
export const TIMEZONE_OPTIONS = Intl.supportedValuesOf("timeZone");

export function tzOffsetLabel(timeZone: string): string {
    try {
        const part = new Intl.DateTimeFormat("en-US", {
            timeZone,
            timeZoneName: "shortOffset",
        })
            .formatToParts(new Date())
            .find((p) => p.type === "timeZoneName");
        const raw = part?.value ?? "";
        const m = raw.match(/^GMT([+-])(\d{2}):?(\d{2})?$/);
        if (!m) return raw;
        const hh = Number(m[2]);
        const mm = m[3] ? Number(m[3]) : 0;
        return `GMT${m[1]}${hh}${mm ? `:${String(mm).padStart(2, "0")}` : ""}`;
    } catch {
        return "";
    }
}
