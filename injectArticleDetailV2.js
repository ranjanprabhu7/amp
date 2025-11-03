(() => {
  // API endpoint for tracking events
  var eventApiUrl = "https://beta.a.zzazz.com/event";

  // Get viewport dimensions
  function getViewportDimensions() {
    return {
      width: window.innerWidth || document.documentElement.clientWidth,
      height: window.innerHeight || document.documentElement.clientHeight,
    };
  }

  // Track pageview event
  async function trackPageview({ url: pageUrl }) {
    let viewport = getViewportDimensions();
    let userId = localStorage.getItem("user_id") || "";
    let eventData = {
      url: pageUrl,
      device: viewport,
      type: "pageview",
    };

    try {
      let response = await fetch(eventApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId && { "user-id": userId }),
        },
        body: JSON.stringify(eventData),
      });

      let result = await response.json();

      localStorage.setItem("user_id", result.user_id);
      localStorage.setItem("event_id", result.event_id);
    } catch (error) {
      console.error("Pageview error:", error);
    }
  }

  // Send poll event
  async function sendPollEvent() {
    let userId = localStorage.getItem("user_id") || "TEST_ID";
    let pollData = {
      type: "poll",
      id: localStorage.getItem("event_id") || "TEST_ID",
    };

    try {
      await fetch(eventApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-id": userId,
        },
        body: JSON.stringify(pollData),
      });
    } catch (error) {
      console.error("Poll error:", error);
    }
  }

  // Track price event
  async function trackPriceEvent({
    price: priceValue,
    currency: currencyCode,
  }) {
    let userId = localStorage.getItem("user_id") || "TEST_ID";
    let priceEventData = {
      type: "price",
      id: localStorage.getItem("event_id") || "TEST_ID",
      price: priceValue,
      currency: currencyCode,
    };

    try {
      await fetch(eventApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "user-id": userId,
        },
        body: JSON.stringify(priceEventData),
      });
    } catch (error) {
      console.error("Price event error:", error);
    }
  }

  // State variables
  var lastPrice = null;
  var hasTrackedPrice = false;
  var hasShownWidget = false;

  // Fetch and update price display
  var updatePrice = () => {
    let signalDiv = document.getElementById("zzazz-signal-div");
    let productUrl = signalDiv.getAttribute("data-url");
    let priceElement = document.getElementById("zzazz-price");
    let trendUpElement = document.getElementById("zzazz-trend-up");
    let trendDownElement = document.getElementById("zzazz-trend-down");

    let requestBody = JSON.stringify({
      urls: [productUrl],
      currency: "inr",
    });

    fetch("https://v.zzazz.com/v2/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: requestBody,
    })
      .then((response) => response.json())
      .then((data) => {
        let priceData = data[productUrl];

        if (!priceData || priceData.price === undefined) {
          return;
        }

        let currentPrice = priceData.price.toFixed(2);

        // Show widget if not already shown
        if (!hasShownWidget) {
          signalDiv.classList.remove("hidden");
          hasShownWidget = true;
        }

        // Track price event once
        if (!hasTrackedPrice) {
          trackPriceEvent({
            price: priceData.price,
            currency: "inr",
          });
          hasTrackedPrice = true;
        }

        // Update price text
        priceElement.firstChild.textContent = currentPrice + " ";

        // Show trend indicators
        if (lastPrice !== null) {
          if (currentPrice > lastPrice) {
            trendUpElement.style.display = "flex";
            trendDownElement.style.display = "none";
          } else if (currentPrice < lastPrice) {
            trendDownElement.style.display = "flex";
            trendUpElement.style.display = "none";
          }
        }

        lastPrice = currentPrice;
      })
      .catch((error) => console.error("Price fetch error:", error));
  };

  // Update price every 2 seconds
  setInterval(updatePrice, 2000);

  // Track initial pageview
  trackPageview({ url: "https://hindustantimes.com/amp" });

  // Send poll event every 10 seconds
  setInterval(sendPollEvent, 10000);
})();
