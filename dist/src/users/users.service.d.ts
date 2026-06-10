import { User } from '@prisma/client';
import { AttemptsService } from '../attempts/attempts.service';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { UpdateUserPreferencesDto } from './dto/update-user-preferences.dto';
import { UsersRepository } from './users.repository';
export declare class UsersService {
    private readonly usersRepository;
    private readonly attemptsService;
    constructor(usersRepository: UsersRepository, attemptsService: AttemptsService);
    createWithHashedPassword(email: string, hashedPassword: string): Promise<User>;
    findByEmail(email: string): Promise<User | null>;
    findById(userId: number): Promise<User | null>;
    findOrCreateByEmail(email: string, hashedPassword: string): Promise<{
        user: User;
        isNewUser: boolean;
    }>;
    updateOnboarding(userId: number, dto: UpdateOnboardingDto): Promise<{
        user_id: number;
        email: string;
    }>;
    updatePreferences(userId: number, dto: UpdateUserPreferencesDto): Promise<{
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
        createdAt: Date;
        updatedAt: Date;
    }>;
    setRefreshTokenHash(userId: number, hashedRefreshToken: string | null): Promise<void>;
    getMe(userId: number): Promise<{
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
        slipCigarettesTotal: number;
        currentAttemptNumber: number;
    }>;
    private mapOnboardingDtoToData;
    private resolveQuitDate;
}
