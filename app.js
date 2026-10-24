'use strict';
const QB = window.QB || { modules: {}, questions: [], cards: [], briefs: [] };
const QS = QB.questions;
const BY_ID = Object.fromEntries(QS.map(q => [q.id, q]));
const MODS = Object.keys(QB.modules).map(Number).sort((a, b) => a - b);
const EXAM = new Date('2026-10-30T09:00:00');
const MOCK_BASIC = 13, MOCK_ADV = 12;
const L = 'ABCDEF';
// Content updates, newest first. Each batch tags its questions (data/*.json "batch") so returning users can solve only the new ones.
const UPDATES = [
  { batch: 'kc-2026-10-24', date: '2026-10-24', title: '공식 지식 확인 60문항 + 응용 20문항 추가 · 핵심 요약 보강', desc: '모듈 2~7 지식 확인(Canvas) 원문 문항과 공식 정답·해설, 그 내용을 비튼 응용 20문항을 추가했습니다. 핵심 요약 탭에 모듈별 "공식 지식 확인 포인트"와 함정(번역 오류로 정답 개수가 다른 문항 등)을 더했습니다.' },
];
const KEY = 'awsMidterm.v1';

// ---------- persisted state ----------
// new fields must be additive with defaults here: saved progress from older versions is merged onto this
const blank = () => ({ stats: {}, wrong: {}, optBm: {}, star: {}, history: [], mock: null, cardIdx: 0, seenUpdates: {} });
let S;
try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch { S = blank(); }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch {} };

// ---------- helpers ----------
const $app = document.getElementById('app');
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
// new option order on every presentation, never repeating the previous order of the same question
const lastOrder = {};
function perm(q) {
  let p;
  do p = shuffle(q.options.map((_, i) => i)); while (p.join() === lastOrder[q.id]);
  lastOrder[q.id] = p.join();
  return p;
}
const fixed = id => S.stats[id]?.last === true; // wrong before, answered correctly on the latest attempt
const pct = (c, t) => t ? Math.round(c * 100 / t) : 0;
const fmt = sec => { const h = sec / 3600 | 0, m = (sec % 3600) / 60 | 0, s = sec % 60; return (h ? h + ':' : '') + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); };
const isRight = (q, sel) => sel.length === q.answer.length && q.answer.every(a => sel.includes(a));
const modName = m => `M${m} ${QB.modules[m] || ''}`;
const DG = window.DIAGRAMS || [];

// first diagram whose regex matches the question, preferring the question's own module
function diagFor(q) {
  const text = [q.scenario, q.requirement, q.question, ...q.options].join(' ');
  const hits = DG.filter(d => d.match.test(text));
  return hits.find(d => d.module === q.module) || hits[0];
}
const figHTML = (d, open = true) => `<details class="fig" ${open ? 'open' : ''}><summary>🖼 그림으로 이해하기: ${esc(d.title)}</summary>
  <div class="fig-wrap">${d.svg}</div><p class="cap">${esc(d.caption)}</p></details>`;

function highlight(text, kws) {
  let h = esc(text);
  for (const k of [...kws].sort((a, b) => b.length - a.length)) {
    const e = esc(k);
    if (e) h = h.split(e).join(`<mark class="kw">${e}</mark>`);
  }
  return h;
}

function toggle(q, sel, orig) {
  if (q.choose === 1) return sel[0] === orig ? [] : [orig];
  if (sel.includes(orig)) return sel.filter(x => x !== orig);
  return sel.length < q.choose ? [...sel, orig] : sel;
}

function record(q, sel) {
  const ok = isRight(q, sel);
  const st = S.stats[q.id] || (S.stats[q.id] = { a: 0, c: 0 });
  st.a++; if (ok) st.c++;
  st.last = ok;
  if (!ok) S.wrong[q.id] = (S.wrong[q.id] || 0) + 1;
  return ok;
}

