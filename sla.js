const SLA_FIELD = "customfield_10778";

const output = document.getElementById("sla-content");

async function loadSla() {
    try {
        // 1. Patikrinam, ar ScriptRunner duoda dabartinį work item
        const currentKey = AdaptavistBridgeContext.context.issueKey;

        output.innerHTML =
            `1. Current work item: <b>${currentKey}</b>`;

        // 2. Pasiimam dabartinio work item linkus
        const currentIssue = await AdaptavistBridge.request({
            url: `/rest/api/2/issue/${currentKey}?fields=issuelinks`,
            type: "GET"
        });

        const links = currentIssue.fields?.issuelinks || [];

        output.innerHTML +=
            `<br>2. Links found: <b>${links.length}</b>`;

        // 3. Randame AS-xxxxx
        let asKey = null;

        for (const link of links) {
            const inward = link.inwardIssue?.key;
            const outward = link.outwardIssue?.key;

            if (inward?.startsWith("AS-")) {
                asKey = inward;
                break;
            }

            if (outward?.startsWith("AS-")) {
                asKey = outward;
                break;
            }
        }

        if (!asKey) {
            output.innerHTML +=
                `<br>3. <b>AS Support link nerastas</b>`;
            return;
        }

        output.innerHTML +=
            `<br>3. Support work item: <b>${asKey}</b>`;

        // 4. Pasiimam AS Internal SLA
        const supportIssue = await AdaptavistBridge.request({
            url: `/rest/api/2/issue/${asKey}?fields=${SLA_FIELD},status`,
            type: "GET"
        });

        output.innerHTML +=
            `<br>4. AS issue loaded`;

        const sla = supportIssue.fields?.[SLA_FIELD];

        if (!sla) {
            output.innerHTML +=
                `<br>5. <b>Internal SLA field nerastas</b>`;
            return;
        }

        const cycle = sla.ongoingCycle;

        if (!cycle) {
            output.innerHTML +=
                `<br>5. <b>ongoingCycle nerastas</b>`;
            return;
        }

        const breachTime =
            cycle.breachTime?.iso8601 ||
            cycle.breachTime?.jira;

        output.innerHTML = `
            <div>
                <strong>Support SLA deadline</strong>
            </div>

            <div style="font-size:18px;font-weight:600;margin-top:6px">
                ${breachTime || "Deadline nerastas"}
            </div>

            <div style="margin-top:5px">
                ${asKey} · ${supportIssue.fields?.status?.name || ""}
            </div>
        `;

    } catch (e) {
        console.error(e);

        output.innerHTML = `
            <b>KLAIDA</b><br>
            ${e?.message || String(e)}
        `;
    }
}

loadSla();
