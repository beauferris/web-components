// revenue-pie.js
class RevenuePie extends HTMLElement {
  static get observedAttributes() {
    return ["data-src", "title"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = null;
  }

  attributeChangedCallback() {
    this._maybeLoadAndRender();
  }
  connectedCallback() {
    this._maybeLoadAndRender();
  }

  // ---- Data loading (prefer <script type="application/json"> child for Drupal) ----
  async _maybeLoadAndRender() {
    // 3) data-src URL
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
    // No data given yet
    this._render(`<p class="err">No data provided.</p>`);
  }

  // Largest-remainder rounding so integers sum to 100
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
    const data = this._data?.data || this._data || this._data?.items || null;

    if (!data || !Array.isArray(data) || !data.length) {
      this.shadowRoot.innerHTML = `
        <style>${css}</style>
        <div class="host">
          ${fallbackHTML || `<p class="err">No chart data.</p>`}
        </div>`;
      return;
    }

    // Support either [{name,value,color}] or [{label,value,color}]
    const series = data.map((d, i) => ({
      name: d.name ?? d.label ?? `Item ${i + 1}`,
      value: Number(d.value || 0),
      color: d.color || palette[i % palette.length],
    }));

    const parts = this._roundPercents(series, "value");

    // Geometry
    const r = 180;
    const rLbl = r + 36;
    const marginX = 200,
      marginY = 40;
    const vbW = 2 * (rLbl + marginX);
    const vbH = 2 * (rLbl + marginY);
    const vbX = -(rLbl + marginX);
    const vbY = -(rLbl + marginY);

    const svg = `
      <svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" role="img" aria-labelledby="title">
        <title id="title">${title}</title>
        <g transform="translate(0,0)">
          <g class="slices"></g>
          <g class="labels"></g>
        </g>
      </svg>
    `;

    this.shadowRoot.innerHTML = `<style>${css}</style><link rel="stylesheet" href="/main.css" /><div class="host">${svg}</div>`;

    const ns = "http://www.w3.org/2000/svg";
    const svgEl = this.shadowRoot.querySelector("svg");
    const slicesEl = svgEl.querySelector(".slices");
    const labelsEl = svgEl.querySelector(".labels");

    const arcPath = (a0, a1) => {
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const x0 = (r * Math.cos(a0)).toFixed(2),
        y0 = (r * Math.sin(a0)).toFixed(2);
      const x1 = (r * Math.cos(a1)).toFixed(2),
        y1 = (r * Math.sin(a1)).toFixed(2);
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
      slicesEl.appendChild(path);

      const mid = (a0 + a1) / 2;
      const xEdge = r * Math.cos(mid),
        yEdge = r * Math.sin(mid);
      const xLbl = rLbl * Math.cos(mid),
        yLbl = rLbl * Math.sin(mid);

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
:host { display:block; }
.host { width:100%;}
svg { width:100%; height:auto; display:block; }
.pie-label { font: 16px/1.2 system-ui, -apple-system, "Segoe UI", Roboto, Inter, sans-serif; fill:#1a1a1a; }
.err { color:#b00020; font: 14px/1.4 system-ui, sans-serif; }
`;

customElements.define("revenue-pie", RevenuePie);
