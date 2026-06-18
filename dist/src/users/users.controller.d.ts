import type { Request } from 'express';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateProfileImageDto } from './dto/update-profile-image.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    getMe(req: Request & {
        user: {
            userId: number;
        };
    }): Promise<{
        userId: number;
        email: string;
        name: string | undefined;
        hasCompletedOnboarding: boolean;
        sex: string | undefined;
        country: string | undefined;
        countryFlag: string | undefined;
        currency: string | undefined;
        quitDatePreset: string | undefined;
        quitDate: string | undefined;
        streakStart: string | undefined;
        cigarettesPerDay: number | undefined;
        cigarettesPerPack: number | undefined;
        packPrice: string | undefined;
        timezone: string | undefined;
        motivationCardIndex: number;
        tipsCardIndex: number;
        imageUrl: string | undefined;
        slipCigarettesTotal: number;
        currentAttemptNumber: number;
        freedomPoints: number;
        earnedBadgeIds: string[];
    }>;
    saveOnboarding(req: Request & {
        user: {
            userId: number;
        };
    }, dto: UpdateOnboardingDto): Promise<{
        user_id: number;
        email: string;
    }>;
    updatePreferences(req: Request & {
        user: {
            userId: number;
        };
    }, dto: UpdateUserPreferencesDto): Promise<{
        user_id: number;
        email: string;
        password: string;
        hashedRefreshToken: string | null;
        quitReasons: string[];
        motivation: string | null;
        priorQuitAttempts: string | null;
        primaryInterests: string[];
        username: string | null;
        sex: string | null;
        country: string | null;
        countryFlag: string | null;
        currency: string | null;
        quitDatePreset: string | null;
        quitDate: Date | null;
        streakStart: Date | null;
        cigarettesPerDay: number | null;
        cigarettesPerDayNote: string | null;
        packPrice: string | null;
        yearsSmoking: string | null;
        cigarettesPerPack: number | null;
        timezone: string | null;
        motivationCardIndex: number;
        tipsCardIndex: number;
        image_url: string | null;
        last_offline_at: Date | null;
        freedomPoints: number;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfileImage(req: Request & {
        user: {
            userId: number;
        };
    }, dto: UpdateProfileImageDto): Promise<{
        image_url: string;
    }>;
}
