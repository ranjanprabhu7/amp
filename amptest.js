// amptest.js

function debug(msg) {
  const dbg = self.document.getElementById("debug");
  if (dbg) {
    dbg.textContent += "\n" + msg;
  }
}

async function fetchPrices() {
  try {
    // 1️⃣ Get all price placeholders and collect their URLs
    const priceDivs = self.document.querySelectorAll(".price");
    const urls = Array.from(priceDivs)
      .map((div) => div.dataset.url)
      .filter(Boolean); // ensure no empty URLs

    if (urls.length === 0) return;

    self.AMP.print("URLs to fetch:", JSON.stringify(urls));

    // 2️⃣ Call the batch price API
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
    self.AMP.print("API response:", JSON.stringify(data));
    debug("Fetching API...");
    // Assuming API returns { prices: { "url1": 100, "url2": 200, ... } }
    const priceMap = data.prices || {};

    // 3️⃣ Update each div with the price for its URL
    priceDivs.forEach((div) => {
      div.textContent = JSON.stringify(data);
      // const url = div.dataset.url;
      // if (url && priceMap[url] != null) {
      //   div.textContent = `₹${priceMap[url]}`;
      // } else {
      //   div.textContent = "Price unavailable";
      // }
    });
  } catch (error) {
    // Fallback if API fails
    const priceDivs = self.document.querySelectorAll(".price");
    priceDivs.forEach((div) => (div.textContent = `50.53`));
  }
}

fetchPrices();
