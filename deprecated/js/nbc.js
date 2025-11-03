(async () => {
  const PRICE_API = "https://beta.v.zzazz.com/v3/price";

  async function injectPriceArticleLevel() {
    const signalDiv = document.getElementById("zzazz-signal-div");
    if (!signalDiv) return;

    const articleUrl = signalDiv.getAttribute("data-url");
    if (!articleUrl) return;

    try {
      const res = await fetch(PRICE_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: [articleUrl], currency: "inr" }),
      });

      const data = await res.json();
      const priceData = data[articleUrl];

      if (!priceData || isNaN(priceData.qap)) {
        signalDiv.classList.add("hidden");
        return;
      }

      const price = priceData.qap.toFixed(2);
      const priceEl = document.getElementById("zzazz-price");
      const trendElUp = document.getElementById("zzazz-trend-up");
      const trendElDown = document.getElementById("zzazz-trend-down");

      if (priceEl?.firstChild) priceEl.firstChild.textContent = `${price} `;

      signalDiv.classList.remove("hidden");

      if (window.lastPrice !== undefined) {
        trendElUp.style.display = price >= window.lastPrice ? "flex" : "none";
        trendElDown.style.display = price < window.lastPrice ? "flex" : "none";
      }
      window.lastPrice = price;
    } catch (err) {
      signalDiv.classList.add("hidden");
    }
  }

  // Wait until AMP DOM is ready
  const waitForElement = (id, cb) => {
    const el = document.getElementById(id);
    if (el) return cb(el);
    setTimeout(() => waitForElement(id, cb), 300);
  };

  waitForElement("zzazz-signal-div", () => {
    setInterval(injectPriceArticleLevel, 2000);
  });
})();
