import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
declare const JwtRefreshStrategy_base: new (...args: any) => any;
export declare class JwtRefreshStrategy extends JwtRefreshStrategy_base {
    constructor(config: ConfigService);
    validate(req: Request, payload: {
        sub: number;
        email: string;
    }): {
        userId: number;
        email: string;
        refreshToken: any;
    };
}
export {};
