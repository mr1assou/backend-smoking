export type FreedomPointLedgerRow = {
  id: number;
  amount: number;
  sourceType: string;
  sourceKey: string;
  earnedAt: string;
  attemptId: number | null;
  attemptNumber: number | null;
};
