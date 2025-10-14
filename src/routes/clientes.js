import { Router } from "express";
import { pool } from "../db.js";
import { ok, fail, isInt } from "../utils.js";

const router = Router();

// GET /api/clientes?q=&limit=&offset=
router.get("/", async (req, res) => {
  try {
    const q = (req.query.q || "").toString();
    const limit = Number(req.query.limit || 100);
    const offset = Number(req.query.offset || 0);
    const like = `%${q}%`;

    const { rows } = await pool.query(
      `SELECT id, cedula, nombre, apellido, telefono, direccion
       FROM clientes
       WHERE ($1 = '' OR cedula ILIKE $2 OR nombre ILIKE $2 OR apellido ILIKE $2)
       ORDER BY id DESC
       LIMIT $3 OFFSET $4`,
      [q, like, limit, offset]
    );
    ok(res, rows);
  } catch (e) {
    console.error(e);
    fail(res, "Error listando clientes", 500);
  }
});

// GET /api/clientes/:id
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isInt(id)) return fail(res, "ID inválido");
    const { rows } = await pool.query(`SELECT * FROM clientes WHERE id = $1`, [id]);
    if (!rows.length) return fail(res, "No encontrado", 404);
    ok(res, rows[0]);
  } catch (e) {
    console.error(e);
    fail(res, "Error obteniendo cliente", 500);
  }
});

// POST /api/clientes
router.post("/", async (req, res) => {
  try {
    const { cedula = "", nombre, apellido = "", telefono = "", direccion = "" } = req.body;
    if (!nombre) return fail(res, "Nombre requerido");
    const { rows } = await pool.query(
      `INSERT INTO clientes (cedula, nombre, apellido, telefono, direccion)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [cedula, nombre, apellido, telefono, direccion]
    );
    ok(res, { id: rows[0].id }, 201);
  } catch (e) {
    console.error(e);
    fail(res, "Error creando cliente", 500);
  }
});

// PUT /api/clientes/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isInt(id)) return fail(res, "ID inválido");
    const { cedula, nombre, apellido, telefono, direccion } = req.body;

    const sets = [];
    const vals = [];
    if (cedula !== undefined)   { sets.push(`cedula = $${sets.length + 1}`);   vals.push(cedula); }
    if (nombre !== undefined)   { sets.push(`nombre = $${sets.length + 1}`);   vals.push(nombre); }
    if (apellido !== undefined) { sets.push(`apellido = $${sets.length + 1}`); vals.push(apellido); }
    if (telefono !== undefined) { sets.push(`telefono = $${sets.length + 1}`); vals.push(telefono); }
    if (direccion !== undefined){ sets.push(`direccion = $${sets.length + 1}`);vals.push(direccion); }

    if (!sets.length) return fail(res, "Nada que actualizar");
    vals.push(id);

    await pool.query(`UPDATE clientes SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
    ok(res, { id: Number(id) });
  } catch (e) {
    console.error(e);
    fail(res, "Error actualizando cliente", 500);
  }
});

// DELETE /api/clientes/:id (protege C/F id=1)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isInt(id)) return fail(res, "ID inválido");
    if (Number(id) === 1) return fail(res, "No se puede eliminar C/F", 400);
    await pool.query(`DELETE FROM clientes WHERE id = $1`, [id]);
    ok(res, { id: Number(id) });
  } catch (e) {
    console.error(e);
    fail(res, "Error eliminando cliente", 500);
  }
});

export default router;
