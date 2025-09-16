const output = document.getElementById("output");

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
      typeof v === "object" && v !== null
        ? Number(v.n || 0)
        : Number(v || 0);
    labels.push(k);
    values.push(isNaN(n) ? 0 : n);
  }
  return { labels, values };
}

function render(data) {
  const result =
    data && data.results && data.results[0] ? data.results[0] : null;
  if (!result) throw new Error("JSON privo di results[0]");

  // Info base
  output.innerHTML = `
    <div class="card section vulnerabilita">
        <h3>Vulnerabilità</h3>
        <div><span class="label">Totale vulnerabilità:</span> ${
          result.n_vulns?.total?.critical +
          result.n_vulns?.total?.high +
          result.n_vulns?.total?.medium +
          result.n_vulns?.total?.info
        }</div>
    </div>

    <div class="card section servizi">
        <h3>Esposizione Servizi</h3>
        <div><span class="label">Asset totali:</span> ${
          result.n_asset ?? "—"
        }</div>
        <div><span class="label">IPv4:</span> ${
          result.unique_ipv4 ?? "—"
        }</div>
        <div><span class="label">IPv6:</span> ${
          result.unique_ipv6 ?? "—"
        }</div>
    </div>

    <div class="card section dati">
        <h3>Fuga di Dati</h3>
        <div><span class="label">Domain stealer:</span> ${
          result.n_dataleak?.total?.domain_stealer ?? "—"
        }</div>
        <div><span class="label">Potential stealer:</span> ${
          result.n_dataleak?.total?.potential_stealer ?? "—"
        }</div>
        <div><span class="label">Other stealer:</span> ${
          result.n_dataleak?.total?.other_stealer ?? "—"
        }</div>
    </div>

    <div class="card section certificati">
        <h3>Certificati</h3>
        <div><span class="label">Certificati attivi:</span> ${
          result.n_cert_attivi ?? "—"
        }</div>
        <div><span class="label">Certificati scaduti:</span> ${
          result.n_cert_scaduti ?? "—"
        }</div>
    </div>

    <div class="card section email">
        <h3>Sicurezza Email</h3>
        <div><span class="label">Spoofing:</span> ${
          result.email_security?.spoofable ?? "—"
        }</div>
        <div><span class="label">DMARC:</span> ${
          result.email_security?.dmarc_policy ?? "—"
        }</div>
    </div>
  `;

  // Grafico rischio
  const risk = toNum(result.risk_score);
  new Chart(document.getElementById("riskChart"), {
    type: "doughnut",
    data: {
      labels: ["Rischio", "Residuo"],
      datasets: [
        {
          data: [risk, 100 - risk],
          backgroundColor: ["#ef4444", "#22c55e"],
        },
      ],
    },
    options: {
      plugins: { legend: { position: "bottom" } },
      cutout: "60%",
    },
  });

  // Grafico vulnerabilità
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
  new Chart(document.getElementById("vulnChart"), {
    type: "bar",
    data: {
      labels: ["Critical", "High", "Medium", "Info"],
      datasets: [
        {
          label: "Vulnerabilità",
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
    },
  });

  // Grafico porte esposte
  const ports = normalizePorts(result.n_port);
  new Chart(document.getElementById("portsChart"), {
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
      scales: {
        y: { beginAtZero: true },
        x: { title: { display: true, text: "Porta" } },
      },
    },
  });
}

async function boot() {
  try {
    const res = await fetch("/api/summary", { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    render(data);
  } catch (e) {
    output.innerHTML = `<p class="error">Errore nel caricamento: ${e.message}</p>`;
  }
}

boot();

function filterSection(section) {
  const allSections = document.querySelectorAll(".section");
  allSections.forEach((sec) => {
    if (section === "all" || sec.classList.contains(section)) {
      sec.style.display = "block";
    } else {
      sec.style.display = "none";
    }
  });
}
