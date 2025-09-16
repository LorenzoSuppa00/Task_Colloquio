const fs = require("fs").promises;
const path = require("path");

const SRC = path.join(process.cwd(), "summary2.0.json");
const TMP = "/tmp/summary2.0.json";

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ error: "Method Not Allowed" }));
  }

  try {
    // payload inviato dal client
    const body = req.body || {};
    // leggi base (preferisci /tmp per continuità durante istanza calda)
    let raw;
    try {
      raw = await fs.readFile(TMP, "utf8");
    } catch {
      raw = await fs.readFile(SRC, "utf8");
    }
    const json = JSON.parse(raw);
    if (!Array.isArray(json.results)) json.results = [];

    // append semplice (demo)
    json.results.push(body);

    // scrivi in /tmp (scrittura effimera, valida durante la vita dell’istanza)
    await fs.writeFile(TMP, JSON.stringify(json, null, 2), "utf8");

    res.status(200).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ message: "Report aggiunto (sessione)", added: body }));
  } catch (e) {
    res.status(500).setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Errore salvataggio" }));
  }
};
