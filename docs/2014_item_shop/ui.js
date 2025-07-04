function populateCheckboxMatrix(containerId, values) {
    const container = $(containerId);
    container.innerHTML = "";
    const items = uniqueSorted(values);
    items.forEach((val) => {
        const label = document.createElement("label");
        label.className = "mb-0";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = val;
        input.name = containerId.replace("#filter-", "");
        label.appendChild(input);
        // Use displayTier for tier filter, "None" for blank rarity, otherwise show raw value
        if (containerId === "#filter-tier") {
            label.append(" " + displayTier(val));
        } else if (containerId === "#filter-rarity") {
            label.append(" " + (val === "" ? "None" : val));
        } else {
            label.append(" " + val);
        }
        container.appendChild(label);
    });
}

function populateFilters() {
    // Ensure correct columns: 0 = Tier, 1 = Type, 7 = Rarity
    const tierSet = allData.map((row) => row[0]);
    const typeSet = allData.map((row) => row[1]);
    const raritySet = allData.map((row) => normalizeRarity(row[7])).flat();

    populateCheckboxMatrix("#filter-tier", tierSet);
    populateCheckboxMatrix("#filter-type", typeSet);
    populateCheckboxMatrix("#filter-rarity", raritySet);
}

function applyFilters() {
    const tiers = $$("#filter-tier input:checked").map((el) => el.value);
    const types = $$("#filter-type input:checked").map((el) => el.value);
    const rarities = $$("#filter-rarity input:checked").map((el) => el.value);
    const nameQ = $("#filter-name").value;
    const atn = $("#filter-atn").value;
    const session = $("#filter-session").value;
    const itemTypeQ = $("#filter-itemtype").value;
    const bookQ = $("#filter-book").value;
    const notesQ = $("#filter-notes").value;
    const descQ = $("#filter-description") ? $("#filter-description").value.trim().toLowerCase() : ""; // <-- Add this
    const costMin = parseInt($("#filter-cost-min").value) || 0;
    const costMax = parseInt($("#filter-cost-max").value) || 20000000;

    let data = allData.filter((row) => {
        const [tier, type, name, atnVal, sessVal, itemType, cost, rawRarity, book, notes] = row;
        const costVal = parseInt((cost || "").replace(/[^0-9]/g, "")) || 0;
        const normRarity = normalizeRarity(rawRarity);
        const rarityMatch = rarities.length === 0 || (Array.isArray(normRarity) ? normRarity.some((r) => rarities.includes(r)) : rarities.includes(normRarity));

        // --- Description filter logic (optimized) ---
        let descMatch = true;
        if (descQ) {
            const item = getItemByName(name);
            // Early exit if no item data found
            if (!item || !Array.isArray(item.entries)) {
                descMatch = false;
            } else {
                // Only check string entries for performance
                descMatch = item.entries.some((e) => typeof e === "string" && tokenizeMatch(e, descQ));
            }
        }

        return (
            (tiers.length === 0 || tiers.includes(tier)) && (types.length === 0 || types.includes(type)) && tokenizeMatch(name, nameQ) && (atn === "" || (atn === "yes" && atnVal) || (atn === "no" && !atnVal)) && (session === "" || (session === "yes" && sessVal) || (session === "no" && !sessVal)) && tokenizeMatch(itemType, itemTypeQ) && costVal >= costMin && costVal <= costMax && rarityMatch && tokenizeMatch(book, bookQ) && tokenizeMatch(notes, notesQ) && descMatch // <-- Add this
        );
    });

    // If no filters are selected and no search fields are filled, show all data
    const noFilters = tiers.length === 0 && types.length === 0 && rarities.length === 0 && !nameQ && !atn && !session && !itemTypeQ && !bookQ && !notesQ && !descQ && costMin === 0 && costMax === 20000000;

    if (data.length === 0 && noFilters) {
        data = allData;
    }

    // Adjust for action column (first column is not in data)
    let dataSortCol = sortCol === null ? null : sortCol - 1;

    if (dataSortCol !== null && dataSortCol >= 0) {
        data.sort((a, b) => {
            let vA = a[dataSortCol],
                vB = b[dataSortCol];

            // Custom sort for Tier (column 0)
            if (dataSortCol === 0) {
                const nA = parseInt(vA, 10);
                const nB = parseInt(vB, 10);
                return sortAsc ? nA - nB : nB - nA;
            }

            // Custom sort for Cost (column 6 in data, so dataSortCol === 6)
            if (dataSortCol === 6) {
                const getCost = (val) => {
                    if (!val || typeof val !== "string") return 0;
                    const match = val.replace(/,/g, "").match(/(\d+)/);
                    return match ? parseInt(match[1], 10) : 0;
                };
                const nA = getCost(vA);
                const nB = getCost(vB);
                return sortAsc ? nA - nB : nB - nA;
            }

            // All other columns: string compare
            vA = (vA ?? "").toString().toLowerCase();
            vB = (vB ?? "").toString().toLowerCase();
            if (vA < vB) return sortAsc ? -1 : 1;
            if (vA > vB) return sortAsc ? 1 : -1;
            return 0;
        });
    }

    renderTable(data);
    setupTableEventDelegation(); // Set up event delegation after table rendering
}

