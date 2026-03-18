const state = {
  products: [],
  cart: [],
  orders: [],
  dashboard: null,
  pagination: {
    page: 1,
    perPage: 4
  }
};

const cartKey = "shopsmart_cart";
const orderKey = "shopsmart_last_order";

function saveCart() {
  localStorage.setItem(cartKey, JSON.stringify(state.cart));
  updateCartCount();
}

function loadCart() {
  const raw = localStorage.getItem(cartKey);
  state.cart = raw ? JSON.parse(raw) : [];
  updateCartCount();
}

function saveLatestOrder(order) {
  localStorage.setItem(orderKey, JSON.stringify(order));
}

function getLatestOrder() {
  const raw = localStorage.getItem(orderKey);
  return raw ? JSON.parse(raw) : null;
}

function updateCartCount() {
  const count = state.cart.reduce((sum, item) => sum + item.qty, 0);
  document.querySelectorAll("#cart-count").forEach((element) => {
    element.textContent = count;
  });
}

function formatPrice(value) {
  return `$${Number(value).toFixed(2)}`;
}

function formatDate(value) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function ratingLabel(value) {
  return `${value.toFixed(1)} / 5`;
}

function getQueryParams() {
  return new URLSearchParams(window.location.search);
}

async function fetchProducts() {
  const response = await fetch("/api/products");
  state.products = await response.json();
}

async function fetchOrders() {
  const response = await fetch("/api/orders");
  state.orders = await response.json();
}

async function fetchDashboard() {
  const response = await fetch("/api/dashboard");
  state.dashboard = await response.json();
}

function getCartItems() {
  return state.cart
    .map((item) => {
      const product = state.products.find((entry) => entry.id === item.id);
      if (!product) {
        return null;
      }
      return { ...item, product };
    })
    .filter(Boolean);
}

function getCartTotals() {
  const items = getCartItems();
  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0
  );
  const shipping = items.length ? 8 : 0;
  return {
    items,
    subtotal,
    shipping,
    total: subtotal + shipping
  };
}

function addToCart(productId) {
  const existing = state.cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    state.cart.push({ id: productId, qty: 1 });
  }
  saveCart();
}

function removeFromCart(productId) {
  state.cart = state.cart.filter((item) => item.id !== productId);
  saveCart();
}

function updateCartQty(productId, qty) {
  if (qty <= 0) {
    removeFromCart(productId);
    return;
  }
  const item = state.cart.find((entry) => entry.id === productId);
  if (!item) {
    return;
  }
  item.qty = qty;
  saveCart();
}

function renderProductCard(product) {
  return `
    <article class="product-card">
      <a class="product-image-link" href="/product?id=${product.id}">
        <img src="${product.image}" alt="${product.name}" />
      </a>
      <div class="product-meta">
        <span>${product.category}</span>
        <span class="rating">${ratingLabel(product.rating)}</span>
      </div>
      <a class="product-title" href="/product?id=${product.id}">${product.name}</a>
      <p class="product-description">${product.description}</p>
      <div class="product-footer">
        <div class="price">${formatPrice(product.price)}</div>
        <button class="btn primary" data-add="${product.id}">Add to Cart</button>
      </div>
    </article>
  `;
}

function bindAddToCart() {
  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      addToCart(button.dataset.add);
    });
  });
}

function initSearch() {
  const searchInput = document.getElementById("global-search");
  if (!searchInput) {
    return;
  }

  const params = getQueryParams();
  if (window.location.pathname === "/shop") {
    searchInput.value = params.get("search") || "";
  }

  searchInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    const next = new URLSearchParams();
    const value = searchInput.value.trim();
    if (value) {
      next.set("search", value);
    }
    window.location.href = `/shop${next.toString() ? `?${next}` : ""}`;
  });
}

function renderFeatured() {
  const container = document.getElementById("featured-products");
  if (!container) {
    return;
  }
  const featured = state.products.filter((product) => product.featured);
  container.innerHTML = featured.map(renderProductCard).join("");
  bindAddToCart();
}

