const BASE_URL = "https://a.zzazz.com/event";
const PRICE_API_URL = "https://v.zzazz.com/v2/price";
const WIDGET_RULES_API_URL = `https://cdn.zzazz.com/widget-rules`;

// --- Global State ---
let userId = "";
let eventId = "";

// --- Device Info ---
function getDeviceDimensions() {
  return {
    width: window.innerWidth || document.documentElement.clientWidth || 0,
    height: window.innerHeight || document.documentElement.clientHeight || 0,
  };
}

// --- Generic Event Sender ---
async function sendEvent(payload, includeUserId = true) {
  const headers = { "Content-Type": "application/json" };

  if (includeUserId && userId) {
    headers["user-id"] = userId;
  }

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error(`Event error (${payload.type}):`, err);
    return null;
  }
}

// --- Analytics Functions ---
async function sendPageview({ url }) {
  const payload = {
    type: "pageview",
    url,
    device: getDeviceDimensions(),
  };

  const response = await sendEvent(payload);
  if (!response) return;
  userId = response.user_id;
  eventId = response.event_id;
  setInterval(sendPoll, 5000);
}

async function sendPoll() {
  if (!eventId || !userId) return;
  await sendEvent({ type: "poll", id: eventId });
}

async function sendPriceEvent({ price, currency }) {
  await sendEvent({
    type: "price",
    id: eventId,
    price,
    currency,
  });
}

// --- Price Widget ---
class PriceWidget {
  constructor() {
    this.lastPrice = null;
    this.eventSent = false;
    this.visible = false;
    this.signalDiv = document.getElementById("zzazz-signal-div");
    this.priceEl = document.getElementById("zzazz-price");
    this.trendUpEl = document.getElementById("zzazz-trend-up");
    this.trendDownEl = document.getElementById("zzazz-trend-down");
  }

  show() {
    if (!this.visible) {
      this.signalDiv.classList.remove("hidden");
      this.visible = true;
    }
  }

  updateTrend(newPrice) {
    if (this.lastPrice === null) return;

    const trendUp = newPrice >= this.lastPrice;
    const trendDown = newPrice < this.lastPrice;

    this.trendUpEl.style.display = trendUp ? "flex" : "none";
    this.trendDownEl.style.display = trendDown ? "flex" : "none";
  }

  async fetchAndUpdate() {
    const articleUrl = this.signalDiv.getAttribute("data-url");
    const payload = JSON.stringify({ urls: [articleUrl], currency: "inr" });

    try {
      const res = await fetch(PRICE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      const data = await res.json();
      const priceData = data[articleUrl];

      if (!priceData || priceData.price === undefined) return;

      const newPrice = priceData.price.toFixed(2);

      // Only show widget after we have price data
      if (!this.eventSent) {
        await sendPriceEvent({ price: priceData.price, currency: "inr" });
        this.eventSent = true;
      }

      this.priceEl.firstChild.textContent = newPrice + " ";
      this.updateTrend(newPrice);
      this.lastPrice = newPrice;

      // Show widget only after price is set
      this.show();
    } catch (err) {
      console.error("Price fetch error:", err);
    }
  }

  async isPillEnabled() {
    const signalDiv = document.getElementById("zzazz-signal-div");
    const trackingId = signalDiv?.getAttribute("data-zzazz-t-id");
    const data = await fetch(
      `${WIDGET_RULES_API_URL}/${trackingId}.json?dt=${Date.now()}`
    );
    const rules = await data.json();
    return rules.showWidget;
  }
}

// --- Initialize ---
const priceWidget = new PriceWidget();

// Start analytics and wait for pageview before polling
(async () => {
  //   await sendPageview({
  //     url: window.location.origin || document.location.origin || "",
  //   });

  //   const isPillEnabled = await priceWidget.isPillEnabled();
  //   if (!isPillEnabled) return;

  priceWidget.fetchAndUpdate();
  setInterval(() => priceWidget.fetchAndUpdate(), 3000);
})();
