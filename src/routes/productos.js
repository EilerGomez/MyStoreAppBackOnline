import { Router } from "express";
import { pool } from "../db.js";
import { ok, fail, isInt, isNumber } from "../utils.js";

const router = Router();

// GET /api/productos?q=&limit=&offset=
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").toString();
    const limit = Number(req.query.limit || 100);
    const offset = Number(req.query.offset || 0);
    const like = `%${q}%`;

    const { rows } = await pool.query(
      `SELECT id, nombre, codigo, stock, precio
       FROM productos
       WHERE ($1 = '' OR nombre ILIKE $2 OR codigo ILIKE $2)
       ORDER BY id DESC
       LIMIT $3 OFFSET $4`,
      [q, like, limit, offset]
    );
    ok(res, rows);
  } catch (e) {
    console.error(e);
    fail(res, "Error listando productos", 500);
  }
});

// GET /api/productos/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isInt(id)) return fail(res, "ID inválido");
    const { rows } = await pool.query(`SELECT * FROM productos WHERE id = $1`, [id]);
    if (!rows.length) return fail(res, "No encontrado", 404);
    ok(res, rows[0]);
  } catch (e) {
    console.error(e);
    fail(res, "Error obteniendo producto", 500);
  }
});

// GET /api/productos/codigo/:codigo  (para escáner)
router.get("/codigo/:codigo", async (req, res) => {
  try {
    const { codigo } = req.params;
    const { rows } = await pool.query(`SELECT * FROM productos WHERE codigo = $1`, [codigo]);
    if (!rows.length) return fail(res, "No encontrado", 404);
    ok(res, rows[0]);
  } catch (e) {
    console.error(e);
    fail(res, "Error buscando por código", 500);
  }
});

// POST /api/productos
router.post("/", async (req, res) => {
  try {
    const { nombre, codigo = null, stock = 0, precio } = req.body;
    if (!nombre || !isNumber(precio)) return fail(res, "Datos inválidos");

    const { rows } = await pool.query(
      `INSERT INTO productos (nombre, codigo, stock, precio)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [nombre, codigo, Number(stock), Number(precio)]
    );
    ok(res, { id: rows[0].id }, 201);
  } catch (e) {
    console.error(e);
    fail(res, "Error creando producto", 500);
  }
});

// PUT /api/productos/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isInt(id)) return fail(res, "ID inválido");

    const { nombre, codigo, stock, precio } = req.body;

    const sets = [];
    const vals = [];
    if (nombre !== undefined) { sets.push(`nombre = $${sets.length + 1}`); vals.push(nombre); }
    if (codigo !== undefined) { sets.push(`codigo = $${sets.length + 1}`); vals.push(codigo); }
    if (stock !== undefined)  { sets.push(`stock = $${sets.length + 1}`);  vals.push(Number(stock)); }
    if (precio !== undefined) { sets.push(`precio = $${sets.length + 1}`); vals.push(Number(precio)); }
    if (!sets.length) return fail(res, "Nada que actualizar");

    vals.push(id);
    await pool.query(`UPDATE productos SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
    ok(res, { id: Number(id) });
  } catch (e) {
    console.error(e);
    fail(res, "Error actualizando producto", 500);
  }
});

// DELETE /api/productos/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isInt(id)) return fail(res, "ID inválido");
    await pool.query(`DELETE FROM productos WHERE id = $1`, [id]);
    ok(res, { id: Number(id) });
  } catch (e) {
    console.error(e);
    fail(res, "Error eliminando producto", 500);
  }
});

export default router;
