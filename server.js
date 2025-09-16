const express = require("express");
const fs = require("fs");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/summary", (req, res) => {
  fs.readFile("summary2.0.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "Errore lettura file" });
    } else {
      res.json(JSON.parse(data));
    }
  });
});

// POST per aggiungere un nuovo report
app.post("/api/summary", (req, res) => {
  try {
    const file = path.join(__dirname, "summary2.0.json");
    const raw = fs.readFileSync(file, "utf-8");
    const data = JSON.parse(raw);

    // Se non c'è results, lo inizializziamo
    if (!data.results) data.results = [];

    // Aggiungiamo i dati inviati dal frontend
    const nuovo = req.body;
    data.results.push(nuovo);

    // Riscriviamo il file aggiornato
    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    res.json({ message: "Report aggiunto con successo", nuovo });
  } catch (err) {
    console.error("Errore POST:", err);
    res.status(500).json({ message: "Errore server" });
  }
});


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server attivo su http://localhost:${port}`);
});
