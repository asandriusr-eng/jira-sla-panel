const SLA_FIELD = "customfield_10778";
const REFRESH_INTERVAL = 60000; // 1 minute

function jiraGet(url) {
  return AdaptavistBridge.request({
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
  const output = document.getElementById("sla-content");

  try {
    const currentKey = AdaptavistBridgeContext.context.issueKey;

    const currentIssue = await jiraGet(
      `/rest/api/2/issue/${currentKey}?fields=issuelinks`
    );

    const links = currentIssue.fields.issuelinks || [];

    const supportLink = links.find(link => {
      if (link.type?.name !== "Problem/Incident") return false;

      const linked = link.outwardIssue || link.inwardIssue;
      return linked?.key?.startsWith("AS-");
    });

    if (!supportLink) {
      output.innerHTML =
        '<div class="sla-meta">Susieta AS Support užklausa nerasta.</div>';
      return;
    }

    const supportIssue = supportLink.outwardIssue || supportLink.inwardIssue;
    const asKey = supportIssue.key;

    const asIssue = await jiraGet(
      `/rest/api/2/issue/${asKey}?fields=${SLA_FIELD},status`
    );

    const sla = asIssue.fields[SLA_FIELD];
    const cycle = sla?.ongoingCycle;

    if (!cycle) {
      output.innerHTML = `
        <div><strong>${asKey}</strong></div>
        <div class="sla-meta">Aktyvaus Internal SLA nėra.</div>
      `;
      return;
    }

    const breachTime =
      cycle.breachTime?.iso8601 ||
      cycle.breachTime?.jira;

    const state =
      cycle.paused === true ? "Pristabdytas" : "Skaičiuojamas";

    output.innerHTML = `
      <div>
        <strong>${asKey}</strong>
        · ${asIssue.fields.status?.name || ""}
      </div>

      <div class="sla-deadline">
        ${formatDate(breachTime)}
      </div>

      <div class="sla-meta">
        Internal SLA: ${state}
      </div>
    `;
  } catch (e) {
    console.error(e);
    output.innerHTML =
      '<div class="sla-error">Nepavyko gauti Support SLA duomenų.</div>';
  }
}

loadSla();
setInterval(loadSla, REFRESH_INTERVAL);
