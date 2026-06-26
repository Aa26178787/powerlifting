# UI 가독성 디자인 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 의존성 없는 순수 CSS 디자인 시스템으로 앱 전체를 카드 기반·고가독으로 재설계한다(엔진·기능 무변경).

**Architecture:** 단일 `src/ui/styles.css`에 CSS 변수 토큰 + 섹션별 컴포넌트 스타일. JSX는 가독성에 구조가 필요한 3곳만 변경(루틴 세트 표, 배지 data-attr, 위저드 stepper). 표현 계층만 — store/엔진 불변.

**Tech Stack:** React + plain CSS(빌드: Vite), Vitest(jsdom 컴포넌트 테스트).

## Global Constraints

- 엔진(`src/engine/`) 불변. 무게 표시 `toDisplay`/`unitLabel`, i18n 라벨 유지.
- 단일 `styles.css`(main.jsx import). CSS 변수 토큰 + 섹션 주석.
- 접근성: 대비 WCAG AA, `:focus-visible` 링, 터치 타깃 ≥40px. 다크모드 범위 밖.
- 컴포넌트 테스트 첫 줄 `// @vitest-environment jsdom`. JSX 구조 변경분 테스트 갱신(핵심 데이터 텍스트 유지).
- **CSS-only 태스크는 단위 테스트 없음** — 검증 = `npm run build` 성공 + 시각 확인. JSX 태스크는 jsdom 테스트 + build.
- **실제 렌더러 검증 필수**(Task 6): 빌드+브라우저로 직접 보고 수정. 정적 통과로 완료 판정 금지.
- 명령은 저장소 루트. 테스트 `npx vitest run`, 빌드 `npm run build`.

---

### Task 1: 디자인 토큰 + base

**Files:**
- Modify: `src/ui/styles.css` (상단에 토큰+base 추가, 기존 규칙은 후속 태스크에서 대체 — 지금은 토큰/base만 prepend)

**Interfaces:**
- Produces: CSS 변수(`--bg --surface --text --text-muted --border --accent --accent-weak`, 시맨틱 `--deload* --warn* --ok`, 자질 `--q-strength --q-power --q-hypertrophy --q-endurance`, 간격 `--s1..--s6`, radius `--r1..--r3`, `--shadow`, 폰트 `--f0..--f5`) + base 리셋/타이포.

- [ ] **Step 1: 토큰 + base 작성**

`src/ui/styles.css` 맨 위에 추가(기존 첫 줄 `:root { font-family... }`는 이 블록으로 흡수):

```css
:root {
  --bg:#f6f7f9; --surface:#ffffff; --text:#1c2330; --text-muted:#5b6573;
  --border:#e3e7ee; --accent:#2f6df0; --accent-weak:#eaf1fe;
  --deload:#fff6e5; --deload-line:#f0c976; --warn:#c0392b; --warn-weak:#fdecea; --ok:#1e8e5a;
  --q-strength:#2f6df0; --q-power:#7b5cff; --q-hypertrophy:#1e9e6a; --q-endurance:#e08a1e;
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px;
  --r1:6px; --r2:10px; --r3:14px;
  --shadow:0 1px 3px rgba(20,30,50,.08), 0 1px 2px rgba(20,30,50,.06);
  --f0:.8rem; --f1:.9rem; --f2:1rem; --f3:1.15rem; --f4:1.4rem; --f5:1.9rem;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  line-height: 1.5; color: var(--text);
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font-size: var(--f2); }
h1 { font-size: var(--f5); margin: 0 0 var(--s2); }
h2 { font-size: var(--f4); margin: var(--s5) 0 var(--s3); }
h3 { font-size: var(--f3); margin: var(--s4) 0 var(--s2); }
h4 { font-size: var(--f2); margin: var(--s3) 0 var(--s2); }
h5 { font-size: var(--f1); margin: var(--s2) 0 var(--s1); color: var(--text-muted); }
a { color: var(--accent); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
table, .num, .set-table td { font-variant-numeric: tabular-nums; }
```

- [ ] **Step 2: 빌드 검증**

Run: `npm run build`
Expected: 성공(CSS 파싱 에러 없음).

Run: `npx vitest run`
Expected: 전체 green(스타일 변경은 텍스트 단언 무영향).

- [ ] **Step 3: Commit**

```bash
git add src/ui/styles.css
git commit -m "feat(ui): design tokens + base typography"
```

---

### Task 2: 루틴 출력 카드 + 세트 표 (RoutineView)