function getFilteredProducts() {
  const params = getQueryParams();
  const search = (params.get("search") || "").trim().toLowerCase();
  const category = document.getElementById("filter-category")?.value || "all";
  const price = document.getElementById("filter-price")?.value || "all";
  const rating = document.getElementById("filter-rating")?.value || "all";
  const sort = document.getElementById("sort-products")?.value || "featured";

  let filtered = [...state.products];

  if (search) {
    filtered = filtered.filter((product) =>
      `${product.name} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(search)
    );
  }

  if (category !== "all") {
    filtered = filtered.filter((product) => product.category === category);
  }

  if (price !== "all") {
    const [min, max] = price.split("-").map(Number);
    filtered = filtered.filter(
      (product) => product.price >= min && product.price <= max
    );
  }

  if (rating !== "all") {
    filtered = filtered.filter((product) => product.rating >= Number(rating));
  }

  switch (sort) {
    case "price-asc":
      filtered.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      filtered.sort((a, b) => b.price - a.price);
      break;
    case "rating-desc":
      filtered.sort((a, b) => b.rating - a.rating);
      break;
    case "name-asc":
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      filtered.sort((a, b) => Number(b.featured) - Number(a.featured));
      break;
  }

  return filtered;
}

function renderPagination(totalItems) {
  const container = document.getElementById("pagination");
  if (!container) {
    return;
  }

  const totalPages = Math.max(1, Math.ceil(totalItems / state.pagination.perPage));
  state.pagination.page = Math.min(state.pagination.page, totalPages);

  if (totalItems <= state.pagination.perPage) {
    container.innerHTML = "";
    return;
  }

  const buttons = Array.from({ length: totalPages }, (_, index) => {
    const page = index + 1;
    const active = page === state.pagination.page ? "active" : "";
    return `<button class="page-btn ${active}" data-page="${page}">${page}</button>`;
  }).join("");

  container.innerHTML = `
    <button class="page-btn" data-page="prev">Previous</button>
    ${buttons}
    <button class="page-btn" data-page="next">Next</button>
  `;

  container.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      const value = button.dataset.page;
      if (value === "prev") {
        state.pagination.page = Math.max(1, state.pagination.page - 1);
      } else if (value === "next") {
        state.pagination.page = Math.min(totalPages, state.pagination.page + 1);
      } else {
        state.pagination.page = Number(value);
      }
      renderShopProducts();
    });
  });
}

function renderShopProducts() {
  const container = document.getElementById("shop-products");
  if (!container) {
    return;
  }

  const filtered = getFilteredProducts();
  const params = getQueryParams();
  const search = params.get("search");
  const start = (state.pagination.page - 1) * state.pagination.perPage;
  const paginated = filtered.slice(start, start + state.pagination.perPage);

  const resultsCount = document.getElementById("results-count");
  const resultsMeta = document.getElementById("results-meta");
  if (resultsCount) {
    resultsCount.textContent = `${filtered.length} product${filtered.length === 1 ? "" : "s"}`;
  }
  if (resultsMeta) {
    resultsMeta.textContent = search
      ? `Showing matches for "${search}".`
      : "Browse the collection.";
  }

  container.innerHTML = paginated.length
    ? paginated.map(renderProductCard).join("")
    : `<div class="empty-state"><h3>No products found</h3><p>Try clearing filters or searching with a broader term.</p></div>`;

  renderPagination(filtered.length);
  bindAddToCart();
}

function initFilters() {
  const category = document.getElementById("filter-category");
  if (!category) {
    return;
  }

  const price = document.getElementById("filter-price");
  const rating = document.getElementById("filter-rating");
  const sort = document.getElementById("sort-products");
  const clear = document.getElementById("clear-filters");

  [category, price, rating, sort].forEach((element) => {
    element.addEventListener("change", () => {
      state.pagination.page = 1;
      renderShopProducts();
    });
  });

  clear.addEventListener("click", () => {
    category.value = "all";
    price.value = "all";
    rating.value = "all";
    sort.value = "featured";
    state.pagination.page = 1;
    renderShopProducts();
  });
}

function renderProductDetail() {
  const container = document.getElementById("product-detail");
  if (!container) {
    return;
  }

  const id = getQueryParams().get("id");
  const product = state.products.find((entry) => entry.id === id);

  if (!product) {
    container.innerHTML = `<div class="empty-state"><h3>Product not found</h3><p>This product may have been removed from the catalog.</p></div>`;
    return;
  }

  container.innerHTML = `
    <div class="product-visual">
      <img src="${product.image}" alt="${product.name}" />
    </div>
    <div>
      <p class="eyebrow">${product.category}</p>
      <h1>${product.name}</h1>
      <div class="rating">${ratingLabel(product.rating)}</div>
      <div class="price">${formatPrice(product.price)}</div>
      <p>${product.description}</p>
      <div class="actions">
        <button class="btn primary" data-add="${product.id}">Add to Cart</button>
        <a class="btn ghost" href="/shop">Back to Shop</a>
      </div>
      <div class="detail-grid">
        <div class="detail-card">
          <strong>Why shoppers like it</strong>
          <p>High ratings, clean design, and practical features that fit everyday setups.</p>
        </div>
        <div class="detail-card">
          <strong>Portfolio angle</strong>
          <p>This page demonstrates dynamic routing, cart actions, and reusable product data.</p>
        </div>
      </div>
      <div class="section product-reviews">
        <h3>Customer Reviews</h3>
        <p>"Exactly what I needed. Clean design and great performance."</p>
        <p>"The build quality feels premium. I would buy again."</p>
      </div>
    </div>
  `;

  bindAddToCart();
}

function renderCart() {
  const container = document.getElementById("cart-content");
  if (!container) {
    return;
  }

  const { items, subtotal, shipping, total } = getCartTotals();
  if (!items.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>Your cart is empty</h3>
        <p>Add a few products to preview the full checkout flow.</p>
        <a class="btn primary" href="/shop">Browse Products</a>
      </div>
    `;
    return;
  }

  const rows = items
    .map(
      (item) => `
        <div class="cart-item">
          <img src="${item.product.image}" alt="${item.product.name}" />
          <div>
            <h3>${item.product.name}</h3>
            <p>${item.product.category}</p>
            <p class="price">${formatPrice(item.product.price)}</p>
          </div>
          <div class="cart-item-actions">
            <label>
              Qty
              <input type="number" min="1" value="${item.qty}" data-qty="${item.id}" />
            </label>
            <button class="btn ghost" data-remove="${item.id}">Remove</button>
          </div>
        </div>
      `
    )
    .join("");

  container.innerHTML = `
    ${rows}
    <div class="cart-summary">
      <div class="summary-row"><span>Subtotal</span><span>${formatPrice(subtotal)}</span></div>
      <div class="summary-row"><span>Shipping</span><span>${formatPrice(shipping)}</span></div>
      <div class="summary-row total"><strong>Total</strong><strong>${formatPrice(total)}</strong></div>
      <a class="btn primary" href="/checkout">Proceed to Checkout</a>
    </div>
  `;

  document.querySelectorAll("[data-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      removeFromCart(button.dataset.remove);
      renderCart();
    });
  });

  document.querySelectorAll("[data-qty]").forEach((input) => {
    input.addEventListener("change", () => {
      updateCartQty(input.dataset.qty, Number(input.value));
      renderCart();
    });
  });
}