// renders a question; opts: {sel, order, graded, hint, bm}
function qHTML(q, o) {
  const multi = q.choose > 1;
  const status = multi
    ? `<span class="sel-status ${o.sel.length === q.choose ? 'full' : ''}">${o.sel.length}/${q.choose} 선택됨</span>`
    : '';
  const chips = `<span class="chip">${modName(q.module)}</span>`
    + `<span class="chip ${q.difficulty === 'advanced' ? 'adv' : ''}">${q.difficulty === 'advanced' ? '자격증 응용' : '지식 확인'}</span>`
    + (multi ? `<span class="chip multi">답 ${q.choose}개 고르기</span>` : '')
    + (q.waf ? '<span class="chip waf">Well-Architected</span>' : '')
    + (q.official ? '<span class="chip ok">공식 지식 확인</span>' : '');
  const optsHTML = o.order.map((orig, k) => {
    const sel = o.sel.includes(orig);
    let cls = `opt ${multi ? 'check' : 'radio'}${sel ? ' sel' : ''}`;
    if (o.graded) cls += ' graded' + (q.answer.includes(orig) ? ' correct' : sel ? ' wrong' : '');
    const mark = o.graded ? (q.answer.includes(orig) ? '✓' : sel ? '✗' : L[k]) : L[k];
    const bmOn = (S.optBm[q.id] || []).includes(orig);
    return `<li class="${cls}" data-opt="${orig}"><span class="box">${mark}</span><span class="txt">${esc(q.options[orig])}`
      + (o.graded ? `<span class="note">${esc(q.optionNotes[orig] || '')}</span>` : '')
      + `</span>${o.bm ? `<button class="bm ${bmOn ? 'on' : ''}" data-bm="${orig}" title="헷갈리는 보기 북마크">${bmOn ? '🔖' : '🏷️'}</button>` : ''}</li>`;
  }).join('');
  const verdict = o.graded
    ? `<div class="verdict ${isRight(q, o.sel) ? 'ok' : 'bad'}">${isRight(q, o.sel) ? '정답입니다!' + (S.wrong[q.id] ? ' ✅ 오답 노트에서 정답 처리됨 (기록은 남아 있음)' : '') :'오답입니다. 정답: ' + q.answer.map(a => L[o.order.indexOf(a)]).sort().join(', ')}</div>
       <div class="explain"><b>해설</b><br>${esc(q.explanation)}</div>
       ${diagFor(q) ? figHTML(diagFor(q), !o.compact) : ''}
       <p class="muted" style="font-size:13px">출처: ${esc(q.source || '')}</p>`
    : '';
  return `<div class="q ${o.hint ? 'hint-on' : ''}">
    <div class="q-head"><div>${chips}</div>${status}</div>
    <div class="stem">
      ${q.scenario ? `<p><span class="lab">상황</span>${highlight(q.scenario, q.keywords || [])}</p>` : ''}
      ${q.requirement ? `<p><span class="lab">요구사항</span>${highlight(q.requirement, q.keywords || [])}</p>` : ''}
      <p class="ask">${highlight(q.question, q.keywords || [])}</p>
    </div>
    <ul class="opts">${optsHTML}</ul>${verdict}</div>`;
}

// ---------- router ----------
let view = location.hash.slice(1) || 'home';
let timerId = null;
function go(v) { view = v; location.hash = v; render(); }
window.addEventListener('hashchange', () => { const v = location.hash.slice(1) || 'home'; if (v !== view) { view = v; render(); } });
document.getElementById('tabs').addEventListener('click', e => { const v = e.target.dataset.view; if (v) go(v); });

function render() {
  clearInterval(timerId);
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.view === view));
  ({ home: renderHome, summary: renderSummary, mock: renderMock, study: renderStudy, diagrams: renderDiagrams, cards: renderCards, notes: renderNotes }[view] || renderHome)();
}

