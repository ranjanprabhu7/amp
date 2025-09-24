// amptest.js
(async function fetchDataAndRender() {
  try {
    const response = await self.fetch(
      "https://jsonplaceholder.typicode.com/users"
    );
    const data = await response.json();

    // Select all price placeholders inside the amp-script subtree
    const priceDivs = self.document.querySelectorAll(".price");

    // Assign a user to each price div (cycling if fewer users than divs)
    priceDivs.forEach((div, i) => {
      const user = data[i % data.length];
      div.textContent = `${user.name} (${user.email})`;
      // ✅ Do NOT set styles via JS; use CSS in amp-custom
    });
  } catch (error) {
    // Fallback if API fails
    const priceDivs = self.document.querySelectorAll(".price");
    priceDivs.forEach((div) => (div.textContent = "Error loading data"));
  }
})();