**Files:**
- Modify: `src/ui/components/RoutineView.jsx` (set list → table, 배지)
- Modify: `src/ui/styles.css` (출력 카드 섹션)
- Test: `src/ui/components/RoutineView.test.jsx` (구조 갱신)

**Interfaces:**
- Consumes: 토큰(Task 1).
- Produces: `set-table` 표 구조, `.badge[data-quality]`/`.badge.scheme`/`.tag.evidence`, 세션/운동 카드 클래스.

- [ ] **Step 1: 테스트 갱신 (RED 대비)**

`src/ui/components/RoutineView.test.jsx`에서 set-line 단언을 표 구조로 교체. 기존:
```js
  it('renders set reps in the per-set list', () => {
    render(<RoutineView plan={plan} />)
    expect(screen.getAllByText(/1세트:/).length).toBeGreaterThan(0)
  })
```
교체:
```js
  it('renders a set table with the set number and weight cells', () => {
    render(<RoutineView plan={plan} />)
    // set table headers present
    expect(screen.getAllByText(/무게/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/반복/).length).toBeGreaterThan(0)
    // first set weight rendered in a cell
    expect(screen.getByText(/162\.5/)).toBeInTheDocument()
  })
  it('tags exercise quality with a data-quality badge', () => {
    const { container } = render(<RoutineView plan={plan} />)
    expect(container.querySelector('[data-quality="strength"]')).toBeTruthy()
  })
```
(다른 기존 단언 — 162.5, 탑세트/스트레이트, 근력, 3-1-1초, 체감, omitted, 디로드, DUP, 컨디션 반영, 과피로 — 그대로 둠. 표/배지로 바뀌어도 텍스트는 렌더됨.)

- [ ] **Step 2: Run to verify the new assertions fail**

Run: `npx vitest run src/ui/components/RoutineView.test.jsx`
Expected: FAIL — 세트 표 헤더(무게/반복)·`data-quality` 아직 없음.

- [ ] **Step 3: RoutineView.jsx 구조 변경**

`ExerciseRow` 교체:
```jsx
function ExerciseRow({ ex, units }) {
  const scheme = ex.scheme
  return (
    <li className="exercise-row" data-quality={ex.quality}>
      <div className="ex-header">
        <span className="ex-lift">{liftLabel(ex.lift)}</span>
        <span className="badge q" data-quality={ex.quality}>{qualityLabel(ex.quality)}</span>
        {scheme && <span className="badge scheme">{schemeLabel(scheme.type)}</span>}
        {scheme && <span className="tag evidence">{evidenceLabel(scheme.evidenceTier)}</span>}
        <span className="ex-autoregulate">자동조절</span>
      </div>
      {ex.tempo && (
        <div className="ex-tempo">템포 {ex.tempo.join('-')}초 (하강-정지-상승){ex.tempoStop === 'knee' ? ' · 무릎까지' : ''}</div>
      )}
      {scheme && scheme.note && <div className="ex-scheme-note">{scheme.note}</div>}
      {scheme && scheme.sets && scheme.sets.length > 0 && (
        <div className="set-table-wrap">
          <table className="set-table">
            <thead><tr><th>세트</th><th>무게</th><th>반복</th><th>RPE</th><th>비고</th></tr></thead>
            <tbody>
              {scheme.sets.map((s, i) => (
                <tr key={i}>
                  <td>{i + 1}{s.label ? <span className="set-label"> {s.label}</span> : ''}</td>
                  <td className="num">{toDisplay(s.weight, units)}{unitLabel(units)}</td>
                  <td className="num">{s.reps}</td>
                  <td className="num">{s.rpe != null ? s.rpe : '—'}</td>
                  <td>{s.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  )
}
```

`AccessoryRow` 교체(무게 열 없이 반복/RPE/비고, 체감 캡션 유지):
```jsx
function AccessoryRow({ acc }) {
  const scheme = acc.scheme
  return (
    <li className="accessory-row" data-quality={acc.quality}>
      <div className="acc-header">
        <span className="acc-name">{liftLabel(acc.name)}</span>
        {acc.quality && <span className="badge q" data-quality={acc.quality}>{qualityLabel(acc.quality)}</span>}
        {scheme && <span className="badge scheme">{schemeLabel(scheme.type)}</span>}
        <span className="acc-feel">체감</span>
      </div>
      {scheme && scheme.note && <div className="acc-scheme-note">{scheme.note}</div>}
      {scheme && scheme.sets && scheme.sets.length > 0 && (
        <div className="set-table-wrap">
          <table className="set-table acc">
            <thead><tr><th>세트</th><th>반복</th><th>RPE</th><th>비고</th></tr></thead>
            <tbody>
              {scheme.sets.map((s, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td className="num">{s.reps}회</td>
                  <td className="num">{s.rpe != null ? s.rpe : '—'}</td>
                  <td>{s.note ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </li>
  )
}
```
(주의: 기존 보조 set-line의 `(체감)` 텍스트가 헤더 `체감` 배지로 이동 — 테스트 `/체감/`은 여전히 통과.)

