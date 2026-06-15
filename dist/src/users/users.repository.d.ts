import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UserDevicePreferencesUpdate } from './types/user-device-preferences';
import type { UserMeProfile, UserOnboardingData } from './types/user-onboarding-data';
export declare class UsersRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    createWithCredentials(email: string, password: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findById(userId: number): Promise<User | null>;
    findMeProfile(userId: number): Promise<UserMeProfile | null>;
    sumSlipCigarettesSince(userId: number, since: Date): Promise<number>;
    updateDevicePreferences(userId: number, data: UserDevicePreferencesUpdate): Promise<User>;
    updateOnboarding(userId: number, data: UserOnboardingData): Promise<{
        user_id: number;
        email: string;
    }>;
    updateRefreshToken(userId: number, hashedRefreshToken: string | null): Promise<User>;
    updateProfileImage(userId: number, imageUrl: string): Promise<User>;
    updateLastOfflineAt(userId: number, at: Date): Promise<User>;
}
