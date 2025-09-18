import { createClient } from "@supabase/supabase-js";

// Variabili da .env.local
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const accordion = document.getElementById("accordion");
let activeFilter = "tutto";

// ---------- Eventi base ----------
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("inviaBtn").addEventListener("click", inviaReport);

  const gf = document.getElementById("globalFilters");
  if (gf) {
    gf.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-section]");
      if (!btn) return;
      activeFilter = btn.dataset.section;

      gf.querySelectorAll("button").forEach((b) =>
        b.classList.toggle("active", b === btn)
      );

      applyGlobalFilter();
    });
  }

  boot();
});

// ---------- Utils ----------
const toNum = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : Math.max(0, Math.min(100, n));
};

function normalizePorts(n_port) {
  const labels = [];
  const values = [];
  if (!n_port || typeof n_port !== "object") return { labels, values };
  for (const k of Object.keys(n_port)) {
    const v = n_port[k];
    const n =
      typeof v === "object" && v !== null ? Number(v.n || 0) : Number(v || 0);
    labels.push(k);
    values.push(isNaN(n) ? 0 : n);
  }
  return { labels, values };
}

// ---------- Filtri ----------
function applyGlobalFilter() {
  document.querySelectorAll(".accordion-card").forEach(applyFilterToCard);
}

function updateLayoutClass(body) {
  const visible = [...body.querySelectorAll(".section")].filter(
    (sec) => sec.style.display !== "none"
  ).length;

  body.classList.remove("one-visible", "two-visible");
  if (visible === 1) body.classList.add("one-visible");
  if (visible === 2) body.classList.add("two-visible");
}

function applyFilterToCard(card) {
  const body = card.querySelector(".accordion-body");
  const sections = body.querySelectorAll(".section");

  if (activeFilter === "tutto") {
    sections.forEach((sec) => (sec.style.display = "block"));
  } else {
    sections.forEach((sec) => {
      sec.style.display = sec.classList.contains(activeFilter)
        ? "block"
        : "none";
    });
  }

  updateLayoutClass(body);
}

// ---------- SOLO rinumerazione testo (non toccare gli ID!) ----------
function reindexReports() {
  const cards = document.querySelectorAll(".accordion-card");
  cards.forEach((card, idx) => {
    const h = card.querySelector(".accordion-header h3");
    if (!h) return;
    // Mantieni la parte "— Rischio XXX"
    const parts = h.textContent.split("—");
    const tail = parts[1]?.trim() ? `— ${parts[1].trim()}` : "";
    h.textContent = `Report #${idx + 1} ${tail ? ` ${tail}` : ""}`;
  });
}

