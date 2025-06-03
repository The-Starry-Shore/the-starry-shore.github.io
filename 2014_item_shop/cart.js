let cart = [];

function addToCart(name) {
    const row = allData.find(row => row[2] === name);
    let costField = row ? (row[6] || '') : '';
    let needsBase = costField.includes('+');
    cart.push({
        name,
        quantity: 1,
        base: 0,
        ...(needsBase ? { customName: "" } : {})
    });
    updateAddToCartBtn(name);
    updateCartCount();
}

function updateAddToCartBtn(name) {
    const btn = document.getElementById('add-to-cart-btn');
    if (!btn) return;
    btn.innerHTML = `
        <button class="btn btn-primary btn-sm" title="Add to Cart">
            <i class="fa-solid fa-cart-plus"></i>
        </button>
    `;
    btn.querySelector('button').onclick = () => addToCart(name);
}

function updateCartCount() {
    const count = cart.length;
    const badge = document.getElementById('cart-count');
    if (badge) badge.textContent = count;
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) cartBtn.disabled = count === 0;
}