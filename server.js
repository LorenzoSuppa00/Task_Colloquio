const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// serve i file statici dalla cartella "public"
app.use(express.static(path.join(__dirname, "public")));

// rotta per /api/summary
app.get("/api/summary", (req, res) => {
  fs.readFile("summary2.0.json", "utf8", (err, data) => {
    if (err) {
      res.status(500).json({ error: "Errore lettura file" });
    } else {
      res.json(JSON.parse(data));
    }
  });
});

// rotta per /api/report
app.post("/api/report", (req, res) => {
  const nuovo = req.body;
  console.log("Ricevuto:", nuovo);
  res.json({ message: "Report ricevuto con successo", report: nuovo });
});

// se qualcuno va su / (root), apri index.html che sta in public
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server attivo su http://localhost:${port}`);
});
