import express from "express";
import cors from "cors";
import { pool } from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.WEBSITES_PORT || process.env.PORT || 4001);

// Health DB
app.get("/db/health", async (_req, res) => {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    res.json({ ok: r.rows[0].ok === 1 });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});

// Crear usuario
app.post("/users", async (req, res) => {
  const { name, email } = req.body ?? {};
  if (!name || !email) return res.status(400).json({ error: "name & email required" });

  try {
    const r = await pool.query(
      "INSERT INTO users_schema.users(name, email) VALUES($1,$2) RETURNING id,name,email",
      [name, email]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "insert failed", detail: String(e) });
  }
});

// Listar usuarios
app.get("/users", async (_req, res) => {
  try {
    const r = await pool.query("SELECT id,name,email FROM users_schema.users ORDER BY id ASC");
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// Usuario por id
app.get("/users/:id", async (req, res) => {
  try {
    const r = await pool.query("SELECT id,name,email FROM users_schema.users WHERE id=$1", [req.params.id]);
    res.json(r.rows);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// Actualizar
app.put("/users/:id", async (req, res) => {
  const { name, email } = req.body ?? {};
  if (!name || !email) return res.status(400).json({ error: "name & email required" });

  try {
    const r = await pool.query(
      "UPDATE users_schema.users SET name=$1,email=$2 WHERE id=$3 RETURNING id,name,email",
      [name, email, req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "user not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// Eliminar
app.delete("/users/:id", async (req, res) => {
  try {
    const r = await pool.query(
      "DELETE FROM users_schema.users WHERE id=$1 RETURNING id,name,email",
      [req.params.id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: "user not found" });
    res.json(r.rows[0]);
  } catch (e) {
    res.status(500).json({ error: "query failed", detail: String(e) });
  }
});

// Health
app.get("/health", (_req, res) => res.json({ status: "ok", service: "users-api" }));

app.listen(PORT, () => console.log(`✅ users-api listening on http://localhost:${PORT}`));
