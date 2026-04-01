"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.guardReadOnlySelect = guardReadOnlySelect;
exports.extractSqlFence = extractSqlFence;
const FORBIDDEN = /\b(insert|update|delete|drop|alter|truncate|create\s+table|create\s+index|create\s+database|grant|revoke|merge\s+into|copy\s*\(|into\s+outfile|pg_sleep|pg_read_file|lo_import|dblink_exec)\b/i;
function guardReadOnlySelect(raw, maxLimit = 100) {
    let s = raw.trim();
    if (!s)
        return { ok: false, error: 'Empty SQL' };
    const withoutTrailingSemi = s.replace(/;+\s*$/g, '');
    if (withoutTrailingSemi.includes(';')) {
        return { ok: false, error: 'Multiple SQL statements are not allowed' };
    }
    s = withoutTrailingSemi;
    if (!/^\s*(select|with)\b/is.test(s)) {
        return {
            ok: false,
            error: 'Only SELECT or WITH…SELECT queries are allowed',
        };
    }
    if (FORBIDDEN.test(s)) {
        return { ok: false, error: 'Forbidden keyword or pattern detected' };
    }
    const { sql, notes } = enforceLimitClause(s, maxLimit);
    return { ok: true, sql, notes };
}
function enforceLimitClause(sql, max) {
    const m = sql.match(/\blimit\s+(\d+)/i);
    if (!m) {
        return { sql: `${sql} LIMIT ${max}`, notes: `Appended LIMIT ${max}.` };
    }
    const n = parseInt(m[1], 10);
    if (Number.isNaN(n) || n < 1) {
        return {
            sql: sql.replace(/\blimit\s+\d+/i, `LIMIT ${max}`),
            notes: `Replaced invalid LIMIT with ${max}.`,
        };
    }
    if (n > max) {
        return {
            sql: sql.replace(/\blimit\s+\d+/i, `LIMIT ${max}`),
            notes: `Capped LIMIT from ${n} to ${max}.`,
        };
    }
    return { sql, notes: 'LIMIT present and within cap.' };
}
function extractSqlFence(text) {
    const m = text.match(/```(?:sql|postgresql|postgres)?\s*\n([\s\S]*?)```/i);
    return m ? m[1].trim() : null;
}
//# sourceMappingURL=sql-guard.js.map