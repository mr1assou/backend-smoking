export type SimpleTable = {
    name: string;
    table: string;
    delegate: string;
    description: string;
    fields: Record<string, string>;
    relations: Record<string, string>;
};
export declare const simpleSchemaMap: Record<string, SimpleTable>;
export declare const simpleEnums: Record<string, string[]>;
