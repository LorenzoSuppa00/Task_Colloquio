const accordion = document.getElementById("accordion");

// --- Stato filtro globale ---
let activeFilter = "tutto"; // "tutto" | "vulnerabilita" | "servizi" | "dati" | "certificati" | "email"

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("inviaBtn").addEventListener("click", inviaReport);

  // Wiring barra filtri globale
  const gf = document.getElementById("globalFilters");
  if (gf) {
    gf.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-section]");
      if (!btn) return;
      activeFilter = btn.dataset.section;

      // Aggiorna stato attivo UI
      gf.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === btn));

      // Applica a tutte le card
      applyGlobalFilter();
    });
  }
});

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

// Applica il filtro globale a TUTTE le card
function applyGlobalFilter() {
  document.querySelectorAll(".accordion-card").forEach(applyFilterToCard);
}

function updateLayoutClass(body) {
  const visible = [...body.querySelectorAll(".section")]
    .filter(sec => sec.style.display !== "none").length;

  body.classList.remove("one-visible", "two-visible");
  if (visible === 1) body.classList.add("one-visible");
  if (visible === 2) body.classList.add("two-visible");
}


// Applica il filtro globale ad una singola card
function applyFilterToCard(card) {
  const body = card.querySelector(".accordion-body");
  const sections = body.querySelectorAll(".section");

  if (activeFilter === "tutto") {
    sections.forEach(sec => (sec.style.display = "block"));
  } else {
    sections.forEach(sec => {
      sec.style.display = sec.classList.contains(activeFilter) ? "block" : "none";
    });
  }

  updateLayoutClass(body);
}


function renderReport(data, idx) {
  const result =
    data && data.results && data.results[0] ? data.results[0] : null;
  if (!result) throw new Error("JSON privo di results[0]");

  const collapseId = `collapse-${idx}`;

  const card = document.createElement("div");
  card.classList.add("accordion-card");
  card.innerHTML = `
    <div class="accordion-header" data-target="${collapseId}">
      <h3>Report #${idx + 1} — Rischio ${result.risk_score ?? "—"}</h3>
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
        <canvas id="vulnChart-${idx}"></canvas>
      </div>

      <div class="card section servizi">
        <h4>Esposizione Servizi</h4>
        <div><span class="label">Asset totali:</span> ${
          result.n_asset ?? "—"
        }</div>
        <div><span class="label">IPv4:</span> ${result.unique_ipv4 ?? "—"}</div>
        <div><span class="label">IPv6:</span> ${result.unique_ipv6 ?? "—"}</div>
        <canvas id="portsChart-${idx}"></canvas>
      </div>

      <div class="card section dati">
        <h4>Fuga di Dati</h4>
        <div><span class="label">Domain stealer:</span> ${
          result?.n_dataleak?.total?.domain_stealer ?? "—"
        }</div>
        <div><span class="label">Potential stealer:</span> ${
          result?.n_dataleak?.total?.potential_stealer ?? "—"
        }</div>
        <div><span class="label">Other stealer:</span> ${
          result?.n_dataleak?.total?.other_stealer ?? "—"
        }</div>
      </div>

      <div class="card section certificati">
        <h4>Certificati</h4>
        <div><span class="label">Attivi:</span> ${
          result.n_cert_attivi ?? "—"
        }</div>
        <div><span class="label">Scaduti:</span> ${
          result.n_cert_scaduti ?? "—"
        }</div>
      </div>

      <div class="card section email">
        <h4>Sicurezza Email</h4>
        <div><span class="label">Spoofing:</span> ${
          result?.email_security?.spoofable ?? "—"
        }</div>
        <div><span class="label">DMARC:</span> ${
          result?.email_security?.dmarc_policy ?? "—"
        }</div>
        <canvas id="riskChart-${idx}"></canvas>
      </div>
    </div>
  `;

  accordion.appendChild(card);

  // toggle accordion
  card.querySelector(".accordion-header").addEventListener("click", () => {
    const body = document.getElementById(collapseId);
    body.classList.toggle("open");
  });

  // --- GRAFICI ---
  const risk = toNum(result.risk_score);
  new Chart(document.getElementById(`riskChart-${idx}`), {
    type: "doughnut",
    data: {
      labels: ["Rischio", "Residuo"],
      datasets: [
        { data: [risk, 100 - risk], backgroundColor: ["#ef4444", "#22c55e"] },
      ],
    },
    options: { 
      plugins: { legend: { position: "bottom" } }, 
      cutout: "60%",
      responsive: true,
      maintainAspectRatio: false,    
    },
  });

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
  new Chart(document.getElementById(`vulnChart-${idx}`), {
    type: "bar",
    data: {
      labels: ["Critical", "High", "Medium", "Info"],
      datasets: [
        {
          data: [
            total.critical || 0,
            total.high || 0,
            total.medium || 0,
            total.info || 0,
          ],
          backgroundColor: ["#dc2626", "#f97316", "#eab308", "#3b82f6"],
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
      responsive: true,
      maintainAspectRatio: false,  
    },
  });

  const ports = normalizePorts(result.n_port);
  new Chart(document.getElementById(`portsChart-${idx}`), {
    type: "bar",
    data: {
      labels: ports.labels,
      datasets: [
        {
          label: "Esposizioni per porta",
          data: ports.values,
          backgroundColor: "#6366f1",
        },
      ],
    },
    options: {
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
      responsive: true,
      maintainAspectRatio: false,  
    },
  });

  // Applica subito il filtro globale corrente a questa card appena creata
  applyFilterToCard(card);
}

async function boot() {
  try {
    const res = await fetch("summary2.0.json", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    renderReport(data, 0); // carica sempre il primo report da JSON
    document.querySelector(".accordion-body")?.classList.add("open");
  } catch (e) {
    accordion.innerHTML = `<p class="error">Errore nel caricamento: ${e.message}</p>`;
  }
}

boot();

async function inviaReport() {
  try {
    const nuovo = {
      results: [
        {
          risk_score: Math.floor(Math.random() * 100),
          n_vulns: { total: { critical: 1, high: 2, medium: 3, info: 4 } },
          n_asset: 10,
          unique_ipv4: 5,
          unique_ipv6: 1,
          n_cert_attivi: 2,
          n_cert_scaduti: 1,
          n_port: { 80: { n: 3 }, 443: { n: 5 } },
          n_dataleak: {
            total: { domain_stealer: 1, potential_stealer: 0, other_stealer: 2 },
          },
          email_security: { spoofable: "No", dmarc_policy: "Reject" },
        },
      ],
    };
    renderReport(nuovo, document.querySelectorAll(".accordion-card").length);
  } catch (err) {
    console.error("Errore POST:", err);
    alert("Errore nell'invio del report");
  }
}
