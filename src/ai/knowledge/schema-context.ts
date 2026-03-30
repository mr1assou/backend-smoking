import { simpleEnums, simpleSchemaMap, type SimpleTable } from './schema_maps';

const MODEL_KEYS = Object.keys(simpleSchemaMap);

export function serializeFullSchemaForAgents(): string {
    return JSON.stringify({ models: simpleSchemaMap, enums: simpleEnums, modelKeys: MODEL_KEYS }, null, 2);
}

/** Agent 1 returns PascalCase model keys; invalid keys are dropped. */
export function filterSchemaForModels(modelKeys: string[]): Record<string, SimpleTable> {
    const out: Record<string, SimpleTable> = {};
    for (const k of modelKeys) {
        if (simpleSchemaMap[k]) out[k] = simpleSchemaMap[k];
    }
    return out;
}

/** If filtering removed everything, fall back to full map so the pipeline can still run. */
export function resolveFilteredSchema(modelKeys: string[]): {
    filtered: Record<string, SimpleTable>;
    usedFallback: boolean;
} {
    const filtered = filterSchemaForModels(modelKeys);
    if (Object.keys(filtered).length === 0) {
        return { filtered: { ...simpleSchemaMap }, usedFallback: true };
    }
    return { filtered, usedFallback: false };
}
