import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";

const PORT = Number(process.env.PORT || 3001);
app.listen(PORT, () => console.log(`API escuchando en http://0.0.0.0:${PORT}`));
