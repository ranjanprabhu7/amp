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

  function debug(msg) {
    const dbg = self.document.getElementById("debug");
    if (dbg) {
      dbg.textContent += "\n \n \n" + msg;
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
    debug(`Article URL: ${articleUrl}`);
    if (!articleUrl) return;

    try {
      const res = await fetch(`${PRICE_API}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [articleUrl], currency: "inr" }),
      });

      const data = await res.json();
      debug(`Price API response: ${JSON.stringify(data)}`);

      const priceData = data[articleUrl];

      // Check if valid price data exists
      if (
        !priceData ||
        typeof priceData.qap !== "number" ||
        isNaN(priceData.qap)
      ) {
        widgetVisible = false;
        return;
      }

      const priceEl = doc.getElementById("zzazz-price");
      const trendElUp = doc.getElementById("zzazz-trend-up");
      const trendElDown = doc.getElementById("zzazz-trend-down");

      const price = priceData.qap.toFixed(2);

      debug(`Fetched Price: ${price}`);

      // Update DOM safely
      const priceSpans = priceEl.querySelectorAll("span");
      if (priceSpans.length >= 2) {
        // Update the first span (price)
        priceSpans[0].textContent = `${price} `;
        // Keep the second span (QAP) unchanged
      }

      debug(`Updated span 0: ${price}`);

      if (!widgetVisible) {
        widgetVisible = true;
      }

      if (lastPrice !== null) {
        trendElUp.style.display = price >= lastPrice ? "flex" : "none";
        trendElDown.style.display = price < lastPrice ? "flex" : "none";
      }
      lastPrice = price;
    } catch (err) {
      console.error("Price fetch error:", err);
    }
  }

  // ---- Bootstrap ----
  const enabled = await isPillEnabled();
  if (!enabled) {
    console.warn("Price pill disabled remotely.");
    return;
  }

  debug("Price pill enabled by remote rules.");
  // injectPriceArticleLevel();
  setInterval(injectPriceArticleLevel, 3000);
})();
