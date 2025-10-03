  class CountyConnectionSignup extends HTMLElement {
    static get observedAttributes() {
      return [
        "action",
        "icon-src",
        "icon-alt",
        "heading",
        "description",
        "placeholder",
        "button-text",
        "button-color",
        "text-color",
        "bg-color",
        "honeypot-name",
        "target"
      ];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });

      // Defaults (can be overridden by attributes)
      this.state = {
        action:
          "https://rockyview.us19.list-manage.com/subscribe/post?u=a0ed60aaeefc5a483e08b2ca7&id=4c8fc1eefa&f_id=008237e7f0",
        iconSrc: "http://127.0.0.1:3000/index.html?serverWindowId=225d7e02-df7e-443f-a7c1-c94ed88c1605",
        iconAlt: "",
        heading: "County Connection",
        description: "Sign-up to receive newsfeed posts direct to your inbox.",
        placeholder: "Enter your email address",
        buttonText: "Subscribe",
        // style tokens (can be themed via attributes or CSS vars)
        buttonColor: "var(--secondary-color, #417930)",
        textColor: "var(--cc-text, #ffffff)",
        bgColor: "var(--cc-bg, transparent)",
        honeypotName: "b_a0ed60aaeefc5a483e08b2ca7_4c8fc1eefa",
        target: "_self",
      };
    }

    attributeChangedCallback(name, oldV, newV) {
      if (oldV === newV) return;
      switch (name) {
        case "action": this.state.action = newV || this.state.action; break;
        case "icon-src": this.state.iconSrc = newV || this.state.iconSrc; break;
        case "icon-alt": this.state.iconAlt = newV ?? this.state.iconAlt; break;
        case "heading": this.state.heading = newV || this.state.heading; break;
        case "description": this.state.description = newV || this.state.description; break;
        case "placeholder": this.state.placeholder = newV || this.state.placeholder; break;
        case "button-text": this.state.buttonText = newV || this.state.buttonText; break;
        case "button-color": this.state.buttonColor = newV || this.state.buttonColor; break;
        case "text-color": this.state.textColor = newV || this.state.textColor; break;
        case "bg-color": this.state.bgColor = newV || this.state.bgColor; break;
        case "honeypot-name": this.state.honeypotName = newV || this.state.honeypotName; break;
        case "target": this.state.target = newV || this.state.target; break;
      }
      this.render();
    }

    connectedCallback() {
      this.render();
    }

    render() {
      const s = this.state;
      // Accessible hidden label id
      const emailId = "mce-EMAIL";
      const errId = "mce-error-response";
      const okId = "mce-success-response";

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            --cc-gap: 16px;
            --cc-radius: 8px;
            --cc-input-h: 48px;
            --cc-maxw: 960px;

            display: block;
            font-family: arial;
          }
          .wrap {
            padding: 60px 0;
            background: ${s.bgColor};
            color: ${s.textColor};
          }
          .shell {
            max-width: var(--cc-maxw);
            margin: 0 auto;
            padding: 0 16px;
          }
          .row {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: var(--cc-gap);
            align-items: center;
          }
          .icon {
            align-self: start;
          }
          .icon img {
            display: block;
            width: 100px;
            height: auto;
          }
          .hgroup h2 {
            margin: 0 0 4px 0;
            font-size: 1.75rem;
            line-height: 1.2;
          }
          .hgroup p {
            margin: 0;
            opacity: 0.95;
          }

          form {
            margin-top: 16px;
          }
          .formrow {
            display: grid;
            grid-template-columns: 1fr auto;
            gap: var(--cc-gap);
            align-items: start;
          }
          .visually-hidden {
            position: absolute !important;
            clip: rect(1px, 1px, 1px, 1px);
            padding: 0 !important;
            border: 0 !important;
            height: 1px !important;
            width: 1px !important;
            overflow: hidden;
            white-space: nowrap;
          }
          input[type="email"] {
            width: 100%;
            height: var(--cc-input-h);
            box-sizing: border-box;
            border: 1px solid #8c8c8c;
            border-radius: 4px;
            padding: 0 12px;
            font-size: 1rem;
            color: #111;
            background: #fff;
          }
          input[type="email"]::placeholder {
            color: #6b7280;
          }
          button[type="submit"],
          input[type="submit"] {
            height: var(--cc-input-h);
            padding: 0 16px;
            border: none;
            border-radius: 4px;
            background: rgb(197, 150, 12);
            color: #fff;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
          }
          button[type="submit"]:focus,
          input[type="submit"]:focus {
            outline: 3px solid rgba(255,255,255,0.6);
            outline-offset: 2px;
          }

          /* Mailchimp response areas */
          #${errId}, #${okId} {
            margin-top: 8px;
            font-size: 0.95rem;
          }

          /* honeypot container */
          .hp {
            position: absolute;
            left: -5000px;
          }

          /* Responsive */
          @media (max-width: 640px) {
            .row {
              grid-template-columns: 1fr;
              gap: 12px;
            }
            .icon img { width: 72px; }
            .formrow {
              grid-template-columns: 1fr;
            }
          }
        </style>

        <div class="wrap">
          <div class="shell" style="background:#017630;padding:40px">
            <div class="row">
              <div class="icon">
                <img class="county-cc-icon" alt="${this.escape(s.iconAlt)}" src="${this.escape(s.iconSrc)}" width="100" height="91" />
              </div>
              <div class="hgroup" aria-describedby="${okId} ${errId}">
                <h2>${this.escape(s.heading)}</h2>
                <p>${this.escape(s.description)}</p>
              </div>
            </div>

            <form class="validate" action="${this.escape(s.action)}" method="post" target="${this.escape(s.target)}" novalidate>
              <div class="formrow" id="mc_embed_signup_scroll">
                <div class="mc-field-group">
                  <label class="visually-hidden" for="${emailId}">Email Address</label>
                  <input
                    id="${emailId}"
                    class="govuk-input required email"
                    type="email"
                    name="EMAIL"
                    required
                    placeholder="${this.escape(s.placeholder)}"
                    autocomplete="email"
                    inputmode="email"
                  />
                </div>

                <div class="clear">
                  <input
                    class="govuk-button"
                    type="submit"
                    name="subscribe"
                    id="mc-embedded-subscribe"
                    value="${this.escape(s.buttonText)}"
                  />
                </div>
              </div>

              <div id="mce-responses" aria-live="polite" aria-atomic="true">
                <div class="response" id="${errId}" style="display:none;"></div>
                <div class="response" id="${okId}" style="display:none;"></div>
              </div>

              <!-- Honeypot (do not remove; helps Mailchimp block bots) -->
              <div class="hp" aria-hidden="true">
                <input class="govuk-input" type="text" name="${this.escape(s.honeypotName)}" tabindex="-1" value="" />
              </div>
            </form>
          </div>
        </div>
      `;

      // Optional: keep native submit behavior (Mailchimp handles responses).
      // If you later want to show messages inline, hook into 'submit' here.
    }

    // Basic escaping for attribute/HTML interpolation
    escape(str = "") {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
  }

  customElements.define("county-connection-signup", CountyConnectionSignup);