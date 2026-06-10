export type AttemptEconomics = {
    cigarettesPerDay: number;
    cigarettesPerPack: number;
    packPrice: number;
};
export type AttemptImpactSnapshot = {
    durationSeconds: number;
    cigarettesAvoided: number;
    moneySaved: number;
    lifeMinutesGained: number;
    slipCigarettesSmoked: number;
};
export declare function parsePackPrice(value: string | null | undefined): number;
export declare function computeAttemptImpact(economics: AttemptEconomics, startedAt: Date, endedAt: Date, slipCigarettesSmoked: number): AttemptImpactSnapshot;
