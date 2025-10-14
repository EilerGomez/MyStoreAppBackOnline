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

// PUT /api/empresa  (actualiza id=1)
router.put("/", async (req, res) => {
  try {
    const { nombre, ubicacion, telefono, modificacion } = req.body || {};
    await pool.query(
      `INSERT INTO empresa (id, nombre, ubicacion, telefono, modificacion)
       VALUES (1, $1, $2, $3, COALESCE($4, TRUE))
       ON CONFLICT (id) DO UPDATE
       SET nombre = EXCLUDED.nombre,
           ubicacion = EXCLUDED.ubicacion,
           telefono = EXCLUDED.telefono,
           modificacion = EXCLUDED.modificacion`,
      [nombre || null, ubicacion || null, telefono || null, modificacion]
    );
    ok(res, { id: 1 });
  } catch (e) {
    console.error(e);
    fail(res, "Error actualizando empresa", 500);
  }
});

export default router;