function renderCheckoutSummary() {
  const container = document.getElementById("checkout-summary");
  if (!container) {
    return;
  }

  const { items, subtotal, shipping, total } = getCartTotals();
  if (!items.length) {
    container.innerHTML = `<p>Your cart is empty.</p>`;
    return;
  }

  container.innerHTML = `
    ${items
      .map(
        (item) => `
          <div class="summary-row">
            <span>${item.product.name} x${item.qty}</span>
            <span>${formatPrice(item.product.price * item.qty)}</span>
          </div>
        `
      )
      .join("")}
    <div class="summary-row"><span>Shipping</span><span>${formatPrice(shipping)}</span></div>
    <div class="summary-row total"><strong>Total</strong><strong>${formatPrice(total)}</strong></div>
  `;
}

function updatePaymentFields() {
  const methodSelect = document.getElementById("payment-method");
  const cardFields = document.getElementById("card-fields");
  if (!methodSelect || !cardFields) {
    return;
  }

  const stripeSelected = methodSelect.value === "stripe-test";
  cardFields.classList.toggle("hidden", !stripeSelected);
  cardFields.querySelectorAll("input").forEach((input) => {
    input.required = stripeSelected;
  });
}

function validateStripeTestCard(formData) {
  const cardNumber = String(formData.get("cardNumber") || "").replace(/\s+/g, "");
  const cardExpiry = String(formData.get("cardExpiry") || "");
  const cardCvc = String(formData.get("cardCvc") || "");

  if (cardNumber !== "4242424242424242") {
    return "Use the Stripe test card 4242 4242 4242 4242.";
  }
  if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) {
    return "Enter an expiry date in MM/YY format.";
  }
  if (!/^\d{3,4}$/.test(cardCvc)) {
    return "Enter a valid CVC for the test card.";
  }
  return null;
}

