import { type SimpleTable } from './schema_maps';
export declare function serializeFullSchemaForAgents(): string;
export declare function filterSchemaForModels(modelKeys: string[]): Record<string, SimpleTable>;
export declare function resolveFilteredSchema(modelKeys: string[]): {
    filtered: Record<string, SimpleTable>;
    usedFallback: boolean;
};
