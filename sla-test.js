function startTest() {
    const el = document.getElementById("sla-content");

    if (!el) {
        setTimeout(startTest, 500);
        return;
    }

    el.innerHTML = "1. JavaScript veikia";

    if (typeof window.AdaptavistBridge === "undefined") {
        el.innerHTML += "<br>2. KLAIDA: AdaptavistBridge nerastas";
        return;
    }

    el.innerHTML += "<br>2. AdaptavistBridge veikia";

    if (typeof window.AdaptavistBridgeContext === "undefined") {
        el.innerHTML += "<br>3. KLAIDA: AdaptavistBridgeContext nerastas";
        return;
    }

    const ctx = window.AdaptavistBridgeContext.context;

    el.innerHTML +=
        "<br>3. Context veikia" +
        "<br>4. Work item: <b>" + ctx.issueKey + "</b>" +
        "<br>5. Project: <b>" + ctx.projectKey + "</b>";
}

startTest();
