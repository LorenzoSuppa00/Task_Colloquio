export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const nuovo = req.body;
  console.log("Ricevuto report:", nuovo);

  res.status(200).json({
    message: "Report ricevuto con successo",
    report: nuovo
  });
}
