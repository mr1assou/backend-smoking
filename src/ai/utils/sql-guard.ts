/**
 * Agent 4 — deterministic SQL guard: read-only SELECT / WITH…SELECT, single statement, LIMIT cap.
 */

const FORBIDDEN = /\b(insert|update|delete|drop|alter|truncate|create\s+table|create\s+index|create\s+database|grant|revoke|merge\s+into|copy\s*\(|into\s+outfile|pg_sleep|pg_read_file|lo_import|dblink_exec)\b/i;

export type GuardResult = { ok: true; sql: string; notes: string } | { ok: false; error: string };

export function guardReadOnlySelect(raw: string, maxLimit = 100): GuardResult {
    let s = raw.trim();
    if (!s) return { ok: false, error: 'Empty SQL' };

    const withoutTrailingSemi = s.replace(/;+\s*$/g, '');
    if (withoutTrailingSemi.includes(';')) {
        return { ok: false, error: 'Multiple SQL statements are not allowed' };
    }
    s = withoutTrailingSemi;

    if (!/^\s*(select|with)\b/is.test(s)) {
        return { ok: false, error: 'Only SELECT or WITH…SELECT queries are allowed' };
    }

    if (FORBIDDEN.test(s)) {
        return { ok: false, error: 'Forbidden keyword or pattern detected' };
    }

    const { sql, notes } = enforceLimitClause(s, maxLimit);
    return { ok: true, sql, notes };
}

function enforceLimitClause(sql: string, max: number): { sql: string; notes: string } {
    const m = sql.match(/\blimit\s+(\d+)/i);
    if (!m) {
        return { sql: `${sql} LIMIT ${max}`, notes: `Appended LIMIT ${max}.` };
    }
    const n = parseInt(m[1], 10);
    if (Number.isNaN(n) || n < 1) {
        return { sql: sql.replace(/\blimit\s+\d+/i, `LIMIT ${max}`), notes: `Replaced invalid LIMIT with ${max}.` };
    }
    if (n > max) {
        return { sql: sql.replace(/\blimit\s+\d+/i, `LIMIT ${max}`), notes: `Capped LIMIT from ${n} to ${max}.` };
    }
    return { sql, notes: 'LIMIT present and within cap.' };
}

export function extractSqlFence(text: string): string | null {
    const m = text.match(/```(?:sql|postgresql|postgres)?\s*\n([\s\S]*?)```/i);
    return m ? m[1].trim() : null;
}