- [ ] **Step 4: 출력 카드 CSS 추가**

`src/ui/styles.css`의 기존 `.week`/`.session`/`.exercise-row`/`.accessories` 규칙을 다음으로 교체/추가:
```css
.routine-view h2 { display:flex; align-items:baseline; gap:var(--s3); }
.week { background:transparent; border:none; padding:0; margin:var(--s5) 0; }
.week > h3 { display:inline-flex; align-items:center; gap:var(--s2); }
.week.deload > h3::after { content:"디로드"; font-size:var(--f0); background:var(--deload); border:1px solid var(--deload-line); color:#8a6d1f; padding:1px var(--s2); border-radius:999px; }
.session { background:var(--surface); border:1px solid var(--border); border-radius:var(--r2); box-shadow:var(--shadow); padding:var(--s4); margin:var(--s3) 0; }
.session > h4 { margin-top:0; }
.session ul { list-style:none; margin:0; padding:0; }
.exercise-row { border-left:3px solid var(--q-strength); padding:var(--s2) 0 var(--s3) var(--s3); margin:var(--s3) 0; }
.exercise-row[data-quality="power"] { border-left-color:var(--q-power); }
.exercise-row[data-quality="hypertrophy"] { border-left-color:var(--q-hypertrophy); }
.exercise-row[data-quality="endurance"] { border-left-color:var(--q-endurance); }
.ex-header, .acc-header { display:flex; flex-wrap:wrap; align-items:center; gap:var(--s2); }
.ex-lift { font-weight:600; font-size:var(--f2); }
.acc-name { font-weight:600; }
.badge { font-size:var(--f0); padding:1px var(--s2); border-radius:999px; background:var(--accent-weak); color:var(--accent); white-space:nowrap; }
.badge.q[data-quality="strength"] { background:#eaf1fe; color:var(--q-strength); }
.badge.q[data-quality="power"] { background:#f0ecff; color:var(--q-power); }
.badge.q[data-quality="hypertrophy"] { background:#e7f6ee; color:var(--q-hypertrophy); }
.badge.q[data-quality="endurance"] { background:#fdf1df; color:var(--q-endurance); }
.badge.scheme { background:#eef1f5; color:var(--text-muted); }
.tag.evidence { font-size:var(--f0); color:var(--text-muted); }
.ex-autoregulate, .acc-feel { font-size:var(--f0); color:var(--text-muted); }
.ex-tempo, .ex-scheme-note, .acc-scheme-note { font-size:var(--f1); color:var(--text-muted); margin:var(--s1) 0; }
.set-table-wrap { overflow-x:auto; margin-top:var(--s2); }
.set-table { border-collapse:collapse; width:100%; min-width:320px; font-size:var(--f1); }
.set-table th { text-align:left; color:var(--text-muted); font-weight:500; font-size:var(--f0); border-bottom:1px solid var(--border); padding:var(--s1) var(--s3) var(--s1) 0; }
.set-table td { padding:var(--s1) var(--s3) var(--s1) 0; border-bottom:1px solid #f0f2f5; }
.set-table td.num { text-align:right; padding-right:var(--s4); }
.set-label { font-size:var(--f0); color:var(--accent); }
.accessories { margin-top:var(--s3); padding-top:var(--s2); border-top:1px dashed var(--border); }
.accessories h5 { margin:0 0 var(--s1); }
.overreaching-banner { background:var(--warn-weak); color:var(--warn); border:1px solid #f3b4ad; border-radius:var(--r1); padding:var(--s2) var(--s3); margin:var(--s2) 0; }
.notes { color:var(--warn); font-size:var(--f1); }
.readiness-badge { display:inline-block; font-size:var(--f0); background:var(--accent-weak); color:var(--accent); padding:1px var(--s2); border-radius:999px; margin-left:var(--s2); }
```

- [ ] **Step 5: Run tests + build**

