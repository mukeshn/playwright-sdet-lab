// Tiny Lightning-style component library. Each component renders into an
// open shadow root, the same way LWC base components do, so locators must
// pierce shadow boundaries.
const css = `
  :host { display: block; font-family: system-ui, sans-serif; }
  label { display:block; font-size:.8rem; color:#3e3e3c; margin:.5rem 0 .2rem; }
  abbr { color:#ba0517; text-decoration:none; }
  input, textarea { width:100%; box-sizing:border-box; padding:.45rem .6rem; border:1px solid #c9c9c9; border-radius:4px; font-size:.9rem; }
  .slds-has-error input { border-color:#ba0517; box-shadow: 0 0 0 1px #ba0517 inset; }
  .slds-form-element__help { color:#ba0517; font-size:.75rem; margin-top:.2rem; }
  button { font: inherit; }
  .slds-button { border-radius:4px; padding:.4rem 1rem; border:1px solid #c9c9c9; background:#fff; color:#0176d3; cursor:pointer; }
  .slds-button_brand { background:#0176d3; color:#fff; border-color:#0176d3; }
  .slds-button_destructive { background:#ba0517; color:#fff; border-color:#ba0517; }
`;

class Base extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  get label() { return this.getAttribute('label') || ''; }
}

class LightningInput extends Base {
  connectedCallback() {
    const id = 'input-' + Math.random().toString(36).slice(2, 8);
    const req = this.hasAttribute('required');
    this.shadowRoot.innerHTML = `<style>${css}</style>
      <div class="slds-form-element" part="container">
        <label for="${id}" class="slds-form-element__label">${req ? '<abbr title="required">*</abbr> ' : ''}${this.label}</label>
        <input id="${id}" part="input" type="${this.getAttribute('type') || 'text'}" name="${this.getAttribute('name') || ''}" ${req ? 'required aria-required="true"' : ''}>
        <div class="slds-form-element__help" role="alert" hidden></div>
      </div>`;
    this.input = this.shadowRoot.querySelector('input');
    this.input.addEventListener('input', () => this.setError(''));
  }
  get value() { return this.input?.value ?? ''; }
  set value(v) { if (this.input) this.input.value = v; }
  get name() { return this.getAttribute('name'); }
  setError(msg) {
    const help = this.shadowRoot.querySelector('.slds-form-element__help');
    help.textContent = msg; help.hidden = !msg;
    this.shadowRoot.querySelector('.slds-form-element').classList.toggle('slds-has-error', !!msg);
    this.input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  reportValidity() {
    if (this.hasAttribute('required') && !this.value.trim()) { this.setError('Complete this field.'); return false; }
    if (this.getAttribute('type') === 'email' && this.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.value)) { this.setError('You have entered an invalid format.'); return false; }
    return true;
  }
}

class LightningCombobox extends Base {
  connectedCallback() {
    this.options = JSON.parse(this.getAttribute('options') || '[]');
    this._value = this.getAttribute('value') || this.options[0] || '';
    this.shadowRoot.innerHTML = `<style>${css}
      .dropdown { position:relative; }
      .trigger { width:100%; text-align:left; padding:.45rem .6rem; border:1px solid #c9c9c9; border-radius:4px; background:#fff; }
      ul { position:absolute; z-index:5; left:0; right:0; list-style:none; margin:2px 0 0; padding:.25rem 0; background:#fff; border:1px solid #c9c9c9; border-radius:4px; box-shadow:0 2px 6px rgba(0,0,0,.15); }
      li { padding:.4rem .75rem; cursor:pointer; } li:hover, li[aria-selected="true"] { background:#f3f3f3; }</style>
      <label>${this.label}</label>
      <div class="dropdown">
        <button class="trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-label="${this.label}" name="${this.getAttribute('name') || ''}">${this._value}</button>
        <ul role="listbox" hidden>${this.options.map((o) => `<li role="option" data-value="${o}" aria-selected="${o === this._value}">${o}</li>`).join('')}</ul>
      </div>`;
    const trigger = this.shadowRoot.querySelector('.trigger');
    const list = this.shadowRoot.querySelector('ul');
    trigger.addEventListener('click', (e) => { e.preventDefault(); list.hidden = !list.hidden; trigger.setAttribute('aria-expanded', String(!list.hidden)); });
    list.addEventListener('click', (e) => {
      const li = e.target.closest('li'); if (!li) return;
      this.value = li.dataset.value;
      list.hidden = true; trigger.setAttribute('aria-expanded', 'false');
      this.dispatchEvent(new CustomEvent('change', { detail: { value: this._value }, bubbles: true, composed: true }));
    });
  }
  get value() { return this._value; }
  set value(v) {
    this._value = v;
    const t = this.shadowRoot.querySelector('.trigger'); if (t) t.textContent = v;
    this.shadowRoot.querySelectorAll('li').forEach((li) => li.setAttribute('aria-selected', String(li.dataset.value === v)));
  }
  get name() { return this.getAttribute('name'); }
}