// ---------- key-takeaway summary ----------
let SUMMOD = '1';
function renderSummary() {
  const s = (window.SUMMARY || []).find(x => String(x.module) === SUMMOD);
  $app.innerHTML = `<h2>모듈 핵심 요약</h2>
    <div class="panel filters"><div><label>모듈</label>${seg('smod', MODS.map(m => [String(m), 'M' + m]), SUMMOD)}</div></div>
    ${s ? `<div class="panel"><h3 style="margin-top:0">${esc(modName(s.module))}</h3>
      ${s.sections.map(([h, items]) => `<div class="sum-sec"><h4>${esc(h)}</h4><ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`).join('')}
      <div class="traps"><b>⚠️ 시험 함정 포인트</b><ul>${s.traps.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>
      <div class="row" style="margin-top:14px"><button class="btn primary" id="sumstudy">이 모듈 문제 풀기 (${QS.filter(q => String(q.module) === SUMMOD).length})</button></div></div>
      ${DG.filter(d => String(d.module) === SUMMOD).map(d => `<div class="panel">${figHTML(d)}</div>`).join('')}` : ''}`;
  $app.querySelector('[data-seg]').onclick = e => { const v = e.target.dataset.v; if (v !== undefined) { SUMMOD = v; renderSummary(); } };
  const b = document.getElementById('sumstudy');
  if (b) b.onclick = () => { Object.assign(ST, { mods: [+SUMMOD], diff: 'all', type: 'all', built: true }); buildStudy(); go('study'); };
}

// ---------- concept diagrams ----------
let DGMOD = 'all';
function renderDiagrams() {
  const list = DG.filter(d => DGMOD === 'all' || String(d.module) === DGMOD);
  $app.innerHTML = `<h2>개념 도해</h2>
    <div class="panel filters"><div><label>모듈</label>${seg('dmod', [['all', '전체'], ...MODS.filter(m => DG.some(d => d.module === m)).map(m => [String(m), 'M' + m])], DGMOD)}</div></div>
    ${list.map(d => `<div class="panel"><div class="row spread"><h3 style="margin:0">${esc(d.title)}</h3><span class="chip">${esc(modName(d.module))}</span></div>
      <div class="fig-wrap" style="margin-top:10px">${d.svg}</div><p class="cap muted" style="font-size:14px">${esc(d.caption)}</p></div>`).join('')}`;
  $app.querySelector('[data-seg]').onclick = e => { const v = e.target.dataset.v; if (v !== undefined) { DGMOD = v; renderDiagrams(); } };
}

// ---------- home ----------
function moduleAcc() {
  const r = {};
  for (const m of MODS) r[m] = { a: 0, c: 0, n: 0 };
  for (const q of QS) { const st = S.stats[q.id]; r[q.module].n++; if (st) { r[q.module].a += st.a; r[q.module].c += st.c; } }
  return r;
}
function renderHome() {
  const solved = QS.filter(q => S.stats[q.id]).length;
  const tot = Object.values(S.stats).reduce((s, x) => ({ a: s.a + x.a, c: s.c + x.c }), { a: 0, c: 0 });
  const days = Math.ceil((EXAM - new Date()) / 86400000);
  const last = S.history[S.history.length - 1];
  const ma = moduleAcc();
  const cnt = k => QS.filter(k).length;
  const upd = UPDATES.map(u => {
    const qs = QS.filter(q => q.batch === u.batch), done = qs.filter(q => S.stats[q.id]).length;
    return `<div class="update ${S.seenUpdates[u.batch] ? '' : 'unseen'}">
      <div class="row spread"><b>${S.seenUpdates[u.batch] ? '' : '<span class="chip bad">NEW</span>'}${esc(u.title)}</b><span class="muted">${u.date}</span></div>
      <p class="muted" style="margin:4px 0 8px">${esc(u.desc)}</p>
      <div class="row"><div class="bar" style="flex:1;min-width:120px"><i style="width:${pct(done, qs.length)}%"></i></div><span class="muted">${done}/${qs.length} 풀이</span>
      <button class="btn primary sm" data-upd="${u.batch}">${done ? '새 문제 이어 풀기' : '새 문제만 풀기'}</button></div></div>`;
  }).join('');
  $app.innerHTML = `
    <h2>대시보드</h2>
    ${upd ? `<div class="panel"><h3 style="margin-top:0">🆕 업데이트 — 기존 문제를 다 푼 분은 여기서 새 문제만 풀 수 있어요</h3>${upd}
      <p class="muted" style="font-size:12px;margin:8px 0 0">풀이 기록·오답 노트·모의고사 점수는 이 브라우저에 그대로 유지됩니다.</p></div>` : ''}
    <div class="grid">
      <div class="stat"><small>시험까지</small><b>${days > 0 ? 'D-' + days : days === 0 ? 'D-DAY' : '종료'}</b><small>10/30(금) 오전 9시</small></div>
      <div class="stat"><small>문제 은행</small><b>${QS.length}문항</b><small>지식 확인 ${cnt(q => q.difficulty === 'basic')} · 응용 ${cnt(q => q.difficulty === 'advanced')} · 복수정답 ${cnt(q => q.choose > 1)}</small></div>
      <div class="stat"><small>푼 문제 / 정답률</small><b>${solved} · ${pct(tot.c, tot.a)}%</b><small>총 ${tot.a}회 시도</small></div>
      <div class="stat"><small>최근 모의고사</small><b>${last ? last.correct + '/' + last.total : '-'}</b><small>${last ? fmt(last.sec) + ' 소요' : '아직 응시 기록 없음'}</small></div>
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="row spread"><h3 style="margin:0">바로 시작</h3></div>
      <div class="row" style="margin-top:10px">
        <button class="btn primary" data-go="mock">실전 모의고사 25문항</button>
        <button class="btn" data-go="study">집중 학습</button>
        <button class="btn" data-go="cards">암기 카드</button>
        <button class="btn" data-go="notes">오답 노트 (${Object.keys(S.wrong).length})</button>
      </div>
    </div>
    <div class="panel"><h3 style="margin-top:0">모듈별 정답률</h3>
      <table>${MODS.map(m => `<tr><td style="width:46%">${esc(modName(m))}</td><td class="muted">${ma[m].n}문항</td>
        <td style="width:34%"><div class="bar"><i style="width:${pct(ma[m].c, ma[m].a)}%"></i></div></td><td>${ma[m].a ? pct(ma[m].c, ma[m].a) + '%' : '-'}</td></tr>`).join('')}</table>
    </div>
    ${S.history.length ? `<div class="panel"><h3 style="margin-top:0">모의고사 기록</h3><table><tr><th>일시</th><th>점수</th><th>지식 확인</th><th>응용</th><th>소요</th></tr>
      ${S.history.slice().reverse().map(h => `<tr><td>${new Date(h.date).toLocaleString('ko-KR')}</td><td><b>${h.correct}/${h.total}</b> (${pct(h.correct, h.total)}%)</td>
      <td>${h.basic[0]}/${h.basic[1]}</td><td>${h.adv[0]}/${h.adv[1]}</td><td>${fmt(h.sec)}</td></tr>`).join('')}</table></div>` : ''}
    <div class="panel"><h3 style="margin-top:0">시험 범위 모듈 요약</h3>
      ${QB.briefs.map(b => `<p><b>${b.modules.map(m => esc(modName(m))).join(' / ')}</b><br><span class="muted">${esc(b.text)}</span></p>`).join('')}
    </div>`;
  $app.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
  $app.querySelectorAll('[data-upd]').forEach(b => b.onclick = () => {
    const batch = b.dataset.upd;
    S.seenUpdates[batch] = true; save();
    // unsolved questions of this batch first, then the rest of the batch
    Object.assign(ST, { mods: [], diff: 'all', type: batch, built: true }); buildStudy();
    ST.list.sort((a, b) => !!S.stats[a] - !!S.stats[b]); loadStudyQ();
    go('study');
  });
}

// ---------- mock exam ----------
function newMock() {
  const basic = shuffle(QS.filter(q => q.difficulty === 'basic'));
  const adv = shuffle(QS.filter(q => q.difficulty === 'advanced'));
  let pick = [...basic.slice(0, MOCK_BASIC), ...adv.slice(0, MOCK_ADV)];
  // shortcut: if one pool is short, fill from the other so the exam still has 25
  const rest = [...basic.slice(MOCK_BASIC), ...adv.slice(MOCK_ADV)];
  while (pick.length < MOCK_BASIC + MOCK_ADV && rest.length) pick.push(rest.pop());
  pick = shuffle(pick);
  S.mock = { qids: pick.map(q => q.id), order: Object.fromEntries(pick.map(q => [q.id, perm(q)])), sel: {}, cur: 0, start: Date.now(), done: false };
  save();
}
const mockSec = () => Math.floor(((S.mock.end || Date.now()) - S.mock.start) / 1000);

function renderMock() {
  const M = S.mock;
  if (!M) {
    $app.innerHTML = `<h2>실전 중간고사 시뮬레이터</h2><div class="panel">
      <p>실제 시험과 같은 <b>25문항</b>(지식 확인 수준 ${MOCK_BASIC} + 자격증 응용 ${MOCK_ADV})을 무작위로 출제합니다.</p>
      <ul class="muted"><li>시간 제한은 없고 경과 시간이 표시됩니다 (목표 60분 이내).</li>
      <li>'답 N개 고르기' 문항은 정확히 N개를 선택해야 다음으로 넘어갑니다.</li>
      <li>새로고침해도 진행 상황이 유지됩니다.</li></ul>
      <button class="btn primary" id="start">모의고사 시작</button></div>`;
    document.getElementById('start').onclick = () => { newMock(); renderMock(); };
    return;
  }
  if (M.done) return renderMockResult();
  const q = BY_ID[M.qids[M.cur]];
  const sel = M.sel[q.id] || [];
  const answered = M.qids.filter(id => (M.sel[id] || []).length === BY_ID[id].choose).length;
  $app.innerHTML = `
    <div class="row spread"><h2 style="margin:0">모의고사 ${M.cur + 1} / ${M.qids.length}</h2>
      <div class="row"><span class="timer" id="timer"></span><button class="btn sm" id="quit">포기</button></div></div>
    <div class="bar" style="margin:10px 0 14px"><i style="width:${pct(answered, M.qids.length)}%"></i></div>
    <div class="panel">${qHTML(q, { sel, order: M.order[q.id], graded: false })}
      <p class="muted" id="warn" style="min-height:1.4em;margin:0"></p>
      <div class="row spread">
        <button class="btn" id="prev" ${M.cur ? '' : 'disabled'}>← 이전</button>
        ${M.cur < M.qids.length - 1
          ? `<button class="btn primary" id="next" ${sel.length === q.choose ? '' : 'disabled'}>다음 →</button>`
          : `<button class="btn primary" id="submit">제출하기</button>`}
      </div></div>
    <div class="panel"><div class="row spread"><b>문항 이동</b><span class="muted">${answered}/${M.qids.length} 완료</span></div>
      <div class="palette" style="margin-top:8px">${M.qids.map((id, i) => `<button data-jump="${i}" class="${(M.sel[id] || []).length === BY_ID[id].choose ? 'done' : ''} ${i === M.cur ? 'cur' : ''}">${i + 1}</button>`).join('')}</div>
      ${M.cur < M.qids.length - 1 ? '<div style="margin-top:12px"><button class="btn sm" id="submit">지금 제출</button></div>' : ''}</div>`;
  const tick = () => { const t = document.getElementById('timer'); if (t) { const s = mockSec(); t.textContent = '⏱ ' + fmt(s); t.classList.toggle('over', s > 3600); } };
  tick(); timerId = setInterval(tick, 1000);
  $app.querySelectorAll('.opt').forEach(li => li.onclick = () => mockPick(+li.dataset.opt));
  $app.querySelectorAll('[data-jump]').forEach(b => b.onclick = () => { M.cur = +b.dataset.jump; save(); renderMock(); });
  document.getElementById('prev').onclick = () => mockMove(-1);
  const nx = document.getElementById('next'); if (nx) nx.onclick = () => mockMove(1);
  $app.querySelectorAll('#submit').forEach(b => b.onclick = mockSubmit);
  document.getElementById('quit').onclick = () => { if (confirm('모의고사를 포기할까요? 기록되지 않습니다.')) { S.mock = null; save(); renderMock(); } };
}
function mockPick(orig) {
  const M = S.mock, q = BY_ID[M.qids[M.cur]];
  const before = M.sel[q.id] || [];
  M.sel[q.id] = toggle(q, before, orig);
  save(); renderMock();
  if (M.sel[q.id] === before && q.choose > 1) document.getElementById('warn').textContent = `이미 ${q.choose}개를 선택했습니다. 다른 보기를 해제한 뒤 선택하세요.`;
}
function mockMove(d) {
  const M = S.mock, q = BY_ID[M.qids[M.cur]];
  if (d > 0 && (M.sel[q.id] || []).length !== q.choose) {
    document.getElementById('warn').textContent = `이 문항은 답 ${q.choose}개를 골라야 합니다. (${(M.sel[q.id] || []).length}/${q.choose} 선택됨)`;
    return;
  }
  const n = M.cur + d;
  if (n < 0 || n >= M.qids.length) return;
  M.cur = n; save(); renderMock();
}
function mockSubmit() {
  const M = S.mock;
  const left = M.qids.filter(id => (M.sel[id] || []).length !== BY_ID[id].choose).length;
  if (!confirm(left ? `미완료 문항이 ${left}개 있습니다. 그래도 제출할까요?` : '제출할까요?')) return;
  M.end = Date.now(); M.done = true;
  const r = { date: M.end, sec: mockSec(), correct: 0, total: M.qids.length, basic: [0, 0], adv: [0, 0], mod: {} };
  for (const id of M.qids) {
    const q = BY_ID[id], ok = record(q, M.sel[id] || []);
    const d = q.difficulty === 'basic' ? r.basic : r.adv;
    d[1]++; if (ok) { d[0]++; r.correct++; }
    const m = r.mod[q.module] || (r.mod[q.module] = [0, 0]); m[1]++; if (ok) m[0]++;
  }
  M.result = r; S.history.push(r); save(); renderMock();
}
function renderMockResult() {
  const M = S.mock, r = M.result;
  const mods = Object.entries(r.mod).sort((a, b) => a[1][0] / a[1][1] - b[1][0] / b[1][1]);
  $app.innerHTML = `<h2>모의고사 결과 리포트</h2>
    <div class="grid">
      <div class="stat"><small>총점</small><b>${r.correct} / ${r.total}</b><small>${pct(r.correct, r.total)}점 (100점 환산)</small></div>
      <div class="stat"><small>지식 확인 정답률</small><b>${pct(...r.basic)}%</b><small>${r.basic[0]}/${r.basic[1]}</small></div>
      <div class="stat"><small>자격증 응용 정답률</small><b>${pct(...r.adv)}%</b><small>${r.adv[0]}/${r.adv[1]}</small></div>
      <div class="stat"><small>소요 시간</small><b>${fmt(r.sec)}</b><small>${r.sec <= 3600 ? '목표 1시간 이내 달성 ✅' : '목표 1시간 초과 ⚠️'}</small></div>
    </div>
    <div class="panel" style="margin-top:14px"><h3 style="margin-top:0">모듈별 분석 (취약 순)</h3><table>
      ${mods.map(([m, [c, t]]) => `<tr><td>${esc(modName(m))}</td><td>${c}/${t}</td><td class="${pct(c, t) < 60 ? 'weak' : ''}">${pct(c, t)}%${pct(c, t) < 60 ? ' · 취약' : ''}</td></tr>`).join('')}
    </table><div class="row" style="margin-top:12px"><button class="btn primary" id="again">새 모의고사</button><button class="btn" id="tonotes">오답 노트로</button></div></div>
    <h3>문항별 해설</h3>
    ${M.qids.map((id, i) => `<div class="panel" data-qid="${id}"><b>${i + 1}번</b>${qHTML(BY_ID[id], { sel: M.sel[id] || [], order: M.order[id], graded: true, hint: true, bm: true, compact: true })}</div>`).join('')}`;
  document.getElementById('again').onclick = () => { newMock(); renderMock(); window.scrollTo(0, 0); };
  document.getElementById('tonotes').onclick = () => go('notes');
  bindBookmarks(() => renderMockResult());
}

function bindBookmarks(rerender) {
  $app.querySelectorAll('[data-bm]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const realId = b.closest('[data-qid]').dataset.qid;
    const orig = +b.dataset.bm;
    const arr = S.optBm[realId] || [];
    S.optBm[realId] = arr.includes(orig) ? arr.filter(x => x !== orig) : [...arr, orig];
    if (!S.optBm[realId].length) delete S.optBm[realId];
    save(); const y = window.scrollY; rerender(); window.scrollTo(0, y);
  });
}

