/* ---------- Shared: fetch JSON ---------- */
async function fetchJson(url) {
  const res = await fetch(url); // same-origin OK; for cross-origin ensure CORS
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
const moneyCA = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

/* ---------- <municipal-kpis> ---------- */
class MunicipalKpis extends HTMLElement {
  static get observedAttributes() {
    return ["data-src", "heading"];
  }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._kpis = [];
  }
  attributeChangedCallback(name) {
    if (name === "data-src") this._load();
    else this._render();
  }
  connectedCallback() {
    this._load();
  }

  async _load() {
    const src = this.getAttribute("data-src");
    if (!src) {
      this._kpis = [];
      return this._render();
    }
    try {
      const data = await fetchJson(src);
      this._kpis = Array.isArray(data?.kpis) ? data.kpis : [];
    } catch (e) {
      console.warn("<municipal-kpis> load failed:", e);
      this._kpis = [];
    }
    this._render();
  }

  _render() {
    const heading = this.getAttribute("heading") || "";
    const kpis = this._kpis;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; font-family: Inter, system-ui, sans-serif; }
        h2 { font-size: 35px; margin: 16px 0; font-weight: 700; }
        .kpi-grid {
          display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap:12px; margin: 12px 0 24px; padding:0; list-style:none;
        }
        .kpi-grid > li { background:#f5f5f6; padding:2rem; border:1px solid #dbdcdd; }
        .kpi-grid span { display:block; }
        .kpi-grid strong { display:block; font-size: 2.5rem; font-weight: 800; }
        @media (max-width:520px){ .kpi-grid strong { font-size: 2rem; } }
      </style>
   
      <ul class="kpi-grid" role="list">
        ${kpis
          .map(
            (k) =>
              `<li><span>${k.label ?? ""}</span><strong>${
                k.value ?? ""
              }</strong></li>`
          )
          .join("")}
      </ul>
    `;
  }
}
customElements.define("municipal-kpis", MunicipalKpis);
