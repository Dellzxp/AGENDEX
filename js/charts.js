/* Agendex — gráficos em SVG/CSS, sem dependências */
(function () {
  const U = Agendex.U;
  const C = {};

  C.groupedBars = function (opts) {
    const labels = opts.labels || [];
    const series = opts.series || [];
    const W = 660, H = opts.height || 210;
    const padL = 46, padR = 8, padT = 14, padB = 26;
    const all = series.reduce(function (a, s) { return a.concat(s.data || []); }, []);
    const rawMax = Math.max.apply(null, all.concat([1]));
    const max = rawMax * 1.12;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const groupW = plotW / Math.max(labels.length, 1);
    const barW = Math.max(6, Math.min(20, (groupW - 16) / Math.max(series.length, 1)));
    const gap = 3;
    let out = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Gráfico de barras" preserveAspectRatio="xMidYMid meet">';

    for (let i = 0; i <= 4; i++) {
      const y = padT + (plotH / 4) * i;
      const val = max - (max / 4) * i;
      out += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--border)" stroke-width="1" stroke-dasharray="' + (i === 4 ? '0' : '3 4') + '"/>';
      out += '<text x="' + (padL - 8) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" class="chart-label">' + U.esc(U.moneyShort(val)) + '</text>';
    }

    labels.forEach(function (label, li) {
      const gx = padL + groupW * li + groupW / 2;
      const totalW = barW * series.length + gap * (series.length - 1);
      const startX = gx - totalW / 2;
      series.forEach(function (s, si) {
        const v = Number((s.data || [])[li] || 0);
        const h = max > 0 ? (v / max) * plotH : 0;
        const x = startX + si * (barW + gap);
        const y = padT + plotH - h;
        out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(h, 0.5).toFixed(1) + '" rx="3" fill="' + U.esc(s.color) + '"><title>' + U.esc(label + ' · ' + (s.name || '') + ': ' + U.money(v)) + '</title></rect>';
      });
      out += '<text x="' + gx.toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" class="chart-label">' + U.esc(label) + '</text>';
    });
    out += '</svg>';
    return out;
  };

  C.hBars = function (items, opts) {
    opts = opts || {};
    const max = opts.max || Math.max.apply(null, items.map(function (i) { return Number(i.value) || 0; }).concat([1]));
    if (!items.length) return '<p class="muted small">Sem dados no período.</p>';
    return '<div class="hbars">' + items.map(function (it) {
      const v = Number(it.value) || 0;
      const p = max > 0 ? (v / max) * 100 : 0;
      return '<div class="hbar">' +
        '<div class="hbar-top"><span>' + U.esc(it.label) + '</span><b>' + U.esc(opts.format ? opts.format(v) : U.money(v)) + (opts.pct && opts.total ? ' <span class="muted">(' + Math.round(U.pct(v, opts.total)) + '%)</span>' : '') + '</b></div>' +
        '<div class="hbar-track"><span style="width:' + Math.max(p, 1).toFixed(1) + '%;background:' + U.esc(it.color || 'var(--accent)') + '"></span></div>' +
      '</div>';
    }).join('') + '</div>';
  };

  C.legend = function (items) {
    return '<div class="legend">' + items.map(function (i) {
      return '<span class="legend-item"><i style="background:' + U.esc(i.color) + '"></i>' + U.esc(i.label) + '</span>';
    }).join('') + '</div>';
  };

  C.donut = function (items, opts) {
    opts = opts || {};
    const total = U.sum(items, function (i) { return i.value; });
    if (!total) return '<p class="muted small">Sem dados no período.</p>';
    const size = 150, r = 58, cx = 75, cy = 75, sw = 18;
    const circ = 2 * Math.PI * r;
    let offset = 0;
    let segs = '';
    items.forEach(function (it) {
      const frac = (Number(it.value) || 0) / total;
      const len = frac * circ;
      segs += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + U.esc(it.color) + '" stroke-width="' + sw + '" stroke-dasharray="' + len.toFixed(2) + ' ' + (circ - len).toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"><title>' + U.esc(it.label + ': ' + U.money(it.value)) + '</title></circle>';
      offset += len;
    });
    return '<div class="donut-wrap"><svg viewBox="0 0 150 150" class="donut" role="img" aria-label="Distribuição">' + segs +
      '<text x="75" y="72" text-anchor="middle" class="donut-value">' + U.esc(opts.centerValue || U.moneyShort(total)) + '</text>' +
      '<text x="75" y="88" text-anchor="middle" class="chart-label">' + U.esc(opts.centerLabel || 'total') + '</text>' +
      '</svg><div class="donut-legend">' + items.map(function (it) {
        return '<div class="donut-item"><i style="background:' + U.esc(it.color) + '"></i><span>' + U.esc(it.label) + '</span><b>' + U.esc(U.money(it.value)) + '</b></div>';
      }).join('') + '</div></div>';
  };

  C.line = function (opts) {
    opts = opts || {};
    const labels = opts.labels || [];
    const data = (opts.data || []).map(function (v) { return Number(v) || 0; });
    if (!data.length) return '<p class="muted small">Sem dados no período.</p>';
    const W = 660, H = opts.height || 210;
    const padL = 54, padR = 12, padT = 16, padB = 26;
    const plotW = W - padL - padR, plotH = H - padT - padB;
    const max = Math.max.apply(null, data.concat([0]));
    const min = Math.min.apply(null, data.concat([0]));
    const span = (max - min) || 1;
    const X = function (i) { return padL + (data.length > 1 ? (plotW / (data.length - 1)) * i : plotW / 2); };
    const Y = function (v) { return padT + plotH - ((v - min) / span) * plotH; };
    const color = opts.color || 'var(--accent)';
    let out = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Evolução" preserveAspectRatio="xMidYMid meet">';

    for (let i = 0; i <= 4; i++) {
      const val = max - (span / 4) * i;
      const y = Y(val);
      out += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="var(--border)" stroke-width="1" stroke-dasharray="' + (i === 4 ? '0' : '3 4') + '"/>';
      out += '<text x="' + (padL - 8) + '" y="' + (y + 3).toFixed(1) + '" text-anchor="end" class="chart-label">' + U.esc(U.moneyShort(val)) + '</text>';
    }

    const zeroY = Y(0);
    if (min < 0 && max > 0) {
      out += '<line x1="' + padL + '" x2="' + (W - padR) + '" y1="' + zeroY.toFixed(1) + '" y2="' + zeroY.toFixed(1) + '" stroke="var(--border-strong)" stroke-width="1"/>';
    }
    const baseY = min < 0 && max > 0 ? zeroY : padT + plotH;
    const pts = data.map(function (v, i) { return [X(i), Y(v)]; });
    const linePath = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    const areaPath = linePath + ' L ' + pts[pts.length - 1][0].toFixed(1) + ' ' + baseY.toFixed(1) + ' L ' + pts[0][0].toFixed(1) + ' ' + baseY.toFixed(1) + ' Z';
    out += '<path d="' + areaPath + '" fill="' + color + '" fill-opacity=".10" stroke="none"/>';
    out += '<path d="' + linePath + '" fill="none" stroke="' + color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    pts.forEach(function (p, i) {
      out += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3.2" fill="var(--surface)" stroke="' + color + '" stroke-width="2"><title>' + U.esc((labels[i] || '') + ': ' + U.money(data[i])) + '</title></circle>';
      out += '<text x="' + p[0].toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" class="chart-label">' + U.esc(labels[i] || '') + '</text>';
    });
    out += '</svg>';
    return out;
  };

  window.Agendex.Charts = C;
})();
