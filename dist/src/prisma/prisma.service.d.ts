import { OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private config;
    private readonly driverPool;
    constructor(config: ConfigService);
    queryReadOnlySql(sql: string): Promise<Record<string, unknown>[]>;
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
