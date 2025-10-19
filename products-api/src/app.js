// import express from "express";
// import cors from "cors";
// import fetch from "node-fetch";
// import { pool } from "./db.js";

// const app = express();
// app.use(cors());
// app.use(express.json());

// const PORT = Number(process.env.WEBSITES_PORT || process.env.PORT || 4002);
// const SERVICE = process.env.SERVICE_NAME || "products-api";
// const USERS_API_URL = process.env.USERS_API_URL || "http://users-api:4001";

// // Health
// app.get("/health", (_req, res) => res.json({ status: "ok", service: SERVICE }));

// app.get("/health2", (_req, res) => res.json({ status: "ok", service: SERVICE }));

// // Health DB
// app.get("/db/health", async (_req, res) => {
//   try {
//     const r = await pool.query("SELECT 1 AS ok");
//     res.json({ ok: r.rows[0].ok === 1 });
//   } catch (e) {
//     res.status(500).json({ ok: false, error: String(e) });
//   }
// });

// // Combinar products (DB) + users (API)
// app.get("/products/with-users", async (_req, res) => {
//   try {
//     const r = await fetch(`${USERS_API_URL}/users`);
//     const users = await r.json();

//     const products = await pool.query(
//       "SELECT id, name, price FROM products_schema.products ORDER BY id ASC"
//     );

//     res.json({
//       products: products.rows,
//       users: Array.isArray(users) ? users : [],
//       usersCount: Array.isArray(users) ? users.length : 0,
//       productsCount: products.rowCount
//     });
//   } catch (e) {
//     res.status(502).json({
//       error: "No se pudo consultar users-api o products DB",
//       detail: String(e)
//     });
//   }
// });

// // CRUD products
// app.get("/products", async (_req, res) => {
//   try {
//     const r = await pool.query("SELECT id,name,price FROM products_schema.products ORDER BY id ASC");
//     res.json(r.rows);
//   } catch (e) {
//     res.status(500).json({ error: "query failed", detail: String(e) });
//   }
// });

// app.get("/products/:id", async (req, res) => {
//   try {
//     const r = await pool.query("SELECT id,name,price FROM products_schema.products WHERE id=$1", [req.params.id]);
//     if (r.rowCount === 0) return res.status(404).json({ error: "Product not found" });
//     res.json(r.rows[0]);
//   } catch (e) {
//     res.status(500).json({ error: "query failed", detail: String(e) });
//   }
// });

// app.post("/products", async (req, res) => {
//   const { id, name, price } = req.body ?? {};
//   if (!id || !name || !price) return res.status(400).json({ error: "id, name & price are required" });

//   try {
//     const r = await pool.query(
//       "INSERT INTO products_schema.products(id,name,price) VALUES($1,$2,$3) RETURNING id,name,price",
//       [id, name, price]
//     );
//     res.status(201).json(r.rows[0]);
//   } catch (e) {
//     res.status(500).json({ error: "insert failed", detail: String(e) });
//   }
// });

// app.put("/products/:id", async (req, res) => {
//   const { name, price } = req.body ?? {};
//   if (!name || !price) return res.status(400).json({ error: "name & price required" });

//   try {
//     const r = await pool.query(
//       "UPDATE products_schema.products SET name=$1, price=$2 WHERE id=$3 RETURNING id,name,price",
//       [name, price, req.params.id]
//     );
//     if (r.rowCount === 0) return res.status(404).json({ error: "Product not found" });
//     res.json(r.rows[0]);
//   } catch (e) {
//     res.status(500).json({ error: "update failed", detail: String(e) });
//   }
// });

// app.delete("/products/:id", async (req, res) => {
//   try {
//     const r = await pool.query(
//       "DELETE FROM products_schema.products WHERE id=$1 RETURNING id",
//       [req.params.id]
//     );
//     if (r.rowCount === 0) return res.status(404).json({ error: "Product not found" });
//     res.json({ deleted: r.rows[0].id });
//   } catch (e) {
//     res.status(500).json({ error: "delete failed", detail: String(e) });
//   }
// });

// app.listen(PORT, () => {
//   console.log(`✅ ${SERVICE} listening on http://localhost:${PORT}`);
//   console.log(`↔️  USERS_API_URL=${USERS_API_URL}`);
// });

// === Cargar .env de la RAÍZ (../.env) sin mover nada ===
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import { getCosmosContairner } from "./cosmos.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const candidates = [
  path.resolve(process.cwd(), "..", ".env"),   // si el cwd = products-api/
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../.env"),       // desde src → ../../.env
  path.resolve(__dirname, "../.env"),
];
const envPath = candidates.find((p) => fs.existsSync(p));
if (envPath) {
  dotenv.config({ path: envPath });
  console.log(`[env] Cargado: ${envPath}`);
} else {
  dotenv.config();
  console.warn("[env] No encontré .env; usando solo variables del proceso");
}

