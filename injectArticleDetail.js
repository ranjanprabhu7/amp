const BASE_URL = "https://beta.a.zzazz.com/event";

function getDeviceDimensions() {
  return {
    width: window.innerWidth || document.documentElement.clientWidth,
    height: window.innerHeight || document.documentElement.clientHeight,
  };
}

// --- Analytics Calls ---
async function sendPageview({ url }) {
  const device = getDeviceDimensions();
  const user_id = localStorage.getItem("user_id") || "";

  const payload = {
    url: url || "",
    device,
    type: "pageview",
  };

  try {
    const response = await fetch(BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(user_id && { "user-id": user_id }),
      },
      body: JSON.stringify(payload),
    });
    const json = await response.json();
    localStorage.setItem("user_id", json.user_id);
    localStorage.setItem("event_id", json.event_id);
  } catch (error) {
    console.error("Pageview error:", error);
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
  } catch (error) {
    console.error("Poll error:", error);
  }
}

// --- Price Injection ---
let lastPrice = null;

const injectPriceArticleLevel = () => {
  const signalDiv = document.getElementById("zzazz-signal-div");
  const articleUrl = signalDiv.getAttribute("data-url");
  const priceEl = document.getElementById("zzazz-price");
  const trendElUp = document.getElementById("zzazz-trend-up");
  const trendElDown = document.getElementById("zzazz-trend-down");

  const raw = JSON.stringify({ urls: [articleUrl], currency: "inr" });
  const requestOptions = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw,
  };

  fetch("https://v.zzazz.com/v2/price", requestOptions)
    .then((res) => res.json())
    .then((data) => {
      const priceData = data[articleUrl];
      const newPrice = priceData.price?.toFixed(2) || "0.00";

      // Update price
      if (priceEl) {
        priceEl.firstChild.textContent = newPrice + " ";
      }

      // Update trend icon

      if (lastPrice !== null) {
        if (newPrice > lastPrice) {
          trendElDown.style.display = "none";
          trendElUp.style.cssText = `
              padding: 4px;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 16px;
              width: 16px;
              background-color: #2aba7e33;
              display: flex;
            `;
        } else if (newPrice < lastPrice) {
          trendElUp.style.display = "none";
          trendElDown.style.cssText = `
              padding: 4px;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 16px;
              width: 16px;
              background-color: #ff4d4d33;
              display: flex;
            `;
        }
      }
      lastPrice = newPrice;
    })
    .catch((err) => console.error("Price fetch error:", err));
};

// Run every 2s for price updates
setInterval(injectPriceArticleLevel, 2000);

// Analytics
sendPageview({ url: "https://hindustantimes.com/amp" });
setInterval(sendPoll, 10000);
