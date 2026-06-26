# UI 가독성 디자인 시스템 (Design Spec, 2026-06-27)

라이브 v3 앱의 UI를 가독성 중심으로 재설계한다. 현재 `styles.css`는 26줄로 사실상 기본 브라우저 스타일 — 시각 위계·여백·카드·폼 스타일이 없다. JSX에는 이미 className 훅(week/session/ex-header/ex-sets 등)이 있어 재설계는 **주로 CSS 디자인 시스템 + 소폭 JSX 구조 변경**이다.

**Decisions (user, 2026-06-27):**
- 출력 스타일 = **깔끔한 카드**(세션=카드, 운동=서브카드, 세트=정렬된 표).
- 범위 = **전체 디자인 시스템**(위저드·출력·LimitsPanel·toolbar 일관).
- 색 = 중립 base + steel-blue accent + 자질 4색. **다크모드 범위 밖**.
- 의존성 없는 순수 CSS(Tailwind 등 미추가), 단일 `styles.css`(섹션 구성).

## Global Constraints

- **엔진·기능 무변경**: `src/engine/` 불변. JSX 변경은 가독성에 구조가 필요한 곳(세트 표, 배지 data-attr, stepper)만.
- 한글 표시 유지, i18n 라벨 그대로. 무게 표시 `toDisplay`/`unitLabel` 유지.
- 단일 `styles.css`(main.jsx import). CSS 변수 토큰 + 섹션 주석.
- 접근성: 색 대비 WCAG AA, focus-visible 링, 터치 타깃 ≥ 40px.
- 컴포넌트 테스트 첫 줄 `// @vitest-environment jsdom`. 구조 변경분 테스트 갱신(핵심 데이터 텍스트는 유지).
- **실제 렌더러 검증 필수**: 빌드+브라우저로 직접 보고 수정(정적 점검 불가).

## 컴포넌트 A — 디자인 토큰 + base (`styles.css` 상단)

CSS 변수(`:root`):
- **색**: `--bg:#f6f7f9; --surface:#fff; --text:#1c2330; --text-muted:#5b6573; --border:#e3e7ee; --accent:#2f6df0; --accent-weak:#eaf1fe;` 시맨틱 `--deload:#fff6e5/--deload-line:#f0c976; --warn:#c0392b/--warn-weak:#fdecea; --ok:#1e8e5a;` 자질색 `--q-strength:#2f6df0; --q-power:#7b5cff; --q-hypertrophy:#1e9e6a; --q-endurance:#e08a1e;`
- **간격**: `--s1:4px --s2:8px --s3:12px --s4:16px --s5:24px --s6:32px`. **radius**: `--r1:6px --r2:10px --r3:14px`. **그림자**: `--shadow:0 1px 3px rgba(20,30,50,.08),0 1px 2px rgba(20,30,50,.06)`.
- **타이포**: `--f0:.8rem --f1:.9rem --f2:1rem --f3:1.15rem --f4:1.4rem --f5:1.9rem`.
- base: `* box-sizing`, body bg/text/폰트, `h1-h5` scale, 숫자 요소 `font-variant-numeric: tabular-nums`, 링크/포커스. `.app` max-width 1100, 패딩, 중앙.

## 컴포넌트 B — 루틴 출력 카드 (`RoutineView.jsx` + CSS)

### B1. 구조 변경 (JSX)
- **세트 표**: `ExerciseRow`의 `<ol className="ex-sets">…</ol>`를 `<table className="set-table">`로 교체:
  - `<thead>`: 세트 / 무게 / 반복 / RPE / 비고.
  - `<tbody>` 행마다: 세트번호, `{toDisplay(s.weight,units)}{unitLabel}`, `s.reps`, `s.rpe ?? '—'`, `s.note ?? ''`. `s.label`(탑/백오프 등) 있으면 세트번호 옆 배지.
  - tabular-nums, 우정렬 숫자, 미세 행 구분선, 헤더 muted.
