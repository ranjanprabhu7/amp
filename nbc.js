(() => {
  // ---- Base URL ----
  var BASE_URL = "https://beta.a.zzazz.com/event";

  // ---- Device Info ----
  function getDeviceDimensions() {
    return {
      width: window.innerWidth || document.documentElement.clientWidth,
      height: window.innerHeight || document.documentElement.clientHeight,
    };
  }

  // ---- Pageview Event ----
  async function sendPageview({ url }) {
    let device = getDeviceDimensions();
    let userId = localStorage.getItem("user_id") || "";

    let payload = {
      url,
      device,
      type: "pageview",
    };

    try {
      let response = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId && { "user-id": userId }),
        },
        body: JSON.stringify(payload),
      });

      let data = await response.json();
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("event_id", data.event_id);
    } catch (err) {
      console.error("Pageview error:", err);
    }
  }

  // ---- Poll Event ----
  async function sendPoll() {
    let userId = localStorage.getItem("user_id") || "TEST_ID";
    let payload = {
      type: "poll",
      id: localStorage.getItem("event_id") || "TEST_ID",
    };

    try {
      await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-id": userId,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Poll error:", err);
    }
  }

  // ---- Price Event ----
  async function sendPriceEvent({ price, currency }) {
    let userId = localStorage.getItem("user_id") || "TEST_ID";
    let payload = {
      type: "price",
      id: localStorage.getItem("event_id") || "TEST_ID",
      price,
      currency,
    };

    try {
      await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-id": userId,
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.error("Price event error:", err);
    }
  }

  // ---- Price Logic ----
  var lastPrice = null;
  var priceEventSent = false;
  var widgetVisible = false;

  const fetchAndUpdatePrice = () => {
    let signalDiv = document.getElementById("zzazz-signal-div");
    let articleUrl = signalDiv.getAttribute("data-url");
    let priceEl = document.getElementById("zzazz-price");
    let trendUp = document.getElementById("zzazz-trend-up");
    let trendDown = document.getElementById("zzazz-trend-down");

    let requestBody = JSON.stringify({
      urls: [articleUrl],
      currency: "inr",
    });

    fetch("https://v.zzazz.com/v2/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    })
      .then((res) => res.json())
      .then((data) => {
        let priceData = data[articleUrl];
        if (!priceData || priceData.price === undefined) return;

        let price = priceData.price.toFixed(2);

        // Make widget visible once
        if (!widgetVisible) {
          signalDiv.classList.remove("hidden");
          widgetVisible = true;
        }

        // Send price event once
        if (!priceEventSent) {
          sendPriceEvent({ price: priceData.price, currency: "inr" });
          priceEventSent = true;
        }

        // Update price in UI
        priceEl.firstChild.textContent = price + " ";

        // Handle trend direction
        if (lastPrice !== null) {
          if (price > lastPrice) {
            trendUp.style.display = "flex";
            trendDown.style.display = "none";
          } else if (price < lastPrice) {
            trendDown.style.display = "flex";
            trendUp.style.display = "none";
          }
        }

        lastPrice = price;
      })
      .catch((err) => console.error("Price fetch error:", err));
  };

  // ---- Timers ----
  setInterval(fetchAndUpdatePrice, 2000);
  sendPageview({ url: "https://hindustantimes.com/amp" });
  setInterval(sendPoll, 10000);
})();
