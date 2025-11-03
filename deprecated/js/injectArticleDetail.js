const BASE_URL = "https://beta.a.zzazz.com/event";

function getDeviceDimensions() {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

// --- Analytics ---
async function sendPageview({ url }) {
  const device = getDeviceDimensions();
  const user_id = localStorage.getItem("user_id") || "";
  const payload = { url, device, type: "pageview" };

  try {
    const res = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(user_id && { "user-id": user_id }),
      },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    localStorage.setItem("user_id", json.user_id);
    localStorage.setItem("event_id", json.event_id);
  } catch (err) {
    console.error("Pageview error:", err);
  }
}

async function sendPoll() {
  const user_id = localStorage.getItem("user_id") || "TEST_ID";
  const event_id = localStorage.getItem("event_id") || "TEST_ID";
  const payload = { type: "poll", id: event_id };

  try {
    await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-id": user_id,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Poll error:", err);
  }
}

async function sendPriceEvent({ price, currency }) {
  const user_id = localStorage.getItem("user_id") || "TEST_ID";
  const event_id = localStorage.getItem("event_id") || "TEST_ID";
  const payload = { type: "price", id: event_id, price, currency };

  try {
    await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "user-id": user_id,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Price event error:", err);
  }
}

// --- Price Injection ---
let lastPrice = null;
let priceEventSent = false;
let widgetVisible = false;

const injectPriceArticleLevel = () => {
  const signalDiv = document.getElementById("zzazz-signal-div");
  const articleUrl = signalDiv.getAttribute("data-url");
  const priceEl = document.getElementById("zzazz-price");
  const trendElUp = document.getElementById("zzazz-trend-up");
  const trendElDown = document.getElementById("zzazz-trend-down");

  const payload = JSON.stringify({ urls: [articleUrl], currency: "inr" });

  fetch("https://v.zzazz.com/v2/price", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
  })
    .then((res) => res.json())
    .then((data) => {
      const priceData = data[articleUrl];
      if (!priceData || priceData.price === undefined) return;

      const newPrice = priceData.price.toFixed(2);

      // ✅ Show the widget once price is available
      if (!widgetVisible) {
        signalDiv.classList.remove("hidden");
        widgetVisible = true;
      }

      // Send event once
      if (!priceEventSent) {
        sendPriceEvent({ price: priceData.price, currency: "inr" });
        priceEventSent = true;
      }

      // Update price
      priceEl.firstChild.textContent = newPrice + " ";

      // Update trend icon
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
    })
    .catch((err) => console.error("Price fetch error:", err));
};

// Poll price every 2s
setInterval(injectPriceArticleLevel, 2000);

// Analytics
sendPageview({ url: window.location.origin });
setInterval(sendPoll, 10000);
