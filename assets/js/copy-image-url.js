function enhanceImages() {
    document.querySelectorAll("img").forEach((image) => {
        // Skip images inside the md-logo anchor
        if (image.closest("a.md-logo")) return;

        if (image.classList.contains("copy-image-enhanced")) return; // Avoid reprocessing
        image.classList.add("copy-image-enhanced");

        let button = document.createElement("button");
        button.className = "copy-image-button";
        button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>`;

        // Wrap image in a container for button positioning
        const wrapper = document.createElement("div");
        wrapper.className = "image-container";
        image.parentNode.insertBefore(wrapper, image);
        wrapper.appendChild(image);
        wrapper.appendChild(button);

        button.addEventListener("click", () => {
            const imageUrl = image.src;
            navigator.clipboard.writeText(imageUrl).then(() => {
                button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>`; // Success icon

                setTimeout(() => {
                    button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>`; // Reset icon
                }, 2000);
            });
        });
    });
}

// Hook into MkDocs Material's navigation events
if (typeof document$ !== "undefined") {
    document$.subscribe(() => enhanceImages());
} else {
    // Fallback for non-MkDocs
    if (document.readyState !== "loading") {
        enhanceImages();
    } else {
        document.addEventListener("DOMContentLoaded", enhanceImages);
    }
}
