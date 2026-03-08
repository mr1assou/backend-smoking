import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
declare const JwtStrategy_base: new (...args: any) => any;
export declare class JwtStrategy extends JwtStrategy_base {
    constructor(config: ConfigService);
    validate(payload: {
        sub: string;
        email: string;
        role: UserRole;
    }): {
        sub: string;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
    };
}
export {};
