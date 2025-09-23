// amptest.js
// Fetches data from a dummy API and renders a list of divs in the DOM

async function fetchDataAndRender() {
  try {
    // Fetch data from a dummy API
    const response = await fetch('https://jsonplaceholder.typicode.com/users');
    const data = await response.json();

    // Get the container element or create one
    let container = document.getElementById('data-list');
    if (!container) {
      container = document.createElement('div');
      container.id = 'data-list';
      document.body.appendChild(container);
    }
    container.innerHTML = '';

    // Render a list of divs for each user
    data.forEach(user => {
      const userDiv = document.createElement('div');
      userDiv.textContent = `${user.name} (${user.email})`;
      userDiv.style.margin = '8px 0';
      userDiv.style.padding = '8px';
      userDiv.style.border = '1px solid #ccc';
      container.appendChild(userDiv);
    });
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

// Run on page load
window.onload = fetchDataAndRender;
