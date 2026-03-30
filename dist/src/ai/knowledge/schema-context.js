"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeFullSchemaForAgents = serializeFullSchemaForAgents;
exports.filterSchemaForModels = filterSchemaForModels;
exports.resolveFilteredSchema = resolveFilteredSchema;
const schema_maps_1 = require("./schema_maps");
const MODEL_KEYS = Object.keys(schema_maps_1.simpleSchemaMap);
function serializeFullSchemaForAgents() {
    return JSON.stringify({ models: schema_maps_1.simpleSchemaMap, enums: schema_maps_1.simpleEnums, modelKeys: MODEL_KEYS }, null, 2);
}
function filterSchemaForModels(modelKeys) {
    const out = {};
    for (const k of modelKeys) {
        if (schema_maps_1.simpleSchemaMap[k])
            out[k] = schema_maps_1.simpleSchemaMap[k];
    }
    return out;
}
function resolveFilteredSchema(modelKeys) {
    const filtered = filterSchemaForModels(modelKeys);
    if (Object.keys(filtered).length === 0) {
        return { filtered: { ...schema_maps_1.simpleSchemaMap }, usedFallback: true };
    }
    return { filtered, usedFallback: false };
}
//# sourceMappingURL=schema-context.js.map