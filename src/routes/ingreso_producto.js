import { Router } from "express";
import { withTx } from "../db.js";
import { ok, fail, isInt, isNumber } from "../utils.js";

const router = Router();

// GET /api/ingreso-producto
router.get("/", async (_req, res) => {
  try {
    const result = await (await import("../db.js")).pool.query(
      `SELECT id, descripcion, total, fecha
       FROM ingreso_producto
       ORDER BY id DESC`
    );
    ok(res, result.rows);
  } catch (e) {
    console.error(e);
    fail(res, "Error listando ingresos", 500);
  }
});

/**
 * POST /api/ingreso-producto
 * body: { descripcion?, items: [{ productId, cantidad, precio }] }
 * - Registra ingreso y aumenta stock.
 * - Guarda total en ingreso_producto.
 */
router.post("/", async (req, res) => {
  const { descripcion = "", items } = req.body || {};
  if (!Array.isArray(items) || !items.length) return fail(res, "Items requeridos");

  try {
    const ingreso = await withTx(async (client) => {
      let total = 0;
      for (const it of items) {
        if (!isInt(it.productId) || !isInt(it.cantidad) || !isNumber(it.precio)) {
          throw new Error("Item inválido");
        }
        total += Number(it.cantidad) * Number(it.precio);
        await client.query(`UPDATE productos SET stock = stock + $1 WHERE id = $2`,
          [Number(it.cantidad), Number(it.productId)]);
      }

      const { rows } = await client.query(
        `INSERT INTO ingreso_producto (descripcion, total, fecha)
         VALUES ($1, $2, CURRENT_DATE) RETURNING id`,
        [descripcion, total]
      );
      return { id: rows[0].id, total };
    });

    ok(res, ingreso, 201);
  } catch (e) {
    console.error(e);
    fail(res, e.message || "Error registrando ingreso", 400);
  }
});

export default router;
