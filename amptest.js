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
      .map((div) => div.getAttribute("data-url"))
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

    priceDivs.forEach((div) => {
      const url = div.getAttribute("data-url");
      const priceInfo = data[url];

      if (priceInfo && priceInfo.price != null) {
        div.textContent = `₹${priceInfo.price.toFixed(2)} (${priceInfo.currency})`;
        if (priceInfo.insights && priceInfo.insights.category) {
          div.textContent += ` • ${priceInfo.insights.category}`;
          div.classList.add("success");
        }
      } else {
        div.textContent = "Price unavailable";
        div.classList.add("error");
      }
    });
  } catch (error) {
    debug("❌ Fetch failed: " + error.message);
    const priceDivs = self.document.querySelectorAll(".price");
    priceDivs.forEach((div) => (div.textContent = `could not fetch price`));
  }
}

debug("🚀 amptest.js started");

// Initial fetch
fetchPrices();

// Update every 5 seconds (5000 ms)
// setInterval(fetchPrices, 5000);
// If you really need a recurring update, use a recursive setTimeout
function pollPrices() {
    fetchPrices().then(() => {
        setTimeout(pollPrices, 5000); // 5 seconds
    });
}
