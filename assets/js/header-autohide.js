document$.subscribe(() => {
    const header = document.querySelector(".md-header");
    const cleanHeader = header.cloneNode(true);
    header.parentNode.replaceChild(cleanHeader, header);

    let hideTimeout;

    window.addEventListener("mousemove", (e) => {
        const inHeaderZone = e.clientY <= cleanHeader.offsetHeight + 10;

        if (inHeaderZone) {
            // Cancel any pending hide
            clearTimeout(hideTimeout);
            cleanHeader.classList.remove("md-header--hidden");
        } else {
            // Delay hide slightly
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => {
                cleanHeader.classList.add("md-header--hidden");
            }, 500); // 500ms delay
        }
    });
});
