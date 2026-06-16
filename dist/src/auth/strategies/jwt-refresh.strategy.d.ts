import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Strategy, type StrategyOptionsWithRequest } from 'passport-jwt';
declare const JwtRefreshStrategy_base: new (...args: [opt: StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtRefreshStrategy extends JwtRefreshStrategy_base {
    constructor(config: ConfigService);
    validate(req: Request, payload: {
        sub: number;
        email: string;
    }): {
        userId: number;
        email: string;
        refreshToken: string;
    } | null;
}
export {};
