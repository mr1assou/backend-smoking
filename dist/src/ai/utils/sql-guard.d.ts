export type GuardResult = {
    ok: true;
    sql: string;
    notes: string;
} | {
    ok: false;
    error: string;
};
export declare function guardReadOnlySelect(raw: string, maxLimit?: number): GuardResult;
export declare function extractSqlFence(text: string): string | null;
