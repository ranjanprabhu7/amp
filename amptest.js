import { select } from "https://cdn.jsdelivr.net/npm/d3-selection@3/+esm";
import { scaleTime, scaleLinear } from "https://cdn.jsdelivr.net/npm/d3-scale@4/+esm";
import { line, area } from "https://cdn.jsdelivr.net/npm/d3-shape@3/+esm";

async function fetchData(articleUrl) {
  const resp = await fetch("https://v.zzazz.com/ohlc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      currency: "inr",
      url: articleUrl,
      duration: "6h",
    }),
  });

  const json = await resp.json();
  return json.data.map((d) => ({
    time: new Date(d.time),
    value: d.open,
  }));
}

function drawChart(container, points) {
  // clear old
  select(container).selectAll("svg").remove();

  const width = 280;
  const height = 100;

  const x = scaleTime()
    .domain([points[0].time, points[points.length - 1].time])
    .range([0, width]);

  const y = scaleLinear()
    .domain([Math.min(...points.map((d) => d.value)), Math.max(...points.map((d) => d.value))])
    .range([height, 0]);

  const svg = select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // area
  const areaGen = area()
    .x((d) => x(d.time))
    .y0(height)
    .y1((d) => y(d.value));

  svg.append("path")
    .datum(points)
    .attr("fill", "#34B18144")
    .attr("d", areaGen);

  // line
  const lineGen = line()
    .x((d) => x(d.time))
    .y((d) => y(d.value));

  svg.append("path")
    .datum(points)
    .attr("stroke", "#34B181")
    .attr("stroke-width", 2)
    .attr("fill", "none")
    .attr("d", lineGen);
}

function setupHover() {
  document.querySelectorAll(".price").forEach((div) => {
    const url = div.getAttribute("data-url");
    if (!url) return;

    div.addEventListener("mouseenter", async () => {
      const data = await fetchData(url);
      drawChart(div, data);
    });

    div.addEventListener("mouseleave", () => {
      select(div).selectAll("svg").remove();
    });
  });
}

setupHover();
