// ---- Local State ----
const signalDiv = document.getElementById("zzazz-signal-div");
const BASE_URL = "https://a.zzazz.com/event";
const ENABLE_API = `https://cdn.zzazz.com/widget-rules/0999894d-399f-4e1f-ac8e-25861d437ce8.json`;
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

// ---- Price Logic ----
async function injectPriceArticleLevel() {
  const articleUrl = signalDiv?.getAttribute("data-url");
  if (!articleUrl) return;

  try {
    const res = await fetch(`${PRICE_API}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [articleUrl], currency: "inr" }),
    });

    const data = await res.json();
    const priceData = data[articleUrl];

    if (!priceData || isNaN(priceData.qap)) {
      signalDiv.classList.add("hidden");
      widgetVisible = false;
      return;
    }

    const price = priceData.qap.toFixed(2);
    const priceEl = document.getElementById("zzazz-price");
    const trendElUp = document.getElementById("zzazz-trend-up");
    const trendElDown = document.getElementById("zzazz-trend-down");

    priceEl.firstChild.textContent = `${price} `;

    if (!widgetVisible) {
      signalDiv.classList.remove("hidden");
      widgetVisible = true;
    }

    if (lastPrice !== null) {
      trendElUp.style.display = price >= lastPrice ? "flex" : "none";
      trendElDown.style.display = price < lastPrice ? "flex" : "none";
    }
    lastPrice = price;
  } catch (err) {
    console.error("Price fetch error:", err);
    signalDiv.classList.add("hidden");
  }
}

console.log("Price pill enabled by remote rules.");
injectPriceArticleLevel();
