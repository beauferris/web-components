class MunicipalTaxChart extends HTMLElement {
  static get observedAttributes() {
    return ["max", "values"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
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
    try {
      return JSON.parse(this.getAttribute("values") || "[]");
    } catch {
      return [];
    }
  }

  attributeChangedCallback() {
    this.render();
  }
  connectedCallback() {
    this.render();
  }

  render() {
    const max = this.max;
    const items = this.data;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          --bar: #0095cc; --text:#000; --border:#dbdcdd; --grid-lines: rgba(0,0,0,.12);
          --row-h: 38px;
          display:block; color:var(--text);
          font: 500 16px/1.25 Inter, system-ui, sans-serif;
        }
        .chart-wrapper { border:1px solid var(--border); padding:20px; padding-top:0; background:#fff; }
        .bar-container { padding:12px 0; border-bottom:1px solid var(--border); }
        .bar-container:last-of-type { border-bottom: none; }
        .bar-text { line-height:1.25; margin:0 0 8px 0; }
        .plot {
          position:relative; padding-block:6px;
          background-image:repeating-linear-gradient(to right, var(--grid-lines) 0 2px, transparent 1px calc(100%/7));
        }
        .bar { height:var(--row-h); display:flex; align-items:center; }
        .fill { width:var(--w); height:80%; background:var(--bar); box-sizing:border-box; padding-inline:6px; position:relative; display:flex; align-items:center; }
        .pct { position:absolute; right:6px; top:50%; transform:translateY(-50%); color:#fff; font-weight:700; }
        .ticks { position:relative; height:22px; margin-top:6px; list-style:none; padding-left:0; color:var(--text); font-size:15px; }
        .ticks li { position:absolute; bottom:0; transform:translateX(-50%); }
        .ticks li:nth-child(1){left:0%; transform:none; text-align:left;}
        .ticks li:nth-child(2){left:calc(1/7*100%);}
        .ticks li:nth-child(3){left:calc(2/7*100%);}
        .ticks li:nth-child(4){left:calc(3/7*100%);}
        .ticks li:nth-child(5){left:calc(4/7*100%);}
        .ticks li:nth-child(6){left:calc(5/7*100%);}
        .ticks li:nth-child(7){left:calc(6/7*100%);}
        .ticks li:nth-child(8){left:100%; transform:translateX(-100%); text-align:right;}
      </style>

      <div class="chart-wrapper" role="img" aria-label="Municipal tax allocation chart, 0–${max} range with 5% ticks.">
        <div class="plot">
          ${items
            .map(
              (it) => `
            <div class="bar-container">
              <p class="bar-text">${it.label}</p>
              <div class="bar">
                <div class="fill" style="--w:${(it.value / max) * 100}%">
                  <span class="pct">${it.value}%</span>
                </div>
              </div>
            </div>
          `
            )
            .join("")}
        </div>
        <ol class="ticks" aria-hidden="true">
          ${Array.from({ length: 8 }, (_, i) => `<li>${i * 5}</li>`).join("")}
        </ol>
      </div>
    `;
  }
}
customElements.define("municipal-tax-chart", MunicipalTaxChart);
