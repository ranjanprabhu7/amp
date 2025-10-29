const BASE_URL = "https://beta.a.zzazz.com/event";
const ENABLE_API =
  "https://cdn.zzazz.com/widget-rules/0999894d-399f-4e1f-ac8e-25861d437ce8.json";

// --- State ---
let session = {
  user_id: localStorage.getItem("user_id") || null,
  event_id: localStorage.getItem("event_id") || null,
};

// --- Utils ---
function getDeviceDimensions() {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

function updateSession({ user_id, event_id }) {
  if (user_id) {
    session.user_id = user_id;
    localStorage.setItem("user_id", user_id);
  }
  if (event_id) {
    session.event_id = event_id;
    localStorage.setItem("event_id", event_id);
  }
}

// --- Generic Event Sender ---
async function sendEvent(type, extraPayload = {}) {
  const payload = { type, ...extraPayload };
  const headers = {
    "Content-Type": "application/json",
    ...(session.user_id && { "user-id": session.user_id }),
  };

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Event ${type} failed (${res.status})`);

    const json = await res.json();

    // Only pageview returns new IDs
    if (json.user_id || json.event_id) {
      updateSession(json);
    }

    return json;
  } catch (err) {
    console.error(`${type} event error:`, err);
  }
}

// --- Specific Event Wrappers ---
async function sendPageViewEvent(url) {
  const device = getDeviceDimensions();
  return await sendEvent("pageview", { url, device });
}

async function sendPollEvent() {
  if (!session.event_id) return;
  return await sendEvent("poll", { id: session.event_id });
}

async function sendPriceEvent({ price, currency }) {
  if (!session.event_id) return;
  return await sendEvent("price", { id: session.event_id, price, currency });
}

// --- Enable / Disable ---
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

// --- Price Injection ---
let lastPrice = null;
let priceEventSent = false;
let widgetVisible = false;

async function injectPriceArticleLevel() {
  const signalDiv = document.getElementById("zzazz-signal-div");
  const articleUrl = signalDiv?.getAttribute("data-url");
  if (!signalDiv || !articleUrl) return;

  const priceEl = document.getElementById("zzazz-price");
  const trendElUp = document.getElementById("zzazz-trend-up");
  const trendElDown = document.getElementById("zzazz-trend-down");

  try {
    const res = await fetch("https://v.zzazz.com/v2/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: [articleUrl], currency: "inr" }),
    });
    const data = await res.json();
    const priceData = data[articleUrl];

    if (!priceData || priceData.price == null || isNaN(priceData.price)) {
      signalDiv.classList.add("hidden");
      widgetVisible = false;
      return;
    }

    const newPrice = priceData.price.toFixed(2);

    if (!priceEventSent) {
      await sendPriceEvent({ price: priceData.price, currency: "inr" });
      priceEventSent = true;
    }

    priceEl.firstChild.textContent = `${newPrice} `;

    if (!widgetVisible) {
      signalDiv.classList.remove("hidden");
      widgetVisible = true;
    }

    if (lastPrice !== null) {
      if (newPrice > lastPrice) {
        trendElUp.style.display = "flex";
        trendElDown.style.display = "none";
      } else if (newPrice < lastPrice) {
        trendElDown.style.display = "flex";
        trendElUp.style.display = "none";
      }
    }

    lastPrice = newPrice;
  } catch (err) {
    console.error("Price fetch error:", err);
    signalDiv.classList.add("hidden");
  }
}

// --- Bootstrap ---
(async function init() {
  const enabled = await isPillEnabled();
  const signalDiv = document.getElementById("zzazz-signal-div");

  if (!enabled) {
    console.warn("Price pill disabled remotely.");
    if (signalDiv) signalDiv.classList.add("hidden");
    return;
  }

  console.log("Price pill enabled by remote rules.");

  // ✅ Wait for pageview event to finish before starting others
  await sendPageViewEvent(window.location.href);

  // Start polling only after IDs are confirmed
  setInterval(sendPollEvent, 5000);
  setInterval(injectPriceArticleLevel, 3000);
})();
