/**
 * Duration parsing and formatting utilities.
 *
 * Parses human-readable duration strings (e.g. "1h30m", "2d6h", "90s")
 * into total milliseconds, and formats milliseconds back into short canonical form.
 *
 * Supported units:
 *   y  = years   (365 days)
 *   mo = months  (30 days)
 *   w  = weeks   (7 days)
 *   d  = days    (24 hours)
 *   h  = hours   (60 minutes)
 *   m  = minutes (60 seconds)
 *   s  = seconds
 *
 * Rules:
 *   - Unitless numbers default to seconds, converted to ms internally.
 *   - Whitespace is ignored.
 *   - Units are case-insensitive.
 *   - Duplicate units are rejected.
 *   - Negative numbers are rejected.
 *   - Decimal values are supported (e.g. 1.5h).
 */

const UNIT_ORDER: readonly { unit: string; alias: string; ms: number }[] = [
    { unit: 'y',  alias: 'y',  ms: 365 * 86400_000 },
    { unit: 'mo', alias: 'mo', ms: 30 * 86400_000 },
    { unit: 'w',  alias: 'w',  ms: 7 * 86400_000 },
    { unit: 'd',  alias: 'd',  ms: 86400_000 },
    { unit: 'h',  alias: 'h',  ms: 3600_000 },
    { unit: 'm',  alias: 'm',  ms: 60_000 },
    { unit: 's',  alias: 's',  ms: 1000 },
];

const VALID_UNITS = new Set(UNIT_ORDER.map((u) => u.alias));

/**
 * Result of parsing a duration string.
 */
export interface ParseResult {
    valid: boolean;
    milliseconds: number;
    error?: string;
}

/**
 * Parse a duration string into total milliseconds.
 *
 * Unitless numbers are treated as seconds and converted to ms.
 *
 * @example
 * parseDuration('30')       // { valid: true, milliseconds: 30000 }
 * parseDuration('5m')       // { valid: true, milliseconds: 300000 }
 * parseDuration('1h30m')    // { valid: true, milliseconds: 5400000 }
 * parseDuration('2d6h')     // { valid: true, milliseconds: 194400000 }
 * parseDuration('abc')      // { valid: false, milliseconds: 0, error: '...' }
 */
export function parseDuration(input: string): ParseResult {
    const cleaned = input.replace(/\s+/g, '').toLowerCase();

    if (cleaned === '') {
        return { valid: false, milliseconds: 0, error: 'Empty input' };
    }

    if (cleaned.startsWith('-')) {
        return { valid: false, milliseconds: 0, error: 'Negative values are not allowed' };
    }

    // Match sequences of: number (with optional decimal) followed by optional unit
    const tokenPattern = /(\d+(?:\.\d+)?)\s*([a-z]?o?)/g;
    const tokens: { value: number; unit: string; raw: string }[] = [];
    let match: RegExpExecArray | null;

    while ((match = tokenPattern.exec(cleaned)) !== null) {
        const numStr = match[1];
        const unitStr = match[2] || '';
        const raw = match[0];

        tokens.push({
            value: parseFloat(numStr),
            unit: unitStr,
            raw,
        });
    }

    // Check if we consumed the entire string
    const consumed = tokens.reduce((sum, t) => sum + t.raw.length, 0);
    if (consumed !== cleaned.length) {
        return { valid: false, milliseconds: 0, error: `Invalid characters in input` };
    }

    if (tokens.length === 0) {
        return { valid: false, milliseconds: 0, error: 'No valid tokens found' };
    }

    // Validate each token
    const usedUnits = new Set<string>();
    let totalMs = 0;

    for (const token of tokens) {
        const unit = token.unit;

        // Unitless = seconds → convert to ms
        if (unit === '') {
            if (usedUnits.has('s')) {
                return { valid: false, milliseconds: 0, error: 'Duplicate unit: s' };
            }
            usedUnits.add('s');
            totalMs += token.value * 1000;
            continue;
        }

        if (!VALID_UNITS.has(unit)) {
            return { valid: false, milliseconds: 0, error: `Unknown unit: ${unit}` };
        }

        if (usedUnits.has(unit)) {
            return { valid: false, milliseconds: 0, error: `Duplicate unit: ${unit}` };
        }

        usedUnits.add(unit);

        const unitDef = UNIT_ORDER.find((u) => u.alias === unit);
        if (unitDef) {
            totalMs += token.value * unitDef.ms;
        }
    }

    return { valid: true, milliseconds: Math.round(totalMs * 1000) / 1000 };
}

/**
 * Format a number of milliseconds into the shortest canonical duration string.
 *
 * Uses the largest applicable units first, dropping trailing zero units.
 *
 * @example
 * formatDuration(30000)       // '30s'
 * formatDuration(300000)      // '5m'
 * formatDuration(5400000)     // '1h30m'
 * formatDuration(86400000)    // '1d'
 * formatDuration(604800000)   // '1w'
 * formatDuration(31536000000) // '1y'
 */
export function formatDuration(totalMs: number): string {
    if (totalMs <= 0) return '0s';

    const absMs = Math.abs(totalMs);
    let remaining = absMs;
    const parts: string[] = [];

    for (const { alias, ms: unitMs } of UNIT_ORDER) {
        if (unitMs > remaining) continue;

        const count = Math.floor(remaining / unitMs);
        if (count <= 0) continue;

        remaining -= count * unitMs;

        const display = count % 1 === 0 ? count.toString() : count.toFixed(1);
        parts.push(`${display}${alias}`);
    }

    if (parts.length === 0) {
        return '0s';
    }

    return parts.join('');
}