// ---------- study ----------
const ST = { mods: [], diff: 'all', type: 'all', list: [], i: 0, sel: [], order: [], graded: false, hint: false, shuffle: true };
function buildStudy() {
  ST.list = QS.filter(q =>
    (!ST.mods.length || ST.mods.includes(q.module)) &&
    (ST.diff === 'all' || q.difficulty === ST.diff) &&
    ({ all: true, multi: q.choose > 1, waf: !!q.waf, star: !!S.star[q.id], wrong: !!S.wrong[q.id], open: !!S.wrong[q.id] && !fixed(q.id), new: !S.stats[q.id], official: !!q.official }[ST.type] ?? (q.batch === ST.type))
  ).map(q => q.id);
  if (ST.shuffle) ST.list = shuffle(ST.list);
  ST.i = 0; loadStudyQ();
}
function loadStudyQ() { const q = BY_ID[ST.list[ST.i]]; ST.sel = []; ST.graded = false; ST.order = q ? perm(q) : []; }
function seg(name, items, cur) {
  return `<span class="seg" data-seg="${name}">${items.map(([v, t]) => `<button data-v="${v}" class="${(Array.isArray(cur) ? cur.includes(v) : cur === v) ? 'on' : ''}">${t}</button>`).join('')}</span>`;
}
function renderStudy() {
  if (!ST.list.length && !ST.built) { ST.built = true; buildStudy(); }
  const q = BY_ID[ST.list[ST.i]];
  $app.innerHTML = `<h2>집중 학습</h2>
    <div class="panel filters">
      <div><label>모듈</label>${seg('mods', [['', '전체'], ...MODS.map(m => [m, 'M' + m])], ST.mods.length ? ST.mods : [''])}</div>
      <div><label>난이도</label>${seg('diff', [['all', '전체'], ['basic', '지식 확인'], ['advanced', '자격증 응용']], ST.diff)}</div>
      <div><label>유형</label>${seg('type', [['all', '전체'], ['multi', '답 2·3개 고르기'], ['waf', 'Well-Architected'], ['new', '안 푼 문제'], ['wrong', '오답 전체'], ['open', '오답(미해결)'], ['star', '★ 북마크'], ['official', '공식 지식 확인'], ...UPDATES.map(u => [u.batch, '🆕 ' + u.date + ' 추가'])], ST.type)}</div>
      <div class="row"><label style="margin:0">순서</label>${seg('shuffle', [['1', '랜덤'], ['0', '순서대로']], ST.shuffle ? '1' : '0')}<span class="muted" style="margin-left:auto">${ST.list.length}문항</span></div>
    </div>
    ${q ? `<div class="panel" data-qid="${q.id}">
      <div class="row spread" style="margin-bottom:8px"><b>${ST.i + 1} / ${ST.list.length}</b>
        <div class="row"><button class="btn sm" id="hint">${ST.hint ? '🖍 힌트 끄기' : '🖍 핵심 힌트 하이라이트'}</button>
        <button class="btn sm" id="star">${S.star[q.id] ? '★ 북마크됨' : '☆ 북마크'}</button></div></div>
      ${qHTML(q, { sel: ST.sel, order: ST.order, graded: ST.graded, hint: ST.hint, bm: ST.graded })}
      <div class="row spread">
        <button class="btn" id="prev" ${ST.i ? '' : 'disabled'}>← 이전</button>
        ${ST.graded ? `<button class="btn primary" id="next" ${ST.i < ST.list.length - 1 ? '' : 'disabled'}>다음 문제 →</button>`
          : `<button class="btn primary" id="grade" ${ST.sel.length === q.choose ? '' : 'disabled'}>채점하기</button>`}
      </div></div>` : `<div class="panel empty">조건에 맞는 문제가 없습니다.</div>`}`;
  $app.querySelectorAll('[data-seg]').forEach(s => s.onclick = e => {
    const v = e.target.dataset.v; if (v === undefined) return;
    const k = s.dataset.seg;
    if (k === 'mods') ST.mods = v === '' ? [] : ST.mods.includes(+v) ? ST.mods.filter(x => x !== +v) : [...ST.mods, +v];
    else if (k === 'shuffle') ST.shuffle = v === '1';
    else ST[k] = v;
    buildStudy(); renderStudy();
  });
  if (!q) return;
  $app.querySelectorAll('.opt').forEach(li => li.onclick = () => studyPick(+li.dataset.opt));
  document.getElementById('hint').onclick = () => { ST.hint = !ST.hint; renderStudy(); };
  document.getElementById('star').onclick = () => { if (S.star[q.id]) delete S.star[q.id]; else S.star[q.id] = 1; save(); renderStudy(); };
  document.getElementById('prev').onclick = () => studyMove(-1);
  const g = document.getElementById('grade'); if (g) g.onclick = studyGrade;
  const n = document.getElementById('next'); if (n) n.onclick = () => studyMove(1);
  bindBookmarks(renderStudy);
}
function studyPick(orig) { if (ST.graded) return; ST.sel = toggle(BY_ID[ST.list[ST.i]], ST.sel, orig); renderStudy(); }
function studyGrade() {
  const q = BY_ID[ST.list[ST.i]];
  if (ST.graded || ST.sel.length !== q.choose) return;
  record(q, ST.sel); ST.graded = true; save(); renderStudy();
}
function studyMove(d) { const n = ST.i + d; if (n < 0 || n >= ST.list.length) return; ST.i = n; loadStudyQ(); renderStudy(); window.scrollTo(0, 0); }

