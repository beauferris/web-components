class MunicipalBudget extends HTMLElement {
  static get observedAttributes() {
    return ["year", "max", "data-json", "data-src"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._data = null;
    this._view = "chart"; // "chart" | "table"

    // Event delegation for breakdown toggles
    this.shadowRoot.addEventListener("click", (e) => {
      const btn = e.target.closest("button.toggle-details");
      if (!btn) return;
      const panel = this.shadowRoot.getElementById(btn.getAttribute("aria-controls"));
      if (!panel) return;

      const isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isOpen));
      btn.classList.toggle("open", !isOpen);
      panel.hidden = isOpen;
    });
  }

  get year() { return this.getAttribute("year") || "2025"; }
  get max() { return Number(this.getAttribute("max") || 35); }

  attributeChangedCallback(name) {
    if (name === "data-json" || name === "data-src") this._loadData();
    else this.render();
  }

  connectedCallback() { this._loadData(); }

  async _loadData() {
    const src = this.getAttribute("data-src");
    if (src) {
      try {
        const res = await fetch(src, { credentials: "omit" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this._data = await res.json();
      } catch (e) {
        console.warn("municipal-budget: failed to fetch data-src:", e);
        this._data = { items: [] };
      }
      this.render();
      return;
    }

    const script = this.querySelector('script[type="application/json"]');
    if (script) {
      try { this._data = JSON.parse(script.textContent); }
      catch (e) {
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
    const num = typeof n === "number" ? n : Number(String(n).replace(/[^0-9.-]/g, ""));
    if (!isFinite(num)) return String(n);
    return num.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
  }

  render() {
    const data = this._data || { items: [] };
    const { items = [] } = data;
    const max = this.max;

    const chartHTML = `
      <section class="tax-chart" aria-labelledby="tax-chart-title">
        <div class="tax-chart__plot" role="img" aria-label="Horizontal bar chart showing municipal tax allocation by category.">
          ${items.map((it, i) => {
            const w = (Number(it.value) / max) * 100;
            const panelId = `mb-breakdown-${i}`;
            return `
              <div class="bar-container">
                <p class="bar-text">${it.label}</p>
                <div class="bar">
                  <div class="fill" style="--w:${w}%"></div>
                  <span class="percent-text">${it.value}%</span>
                  ${
                    Array.isArray(it.breakdown) && it.breakdown.length
                      ? `
                        <button class="toggle-details" type="button" aria-expanded="false" aria-controls="${panelId}">
                          <svg class="chev" aria-hidden="true" viewBox="0 0 24 24" width="12" height="14" focusable="false">
                            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </button>` : ""
                  }
                </div>
                ${
                  Array.isArray(it.breakdown) && it.breakdown.length
                    ? `<div id="${panelId}" class="breakdown-panel" hidden>
                        <ul class="breakdown__list">
                          ${it.breakdown.map(b =>
                            `<li><span>${b.label}</span><span>${this.formatMoney(b.amount)}</span></li>`
                          ).join("")}
                        </ul>
                      </div>` : ""
                }
              </div>`;
          }).join("")}
        </div>
      </section>
    `;

    const tableHTML = this._renderTable(items);

    this.shadowRoot.innerHTML = `
      ${STYLES}
      <div class="host">
        <div>
          <button class="toggle" type="button"
                  aria-pressed="${this._view === "table"}"
                  aria-controls="mb-chart mb-table">
            ${this._view === "table" ? "Show chart" : "Show table"}
          </button>
        </div>
        <div class="sr-live" aria-live="polite"></div>

        <div id="mb-chart" ${this._view === "table" ? "hidden" : ""}>
          ${chartHTML}
        </div>

        <div id="mb-table" ${this._view === "chart" ? "hidden" : ""}>
          ${tableHTML}
        </div>
      </div>
    `;

    const btn = this.shadowRoot.querySelector(".toggle");
    const live = this.shadowRoot.querySelector(".sr-live");
    btn.addEventListener("click", () => {
      this._view = this._view === "chart" ? "table" : "chart";
      this.render();
      live.textContent = this._view === "table" ? "Table view shown" : "Chart view shown";
    });
  }

  _renderTable(items) {
    return `
      <div class="govuk-table-container" role="region" aria-label="Municipal budget table with drill-down categories" tabindex="0">
        <table class="govuk-table">
          <thead class="govuk-table__head">
            <tr class="govuk-table__row">
              <th scope="col" class="govuk-table__header">Category</th>
             
              <th scope="col" class="govuk-table__header govuk-table__header--numeric">Amount</th>
            </tr>
          </thead>
          <tbody class="govuk-table__body">
            ${items.map(it => {
             const hasBreakdown = Array.isArray(it.breakdown) && it.breakdown.length;
              const totalAmt = hasBreakdown
                ? it.breakdown.reduce((s, b) => s + (Number(b.amount) || 0), 0)
                : null;

              const parentRow = `
                <tr class="govuk-table__row" style="font-weight:bold;background-color:#f5f5f6">
                  <th scope="row" class="govuk-table__header" style="font-weight:bold;background-color:#f5f5f6">${it.label}</th>
              
                  <td class="govuk-table__cell govuk-table__cell--numeric" data-title="Amount">
                    ${totalAmt != null ? this.formatMoney(totalAmt) : ""}
                  </td>
                </tr>
              `;

              const breakdownRows = Array.isArray(it.breakdown) && it.breakdown.length
                ? it.breakdown.map(b => `
                    <tr class="govuk-table__row">
                      <th scope="row" class="govuk-table__header" style="font-weight:400;">
                        <span aria-hidden="true"></span><span class="visually-hidden"> </span>${b.label}
                      </th>
                      
                      <td class="govuk-table__cell govuk-table__cell--numeric" data-title="Amount">${this.formatMoney(b.amount)}</td>
                    </tr>
                  `).join("")
                : "";

              return parentRow + breakdownRows;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

}

if (!customElements.get("municipal-budget")) {
  customElements.define("municipal-budget", MunicipalBudget);
}

const STYLES = `
  <style>
    :host { display:block;  font-family: Arial, Helvetica, sans-serif; }
    p,span{font-family: Arial, Helvetica, sans-serif;}
    .tax-chart {
      --header:#1f2f43; --field:#5c874c; --bar:#12436d; --text:black;
      --radius:0; --row-h:27px; --grid-lines:rgba(255,255,255,.2); --border:#dbdcdd;
      font-family: Inter, system-ui, sans-serif;
      margin: 8px 0 16px; color: var(--text);
      overflow: hidden; padding: 20px; border: 1px solid #dbdcdd;
      padding-top: 0; margin-top: 0; background: #fff;
    }
    h2 { font-size: 35px; margin:16px 0; font-weight:700; }
    .kpi-grid { display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:12px; margin:12px 0 24px; padding:0; list-style:none; }
    .kpi-grid > li { background:#f5f5f6; padding:2rem; border:1px solid var(--border); }
    .kpi-grid span { display:block; } .kpi-grid strong { display:block; font-size:2.5rem; font-weight:800; }
    .bar-text { line-height:1.25; margin:0 0 8px 0;font-size:19px; }

    .tax-chart__plot {
      position:relative;
      background-image: repeating-linear-gradient(to right, var(--grid-lines) 0 2px, transparent 1px calc(100% / 7));
      padding-block:6px; background-color: transparent;
    }
    .bar-container { padding:12px 0; border-bottom:1px solid var(--border); }
    .bar-container:last-of-type { border-bottom:0; }

    .bar { height:var(--row-h); display:flex; align-items:center; gap:10px; }
    .bar .fill {
      width:var(--w); height:100%; background:var(--bar);
      display:flex; align-items:center; padding-inline:4px; box-sizing:border-box;
      
    }
    .percent-text { margin-left:10px; white-space:nowrap; }

    /* Inline Details Button */
    .toggle-details {
      margin-left:auto;
      display:inline-flex; align-items:center; gap:.5rem;
      border:none;
      padding:.5rem .75rem; border-radius:6px; cursor:pointer;
      font: 500 0.9rem/1.2 Inter, system-ui, sans-serif;
    }
    .toggle-details:hover { background:#f0f0f2; }
    .toggle-details:focus { outline: 2px solid #005fcc; outline-offset: 2px; }

    /* Chevron: down by default, up when open */
    .toggle-details .chev {
      position:relative; width:10px; height:10px; display:inline-block;
    }
    .toggle-details .chev::before {
      content:""; position:absolute; inset:0;
      border-right:2px solid currentColor; border-bottom:2px solid currentColor;
      transform: rotate(45deg); /* ▼ down */
      transform-origin: 50% 50%;
    }
    .toggle-details.open .chev::before {
      transform: rotate(-135deg); /* ▲ up */
    }

    /* Breakdown panel opens below the bar */
    .breakdown-panel { margin-top:8px; }
    .breakdown__list { list-style:none; margin:15px 0 0; padding:0; display:grid; gap:6px; }
    .breakdown__list li { display:flex; justify-content:space-between; border-bottom:1px solid var(--border); padding:10px 0;font-size: 19px; }
    .breakdown__list li:last-child { border-bottom:0; }

    @media (max-width:520px){
      .kpi-grid strong{ font-size:2rem; }
      .toggle-details { padding:.35rem .6rem; }
    }
      
      /* Chevron: down by default; rotates up when open, stays centered */
    .toggle-details .chev {
      width:15px; height:15px;
      display:inline-block;
      transition: transform .2s ease;
      vertical-align: middle;
    }
    .toggle-details.open .chev {
      transform: rotate(180deg);
    }

    /* (optional) motion preferences */
    @media (prefers-reduced-motion: reduce) {
      .toggle-details .chev { transition: none; }
    }
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
 
}.toggle {
  font: Arial, sans-serif;
  padding: .5rem .75rem;
  
  max-width:max-content;
  cursor: pointer;
}
.toggle:focus-visible { outline: 3px solid #1f77b4; outline-offset: 2px; }
.toggle {
  font-family:  arial, sans-serif;
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
    </style>
`;
if (!customElements.get("municipal-budget")) {
  customElements.define("municipal-budget", MunicipalBudget);
}
