class MunicipalBudget extends HTMLElement {
  static get observedAttributes() {
    return ["year", "max"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  get year() {
    return this.getAttribute("year") || "2025";
  }
  get max() {
    return Number(this.getAttribute("max") || 35);
  }

  get data() {
    const script = this.querySelector('script[type="application/json"]');
    if (script) {
      try {
        return JSON.parse(script.textContent);
      } catch {}
    }
    return { kpis: [], items: [] };
  }

  attributeChangedCallback() {
    this.render();
  }
  connectedCallback() {
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
    const { kpis = [], items = [] } = this.data;
    const max = this.max;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }

        /* Tabs (if you wrap this inside tabs externally, these won’t conflict) */
        .tabs__panel[hidden] { display:none; }

        /* --- Tax Chart (scoped) --- */
        .tax-chart {
          --header: #1f2f43;
          --field: #5c874c;
          --bar: #0095cc;
          --text: black;
          --radius: 0;
          --row-h: 38px;
          --grid-lines: rgba(255, 255, 255, 0.2);
          --border: #dbdcdd;

          font-family: Inter, system-ui, sans-serif;
          max-width: 920px;
          margin: 8px 0 16px;
          color: var(--text);
          overflow: hidden;
          padding: 20px;
          border: 1px solid #dbdcdd;
          padding-top: 0;
          margin-top: 0;
          background: #fff;
        }

        h2 { font-size: 35px; margin: 16px 0; font-weight: 700; }

        /* KPIs */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          margin: 12px 0 24px;
          padding: 0;
          list-style: none;
        }
        .kpi-grid > li {
          list-style: none;
          background: #f5f5f6;
          padding: 2rem;
          border: 1px solid var(--border);
        }
        .kpi-grid span { display:block; }
        .kpi-grid strong { display:block; font-size: 2.5rem; font-weight: 800; }

        .bar-text {
          line-height: 1.25;
          margin-top: 0;
          margin-bottom: 8px;
        }

        .tax-chart__plot {
          position: relative;
          background-image: repeating-linear-gradient(
            to right,
            var(--grid-lines) 0 2px,
            transparent 1px calc(100% / 7)
          );
          padding-block: 6px;
          background-color: transparent;
        }

        .bar-container { padding: 12px 0; border-bottom: 1px solid var(--border); }
        .bar-container:last-of-type { border-bottom: 0; }

        .bar {
          height: var(--row-h);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .bar .fill {
          width: var(--w);
          height: 80%;
          background: var(--bar);
          display: flex;
          align-items: center;
          padding-inline: 6px;
          box-sizing: border-box;
        }
        .percent-text { margin-left: 10px; white-space: nowrap; }

        /* Breakdown (details) */
        .breakdown { margin-top: 8px; }
        .breakdown summary {
          cursor: pointer;
          gap: 10px;
          padding: 10px 0;
          list-style: none;
        }
        .breakdown__list {
          list-style: none;
          margin: 6px 0 0;
          padding: 0;
          display: grid;
          gap: 6px;
        }
        .breakdown__list li {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px dashed var(--border, #dbdcdd);
          padding: 4px 0;
        }
        .breakdown__list li:last-child { border-bottom: 0; }

        /* Responsive polish */
        @media (max-width: 520px) {
          .kpi-grid strong { font-size: 2rem; }
        }
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
                  (k) => `
                <li><span>${k.label}</span><strong>${k.value}</strong></li>
              `
                )
                .join("")}
            </ul>
          </section>
        `
            : ""
        }

        <div class="tax-chart__plot" role="img" aria-label="Horizontal bar chart showing municipal tax allocation by category.">
          ${items
            .map(
              (it) => `
            <div class="bar-container">
              <p class="bar-text">${it.label}</p>
              <div class="bar">
                <div class="fill" style="--w:${(it.value / max) * 100}%"></div>
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
                        (b) => `
                      <li><span>${b.label}</span><span>${this.formatMoney(
                          b.amount
                        )}</span></li>
                    `
                      )
                      .join("")}
                  </ul>
                </details>
              `
                  : ""
              }
            </div>
          `
            )
            .join("")}
        </div>
      </section>
    `;
  }
}
customElements.define("municipal-budget", MunicipalBudget);