class LightningButton extends Base {
  connectedCallback() {
    const variant = this.getAttribute('variant') || 'neutral';
    this.shadowRoot.innerHTML = `<style>${css}</style><button class="slds-button slds-button_${variant}" part="button" type="button" title="${this.label}">${this.label}</button>`;
  }
}

class LightningDatatable extends Base {
  set config({ columns, data, keyField = 'Id', rowActions = [] }) { this._c = { columns, data, keyField, rowActions }; this.render(); }
  render() {
    const { columns, data, keyField, rowActions } = this._c;
    this.shadowRoot.innerHTML = `<style>${css}
      table { width:100%; border-collapse:collapse; background:#fff; font-size:.85rem; }
      th { text-align:left; background:#f3f3f3; padding:.5rem; border-bottom:1px solid #e5e5e5; cursor:pointer; }
      td { padding:.5rem; border-bottom:1px solid #e5e5e5; }
      a { color:#0176d3; text-decoration:none; } .menu { position:relative; } .menu ul { position:absolute; right:0; background:#fff; border:1px solid #ccc; list-style:none; padding:0; margin:0; z-index:3; } .menu li button { border:0; background:none; padding:.4rem .8rem; width:100%; text-align:left; cursor:pointer; }</style>
      <table role="grid" aria-label="${this.label}"><thead><tr>${columns.map((c) => `<th scope="col" data-field="${c.fieldName}" aria-sort="none">${c.label}</th>`).join('')}${rowActions.length ? '<th><span class="assistive">Actions</span></th>' : ''}</tr></thead>
      <tbody>${data.map((row) => `<tr data-row-key-value="${row[keyField]}">${columns.map((c) => `<td data-label="${c.label}" data-field="${c.fieldName}">${c.type === 'link' ? `<a href="${c.href(row)}">${row[c.fieldName] ?? ''}</a>` : c.type === 'currency' && row[c.fieldName] != null ? new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(row[c.fieldName]) : row[c.fieldName] ?? ''}</td>`).join('')}
        ${rowActions.length ? `<td class="menu"><button class="slds-button" aria-haspopup="true" title="Show actions" aria-label="Show actions" data-action-toggle>▼</button><ul hidden>${rowActions.map((a) => `<li><button data-action="${a}" role="menuitem">${a}</button></li>`).join('')}</ul></td>` : ''}</tr>`).join('')}</tbody></table>
      <p class="count" style="font-size:.8rem;color:#706e6b">${data.length} item${data.length === 1 ? '' : 's'}</p>`;
    this.shadowRoot.querySelectorAll('th[data-field]').forEach((th) => th.addEventListener('click', () => {
      const f = th.dataset.field; const asc = th.getAttribute('aria-sort') !== 'ascending';
      this._c.data = [...data].sort((a, b) => String(a[f] ?? '').localeCompare(String(b[f] ?? ''), undefined, { numeric: true }) * (asc ? 1 : -1));
      this.render();
      this.shadowRoot.querySelector(`th[data-field="${f}"]`).setAttribute('aria-sort', asc ? 'ascending' : 'descending');
    }));
    this.shadowRoot.querySelectorAll('[data-action-toggle]').forEach((b) => b.addEventListener('click', () => { const ul = b.nextElementSibling; ul.hidden = !ul.hidden; }));
    this.shadowRoot.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => {
      const key = b.closest('tr').dataset.rowKeyValue;
      this.dispatchEvent(new CustomEvent('rowaction', { detail: { action: b.dataset.action, row: this._c.data.find((r) => r[this._c.keyField] === key) }, bubbles: true, composed: true }));
    }));
  }
}