// ---------- flashcards ----------
const CD = { cat: 'all', mod: 'all', flip: false, list: false };
const cardList = () => QB.cards.filter(c => (CD.cat === 'all' || c.category === CD.cat) && (CD.mod === 'all' || String(c.module) === CD.mod))
  .sort((a, b) => (a.category === 'waf' ? 0 : 1) - (b.category === 'waf' ? 0 : 1));
function renderCards() {
  const cs = cardList();
  if (S.cardIdx >= cs.length) S.cardIdx = 0;
  const c = cs[S.cardIdx];
  $app.innerHTML = `<h2>핵심 요약 & Well-Architected 암기 카드</h2>
    <div class="panel filters">
      <div><label>분류</label>${seg('cat', [['all', '전체'], ['waf', 'Well-Architected 6대 기둥'], ['service', 'AWS 서비스'], ['concept', '개념']], CD.cat)}</div>
      <div><label>모듈</label>${seg('mod', [['all', '전체'], ...MODS.map(m => [String(m), 'M' + m])], CD.mod)}</div>
      <div>${seg('list', [['0', '플래시카드'], ['1', '한눈에 보기 (치트시트)']], CD.list ? '1' : '0')}</div>
    </div>
    ${!cs.length ? '<div class="panel empty">카드가 없습니다.</div>' : CD.list
      ? DG.filter(d => (CD.mod === 'all' || String(d.module) === CD.mod) && (CD.cat !== 'waf' || d.id === 'waf')).map(d => figHTML(d, false)).join('')
        + `<div class="cheat">${cs.map(c => `<div><span class="chip ${c.category === 'waf' ? 'waf' : ''}">M${c.module}</span><b>${esc(c.front)}</b>${esc(c.back)}</div>`).join('')}</div>`
      : `<div class="flash ${CD.flip ? 'flip' : ''}" id="flash"><div class="in">
          <div class="face front">${esc(c.front)}</div><div class="face back">${esc(c.back)}</div></div></div>
        <div class="row spread"><button class="btn" id="cprev">← 이전</button>
          <span class="muted">${S.cardIdx + 1} / ${cs.length} · <kbd>Space</kbd> 뒤집기</span>
          <button class="btn" id="cnext">다음 →</button></div>`}`;
  $app.querySelectorAll('[data-seg]').forEach(s => s.onclick = e => {
    const v = e.target.dataset.v; if (v === undefined) return;
    if (s.dataset.seg === 'list') CD.list = v === '1'; else { CD[s.dataset.seg] = v; S.cardIdx = 0; }
    CD.flip = false; renderCards();
  });
  const f = document.getElementById('flash'); if (f) f.onclick = () => { CD.flip = !CD.flip; f.classList.toggle('flip', CD.flip); };
  const p = document.getElementById('cprev'); if (p) p.onclick = () => cardMove(-1);
  const n = document.getElementById('cnext'); if (n) n.onclick = () => cardMove(1);
}
function cardMove(d) { const n = cardList().length; if (!n) return; S.cardIdx = (S.cardIdx + d + n) % n; CD.flip = false; save(); renderCards(); }

