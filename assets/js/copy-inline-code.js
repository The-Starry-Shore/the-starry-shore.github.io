function enhanceInlineCodeBlocks() {
    document.querySelectorAll("p code, li code").forEach((inlineCode) => {
        if (inlineCode.closest("pre")) return; // Skip if inside a block code
        if (inlineCode.classList.contains("copy-inline-enhanced")) return; // Already processed

        inlineCode.classList.add("copy-inline-enhanced");

        let button = document.createElement("button");
        button.className = "copy-inline-button";
        button.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 1 2 2v1"></path>
        </svg>`;

        let wrapper = document.createElement("span");
        wrapper.className = "inline-code-wrapper";
        inlineCode.parentNode.insertBefore(wrapper, inlineCode);
        wrapper.appendChild(inlineCode);
        wrapper.appendChild(button);

        button.addEventListener("click", () => {
            let text = inlineCode.innerText;
            navigator.clipboard.writeText(text).then(() => {
                button.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>`;

                setTimeout(() => {
                    button.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 1 2 2v1"></path>
                    </svg>`;
                }, 1500);
            });
        });
    });
}

// Hook for MkDocs Material instant loading support
if (typeof document$ !== "undefined") {
    document$.subscribe(() => enhanceInlineCodeBlocks());
} else {
    if (document.readyState !== "loading") {
        enhanceInlineCodeBlocks();
    } else {
        document.addEventListener("DOMContentLoaded", enhanceInlineCodeBlocks);
    }
}
