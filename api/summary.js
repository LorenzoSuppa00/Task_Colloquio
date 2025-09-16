import { readFile } from "fs/promises";

export default async function handler(req, res) {
  try {
    const file = await readFile("public/summary2.0.json", "utf8");
    res.setHeader("Content-Type", "application/json");
    res.status(200).send(file);
  } catch (e) {
    res.status(500).json({ error: "Errore lettura file" });
  }
}
