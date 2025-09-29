AMP Integration Notes – Challenges & Final Approach
🚧 Challenges Faced
CORS Issues
Initial scripts failed because the API endpoint didn’t allow cross-origin requests.
Needed proper CORS headers (Access-Control-Allow-Origin: *) on the API.
Authored Node Restrictions
AMP only allows mutation of authored nodes (HTML elements declared inside <amp-script>).
Directly creating new elements (createElement / appendChild) triggered errors like:
[amp-script] Blocked attempts to modify DOM element children
Fixed vs Container Layouts
With layout="fixed", mutations worked because the script container had a fixed height.
With layout="container", mutations required user interaction (e.g., tap/click) to expand height dynamically.
Without enough height, content overflow was blocked.
Batch Fetching Prices
Needed to fetch prices for multiple articles at once.
Direct per-article amp-script calls would have resulted in 30+ requests for 30 articles.
Batch API solved this by sending all URLs in one request.
Debugging Limitations
Console logs from inside AMP scripts (console.log) are not visible in the browser console.
Had to use AMP.print() and a custom #debug div to capture logs/debug info.
Error Handling
API failures initially showed blank placeholders.
Added fallback content (Price unavailable / dummy price) to gracefully handle errors.

Single amp-script for the Page
Wrap the article list in a single <amp-script> instead of creating 30 separate scripts.
This allowed batch fetching + mutation of multiple authored nodes.
<amp-script
  layout="fixed"
  src="https://yourcdn.com/amptest.js"
  height="2800"
  width="800"
>
  <div class="article-list">
    <div class="card">
      <h2>Article Title</h2>
      <amp-img src="./m1.png" width="600" height="300"></amp-img>
      <div class="price" data-url="https://example.com/article1"></div>
    </div>
    <!-- Repeat for other articles -->
  </div>
</amp-script>
Batch API Call
Collect all data-url values from .price placeholders.
Make a single API request with all URLs.
Map results back to their respective div.price.
async function fetchPrices() {
  const priceDivs = self.document.querySelectorAll(".price");
  const urls = Array.from(priceDivs).map(div => div.dataset.url);

  const response = await self.fetch("https://api.example.com/v2/price", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currency: "inr", urls })
  });

  const data = await response.json();
  const priceMap = data.prices || {};

  priceDivs.forEach(div => {
    const url = div.dataset.url;
    div.textContent = priceMap[url] ? `₹${priceMap[url]}` : "Price unavailable";
  });
}

fetchPrices();
Styling via <style amp-custom>
.price {
  display: inline-block;
  margin-top: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #f6f9fc;
  color: #2c3e50;
  font-weight: bold;
  font-size: 14px;
  border: 1px solid #ddd;
}
Debugging Utility
function debug(msg) {
  const dbg = self.document.getElementById("debug");
  if (dbg) dbg.textContent += "\n" + msg;
}
