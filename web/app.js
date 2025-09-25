let allProxies = [];
let currentPage = 1;
const pageSize = 15;

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("closed");
  document.body.classList.toggle("collapsed");
}

async function updatePing(prxIP, prxPort, elId) {
  try {
    const res = await fetch(`/check?target=${prxIP}:${prxPort}`);
    const data = await res.json();
    document.getElementById(elId).textContent =
      (data.ping && data.ping + " ms") || data.status || "OK";
  } catch {
    document.getElementById(elId).textContent = "Fail";
  }
}

function renderTable(proxies) {
  const container = document.getElementById("proxyContainer");
  container.innerHTML = "";

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;
  const pageData = proxies.slice(start, end);

  const table = document.createElement("table");
  table.innerHTML = `
    <tr><th>IP</th><th>Port</th><th>ORG</th><th>Country</th><th>Ping</th><th>Action</th></tr>
    ${pageData
      .map(
        (p, i) => `
        <tr id="row-${i}">
          <td>${p.prxIP}</td>
          <td>${p.prxPort}</td>
          <td>${p.org}</td>
          <td>${p.country}</td>
          <td id="ping-${i}">Loading...</td>
          <td><button onclick="openProxy('${p.prxIP}','${p.prxPort}','${p.org}')">Open</button></td>
        </tr>`
      )
      .join("")}
  `;
  container.appendChild(table);

  pageData.forEach((p, i) => {
    updatePing(p.prxIP, p.prxPort, `ping-${i}`);
  });

  renderPagination(proxies.length);
}

function renderPagination(totalItems) {
  const container = document.getElementById("proxyContainer");
  const totalPages = Math.ceil(totalItems / pageSize);
  if (totalPages <= 1) return;

  const nav = document.createElement("div");
  nav.className = "pagination";

  if (currentPage > 1) {
    const prev = document.createElement("button");
    prev.textContent = "Previous";
    prev.onclick = () => { currentPage--; renderTable(allProxies); };
    nav.appendChild(prev);
  }

  const maxVisible = 3;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || 
      i === totalPages || 
      (i >= currentPage - maxVisible && i <= currentPage + maxVisible)
    ) {
      const btn = document.createElement("button");
      btn.textContent = i;
      if (i === currentPage) btn.classList.add("active");
      btn.onclick = () => { currentPage = i; renderTable(allProxies); };
      nav.appendChild(btn);
    } else if (
      i === 2 && currentPage > maxVisible + 2 ||
      i === totalPages - 1 && currentPage < totalPages - (maxVisible + 1)
    ) {
      const span = document.createElement("span");
      span.textContent = "...";
      nav.appendChild(span);
    }
  }

  if (currentPage < totalPages) {
    const next = document.createElement("button");
    next.textContent = "Next";
    next.onclick = () => { currentPage++; renderTable(allProxies); };
    nav.appendChild(next);
  }

  container.appendChild(nav);
}

async function loadProxies() {
  const res = await fetch("/api/v1/sub?format=json");
  const data = await res.json();

  allProxies = data;

  const grouped = {};
  data.forEach((prx) => {
    if (!grouped[prx.country]) grouped[prx.country] = [];
    grouped[prx.country].push(prx);
  });

  const select = document.getElementById("countryFilter");
  Object.keys(grouped).forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    select.appendChild(opt);
  });

  renderTable(allProxies);

  select.addEventListener("change", () => {
    const selected = select.value;
    if (selected === "all") {
      allProxies = data;
    } else {
      allProxies = grouped[selected] || [];
    }
    currentPage = 1;
    renderTable(allProxies);
  });
}

function openProxy(ip, port, org) {
  const modal = document.getElementById("proxyModal");
  modal.style.display = "block";
  document.getElementById("modal-ip").textContent = ip;
  document.getElementById("modal-port").textContent = port;
  document.getElementById("modal-org").textContent = org;
  document.getElementById("modal-ping").textContent = "Testing...";

  (async () => {
    const start = Date.now();
    try {
      await fetch(`https://${ip}:${port}`, { mode: "no-cors" });
      document.getElementById("modal-ping").textContent = (Date.now() - start) + " ms";
    } catch {
      document.getElementById("modal-ping").textContent = "Timeout/Blocked";
    }
  })();
}

function closeModal() {
  document.getElementById("proxyModal").style.display = "none";
}

window.onload = loadProxies;
