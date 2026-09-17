const output = document.getElementById("sla-content");
const SLA_FIELD = "customfield_10778";

function show(html) {
  output.innerHTML = html;
}

async function run() {
  try {
    show("1. Bridge tikrinamas...");

    if (typeof AdaptavistBridge === "undefined") {
      throw new Error("AdaptavistBridge nerastas");
    }
    if (typeof AdaptavistBridgeContext === "undefined") {
      throw new Error("AdaptavistBridgeContext nerastas");
    }

    const ctx = AdaptavistBridgeContext.context || {};
    const currentKey = ctx.issueKey;

    show(`1. Current work item: <b>${currentKey || "NERASTAS"}</b>`);

    if (!currentKey) {
      throw new Error("ScriptRunner kontekste nėra issueKey");
    }

    const currentIssue = await AdaptavistBridge.request({
      url: `/rest/api/2/issue/${currentKey}?fields=issuelinks`,
      type: "GET"
    });

    const links = currentIssue?.fields?.issuelinks || [];

    show(
      `1. Current work item: <b>${currentKey}</b><br>` +
      `2. Links found: <b>${links.length}</b>`
    );

    let asKey = null;

    for (const link of links) {
      const inward = link?.inwardIssue?.key;
      const outward = link?.outwardIssue?.key;

      if (inward && inward.startsWith("AS-")) {
        asKey = inward;
        break;
      }
      if (outward && outward.startsWith("AS-")) {
        asKey = outward;
        break;
      }
    }

    if (!asKey) {
      show(
        `1. Current work item: <b>${currentKey}</b><br>` +
        `2. Links found: <b>${links.length}</b><br>` +
        `3. <b>AS Support link nerastas</b>`
      );
      return;
    }

    show(
      `1. Current work item: <b>${currentKey}</b><br>` +
      `2. Links found: <b>${links.length}</b><br>` +
      `3. Support work item: <b>${asKey}</b>`
    );

    const supportIssue = await AdaptavistBridge.request({
      url: `/rest/api/2/issue/${asKey}?fields=${SLA_FIELD},status`,
      type: "GET"
    });

    const sla = supportIssue?.fields?.[SLA_FIELD];

    if (!sla) {
      show(
        `1. Current work item: <b>${currentKey}</b><br>` +
        `2. Links found: <b>${links.length}</b><br>` +
        `3. Support work item: <b>${asKey}</b><br>` +
        `4. AS work item gautas<br>` +
        `5. <b>Internal SLA laukas nerastas REST atsakyme</b>`
      );
      return;
    }

    const cycle = sla?.ongoingCycle;

    if (!cycle) {
      show(
        `1. Current work item: <b>${currentKey}</b><br>` +
        `2. Links found: <b>${links.length}</b><br>` +
        `3. Support work item: <b>${asKey}</b><br>` +
        `4. AS work item gautas<br>` +
        `5. <b>ongoingCycle nerastas</b><br>` +
        `<small>SLA raw: ${JSON.stringify(sla).replace(/</g, "&lt;")}</small>`
      );
      return;
    }

    const breach =
      cycle?.breachTime?.iso8601 ||
      cycle?.breachTime?.jira ||
      cycle?.breachTime ||
      "NERASTAS";

    show(
      `<b>VEIKIA</b><br>` +
      `Current: ${currentKey}<br>` +
      `Support: ${asKey}<br>` +
      `Status: ${supportIssue?.fields?.status?.name || ""}<br>` +
      `Internal SLA deadline: <b>${breach}</b>`
    );

  } catch (e) {
    console.error("SLA DEBUG ERROR", e);
    show(
      `<b>KLAIDA</b><br>` +
      `${String(e?.message || e)}`
    );
  }
}

run();
