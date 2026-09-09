// ponytail: shared Laravel paginator envelope. api.json still declares these
// list endpoints as arrays, so this lives here instead of the generated models.ts.
export interface Paginator<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    /** Badge counts for the servers list (same client/search scope, all statuses). */
    counts?: Record<string, number>;
}
