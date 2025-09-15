class PropertyTaxCalculator extends HTMLElement {
  static get observedAttributes() {
    return ["rates", "note", "start-value"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rates = {
      airdrie: 0.004164,
      beiseker: 0.010598,
      calgary: 0.004204,
      chestermere: 0.003248,
      cochrane: 0.006498,
      crossfield: 0.005217,
      irricana: 0.010006,
      kneehill: 0.002985,
      bighorn: 0.001863,
      foothills: 0.003638,
      mvc: 0.002593,
      rvc: 0.002177,
      wheatland: 0.002918,
    };
    this._formatCAD = new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
      minimumFractionDigits: 2,
    });
  }

  attributeChangedCallback() {
    this.render();
  }
  connectedCallback() {
    this.render();
  }

  get rates() {
    const attr = this.getAttribute("rates");
    if (!attr) return this._rates;
    try {
      const obj = JSON.parse(attr);
      return { ...this._rates, ...obj };
    } catch {
      return this._rates;
    }
  }

  render() {
    const note =
      this.getAttribute("note") ||
      "Based on 2023 tax rates provided by Alberta Municipal Affairs.";
    const startValue = this.getAttribute("start-value") || "";

    const rows = [
      ["beiseker", "Beiseker"],
      ["irricana", "Irricana"],
      ["crossfield", "Crossfield"],
      ["chestermere", "Chestermere"],
      ["cochrane", "Cochrane"],
      ["airdrie", "Airdrie"],
      ["calgary", "Calgary"],
      ["foothills", "Foothills County"],
      ["wheatland", "Wheatland County"],
      ["kneehill", "Kneehill County"],
      ["mvc", "Mountain View County"],
      ["rvc", "Rocky View County"],
      ["bighorn", "M.D. of Bighorn"],
    ];

    this.shadowRoot.innerHTML = `
     <link rel="stylesheet" href="/main.css" />

      <div class="wrap">
        <p class="body">If your home (residential property) is assessed at:</p>

        <div class="controls">
         
          <input class="input" id="assessment" type="text" value="${startValue}"/>
          <button id="calc" class="btn" style="max-width:100px;">Calculate</button>
        </div>

        <p class="body">Your municipal taxes would be approximately:</p>

        <div class="table">
          <table>
            <thead>
              <tr>
                <td style="width:50%">Community</td>
                <td style="width:50%">Property Tax</td>
              </tr>
            </thead>
            <tbody>
              ${rows
                .map(
                  ([key, label]) => `
                <tr class="${key === "rvc" ? "highlight" : ""}">
                  <td class="label">${label}</td>
                  <td class="val" data-out="${key}">&nbsp;</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <p class="note">${note}</p>
      </div>
    `;

    const input = this.shadowRoot.getElementById("assessment");
    const btn = this.shadowRoot.getElementById("calc");

    const calcAndRender = () => {
      const raw = (input?.value || "").trim();
      const amount = parseFloat(raw.replace(/[^0-9.]/g, ""));
      if (!isFinite(amount)) return;

      for (const [key, rate] of Object.entries(this.rates)) {
        const el = this.shadowRoot.querySelector(`[data-out="${key}"]`);
        if (el) el.textContent = this._formatCAD.format(amount * rate);
      }
    };

    btn?.addEventListener("click", calcAndRender);
    input?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        calcAndRender();
      }
    });
  }
}
const css = `
  :host { display:block; font-family: system-ui, -apple-system, Segoe UI, Roboto, Inter, sans-serif; }
  .wrap { max-width: 760px; }
  
  .controls label { font-size: 1.1875rem; margin-right: .5rem; }
  .input { padding: .4rem .6rem; font-size: 1.1875rem; min-width: 220px; }
  .btn { padding: .45rem .8rem; margin-left: .4rem; font-size: 1.1875rem; cursor:pointer; }
  table { width: 100%; border-collapse: collapse; }
  thead td { font-weight: 700;  border-bottom: 1px solid #dfdcd9; padding: .5rem;padding-left:0;text-align: left; font-size:1.1875rem; }
  tbody td { padding: .5rem; border-bottom: 1px solid #eee;text-align:0;padding-left:0;font-size:1.1875rem;}
  tbody tr:nth-child(odd) { background: #fff; }
  .val { text-align: left; font-size: 1.1875rem; padding-left:0;}
  .highlight { background-color: #f8f6f4; border-bottom: 1px solid #dfdcd9; }
  .note {  font-size: .9em; font-style: italic;  }
`;
customElements.define("property-tax-calculator", PropertyTaxCalculator);
