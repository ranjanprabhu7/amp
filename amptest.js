function debug(msg) {
  const dbg = self.document.getElementById("debug");
  if (dbg) {
    dbg.textContent += "\n" + msg;
  }
}

async function fetchPrices() {
  try {
    // Collect all placeholders
    const priceDivs = self.document.querySelectorAll(".price");
    const urls = Array.from(priceDivs)
      .map((div) => div.getAttribute("data-url")) // ✅ use getAttribute
      .filter(Boolean);

    debug("🔍 Collecting price divs... " + urls.length);

    if (urls.length === 0) {
      debug("⚠️ No URLs found!");
      return;
    }

    // Call API
    const response = await self.fetch("https://v.zzazz.com/v2/price", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        currency: "inr",
        urls: urls,
      }),
    });

    const data = await response.json();
    debug("✅ API response received");

    // API response is like:
    // { "url1": { price, currency, insights }, "url2": { ... } }
    priceDivs.forEach((div) => {
      const url = div.getAttribute("data-url");
      const priceInfo = data[url];

      if (priceInfo && priceInfo.price != null) {
        div.textContent = `₹${priceInfo.price.toFixed(2)} (${priceInfo.currency})`;
        if (priceInfo.insights && priceInfo.insights.category) {
          div.textContent += ` • ${priceInfo.insights.category}`;
        }
      } else {
        div.textContent = "Price unavailable";
      }
    });
  } catch (error) {
    debug("❌ Fetch failed: " + error.message);
    const priceDivs = self.document.querySelectorAll(".price");
    priceDivs.forEach((div) => (div.textContent = `50.53`));
  }
}

debug("🚀 amptest.js started");
fetchPrices();