- **자질/스킴/근거 배지**: `<span className="badge q" data-quality={ex.quality}>` (자질색), `<span className="badge scheme">`, `<span className="tag evidence">`. `자동조절`은 작은 muted 힌트.
- **AccessoryRow**: 동일하게 `<table className="set-table acc">` — 무게 열 없이 반복/RPE(체감)/비고. `(체감)` 캡션 유지.

### B2. CSS
- `.week` 섹션(주차 헤더 + 디로드 배지), `.session` 카드(`--surface`/`--shadow`/`--r2`/패딩), 운동 `.exercise-row` 서브카드(좌측 자질색 accent border), `.set-table` 정렬·zebra, 보조 `.accessories` 약한 톤, `.overreaching-banner`/`.notes` 경고 스타일, `.readiness-badge` 배지.

## 컴포넌트 C — 위저드/입력 (`Wizard.jsx` stepper + CSS, steps 최소 변경)

- **Stepper**(Wizard.jsx): body 위에 `<ol className="stepper">` 8단계 — 각 `stepLabel(n)`, 현재 `aria-current`, 완료/현재/예정 시각 구분(번호 원 + 라벨). 비클릭(v1).
- **폼 CSS**: `.input-form`/`.wizard` 내 `input,select,button` 통일 스타일(테두리·radius·패딩·focus 링), `label` 블록·간격, `fieldset/legend` 카드화, `.wizard-nav` 버튼 정렬.
- 슬라이더(StepGoals 자질 blend): `input[type=range]` 스타일 + 현재값 가독(기존 JSX 유지, CSS만).

## 컴포넌트 D — 공통 컴포넌트 + toolbar

- **버튼**: `.btn`(primary=accent), `.btn-secondary`(중립). App toolbar/Wizard-nav/CheckinPanel 버튼에 클래스 적용(JSX className 추가, 동작 무변경).
- **LimitsPanel**: `<details className="limits-panel">` 스타일(summary 강조, 본문 여백·리스트 가독).
- **CheckinPanel / RpeLogger**: 입력 그룹 정렬·간격 CSS(+필요 시 className 추가).
- **App 헤더**: `h1` + 부제, toolbar 카드화.

## 컴포넌트 E — 반응형 + 인쇄

- Mobile-first 기본; `@media (min-width:800px)` 데스크탑 보강(현재 `max-width:800px` 단일 컬럼 분기 정리).
- 세트 표: 좁은 화면에서 가독 유지 — 각 `.set-table`을 `<div className="set-table-wrap">`(`overflow-x:auto`)로 감싸 가로 스크롤. 표 자체는 최소폭 유지.
- 인쇄: 기존 `@media print`(폼/toolbar/limits 숨김) 유지 + 카드 페이지 분할(`break-inside: avoid` on `.session`), 그림자 제거.

## 데이터 흐름 / 영향
- 순수 표현 계층. store/엔진/계산 무변경. 변경 = `styles.css`(대폭), `RoutineView.jsx`(세트 표·배지), `Wizard.jsx`(stepper), 일부 컴포넌트 className 추가.

## 테스트
- **RoutineView.test**: 세트 표 구조로 갱신 — `/1세트:/` 단언은 표(세트번호 셀/헤더)로 대체. 유지 단언: 무게(`162.5`), 스킴 라벨(탑세트/스트레이트), 자질(근력), 템포(`3-1-1초`), 보조(`체감`), 노트(`omitted`), 디로드 배지, 템플릿명, `컨디션 반영`, 과피로 배너 — 모두 새 DOM에서도 렌더.
- **신규 jsdom**: 자질 배지 `data-quality` 렌더; set-table 헤더/셀 존재; Wizard stepper 현재 단계 표시.
- 기존 다른 컴포넌트 테스트 green 유지(className 추가는 텍스트 단언 무영향).

## 검증 (verification-grounding-pack)
- `npm run build` 성공 + `npm run dev`(또는 preview) 브라우저에서: 위저드 8단계, 루틴 출력(카드·세트표·배지), 모바일 폭, 인쇄 미리보기 직접 확인 → 대비·정렬·스캔성 문제 수정. 정적 통과로 완료 판정 금지.

## Out of scope (후속)
- 다크 모드, 애니메이션/전환, 운동명 한글화, 폰트 임베드.
