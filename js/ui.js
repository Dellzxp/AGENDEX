/* Agendex — componentes de interface */
(function () {
  const U = Agendex.U;
  const UI = {};
  let activeModal = null;

  function root() {
    let el = document.getElementById('modal-root');
    if (!el) {
      el = document.createElement('div');
      el.id = 'modal-root';
      document.body.appendChild(el);
    }
    return el;
  }

  UI.close = function () {
    const el = root();
    el.innerHTML = '';
    document.body.classList.remove('modal-open');
    if (activeModal && typeof activeModal.onClose === 'function') {
      try { activeModal.onClose(); } catch (e) { console.warn(e); }
    }
    activeModal = null;
  };

  UI.modal = function (opts) {
    opts = opts || {};
    UI.close();
    const id = 'm-' + U.uid().slice(0, 8);
    const width = opts.width || 560;
    const body = opts.body || '';
    const footer = opts.footer || '';
    const html =
      '<div class="modal-backdrop" data-close="1">' +
        '<div class="modal" role="dialog" aria-modal="true" aria-label="' + U.esc(opts.title || 'Janela') + '" style="max-width:' + width + 'px" data-modal="' + id + '">' +
          '<div class="modal-head">' +
            '<div><h2>' + U.esc(opts.title || '') + '</h2>' + (opts.subtitle ? '<p class="modal-sub">' + U.esc(opts.subtitle) + '</p>' : '') + '</div>' +
            '<button type="button" class="icon-btn" data-close="1" aria-label="Fechar">' + U.icon('x', 18) + '</button>' +
          '</div>' +
          '<div class="modal-body">' + body + '</div>' +
          (footer ? '<div class="modal-foot">' + footer + '</div>' : '') +
        '</div>' +
      '</div>';
    root().innerHTML = html;
    document.body.classList.add('modal-open');
    const backdrop = root().querySelector('.modal-backdrop');
    backdrop.addEventListener('click', function (e) {
      if (e.target.getAttribute('data-close') === '1' && opts.dismissable !== false) UI.close();
    });
    root().querySelectorAll('.modal [data-close]').forEach(function (el) {
      el.addEventListener('click', function () { UI.close(); });
    });
    activeModal = opts;
    if (typeof opts.onMount === 'function') opts.onMount(root().querySelector('.modal'));
    const focusEl = root().querySelector('input:not([type=hidden]), select, textarea, button.btn-primary');
    if (focusEl) setTimeout(function () { focusEl.focus(); }, 30);
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && activeModal) UI.close();
  });

  UI.field = function (f) {
    const v = f.value == null ? '' : f.value;
    const name = U.esc(f.name);
    const full = f.full ? ' span-2' : '';
    const req = f.required ? ' required' : '';
    let control = '';
    if (f.type === 'select') {
      const options = (f.options || []).map(function (o) {
        const val = typeof o === 'string' ? o : o.value;
        const label = typeof o === 'string' ? o : o.label;
        return '<option value="' + U.esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + U.esc(label) + '</option>';
      });
      if (f.placeholder) options.unshift('<option value=""' + (v === '' ? ' selected' : '') + '>' + U.esc(f.placeholder) + '</option>');
      control = '<select class="input" name="' + name + '" id="f-' + name + '"' + req + '>' + options.join('') + '</select>';
    } else if (f.type === 'textarea') {
      control = '<textarea class="input" name="' + name + '" id="f-' + name + '" rows="' + (f.rows || 3) + '" placeholder="' + U.esc(f.placeholder || '') + '"' + req + '>' + U.esc(v) + '</textarea>';
    } else if (f.type === 'checkbox') {
      return '<label class="check' + full + '"><input type="checkbox" name="' + name + '" id="f-' + name + '"' + (v ? ' checked' : '') + '><span>' + U.esc(f.label) + '</span>' + (f.hint ? '<small>' + U.esc(f.hint) + '</small>' : '') + '</label>';
    } else if (f.type === 'color') {
      control = '<div class="color-row"><input type="color" class="input color" name="' + name + '" id="f-' + name + '" value="' + U.esc(v || '#7028C8') + '"><span class="mono muted" data-color-label>' + U.esc(v || '#7028C8') + '</span></div>';
    } else if (f.type === 'static') {
      control = '<div class="static-field">' + (f.html || U.esc(v)) + '</div>';
    } else {
      const type = f.type || 'text';
      const step = f.step != null ? ' step="' + f.step + '"' : (type === 'number' ? ' step="0.01"' : '');
      const min = f.min != null ? ' min="' + f.min + '"' : '';
      const max = f.max != null ? ' max="' + f.max + '"' : '';
      control = '<input class="input" type="' + type + '" name="' + name + '" id="f-' + name + '" value="' + U.esc(v) + '" placeholder="' + U.esc(f.placeholder || '') + '"' + step + min + max + req + '>';
    }
    return '<div class="field' + full + '" data-field="' + name + '">' +
      (f.type === 'static' ? '' : '<label for="f-' + name + '">' + U.esc(f.label) + '</label>') +
      control +
      (f.hint ? '<small class="hint">' + U.esc(f.hint) + '</small>' : '') +
      '</div>';
  };

  UI.form = function (opts) {
    const fields = opts.fields || [];
    const body = '<form id="ag-form" class="form" novalidate>' +
      '<div class="form-grid">' + fields.map(UI.field).join('') + '</div>' +
      '<div class="form-error" id="ag-form-error" role="alert"></div>' +
      '</form>';
    const footer =
      (opts.dangerAction ? '<button type="button" class="btn ghost danger-text" id="ag-form-danger">' + U.esc(opts.dangerAction.label || 'Excluir') + '</button><span class="foot-spacer"></span>' : '') +
      '<button type="button" class="btn ghost" data-close="1">' + U.esc(opts.cancelLabel || 'Cancelar') + '</button>' +
      '<button type="submit" class="btn ' + (opts.danger ? 'danger' : 'primary') + '" form="ag-form" id="ag-form-submit">' + U.esc(opts.submitLabel || 'Salvar') + '</button>';

    UI.modal({
      title: opts.title,
      subtitle: opts.subtitle,
      body: body,
      footer: footer,
      width: opts.width || 600,
      dismissable: opts.dismissable,
      onMount: function (modal) {
        const form = modal.querySelector('#ag-form');
        const err = modal.querySelector('#ag-form-error');
        const submit = modal.querySelector('#ag-form-submit');
        const color = modal.querySelector('input[type=color]');
        if (opts.dangerAction) {
          const del = modal.querySelector('#ag-form-danger');
          if (del) del.addEventListener('click', function () {
            UI.close();
            setTimeout(function () { opts.dangerAction.onClick(); }, 30);
          });
        }
        if (color) {
          const label = modal.querySelector('[data-color-label]');
          color.addEventListener('input', function () { if (label) label.textContent = color.value; });
        }
        if (typeof opts.onReady === 'function') opts.onReady(modal, form);
        form.addEventListener('submit', async function (e) {
          e.preventDefault();
          err.textContent = '';
          const values = {};
          fields.forEach(function (f) {
            if (f.type === 'static') return;
            const el = form.elements[f.name];
            if (!el) return;
            if (f.type === 'checkbox') values[f.name] = !!el.checked;
            else if (f.type === 'number') values[f.name] = el.value === '' ? null : Number(el.value);
            else values[f.name] = el.value;
            if (f.type === 'number' && values[f.name] != null && isNaN(values[f.name])) {
              err.textContent = 'Informe um número válido em "' + f.label + '".';
              throw new Error('invalid');
            }
          });
          for (const f of fields) {
            if (f.required && (values[f.name] === '' || values[f.name] == null)) {
              err.textContent = 'Preencha o campo "' + f.label + '".';
              const el = form.elements[f.name];
              if (el) el.focus();
              return;
            }
          }
          if (typeof opts.validate === 'function') {
            const msg = opts.validate(values);
            if (msg) { err.textContent = msg; return; }
          }
          submit.disabled = true;
          submit.textContent = 'Salvando…';
          try {
            const res = await opts.onSubmit(values);
            if (res === false) {
              submit.disabled = false;
              submit.textContent = opts.submitLabel || 'Salvar';
              return;
            }
            UI.close();
          } catch (ex) {
            console.error(ex);
            if (ex && ex.message && ex.message !== 'invalid') err.textContent = ex.message;
            submit.disabled = false;
            submit.textContent = opts.submitLabel || 'Salvar';
          }
        });
      }
    });
  };

  UI.confirm = function (opts) {
    return new Promise(function (resolve) {
      let done = false;
      function finish(v) {
        if (done) return;
        done = true;
        resolve(v);
      }
      const body = '<p class="confirm-text">' + U.esc(opts.message || '') + '</p>' +
        (opts.detail ? '<p class="confirm-detail">' + opts.detail + '</p>' : '');
      const footer =
        '<button type="button" class="btn ghost" data-cancel="1">' + U.esc(opts.cancelLabel || 'Cancelar') + '</button>' +
        '<button type="button" class="btn ' + (opts.danger ? 'danger' : 'primary') + '" data-ok="1">' + U.esc(opts.confirmLabel || 'Confirmar') + '</button>';
      UI.modal({
        title: opts.title || 'Confirmar',
        body: body,
        footer: footer,
        width: opts.width || 440,
        onMount: function (modal) {
          modal.querySelector('[data-ok]').addEventListener('click', function () { finish(true); UI.close(); });
          modal.querySelector('[data-cancel]').addEventListener('click', function () { finish(false); UI.close(); });
        },
        onClose: function () { finish(false); }
      });
    });
  };

  UI.prompt = function (opts) {
    return new Promise(function (resolve) {
      let done = false;
      function finish(v) { if (!done) { done = true; resolve(v); } }
      const footer =
        '<button type="button" class="btn ghost" data-cancel="1">Cancelar</button>' +
        '<button type="button" class="btn primary" data-ok="1">' + U.esc(opts.confirmLabel || 'Confirmar') + '</button>';
      UI.modal({
        title: opts.title || 'Digite',
        body: '<form id="prompt-form"><div class="field"><label for="prompt-input">' + U.esc(opts.label || '') + '</label><input class="input" id="prompt-input" value="' + U.esc(opts.value || '') + '" placeholder="' + U.esc(opts.placeholder || '') + '"></div></form>',
        footer: footer,
        width: 440,
        onMount: function (modal) {
          const input = modal.querySelector('#prompt-input');
          const ok = function () { finish(input.value.trim()); UI.close(); };
          modal.querySelector('[data-ok]').addEventListener('click', ok);
          modal.querySelector('[data-cancel]').addEventListener('click', function () { finish(null); UI.close(); });
          input.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); ok(); } });
          setTimeout(function () { input.focus(); input.select(); }, 40);
        },
        onClose: function () { finish(null); }
      });
    });
  };

  UI.toast = function (msg, tone) {
    let rootEl = document.getElementById('toast-root');
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = 'toast-root';
      document.body.appendChild(rootEl);
    }
    const el = document.createElement('div');
    el.className = 'toast ' + (tone || '');
    el.innerHTML = (tone === 'error' ? U.icon('alert', 16) : U.icon('check', 16)) + '<span>' + U.esc(msg) + '</span>';
    rootEl.appendChild(el);
    setTimeout(function () { el.classList.add('show'); }, 10);
    setTimeout(function () {
      el.classList.remove('show');
      setTimeout(function () { el.remove(); }, 250);
    }, 3200);
  };

  UI.copy = async function (text, label) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      UI.toast(label || 'Copiado');
      return true;
    } catch (e) {
      UI.toast('Não foi possível copiar. Selecione o texto manualmente.', 'error');
      return false;
    }
  };

  UI.empty = function (icon, title, text, action) {
    return '<div class="empty">' +
      '<div class="empty-icon">' + U.icon(icon || 'dot', 22) + '</div>' +
      '<h3>' + U.esc(title) + '</h3>' +
      (text ? '<p>' + U.esc(text) + '</p>' : '') +
      (action ? '<div class="empty-action">' + action + '</div>' : '') +
      '</div>';
  };

  UI.badge = function (text, tone) {
    return '<span class="badge ' + (tone || '') + '">' + U.esc(text) + '</span>';
  };

  UI.bar = function (pct, color) {
    const p = U.clamp(pct, 0, 100);
    return '<div class="progress"><span style="width:' + p.toFixed(1) + '%;background:' + U.esc(color || 'var(--accent)') + '"></span></div>';
  };

  UI.avatar = function (name, color) {
    return '<span class="avatar" style="background:' + U.esc(color || 'var(--accent-soft)') + ';color:' + U.esc(color ? '#fff' : 'var(--accent)') + '">' + U.esc(U.initials(name)) + '</span>';
  };

  UI.statusBadge = function (status) {
    if (status === 'paid') return UI.badge('Pago', 'ok');
    if (status === 'pending') return UI.badge('Pendente', 'warn');
    if (status === 'overdue') return UI.badge('Atrasado', 'danger');
    return UI.badge(status || '—', '');
  };

  window.Agendex.UI = UI;
})();
