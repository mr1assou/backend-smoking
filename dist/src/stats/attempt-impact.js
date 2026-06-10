"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePackPrice = parsePackPrice;
exports.computeAttemptImpact = computeAttemptImpact;
const MS_PER_DAY = 86_400_000;
const LIFE_MINUTES_PER_CIG = 20;
function parsePackPrice(value) {
    if (!value?.trim())
        return 0;
    const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
}
function computeAttemptImpact(economics, startedAt, endedAt, slipCigarettesSmoked) {
    const durationMs = Math.max(0, endedAt.getTime() - startedAt.getTime());
    const durationSeconds = Math.floor(durationMs / 1000);
    const gross = (Math.max(0, economics.cigarettesPerDay) * durationMs) / MS_PER_DAY;
    const avoided = Math.max(0, Math.floor(gross) - Math.max(0, slipCigarettesSmoked));
    const perPack = Math.max(1, economics.cigarettesPerPack);
    return {
        durationSeconds,
        cigarettesAvoided: avoided,
        moneySaved: (avoided / perPack) * economics.packPrice,
        lifeMinutesGained: avoided * LIFE_MINUTES_PER_CIG,
        slipCigarettesSmoked: Math.max(0, slipCigarettesSmoked),
    };
}
//# sourceMappingURL=attempt-impact.js.map