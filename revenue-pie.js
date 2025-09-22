// revenue-pie.js
class RevenuePie extends HTMLElement {
  static get observedAttributes() {
    return ["data-src", "title"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = null;
    this._view = "chart"; // "chart" | "table"
  }

  attributeChangedCallback() {
    this._maybeLoadAndRender();
  }
  connectedCallback() {
    this._maybeLoadAndRender();
  }

  async _maybeLoadAndRender() {
    const src = this.getAttribute("data-src");
    if (src) {
      try {
        const res = await fetch(src, { cache: "no-store" });
        if (!res.ok) throw new Error(res.statusText);
        this._data = await res.json();
        this._render();
        return;
      } catch (e) {
        this._render(`<p class="err">Failed to load: ${e.message}</p>`);
        return;
      }
    }
    this._render(`<p class="err">No data provided.</p>`);
  }

  _roundPercents(arr, key = "value") {
    const total = arr.reduce((s, d) => s + Number(d[key] || 0), 0);
    const exact = arr.map((d) => ({
      ...d,
      exact: (Number(d[key] || 0) * 100) / (total || 1),
    }));
    const base = exact.map((d) => Math.floor(d.exact));
    let remain = 100 - base.reduce((a, b) => a + b, 0);
    const order = exact
      .map((d, i) => ({ i, rem: d.exact - base[i] }))
      .sort((a, b) => b.rem - a.rem);
    const pct = base.slice();
    for (let k = 0; k < remain; k++) pct[order[k]?.i ?? 0]++;
    return exact.map((d, i) => ({ ...d, pct: pct[i] }));
  }

  _render(fallbackHTML = "") {
    const title = this.getAttribute("title") || "Revenue breakdown";
    const raw = this._data?.data || this._data || this._data?.items || null;

    if (!raw || !Array.isArray(raw) || !raw.length) {
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        <div class="host">
          ${fallbackHTML || `<p class="err">No chart data.</p>`}
        </div>`;
      return;
    }

    const series = raw.map((d, i) => ({
      name: d.name ?? d.label ?? `Item ${i + 1}`,
      value: Number(d.value || 0),
      color: d.color || palette[i % palette.length],
    }));

    const parts = this._roundPercents(series, "value");
    const total = series.reduce((s, d) => s + d.value, 0);

    // Chart geometry
    const r = 180, rLbl = r + 36, marginX = 200, marginY = 40;
    const vbW = 2 * (rLbl + marginX);
    const vbH = 2 * (rLbl + marginY);
    const vbX = -(rLbl + marginX);
    const vbY = -(rLbl + marginY);

    this.shadowRoot.innerHTML = `
      <style>${css}</style>
     
      <div class="host">
        <div >
         
          <button class="toggle" aria-pressed="${this._view === "table"}" aria-controls="chart table" type="button">
            ${this._view === "table" ? "Show chart" : "Show table"}
          </button>
        </div>
        <div class="sr-live" aria-live="polite"></div>

        <div id="chart" class="chart" ${this._view === "table" ? 'hidden' : ''}>
          <svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" role="img" aria-labelledby="title">
            <title id="title">${title}</title>
            <g transform="translate(0,0)">
              <g class="slices"></g>
              <g class="labels"></g>
            </g>
          </svg>
        </div>

        <div id="table" class="tablewrap" ${this._view === "chart" ? 'hidden' : ''}>
          ${this._renderTableHTML(title, parts, series)}
        </div>
      </div>
    `;

    // Toggle
    const btn = this.shadowRoot.querySelector(".toggle");
    const live = this.shadowRoot.querySelector(".sr-live");
    btn.addEventListener("click", () => {
      this._view = this._view === "chart" ? "table" : "chart";
      this._render();
      live.textContent = this._view === "table" ? "Table view shown" : "Chart view shown";
    });

    // Draw chart
    if (this._view === "chart") {
      const ns = "http://www.w3.org/2000/svg";
      const svgEl = this.shadowRoot.querySelector("svg");
      const slicesEl = svgEl.querySelector(".slices");
      const labelsEl = svgEl.querySelector(".labels");

      const arcPath = (a0, a1) => {
        const large = a1 - a0 > Math.PI ? 1 : 0;
        const x0 = (r * Math.cos(a0)).toFixed(2), y0 = (r * Math.sin(a0)).toFixed(2);
        const x1 = (r * Math.cos(a1)).toFixed(2), y1 = (r * Math.sin(a1)).toFixed(2);
        return `M 0 0 L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
      };

      let a0 = -Math.PI / 2;
      parts.forEach((d) => {
        const frac = d.pct / 100;
        const a1 = a0 + frac * 2 * Math.PI;

        const path = document.createElementNS(ns, "path");
        path.setAttribute("d", arcPath(a0, a1));
        path.setAttribute("fill", d.color);
        path.setAttribute("stroke", "#fff");
        path.setAttribute("stroke-width", "2");
        path.setAttribute("vector-effect", "non-scaling-stroke");
        path.setAttribute("aria-label", `${d.name}: ${d.pct}% (${d.value})`);
        slicesEl.appendChild(path);

        const mid = (a0 + a1) / 2;
        const xEdge = r * Math.cos(mid), yEdge = r * Math.sin(mid);
        const xLbl = rLbl * Math.cos(mid), yLbl = rLbl * Math.sin(mid);

        const leader = document.createElementNS(ns, "line");
        leader.setAttribute("x1", xEdge.toFixed(1));
        leader.setAttribute("y1", yEdge.toFixed(1));
        leader.setAttribute("x2", xLbl.toFixed(1));
        leader.setAttribute("y2", yLbl.toFixed(1));
        leader.setAttribute("stroke", "#444");
        leader.setAttribute("stroke-width", "1.5");
        labelsEl.appendChild(leader);

        const onRight = Math.cos(mid) >= 0;
        const tx = xLbl + (onRight ? 8 : -8);
        const ta = onRight ? "start" : "end";

        const text = document.createElementNS(ns, "text");
        text.setAttribute("x", tx.toFixed(1));
        text.setAttribute("y", yLbl.toFixed(1));
        text.setAttribute("text-anchor", ta);
        text.setAttribute("dominant-baseline", "middle");
        text.setAttribute("class", "pie-label");
        text.textContent = `${d.name} ${d.pct}%`;
        labelsEl.appendChild(text);

        a0 = a1;
      });
    }
  }

