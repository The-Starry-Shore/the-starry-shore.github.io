function toBase64(str) {
    return btoa(unescape(encodeURIComponent(str)));
}
function fromBase64(str) {
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch {
        return "";
    }
}
function tokenizeMatch(text, query) {
    if (!query.trim()) return true;
    const tokens = query.toLowerCase().split(/\s+/);
    const field = (text || "").toLowerCase();
    return tokens.every(t => field.includes(t));
}
function displayTier(tier) {
    if (tier === "-1" || tier === -1) return "Mundane";
    if (!isNaN(tier)) return `Tier ${tier}`;
    return tier;
}
function normalizeItemName(name) {
    if (typeof name !== "string") return "";
    return name.trim().toLowerCase();
}
function isAnyModalOpen() {
    return document.querySelector('.modal.show') !== null;
}
const $ = (selector, ctx = document) => ctx.querySelector(selector);
const $$ = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));