class CrmToast extends Base {
  connectedCallback() {
    this.shadowRoot.innerHTML = `<style>${css} .toast { position:fixed; top:1rem; left:50%; transform:translateX(-50%); min-width:320px; padding:.75rem 1rem; border-radius:4px; color:#fff; z-index:99; }
      .success { background:#2e844a; } .error { background:#ba0517; } .info { background:#706e6b; }</style>
      <div class="toast" role="alert" aria-live="assertive" hidden><span class="title" data-key="title"></span> <span class="message" data-key="message"></span>
      <button title="Close" aria-label="Close" style="background:none;border:0;color:#fff;float:right;cursor:pointer">✕</button></div>`;
    this.shadowRoot.querySelector('button').addEventListener('click', () => (this.shadowRoot.querySelector('.toast').hidden = true));
  }
  show({ title = '', message, variant = 'success', duration = 4000 }) {
    const t = this.shadowRoot.querySelector('.toast');
    t.className = `toast ${variant}`; t.dataset.variant = variant;
    t.querySelector('.title').textContent = title; t.querySelector('.message').textContent = message;
    t.hidden = false;
    clearTimeout(this._t); this._t = setTimeout(() => (t.hidden = true), duration);
  }
}

class LightningPath extends Base {
  set stages({ stages, current }) { this._s = { stages, current }; this.render(); }
  render() {
    const { stages, current } = this._s;
    const idx = stages.indexOf(current);
    this.shadowRoot.innerHTML = `<style>${css} ol{display:flex;list-style:none;padding:0;gap:2px;margin:0 0 .5rem} li{flex:1} li button{width:100%;padding:.45rem;border:0;background:#ecebea;cursor:pointer;font-size:.75rem}
      li.complete button{background:#2e844a;color:#fff} li.current button{background:#0d1d58;color:#fff} li.selected button{outline:3px solid #1b96ff}</style>
      <ol role="listbox" aria-label="Path">${stages.map((s, i) => `<li class="${i < idx ? 'complete' : i === idx ? 'current' : ''}" role="option" aria-selected="${i === idx}" data-stage="${s}"><button title="${s}">${s}</button></li>`).join('')}</ol>
      <button class="slds-button slds-button_brand" data-mark disabled>Mark as Current Stage</button>`;
    let picked;
    this.shadowRoot.querySelectorAll('li').forEach((li) => li.querySelector('button').addEventListener('click', () => {
      this.shadowRoot.querySelectorAll('li').forEach((x) => x.classList.remove('selected'));
      li.classList.add('selected'); picked = li.dataset.stage;
      this.shadowRoot.querySelector('[data-mark]').disabled = picked === current;
    }));
    this.shadowRoot.querySelector('[data-mark]').addEventListener('click', () => this.dispatchEvent(new CustomEvent('stagechange', { detail: { stage: picked }, bubbles: true, composed: true })));
  }
}

customElements.define('lightning-input', LightningInput);
customElements.define('lightning-combobox', LightningCombobox);
customElements.define('lightning-button', LightningButton);
customElements.define('lightning-datatable', LightningDatatable);
customElements.define('lightning-path', LightningPath);
customElements.define('crm-toast', CrmToast);