Run: `npx vitest run src/ui/components/RoutineView.test.jsx`
Expected: PASS.
Run: `npx vitest run` → 전체 green. Run: `npm run build` → 성공.

- [ ] **Step 6: Commit**

```bash
git add src/ui/components/RoutineView.jsx src/ui/components/RoutineView.test.jsx src/ui/styles.css
git commit -m "feat(ui): routine output as cards with aligned set table + badges"
```

---

### Task 3: 위저드 stepper + 폼 컨트롤

**Files:**
- Modify: `src/ui/wizard/Wizard.jsx` (stepper)
- Modify: `src/ui/styles.css` (위저드/폼 섹션)
- Test: `src/ui/wizard/Wizard.test.jsx` (stepper 단언 추가)

**Interfaces:**
- Consumes: 토큰(Task 1), `stepLabel`(i18n).
- Produces: `.stepper` 현재단계 표시(`aria-current`), 폼 컨트롤 스타일.

- [ ] **Step 1: 테스트 추가**

`src/ui/wizard/Wizard.test.jsx`에 추가(기존 import/describe 사용; 없으면 jsdom 헤더로 신규 it):
```js
it('renders a step indicator marking the current step', () => {
  render(<Wizard onComplete={() => {}} />)
  const current = document.querySelector('.stepper [aria-current="step"]')
  expect(current).toBeTruthy()
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npx vitest run src/ui/wizard/Wizard.test.jsx`
Expected: FAIL — `.stepper` 없음.

- [ ] **Step 3: Wizard.jsx stepper 추가**

`<div className="wizard">` 바로 안, `<h2>` 위에 추가:
```jsx
      <ol className="stepper">
        {Array.from({ length: last }, (_, i) => i + 1).map((n) => (
          <li key={n} className="stepper-item" aria-current={n === step ? 'step' : undefined}
              data-state={n < step ? 'done' : n === step ? 'current' : 'todo'}>
            <span className="stepper-dot">{n}</span>
            <span className="stepper-label">{stepLabel(n)}</span>
          </li>
        ))}
      </ol>
```

- [ ] **Step 4: 위저드/폼 CSS 추가**

`src/ui/styles.css`의 기존 `.input-form` 규칙을 다음으로 교체/추가:
```css
.wizard { background:var(--surface); border:1px solid var(--border); border-radius:var(--r3); box-shadow:var(--shadow); padding:var(--s5); }
.stepper { display:flex; flex-wrap:wrap; gap:var(--s2); list-style:none; margin:0 0 var(--s4); padding:0; }
.stepper-item { display:flex; align-items:center; gap:var(--s1); font-size:var(--f0); color:var(--text-muted); }
.stepper-dot { display:inline-grid; place-items:center; width:22px; height:22px; border-radius:999px; background:#eef1f5; color:var(--text-muted); font-size:var(--f0); }
.stepper-item[data-state="current"] { color:var(--text); font-weight:600; }
.stepper-item[data-state="current"] .stepper-dot { background:var(--accent); color:#fff; }
.stepper-item[data-state="done"] .stepper-dot { background:var(--accent-weak); color:var(--accent); }
.stepper-label { white-space:nowrap; }
.wizard label, .input-form label { display:block; margin:var(--s3) 0; font-size:var(--f1); }
.wizard fieldset, .input-form fieldset { border:1px solid var(--border); border-radius:var(--r2); padding:var(--s3); margin:var(--s3) 0; }
.wizard legend { font-weight:600; font-size:var(--f1); padding:0 var(--s1); }
.wizard input, .wizard select, .input-form input, .input-form select {
  font:inherit; padding:var(--s2) var(--s3); border:1px solid var(--border); border-radius:var(--r1);
  background:var(--surface); color:var(--text); min-height:40px; margin-left:var(--s2);
}
.wizard input[type="range"] { width:100%; margin-left:0; min-height:auto; padding:0; }
.wizard-nav { display:flex; justify-content:space-between; gap:var(--s2); margin-top:var(--s5); }
@media (max-width:560px){ .stepper-label { display:none; } }
```
(`@media (max-width:560px)`에서 라벨 숨겨 점만 — 모바일 stepper 압축.)

- [ ] **Step 5: Run tests + build**

Run: `npx vitest run src/ui/wizard/Wizard.test.jsx` → PASS. `npx vitest run` → green. `npm run build` → 성공.

- [ ] **Step 6: Commit**

