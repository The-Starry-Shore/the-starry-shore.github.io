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
function smartMatch(text, query) {
    if (!query.trim()) return true;

    // Parse query for terms with special syntax
    const tokens = [];
    const regex = /(!?=?)(\S+)/g;
    let match;

    while ((match = regex.exec(query)) !== null) {
        const prefix = match[1];
        const term = match[2].toLowerCase();

        if (prefix.startsWith("!")) {
            // Negation syntax: !term or !=term
            const isWordBoundary = prefix.includes("=");
            tokens.push({ text: term, negate: true, exact: isWordBoundary });
        } else if (prefix === "=") {
            // Word boundary syntax: =term
            tokens.push({ text: term, negate: false, exact: true });
        } else {
            // Default substring search
            tokens.push({ text: term, negate: false, exact: false });
        }
    }

    const field = (text || "").toLowerCase();

    return tokens.every((token) => {
        let matches;

        if (token.exact) {
            // Word boundary search
            const regex = new RegExp(`\\b${token.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
            matches = regex.test(field);
        } else {
            // Substring search
            matches = field.includes(token.text);
        }

        // Apply negation if specified
        return token.negate ? !matches : matches;
    });
}
function displayTier(tier) {
    if (tier === "-1" || tier === -1) return "Mundane";
    if (!isNaN(tier)) return `Tier ${tier}`;
    return tier;
}
function isAnyModalOpen() {
    return document.querySelector(".modal.show") !== null;
}
const $ = (selector, ctx = document) => ctx.querySelector(selector);
const $$ = (selector, ctx = document) => Array.from(ctx.querySelectorAll(selector));

function searchNotesAndDescription(name, notes, query) {
    if (!query.trim()) return true;

    // First check notes field using smart matching
    if (smartMatch(notes, query)) {
        return true;
    }

    // If notes don't match, check description using smart matching
    if (typeof window.getItemByName === "function") {
        const item = window.getItemByName(name);
        if (item && item.entries) {
            // Convert the entries to a searchable string
            const searchText = JSON.stringify(item.entries);
            return smartMatch(searchText, query);
        }
    }

    return false;
}

function smartHighlight(text, query) {
    if (!query.trim() || !text) return text;

    // Parse query for terms with special syntax, same as smartMatch
    const tokens = [];
    const regex = /(!?=?)(\S+)/g;
    let match;

    while ((match = regex.exec(query)) !== null) {
        const prefix = match[1];
        const term = match[2];

        if (prefix.startsWith("!")) {
            // Skip highlighting negated terms (they exclude results)
            continue;
        } else if (prefix === "=") {
            // Word boundary syntax: =term
            tokens.push({ text: term, exact: true });
        } else {
            // Default substring search
            tokens.push({ text: term, exact: false });
        }
    }

    let result = text;

    for (const token of tokens) {
        if (token.text.length > 1) {
            if (token.exact) {
                // Word boundary highlighting for =term
                const escapedToken = token.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                result = result.replace(new RegExp(`\\b(${escapedToken})\\b`, "gi"), `<mark>$1</mark>`);
            } else {
                // Substring highlighting for default terms
                const escapedToken = token.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                result = result.replace(new RegExp(`(${escapedToken})`, "gi"), `<mark>$1</mark>`);
            }
        }
    }

    return result;
}
