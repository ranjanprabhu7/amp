// amptest.js

function debug(msg) {
  const dbg = self.document.getElementById("debug");
  if (dbg) {
    dbg.textContent += "\n" + msg;
  }
  // also try AMP.print for dev console (strings only!)
  try {
    self.AMP.print(msg);
  } catch (e) {
    // ignore if AMP.print not available
  }
}

async function fetchPrices() {
  try {
    debug("🔍 Collecting price divs...");
    const priceDivs = self.document.querySelectorAll(".price");
    const urls = Array.from(priceDivs)
      .map((div) => div.getAttribute("data-url"))
      .filter(Boolean);

    debug("Found " + urls.length + " URLs");
    debug("URLs: " + JSON.stringify(urls));

    if (urls.length === 0) {
      debug("❌ No URLs found, exiting");
      return;
    }

    debug("📡 Sending fetch request...");
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

    debug("✅ Response status: " + response.status);

    const text = await response.text();
    debug("Raw response: " + text);

    let data;
    try {
      data = JSON.parse(text);
      debug("Parsed JSON OK");
    } catch (err) {
      debug("❌ JSON parse error: " + err.message);
      return;
    }

    // Expected structure: { prices: { "url1": 100, "url2": 200, ... } }
    const priceMap = data.prices || {};
    debug("Price map: " + JSON.stringify(priceMap));

    priceDivs.forEach((div) => {
      const url = div.dataset.url;
      if (url && priceMap[url] != null) {
        div.textContent = `₹${priceMap[url]}`;
        debug(`✔ Updated price for ${url}: ₹${priceMap[url]}`);
      } else {
        div.textContent = "Price unavailable";
        debug(`⚠ No price found for ${url}`);
      }
    });
  } catch (error) {
    debug("❌ Fetch failed: " + error.message);
    const priceDivs = self.document.querySelectorAll(".price");
    priceDivs.forEach((div) => (div.textContent = "Error loading price"));
  }
}

fetchPrices();
