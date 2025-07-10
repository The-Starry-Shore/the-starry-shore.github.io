const LOG_SKIP_BOOKS = [];
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTRKO_HA7OFVQBE2SZrrpSJdxI6_l39tP75SHo81JObYa9PfbCWDR2gTlAt3VoRyRfAN_iW3ZQljezr/pub?gid=0&single=true&output=csv";
const CACHE_BUSTER = Date.now();
const CART_EXPORT_PASSWORD = "cart-export-2024";
const ITEM_JSON_FILES = ["https://raw.githubusercontent.com/5etools-mirror-3/5etools-2014-src/refs/heads/main/data/items.json", "https://raw.githubusercontent.com/5etools-mirror-3/5etools-2014-src/refs/heads/main/data/items-base.json", "https://raw.githubusercontent.com/5etools-mirror-3/5etools-2014-src/refs/heads/main/data/magicvariants.json"];
const KNOWN_ARRAY_KEYS = ["item", "baseitem", "magicvariant"];

let nameAliases = {}; // Will be loaded from custom_mapping.json
let allData = [];
let itemsData = [];
let sortCol = null;
let sortAsc = true;
let selectedRowName = null;
let item_data = {}; // Key: normalized name, Value: item object

function encryptCart(cartObj) {
    const json = JSON.stringify(cartObj);
    const encrypted = CryptoJS.AES.encrypt(json, CART_EXPORT_PASSWORD).toString();
    return btoa(encrypted);
}

function decryptCart(str) {
    try {
        const encrypted = atob(str);
        const decrypted = CryptoJS.AES.decrypt(encrypted, CART_EXPORT_PASSWORD).toString(CryptoJS.enc.Utf8);
        return JSON.parse(decrypted);
    } catch {
        return null;
    }
}

function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                cell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === "," && !inQuotes) {
            row.push(cell);
            cell = "";
        } else if ((char === "\n" || char === "\r") && !inQuotes) {
            if (cell !== "" || row.length > 0) row.push(cell);
            if (row.length) rows.push(row.map((c) => c.trim()));
            row = [];
            cell = "";
            if (char === "\r" && text[i + 1] === "\n") i++;
        } else {
            cell += char;
        }
    }
    if (cell !== "" || row.length > 0) row.push(cell);
    if (row.length) rows.push(row.map((c) => c.trim()));
    return rows;
}

async function fetchCSV(url) {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(url + sep + "v=" + CACHE_BUSTER);
    const text = await res.text();
    return parseCSV(text);
}

async function fetchJSON(url) {
    const sep = url.includes("?") ? "&" : "?";
    const res = await fetch(url + sep + "v=" + CACHE_BUSTER);
    return res.json();
}

async function tryFetchJSON(url) {
    try {
        return await fetchJSON(url);
    } catch (e) {
        return null;
    }
}

async function loadAllBatchedJsonData() {
    let loadedCount = 0;
    for (const file of ITEM_JSON_FILES) {
        const data = await tryFetchJSON(file);
        let arr = [];
        if (Array.isArray(data)) {
            arr = data;
        } else if (data && typeof data === "object") {
            for (const key of KNOWN_ARRAY_KEYS) {
                if (Array.isArray(data[key])) {
                    arr = data[key];
                    break;
                }
            }
        }
        if (arr.length) {
            itemsData.push(...arr);
            loadedCount += arr.length;
        }
    }
}

async function loadData() {
    console.log("loadData called");
    try {
        // --- Load mapping config FIRST ---
        const mappingObj = await fetchJSON("/2014_item_shop/custom_mapping.json");
        const stripList = mappingObj.strip || [];
        const replaceList = mappingObj.replace || [];
        const remap = mappingObj.remap || {};

        // 1. Load CSV
        const csvRows = await fetchCSV(CSV_URL);
        allData = csvRows.slice(1);

        // Normalize rarity column (column 7) to proper case
        allData.forEach((row) => {
            if (row[7]) {
                row[7] = normalizeRarityCase(row[7]);
            }
        });

        allData.sort((a, b) => {
            const ta = parseInt(a[0], 10);
            const tb = parseInt(b[0], 10);
            if (ta === -1 && tb !== -1) return -1;
            if (tb === -1 && ta !== -1) return 1;
            if (ta === 0 && tb !== 0) return -1;
            if (tb === 0 && ta !== 0) return 1;
            return ta - tb;
        });

        // 2. Load custom_items.json into item_data (initially only custom items)
        const customItemsArr = await fetchJSON("/2014_item_shop/custom_items.json");
        item_data = {};
        if (Array.isArray(customItemsArr)) {
            for (const item of customItemsArr) {
                item_data[item.name] = item;
            }
        }

        // 2b. Load custom_mapping.json into nameAliases
        nameAliases = {};
        for (const [csvName, mirrorName] of Object.entries(remap)) {
            nameAliases[normalizeForMapping(csvName, stripList, replaceList)] = normalizeForMapping(mirrorName, stripList, replaceList);
        }

        // 3. Render table immediately (no mirror data yet)
        if (typeof renderTable === "function") renderTable(allData);

        // 4. Start loading mirror data in the background
        setTimeout(() => loadMirrorDataInBackground(mappingObj, stripList, replaceList), 0);
    } catch (err) {
        console.error("Failed to load data:", err);
    }
}

