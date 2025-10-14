import express from "express";
import cors from "cors";
import { fail } from "./utils.js";

import productosRouter from "./routes/productos.js";
import clientesRouter from "./routes/clientes.js";
import ventasRouter from "./routes/ventas.js";
import empresaRouter from "./routes/empresa.js";
import ingresoRouter from "./routes/ingreso_producto.js";

const app = express();

app.use(cors());

app.use(express.json());

// Rutas
app.use("/api/productos", productosRouter);
app.use("/api/clientes", clientesRouter);
app.use("/api/ventas", ventasRouter);
app.use("/api/empresa", empresaRouter);
app.use("/api/ingreso-producto", ingresoRouter); // opcional

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use((req, res) => fail(res, "Not found", 404));

export default app;
