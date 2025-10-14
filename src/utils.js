export const ok = (res, data, status = 200) => res.status(status).json({ ok: true, data });
export const fail = (res, message = "Error", status = 400) => res.status(status).json({ ok: false, message });

export const isInt = (v) => Number.isInteger(Number(v));
export const isNumber = (v) => !isNaN(Number(v));

// Normaliza fecha ISO (string) a DATE para PG (YYYY-MM-DD)
export function isoToDateOnly(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  } catch { return null; }
}
