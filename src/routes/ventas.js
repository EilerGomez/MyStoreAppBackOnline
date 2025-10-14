import { Router } from "express";
import { pool, withTx } from "../db.js";
import { ok, fail, isInt, isNumber, isoToDateOnly } from "../utils.js";

const router = Router();

// GET /api/ventas  (lista simple con cliente)
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT v.id, v.cliente, v.vendedor, v.total, v.fecha,
              c.nombre AS cliente_nombre, c.apellido AS cliente_apellido
       FROM ventas v
       JOIN clientes c ON c.id = v.cliente
       ORDER BY v.id DESC`
    );
    ok(res, rows);
  } catch (e) {
    console.error(e);
    fail(res, "Error listando ventas", 500);
  }
});

// GET /api/ventas/:id  (con items)
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!isInt(id)) return fail(res, "ID inválido");

    const { rows: vRows } = await pool.query(`SELECT * FROM ventas WHERE id = $1`, [id]);
    if (!vRows.length) return fail(res, "No encontrada", 404);
    const venta = vRows[0];

    const { rows: items } = await pool.query(
      `SELECT d.id, d.id_pro AS "productId", d.cantidad, d.precio,
              p.nombre
       FROM detalle d
       JOIN productos p ON p.id = d.id_pro
       WHERE d.id_venta = $1
       ORDER BY d.id`,
      [id]
    );

    ok(res, { ...venta, items });
  } catch (e) {
    console.error(e);
    fail(res, "Error obteniendo venta", 500);
  }
});

/**
 * POST /api/ventas
 * body: { clienteId, vendedor, fechaISO?, items: [{ productId, cantidad, precio? }] }
 * - Calcula total en servidor.
 * - Inserta venta + detalle en transacción.
 * - Actualiza stock de productos.
 */
router.post("/", async (req, res) => {
  const { clienteId, vendedor, fechaISO, items } = req.body || {};

  if (!isInt(clienteId) || !vendedor || !Array.isArray(items) || !items.length) {
    return fail(res, "Datos inválidos");
  }

  try {
    const venta = await withTx(async (client) => {
      // Traer productos involucrados
      const ids = items.map((i) => Number(i.productId)).filter(Boolean);
      if (!ids.length) throw new Error("Items sin productId");
      const { rows: productos } = await client.query(
        `SELECT id, precio, stock, nombre FROM productos WHERE id = ANY($1::int[])`,
        [ids]
      );

      // Mapa para validar precios/stock
      const pMap = new Map(productos.map((p) => [p.id, p]));
      let total = 0;

      for (const it of items) {
        const pid = Number(it.productId);
        const qty = Number(it.cantidad || 0);
        if (!Number.isInteger(pid) || !Number.isFinite(qty) || qty <= 0) {
          throw new Error("Item inválido");
        }
        const p = pMap.get(pid);
        if (!p) throw new Error(`Producto #${pid} no existe`);
        if (p.stock < qty) throw new Error(`Stock insuficiente para #${pid}`);

        const precio = isNumber(it.precio) ? Number(it.precio) : Number(p.precio);
        total += precio * qty;
      }

      const fecha = isoToDateOnly(fechaISO) || null; // si no viene, usa default CURRENT_DATE

      // Insert venta
      const { rows: vIns } = await client.query(
        `INSERT INTO ventas (cliente, vendedor, total, fecha)
         VALUES ($1,$2,$3, COALESCE($4, CURRENT_DATE))
         RETURNING id, fecha`,
        [clienteId, vendedor, total, fecha]
      );
      const ventaId = vIns[0].id;

      // Insert detalle + actualizar stock
      for (const it of items) {
        const pid = Number(it.productId);
        const qty = Number(it.cantidad);
        const precio = isNumber(it.precio) ? Number(it.precio) : Number(pMap.get(pid).precio);

        await client.query(
          `INSERT INTO detalle (id_pro, cantidad, precio, id_venta)
           VALUES ($1,$2,$3,$4)`,
          [pid, qty, precio, ventaId]
        );
        await client.query(
          `UPDATE productos SET stock = stock - $1 WHERE id = $2`,
          [qty, pid]
        );
      }

      return { id: ventaId, total, fecha: vIns[0].fecha };
    });

    ok(res, venta, 201);
  } catch (e) {
    console.error(e);
    fail(res, e.message || "Error registrando venta", 400);
  }
});

// (Opcional) Ejecuta el procedimiento de limpieza
// POST /api/ventas/cleanup
router.post("/cleanup", async (_req, res) => {
  try {
    await pool.query(`CALL eliminar_registros_antiguos()`);
    ok(res, { cleaned: true });
  } catch (e) {
    console.error(e);
    fail(res, "Error ejecutando limpieza", 500);
  }
});

export default router;
