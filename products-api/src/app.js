import express from "express";
import cors from "cors";
import fetch from "node-fetch";
import { pool } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.WEBSITES_PORT || process.env.PORT || 4002);
const SERVICE = process.env.SERVICE_NAME || "products-api";
const USERS_API_URL = process.env.USERS_API_URL || "http://users-api:4001";

// Health
app.get("/health", (_req, res) => res.json({ status: "ok", service: SERVICE }));

// Health DB
app.get("/db/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: r.rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Combinar products (DB) + users (API)
app.get("/products/with-users", async (_req, res) => {
  try {
    const r = await fetch(`${USERS_API_URL}/users`);
    const users = await r.json();

    const products = await pool.query(
      "SELECT id, name, price FROM products_schema.products ORDER BY id ASC"
    );

    res.json({
      products: products.rows,
      users: Array.isArray(users) ? users : [],
      usersCount: Array.isArray(users) ? users.length : 0,
      productsCount: products.rowCount
    });
  } catch (e) {
    res.status(502).json({
      error: "No se pudo consultar users-api o products DB",
      detail: String(e)
    });
  }
});

// CRUD products
app.get("/products", async (_req, res) => {
  try {
    const r = await pool.query("SELECT id,name,price FROM products_schema.products ORDER BY id ASC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    const r = await pool.query("SELECT id,name,price FROM products_schema.products WHERE id=$1", [req.params.id]);
    if (r.rowCount === 0) return res.status(404).json({ error: "Product not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

app.post("/products", async (req, res) => {
  const { id, name, price } = req.body ?? {};
  if (!id || !name || !price) return res.status(400).json({ error: "id, name & price are required" });

  try {
    const r = await pool.query(
      "INSERT INTO products_schema.products(id,name,price) VALUES($1,$2,$3) RETURNING id,name,price",
      [id, name, price]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "insert failed", detail: String(e) });
  }
});

app.put("/products/:id", async (req, res) => {
  const { name, price } = req.body ?? {};
  if (!name || !price) return res.status(400).json({ error: "name & price required" });

  try {
    const r = await pool.query(
      "UPDATE products_schema.products SET name=$1, price=$2 WHERE id=$3 RETURNING id,name,price",
      [name, price, req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Product not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "update failed", detail: String(e) });
  }
});

app.delete("/products/:id", async (req, res) => {
  try {
    const r = await pool.query(
      "DELETE FROM products_schema.products WHERE id=$1 RETURNING id",
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "Product not found" });
    res.json({ deleted: r.rows[0].id });
  } catch (e) {
    res.status(500).json({ error: "delete failed", detail: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`✅ ${SERVICE} listening on http://localhost:${PORT}`);
  console.log(`↔️  USERS_API_URL=${USERS_API_URL}`);
});
