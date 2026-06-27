import type { FreedomPointLedgerRow } from '../../freedom-points/types/freedom-point-ledger-row';

export type { FreedomPointLedgerRow };

export type StatsFreedomPointsResponse = {
  totalFreedomPoints: number;
  entries: FreedomPointLedgerRow[];
};