// ---------- Render report (ID STABILI su rowId) ----------
function renderReport(result, rowId) {
  // ID stabili basati sull'UUID di Supabase
  const key = rowId || `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const collapseId = `collapse-${key}`;
  const riskId = `riskChart-${key}`;
  const vulnId = `vulnChart-${key}`;
  const portsId = `portsChart-${key}`;
  const dataleakId = `dataleakChart-${key}`;
  const certId = `certChart-${key}`;

  const displayIndex = document.querySelectorAll(".accordion-card").length + 1;

  const card = document.createElement("div");
  card.classList.add("accordion-card");
  card.dataset.reportId = rowId || ""; // utile per delete

  card.innerHTML = `
    <div class="accordion-header" data-target="${collapseId}">
      <h3>Report #${displayIndex} — Rischio ${result?.risk_score ?? "—"}</h3>
      <button class="delete-report">Elimina</button>
    </div>

    <div id="${collapseId}" class="accordion-body">

      <div class="card section vulnerabilita">
        <h4>Vulnerabilità</h4>
        <div><span class="label">Totale:</span> ${
          (result?.n_vulns?.total?.critical ?? 0) +
          (result?.n_vulns?.total?.high ?? 0) +
          (result?.n_vulns?.total?.medium ?? 0) +
          (result?.n_vulns?.total?.info ?? 0)
        }</div>
        <canvas id="${vulnId}"></canvas>
      </div>

      <div class="card section servizi">
        <h4>Esposizione Servizi</h4>
        <div><span class="label">Asset totali:</span> ${result?.n_asset ?? "—"}</div>
        <div><span class="label">IPv4:</span> ${result?.unique_ipv4 ?? "—"}</div>
        <div><span class="label">IPv6:</span> ${result?.unique_ipv6 ?? "—"}</div>
        <canvas id="${portsId}"></canvas>
      </div>

      <div class="card section dati">
        <h4>Fuga di Dati</h4>
        <canvas id="${dataleakId}"></canvas>
      </div>

      <div class="card section certificati">
        <h4>Certificati</h4>
        <canvas id="${certId}"></canvas>
      </div>

      <div class="card section email">
        <h4>Sicurezza Email</h4>
        <div><span class="label">Spoofing:</span> ${result?.email_security?.spoofable ?? "—"}</div>
        <div><span class="label">DMARC:</span> ${result?.email_security?.dmarc_policy ?? "—"}</div>
        <canvas id="${riskId}"></canvas>
      </div>
    </div>
  `;

  accordion.appendChild(card);

  // Toggle accordion (event listener usa SEMPRE l'ID stabile)
  const header = card.querySelector(".accordion-header");
  header.addEventListener("click", (e) => {
    if (e.target.closest(".delete-report")) return;
    const body = document.getElementById(collapseId);
    body.classList.toggle("open");
  });

  // Delete handler
  const delBtn = card.querySelector(".delete-report");
  delBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (!rowId) return;
    const ok = confirm("Eliminare questo report?");
    if (!ok) return;

    const { error } = await supabase.from("reports").delete().eq("id", rowId);
    if (error) {
      alert("Errore eliminazione: " + error.message);
      return;
    }
    card.remove();
    reindexReports(); // aggiorna SOLO le etichette "Report #N"
  });

  // --- GRAFICI ---
  // Rischio Totale (doughnut)
  const risk = toNum(result?.risk_score);
  new Chart(document.getElementById(riskId), {
    type: "doughnut",
    data: {
      labels: ["Rischio Totale", "Residuo"],
      datasets: [{ data: [risk, 100 - risk], backgroundColor: ["#ef4444", "#22c55e"] }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" }, title: { display: true, text: "Rischio Totale" } },
      cutout: "60%",
    },
  });

  // Vulnerabilità (bar)
  let total = result?.n_vulns?.total;
  if (!total) {
    const a = result?.n_vulns?.active || {};
    const p = result?.n_vulns?.passive || {};
    total = {
      critical: (a.critical || 0) + (p.critical || 0),
      high: (a.high || 0) + (p.high || 0),
      medium: (a.medium || 0) + (p.medium || 0),
      info: (a.info || 0) + (p.info || 0),
    };
  }
  new Chart(document.getElementById(vulnId), {
    type: "bar",
    data: {
      labels: ["Critical", "High", "Medium", "Info"],
      datasets: [{
        data: [total.critical || 0, total.high || 0, total.medium || 0, total.info || 0],
        backgroundColor: ["#dc2626", "#f97316", "#eab308", "#3b82f6"],
      }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } } },
  });

  // Esposizione Servizi (bar)
  const ports = normalizePorts(result?.n_port);
  new Chart(document.getElementById(portsId), {
    type: "bar",
    data: {
      labels: ports.labels,
      datasets: [{ label: "Esposizioni per porta", data: ports.values, backgroundColor: "#6366f1" }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `Porta ${ctx.label}: ${ctx.raw}` } },
      },
      interaction: { mode: "index", intersect: false },
      hover: { mode: "index", intersect: false },
      scales: { y: { beginAtZero: true } },
    },
  });

  // Fuga di Dati (bar)
  const dl = result?.n_dataleak?.total || {};
  const dlVals = [dl.domain_stealer || 0, dl.potential_stealer || 0, dl.other_stealer || 0];
  new Chart(document.getElementById(dataleakId), {
    type: "bar",
    data: {
      labels: ["Domain", "Potential", "Other"],
      datasets: [{ data: dlVals, backgroundColor: ["#3b82f6", "#f59e0b", "#94a3b8"] }],
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } } },
  });

  // Certificati (doughnut)
  const certAtt = result?.n_cert_attivi || 0;
  const certSca = result?.n_cert_scaduti || 0;
  new Chart(document.getElementById(certId), {
    type: "doughnut",
    data: {
      labels: ["Attivi", "Scaduti"],
      datasets: [{ data: [certAtt, certSca], backgroundColor: ["#22c55e", "#ef4444"] }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: "bottom" }, title: { display: false } },
      cutout: "60%",
    },
  });

  // Applica filtro corrente
  applyFilterToCard(card);
  return card;
}

// ---------- Boot (fetch Supabase) ----------
async function boot() {
  const { data: reports, error } = await supabase
    .from("reports")
    .select("id, raw_json, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    accordion.innerHTML = `<p class="error">Errore Supabase: ${error.message}</p>`;
    return;
  }

  if (!reports || reports.length === 0) {
    accordion.innerHTML = `<p class="error">Nessun report presente nel database.</p>`;
    return;
  }

  reports.forEach((row) => {
    renderReport(row.raw_json, row.id); // usa ID stabile di Supabase
  });

  // Apri il primo
  const firstBody = document.querySelector(".accordion-card .accordion-body");
  firstBody?.classList.add("open");

  // Aggiorna numerazione visiva
  reindexReports();
}

// ---------- Aggiungi Report ----------
async function inviaReport() {
  try {
    const payload = {
      domain_name: "manual.demo",
      risk_score: Math.floor(Math.random() * 100),
      raw_json: {
        risk_score: Math.floor(Math.random() * 100),
        n_vulns: { total: { critical: 1, high: 2, medium: 3, info: 4 } },
        n_asset: 10,
        unique_ipv4: 5,
        unique_ipv6: 1,
        n_cert_attivi: 2,
        n_cert_scaduti: 1,
        n_port: { 80: { n: 3 }, 443: { n: 5 }, 8080: { n: 1 } },
        n_dataleak: {
          total: { domain_stealer: 1, potential_stealer: 12, other_stealer: 2 },
        },
        email_security: { spoofable: "No", dmarc_policy: "Reject" },
      },
    };

    // Inserisci e rendi con l'ID reale
    const { data, error } = await supabase.from("reports").insert(payload).select();
    if (error) throw error;

    const row = data[0];
    const card = renderReport(row.raw_json, row.id);
    const body = card.querySelector(".accordion-body");
    body.classList.add("open");
    card.scrollIntoView({ behavior: "smooth", block: "start" });

    reindexReports(); // aggiorna solo “Report #N”
  } catch (err) {
    console.error("Errore inserimento:", err);
    alert("Errore nell'invio del report");
  }
}