// ---------- wrong-answer notes ----------
function renderNotes() {
  const wrong = Object.entries(S.wrong).filter(([id]) => BY_ID[id]).sort((a, b) => b[1] - a[1]);
  const bms = Object.keys(S.optBm).filter(id => BY_ID[id]);
  const stars = Object.keys(S.star).filter(id => BY_ID[id]);
  const item = (id, extra) => { const q = BY_ID[id]; return `<tr><td><span class="chip">M${q.module}</span>${q.difficulty === 'advanced' ? '<span class="chip adv">응용</span>' : ''}</td>
    <td>${esc(q.question)}${extra || ''}</td><td style="white-space:nowrap"><button class="btn sm" data-solve="${id}">풀기</button></td></tr>`; };
  const open = wrong.filter(([id]) => !fixed(id)).length;
  $app.innerHTML = `<h2>오답 노트</h2>
    <div class="panel"><div class="row spread"><h3 style="margin:0">틀린 문제 (${wrong.length}) · 미해결 ${open} · 정답 처리 ${wrong.length - open}</h3>
      <div class="row"><button class="btn primary sm" id="redoOpen" ${open ? '' : 'disabled'}>미해결 오답 다시 풀기</button>
      <button class="btn sm" id="redo" ${wrong.length ? '' : 'disabled'}>오답 전체 다시 풀기</button>
      <button class="btn sm" id="clearw" ${wrong.length ? '' : 'disabled'}>오답 노트 비우기</button></div></div>
      ${wrong.length ? `<table>${wrong.map(([id, n]) => item(id, ` ${fixed(id) ? '<span class="chip ok">✅ 정답 처리</span>' : '<span class="chip bad">❌ 미해결</span>'}<span class="muted">(${n}회 틀림)</span> <button class="btn sm" data-del="${id}">제거</button>`)).join('')}</table>` : '<p class="empty">아직 틀린 문제가 없습니다.</p>'}</div>
    <div class="panel"><h3 style="margin-top:0">🔖 헷갈리는 보기 북마크 (${bms.length})</h3>
      ${bms.length ? `<table>${bms.map(id => item(id, `<br><span class="muted">${S.optBm[id].map(o => '· ' + esc(BY_ID[id].options[o]) + (BY_ID[id].answer.includes(o) ? ' <b style="color:var(--ok)">(정답)</b>' : ' <b style="color:var(--bad)">(오답)</b>')).join('<br>')}</span>`)).join('')}</table>`
        : '<p class="empty">채점 후 보기 옆 🏷️ 버튼으로 헷갈리는 보기를 저장하세요.</p>'}</div>
    <div class="panel"><h3 style="margin-top:0">★ 북마크한 문제 (${stars.length})</h3>
      ${stars.length ? `<table>${stars.map(id => item(id)).join('')}</table>` : '<p class="empty">집중 학습에서 ☆ 버튼으로 문제를 저장하세요.</p>'}</div>
    <div class="panel"><button class="btn sm" id="reset">전체 학습 기록 초기화</button></div>`;
  const solve = ids => { Object.assign(ST, { mods: [], diff: 'all', type: 'all', built: true }); ST.list = ids; ST.i = 0; loadStudyQ(); go('study'); };
  $app.querySelectorAll('[data-solve]').forEach(b => b.onclick = () => solve([b.dataset.solve]));
  $app.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { delete S.wrong[b.dataset.del]; save(); renderNotes(); });
  const redo = type => { Object.assign(ST, { mods: [], diff: 'all', type, built: true }); buildStudy(); go('study'); };
  document.getElementById('redo').onclick = () => redo('wrong');
  document.getElementById('redoOpen').onclick = () => redo('open');
  document.getElementById('clearw').onclick = () => { if (confirm('오답 노트를 비울까요?')) { S.wrong = {}; save(); renderNotes(); } };
  document.getElementById('reset').onclick = () => { if (confirm('풀이 기록, 오답 노트, 북마크, 모의고사 기록이 모두 삭제됩니다.')) { S = blank(); save(); renderNotes(); } };
}

