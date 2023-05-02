const styles = new CSSStyleSheet();
styles.replaceSync(`
  :host(*) {
    display: grid;
    max-inline-size: 36em;
    padding: 0.5em;
    gap: 0.5em;
    border: 0.0625em solid grey;
    border-radius: 0.5em;
    grid-template:
    "avatar author-link author-link" max-content
    "content content content" max-content
    "backlink backlink backlink" max-content / min-content auto auto;
  }
  [part="header"] {
    display: flex;
    align-items: center;
    margin-block-end: 1rem;
  }

  ::slotted([slot="avatar"]), [part="avatar"] img {
    grid-area: avatar;
    inline-size: 2rem;
    border-radius: 100%;
    margin-inline-end: 0.5rem;
  }

  [part="handle"] {
    grid-area: author-link;
    margin: 0;
    font-size: 1rem;
  }
  
  [part="content"] {
    grid-area: content;
    max-inline-size: 70ch;
  }

  [part="backlink"] {
    grid-area: backlink;
  }
`);

const template = document.createElement("template");
template.innerHTML = `
  <slot part="avatar" name="avatar">
    <img src="" alt="">
  </slot>
  <a part="handle">
    <slot part="author-name" name="author-name"></slot>
    <slot part="author-handle" name="author-handle"></slot>
  </a>
  <div part="content">
    <slot name="content"></slot>
  </div>
  <a part="backlink" href="" rel="bookmark">
    <slot name="date" part="date"></slot>
  </a>
`;

class TootEmbedElement extends HTMLElement {
  // ...
  static define(tagName = "toot-embed") {
    customElements.define(tagName, this);
  }
  // ...

  shadowRoot = this.attachShadow({ mode: "open" });

  // ...
  connectedCallback() {
    this.shadowRoot.adoptedStyleSheets = [styles];
    this.shadowRoot.replaceChildren(template.content.cloneNode(true));
    this.#setBacklink();
    if (this.hasAttribute("nofetch")) return;
    this.load();
  }

  get src() {
    const src = this.getAttribute("src");
    if (!src) return "";

    return new URL(src, window.location.origin).toString();
  }

  set src(value) {
    this.setAttribute("src", value);
  }

  static observedAttributes = ["src"];
  attributeChangedCallback() {
    this.#setBacklink();
  }

  #setBacklink() {
    const backlink = this.shadowRoot.querySelector("[part=backlink]");
    if (backlink) {
      backlink.href = this.src;
    }
  }
  // ...

  async load() {
    const response = await fetch(this.src);
    const { account, content, created_at, url } = await response.json();
    const accountUrl = new URL(account.url);
    const handle = `${accountUrl.pathname.slice(1)}@${accountUrl.host}`;
    const date = new Date(created_at);
    this.shadowRoot.querySelector("[part=avatar] img").src = account.avatar;
    this.#setBacklink();
    this.shadowRoot.querySelector('slot[name="author-name"]').textContent =
      account.display_name;

    this.shadowRoot.querySelector('slot[name="author-handle"]').textContent =
      handle;
    this.shadowRoot.querySelector("slot[name=content]").innerHTML = content;
    this.shadowRoot.querySelector("slot[name=date]").textContent =
      date.toLocaleString(document.documentElement.lang || "en", {
        dateStyle: "long",
        hourCycle: "h12",
        timeStyle: "short",
      });
  }
}

TootEmbedElement.define();
