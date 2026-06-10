import { ConfigService } from '@nestjs/config';
export type VerifiedGoogleUser = {
    email: string;
    name?: string;
};
export declare class GoogleTokenService {
    private config;
    private readonly client;
    constructor(config: ConfigService);
    verifyIdToken(idToken: string): Promise<VerifiedGoogleUser>;
    getWebClientId(): string | undefined;
}