function renderTable(data) {
    const descQ = $("#filter-description") ? $("#filter-description").value.trim().toLowerCase() : "";
    const tbody = $("#itemsTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    data.forEach((row) => {
        const tr = document.createElement("tr");
        tr.className = "item-row";
        tr.dataset.row = JSON.stringify(row);

        if (selectedRowName && row[2] === selectedRowName) {
            tr.classList.add("selected-row");
        }

        const [tier, type, name, atnVal, sessVal, itemType, cost, rarity, book, notes, link] = row;

        const showBase = typeof cost === "string" && cost.includes("+");
        const isDisabled = shouldDisableAddToCart(type, rarity, sessVal);
        const disabledClass = isDisabled ? " disabled" : "";
        const disabledAttr = isDisabled ? " disabled" : "";
        
        let btnHtml = `
            <button class="btn btn-primary btn-sm add-table-cart${disabledClass}" data-name="${encodeURIComponent(name)}" data-base="${showBase ? 1 : 0}" title="Add to Cart"${disabledAttr}>
                <i class="fa fa-cart-plus"></i>
            </button>
            <button class="btn btn-primary btn-sm ms-1 table-share-btn" data-name="${encodeURIComponent(name)}" title="Share item">
                <i class="fa-solid fa-share-nodes"></i>
            </button>
        `;
        if (link && link.trim() !== "") {
            btnHtml += `
                <a href="${link}" target="_blank" rel="noopener" class="btn btn-primary btn-sm ms-1 table-link-btn" title="Open item link">
                    <i class="fa-solid fa-up-right-from-square"></i>
                </a>
            `;
        }

        // --- FIX: Append action column first ---
        const tdBtn = document.createElement("td");
        tdBtn.className = "action-col";
        tdBtn.innerHTML = btnHtml;
        tr.appendChild(tdBtn);

        // --- FIX: Append exactly 10 data columns to match thead ---
        [tier, type, name, atnVal, sessVal, itemType, cost, rarity, book, notes].forEach((col, i) => {
            const td = document.createElement("td");
            if (i === 0) {
                td.textContent = displayTier(col);
            } else if (i === 3) {
                // atn column
                td.innerHTML = col ? `<span class="pf-green-check fa fa-check"></span>` : "";
            } else if (i === 4) {
                // sess column
                td.innerHTML = col ? `<span class="pf-green-check fa fa-check"></span>` : "";
            } else if (i === 6) {
                // Cost column
                let costStr = col || "";
                const plusIdx = costStr.indexOf("+");
                if (plusIdx !== -1) {
                    // Format the number before the plus, keep the rest
                    const numPart = costStr.slice(0, plusIdx).replace(/[^0-9]/g, "");
                    const rest = costStr.slice(plusIdx);
                    td.textContent = (numPart ? parseInt(numPart, 10).toLocaleString() : "") + " " + rest.trim();
                } else {
                    // Just format the number if possible
                    const num = parseInt(costStr.replace(/[^0-9]/g, ""));
                    td.textContent = !isNaN(num) && num > 0 ? num.toLocaleString() : costStr;
                }
            } else {
                td.textContent = col || "";
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });

    // Always re-sync sticky scrollbar after table changes
    if (typeof setupStickyScrollbar === "function") setupStickyScrollbar();
}

// Event delegation for table clicks - attach ONCE to tbody, handles all rows
function setupTableEventDelegation() {
    const tbody = $("#itemsTable tbody");
    if (!tbody) return;
    
    // Remove any existing listeners first
    tbody.removeEventListener("click", handleTableClick);
    
    // Add single delegated event listener
    tbody.addEventListener("click", handleTableClick);
}

function handleTableClick(e) {
    const tr = e.target.closest("tr");
    if (!tr) return;
    
    // Handle different types of clicks
    if (e.target.closest(".add-table-cart")) {
        e.stopPropagation();
        const btn = e.target.closest(".add-table-cart");
        
        // Check if button is disabled
        if (btn.disabled || btn.classList.contains('disabled')) {
            return; // Don't add to cart if disabled
        }
        
        const name = decodeURIComponent(btn.getAttribute("data-name"));
        addToCart(name);
        return;
    }
    
    if (e.target.closest(".table-share-btn")) {
        e.stopPropagation();
        const btn = e.target.closest(".table-share-btn");
        const name = decodeURIComponent(btn.getAttribute("data-name"));
        const url = new URL(window.location.href);
        url.search = `?v=${toBase64(name)}`;
        url.hash = "";
        navigator.clipboard.writeText(url.toString()).then(() => {
            const rect = btn.getBoundingClientRect();
            showCopyToast("Share URL copied!", rect.left + rect.width / 2, rect.top - 20 + window.scrollY);
        });
        return;
    }
    
    // Handle row click (but not if clicking buttons/links)
    if (!e.target.closest("button, a")) {
        const descQ = $("#filter-description") ? $("#filter-description").value.trim().toLowerCase() : "";
        const rowData = JSON.parse(tr.dataset.row);
        selectedRowName = rowData[2];
        renderDetails(rowData, descQ);
        
        // Update row highlighting without re-rendering the entire table
        const tbody = $("#itemsTable tbody");
        tbody.querySelectorAll("tr").forEach(row => row.classList.remove("selected-row"));
        tr.classList.add("selected-row");
    }
}

function formatBatchedJsonTags(text, item, highlightText = "") {
    if (!text) return "";

    // Replace {=variable} with value from item or item.inherits, styled like batched JSON tags
    text = text.replace(/\{=([a-zA-Z0-9_]+)\}/g, (match, varName) => {
        let val = match;
        if (item && varName in item) val = item[varName];
        else if (item && item.inherits && varName in item.inherits) val = item.inherits[varName];
        return `<span class="parsed-BatchedJson-tag">${val}</span>`;
    });

    // Recursively replace batched JSON tags, handling nested tags
    let result = text.replace(/\{([@#][^\s}]+)\s+([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, (match, tag, content) => {
        const parsed = formatBatchedJsonTags(content.split("|")[0].trim(), item, highlightText);
        return `<span class="parsed-BatchedJson-tag">${parsed}</span>`;
    });
    // Highlight matches
    if (highlightText && highlightText.length > 1) {
        const tokens = highlightText.split(/\s+/).filter(Boolean);
        for (const token of tokens) {
            if (token.length > 1) {
                result = result.replace(new RegExp(`(${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"), `<mark>$1</mark>`);
            }
        }
    }
    return result;
}

function formatEntry(entry, item, highlightText = "") {
    if (typeof entry === "string") {
        // Convert newlines to <br /> for proper line breaks
        let formatted = formatBatchedJsonTags(entry, item, highlightText);
        formatted = formatted.replace(/\n/g, '<br />');
        return `<div class="mb-2">${formatted}</div>`;
    } else if (entry && typeof entry === "object") {
        let html = "";
        if (entry.name) {
            html += `<h5 class="mt-3 mb-1">${entry.name}</h5>`;
        }
        if (entry.type === "list" && Array.isArray(entry.items)) {
            html += "<ul class='mb-2'>" + entry.items.map((e) => `<li>${formatEntry(e, item, highlightText)}</li>`).join("") + "</ul>";
        } else if (entry.type === "table" && Array.isArray(entry.rows)) {
            html += "<table class='table table-sm mb-2'>";
            if (entry.colLabels) {
                html += "<thead><tr>" + entry.colLabels.map((label) => `<th>${formatBatchedJsonTags(label, item, highlightText)}</th>`).join("") + "</tr></thead>";
            }
            html += "<tbody>";
            for (const row of entry.rows) {
                html += "<tr>" + row.map((cell) => `<td>${formatEntry(cell, item, highlightText)}</td>`).join("") + "</tr>";
            }
            html += "</tbody></table>";
        } else if (entry.type === "item" && entry.entry) {
            html += `<div class="mb-2"><b>${entry.name}:</b> ${formatBatchedJsonTags(entry.entry, item, highlightText)}</div>`;
        } else if (Array.isArray(entry.entries)) {
            html += entry.entries.map((e) => formatEntry(e, item, highlightText)).join("");
        }
        return html;
    }
    return "";
}

// Replace the entire renderDetails function with this:
function renderDetails(rowData, highlightText = "") {
    // Wait for item_data to be ready
    if (!window.itemDataReady) {
        // Optionally show a loading spinner or message
        const modalContent = document.getElementById("itemDetailModalContent");
        if (modalContent) {
            modalContent.innerHTML = `<div class="p-4 text-center text-muted"><i class="fa-solid fa-spinner fa-spin"></i> Loading item details...</div>`;
        }
        // Try again shortly
        setTimeout(() => renderDetails(rowData, highlightText), 150);
        return;
    }

    if (isAnyModalOpen()) return;
    const [tier, type, name, atnVal, sessVal, itemType, cost, rarity, book, notes, link] = rowData;
    const item = getItemByName(name);

    // Helper to wrap any value as copyable
    const copy = (v) => `<span class="copyable">${v ?? ""}</span>`;

    let html = `
        <div class="item-title">
            ${copy(name)}
            <span class="item-source">${copy(book)}</span>
        </div>
        <div class="item-type">${copy(itemType)}</div>
        <div><b>Tier:</b> ${copy(displayTier(tier))}</div>
        <div><b>Type:</b> ${copy(type)}</div>
        <div><b>Rarity:</b> ${copy(rarity)}</div>
        <div><b>Cost:</b> ${copy(cost)}</div>
        <div><b>Requires Attunement:</b> ${copy(atnVal ? "Yes" : "No")}</div>
        <div><b>Session Required:</b> ${copy(sessVal ? "Yes" : "No")}</div>
    `;

    // Only include notes if present
    if (notes && notes.trim()) {
        html += `<div class="item-notes my-2"><i class="fa-solid fa-circle-info me-1"></i>${formatBatchedJsonTags(notes)}</div>`;
    }

    // If no item data, or the only entry is "No description available." or matches the notes, show friendly message
    if (!item || !item.entries || (item.entries.length === 1 && typeof item.entries[0] === "string" && (item.entries[0].toLowerCase().includes("no description available") || (notes && item.entries[0].trim() === notes.trim())))) {
        html += `
            <div class="alert alert-warning mt-3" style="font-size:1.05em;">
                <i class="fa-solid fa-circle-info me-1"></i>
                <b>No detailed description could be found for this item.</b>
                ${
                    link && link.trim()
                        ? `<br><br>For more information, please click
                        <a href="${link}" target="_blank" rel="noopener" class="btn btn-primary btn-sm ms-1 table-link-btn" style="display:inline-block;vertical-align:middle;">
                            <i class="fa-solid fa-up-right-from-square"></i> Open Link
                        </a>.`
                        : `<br><br>No additional information is available.`
                }
            </div>
        `;
    } else {
        // When rendering entries:
        html += `<div class="item-desc">${item.entries.map((e) => formatEntry(e, item, highlightText)).join(" ")}</div>`;
    }

    // Render into modal content
    const modalContent = document.getElementById("itemDetailModalContent");
    if (modalContent) modalContent.innerHTML = html;

    // Update modal Add to Cart button
    updateAddToCartBtnModal(name, rowData);

    // Update modal link/share buttons
    updateItemLinkBtnModal(name, link);

    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById("itemDetailsModal"));
    modal.show();
}

// Helper function to suppress CORS-related console errors
function suppressCORSErrors(originalError, originalWarn) {
    const isCORSError = (message) => {
        return message.includes('Failed to load resource') || 
               message.includes('CORS') || 
               message.includes('cross-origin') ||
               message.includes('Access to fetch') ||
               message.includes('No \'Access-Control-Allow-Origin\'') ||
               message.includes('has been blocked by CORS policy') ||
               message.includes('domtoimage: Error while reading CSS rules') ||
               message.includes('SecurityError: Failed to read the \'cssRules\' property') ||
               (message.includes('Error') && (message.includes('bootstrap') || message.includes('fontawesome') || message.includes('font-awesome')));
    };

    console.error = function(...args) {
        const message = args.join(' ');
        if (!isCORSError(message)) {
            originalError.apply(console, args);
        }
    };
    
    console.warn = function(...args) {
        const message = args.join(' ');
        if (!isCORSError(message)) {
            originalWarn.apply(console, args);
        }
    };
}

// Fast screenshot function
async function takeItemScreenshot(name) {
    const content = document.getElementById("itemDetailModalContent");
    if (!content) {
        throw new Error("Content not found");
    }

    // Suppress CORS console spam
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    suppressCORSErrors(originalConsoleError, originalConsoleWarn);

    try {
        const dataUrl = await domtoimage.toPng(content, {
            quality: 0.95,
            bgcolor: document.documentElement.getAttribute("data-bs-theme") === "dark" ? "#212529" : "#ffffff"
        });
        
        const link = document.createElement("a");
        link.download = `${name.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_details.png`;
        link.href = dataUrl;
        link.click();
        URL.revokeObjectURL(dataUrl);
        
    } catch (error) {
        console.error("Screenshot failed:", error);
        alert("Screenshot failed. Please try again or use your browser's built-in screenshot tool.");
    } finally {
        // Always restore original console methods
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
    }
}

// Add these helper functions:
function updateAddToCartBtnModal(name, rowData = null) {
    const btn = document.getElementById("add-to-cart-btn-modal");
    if (!btn) return;
    
    let isDisabled = false;
    if (rowData) {
        const [tier, type, nameRow, atnVal, sessVal, itemType, cost, rarity, book, notes, link] = rowData;
        isDisabled = shouldDisableAddToCart(type, rarity, sessVal);
    }
    
    const disabledClass = isDisabled ? " disabled" : "";
    const disabledAttr = isDisabled ? " disabled" : "";
    
    btn.innerHTML = `
        <button class="btn btn-primary btn-sm${disabledClass}" title="Add to Cart"${disabledAttr}>
            <i class="fa-solid fa-cart-plus"></i>
        </button>
    `;
    
    if (!isDisabled) {
        btn.querySelector("button").onclick = () => {
            addToCart(name);
            updateAddToCartBtnModal(name, rowData);
        };
    }
}

function updateItemLinkBtnModal(name, link) {
    const linkBtn = document.getElementById("item-link-btn-modal");
    if (!linkBtn) return;
    let markdownHtml = `
        <button id="item-markdown-btn-modal" class="btn btn-primary btn-sm ms-2" title="Copy as Markdown">
            <i class="fa-brands fa-markdown"></i>
        </button>
    `;
    let screenshotHtml = `
        <button id="item-screenshot-btn-modal" class="btn btn-primary btn-sm ms-2" title="Download screenshot">
            <i class="fa-solid fa-camera"></i>
        </button>
    `;
    let shareHtml = `
        <button id="item-share-btn-modal" class="btn btn-primary btn-sm ms-2" title="Share item">
            <i class="fa-solid fa-share-nodes"></i>
        </button>
    `;
    let linkHtml = "";
    if (link && link.trim() !== "") {
        linkHtml = `
            <a href="${link}" target="_blank" rel="noopener" class="ms-2 btn btn-primary btn-sm" title="Open item link">
                <i class="fa-solid fa-up-right-from-square"></i>
            </a>
        `;
    }
    linkBtn.innerHTML = markdownHtml + screenshotHtml + shareHtml + linkHtml;

    // Markdown button event
    const markdownBtn = document.getElementById("item-markdown-btn-modal");
    if (markdownBtn) {
        markdownBtn.onclick = () => {
            const content = document.getElementById("itemDetailModalContent");
            if (!content) return;
            const md = htmlToDiscordMarkdown(content);
            navigator.clipboard.writeText(md).then(() => {
                const rect = markdownBtn.getBoundingClientRect();
                showCopyToast("Copied as Markdown!", rect.left + rect.width / 2, rect.top - 20 + window.scrollY);
            });
        };
    }

    // Screenshot button event
    const screenshotBtn = document.getElementById("item-screenshot-btn-modal");
    if (screenshotBtn) {
        screenshotBtn.onclick = async (e) => {
            // Immediately disable button and show spinner
            screenshotBtn.disabled = true;
            screenshotBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
            
            // Force immediate UI update
            screenshotBtn.offsetHeight; // Trigger reflow
            
            try {
                // Use setTimeout to ensure spinner shows before heavy work
                await new Promise(resolve => setTimeout(resolve, 50));
                await takeItemScreenshot(name);
            } catch (e) {
                console.error("Screenshot failed:", e);
                alert("Screenshot failed. Please try again or use your browser's built-in screenshot tool.");
            } finally {
                screenshotBtn.disabled = false;
                screenshotBtn.innerHTML = `<i class="fa-solid fa-camera"></i>`;
            }
        };
    }

    // Share button event
    const shareBtn = document.getElementById("item-share-btn-modal");
    if (shareBtn) {
        shareBtn.onclick = () => {
            const url = new URL(window.location.href);
            url.search = `?v=${toBase64(name)}`;
            url.hash = "";
            navigator.clipboard.writeText(url.toString()).then(() => {
                const rect = shareBtn.getBoundingClientRect();
                showCopyToast("Share URL copied!", rect.left + rect.width / 2, rect.top - 20 + window.scrollY);
            });
        };
    }
}

// Enhance copyable: show "Copied to clipboard" as a tip
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("copyable")) {
        const text = e.target.innerText;
        navigator.clipboard.writeText(text).then(() => {
            const rect = e.target.getBoundingClientRect();
            showCopyToast("Copied to clipboard", rect.left + rect.width / 2, rect.top - 20 + window.scrollY);
        });
    }
});

function showCopyToast(text, x, y) {
    let toast = $("#copyToast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "copyToast";
        toast.className = "copy-toast";
        document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.style.left = `${x}px`;
    toast.style.top = `${y}px`;
    toast.style.opacity = 1;
    toast.style.transform = "translateY(-20px)";
    setTimeout(() => {
        toast.style.opacity = 0;
        toast.style.transform = "translateY(-10px)";
    }, 1200);
}

function setBootstrapTheme(dark) {
    // Remove table from DOM to avoid repaint cost
    const tableWrapper = document.getElementById("tableWrapper");
    let parent, next;
    if (tableWrapper) {
        parent = tableWrapper.parentNode;
        next = tableWrapper.nextSibling;
        parent.removeChild(tableWrapper);
    }

    document.documentElement.setAttribute("data-bs-theme", dark ? "dark" : "light");
    const themeBtn = document.querySelector(".toggle-theme");
    if (themeBtn) {
        themeBtn.innerHTML = dark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }

    // Re-insert table after a short delay to allow repaint
    setTimeout(() => {
        if (parent && tableWrapper) {
            if (next) {
                parent.insertBefore(tableWrapper, next);
            } else {
                parent.appendChild(tableWrapper);
            }
            setupStickyScrollbar(); // <-- Add this line
        }
    }, 50);
}

function setupEvents() {
    // Filter controls
    $$(".filters input, .filters select").forEach((el) => el.addEventListener("input", applyFilters));
    // Table sorting
    $$("#itemsTable thead th").forEach((th, idx) =>
        th.addEventListener("click", () => {
            sortAsc = sortCol === idx ? !sortAsc : true;
            sortCol = idx;
            applyFilters();
        })
    );
    // Theme toggle
    const themeBtn = document.querySelector(".toggle-theme");
    let dark = document.documentElement.getAttribute("data-bs-theme") === "dark";
    themeBtn.addEventListener("click", () => {
        dark = !dark;
        setBootstrapTheme(dark);
    });
    setBootstrapTheme(dark);
    document.getElementById("cart-btn").addEventListener("click", () => {
        if (cart.length === 0) return;
        if (isAnyModalOpen()) return;
        renderCart();
        const modal = new bootstrap.Modal(document.getElementById("cartModal"));
        modal.show();
    });
    document.getElementById("order-btn").addEventListener("click", () => {
        // Get names from inputs
        const characterName = document.getElementById("character-name-input")?.value.trim() || "characterName";

        // Filter out items with blank or 0 quantity
        const filtered = cart.filter((item) => {
            // Remove if quantity is blank, 0, or not a number
            const qty = parseInt(item.quantity, 10);
            return !isNaN(qty) && qty > 0;
        });

        // Check for missing base values
        let missingBaseOrName = false;
        filtered.forEach((item) => {
            const row = getItemDataByName(item.name);
            let costField = row ? row[6] || "" : "";
            if (costField.includes("+")) {
                // Needs base and custom name
                if (item.base === "" || item.base === null || isNaN(item.base) || Number(item.base) === 0 || !item.customName || !item.customName.trim()) {
                    missingBaseOrName = true;
                }
            }
        });

        if (missingBaseOrName) {
            alert("Please enter a base value and a name for all items that require them.");
            return;
        }

        // Prepare output
        let total = 0;
        let lines = [];
        filtered.forEach((item) => {
            const row = getItemDataByName(item.name);
            let costField = row ? row[6] || "" : "";
            let showBase = costField.includes("+");
            let costDisplay = showBase ? costField.slice(0, costField.indexOf("+")).trim() : costField.trim();
            let cost = parseInt(costDisplay.replace(/[^0-9]/g, "")) || 0;
            let base = showBase ? parseInt(item.base, 10) || 0 : 0;
            let qty = parseInt(item.quantity, 10);
            let perItem = cost + base;
            let itemTotal = perItem * qty;
            total += itemTotal;

            // Build display name with custom type if present
            let displayName = item.name;
            if (item.customName && item.customName.trim()) {
                displayName += ` (${item.customName.trim()})`;
            }

            lines.push({
                qty,
                displayName,
                perItem,
                itemTotal,
            });
        });

        // Sort lines by itemTotal descending
        lines.sort((a, b) => b.itemTotal - a.itemTotal);

        // Use en dash (–) and fullwidth parentheses （） as steganographic markers
        let output = `${characterName} buys:\n${lines.map((l) => `     （${l.qty}x） ${l.displayName} ${l.perItem.toLocaleString()} – ${l.itemTotal.toLocaleString()} GP`).join("\n")}\nTotal ${total.toLocaleString()} GP`;

        // Copy to clipboard
        const orderBtn = document.getElementById("order-btn");
        navigator.clipboard.writeText(output).then(
            () => {
                const original = orderBtn.textContent;
                orderBtn.textContent = "Copied!";
                setTimeout(() => {
                    orderBtn.textContent = original;
                }, 1500);
            },
            () => {
                orderBtn.textContent = "Copy failed";
                setTimeout(() => {
                    orderBtn.textContent = "Order";
                }, 1500);
            }
        );
    });
    document.getElementById("clear-cart-btn").addEventListener("click", () => {
        if (cart.length === 0) return;
        if (confirm("Clear all items from your cart?")) {
            cart = [];
            updateCartCount();
            renderCart();
            applyFilters();
        }
    });

    // Import/Export button opens modal
    const importExportBtn = document.getElementById("import-export-btn");
    const importExportModal = document.getElementById("importExportModal");
    const importExportTextarea = document.getElementById("importExportTextarea");
    const copyBtn = document.getElementById("copy-import-export-btn");
    const shareBtn = document.getElementById("share-import-export-btn");
    const updateBtn = document.getElementById("update-import-export-btn");

    if (importExportBtn && importExportModal && importExportTextarea) {
        importExportBtn.addEventListener("click", () => {
            if (isAnyModalOpen()) return;
            importExportTextarea.value = cart.length ? encryptCart(cart) : "";
            const modal = new bootstrap.Modal(importExportModal);
            modal.show();
        });
    }

    // Copy button
    if (copyBtn && importExportTextarea) {
        copyBtn.addEventListener("click", () => {
            importExportTextarea.select();
            document.execCommand("copy");
            copyBtn.textContent = "Copied!";
            setTimeout(() => {
                copyBtn.textContent = "Copy";
            }, 1200);
        });
    }

    // Share button (uses Web Share API if available)
    if (shareBtn && importExportTextarea) {
        shareBtn.addEventListener("click", () => {
            const text = importExportTextarea.value;
            if (navigator.share) {
                navigator.share({ text }).catch(() => {});
            } else {
                alert("Sharing is not supported in this browser.");
            }
        });
    }

    // Update button (import cart)
    if (updateBtn && importExportModal && importExportTextarea) {
        updateBtn.addEventListener("click", () => {
            const val = importExportTextarea.value.trim();
            if (val) {
                const imported = decryptCart(val);
                if (imported && Array.isArray(imported)) {
                    // Ensure imported items have unique IDs
                    let maxId = 0;
                    imported.forEach((item) => {
                        if (!item.id) {
                            item.id = ++cartIdCounter;
                        } else {
                            maxId = Math.max(maxId, item.id);
                        }
                    });
                    // Update cartIdCounter to be higher than any existing ID
                    cartIdCounter = Math.max(cartIdCounter, maxId);

                    cart = imported;
                    updateCartCount();
                    renderCart();
                    applyFilters();
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(importExportModal);
                    if (modal) modal.hide();
                } else {
                    alert("Invalid or corrupted import data.");
                }
            } else {
                // Just close modal if textarea is empty
                const modal = bootstrap.Modal.getInstance(importExportModal);
                if (modal) modal.hide();
            }
        });
    }

    // Discord name tip on focus
    const discordInput = document.getElementById("discord-name-input");
    let discordTipTimeout = null;
    let discordTipActive = false;
    if (discordInput) {
        const showDiscordTip = () => {
            let toast = $("#copyToast");
            if (!toast) {
                toast = document.createElement("div");
                toast.id = "copyToast";
                toast.className = "copy-toast";
                document.body.appendChild(toast);
            }
            toast.textContent = "Use your default Discord username (not your server nickname).";
            toast.style.left = `${discordInput.getBoundingClientRect().left + discordInput.offsetWidth / 2}px`;
            toast.style.top = `${discordInput.getBoundingClientRect().top - 28 + window.scrollY}px`;
            toast.style.opacity = 1;
            toast.style.transform = "translateY(-20px)";
            discordTipActive = true;
        };
        const hideDiscordTip = () => {
            let toast = $("#copyToast");
            if (toast && discordTipActive) {
                toast.style.opacity = 0;
                toast.style.transform = "translateY(-10px)";
                discordTipActive = false;
            }
        };
        discordInput.addEventListener("focus", showDiscordTip);
        discordInput.addEventListener("blur", hideDiscordTip);
    }
}

function updateAddToCartBtn(name) {
    const btn = document.getElementById("add-to-cart-btn");
    if (!btn) return;
    btn.innerHTML = `
        <button class="btn btn-primary btn-sm" title="Add to Cart">
            <i class="fa-solid fa-cart-plus"></i>
        </button>
    `;
    btn.querySelector("button").onclick = () => addToCart(name);
}

function renderCart() {
    const container = document.getElementById("cart-contents");
    if (!container) return;

    // --- Save scroll position ---
    const scrollY = container.scrollTop;

    // --- Save focus and cursor position ---
    const active = document.activeElement;
    let focusInfo = null;
    if (active && (active.classList.contains("cart-qty") || active.classList.contains("cart-base"))) {
        focusInfo = {
            className: active.classList.contains("cart-qty") ? "cart-qty" : "cart-base",
            idx: active.dataset.idx,
            selectionStart: active.selectionStart,
            selectionEnd: active.selectionEnd,
        };
    }

    if (cart.length === 0) {
        container.innerHTML = '<div class="p-3 text-center text-muted">Your cart is empty.</div>';
        // Also clear total in footer if present
        const totalEl = document.getElementById("cart-total");
        if (totalEl) totalEl.textContent = "Total: 0 GP";
        return;
    }

    // --- Sort cart by per-item cost descending (optimized) ---
    const sortedCart = [...cart].sort((a, b) => {
        // Find item data for price and base using efficient lookup
        const rowA = getItemDataByName(a.name);
        const rowB = getItemDataByName(b.name);
        let costA = 0,
            baseA = a.base || 0,
            showBaseA = false;
        let costB = 0,
            baseB = b.base || 0,
            showBaseB = false;
        if (rowA) {
            let costFieldA = rowA[6] || "";
            showBaseA = costFieldA.includes("+");
            costA = parseInt((showBaseA ? costFieldA.slice(0, costFieldA.indexOf("+")).trim() : costFieldA.trim()).replace(/[^0-9]/g, "")) || 0;
        }
        if (rowB) {
            let costFieldB = rowB[6] || "";
            showBaseB = costFieldB.includes("+");
            costB = parseInt((showBaseB ? costFieldB.slice(0, costFieldB.indexOf("+")).trim() : costFieldB.trim()).replace(/[^0-9]/g, "")) || 0;
        }
        const perItemA = costA + (showBaseA ? baseA : 0);
        const perItemB = costB + (showBaseB ? baseB : 0);
        return perItemB - perItemA;
    });

    let html = `<table class="table table-sm align-middle mb-0">
        <thead>
            <tr>
                <th>Name</th>
                <th>Qty</th>
                <th></th>
                <th>Per Item Price</th>
                <th>Total</th>
                <th></th>
            </tr>
        </thead>
        <tbody>`;
    let grandTotal = 0;
    sortedCart.forEach((item, idx) => {
        // Find the original index in the cart array using the unique ID
        const originalIdx = cart.findIndex((c) => c.id === item.id);

        // Find item data for price and link
        const row = getItemDataByName(item.name);
        let cost = 0,
            baseCost = item.base || 0,
            showBase = false,
            costDisplay = "";
        let link = "";
        if (row) {
            let costField = row[6] || "";
            const plusIdx = costField.indexOf("+");
            if (plusIdx !== -1) {
                showBase = true;
                costDisplay = costField.slice(0, plusIdx).trim();
            } else {
                costDisplay = costField.trim();
            }
            cost = parseInt(costDisplay.replace(/[^0-9]/g, "")) || 0;
            link = row[10] || ""; // 11th column is link
        }
        const perItem = cost + (showBase ? baseCost : 0);
        const total = perItem * (parseInt(item.quantity) || 0);
        grandTotal += total;
        html += `<tr>
            <td>${link && link.trim() ? `<a href="${link}" target="_blank" rel="noopener">${item.name}</a>` : item.name}</td>
            <td>
                <input type="text" inputmode="numeric" pattern="[0-9]*"
                    class="form-control form-control-sm cart-qty"
                    style="max-width: 60px; min-width: 40px; display:inline-block;"
                    data-idx="${originalIdx}" value="${item.quantity ?? ""}">
            </td>
            <td>
                ${
                    showBase
                        ? `
                    <input type="text" inputmode="numeric" pattern="[0-9]*"
                        class="form-control form-control-sm cart-base"
                        style="max-width: 60px; min-width: 40px; display:inline-block; margin-right: 4px;"
                        data-idx="${originalIdx}" value="${item.base === 0 || item.base === "" || item.base == null ? "" : item.base}" placeholder="Cost">
                `
                        : ""
                }
                <input type="text"
                    class="form-control form-control-sm cart-custom-name"
                    style="max-width: 100px; min-width: 60px; display:inline-block;"
                    data-idx="${originalIdx}" value="${item.customName ?? ""}" placeholder="Type">
            </td>
            <td>${costDisplay ? (parseInt(costDisplay.replace(/[^0-9]/g, "")) || 0).toLocaleString() : perItem.toLocaleString()}</td>
            <td>${total.toLocaleString()}</td>
            <td>
                <button class="btn btn-danger btn-sm cart-delete" data-idx="${originalIdx}" title="Remove"><i class="fa fa-trash"></i></button>
            </td>
        </tr>`;
    });
    html += `</tbody></table>`;
    container.innerHTML = html;

    // Show total in modal footer
    let totalEl = document.getElementById("cart-total");
    if (!totalEl) {
        // Insert total span if not present
        const footer = document.querySelector("#cartModal .modal-footer");
        if (footer) {
            totalEl = document.createElement("span");
            totalEl.id = "cart-total";
            totalEl.className = "ms-auto me-2 fw-bold";
            footer.insertBefore(totalEl, footer.querySelector("#order-btn"));
        }
    }
    if (totalEl) totalEl.textContent = `Total: ${grandTotal.toLocaleString()} GP`;

    // Quantity change
    container.querySelectorAll(".cart-qty").forEach((input) => {
        input.addEventListener("input", (e) => {
            const idx = +input.dataset.idx;
            const raw = input.value.replace(/\D/g, "");
            if (raw === "") {
                // Allow blank while editing, don't update cart yet
                cart[idx].quantity = "";
            } else {
                let val = parseInt(raw, 10);
                if (val < 0) val = 0;
                cart[idx].quantity = val;
            }
            renderCart();
            updateCartCount();
        });
    });
    // Base change
    container.querySelectorAll(".cart-base").forEach((input) => {
        input.addEventListener("input", (e) => {
            const idx = +input.dataset.idx;
            const raw = input.value.replace(/\D/g, "");
            if (raw === "") {
                cart[idx].base = "";
            } else {
                let val = parseInt(raw, 10);
                if (val < 0) val = 0;
                cart[idx].base = val;
            }
            renderCart();
        });
    });
    // Delete
    container.querySelectorAll(".cart-delete").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            const idx = +btn.dataset.idx;
            const removed = cart[idx];
            cart.splice(idx, 1);
            renderCart();
            updateCartCount();
            // Hide modal if cart is empty
            if (cart.length === 0) {
                const modal = bootstrap.Modal.getInstance(document.getElementById("cartModal"));
                if (modal) modal.hide();
            }
        });
    });
    // Name change
    container.querySelectorAll(".cart-custom-name").forEach((input) => {
        input.addEventListener("input", (e) => {
            const idx = +input.dataset.idx;
            cart[idx].customName = input.value;
        });
    });

    // --- Restore focus and cursor position ---
    if (focusInfo) {
        const input = container.querySelector(`.${focusInfo.className}[data-idx="${focusInfo.idx}"]`);
        if (input) {
            input.focus();
            input.setSelectionRange(focusInfo.selectionStart, focusInfo.selectionEnd);
        }
    }

    // Restore scroll position
    container.scrollTop = scrollY;
}

// Initial load
async function initialLoad() {
    await setupMappingConfig();
    await loadData();
    
    // Reset lookup caches after data is loaded
    resetLookupCaches();

    populateFilters();
    setupEvents();

    setTimeout(() => {
        applyFilters();
    }, 50);

    // --- Check for ?v=BASE64 in URL (after all data is loaded) ---
    const params = new URLSearchParams(window.location.search);
    const vParam = params.get("v");
    if (vParam) {
        const decodedName = fromBase64(vParam);
        const row = getItemDataByName(decodedName);
        if (row) {
            renderDetails(row);
        }
    }
}

// --- ADD THIS: Sticky scrollbar for table ---
function setupStickyScrollbar() {
    const tableWrapper = document.querySelector(".table-responsive-custom");
    const stickyScrollbar = document.querySelector(".sticky-table-scrollbar");
    if (!tableWrapper || !stickyScrollbar) return;
    const table = tableWrapper.querySelector("table");
    if (!table) return;

    // Set sticky scrollbar width to match table
    stickyScrollbar.firstElementChild.style.width = table.scrollWidth + "px";

    // Remove previous event handlers
    stickyScrollbar.onscroll = null;
    tableWrapper.onscroll = null;

    // Always sync, all sizes
    stickyScrollbar.onscroll = () => {
        tableWrapper.scrollLeft = stickyScrollbar.scrollLeft;
    };
    tableWrapper.onscroll = () => {
        stickyScrollbar.scrollLeft = tableWrapper.scrollLeft;
    };
}

// Reset lookup caches when data changes
function resetLookupCaches() {
    itemLookupMap = null;
    itemDataLookupMap = null;
}

// Efficient item data lookup by name for cart operations
let itemDataLookupMap = null;

function getItemDataLookupMap() {
    if (!itemDataLookupMap) {
        itemDataLookupMap = new Map();
        allData.forEach((row) => {
            const name = row[2]; // Name is in column 2
            itemDataLookupMap.set(name, row);
        });
    }
    return itemDataLookupMap;
}

function getItemDataByName(name) {
    const lookupMap = getItemDataLookupMap();
    return lookupMap.get(name);
}

// Efficient case-insensitive item lookup - created once to avoid repeated Object.entries() calls
let itemLookupMap = null;

function getItemLookupMap() {
    if (!itemLookupMap) {
        itemLookupMap = new Map();
        Object.entries(item_data).forEach(([key, value]) => {
            itemLookupMap.set(key.toLowerCase(), value);
        });
    }
    return itemLookupMap;
}

function getItemByName(name) {
    const lookupMap = getItemLookupMap();
    return lookupMap.get(name.toLowerCase());
}

// Helper function to check if add to cart should be disabled
function shouldDisableAddToCart(type, rarity, sessionRequired) {
    // Convert to lowercase for case-insensitive comparison
    const lowerType = (type || '').toLowerCase();
    const lowerRarity = (rarity || '').toLowerCase();
    
    // Disable if type is "boons", rarity is "artifact", or session is required
    // Session required can be: true, 'true', 1, '✔', or any truthy value
    return lowerType === 'boons' || 
           lowerRarity === 'artifact' || 
           sessionRequired === '✔' || 
           (sessionRequired && sessionRequired.toString().trim() !== '');
}

initialLoad();

document.addEventListener("hide.bs.modal", function (event) {
    // If the modal being hidden contains the active element, blur it
    if (event.target.contains(document.activeElement)) {
        document.activeElement.blur();
    }
});

function htmlToDiscordMarkdown(contentEl) {
    // Clone to avoid modifying the DOM
    const clone = contentEl.cloneNode(true);

    // Remove copyable spans, keep text
    clone.querySelectorAll(".copyable").forEach((el) => {
        el.replaceWith(document.createTextNode(el.textContent));
    });

    // Convert <h5> to bold
    clone.querySelectorAll("h5").forEach((el) => {
        el.replaceWith(document.createTextNode(`**${el.textContent.trim()}**\n`));
    });

    // Convert <b> to bold
    clone.querySelectorAll("b").forEach((el) => {
        el.replaceWith(document.createTextNode(`**${el.textContent.trim()}**`));
    });

    // Convert <ul>/<ol> to lines with dashes
    clone.querySelectorAll("ul,ol").forEach((list) => {
        let lines = [];
        list.querySelectorAll("li").forEach((li) => {
            lines.push(`- ${li.textContent.trim()}`);
        });
        list.replaceWith(document.createTextNode(lines.join("\n") + "\n"));
    });

    // Convert <table> to Discord code block table
    clone.querySelectorAll("table").forEach((table) => {
        let rows = Array.from(table.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map((td) => td.textContent.trim()));
        // Remove empty rows (all cells empty)
        rows = rows.filter((row) => row.some((cell) => cell.length > 0));
        if (!rows.length) return;

        // Calculate max width for each column
        const colWidths = [];
        rows.forEach((row) => {
            row.forEach((cell, i) => {
                colWidths[i] = Math.max(colWidths[i] || 0, cell.length);
            });
        });

        // Pad each cell for alignment
        const pad = (str, len) => str + " ".repeat(len - str.length);

        // Build the table as a code block, code block start/end on its own line
        let md = "```\n";
        rows.forEach((row, i) => {
            md += row.map((cell, j) => pad(cell, colWidths[j])).join(" | ") + "\n";
            if (i === 0) {
                md += colWidths.map((w) => "-".repeat(w)).join("-|-") + "\n";
            }
        });
        md += "```"; // No extra newline after
        table.replaceWith(document.createTextNode(md));
    });

    // Convert <mark> to __underline__
    clone.querySelectorAll("mark").forEach((el) => {
        el.replaceWith(document.createTextNode(`__${el.textContent}__`));
    });

    // Remove all other tags, keep text
    let md = clone.textContent;

    // Remove trailing whitespace from each line and collapse multiple blank lines
    md = md
        .split("\n")
        .map((line) => line.trimEnd())
        .filter((line, idx, arr) => {
            // Remove lines that are empty unless the previous line is not empty
            return line.length > 0 || (idx > 0 && arr[idx - 1].length > 0);
        })
        .join("\n")
        .replace(/\n{3,}/g, "\n\n") // just in case, collapse 3+ blank lines to 2
        .trim();

    return md;
}
