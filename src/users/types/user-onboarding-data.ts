/** Fields persisted from onboarding step 1–6 (labels / text). */
export type UserOnboardingData = {
  quitReasons: string[];
  quitReasonOtherText: string | null;
  motivation: string | null;
  motivationOtherText: string | null;
  priorQuitAttempts: string | null;
  priorQuitAttemptsOtherText: string | null;
  primaryInterests: string[];
  primaryInterestOtherText: string | null;
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
  image_url?: string | null;
};

export type UserMeProfile = {
  user_id: number;
  email: string;
  username: string | null;
  isPremium: boolean;
  sex: string | null;
  country: string | null;
  countryFlag: string | null;
  currency: string | null;
  quitDatePreset: string | null;
  quitDate: Date | null;
  streakStart: Date | null;
  cigarettesPerDay: number | null;
  cigarettesPerPack: number | null;
  packPrice: string | null;
  image_url: string | null;
  freedomPoints: number;
  motivationCardIndex: number;
  tipsCardIndex: number;
  savedTipCardIds: string[];
  savedMotivationCardIds: string[];
  role: string;
};
