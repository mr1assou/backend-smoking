export type UserDevicePreferencesUpdate = {
    timezone?: string | null;
    motivationCardIndex?: number;
    tipsCardIndex?: number;
    savedTipCardIds?: string[];
    savedMotivationCardIds?: string[];
};
