const path = require("path");
const fs = require("fs");
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_PATH = path.join(__dirname, "data", "products.json");
const ORDERS_PATH = path.join(__dirname, "data", "orders.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return raw ? JSON.parse(raw) : [];
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readProducts() {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function readOrders() {
  return readJson(ORDERS_PATH);
}

function createOrderSummary(orders) {
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalItems = orders.reduce(
    (sum, order) => sum + order.items.reduce((qty, item) => qty + item.qty, 0),
    0
  );

  return {
    totalOrders: orders.length,
    totalRevenue,
    totalItems,
    recentOrders: orders.slice().reverse().slice(0, 5)
  };
}

app.get("/api/products", (req, res) => {
  const products = readProducts();
  res.json(products);
});

app.get("/api/products/:id", (req, res) => {
  const products = readProducts();
  const product = products.find((p) => p.id === req.params.id);
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }
  return res.json(product);
});

app.get("/api/orders", (req, res) => {
  const orders = readOrders().slice().reverse();
  res.json(orders);
});

app.get("/api/dashboard", (req, res) => {
  const products = readProducts();
  const orders = readOrders();

  res.json({
    productsCount: products.length,
    categoriesCount: new Set(products.map((product) => product.category)).size,
    featuredCount: products.filter((product) => product.featured).length,
    ...createOrderSummary(orders)
  });
});

app.post("/api/orders", (req, res) => {
  const { customer, items, total, payment } = req.body || {};
  if (
    !customer ||
    !customer.name ||
    !customer.email ||
    !customer.address ||
    !Array.isArray(items) ||
    !items.length ||
    !total ||
    !payment ||
    !payment.method
  ) {
    return res.status(400).json({ message: "Invalid order payload" });
  }

  const orders = readOrders();
  const orderId = `ORD-${Date.now().toString().slice(-8)}-${Math.floor(
    Math.random() * 900 + 100
  )}`;

  const order = {
    orderId,
    customer,
    items,
    total,
    payment: {
      method: payment.method,
      last4: payment.last4 || null,
      brand: payment.brand || null
    },
    status: "confirmed",
    createdAt: new Date().toISOString()
  };

  orders.push(order);
  writeJson(ORDERS_PATH, orders);

  return res.json({
    orderId,
    status: order.status
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/shop", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "shop.html"));
});

app.get("/product", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "product.html"));
});

app.get("/cart", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cart.html"));
});

app.get("/checkout", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "checkout.html"));
});

app.get("/success", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "success.html"));
});

app.get("/contact", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "contact.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.listen(PORT, () => {
  console.log(`Portfolio E-commerce Store running on http://localhost:${PORT}`);
});