// === App base ===
import express from "express";
import cors from "cors";
// Si querés podés borrar esta línea y usar fetch global de Node 18+:
import fetch from "node-fetch";
import { connectMongo as connectToCosmos, pingMongo as pingCosmos, mongoose } from "./cosmos.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = Number(process.env.WEBSITES_PORT || process.env.PORT || 4002);
const SERVICE = process.env.SERVICE_NAME || "products-api";
const USERS_API_URL = process.env.USERS_API_URL || "http://users-api:4001";

// --------- SCHEMAS / MODELOS (solo para /products) ----------
const VariantSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true }, // sin index:true para evitar duplicados
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0 },
    attributes: { type: Map, of: String },
  },
  { _id: false }
);

const ProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    category: { type: String, index: true }, // <- partition key
    brand: String,
    description: String,
    active: { type: Boolean, default: true },
    variants: [VariantSchema],
    tags: [String],
    tenantId: { type: String, index: true },
  },
  { timestamps: true }
);

// Índices clave (baratos y útiles). No tocan tu estructura.
ProductSchema.index({ category: 1, name: 1 });
ProductSchema.index({ tenantId: 1, category: 1 });
ProductSchema.index({ "variants.sku": 1 });

const Product =
  mongoose.models.Product || mongoose.model("Product", ProductSchema);

// ---------- Health ----------
app.get("/health", (_req, res) => res.json({ status: "ok", service: SERVICE }));
app.get("/health2", (_req, res) => res.json({ status: "ok", service: SERVICE }));

// DB health (Mongo/Cosmos)
app.get("/db/health", async (_req, res) => {
  try {
    const ok = (await pingCosmos()) === true;
    res.json({ ok });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e) });
  }
});




// ---------- Rutas /products (idénticas en forma, backend Mongo) ----------

// Listar con filtros/paginado
app.get("/products", async (req, res) => {
  try {
    await connectToCosmos();
    const { page = 1, limit = 20, category, q } = req.query;
    const filter = {};
    if (category) filter.category = String(category);
    if (q) filter.name = { $regex: String(q), $options: "i" };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Product.find(filter).skip(skip).limit(Number(limit)).lean(),
      Product.countDocuments(filter),
    ]);
    res.json({ items, page: Number(page), total, pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    res.status(500).json({ error: "list failed", detail: String(e) });
  }
});

// Obtener por _id (o por SKU de variantes si pasás el SKU)
app.get("/products/:id", async (req, res) => {
  try {
    await connectToCosmos();
    const { id } = req.params;
    const isObjId = mongoose.Types.ObjectId.isValid(id);
    const product = isObjId
      ? await Product.findById(id).lean()
      : await Product.findOne({ "variants.sku": id }).lean();
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: "get failed", detail: String(e) });
  }
});

// Crear
app.post("/products", async (req, res) => {
  try {
    await connectToCosmos();
    const body = req.body || {};
    if (!body.category) {
      return res.status(400).json({ error: "category (partition key) is required" });
    }
    const created = await Product.create(body);
    res.status(201).json(created);
  } catch (e) {
    res.status(400).json({ error: "create failed", detail: String(e) });
  }
});

// Actualizar
app.put("/products/:id", async (req, res) => {
  try {
    await connectToCosmos();
    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: "update failed", detail: String(e) });
  }
});

// Borrar
app.delete("/products/:id", async (req, res) => {
  try {
    await connectToCosmos();
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.json({ deleted: String(deleted._id) });
  } catch (e) {
    res.status(500).json({ error: "delete failed", detail: String(e) });
  }
});

// Combinar products + users (tu ruta original)
app.get("/products/with-users", async (_req, res) => {
  try {
    await connectToCosmos();
    const [usersRes, products] = await Promise.all([
      fetch(`${USERS_API_URL}/users`),
      Product.find({}).limit(100).lean(),
    ]);
    const users = await usersRes.json();
    res.json({ products, users });
  } catch (e) {
    res.status(500).json({ error: "combine failed", detail: String(e) });
  }
});

// ---------- Start ----------
app.listen(PORT, () => {
  console.log(`✅ ${SERVICE} listening on http://localhost:${PORT}`);
  console.log(`↔️  USERS_API_URL=${USERS_API_URL}`);
  // opcional: sincronizar índices al arrancar (no cambia tu estructura)
  connectToCosmos()
    .then(() => mongoose.model("Product").syncIndexes().then(() => console.log("[Mongo] indexes synced")))
    .catch((err) => console.warn("[Mongo] syncIndexes warn:", err.message));
});

export default app;