function initCheckout() {
  const form = document.getElementById("checkout-form");
  if (!form) {
    return;
  }

  const methodSelect = document.getElementById("payment-method");
  methodSelect.addEventListener("change", updatePaymentFields);
  updatePaymentFields();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const method = formData.get("paymentMethod");
    const { items, total, shipping, subtotal } = getCartTotals();

    if (!items.length) {
      alert("Your cart is empty.");
      return;
    }

    if (method === "stripe-test") {
      const error = validateStripeTestCard(formData);
      if (error) {
        alert(error);
        return;
      }
    }

    const payload = {
      customer: {
        name: formData.get("name"),
        email: formData.get("email"),
        address: formData.get("address")
      },
      items: items.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        qty: item.qty,
        unitPrice: item.product.price
      })),
      total,
      payment: {
        method,
        brand: method === "stripe-test" ? "Visa" : "Cash on Delivery",
        last4:
          method === "stripe-test"
            ? String(formData.get("cardNumber")).replace(/\s+/g, "").slice(-4)
            : null
      }
    };

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      alert("We could not place the order. Please try again.");
      return;
    }

    const order = await response.json();
    saveLatestOrder({
      ...order,
      customer: payload.customer,
      payment: payload.payment,
      subtotal,
      shipping,
      total
    });
    localStorage.removeItem(cartKey);
    state.cart = [];
    updateCartCount();
    window.location.href = `/success?order=${order.orderId}`;
  });
}

function initSuccess() {
  const message = document.getElementById("order-message");
  const details = document.getElementById("order-details");
  if (!message || !details) {
    return;
  }

  const latestOrder = getLatestOrder();
  const orderId = getQueryParams().get("order");
  if (orderId) {
    message.textContent = `Thanks for your purchase. Your order ${orderId} is confirmed.`;
  }
  if (!latestOrder) {
    return;
  }

  details.innerHTML = `
    <div class="summary-row"><span>Customer</span><span>${latestOrder.customer.name}</span></div>
    <div class="summary-row"><span>Email</span><span>${latestOrder.customer.email}</span></div>
    <div class="summary-row"><span>Payment</span><span>${latestOrder.payment.brand}${latestOrder.payment.last4 ? ` ending in ${latestOrder.payment.last4}` : ""}</span></div>
    <div class="summary-row total"><strong>Total Paid</strong><strong>${formatPrice(latestOrder.total)}</strong></div>
  `;
}

function renderDashboard() {
  const statsContainer = document.getElementById("dashboard-stats");
  const ordersContainer = document.getElementById("orders-history");
  if (!statsContainer || !ordersContainer || !state.dashboard) {
    return;
  }

  statsContainer.innerHTML = `
    <div class="stat-card"><span>Total Orders</span><strong>${state.dashboard.totalOrders}</strong></div>
    <div class="stat-card"><span>Total Revenue</span><strong>${formatPrice(state.dashboard.totalRevenue)}</strong></div>
    <div class="stat-card"><span>Items Sold</span><strong>${state.dashboard.totalItems}</strong></div>
    <div class="stat-card"><span>Products</span><strong>${state.dashboard.productsCount}</strong></div>
  `;

  if (!state.orders.length) {
    ordersContainer.innerHTML = `<div class="empty-state"><h3>No orders yet</h3><p>Place a test order to populate the history panel.</p></div>`;
    return;
  }

  ordersContainer.innerHTML = state.orders
    .map(
      (order) => `
        <article class="order-card">
          <div class="order-card-top">
            <div>
              <strong>${order.orderId}</strong>
              <p>${order.customer.name} · ${order.customer.email}</p>
            </div>
            <div class="order-status">${order.status}</div>
          </div>
          <div class="summary-row"><span>Placed</span><span>${formatDate(order.createdAt)}</span></div>
          <div class="summary-row"><span>Payment</span><span>${order.payment.brand}${order.payment.last4 ? ` ending in ${order.payment.last4}` : ""}</span></div>
          <div class="summary-row"><span>Items</span><span>${order.items.map((item) => `${item.name} x${item.qty}`).join(", ")}</span></div>
          <div class="summary-row total"><strong>Total</strong><strong>${formatPrice(order.total)}</strong></div>
        </article>
      `
    )
    .join("");
}

async function initAdmin() {
  const statsContainer = document.getElementById("dashboard-stats");
  if (!statsContainer) {
    return;
  }
  await Promise.all([fetchOrders(), fetchDashboard()]);
  renderDashboard();
}

async function init() {
  loadCart();
  initSearch();
  await fetchProducts();
  renderFeatured();
  renderShopProducts();
  initFilters();
  renderProductDetail();
  renderCart();
  renderCheckoutSummary();
  initCheckout();
  initSuccess();
  await initAdmin();
}

init();