async function loadMirrorDataInBackground(mappingObj, stripList, replaceList) {
    try {
        const remap = mappingObj.remap || {};

        // Load 5etools mirror data
        let mirrorItems = [];
        for (const file of ITEM_JSON_FILES) {
            const data = await tryFetchJSON(file);
            let arr = [];
            if (Array.isArray(data)) {
                arr = data;
            } else if (data && typeof data === "object") {
                for (const key of KNOWN_ARRAY_KEYS) {
                    if (Array.isArray(data[key])) {
                        arr = data[key];
                        break;
                    }
                }
            }
            if (arr.length) mirrorItems.push(...arr);
        }

        // Build mirrorItemMap
        let mirrorItemMap = {};
        for (const item of mirrorItems) {
            if (item.name) {
                const norm = normalizeForMapping(item.name, stripList, replaceList);
                mirrorItemMap[norm] = item;
            }
            if (item.inherits && item.inherits.namePrefix) {
                const normPrefix = normalizeForMapping(item.inherits.namePrefix, stripList, replaceList);
                mirrorItemMap[normPrefix] = item;
            }
        }

        // For each CSV row, add to item_data if not already present
        let missingMirrorNames = [];
        let missingMirrorAndDescNames = [];

        for (const row of allData) {
            const name = row[2]; // raw name from CSV
            if (!item_data[name]) {
                // use raw name as key
                // Only normalize for the lookup!
                const norm = normalizeForMapping(name, stripList, replaceList);
                const lookupNorm = nameAliases[norm] || norm;
                const found = mirrorItemMap[lookupNorm];
                let itemCopy;
                if (found) {
                    // Copy the found object, but store under the raw name
                    itemCopy = { ...found };
                    // If the item doesn't have entries but has inherits.entries, copy them up
                    if (!itemCopy.entries && itemCopy.inherits && itemCopy.inherits.entries) {
                        itemCopy.entries = itemCopy.inherits.entries.slice();
                    } else if (itemCopy.entries) {
                        itemCopy.entries = itemCopy.entries.slice();
                    }
                    // If the item doesn't have a name but has inherits.namePrefix, construct a name
                    if (!itemCopy.name && itemCopy.inherits && itemCopy.inherits.namePrefix) {
                        itemCopy.name = `${itemCopy.inherits.namePrefix}${name.replace(/^\+?\d+\s*/, "")}`;
                    }
                } else {
                    // Fallback: create a minimal object from the CSV row
                    const book = row[7] || "";
                    const page = row[8] || "";
                    const skip = LOG_SKIP_BOOKS.some((code) => book.includes(code) || page.includes(code));
                    if (!skip) {
                        missingMirrorNames.push(name);
                        // Use CSV description if present and not empty, otherwise fallback
                        let hasDesc = row[11] && row[11].trim();
                        if (!hasDesc) {
                            missingMirrorAndDescNames.push(name);
                        }
                    }
                    let csvDescription = row[11] && row[11].trim() ? row[11].trim() : "No description available.";
                    itemCopy = {
                        name,
                        source: book,
                        page: page,
                        rarity: row[7] || "",
                        entries: [csvDescription],
                    };
                }
                item_data[name] = itemCopy; // always store under raw name
            }
        }

        // After the loop, log the lists
        window.missingMirrorNames = missingMirrorNames;
        window.missingMirrorAndDescNames = missingMirrorAndDescNames;

        // 5. Free mirrorItems from memory
        mirrorItems = null;

        // 6. itemsData is now just the values of item_data
        itemsData = Object.values(item_data);

        // 7. If the details modal is open, refresh it with new data
        const modal = document.getElementById("itemDetailsModal");
        if (modal && modal.classList.contains("show") && window.selectedRowName) {
            const row = allData.find((r) => r[2] === window.selectedRowName);
            if (row && typeof renderDetails === "function") renderDetails(row);
        }

        // After all item_data is populated, before refreshing modal:
        window.itemDataReady = true;
    } catch (err) {
        console.error("Failed to load mirror data:", err);
    }
}

function uniqueSorted(arr) {
    return Array.from(new Set(arr.flat())).sort((a, b) => {
        const na = parseInt(a),
            nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b));
    });
}

function toTitleCase(str) {
    if (typeof str !== "string") return str;
    return str
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase());
}

function normalizeRarityCase(rarity) {
    if (!rarity || typeof rarity !== "string") return rarity;

    // Handle compound rarities like "Very Rare/Rare" or "very rare/rare"
    if (rarity.includes("/")) {
        return rarity
            .split("/")
            .map((part) => toTitleCase(part.trim()))
            .join("/");
    }

    return toTitleCase(rarity);
}

function normalizeRarity(val) {
    if (val === "Very Rare (S)") return "Very Rare";
    if (val === "Very Rare/Rare") return ["Very Rare", "Rare"];
    return val;
}

function normalizeForMapping(name, stripList, replaceList) {
    if (typeof name !== "string") {
        console.warn("Non-string name:", name);
        return "";
    }
    let norm = name.trim().toLowerCase();
    // Apply replacements
    if (replaceList && Array.isArray(replaceList)) {
        for (const [from, to] of replaceList) {
            norm = norm.split(from).join(to);
        }
    }
    // Case-insensitive strip (like str_ireplace)
    if (stripList && Array.isArray(stripList)) {
        for (const pattern of stripList) {
            // Escape regex special chars
            const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            // Replace all case-insensitive occurrences
            norm = norm.replace(new RegExp(escaped, "gi"), "");
        }
    }
    // Collapse multiple spaces and trim
    return norm.replace(/\s{2,}/g, " ").trim();
}

async function setupMappingConfig() {
    const mappingConfig = await fetchJSON("/2014_item_shop/custom_mapping.json");
    const stripList = mappingConfig.strip || [];
    const replaceList = mappingConfig.replace || [];
    const remap = mappingConfig.remap || {};

    // Use these variables as needed, or export them if needed elsewhere
    window.stripList = stripList;
    window.replaceList = replaceList;
    window.remap = remap;
}

window.itemDataReady = false;
