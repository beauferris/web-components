// hello-card.js (ES module)

class MunicipalBudget extends HTMLElement {
  static get observedAttributes() {
    return ["year", "max", "data-json", "data-src"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = null;
  }

  get year() {
    return this.getAttribute("year") || "2025";
  }
  get max() {
    return Number(this.getAttribute("max") || 35);
  }

  attributeChangedCallback(name) {
    if (name === "data-json" || name === "data-src") {
      this._loadData();
    } else {
      this.render();
    }
  }

  connectedCallback() {
    this._loadData();
  }

  // Decode CKEditor-escaped entities (&quot;, &#13;, etc.). Run twice to handle double-encoding.
  _decodeEntities(str) {
    if (!str || typeof str !== "string") return str;
    const decodeOnce = (s) =>
      s
        .replace(/&#13;|&#10;/g, "\n")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
    let out = decodeOnce(str);
    // second pass in case of &amp;quot; -> &quot; -> "
    out = decodeOnce(out);
    return out;
  }

  async _loadData() {
    const src = this.getAttribute("data-src");
    if (src) {
      try {
        const res = await fetch(src, { credentials: "omit" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this._data = await res.json();
      } catch (e) {
        console.warn("municipal-budget: failed to fetch data-src:", e);
        this._data = { kpis: [], items: [] };
      }
      this.render();
      return;
    }

    // Prefer data-json (CKEditor-friendly). Decode entities before parsing.
    const raw = this.getAttribute("data-json");
    if (raw) {
      try {
        const decoded = this._decodeEntities(raw);
        this._data = JSON.parse(decoded);
      } catch (e) {
        console.warn("municipal-budget: invalid data-json:", e);
        this._data = { kpis: [], items: [] };
      }
      this.render();
      return;
    }

    // Fallback: inline <script type="application/json"> inside the element
    const script = this.querySelector('script[type="application/json"]');
    if (script) {
      try {
        this._data = JSON.parse(script.textContent);
      } catch (e) {
        console.warn("municipal-budget: invalid inline JSON:", e);
        this._data = { kpis: [], items: [] };
      }
    } else {
      this._data = { kpis: [], items: [] };
    }
    this.render();
  }

  formatMoney(n) {
    if (n == null || n === "") return "";
    const num =
      typeof n === "number" ? n : Number(String(n).replace(/[^0-9.-]/g, ""));
    if (!isFinite(num)) return String(n);
    return num.toLocaleString("en-CA", {
      style: "currency",
      currency: "CAD",
      maximumFractionDigits: 0,
    });
  }

  render() {
    const data = this._data || { kpis: [], items: [] };
    const { kpis = [], items = [] } = data;
    const max = this.max;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        .tax-chart {
          --header:#1f2f43; --field:#5c874c; --bar:#0095cc; --text:black;
          --radius:0; --row-h:38px; --grid-lines:rgba(255,255,255,.2); --border:#dbdcdd;
          font-family: Inter, system-ui, sans-serif;
           margin: 8px 0 16px; color: var(--text);
          overflow: hidden; padding: 20px; border: 1px solid #dbdcdd;
          padding-top: 0; margin-top: 0; background: #fff;
        }
        h2 { font-size: 35px; margin:16px 0; font-weight:700; }
        .kpi-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin:12px 0 24px; padding:0; list-style:none; }
        .kpi-grid > li { background:#f5f5f6; padding:2rem; border:1px solid var(--border); }
        .kpi-grid span { display:block; } .kpi-grid strong { display:block; font-size:2.5rem; font-weight:800; }
        .bar-text { line-height:1.25; margin:0 0 8px 0; }
        .tax-chart__plot {
          position:relative;
          background-image: repeating-linear-gradient(to right, var(--grid-lines) 0 2px, transparent 1px calc(100% / 7));
          padding-block:6px; background-color: transparent;
        }
        .bar-container { padding:12px 0; border-bottom:1px solid var(--border); }
        .bar-container:last-of-type { border-bottom:0; }
        .bar { height:var(--row-h); display:flex; align-items:center; gap:10px; }
        .bar .fill { width:var(--w); height:80%; background:var(--bar); display:flex; align-items:center; padding-inline:6px; box-sizing:border-box; }
        .percent-text { margin-left:10px; white-space:nowrap; }
        .breakdown { margin-top:8px; }
        .breakdown summary { cursor:pointer; gap:10px; padding:10px 0;  }
        .breakdown__list { list-style:none; margin:15px 0 0; padding:0; display:grid; gap:6px; }
        .breakdown__list li { display:flex; justify-content:space-between; border-bottom:1px dashed var(--border); padding:4px 0; }
        .breakdown__list li:last-child { border-bottom:0; }
        @media (max-width:520px){ .kpi-grid strong{ font-size:2rem; } }
      </style>

      <section class="tax-chart" aria-labelledby="tax-chart-title">
        <h2 id="tax-chart-title">${this.year} Budget</h2>

        ${
          kpis.length
            ? `
          <section class="kpis" aria-labelledby="kpi-title" style="max-width:900px;">
            <ul class="kpi-grid" role="list">
              ${kpis
                .map(
                  (k) =>
                    `<li><span>${k.label}</span><strong>${k.value}</strong></li>`
                )
                .join("")}
            </ul>
          </section>`
            : ""
        }

        <div class="tax-chart__plot" role="img" aria-label="Horizontal bar chart showing municipal tax allocation by category.">
          ${items
            .map(
              (it) => `
            <div class="bar-container">
              <p class="bar-text">${it.label}</p>
              <div class="bar">
                <div class="fill" style="--w:${
                  (Number(it.value) / max) * 100
                }%"></div>
                <span class="percent-text">${it.value}%</span>
              </div>
              ${
                Array.isArray(it.breakdown) && it.breakdown.length
                  ? `
                <details class="breakdown">
                  <summary>Breakdown</summary>
                  <ul class="breakdown__list">
                    ${it.breakdown
                      .map(
                        (b) =>
                          `<li><span>${b.label}</span><span>${this.formatMoney(
                            b.amount
                          )}</span></li>`
                      )
                      .join("")}
                  </ul>
                </details>`
                  : ""
              }
            </div>`
            )
            .join("")}
        </div>
      </section>
    `;
  }
}

if (!customElements.get("municipal-budget")) {
  customElements.define("municipal-budget", MunicipalBudget);
}
