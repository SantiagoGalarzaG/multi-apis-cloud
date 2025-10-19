import mongoose from "mongoose";

let cached = null;

export async function connectMongo() {
  if (cached) return cached;

  // Leemos las envs cuando realmente conectamos (evita “Falta MONGODB_URI” al importar)
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGO_DB_NAME || "basdonaxdb";
  if (!uri) throw new Error("Falta MONGODB_URI");

  cached = mongoose.connect(uri, {
    dbName,
    retryWrites: false,            // Cosmos no soporta retryable writes
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  mongoose.connection.on("connected", () => console.log("[Mongo] connected"));
  mongoose.connection.on("error", (err) => console.error("[Mongo] error:", err.message));

  return cached;
}

export async function pingMongo() {
  await connectMongo();
  const r = await mongoose.connection.db.admin().ping();
  return r?.ok === 1;
}

export { mongoose };