```bash
git add src/ui/wizard/Wizard.jsx src/ui/wizard/Wizard.test.jsx src/ui/styles.css
git commit -m "feat(ui): wizard step indicator + styled form controls"
```

---

### Task 4: 버튼/배너/LimitsPanel/toolbar + App 헤더

**Files:**
- Modify: `src/App.jsx` (toolbar/헤더 className), `src/ui/components/LimitsPanel.jsx`(className), `src/ui/styles.css`
- (CheckinPanel/RpeLogger: className 추가가 필요하면 최소 적용)

**Interfaces:**
- Consumes: 토큰(Task 1).
- Produces: `.btn`/`.btn-secondary`, `.toolbar` 카드, `.limits-panel` 스타일.

- [ ] **Step 1: 버튼 클래스 적용 (JSX)**

`src/App.jsx` toolbar 버튼에 className:
```jsx
            <div className="toolbar">
              <button type="button" className="btn" onClick={downloadCsv}>CSV 다운로드</button>
              <button type="button" className="btn btn-secondary" onClick={() => window.print()}>인쇄</button>
              <button type="button" className="btn btn-secondary" onClick={restart}>처음부터</button>
            </div>
```
헤더에 부제 추가:
```jsx
      <header className="app-header">
        <h1>파워리프팅 루틴 생성기</h1>
        <p className="app-sub">근거 기반 개인화 루틴 · 무게는 RPE 자동조절 제안치</p>
      </header>
```
(기존 `<h1>` 한 줄을 위 header 블록으로 교체.)

`src/ui/wizard/Wizard.jsx`의 nav 버튼에도 `.btn` 적용:
```jsx
        <button type="button" className="btn btn-secondary" disabled={step === 1} onClick={...}>이전</button>
```
```jsx
          ? <button type="button" className="btn" disabled={!canNext} onClick={...}>다음</button>
          : <button type="button" className="btn" onClick={onComplete}>루틴 생성</button>}
```

- [ ] **Step 2: 컴포넌트/버튼 CSS 추가**

```css
.app { max-width:1100px; margin:0 auto; padding:var(--s4); }
.app-header { margin-bottom:var(--s4); }
.app-sub { color:var(--text-muted); font-size:var(--f1); margin:var(--s1) 0 0; }
.btn { font:inherit; cursor:pointer; border:1px solid var(--accent); background:var(--accent); color:#fff; padding:var(--s2) var(--s4); border-radius:var(--r1); min-height:40px; }
.btn:hover { filter:brightness(.96); }
.btn:disabled { opacity:.5; cursor:not-allowed; }
.btn-secondary { background:var(--surface); color:var(--accent); }
.toolbar { display:flex; flex-wrap:wrap; gap:var(--s2); margin:var(--s3) 0; }
.limits-panel { background:var(--surface); border:1px solid var(--border); border-radius:var(--r2); padding:var(--s2) var(--s3); margin:var(--s3) 0; font-size:var(--f1); }
.limits-panel summary { cursor:pointer; font-weight:600; color:var(--text); }
.limits-panel ul { margin:var(--s2) 0 0; padding-left:var(--s5); color:var(--text-muted); }
.limits-panel li { margin:var(--s1) 0; }
.checkin-panel, .rpe-logger { background:#fafbfc; border:1px solid var(--border); border-radius:var(--r1); padding:var(--s2) var(--s3); margin:var(--s2) 0; }
```
(`.checkin-panel`/`.rpe-logger` 클래스가 컴포넌트에 없으면, 해당 루트 요소에 className 추가 — 최소 변경. 동작·텍스트 무변경이라 기존 테스트 영향 없음.)

- [ ] **Step 3: Run tests + build**

