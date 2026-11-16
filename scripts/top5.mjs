// Genera top5.svg: el top 5 de Mosquita Muerta como imagen, para el banner de la tienda.
// Lo corre la GitHub Action "Top 5 para el banner" cada pocos minutos.
// Prueba local: node scripts/top5.mjs datos.json  (arreglo de {n, s, m})
import { readFileSync, writeFileSync } from 'node:fs';

const FB = { key: 'AIzaSyAKqSVC3q7waYUagJmk3iS_zB2ipjHkY1M', pid: 'mosquita-muerta-cd551' };
const URL_QUERY = `https://firestore.googleapis.com/v1/projects/${FB.pid}/databases/(default)/documents:runQuery?key=${FB.key}`;

async function fetchTop5() {
  const r = await fetch(URL_QUERY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'scores' }], orderBy: [{ field: { fieldPath: 's' }, direction: 'DESCENDING' }], limit: 5 } })
  });
  if (!r.ok) throw new Error('Firestore respondió ' + r.status + ': ' + await r.text());
  return (await r.json()).filter(x => x.document).map(x => {
    const f = x.document.fields || {};
    return { n: (f.n && f.n.stringValue) || '?', s: +((f.s && f.s.integerValue) || 0), m: +((f.m && f.m.integerValue) || 0) };
  });
}

const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const font = f => readFileSync(new URL('../fonts/' + f, import.meta.url)).toString('base64');
const miles = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const INK = '#141414', PAPER = '#f3eee2', AMBER = '#e8a317', RED = '#e0453a';
const W = 400, H = 470;

function svg(rows) {
  const top = 132, rowH = 58;
  let body = '';
  if (!rows.length) {
    body = `<text x="${W / 2}" y="270" class="m" font-size="17" fill="${PAPER}" text-anchor="middle" opacity=".8">TODAVÍA NO HAY PUNTAJES</text>
  <text x="${W / 2}" y="300" class="m" font-size="17" fill="${AMBER}" text-anchor="middle">¡SEA EL PRIMERO!</text>`;
  }
  rows.slice(0, 5).forEach((e, i) => {
    const y = top + i * rowH, first = i === 0;
    const name = e.n.toUpperCase().slice(0, 12);
    body += `
  <g transform="translate(0 ${y})">
    ${first ? `<rect x="22" y="0" width="${W - 44}" height="${rowH - 8}" fill="${AMBER}"/>` : `<line x1="22" y1="${rowH - 4}" x2="${W - 22}" y2="${rowH - 4}" stroke="${PAPER}" stroke-opacity=".15" stroke-width="2"/>`}
    <text x="40" y="37" class="t" font-size="34" fill="${first ? INK : AMBER}">${i + 1}</text>
    <text x="78" y="33" class="m" font-size="${name.length > 10 ? 19 : 21}" fill="${first ? INK : PAPER}">${esc(name)}</text>
    <text x="${W - 38}" y="33" class="m" font-size="21" fill="${first ? INK : PAPER}" text-anchor="end">${miles(e.s)}</text>
  </g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <style>
    @font-face{font-family:BS;src:url(data:font/woff2;base64,${font('big-shoulders-900.woff2')}) format('woff2');font-weight:900}
    @font-face{font-family:SM;src:url(data:font/woff2;base64,${font('space-mono-700.woff2')}) format('woff2');font-weight:700}
    .t{font-family:BS,'Arial Narrow',Impact,sans-serif;font-weight:900}
    .m{font-family:SM,ui-monospace,monospace;font-weight:700}
  </style>
  <rect x="10" y="10" width="${W - 10}" height="${H - 10}" fill="${AMBER}"/>
  <rect x="0" y="0" width="${W - 10}" height="${H - 10}" fill="${INK}" fill-opacity=".92" stroke="${PAPER}" stroke-width="3"/>
  <text x="${(W - 10) / 2}" y="78" class="t" font-size="64" fill="${PAPER}" text-anchor="middle" letter-spacing="2">TOP 5</text>
  <text x="${(W - 10) / 2}" y="108" class="m" font-size="14" fill="${RED}" text-anchor="middle" letter-spacing="3">MEJORES JUGADORES</text>
  ${body}
  <text x="${(W - 10) / 2}" y="${H - 30}" class="m" font-size="12" fill="${PAPER}" fill-opacity=".55" text-anchor="middle" letter-spacing="1">PUNTOS · MOSQUITA MUERTA</text>
</svg>
`;
}

const rows = process.argv[2] ? JSON.parse(readFileSync(process.argv[2], 'utf8')) : await fetchTop5();
writeFileSync(new URL('../top5.svg', import.meta.url), svg(rows));
console.log('top5.svg listo:', rows.map(r => r.n + ' ' + r.s).join(' | ') || '(vacío)');
