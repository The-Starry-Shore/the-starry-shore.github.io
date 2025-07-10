let cart = [];
let cartIdCounter = 0;

function addToCart(name) {
    const row = getItemDataByName(name);
    let costField = row ? row[6] || "" : "";
    let needsBase = costField.includes("+");
    cart.push({
        id: ++cartIdCounter,
        name,
        quantity: 1,
        base: 0,
        ...(needsBase ? { customName: "" } : {}),
    });
    updateAddToCartBtn(name);
    updateCartCount();
}

function updateCartCount() {
    const count = cart.length;
    const badge = document.getElementById("cart-count");
    if (badge) badge.textContent = count;
    const cartBtn = document.getElementById("cart-btn");
    if (cartBtn) cartBtn.disabled = count === 0;
}