Run: `npx vitest run` → 전체 green(className 추가는 텍스트 단언 무영향). `npm run build` → 성공.

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/ui/wizard/Wizard.jsx src/ui/components/LimitsPanel.jsx src/ui/styles.css
git commit -m "feat(ui): buttons, header, limits panel, toolbar styling"
```

---

### Task 5: 반응형 + 인쇄

**Files:**
- Modify: `src/ui/styles.css` (레이아웃/반응형/인쇄 섹션 정리)

**Interfaces:**
- Consumes: 토큰. Produces: 반응형 레이아웃 + 인쇄 규칙.

- [ ] **Step 1: 레이아웃/반응형/인쇄 CSS 교체**

기존 `.layout` / `@media print` / `@media (max-width:800px)` / `.exclude-*` / `.variation-control` 규칙을 다음으로 정리(중복 제거 후 통합):
```css
.layout { display:grid; grid-template-columns:1fr; gap:var(--s4); }
@media (min-width:860px){ .layout { grid-template-columns:360px 1fr; gap:var(--s5); } }
.exclude-variations .exclude-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:var(--s1) var(--s3); max-height:200px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--r1); padding:var(--s2); }
.exclude-variations .exclude-item { display:block; font-size:var(--f1); margin:0; }
.variation-control { margin:var(--s3) 0; padding-bottom:var(--s2); border-bottom:1px dashed var(--border); }
@media print {
  body { background:#fff; }
  .app-header .app-sub, .wizard, .input-form, .toolbar, .limits-panel, .stepper, .checkin-panel, .rpe-logger { display:none; }
  .session { box-shadow:none; border:1px solid #ccc; break-inside:avoid; }
  .week { break-inside:avoid; }
}
```

- [ ] **Step 2: Run + build**

Run: `npx vitest run` → green. `npm run build` → 성공.

- [ ] **Step 3: Commit**

```bash
git add src/ui/styles.css
git commit -m "feat(ui): responsive layout + print refinement"
```

---

### Task 6: 실제 렌더러 시각 검증 + 수정

**Files:**
- Modify: `src/ui/styles.css` / 관련 JSX (시각 확인 후 필요한 수정만)

**Interfaces:**
- Consumes: Task 1-5 산출. Produces: 시각 확인된 최종 UI.

- [ ] **Step 1: 빌드 + 앱 구동**

Run: `npm run build` → 성공. 앱을 실제 브라우저에서 띄움(`npm run dev` 또는 `npm run preview`; 헤드리스 스크린샷 가능 시 사용).

- [ ] **Step 2: 직접 관찰 (정적 점검 금지)**

다음을 실제 렌더에서 확인:
- 위저드 8단계: stepper 현재표시, 폼 컨트롤 정렬·터치 타깃, 슬라이더(자질), 요약.
- 루틴 출력: 세션 카드 간격/그림자, 운동 서브카드 자질색 accent, **세트 표 열 정렬**(무게 우정렬·tabular-nums), 배지 색·대비, 보조 표, 템포/노트/과피로 배너.
- 모바일 폭(≤560px): stepper 점만, 카드 스택, 세트 표 가로 스크롤, 버튼 터치.
- 인쇄 미리보기: 폼/toolbar/limits 숨김, 카드 페이지 분할.

- [ ] **Step 3: 관찰된 문제만 수정**

대비 부족·정렬 깨짐·여백 과소/과다·줄바꿈 등 **실제로 본 문제**를 `styles.css`/JSX에서 수정. 각 수정 후 재관찰. 추정으로 고치지 말 것.

- [ ] **Step 4: 회귀 확인 + Commit**

Run: `npx vitest run` → green. `npm run build` → 성공.
```bash
git add -A
git commit -m "fix(ui): visual verification adjustments"
```
(수정 없으면 이 태스크는 관찰 기록만 남기고 커밋 생략.)

---

## Self-Review

**Spec coverage:**
- 컴포넌트 A(토큰+base) → Task 1 ✓
- 컴포넌트 B(출력 카드·세트 표·배지) → Task 2 ✓
- 컴포넌트 C(stepper·폼) → Task 3 ✓
- 컴포넌트 D(버튼/배너/LimitsPanel/toolbar) → Task 4 ✓
- 컴포넌트 E(반응형·인쇄) → Task 5 ✓
- 검증(실제 렌더러) → Task 6 ✓

**Type/이름 일관:**
- `data-quality` 값 = 엔진 자질('strength'/'power'/'hypertrophy'/'endurance') — `qualityLabel`은 표시만, data-attr는 원문. CSS 셀렉터와 일치.
- `set-table`/`set-table-wrap`/`badge`/`stepper`/`btn` 클래스 — JSX 산출(Task 2/3/4)과 CSS(동일 태스크) 일치.
- `toDisplay`/`unitLabel` import는 RoutineView에 이미 존재(변경 없음).

**Placeholder scan:** 없음(모든 CSS/JSX 단계 실제 코드).

**주의(구현자):** CSS 태스크(1,5)는 단위 테스트 없음 — build + Task 6 시각검증으로 확인. JSX 태스크(2,3,4)는 jsdom 테스트. Task 2의 set-line→표 변경으로 `/1세트:/` 단언만 교체(나머지 데이터 단언 유지). Task 6은 **실제 브라우저 관찰** 필수 — 정적 통과로 완료 판정 금지.
