(async function bootstrapPriceWidget() {
  // ---- Local State ----
  const doc = self.document;
  const signalDiv = doc.getElementById("zzazz-signal-div");
  const trackingId = signalDiv?.getAttribute("data-zzazz-t-id");
  const BASE_URL = "https://beta.a.zzazz.com/event";
  const ENABLE_API = `https://cdn.zzazz.com/widget-rules/${trackingId}.json`;
  const PRICE_API = "https://beta.v.zzazz.com/v3/price";

  let session = { user_id: null, event_id: null };
  let eventQueue = [];
  let sessionReady = false;
  let flushing = false;
  let lastPrice = null;
  let widgetVisible = false;
  let pollTimeOut = null;
  let polledUrl = null;
  let pageVisitTime = null;
  let isPriced = false;

  // ---- Utils ----
  const getBrowserDimensions = () => ({
    width: window?.innerWidth || 0,
    height: window?.innerHeight || 0,
  });

  const getDeviceDimensions = () => ({
    width: window?.screen?.width || 0,
    height: window?.screen?.height || 0,
  });

  const updateSession = ({ user_id, event_id }) => {
    if (user_id && !session.user_id) session.user_id = user_id;
    if (event_id && !session.event_id) {
      session.event_id = event_id;
      sessionReady = true;
      flushEventQueue();
    }
  };

  // ---- Event Sender ----
  async function sendEvent(type, extraPayload = {}) {
    const payload = {
      type,
      ...extraPayload,
      id: session.event_id,
      pageId: session.event_id,
    };
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "tracking-id": `${trackingId}`,
      ...(session.user_id && { "user-id": session.user_id }),
    };

    try {
      const res = await fetch(BASE_URL, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      return { ok: res.ok, data };
    } catch (err) {
      console.error(`Failed to send event ${type}:`, err);
      return { ok: false, data: null };
    }
  }

  // ---- Queue ----
  function queueEvent(type, payload = {}) {
    eventQueue.push({ type, payload });
    flushEventQueue();
  }

  async function flushEventQueue() {
    if (!sessionReady || flushing) return;
    flushing = true;
    while (eventQueue.length) {
      const { type, payload } = eventQueue.shift();
      await sendEvent(type, payload);
    }
    flushing = false;
  }

  // ---- Event Wrappers ----
  async function sendPageViewEvent(url) {
    clearTimeout(pollTimeOut);
    polledUrl = url;
    isPriced = false;
    pageVisitTime = new Date().getTime();
    const payload = {
      browser: getBrowserDimensions(),
      device: getDeviceDimensions(),
      url: url,
      referrer: doc.referrer,
    };

    const { ok, data } = await sendEvent("pageview", payload);
    if (ok && data) updateSession(data);
    sendPollEvent(url);
  }

  async function sendPollEvent(url) {
    if (url === polledUrl) {
      let waitTime =
        new Date().getTime() - pageVisitTime > 600000 ? 60000 : 5000;
      try {
        await sendEvent("poll");
      } catch (err) {
        console.error(err);
      } finally {
        pollTimeOut = setTimeout(() => sendPollEvent(url), waitTime);
      }
    }
  }

  async function sendPriceEvent(data) {
    // if (polledUrl && data.url.includes(polledUrl) && !isPriced) {
    if (!isPriced) {
      if (!sessionReady) return queueEvent("price", data);
      try {
        await sendEvent("price", data);
        isPriced = true;
      } catch (err) {
        console.log(err);
      }
    }
  }

  // ---- Remote Enable ----
  async function isPillEnabled() {
    try {
      const res = await fetch(`${ENABLE_API}?dt=${Date.now()}`);
      const data = await res.json();
      return data.showWidget === true;
    } catch (err) {
      console.error("Enable API error:", err);
      return false;
    }
  }

  // ---- Price Logic ----
  async function injectPriceArticleLevel() {
    const articleUrl = signalDiv?.getAttribute("data-url");
    console.log("Article URL:", articleUrl);
    if (!articleUrl) return;

    try {
      const res = await fetch(`${PRICE_API}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [articleUrl], currency: "inr" }),
      });

      const data = await res.json();
      console.log("Price API response:", data);

      const priceData = data[articleUrl];

      if (!priceData || isNaN(priceData.qap)) {
        // signalDiv.classList.add("hidden");
        // signalDiv.style.opacity = "0";
        // signalDiv.style.visibility = "hidden";
        widgetVisible = false;
        return;
      }

      const price = priceData.qap.toFixed(2);
      sendPriceEvent({
        url: articleUrl,
        price: priceData.qap,
        currency: "inr",
      });

      const priceEl = doc.getElementById("zzazz-price");
      const trendElUp = doc.getElementById("zzazz-trend-up");
      const trendElDown = doc.getElementById("zzazz-trend-down");

      // priceEl.firstChild.textContent = `${price} `;
      priceEl.textContent = `${price} `;
      const unitSpan = doc.createElement("span");
      unitSpan.style.fontSize = "16px";
      unitSpan.style.fontWeight = "600";
      unitSpan.textContent = "QAP";
      priceEl.appendChild(unitSpan);

      if (!widgetVisible) {
        // signalDiv.classList.remove("hidden");
        // signalDiv.style.opacity = "1";
        // signalDiv.style.visibility = "visible";
        widgetVisible = true;
      }

      if (lastPrice !== null) {
        trendElUp.style.display = price >= lastPrice ? "flex" : "none";
        trendElDown.style.display = price < lastPrice ? "flex" : "none";
      }
      lastPrice = price;
    } catch (err) {
      console.error("Price fetch error:", err);
      // signalDiv.classList.add("hidden");
      // signalDiv.style.opacity = "0";
      // signalDiv.style.visibility = "hidden";
    }
  }

  // ---- Bootstrap ----
  const enabled = await isPillEnabled();
  if (!enabled) {
    console.warn("Price pill disabled remotely.");
    // signalDiv?.classList.add("hidden");
    // signalDiv.style.opacity = "0";
    // signalDiv.style.visibility = "hidden";
    return;
  }

  console.log("Price pill enabled by remote rules.");
  // sendPageViewEvent(window.location.origin);
  injectPriceArticleLevel();
  setInterval(injectPriceArticleLevel, 3000);
})();
