// graph.js
import { select, scaleLinear, scaleTime, line, area } from 'd3';

const container = document.getElementById('chart-container');

async function drawChart() {
  const resp = await fetch('https://v.zzazz.com/ohlc', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      currency: 'inr',
      url: 'https://jantaserishta.com/local/chhattisgarh/police-personnel-performed-the-last-rites-of-an-unclaimed-body-4292088',
      duration: '6h'
    })
  });

  const data = await resp.json();

  // Parse OHLC
  const points = data.data.map(d => ({
    time: new Date(d.time),
    value: d.open
  }));

  const width = 280;
  const height = 100;

  const x = scaleTime()
    .domain([points[0].time, points[points.length - 1].time])
    .range([0, width]);

  const y = scaleLinear()
    .domain([Math.min(...points.map(d => d.value)), Math.max(...points.map(d => d.value))])
    .range([height, 0]);

  const svg = select(container)
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const areaGen = area()
    .x(d => x(d.time))
    .y0(height)
    .y1(d => y(d.value));

  const lineGen = line()
    .x(d => x(d.time))
    .y(d => y(d.value));

  svg.append('path')
    .datum(points)
    .attr('fill', '#34B1814A')
    .attr('d', areaGen);

  svg.append('path')
    .datum(points)
    .attr('stroke', '#34B181')
    .attr('stroke-width', 2)
    .attr('fill', 'none')
    .attr('d', lineGen);
}

drawChart();
