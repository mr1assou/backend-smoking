"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.utcInstantNow = utcInstantNow;
exports.toUtcIso = toUtcIso;
function utcInstantNow() {
    return new Date();
}
function toUtcIso(date) {
    return date.toISOString();
}
//# sourceMappingURL=utc-instant.js.map