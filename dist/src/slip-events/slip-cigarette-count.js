"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LAPSE_CIGARETTE_COUNT = void 0;
exports.resolveSlipCigarettesCount = resolveSlipCigarettesCount;
exports.LAPSE_CIGARETTE_COUNT = 1;
function resolveSlipCigarettesCount(outcome, cigarettesCount) {
    if (outcome === 'lapse') {
        return exports.LAPSE_CIGARETTE_COUNT;
    }
    return cigarettesCount;
}
//# sourceMappingURL=slip-cigarette-count.js.map