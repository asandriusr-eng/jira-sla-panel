const SLA_FIELD = "customfield_10778";
const REFRESH_INTERVAL = 60000;
const BRIDGE_URL = "https://assets.hydrogen.sagittarius.connect.product.adaptavist.com/public/js/bridge.js";

function setOutput(html) {
  const el = document.getElementById("sla-content");
  if (el) el.innerHTML = html;
}

function waitForElement(id, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const el = document.getElementById(id);
      if (el) {
        clearInterval(timer);
        resolve(el);
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error(`HTML element #${id} nerastas`));
      }
    }, 100);
  });
}

function waitForBridge(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    function check() {
      if (
        window.AdaptavistBridge &&
        window.AdaptavistBridgeContext &&
        window.AdaptavistBridgeContext.context
      ) {
        resolve();
        return;
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error("Adaptavist Bridge neužsikrovė per 10 s"));
        return;
      }

      setTimeout(check, 100);
    }

    check();
  });
}

async function ensureBridge() {
  if (
    window.AdaptavistBridge &&
    window.AdaptavistBridgeContext
  ) {
    await waitForBridge();
    return;
  }

  // Separate HTML/CSS/JS režime ScriptRunner turėtų Bridge įterpti pats.
  // Jei jis dar neįkeltas, įkeliame oficialų Bridge failą rankiniu būdu.
  const existing = document.querySelector(`script[src="${BRIDGE_URL}"]`);

  if (!existing) {
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = BRIDGE_URL;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Nepavyko įkelti Adaptavist Bridge JS"));
      document.head.appendChild(script);
    });
  }

  await waitForBridge();
}

async function jiraGet(url) {
  return await window.AdaptavistBridge.request({
    url,
    type: "GET"
  });
}

function formatDate(value) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Vilnius"
  }).format(new Date(value));
}

async function loadSla() {
  try {
    await waitForElement("sla-content");
    setOutput("Kraunama...");

    await ensureBridge();

    const context = window.AdaptavistBridgeContext.context;
    const currentKey = context.issueKey;

    if (!currentKey) {
      throw new Error("ScriptRunner kontekste nėra issueKey");
    }

    const currentIssue = await jiraGet(
      `/rest/api/2/issue/${encodeURIComponent(currentKey)}?fields=issuelinks`
    );

    const links = currentIssue?.fields?.issuelinks || [];

    const supportLink = links.find(link => {
      if (link?.type?.name !== "Problem/Incident") return false;

      const inward = link?.inwardIssue?.key;
      const outward = link?.outwardIssue?.key;

      return inward?.startsWith("AS-") || outward?.startsWith("AS-");
    });

    if (!supportLink) {
      setOutput("Susieta AS Support užklausa nerasta.");
      return;
    }

    const asKey =
      supportLink?.inwardIssue?.key?.startsWith("AS-")
        ? supportLink.inwardIssue.key
        : supportLink.outwardIssue.key;

    const supportIssue = await jiraGet(
      `/rest/api/2/issue/${encodeURIComponent(asKey)}?fields=${SLA_FIELD},status`
    );

    const sla = supportIssue?.fields?.[SLA_FIELD];

    if (!sla) {
      throw new Error(`${asKey}: Internal SLA (${SLA_FIELD}) negautas per REST API`);
    }

    const cycle = sla.ongoingCycle;

    if (!cycle) {
      setOutput(
        `<strong>${asKey}</strong><br>` +
        `Aktyvaus Internal SLA ciklo nėra.`
      );
      return;
    }

    const breachTime =
      cycle?.breachTime?.iso8601 ||
      cycle?.breachTime?.jira ||
      cycle?.breachTime;

    const state =
      cycle?.paused === true ? "Pristabdytas" : "Skaičiuojamas";

    setOutput(`
      <div><strong>${asKey}</strong> · ${supportIssue?.fields?.status?.name || ""}</div>
      <div class="sla-deadline">${formatDate(breachTime)}</div>
      <div class="sla-meta">Internal SLA: ${state}</div>
    `);

  } catch (e) {
    console.error("Support SLA panel error:", e);
    setOutput(
      `<strong>KLAIDA</strong><br>` +
      `<span>${String(e?.message || e)}</span>`
    );
  }
}

loadSla();
setInterval(loadSla, REFRESH_INTERVAL);