  _renderTableHTML(title, parts, series, total) {
    const rows = parts.map((p, i) => ({
      name: series[i].name,
      value: series[i].value,
      pct: p.pct,
      color: series[i].color,
    }));
    const nf = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

    // GOV.UK-style markup
    return `
      <div class="govuk-table-container" role="region" aria-labelledby="tbl-caption" tabindex="0">
        <table class="govuk-table">
       
          <thead class="govuk-table__head">
            <tr class="govuk-table__row">
              <th scope="col" class="govuk-table__header">Category</th>
              <th scope="col" class="govuk-table__header govuk-table__header--numeric">Amount</th>
              <th scope="col" class="govuk-table__header govuk-table__header--numeric">Percent</th>
            </tr>
          </thead>
          <tbody class="govuk-table__body">
            ${rows
              .map(
                (r) => `
              <tr class="govuk-table__row">
                <th scope="row" class="govuk-table__header" style="font-weight:400;">
                  
                  ${r.name}
                </th>
                <td class="govuk-table__cell govuk-table__cell--numeric" data-title="Amount">${nf.format(r.value)}</td>
                <td class="govuk-table__cell govuk-table__cell--numeric" data-title="Percent">${r.pct}%</td>
              </tr>`
              )
              .join("")}
          </tbody>
     
        </table>
      </div>
    `;
  }
}

const palette = [
  "#9b87d3",
  "#1f77b4",
  "#d62728",
  "#ff7f0e",
  "#c7c7c7",
  "#9467bd",
  "#17becf",
  "#f0c419",
];

const css = `
:host { display:block; font-family: Arial, Helvetica, sans-serif; }
.host { width:100%; }
.bar { display:flex; align-items:center; justify-content:space-between; gap:1rem; margin-bottom:0.5rem; }
.chart-title { margin:0; font-size:1.125rem; line-height:1.3; }
.toggle {
  font: Arial, sans-serif;
  padding: .5rem .75rem;
  
  max-width:max-content;
  cursor: pointer;
}
.toggle:focus-visible { outline: 3px solid #1f77b4; outline-offset: 2px; }
svg { width:100%; height:auto; display:block; }
.pie-label { font-size:16px; line-height:1.2; font-family: Arial, Helvetica, sans-serif; fill:#1a1a1a; }
.err { color:#b00020; font: 14px/1.4 system-ui, sans-serif; }

/* --- GOV.UK-like table styling (scoped to Shadow DOM) --- */
.govuk-table-container {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

}
.govuk-table-container:focus {
  
  outline-offset: 0;
}

.govuk-table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  font-family:  Arial, Helvetica, sans-serif;
  font-size: 19px;
  line-height: 1.25;
}
.govuk-table__caption {
  text-align: left;
  padding: 10px 15px;
  
  margin: 0;
}
.govuk-table__caption--m { font-size: 19px; line-height: 1.31579; }

.govuk-table__head .govuk-table__header {

  border-bottom: 2px solid #0b0c0c;
}
.govuk-table__row > .govuk-table__header,
.govuk-table__row > .govuk-table__cell {
  padding: 10px 0px;
  vertical-align: top;
  text-align: left;
  

  border-bottom: 1px solid #b1b4b6;
}

.govuk-table__cell td{
  font-weight:400;
}
.govuk-table__header--numeric,
.govuk-table__cell--numeric {
  text-align: right;
}
.govuk-table__foot .govuk-table__header,
.govuk-table__foot .govuk-table__cell {
  border-top: 2px solid #0b0c0c;
 
}

/* Colour swatch next to row headers */
.swatch {
  display:inline-block; width: 0.9em; height: 0.9em;
  border-radius: 2px; margin-right: .5em; vertical-align: -0.1em;
}
.toggle {
  font-family: "GDS Transport", arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  font-weight: 400;
  font-size: 1rem;
  line-height: 1.1875;
  box-sizing: border-box;
  display: inline-block;
  position: relative;
  width: 100%;
  margin-top: 0;
  margin-right: 0;
  margin-left: 0;
  margin-bottom: 22px;
  padding: 8px 10px 7px;
  border: 2px solid transparent;
  border-radius: 0;
  color: #ffffff;
  background-color: #00703c;
  box-shadow: 0 2px 0 var(--button-shadow);
  text-align: center;
  vertical-align: top;
  cursor: pointer;
  -webkit-appearance: none;
}

.toggle:hover {
  background-color: #005a30;
  /* background-color: #005a30; */
}

`;

customElements.define("revenue-pie", RevenuePie);
