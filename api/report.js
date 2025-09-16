export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo non consentito" });
  }

  try {
    const nuovo = req.body;
    console.log("Ricevuto su Vercel:", nuovo);

    // simulazione salvataggio (non persistente su Vercel)
    return res.status(200).json({
      message: "Report ricevuto con successo",
      report: nuovo,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Errore server" });
  }
}
