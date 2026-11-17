import cors from "cors";
import express from "express";
import { db, files } from "@file-sharer/db";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/files", async (_req, res) => {
  res.json(await db.select().from(files));
});

const port = Number(process.env.API_PORT ?? 4000);
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
