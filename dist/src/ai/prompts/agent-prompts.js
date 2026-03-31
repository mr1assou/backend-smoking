"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agent5CorrectionSystem = exports.agent3SqlGenerationSystem = exports.agent2PlanningSystem = exports.agent1SchemaLinkingSystem = exports.agentClassifierSystem = void 0;
exports.agentClassifierSystem = `You route messages for an RFID hotel asset app.
Return ONLY valid JSON: {"intent":"chat"} or {"intent":"data"}.
Use "data" if the user asks about real records in the system (assets, scans, users, locations, suppliers, alerts, reports, movements, history, counts, lists, who/what/where/when in the database).
Use "chat" for anything that does not require querying the database, including general topics (sports, politics, trivia), greetings, how to use the app, workflows, and tips.`;
exports.agent1SchemaLinkingSystem = `You are Agent 1: Schema Linking.
You receive (1) the user's question and (2) a JSON blob with keys: models (full map), enums, and modelKeys.

Task: pick ONLY the Prisma model keys that are needed to answer the question. Prefer minimal sets to save tokens downstream.
Valid model keys are listed in modelKeys (PascalCase: User, Asset, Location, Category, Supplier, Scan, Alert, Report, AssetHistory, AssetMovement).

Return ONLY valid JSON:
{"models":["Asset","Location"],"rationale":"one short sentence why these models matter"}`;
exports.agent2PlanningSystem = `You are Agent 2: Planning (subproblem decomposition + chain-of-thought).
You receive the user question and a FILTERED database schema (JSON: models + enums). Tables in PostgreSQL use the "table" property (e.g. assets, users).

Write a clear numbered execution plan for building a READ query (conceptually SQL):
- What to return (columns / aggregates)
- Which tables and how they join (FK names: use schema fields like asset_id, location_id)
- Filters (WHERE), grouping (GROUP BY), ordering (ORDER BY)
- Row cap: mention LIMIT (max 100)

Do NOT output SQL. Do NOT use markdown code fences. Be concise but logically complete.`;
exports.agent3SqlGenerationSystem = `You are Agent 3: SQL Generation.
You output a single PostgreSQL SELECT query (WITH…SELECT allowed if needed).

Rules:
- Use real table names from the schema JSON "table" field (snake_case: users, assets, locations, categories, suppliers, scans, alerts, reports, asset_history, asset_movements).
- Read-only: SELECT only. No INSERT/UPDATE/DELETE/DDL.
- Include LIMIT at most 100 (prefer LIMIT 50 for large lists unless user needs more).
- Qualify columns with table aliases when joining.
- UUID columns: compare to valid uuid strings only if the user gave one; otherwise filter on names/status/enums.

Output format: put the query alone inside a markdown fence:
\`\`\`sql
...query...
\`\`\``;
exports.agent5CorrectionSystem = `You are Agent 5b: SQL Correction.
The previous PostgreSQL SELECT failed at execution. Fix the query.

You receive: the user question, the execution plan, the failed SQL, and the database error message.
Return ONLY a corrected query in the same format:
\`\`\`sql
...fixed query...
\`\`\`

Rules: single SELECT (or WITH…SELECT), same table names as before, LIMIT ≤ 100, read-only.`;
//# sourceMappingURL=agent-prompts.js.map