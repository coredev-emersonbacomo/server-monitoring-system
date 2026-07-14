/**
 * Duration parsing and formatting utilities.
 *
 * Parses human-readable duration strings (e.g. "1h30m", "2d6h", "90s")
 * into total seconds, and formats seconds back into short canonical form.
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
 *   - Unitless numbers default to seconds.
 *   - Whitespace is ignored.
 *   - Units are case-insensitive.
 *   - Duplicate units are rejected.
 *   - Negative numbers are rejected.
 *   - Decimal values are supported (e.g. 1.5h).
 */

const UNIT_ORDER: readonly { unit: string; alias: string; seconds: number }[] = [
    { unit: 'y',  alias: 'y',  seconds: 365 * 86400 },
    { unit: 'mo', alias: 'mo', seconds: 30 * 86400 },
    { unit: 'w',  alias: 'w',  seconds: 7 * 86400 },
    { unit: 'd',  alias: 'd',  seconds: 86400 },
    { unit: 'h',  alias: 'h',  seconds: 3600 },
    { unit: 'm',  alias: 'm',  seconds: 60 },
    { unit: 's',  alias: 's',  seconds: 1 },
];

const VALID_UNITS = new Set(UNIT_ORDER.map((u) => u.alias));

/**
 * Result of parsing a duration string.
 */
export interface ParseResult {
    valid: boolean;
    seconds: number;
    error?: string;
}

/**
 * Parse a duration string into total seconds.
 *
 * @example
 * parseDuration('30')       // { valid: true, seconds: 30 }
 * parseDuration('5m')       // { valid: true, seconds: 300 }
 * parseDuration('1h30m')    // { valid: true, seconds: 5400 }
 * parseDuration('2d6h')     // { valid: true, seconds: 194400 }
 * parseDuration('1w2d')     // { valid: true, seconds: 777600 }
 * parseDuration('abc')      // { valid: false, seconds: 0, error: '...' }
 */
export function parseDuration(input: string): ParseResult {
    const cleaned = input.replace(/\s+/g, '').toLowerCase();

    if (cleaned === '') {
        return { valid: false, seconds: 0, error: 'Empty input' };
    }

    if (cleaned.startsWith('-')) {
        return { valid: false, seconds: 0, error: 'Negative values are not allowed' };
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
        return { valid: false, seconds: 0, error: `Invalid characters in input` };
    }

    if (tokens.length === 0) {
        return { valid: false, seconds: 0, error: 'No valid tokens found' };
    }

    // Validate each token
    const usedUnits = new Set<string>();
    let totalSeconds = 0;

    for (const token of tokens) {
        const unit = token.unit;

        // Unitless = seconds
        if (unit === '') {
            if (usedUnits.has('s')) {
                return { valid: false, seconds: 0, error: 'Duplicate unit: s' };
            }
            usedUnits.add('s');
            totalSeconds += token.value;
            continue;
        }

        if (!VALID_UNITS.has(unit)) {
            return { valid: false, seconds: 0, error: `Unknown unit: ${unit}` };
        }

        if (usedUnits.has(unit)) {
            return { valid: false, seconds: 0, error: `Duplicate unit: ${unit}` };
        }

        usedUnits.add(unit);

        const unitDef = UNIT_ORDER.find((u) => u.alias === unit);
        if (unitDef) {
            totalSeconds += token.value * unitDef.seconds;
        }
    }

    return { valid: true, seconds: Math.round(totalSeconds * 1000) / 1000 };
}

/**
 * Format a number of seconds into the shortest canonical duration string.
 *
 * Uses the largest applicable units first, dropping trailing zero units.
 *
 * @example
 * formatDuration(30)      // '30s'
 * formatDuration(300)     // '5m'
 * formatDuration(5400)    // '1h30m'
 * formatDuration(86400)   // '1d'
 * formatDuration(604800)  // '1w'
 * formatDuration(31536000)// '1y'
 */
export function formatDuration(totalSeconds: number): string {
    if (totalSeconds <= 0) return '0s';

    const absSeconds = Math.abs(totalSeconds);
    let remaining = absSeconds;
    const parts: string[] = [];

    for (const { alias, seconds: unitSeconds } of UNIT_ORDER) {
        if (unitSeconds > remaining) continue;

        const count = Math.floor(remaining / unitSeconds);
        if (count <= 0) continue;

        remaining -= count * unitSeconds;

        // Show decimals only for the smallest unit that has a remainder
        const display = count % 1 === 0 ? count.toString() : count.toFixed(1);
        parts.push(`${display}${alias}`);
    }

    if (parts.length === 0) {
        return '0s';
    }

    return parts.join('');
}

/**
 * Convert a colon-format duration string (MM:DD:HH:MM:SS) to seconds.
 * Used for backward compatibility with the existing node config storage format.
 *
 * @example
 * colonToSeconds('00:00:00:10:00')  // 600 (10 minutes)
 * colonToSeconds('00:00:01:30:00')  // 5400 (1 hour 30 minutes)
 */
export function colonToSeconds(colon: string): number {
    const parts = colon.split(':');
    const padded = [...parts, ...Array(Math.max(0, 5 - parts.length)).fill('0')].slice(0, 5);
    const [months, days, hours, minutes, seconds] = padded.map(Number);

    return (
        (months || 0) * 30 * 86400 +
        (days || 0) * 86400 +
        (hours || 0) * 3600 +
        (minutes || 0) * 60 +
        (seconds || 0)
    );
}

/**
 * Convert seconds to colon-format duration string (MM:DD:HH:MM:SS).
 * Used for backward compatibility with the existing node config storage format.
 *
 * @example
 * secondsToColon(600)     // '00:00:00:10:00'
 * secondsToColon(5400)    // '00:00:01:30:00'
 */
export function secondsToColon(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));

    const months = Math.floor(s / (30 * 86400));
    const remainingAfterMonths = s - months * 30 * 86400;
    const days = Math.floor(remainingAfterMonths / 86400);
    const remainingAfterDays = remainingAfterMonths - days * 86400;
    const hours = Math.floor(remainingAfterDays / 3600);
    const remainingAfterHours = remainingAfterDays - hours * 3600;
    const minutes = Math.floor(remainingAfterHours / 60);
    const seconds = remainingAfterHours - minutes * 60;

    return [months, days, hours, minutes, seconds]
        .map((n) => String(n).padStart(2, '0'))
        .join(':');
}