// ---------- keyboard ----------
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  const k = e.key, digit = /^[1-6]$/.test(k) ? +k - 1 : -1;
  const go1 = k === 'Enter' || k === ' ';
  if (view === 'mock' && S.mock && !S.mock.done) {
    const q = BY_ID[S.mock.qids[S.mock.cur]];
    if (digit >= 0 && digit < q.options.length) mockPick(S.mock.order[q.id][digit]);
    else if (go1 || k === 'ArrowRight') { e.preventDefault(); mockMove(1); }
    else if (k === 'ArrowLeft') mockMove(-1);
  } else if (view === 'study' && ST.list.length) {
    const q = BY_ID[ST.list[ST.i]];
    if (digit >= 0 && digit < q.options.length) studyPick(ST.order[digit]);
    else if (go1) { e.preventDefault(); ST.graded ? studyMove(1) : studyGrade(); }
    else if (k === 'ArrowRight') studyMove(1);
    else if (k === 'ArrowLeft') studyMove(-1);
    else if (k === 'h' || k === 'H') { ST.hint = !ST.hint; renderStudy(); }
  } else if (view === 'cards' && !CD.list) {
    if (k === ' ' || k === 'Enter') { e.preventDefault(); document.getElementById('flash')?.click(); }
    else if (k === 'ArrowRight') cardMove(1);
    else if (k === 'ArrowLeft') cardMove(-1);
  }
});

render();
