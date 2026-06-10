declare class OnboardingStep1Dto {
    quitReasons: string[];
}
declare class OnboardingStep2Dto {
    motivation?: string;
}
declare class OnboardingStep3Dto {
    priorQuitAttempts?: string;
}
declare class OnboardingStep4Dto {
    primaryInterests: string[];
}
declare class OnboardingStep5Dto {
    username: string;
    sex?: string;
    country?: string;
    countryFlag?: string;
    currency: string;
    quitDatePreset?: string;
    quitDate?: string;
}
declare class OnboardingStep6Dto {
    cigarettesPerDay: number;
    cigarettesPerDayNote?: string;
    packPrice?: string;
    yearsSmoking?: string;
    cigarettesPerPack: number;
}
export declare class UpdateOnboardingDto {
    step1: OnboardingStep1Dto;
    step2: OnboardingStep2Dto;
    step3: OnboardingStep3Dto;
    step4: OnboardingStep4Dto;
    step5: OnboardingStep5Dto;
    step6: OnboardingStep6Dto;
}
export {};
