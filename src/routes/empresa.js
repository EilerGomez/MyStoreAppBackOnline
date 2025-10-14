import { Router } from "express";
import { pool } from "../db.js";
import { ok, fail } from "../utils.js";

const router = Router();

// GET /api/empresa  (toma id=1)
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM empresa WHERE id = 1`);
    ok(res, rows[0] || null);
  } catch (e) {
    console.error(e);
    fail(res, "Error obteniendo empresa", 500);
  }
});
// PUT /api/empresa (actualiza empresa con id = 1)
router.put("/", async (req, res) => {
  try {
    const { nombre, ubicacion, telefono } = req.body;
    if (!nombre && !ubicacion && !telefono) {
        return fail(res, "Debe enviar al menos un campo a actualizar", 400);
    }

    await pool.query(
      `UPDATE empresa 
       SET nombre = $1,
           ubicacion = $2,
           telefono = $3,
           modificacion = true
       WHERE id = 1`,
      [nombre, ubicacion, telefono]
    );

    ok(res, { id: 1 });
  } catch (e) {
    console.error(e);
    fail(res, "Error actualizando empresa", 500);
  }
});


export default router;
