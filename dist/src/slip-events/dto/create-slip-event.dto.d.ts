import { SLIP_OUTCOMES } from '../types/slip-outcome';
export declare class CreateSlipEventDto {
    outcome: (typeof SLIP_OUTCOMES)[number];
    cigarettesCount?: number;
}
