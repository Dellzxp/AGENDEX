/* Agendex — utilitários */
(function () {
  const U = {};

  U.uid = function () {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  };

  U.esc = function (v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  U.pad = function (n) { return String(n).padStart(2, '0'); };

  U.iso = function (d) {
    return d.getFullYear() + '-' + U.pad(d.getMonth() + 1) + '-' + U.pad(d.getDate());
  };

  U.parse = function (iso) {
    if (!iso) return null;
    const p = String(iso).slice(0, 10).split('-').map(Number);
    return new Date(p[0], (p[1] || 1) - 1, p[2] || 1);
  };

  U.today = function () { return U.iso(new Date()); };

  U.addDays = function (iso, n) {
    const d = U.parse(iso);
    d.setDate(d.getDate() + n);
    return U.iso(d);
  };

  U.addMonths = function (iso, n) {
    const d = U.parse(iso);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return U.iso(d);
  };

  U.monthKey = function (iso) { return String(iso || '').slice(0, 7); };

  U.currentMonth = function () { return U.monthKey(U.today()); };

  U.monthLabel = function (key, short) {
    if (!key) return '';
    const p = key.split('-').map(Number);
    const d = new Date(p[0], (p[1] || 1) - 1, 1);
    const names = short
      ? ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
      : ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    return names[d.getMonth()] + (short ? '/' + String(d.getFullYear()).slice(2) : ' de ' + d.getFullYear());
  };

  U.monthShort = function (key) {
    return U.monthLabel(key, true).replace('/' + String(key.slice(0, 4)).slice(2), '');
  };

  U.monthStart = function (key) { return key + '-01'; };

  U.monthEnd = function (key) {
    const p = key.split('-').map(Number);
    return U.iso(new Date(p[0], p[1], 0));
  };

  U.daysInMonth = function (key) {
    const p = key.split('-').map(Number);
    return new Date(p[0], p[1], 0).getDate();
  };

  U.fmtDate = function (iso) {
    if (!iso) return '—';
    const p = String(iso).slice(0, 10).split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  };

  U.fmtDateShort = function (iso) {
    if (!iso) return '—';
    const d = U.parse(iso);
    const names = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    return names[d.getDay()] + ', ' + U.pad(d.getDate()) + '/' + U.pad(d.getMonth() + 1);
  };

  U.fmtDateTime = function (ts) {
    if (!ts) return '—';
    const d = new Date(ts);
    return U.pad(d.getDate()) + '/' + U.pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + U.pad(d.getHours()) + ':' + U.pad(d.getMinutes());
  };

  U.relTime = function (ts) {
    if (!ts) return '—';
    const diff = Date.now() - ts;
    if (diff < 60000) return 'agora';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min atrás';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' h atrás';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' d atrás';
    return U.fmtDate(new Date(ts).toISOString().slice(0, 10));
  };

  U.currency = function () {
    try { return (window.Agendex && Agendex.DB && Agendex.DB.data.settings.currency) || 'BRL'; }
    catch (e) { return 'BRL'; }
  };

  U.money = function (v) {
    const n = Number(v) || 0;
    try {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: U.currency() }).format(n);
    } catch (e) {
      return 'R$ ' + n.toFixed(2);
    }
  };

  U.moneyShort = function (v) {
    const n = Number(v) || 0;
    const abs = Math.abs(n);
    if (abs >= 1000000) return (n / 1000000).toFixed(1).replace('.', ',') + ' mi';
    if (abs >= 1000) return (n / 1000).toFixed(abs >= 10000 ? 0 : 1).replace('.', ',') + ' mil';
    return String(Math.round(n));
  };

  U.pct = function (v, total) {
    if (!total) return 0;
    return Math.max(0, Math.min(100, (Number(v) / Number(total)) * 100));
  };

  U.sum = function (arr, fn) {
    return (arr || []).reduce(function (a, x) { return a + (Number(fn ? fn(x) : x) || 0); }, 0);
  };

  U.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  U.norm = function (s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  U.slug = function (s) {
    return U.norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'agendex';
  };

  U.initials = function (name) {
    const parts = String(name || '?').trim().split(/\s+/);
    return ((parts[0] || '?')[0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
  };

  U.debounce = function (fn, ms) {
    let t;
    return function () {
      const args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  };

  U.clone = function (v) { return JSON.parse(JSON.stringify(v)); };

  U.hash = function (str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 0x01000193) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  };

  U.download = function (filename, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };

  U.readFile = function (file) {
    return new Promise(function (resolve, reject) {
      const r = new FileReader();
      r.onload = function () { resolve(String(r.result || '')); };
      r.onerror = function () { reject(r.error || new Error('Falha ao ler arquivo')); };
      r.readAsText(file);
    });
  };

  U.pickFile = function (accept) {
    return new Promise(function (resolve) {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept || '.json,application/json';
      input.onchange = function () { resolve(input.files && input.files[0] ? input.files[0] : null); };
      input.click();
    });
  };

  U.icon = function (name, size) {
    const s = size || 18;
    const p = ICONS[name] || ICONS.dot;
    return '<svg class="icon" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  };

  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    wallet: '<path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 8h16"/><path d="M16 12h2.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    chart: '<path d="M4 20v-7M10 20V4M16 20v-9M22 20H2"/>',
    heart: '<path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21l8.8-8a5.2 5.2 0 0 0 0-7.4z"/>',
    settings: '<path d="M4 6h9M19 6h1M4 12h3M13 12h7M4 18h9M19 18h1"/><circle cx="16" cy="6" r="2.4"/><circle cx="10" cy="12" r="2.4"/><circle cx="16" cy="18" r="2.4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    check: '<path d="m4 12 5 5L20 6"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    edit: '<path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>',
    users: '<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.8M16 3.2a4 4 0 0 1 0 7.6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>',
    moon: '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.5 6.5 0 0 0 9.8 9.8z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    alert: '<path d="M12 3 2 21h20z"/><path d="M12 9v5M12 17h.01"/>',
    arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    arrowDown: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    transfer: '<path d="M4 8h15l-3-3M20 16H5l3 3"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14-4L4 9M4 5v4h4M4 13a8 8 0 0 0 14 4l2-2M20 19v-4h-4"/>',
    dot: '<circle cx="12" cy="12" r="3"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    lock: '<rect x="4" y="10" width="16" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>'
  };

  U.ACCENTS = [
    { name: 'Roxo', value: '#7028C8' },
    { name: 'Verde', value: '#239B65' },
    { name: 'Azul', value: '#2563EB' },
    { name: 'Grafite', value: '#475569' },
    { name: 'Vinho', value: '#9F1239' },
    { name: 'Laranja', value: '#C2410C' }
  ];

  U.PROJECT_COLORS = ['#7028C8', '#239B65', '#2563EB', '#C2410C', '#9F1239', '#0E7490', '#7C3AED', '#4D7C0F'];

  U.MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  window.Agendex = window.Agendex || {};
  window.Agendex.U = U;
})();
