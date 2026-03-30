export declare const ENUM_DEFINITIONS: {
    UserRole: {
        values: readonly ["ADMIN", "AUDITOR"];
        description: string;
    };
    AssetStatus: {
        values: readonly ["GOOD", "DAMAGED", "REPAIR", "BROKEN", "TO_REPLACE"];
        description: string;
    };
    LocationType: {
        values: readonly ["HOTEL", "FLOOR", "ZONE", "SUBZONE"];
        description: string;
    };
    AlertType: {
        values: readonly ["DAMAGED", "REPAIR", "REPLACE", "NOT_SCANNED"];
        description: string;
    };
    AlertStatus: {
        values: readonly ["OPEN", "RESOLVED"];
        description: string;
    };
};
export interface SchemaField {
    name: string;
    type: string;
    description: string;
    isRelation?: boolean;
    isOptional?: boolean;
    isUnique?: boolean;
    isEnum?: boolean;
}
export interface SchemaRelationship {
    model: string;
    type: 'belongsTo' | 'hasMany' | 'hasOne';
    foreignKey: string;
    description: string;
    namedRelation?: string;
}
export interface SchemaTable {
    prismaModel: string;
    dbTable: string;
    description: string;
    synonyms: string[];
    fields: SchemaField[];
    relationships: SchemaRelationship[];
}
export declare const SCHEMA_MAP: SchemaTable[];
export declare const PRISMA_MODEL_IDENTIFIERS: readonly string[];
export declare function getTableResolutionContext(): string;
export declare function normalizePrismaModelName(name: string): string | undefined;
export declare function getSchemaOverview(): string;
export declare function getTableDefinitions(tableNames: string[]): string;
export declare function getEnumDefinitions(): string;
