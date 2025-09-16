const fs = require("fs").promises;
const path = require("path");

const SRC = path.join(process.cwd(), "summary2.0.json");
const TMP = "/tmp/summary2.0.json";

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  }

  try {
    // Se esiste una versione aggiornata in /tmp, usa quella; altrimenti il file sorgente
    let data;
    try {
      data = await fs.readFile(TMP, "utf8");
    } catch {
      data = await fs.readFile(SRC, "utf8");
    }
    res.status(200).setHeader("Content-Type", "application/json");
    res.end(data);
  } catch (e) {
    res.status(500).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Errore lettura JSON" }));
  }
};
