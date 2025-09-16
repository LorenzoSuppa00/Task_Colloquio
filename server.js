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

app.post("/api/report", (req, res) => {
  const nuovo = req.body;
  console.log("Ricevuto:", nuovo);
  res.json({ message: "Report ricevuto con successo", report: nuovo });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server attivo su http://localhost:${port}`);
});
