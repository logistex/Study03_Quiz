# 상식 퀴즈 웹 앱 구현 계획

> **에이전트 실행자에게:** 필수 하위 스킬: superpowers:subagent-driven-development(권장) 또는 superpowers:executing-plans로 이 계획을 태스크 단위로 실행하세요. 진행 표시는 체크박스(`- [ ]`)로 합니다.

**목표:** 서버 없이 `file://`로 여는 4지선다 상식 퀴즈 웹 앱을 3단계로 만듭니다. 연습 모드와 점수 → 스피드·힌트 모드와 틀린 문제 다시 풀기 → 점수 저장과 순위표 순서입니다.

**구조:** `index.html`에 화면을 `<section>`으로 미리 두고 `hidden`으로 전환합니다. `questions.js`는 전역 상수 `QUESTIONS`를 정의하는 일반 스크립트입니다. `script.js`는 상수, 순수 로직, 자체 점검, 상태, 화면 조작, 시작의 여섯 구역으로 나눕니다. 순수 로직은 DOM을 쓰지 않아 Node에서도 점검할 수 있습니다.

**기술:** HTML, CSS, 바닐라 JavaScript(ES2020). 라이브러리, 빌드 도구, 테스트 프레임워크는 쓰지 않습니다. 점검용으로만 Node.js(v24에서 확인)를 씁니다.

**명세:** [PRD.md](PRD.md). 실행자는 이 계획과 PRD를 함께 읽습니다.

## 전역 제약

- 앱 파일은 `index.html`, `style.css`, `script.js`, `questions.js` 4개뿐입니다. 다른 파일(테스트 파일, JSON, 이미지 등)을 만들지 않습니다.
- `file://`로 열어 동작해야 합니다. `fetch()`, `import`/`export`, `<script type="module">`을 쓰지 않습니다.
- `index.html`은 `questions.js`를 `script.js`보다 먼저 로드합니다.
- 카테고리는 `한국사`, `세계지리`, `과학`, `예술과 문화`이고, id 접두어는 차례대로 `kh`, `wg`, `sc`, `ac`입니다.
- 카테고리마다 10문항, 총 40문항입니다. 한 판은 한 카테고리의 10문항 전부입니다.
- 점수: 맞히면 1점, 힌트 모드에서 힌트를 쓰고 맞히면 0.5점, 틀리면(시간 초과 포함) 0점입니다.
- 스피드 모드는 문항마다 15초입니다.
- 순위표는 스피드·힌트 모드만 대상입니다. 모드 × 카테고리별로 상위 5건을 보여 주고, 점수 내림차순, 동점이면 먼저 세운 기록이 위입니다.
- localStorage 키는 `quiz.leaderboard`입니다. 이름은 앞뒤 공백을 지운 뒤 1~10자입니다.
- 화면 문구는 다음 그대로 씁니다: `순위표에 기록되지 않음`, `정답!`, `오답`, `시간 초과`, `문항 데이터 오류`, `기록을 저장할 수 없음`, `기록 없음`, `다시 풀기`
- 사용자 입력(이름)과 문항 텍스트는 `textContent`로만 화면에 넣습니다. `innerHTML`은 쓰지 않습니다.
- 휴대폰 폭 360px에서 가로 스크롤이 생기면 안 됩니다.
- 태스크마다 **점검 명령**이 기대한 결과로 끝난 뒤 그 태스크에서 바꾼 파일만 커밋합니다. 커밋 메시지는 `feat: <태스크 이름>`(문항 태스크는 `content: <카테고리> 10문항`) 꼴입니다. Task 4~6은 실제 데이터 점검이 의도대로 실패한 상태에서 커밋합니다.
- 단계(1·2·3)가 끝나면 실행을 멈추고, 사용자가 "브라우저에서 직접 확인할 항목"을 확인한 뒤에 다음 단계로 넘어갑니다.

### 점검 명령

프로젝트 폴더에서 실행합니다. `questions.js`와 `script.js`를 브라우저처럼 같은 전역 공간에 차례로 로드하고, `?test` 주소로 연 것처럼 자체 점검을 돌립니다. 실패가 있으면 종료 코드가 1입니다.

```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```

### 문항 검수 명령

60자를 넘는 해설과 최상급 표현이 들어간 문제 문장을 나열합니다.

```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({});vm.runInContext(fs.readFileSync('questions.js','utf8')+';globalThis.Q=QUESTIONS;',c);for(const q of c.Q){if(q.explanation.length>60)console.log('해설 60자 초과',q.id,q.explanation.length);if(/가장|최초|최대|최소|최고|최장|최다/.test(q.question))console.log('최상급 확인',q.id,q.question)}"
```

### 문항 작성 절차 (태스크 4~7 공통)

1. 카테고리 안에서 주제가 겹치지 않게 10개를 고릅니다. 난이도는 대학 1학년이 "들어 본 적은 있는" 수준입니다.
2. 문항마다 WebSearch로 출처를 찾고, WebFetch로 **그 사실이 적힌 페이지**를 직접 열어 정답을 확인합니다.
   - 우선 쓸 출처: 국사편찬위원회 우리역사넷(contents.history.go.kr), 한국민족문화대백과사전(encykorea.aks.ac.kr), 국가유산청, 브리태니커(britannica.com), 유네스코 세계유산센터(whc.unesco.org), NASA, 국제기구·정부 기관 누리집, 미술관·박물관 공식 누리집
   - 위키백과, 나무위키, 블로그, 커뮤니티 글은 출처로 쓰지 않습니다.
   - 페이지를 열 수 없거나 내용이 확인되지 않으면 그 문항을 버리고 다른 주제로 바꿉니다.
3. 문제를 씁니다.
   - 정답은 하나뿐이어야 합니다. 오답 3개는 그럴듯하되 출처 기준으로 명백히 틀려야 합니다.
   - 한 문항의 보기 4개는 서로 달라야 합니다.
   - 「가장 ~한」, 「최초」, 「최대」 같은 최상급 표현을 쓰면 기준과 시점을 문제 문장에 넣습니다. 예: `2024년 유엔 통계 기준, 면적이 가장 넓은 나라는?`
   - "~이 아닌 것은?" 같은 부정형 문제는 쓰지 않습니다. 정답이 하나인지 검수하기 어렵기 때문입니다.
4. 해설은 60자 이내 한 줄로, 정답의 근거를 씁니다.
5. 아래 형식으로 `questions.js`의 `QUESTIONS` 배열에 넣습니다. 작성할 때 정답은 항상 `choices`의 0번이고 `answer: 0`입니다.

   ```js
     {
       id: "kh-01",
       category: "한국사",
       question: "문제 문장",
       choices: ["정답", "오답1", "오답2", "오답3"],
       answer: 0,
       explanation: "60자 이내 한 줄 해설",
       source: { name: "기관·문서 이름", url: "https://사실이 적힌 페이지 주소" }
     },
   ```
6. 검수표를 만들어 태스크 보고에 넣습니다. 열은 `id | 정답 | 출처 페이지에서 확인한 내용(한 줄) | 정답 하나뿐 | 출처 확인 | 최상급 기준·시점`입니다. 사용자가 최종 검수에 씁니다.

---

# 1단계: 연습 모드와 점수

**만들 것**
- `questions.js`: 40문항(카테고리별 10문항, 출처 확인 완료)
- `script.js`: 섞기, 한 판 만들기, 점수 계산, 문항 검사, 자체 점검 틀, 연습 모드 화면 조작
- `index.html`: 시작, 문제, 결과의 세 화면
- `style.css`: 기본 배치, 정답/오답 표시, 휴대폰 폭 대응

**완료 기준**
- [ ] 시작 화면에서 카테고리를 고르면 연습 모드 10문제가 섞여서 나온다.
- [ ] 답을 고르면 정답 여부, 한 줄 해설, 출처가 바로 나오고 보기가 잠긴다.
- [ ] 결과 화면에 "n / 10"과 "순위표에 기록되지 않음"이 나온다. 시작 화면에도 같은 문구가 있다.
- [ ] `questions.js`에 40문항이 모두 있고 `validateQuestions`를 통과한다.
- [ ] 40문항 모두 검수표의 세 항목(정답 하나뿐, 출처 확인, 최상급 기준·시점)을 통과한다.
- [ ] 점검 명령이 `실패 0`으로 끝난다.

**브라우저에서 직접 확인할 항목** (탐색기에서 `index.html`을 더블클릭해서 엽니다)
- [ ] 시작 화면에 카테고리 버튼 4개와 "연습 모드 · 순위표에 기록되지 않음"이 보인다.
- [ ] [한국사]를 누르면 상단에 "한국사 · 연습", "1 / 10", "점수 0"이 보인다.
- [ ] 정답을 고르면 그 보기가 초록색이 되고 "정답" 글자가 붙는다. 위에 "정답!"이 나오고, 해설 한 줄과 출처 링크가 보인다.
- [ ] 오답을 고르면 고른 보기는 빨간색과 "오답", 정답 보기는 초록색과 "정답"으로 표시되고, "오답"이 나온다.
- [ ] 답을 고른 뒤 다른 보기를 눌러도 아무 변화가 없다.
- [ ] 출처 링크를 누르면 새 탭에서 출처 페이지가 열린다.
- [ ] 10번째 문항에서는 버튼이 [결과 보기]로 바뀐다.
- [ ] 결과 화면의 "n / 10"이 실제로 맞힌 개수와 같고, "순위표에 기록되지 않음"과 문항별 정답/오답 목록이 보인다.
- [ ] [같은 모드 다시]를 누르면 문항 순서와 보기 순서가 앞 판과 다르다.
- [ ] [처음으로]를 누르면 시작 화면으로 돌아간다.
- [ ] 브라우저 개발자 도구(F12)의 기기 툴바로 폭을 360px로 줄여도 가로 스크롤이 생기지 않고 버튼이 다 보인다.
- [ ] 주소 끝에 `?test`를 붙여 다시 열고, 개발자 도구 콘솔에 "자체 점검 결과: 통과 N, 실패 0"이 나온다.
- [ ] 네 카테고리를 한 판씩 풀면서 문제, 정답, 해설에 어색하거나 틀린 곳이 없는지 확인한다. 검수표와 함께 본다.

---

### Task 1: 자체 점검 틀과 섞기

**Files:**
- Create: `questions.js`
- Create: `script.js`

**Interfaces:**
- Consumes: 없음
- Produces:
  - 상수 `CATEGORIES: string[]`, `CATEGORY_PREFIX: {[category]: string}`, `QUESTIONS_PER_CATEGORY = 10`, `MODE_LABELS: {practice: "연습"}`
  - `selfTest(name: string, run: (check) => void)`: 점검을 등록합니다. `check(condition: boolean, message: string)`는 실패 메시지를 모읍니다.
  - `runSelfTests(): {passed: number, failed: number}`: 결과를 콘솔에 찍고 `globalThis.selfTestFailed`를 설정합니다.
  - `makeQuestion(category, number)`, `makeQuestionSet()`: 점검용 가짜 문항과 40문항 세트를 만듭니다.
  - `shuffle(array, random = Math.random): array`: 섞은 복사본을 반환합니다.

- [ ] **Step 1: 빈 `questions.js`를 만든다**

```js
// 상식 퀴즈 문항. 작성 규칙은 PRD.md 4.2, 형식은 IMPL-PLAN.md "문항 작성 절차"를 따릅니다.
const QUESTIONS = [
];
```

- [ ] **Step 2: `script.js` 뼈대와 실패하는 점검을 쓴다**

```js
"use strict";

// ===== 1. 상수 =====
const CATEGORIES = ["한국사", "세계지리", "과학", "예술과 문화"];
const CATEGORY_PREFIX = { "한국사": "kh", "세계지리": "wg", "과학": "sc", "예술과 문화": "ac" };
const QUESTIONS_PER_CATEGORY = 10;
const MODE_LABELS = { practice: "연습" };

// ===== 2. 순수 로직 =====

// ===== 3. 자체 점검 =====
const SELF_TESTS = [];

function selfTest(name, run) {
  SELF_TESTS.push({ name, run });
}

function runSelfTests() {
  let passed = 0;
  let failed = 0;
  for (const test of SELF_TESTS) {
    const failures = [];
    const check = (condition, message) => {
      if (!condition) failures.push(message);
    };
    try {
      test.run(check);
    } catch (error) {
      failures.push(`예외: ${error.message}`);
    }
    if (failures.length === 0) {
      passed += 1;
      console.log(`통과: ${test.name}`);
    } else {
      failed += 1;
      console.error(`실패: ${test.name}\n  - ${failures.join("\n  - ")}`);
    }
  }
  console.log(`자체 점검 결과: 통과 ${passed}, 실패 ${failed}`);
  globalThis.selfTestFailed = failed > 0;
  return { passed, failed };
}

function makeQuestion(category, number) {
  const id = `${CATEGORY_PREFIX[category]}-${String(number).padStart(2, "0")}`;
  return {
    id,
    category,
    question: `${id} 문제`,
    choices: [`${id} 정답`, `${id} 오답1`, `${id} 오답2`, `${id} 오답3`],
    answer: 0,
    explanation: `${id} 해설`,
    source: { name: "테스트 출처", url: `https://example.com/${id}` }
  };
}

function makeQuestionSet() {
  return CATEGORIES.flatMap(category =>
    Array.from({ length: QUESTIONS_PER_CATEGORY }, (_, i) => makeQuestion(category, i + 1)));
}

selfTest("shuffle은 같은 원소를 모두 담은 새 배열을 반환한다", check => {
  const original = [1, 2, 3, 4, 5];
  const result = shuffle(original);
  check(result !== original, "새 배열이어야 함");
  check(result.length === 5, `길이 ${result.length}`);
  check([...result].sort().join() === "1,2,3,4,5", `원소 ${result.join()}`);
  check(original.join() === "1,2,3,4,5", "원본이 바뀜");
});

selfTest("shuffle은 random 값에 따라 순서를 바꾼다", check => {
  const result = shuffle([1, 2, 3, 4], () => 0);
  check(result.join() === "2,3,4,1", `결과 ${result.join()}`);
});

// ===== 4. 상태 =====

// ===== 5. 화면 조작 =====

// ===== 6. 시작 =====
if (typeof location !== "undefined" && /[?&]test\b/.test(location.search)) runSelfTests();
```

- [ ] **Step 3: 점검이 실패하는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `실패: shuffle은 …`이 두 번 나오고 둘 다 `예외: shuffle is not defined`. 마지막 줄은 `자체 점검 결과: 통과 0, 실패 2`, 종료 코드 1.

- [ ] **Step 4: `shuffle`을 구현한다** (`// ===== 2. 순수 로직 =====` 아래)

```js
// Fisher–Yates. 원본은 두고 섞은 복사본을 돌려줍니다.
function shuffle(array, random = Math.random) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
```

- [ ] **Step 5: 점검이 통과하는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `자체 점검 결과: 통과 2, 실패 0`, 종료 코드 0.

---

### Task 2: 한 판 만들기와 점수 계산

**Files:**
- Modify: `script.js` (2. 순수 로직 구역 끝, 3. 자체 점검 구역 끝)

**Interfaces:**
- Consumes: `shuffle(array, random)`, `makeQuestionSet()`, `selfTest`
- Produces:
  - `prepareRound(items, random = Math.random): item[]`: 문항 순서를 섞고, 문항마다 보기를 섞은 뒤 `answer`를 새 위치로 고친 복사본을 반환합니다. 원본은 바꾸지 않습니다. 이미 섞인 문항(다시 풀기)에도 씁니다.
  - `buildRound(questions, category, random = Math.random): item[]`: 해당 카테고리 문항으로 `prepareRound`를 호출합니다.
  - `scoreAnswer(isCorrect: boolean, usedHint: boolean): 0 | 0.5 | 1`

- [ ] **Step 1: 실패하는 점검을 쓴다** (3. 자체 점검 구역의 마지막 `selfTest` 뒤에 추가)

```js
selfTest("buildRound는 해당 카테고리 문항만 모두 담는다", check => {
  const round = buildRound(makeQuestionSet(), "과학");
  check(round.length === 10, `길이 ${round.length}`);
  check(round.every(item => item.category === "과학"), "다른 카테고리가 섞임");
  check(new Set(round.map(item => item.id)).size === 10, "문항 중복");
});

selfTest("buildRound는 보기를 섞어도 정답 위치를 맞게 다시 계산한다", check => {
  const questions = makeQuestionSet();
  for (let n = 0; n < 20; n++) {
    buildRound(questions, "한국사").forEach(item => {
      check(item.choices.length === 4, `${item.id}: 보기 ${item.choices.length}개`);
      check(item.choices[item.answer] === `${item.id} 정답`, `${item.id}: 정답 위치 틀림`);
    });
  }
});

selfTest("buildRound는 원본 문항을 바꾸지 않는다", check => {
  const questions = makeQuestionSet();
  buildRound(questions, "한국사", () => 0);
  check(questions[0].answer === 0, "원본 answer가 바뀜");
  check(questions[0].choices[0] === "kh-01 정답", "원본 choices가 바뀜");
});

selfTest("scoreAnswer: 맞히면 1점, 힌트 쓰고 맞히면 0.5점, 틀리면 0점", check => {
  check(scoreAnswer(true, false) === 1, "맞힘");
  check(scoreAnswer(true, true) === 0.5, "힌트 쓰고 맞힘");
  check(scoreAnswer(false, false) === 0, "틀림");
  check(scoreAnswer(false, true) === 0, "힌트 쓰고 틀림");
});
```

- [ ] **Step 2: 점검이 실패하는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: 새 점검 4개가 `예외: buildRound is not defined` 또는 `예외: scoreAnswer is not defined`로 실패. `통과 2, 실패 4`, 종료 코드 1.

- [ ] **Step 3: 구현한다** (2. 순수 로직 구역의 `shuffle` 뒤에 추가)

```js
// 문항 순서와 보기 순서를 섞고, 정답 번호를 섞인 위치로 고칩니다.
function prepareRound(items, random = Math.random) {
  return shuffle(items, random).map(item => {
    const order = shuffle([0, 1, 2, 3], random);
    return {
      ...item,
      choices: order.map(i => item.choices[i]),
      answer: order.indexOf(item.answer)
    };
  });
}

function buildRound(questions, category, random = Math.random) {
  return prepareRound(questions.filter(q => q.category === category), random);
}

function scoreAnswer(isCorrect, usedHint) {
  if (!isCorrect) return 0;
  return usedHint ? 0.5 : 1;
}
```

- [ ] **Step 4: 점검이 통과하는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `통과 6, 실패 0`, 종료 코드 0.

---

### Task 3: 문항 데이터 검사

**Files:**
- Modify: `script.js` (2. 순수 로직 구역 끝, 3. 자체 점검 구역 끝)

**Interfaces:**
- Consumes: `CATEGORIES`, `CATEGORY_PREFIX`, `QUESTIONS_PER_CATEGORY`, `makeQuestionSet()`
- Produces: `validateQuestions(questions): string[]`: 오류 메시지 목록을 반환합니다. 비어 있으면 통과입니다. 메시지는 `"<id>: <내용>"` 또는 `"<카테고리>: 문항 n개 (10개여야 함)"` 꼴입니다.

- [ ] **Step 1: 실패하는 점검을 쓴다** (3. 자체 점검 구역 끝에 추가)

```js
selfTest("validateQuestions: 올바른 40문항은 오류가 없다", check => {
  const errors = validateQuestions(makeQuestionSet());
  check(errors.length === 0, errors.join("; "));
});

selfTest("validateQuestions: 배열이 아니면 오류", check => {
  check(validateQuestions(null).length > 0, "null이 통과됨");
});

selfTest("validateQuestions: 카테고리별 10개가 아니면 오류", check => {
  const errors = validateQuestions(makeQuestionSet().slice(1));
  check(errors.some(e => e.startsWith("한국사: 문항 9개")), errors.join("; "));
});

selfTest("validateQuestions: 보기 수, 보기 중복, answer 범위를 검사한다", check => {
  const a = makeQuestionSet();
  a[0].choices = a[0].choices.slice(0, 3);
  check(validateQuestions(a).some(e => e.startsWith("kh-01: 보기가 4개가 아님")), "보기 3개가 통과됨");
  const b = makeQuestionSet();
  b[0].choices[1] = b[0].choices[0];
  check(validateQuestions(b).some(e => e.includes("보기 중복")), "보기 중복이 통과됨");
  const c = makeQuestionSet();
  c[0].answer = 4;
  check(validateQuestions(c).some(e => e.includes("answer")), "answer 4가 통과됨");
});

selfTest("validateQuestions: 필수 항목, id 형식·중복, 출처를 검사한다", check => {
  const a = makeQuestionSet();
  a[0].explanation = "";
  check(validateQuestions(a).some(e => e.includes("explanation 없음")), "빈 해설이 통과됨");
  const b = makeQuestionSet();
  b[1].id = "kh-01";
  check(validateQuestions(b).some(e => e.includes("id 중복")), "id 중복이 통과됨");
  const c = makeQuestionSet();
  c[0].id = "xx-01";
  check(validateQuestions(c).some(e => e.includes("id 형식")), "잘못된 id 형식이 통과됨");
  const d = makeQuestionSet();
  d[0].source.url = "http://example.com";
  check(validateQuestions(d).some(e => e.includes("URL")), "http URL이 통과됨");
  const e = makeQuestionSet();
  delete e[0].source;
  check(validateQuestions(e).some(msg => msg.includes("출처 이름 없음")), "출처 없음이 통과됨");
});
```

- [ ] **Step 2: 점검이 실패하는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: 새 점검 5개가 `예외: validateQuestions is not defined`로 실패. `통과 6, 실패 5`, 종료 코드 1.

- [ ] **Step 3: 구현한다** (2. 순수 로직 구역 끝에 추가)

```js
// 문항 데이터가 PRD 4.1·4.2의 형식을 지키는지 검사하고 오류 메시지 목록을 돌려줍니다.
function validateQuestions(questions) {
  if (!Array.isArray(questions)) return ["QUESTIONS가 배열이 아님"];
  const errors = [];
  const seenIds = new Set();

  questions.forEach((q, n) => {
    if (!q || typeof q !== "object") {
      errors.push(`${n + 1}번째 항목: 객체가 아님`);
      return;
    }
    const label = typeof q.id === "string" && q.id ? q.id : `${n + 1}번째 항목`;

    for (const key of ["id", "category", "question", "explanation"]) {
      if (typeof q[key] !== "string" || q[key].trim() === "") errors.push(`${label}: ${key} 없음`);
    }
    if (!CATEGORIES.includes(q.category)) {
      errors.push(`${label}: 알 수 없는 카테고리 "${q.category}"`);
    } else if (!new RegExp(`^${CATEGORY_PREFIX[q.category]}-\\d{2}$`).test(q.id)) {
      errors.push(`${label}: id 형식이 ${CATEGORY_PREFIX[q.category]}-00 꼴이 아님`);
    }
    if (seenIds.has(q.id)) errors.push(`${label}: id 중복`);
    seenIds.add(q.id);

    if (!Array.isArray(q.choices) || q.choices.length !== 4) {
      errors.push(`${label}: 보기가 4개가 아님`);
    } else {
      if (q.choices.some(c => typeof c !== "string" || c.trim() === "")) errors.push(`${label}: 빈 보기`);
      if (new Set(q.choices).size !== 4) errors.push(`${label}: 보기 중복`);
    }
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(`${label}: answer가 0~3이 아님`);

    const source = q.source;
    if (!source || typeof source.name !== "string" || source.name.trim() === "") errors.push(`${label}: 출처 이름 없음`);
    if (!source || typeof source.url !== "string" || !source.url.startsWith("https://")) errors.push(`${label}: 출처 URL이 https://로 시작하지 않음`);
  });

  for (const category of CATEGORIES) {
    const count = questions.filter(q => q && q.category === category).length;
    if (count !== QUESTIONS_PER_CATEGORY) errors.push(`${category}: 문항 ${count}개 (${QUESTIONS_PER_CATEGORY}개여야 함)`);
  }
  return errors;
}
```

- [ ] **Step 4: 점검이 통과하는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `통과 11, 실패 0`, 종료 코드 0.

---

### Task 4: 한국사 10문항

**Files:**
- Modify: `questions.js` (`QUESTIONS` 배열)
- Modify: `script.js` (3. 자체 점검 구역 끝)

**Interfaces:**
- Consumes: `validateQuestions(questions)`, 전역 제약의 "문항 작성 절차"
- Produces: `QUESTIONS`에 `kh-01`~`kh-10`

**주제 배분:** 고대·삼국·남북국 2, 고려 2, 조선 3, 근현대(개항 이후) 3

- [ ] **Step 1: 실제 데이터 점검을 추가한다** (3. 자체 점검 구역 끝에 추가)

```js
selfTest("실제 문항 데이터(QUESTIONS)가 규칙을 통과한다", check => {
  const errors = validateQuestions(QUESTIONS);
  check(errors.length === 0, errors.join("; "));
});
```

- [ ] **Step 2: 점검이 실패하는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `실패: 실제 문항 데이터…`에 네 카테고리 모두 `문항 0개`. `통과 11, 실패 1`.

- [ ] **Step 3: 문항 작성 절차 1~5에 따라 한국사 10문항을 `QUESTIONS`에 쓴다** (id `kh-01`~`kh-10`, `category: "한국사"`)

- [ ] **Step 4: 한국사 오류가 없어졌는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: 실제 데이터 점검의 실패 메시지는 `세계지리: 문항 0개`, `과학: 문항 0개`, `예술과 문화: 문항 0개` 세 개뿐. `kh-`로 시작하는 메시지나 `한국사:` 메시지가 없어야 함.

- [ ] **Step 5: 문항 검수 명령을 돌린다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({});vm.runInContext(fs.readFileSync('questions.js','utf8')+';globalThis.Q=QUESTIONS;',c);for(const q of c.Q){if(q.explanation.length>60)console.log('해설 60자 초과',q.id,q.explanation.length);if(/가장|최초|최대|최소|최고|최장|최다/.test(q.question))console.log('최상급 확인',q.id,q.question)}"
```
Expected: `해설 60자 초과`가 없다. `최상급 확인`으로 나온 문항은 문제 문장에 기준과 시점이 있는지 하나씩 확인하고 없으면 고친다.

- [ ] **Step 6: 문항 작성 절차 6의 검수표(kh-01~kh-10)를 만들어 태스크 보고에 넣는다**

---

### Task 5: 세계지리 10문항

**Files:**
- Modify: `questions.js` (`QUESTIONS` 배열 끝)

**Interfaces:**
- Consumes: `validateQuestions(questions)`, 실제 데이터 점검(Task 4), 전역 제약의 "문항 작성 절차"
- Produces: `QUESTIONS`에 `wg-01`~`wg-10`

**주제 배분:** 아시아 2, 유럽 2, 아프리카 2, 아메리카 2, 오세아니아·극지·해양 2. 수도, 지형, 기후, 강·산맥 등을 섞는다. 인구·면적·높이·길이처럼 값이 바뀌거나 기관마다 다른 수치는 기준 기관과 연도를 문제에 넣는다.

- [ ] **Step 1: 문항 작성 절차 1~5에 따라 세계지리 10문항을 `QUESTIONS` 끝에 쓴다** (id `wg-01`~`wg-10`, `category: "세계지리"`)

- [ ] **Step 2: 세계지리 오류가 없어졌는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: 실제 데이터 점검의 실패 메시지는 `과학: 문항 0개`, `예술과 문화: 문항 0개` 두 개뿐.

- [ ] **Step 3: 문항 검수 명령을 돌린다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({});vm.runInContext(fs.readFileSync('questions.js','utf8')+';globalThis.Q=QUESTIONS;',c);for(const q of c.Q){if(q.explanation.length>60)console.log('해설 60자 초과',q.id,q.explanation.length);if(/가장|최초|최대|최소|최고|최장|최다/.test(q.question))console.log('최상급 확인',q.id,q.question)}"
```
Expected: `해설 60자 초과`가 없다. `최상급 확인`으로 나온 `wg-` 문항은 문제 문장에 기준과 시점이 있다.

- [ ] **Step 4: 검수표(wg-01~wg-10)를 만들어 태스크 보고에 넣는다**

---

### Task 6: 과학 10문항

**Files:**
- Modify: `questions.js` (`QUESTIONS` 배열 끝)

**Interfaces:**
- Consumes: `validateQuestions(questions)`, 실제 데이터 점검(Task 4), 전역 제약의 "문항 작성 절차"
- Produces: `QUESTIONS`에 `sc-01`~`sc-10`

**주제 배분:** 물리 3, 화학 2, 생명과학 3, 지구과학·천문 2. 정의나 법칙처럼 기준이 바뀌지 않는 사실을 우선한다. 천체 개수처럼 분류 기준이 바뀐 사실(예: 태양계 행성 수)은 기준 기관과 연도를 문제에 넣는다.

- [ ] **Step 1: 문항 작성 절차 1~5에 따라 과학 10문항을 `QUESTIONS` 끝에 쓴다** (id `sc-01`~`sc-10`, `category: "과학"`)

- [ ] **Step 2: 과학 오류가 없어졌는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: 실제 데이터 점검의 실패 메시지는 `예술과 문화: 문항 0개` 하나뿐.

- [ ] **Step 3: 문항 검수 명령을 돌린다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({});vm.runInContext(fs.readFileSync('questions.js','utf8')+';globalThis.Q=QUESTIONS;',c);for(const q of c.Q){if(q.explanation.length>60)console.log('해설 60자 초과',q.id,q.explanation.length);if(/가장|최초|최대|최소|최고|최장|최다/.test(q.question))console.log('최상급 확인',q.id,q.question)}"
```
Expected: `해설 60자 초과`가 없다. `최상급 확인`으로 나온 `sc-` 문항은 문제 문장에 기준과 시점이 있다.

- [ ] **Step 4: 검수표(sc-01~sc-10)를 만들어 태스크 보고에 넣는다**

---

### Task 7: 예술과 문화 10문항

**Files:**
- Modify: `questions.js` (`QUESTIONS` 배열 끝)

**Interfaces:**
- Consumes: `validateQuestions(questions)`, 실제 데이터 점검(Task 4), 전역 제약의 "문항 작성 절차"
- Produces: `QUESTIONS`에 `ac-01`~`ac-10`. 이 태스크가 끝나면 40문항이 완성된다.

**주제 배분:** 미술 3, 음악 2, 문학 2, 건축·세계유산 2, 공연·전통문화 1. 작품의 작가, 양식, 소장처처럼 출처 한 페이지로 확인되는 사실을 고른다. 소장처는 바뀔 수 있으므로 시점을 문제에 넣는다.

- [ ] **Step 1: 문항 작성 절차 1~5에 따라 예술과 문화 10문항을 `QUESTIONS` 끝에 쓴다** (id `ac-01`~`ac-10`, `category: "예술과 문화"`)

- [ ] **Step 2: 모든 점검이 통과하는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `통과 12, 실패 0`, 종료 코드 0.

- [ ] **Step 3: 문항 검수 명령을 돌린다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({});vm.runInContext(fs.readFileSync('questions.js','utf8')+';globalThis.Q=QUESTIONS;',c);for(const q of c.Q){if(q.explanation.length>60)console.log('해설 60자 초과',q.id,q.explanation.length);if(/가장|최초|최대|최소|최고|최장|최다/.test(q.question))console.log('최상급 확인',q.id,q.question)}"
```
Expected: `해설 60자 초과`가 없다. `최상급 확인`으로 나온 모든 문항은 문제 문장에 기준과 시점이 있다.

- [ ] **Step 4: 검수표(ac-01~ac-10)를 만들어 태스크 보고에 넣는다**

---

### Task 8: 연습 모드 화면

**Files:**
- Create: `index.html`
- Create: `style.css`
- Modify: `script.js` (4. 상태, 5. 화면 조작, 6. 시작 구역)

**Interfaces:**
- Consumes: `QUESTIONS`, `CATEGORIES`, `MODE_LABELS`, `buildRound`, `scoreAnswer`, `validateQuestions`
- Produces (2·3단계에서 고치거나 부르는 이름):
  - `state` 객체: `category`, `mode`, `round`, `index`, `score`, `results`(`{item, chosen, isCorrect, points}[]`, 시간 초과면 `chosen: null`), `usedHint`, `timerId`, `secondsLeft`, `isRetry`, `answered`
  - `$(id)`, `showScreen(id)`, `startRound(category, mode)`, `renderStatus()`, `renderQuestion()`, `handleAnswer(choiceIndex | null)`, `addMark(button, text)`, `showFeedback(item, choiceIndex, isCorrect)`, `nextQuestion()`, `renderResult()`, `onCategoryChosen(category)`, `init()`
  - HTML id: `screen-start`, `data-error`, `category-buttons`, `start-practice-note`, `screen-question`, `status-label`, `status-progress`, `status-score`, `question-text`, `choice-buttons`, `feedback`, `feedback-verdict`, `feedback-explanation`, `feedback-source`, `next-button`, `screen-result`, `result-title`, `result-score`, `result-practice-note`, `result-list`, `again-button`, `home-button`

- [ ] **Step 1: `index.html`을 만든다**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>상식 퀴즈</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="app">
    <section id="screen-start" class="screen">
      <h1>상식 퀴즈</h1>
      <p class="lead">카테고리를 고르세요. 한 판은 10문제입니다.</p>
      <p id="data-error" class="notice notice-error" hidden>문항 데이터 오류</p>
      <div id="category-buttons" class="button-list"></div>
      <p id="start-practice-note" class="notice">연습 모드 · 순위표에 기록되지 않음</p>
    </section>

    <section id="screen-question" class="screen" hidden>
      <header class="status-bar">
        <span id="status-label"></span>
        <span id="status-progress"></span>
        <span id="status-score"></span>
      </header>
      <h2 id="question-text" class="question-text"></h2>
      <div id="choice-buttons" class="button-list"></div>
      <div id="feedback" class="feedback" aria-live="polite" hidden>
        <p id="feedback-verdict" class="verdict"></p>
        <p id="feedback-explanation"></p>
        <p class="source">출처: <a id="feedback-source" target="_blank" rel="noopener noreferrer"></a></p>
        <button id="next-button" type="button" class="primary">다음</button>
      </div>
    </section>

    <section id="screen-result" class="screen" hidden>
      <h2 id="result-title">결과</h2>
      <p id="result-score" class="result-score"></p>
      <p id="result-practice-note" class="notice">순위표에 기록되지 않음</p>
      <ol id="result-list" class="result-list"></ol>
      <div class="button-row">
        <button id="again-button" type="button" class="primary">같은 모드 다시</button>
        <button id="home-button" type="button">처음으로</button>
      </div>
    </section>
  </main>
  <script src="questions.js"></script>
  <script src="script.js"></script>
</body>
</html>
```

- [ ] **Step 2: `style.css`를 만든다**

```css
:root {
  --bg: #f6f7fb;
  --surface: #ffffff;
  --text: #1d2330;
  --muted: #5b6475;
  --border: #d6dae3;
  --primary: #2f5bea;
  --primary-text: #ffffff;
  --correct: #1f7a3f;
  --correct-bg: #e5f5ea;
  --wrong: #b3261e;
  --wrong-bg: #fbe7e5;
  --notice-bg: #fff6d9;
}

* { box-sizing: border-box; }

[hidden] { display: none !important; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, "Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
  line-height: 1.5;
}

.app { max-width: 640px; margin: 0 auto; padding: 24px 16px 48px; }

h1 { font-size: 1.75rem; margin: 0 0 8px; }
h2 { font-size: 1.25rem; margin: 0 0 16px; }
.lead { color: var(--muted); margin: 0 0 16px; }

.button-list { display: flex; flex-direction: column; gap: 12px; margin: 16px 0; }

button {
  font: inherit;
  min-height: 48px;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
  color: var(--text);
  text-align: left;
  cursor: pointer;
}
button:hover:not(:disabled) { border-color: var(--primary); }
button:disabled { cursor: default; }
button:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
button.primary { background: var(--primary); border-color: var(--primary); color: var(--primary-text); text-align: center; }

.notice { background: var(--notice-bg); border-radius: 8px; padding: 8px 12px; margin: 12px 0; font-size: 0.95rem; }
.notice-error { background: var(--wrong-bg); color: var(--wrong); }

.status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
  justify-content: space-between;
  color: var(--muted);
  font-size: 0.95rem;
  margin-bottom: 16px;
}

.question-text { font-size: 1.2rem; overflow-wrap: anywhere; }

.choice { overflow-wrap: anywhere; }
.choice.correct { background: var(--correct-bg); border-color: var(--correct); color: var(--correct); }
.choice.wrong { background: var(--wrong-bg); border-color: var(--wrong); color: var(--wrong); }
.choice:disabled:not(.correct):not(.wrong) { opacity: 0.6; }
.mark { margin-left: 8px; font-weight: 700; }

.feedback { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
.feedback p { margin: 0 0 8px; }
.feedback button { width: 100%; margin-top: 8px; }
.verdict { font-weight: 700; font-size: 1.1rem; }
.verdict-correct { color: var(--correct); }
.verdict-wrong { color: var(--wrong); }
.source { font-size: 0.9rem; color: var(--muted); }
.source a { color: var(--primary); overflow-wrap: anywhere; }

.result-score { font-size: 2rem; font-weight: 700; margin: 0; }
.result-list { padding-left: 20px; }
.result-list li { margin-bottom: 12px; }
.result-list p { margin: 0; overflow-wrap: anywhere; }
.result-detail { font-size: 0.9rem; }
.result-correct .result-detail { color: var(--correct); }
.result-wrong .result-detail { color: var(--wrong); }

.button-row { display: flex; flex-wrap: wrap; gap: 12px; }
.button-row button { flex: 1 1 140px; text-align: center; }
```

- [ ] **Step 3: 상태를 쓴다** (`// ===== 4. 상태 =====` 아래)

```js
const state = {
  category: null,
  mode: "practice",
  round: [],
  index: 0,
  score: 0,
  results: [],       // { item, chosen, isCorrect, points }, 시간 초과면 chosen: null
  usedHint: false,
  timerId: null,
  secondsLeft: 0,
  isRetry: false,
  answered: false    // 현재 문항에 답했는지. 두 번 채점되지 않게 막습니다.
};
```

- [ ] **Step 4: 화면 조작을 쓴다** (`// ===== 5. 화면 조작 =====` 아래)

```js
function $(id) {
  return document.getElementById(id);
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach(screen => {
    screen.hidden = screen.id !== id;
  });
  window.scrollTo(0, 0);
}

function startRound(category, mode) {
  state.category = category;
  state.mode = mode;
  state.round = buildRound(QUESTIONS, category);
  state.index = 0;
  state.score = 0;
  state.results = [];
  state.isRetry = false;
  showScreen("screen-question");
  renderQuestion();
}

function renderStatus() {
  $("status-label").textContent = `${state.category} · ${MODE_LABELS[state.mode]}`;
  $("status-progress").textContent = `${state.index + 1} / ${state.round.length}`;
  $("status-score").textContent = `점수 ${state.score}`;
}

function renderQuestion() {
  const item = state.round[state.index];
  state.answered = false;
  state.usedHint = false;
  renderStatus();
  $("question-text").textContent = item.question;

  const list = $("choice-buttons");
  list.replaceChildren();
  item.choices.forEach((text, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.textContent = text;
    button.addEventListener("click", () => handleAnswer(i));
    list.append(button);
  });

  $("feedback").hidden = true;
}

// choiceIndex가 null이면 시간 초과입니다.
function handleAnswer(choiceIndex) {
  if (state.answered) return;
  state.answered = true;

  const item = state.round[state.index];
  const isCorrect = choiceIndex === item.answer;
  const points = scoreAnswer(isCorrect, state.usedHint);
  state.score += points;
  state.results.push({ item, chosen: choiceIndex, isCorrect, points });

  showFeedback(item, choiceIndex, isCorrect);
}

function addMark(button, text) {
  const mark = document.createElement("span");
  mark.className = "mark";
  mark.textContent = text;
  button.append(mark);
}

function showFeedback(item, choiceIndex, isCorrect) {
  $("choice-buttons").querySelectorAll("button").forEach((button, i) => {
    button.disabled = true;
    if (i === item.answer) {
      button.classList.add("correct");
      addMark(button, "정답");
    } else if (i === choiceIndex) {
      button.classList.add("wrong");
      addMark(button, "오답");
    }
  });

  const verdict = $("feedback-verdict");
  verdict.textContent = isCorrect ? "정답!" : choiceIndex === null ? "시간 초과" : "오답";
  verdict.className = isCorrect ? "verdict verdict-correct" : "verdict verdict-wrong";
  $("feedback-explanation").textContent = item.explanation;
  const source = $("feedback-source");
  source.textContent = item.source.name;
  source.href = item.source.url;
  renderStatus();

  const isLast = state.index === state.round.length - 1;
  $("next-button").textContent = isLast ? "결과 보기" : "다음";
  $("feedback").hidden = false;
  $("next-button").focus();
}

function nextQuestion() {
  state.index += 1;
  if (state.index < state.round.length) {
    renderQuestion();
  } else {
    renderResult();
  }
}

function renderResult() {
  const total = state.round.length;
  $("result-score").textContent = `${state.score} / ${total}`;
  $("result-practice-note").hidden = state.mode !== "practice";

  const list = $("result-list");
  list.replaceChildren();
  state.results.forEach(result => {
    const li = document.createElement("li");
    li.className = result.isCorrect ? "result-correct" : "result-wrong";
    const question = document.createElement("p");
    question.textContent = result.item.question;
    const detail = document.createElement("p");
    detail.className = "result-detail";
    detail.textContent = `${result.isCorrect ? "정답" : "오답"} · 정답: ${result.item.choices[result.item.answer]}`;
    li.append(question, detail);
    list.append(li);
  });

  showScreen("screen-result");
}

function onCategoryChosen(category) {
  startRound(category, "practice");
}

function init() {
  const errors = validateQuestions(typeof QUESTIONS === "undefined" ? null : QUESTIONS);
  if (errors.length > 0) {
    console.error("문항 데이터 오류", errors);
    $("data-error").hidden = false;
  }

  const buttons = $("category-buttons");
  CATEGORIES.forEach(category => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = category;
    button.disabled = errors.length > 0;
    button.addEventListener("click", () => onCategoryChosen(category));
    buttons.append(button);
  });

  $("next-button").addEventListener("click", nextQuestion);
  $("again-button").addEventListener("click", () => startRound(state.category, state.mode));
  $("home-button").addEventListener("click", () => showScreen("screen-start"));
}
```

- [ ] **Step 5: 시작 구역 끝에 `init` 호출을 추가한다** (`// ===== 6. 시작 =====`의 `runSelfTests` 줄 아래)

```js
if (typeof document !== "undefined") init();
```

- [ ] **Step 6: 점검 명령으로 Node에서 깨지지 않았는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `통과 12, 실패 0`, 종료 코드 0. (Node에는 `document`가 없어 `init`은 실행되지 않습니다.)

- [ ] **Step 7: 데이터 오류 표시를 확인한다**

`questions.js`의 첫 문항 `answer: 0`을 잠시 `answer: 9`로 바꾸고 `index.html`을 브라우저로 연다. "문항 데이터 오류"가 보이고 카테고리 버튼이 눌리지 않으며, 콘솔에 `kh-01: answer가 0~3이 아님`이 찍히는지 확인한다. 확인 후 `answer: 0`으로 되돌린다.

- [ ] **Step 8: 1단계 "브라우저에서 직접 확인할 항목"을 실행자가 먼저 확인한다**

내장 브라우저로 `file:///C:/Users/logistex/DSMP/Study03_Quiz/index.html`을 열 수 있으면 목록을 따라 확인하고 결과를 보고한다. 열 수 없으면 그 사실을 보고한다. 그다음 **멈추고** 사용자에게 1단계 확인을 요청한다.

---

# 2단계: 스피드 모드, 힌트 모드, 틀린 문제 다시 풀기

**만들 것**
- 모드 선택 화면(연습, 스피드, 힌트)
- 스피드 모드: 문항마다 15초 타이머, 시간 초과는 오답, 해설이 나오면 멈춤
- 힌트 모드: 문항마다 힌트 1번, 오답 2개 비활성화, 힌트 쓰고 맞히면 0.5점
- 연습 모드의 틀린 문제 다시 풀기(다 맞힐 때까지 반복, 채점 안 함)
- `script.js`에 `pickHintRemovals`, `wrongItems`와 그 점검

**완료 기준**
- [ ] 카테고리를 고르면 모드 선택 화면이 나오고, 연습 모드에 "순위표에 기록되지 않음"이 붙어 있다.
- [ ] 스피드: 15초가 지나면 오답 처리되고 정답과 해설이 나온다.
- [ ] 스피드: 해설이 나온 동안 타이머가 멈추고, [다음]을 누르면 15초부터 다시 센다.
- [ ] 힌트: 문항마다 한 번만 쓸 수 있고 오답 2개가 비활성화된다. 힌트를 쓰고 맞히면 0.5점이다.
- [ ] 연습: 틀린 문제만 다시 풀 수 있고, 다 맞힐 때까지 반복할 수 있다. 점수는 바뀌지 않는다.
- [ ] 점검 명령이 `실패 0`으로 끝난다.

**브라우저에서 직접 확인할 항목**
- [ ] 시작 화면에서 "연습 모드 · 순위표에 기록되지 않음" 문구가 사라졌다.
- [ ] 카테고리를 고르면 "과학 · 모드를 고르세요"처럼 모드 선택 화면이 나오고, 모드마다 규칙 한 줄이 보인다. 연습 버튼에만 "순위표에 기록되지 않음"이 있다.
- [ ] 모드 선택 화면의 [뒤로]를 누르면 시작 화면으로 돌아간다.
- [ ] 스피드: 상단에 "남은 시간 15초"가 1초씩 줄고, 5초 이하에서 빨간색이 된다.
- [ ] 스피드: 아무것도 누르지 않고 기다리면 0초에 "시간 초과"가 나오고, 정답 보기가 초록색으로 표시되며 해설이 보인다.
- [ ] 스피드: 해설이 나온 상태로 10초 넘게 기다려도 남은 시간 숫자가 그대로다.
- [ ] 스피드: [다음]을 누르면 다음 문항이 15초부터 다시 센다.
- [ ] 스피드: 결과 화면의 문항 목록에서 시간 초과 문항이 "시간 초과"로 표시된다. [틀린 문제 다시 풀기] 버튼은 없다.
- [ ] 스피드: 한 판이 끝나 결과 화면에 있는 동안 콘솔에 오류가 없고, 새 판을 시작하면 타이머가 하나만 돈다(1초에 1씩 준다).
- [ ] 힌트: [힌트 (오답 2개 지우기)] 버튼을 누르면 오답 보기 2개가 흐려지고 줄이 그어지며 눌리지 않는다. 정답 보기는 항상 남아 있다.
- [ ] 힌트: 버튼이 "힌트 사용함"으로 바뀌고 다시 눌리지 않는다. 다음 문항에서는 다시 쓸 수 있다.
- [ ] 힌트: 힌트를 쓰고 맞히면 점수가 0.5 오르고, 쓰지 않고 맞히면 1 오른다. 결과가 "7.5 / 10"처럼 0.5 단위로 나온다.
- [ ] 힌트: 결과 목록에 힌트를 쓰고 맞힌 문항은 "(힌트 0.5점)"이 붙는다.
- [ ] 연습: 일부러 2~3문제를 틀리면 결과 화면에 [틀린 문제 다시 풀기]가 나온다.
- [ ] 연습: 다시 풀기에서는 틀린 문항만 나오고, 상단에 "· 다시 풀기"와 "채점 안 함"이 보인다.
- [ ] 연습: 다시 풀기 결과에 "3문제 중 2문제 맞힘 · 이번 판 점수 7 / 10"처럼 처음 점수가 그대로 나온다.
- [ ] 연습: 또 틀린 문항이 있으면 버튼이 다시 나오고, 다 맞히면 버튼이 사라진다.

---

### Task 9: 힌트와 다시 풀기용 순수 로직

**Files:**
- Modify: `script.js` (2. 순수 로직 구역 끝, 3. 자체 점검 구역 끝)

**Interfaces:**
- Consumes: `shuffle`, `prepareRound`, `buildRound`, `makeQuestionSet`
- Produces:
  - `pickHintRemovals(item, random = Math.random): number[]`: 정답이 아닌 보기 번호 2개를 오름차순으로 반환합니다.
  - `wrongItems(results): item[]`: `isCorrect`가 false인 결과의 `item`을 순서대로 반환합니다.

- [ ] **Step 1: 실패하는 점검을 쓴다** (3. 자체 점검 구역 끝에 추가)

```js
selfTest("pickHintRemovals는 정답이 아닌 보기 2개를 고른다", check => {
  const item = { choices: ["a", "b", "c", "d"], answer: 2 };
  const seen = new Set();
  for (let n = 0; n < 50; n++) {
    const removed = pickHintRemovals(item);
    check(removed.length === 2, `개수 ${removed.length}`);
    check(!removed.includes(2), "정답을 지움");
    check(removed[0] !== removed[1], "같은 보기를 두 번 고름");
    check(removed.every(i => i >= 0 && i <= 3), "범위 밖 번호");
    removed.forEach(i => seen.add(i));
  }
  check(seen.size === 3, `오답 3개가 모두 뽑히지 않음: ${[...seen].join()}`);
});

selfTest("wrongItems는 틀린 문항만 순서대로 돌려준다", check => {
  const results = [
    { item: { id: "a" }, isCorrect: true },
    { item: { id: "b" }, isCorrect: false },
    { item: { id: "c" }, isCorrect: false }
  ];
  check(wrongItems(results).map(item => item.id).join() === "b,c", "틀린 문항 목록이 다름");
  check(wrongItems([]).length === 0, "빈 목록에서 결과가 나옴");
});

selfTest("prepareRound는 이미 섞인 문항을 다시 섞어도 정답을 유지한다", check => {
  const once = buildRound(makeQuestionSet(), "과학");
  for (let n = 0; n < 20; n++) {
    prepareRound(once).forEach(item => {
      check(item.choices[item.answer] === `${item.id} 정답`, `${item.id}: 정답 위치 틀림`);
    });
  }
});
```

- [ ] **Step 2: 점검이 실패하는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `pickHintRemovals`와 `wrongItems` 점검이 `예외: … is not defined`로 실패. `prepareRound` 점검은 이미 통과. `통과 13, 실패 2`, 종료 코드 1.

- [ ] **Step 3: 구현한다** (2. 순수 로직 구역 끝에 추가)

```js
// 힌트로 지울 오답 보기 번호 2개를 무작위로 고릅니다.
function pickHintRemovals(item, random = Math.random) {
  const wrong = [0, 1, 2, 3].filter(i => i !== item.answer);
  return shuffle(wrong, random).slice(0, 2).sort((a, b) => a - b);
}

function wrongItems(results) {
  return results.filter(result => !result.isCorrect).map(result => result.item);
}
```

- [ ] **Step 4: 점검이 통과하는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `통과 15, 실패 0`, 종료 코드 0.

---

### Task 10: 모드 선택 화면

**Files:**
- Modify: `index.html` (시작 화면, 새 모드 선택 화면)
- Modify: `style.css` (끝에 추가)
- Modify: `script.js` (`MODE_LABELS`, `onCategoryChosen`, `init`)

**Interfaces:**
- Consumes: `state`, `showScreen`, `startRound(category, mode)`
- Produces: `MODE_LABELS = { practice: "연습", speed: "스피드", hint: "힌트" }`. HTML id `screen-mode`, `mode-title`, `mode-back-button`. 클래스 `mode-button`, `data-mode` 속성(`practice` | `speed` | `hint`).

- [ ] **Step 1: 시작 화면의 연습 모드 문구를 지운다** (`index.html`에서 아래 줄을 삭제)

```html
      <p id="start-practice-note" class="notice">연습 모드 · 순위표에 기록되지 않음</p>
```

- [ ] **Step 2: 모드 선택 화면을 추가한다** (`index.html`에서 `screen-start` 섹션의 `</section>` 바로 뒤)

```html

    <section id="screen-mode" class="screen" hidden>
      <h2 id="mode-title"></h2>
      <div class="button-list">
        <button type="button" class="mode-button" data-mode="practice">
          <strong>연습</strong>
          <span>시간 제한과 힌트 없음, 맞히면 1점</span>
          <span class="mode-note">순위표에 기록되지 않음</span>
        </button>
        <button type="button" class="mode-button" data-mode="speed">
          <strong>스피드</strong>
          <span>문항마다 15초, 시간이 지나면 오답</span>
        </button>
        <button type="button" class="mode-button" data-mode="hint">
          <strong>힌트</strong>
          <span>문항마다 힌트 1번, 힌트를 쓰고 맞히면 0.5점</span>
        </button>
      </div>
      <button id="mode-back-button" type="button">뒤로</button>
    </section>
```

- [ ] **Step 3: 스타일을 추가한다** (`style.css` 끝)

```css
.mode-button { display: flex; flex-direction: column; gap: 2px; }
.mode-button span { color: var(--muted); font-size: 0.9rem; }
.mode-button .mode-note { color: var(--text); background: var(--notice-bg); border-radius: 6px; padding: 2px 8px; align-self: flex-start; }
```

- [ ] **Step 4: `script.js`를 고친다**

1. 1. 상수 구역의 `MODE_LABELS`를 바꾼다.

```js
const MODE_LABELS = { practice: "연습", speed: "스피드", hint: "힌트" };
```

2. `onCategoryChosen`을 통째로 바꾼다.

```js
function onCategoryChosen(category) {
  state.category = category;
  $("mode-title").textContent = `${category} · 모드를 고르세요`;
  showScreen("screen-mode");
}
```

3. `init`의 마지막 줄 `$("home-button").addEventListener(…);` 아래에 추가한다.

```js
  document.querySelectorAll(".mode-button").forEach(button => {
    button.addEventListener("click", () => startRound(state.category, button.dataset.mode));
  });
  $("mode-back-button").addEventListener("click", () => showScreen("screen-start"));
```

- [ ] **Step 5: 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `통과 15, 실패 0`. 브라우저에서 카테고리 → 모드 선택 → [연습]으로 한 판이 시작되고, [뒤로]가 시작 화면으로 가는지 확인한다. (스피드·힌트는 아직 연습처럼 동작한다.)

---

### Task 11: 스피드 모드

**Files:**
- Modify: `index.html` (문제 화면 상단 바)
- Modify: `style.css` (끝에 추가)
- Modify: `script.js` (상수, `showScreen`, `renderQuestion`, `handleAnswer`, 새 타이머 함수)

**Interfaces:**
- Consumes: `state.timerId`, `state.secondsLeft`, `handleAnswer(null)`
- Produces: `SPEED_SECONDS = 15`, `startTimer()`, `stopTimer()`, `renderTimer()`, `handleTimeout()`. HTML id `status-timer`. `showScreen`은 항상 `stopTimer()`를 먼저 부른다.

- [ ] **Step 1: 타이머 표시를 추가한다** (`index.html`의 `<span id="status-score"></span>` 아래)

```html
        <span id="status-timer" class="timer" hidden></span>
```

- [ ] **Step 2: 스타일을 추가한다** (`style.css` 끝)

```css
.timer { font-weight: 700; color: var(--text); }
.timer.urgent { color: var(--wrong); }
```

- [ ] **Step 3: 상수를 추가한다** (1. 상수 구역 끝)

```js
const SPEED_SECONDS = 15;
```

- [ ] **Step 4: 타이머 함수를 추가한다** (5. 화면 조작 구역의 `startRound` 앞)

```js
function renderTimer() {
  const timer = $("status-timer");
  timer.hidden = false;
  timer.textContent = `남은 시간 ${state.secondsLeft}초`;
  timer.classList.toggle("urgent", state.secondsLeft <= 5);
}

function startTimer() {
  stopTimer();
  state.secondsLeft = SPEED_SECONDS;
  renderTimer();
  state.timerId = setInterval(() => {
    state.secondsLeft -= 1;
    renderTimer();
    if (state.secondsLeft <= 0) handleTimeout();
  }, 1000);
}

function stopTimer() {
  if (state.timerId !== null) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
}

function handleTimeout() {
  stopTimer();
  handleAnswer(null);
}
```

- [ ] **Step 5: `showScreen`, `renderQuestion`, `handleAnswer`를 통째로 바꾼다**

```js
function showScreen(id) {
  stopTimer();
  document.querySelectorAll(".screen").forEach(screen => {
    screen.hidden = screen.id !== id;
  });
  window.scrollTo(0, 0);
}
```

```js
function renderQuestion() {
  const item = state.round[state.index];
  state.answered = false;
  state.usedHint = false;
  renderStatus();
  $("question-text").textContent = item.question;

  const list = $("choice-buttons");
  list.replaceChildren();
  item.choices.forEach((text, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.textContent = text;
    button.addEventListener("click", () => handleAnswer(i));
    list.append(button);
  });

  $("feedback").hidden = true;

  if (state.mode === "speed") {
    startTimer();
  } else {
    $("status-timer").hidden = true;
  }
}
```

```js
// choiceIndex가 null이면 시간 초과입니다.
function handleAnswer(choiceIndex) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const item = state.round[state.index];
  const isCorrect = choiceIndex === item.answer;
  const points = scoreAnswer(isCorrect, state.usedHint);
  state.score += points;
  state.results.push({ item, chosen: choiceIndex, isCorrect, points });

  showFeedback(item, choiceIndex, isCorrect);
}
```

- [ ] **Step 6: 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `통과 15, 실패 0`. 브라우저에서 스피드 모드로 2단계 확인 항목 중 "스피드"로 시작하는 항목을 확인한다. 결과 목록의 "시간 초과" 표시는 Task 13에서 만든다.

---

### Task 12: 힌트 모드

**Files:**
- Modify: `index.html` (문제 화면)
- Modify: `style.css` (끝에 추가)
- Modify: `script.js` (`renderQuestion`, `showFeedback`, 새 `useHint`, `init`)

**Interfaces:**
- Consumes: `pickHintRemovals(item)`, `state.usedHint`, `scoreAnswer(isCorrect, usedHint)`
- Produces: `useHint()`. HTML id `hint-button`. 클래스 `removed`.

- [ ] **Step 1: 힌트 버튼을 추가한다** (`index.html`의 `<div id="choice-buttons" class="button-list"></div>` 아래)

```html
      <button id="hint-button" type="button" class="hint-button" hidden>힌트 (오답 2개 지우기)</button>
```

- [ ] **Step 2: 스타일을 추가한다** (`style.css` 끝)

```css
.hint-button { width: 100%; text-align: center; margin-bottom: 16px; }
.choice.removed { opacity: 0.35; text-decoration: line-through; }
```

- [ ] **Step 3: `renderQuestion`을 통째로 바꾼다**

```js
function renderQuestion() {
  const item = state.round[state.index];
  state.answered = false;
  state.usedHint = false;
  renderStatus();
  $("question-text").textContent = item.question;

  const list = $("choice-buttons");
  list.replaceChildren();
  item.choices.forEach((text, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.textContent = text;
    button.addEventListener("click", () => handleAnswer(i));
    list.append(button);
  });

  const hintButton = $("hint-button");
  hintButton.hidden = state.mode !== "hint";
  hintButton.disabled = false;
  hintButton.textContent = "힌트 (오답 2개 지우기)";

  $("feedback").hidden = true;

  if (state.mode === "speed") {
    startTimer();
  } else {
    $("status-timer").hidden = true;
  }
}
```

- [ ] **Step 4: `useHint`를 추가한다** (5. 화면 조작 구역의 `handleAnswer` 앞)

```js
function useHint() {
  if (state.answered || state.usedHint) return;
  state.usedHint = true;

  const item = state.round[state.index];
  const buttons = $("choice-buttons").querySelectorAll("button");
  pickHintRemovals(item).forEach(i => {
    buttons[i].disabled = true;
    buttons[i].classList.add("removed");
  });

  const hintButton = $("hint-button");
  hintButton.disabled = true;
  hintButton.textContent = "힌트 사용함";
}
```

- [ ] **Step 5: `showFeedback`을 통째로 바꾼다** (답한 뒤 힌트 버튼을 잠급니다)

```js
function showFeedback(item, choiceIndex, isCorrect) {
  $("choice-buttons").querySelectorAll("button").forEach((button, i) => {
    button.disabled = true;
    if (i === item.answer) {
      button.classList.add("correct");
      addMark(button, "정답");
    } else if (i === choiceIndex) {
      button.classList.add("wrong");
      addMark(button, "오답");
    }
  });
  $("hint-button").disabled = true;

  const verdict = $("feedback-verdict");
  verdict.textContent = isCorrect ? "정답!" : choiceIndex === null ? "시간 초과" : "오답";
  verdict.className = isCorrect ? "verdict verdict-correct" : "verdict verdict-wrong";
  $("feedback-explanation").textContent = item.explanation;
  const source = $("feedback-source");
  source.textContent = item.source.name;
  source.href = item.source.url;
  renderStatus();

  const isLast = state.index === state.round.length - 1;
  $("next-button").textContent = isLast ? "결과 보기" : "다음";
  $("feedback").hidden = false;
  $("next-button").focus();
}
```

- [ ] **Step 6: `init`에 힌트 버튼 연결을 추가한다** (`$("mode-back-button")…` 줄 아래)

```js
  $("hint-button").addEventListener("click", useHint);
```

- [ ] **Step 7: 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `통과 15, 실패 0`. 브라우저에서 힌트 모드로 2단계 확인 항목 중 "힌트"로 시작하는 항목을 확인한다. "(힌트 0.5점)" 표시는 Task 13에서 만든다.

---

### Task 13: 틀린 문제 다시 풀기

**Files:**
- Modify: `index.html` (결과 화면)
- Modify: `style.css` (끝에 추가)
- Modify: `script.js` (`renderStatus`, `handleAnswer`, `renderResult`, 새 `startRetry`, `init`)

**Interfaces:**
- Consumes: `wrongItems(results)`, `prepareRound(items)`, `state.isRetry`
- Produces: `startRetry()`. HTML id `retry-button`. `renderResult`는 다시 풀기 결과, 시간 초과, 힌트 0.5점을 표시한다.

- [ ] **Step 1: 다시 풀기 버튼을 추가한다** (`index.html`의 `<div class="button-row">` 바로 아래, `again-button` 앞)

```html
        <button id="retry-button" type="button" class="primary" hidden>틀린 문제 다시 풀기</button>
```

- [ ] **Step 2: 스타일을 추가한다** (`style.css` 끝)

```css
.result-score.result-score-retry { font-size: 1.1rem; }
```

- [ ] **Step 3: `renderStatus`, `handleAnswer`, `renderResult`를 통째로 바꾼다**

```js
function renderStatus() {
  const retryLabel = state.isRetry ? " · 다시 풀기" : "";
  $("status-label").textContent = `${state.category} · ${MODE_LABELS[state.mode]}${retryLabel}`;
  $("status-progress").textContent = `${state.index + 1} / ${state.round.length}`;
  $("status-score").textContent = state.isRetry ? "채점 안 함" : `점수 ${state.score}`;
}
```

```js
// choiceIndex가 null이면 시간 초과입니다. 다시 풀기는 채점하지 않습니다.
function handleAnswer(choiceIndex) {
  if (state.answered) return;
  state.answered = true;
  stopTimer();

  const item = state.round[state.index];
  const isCorrect = choiceIndex === item.answer;
  const points = state.isRetry ? 0 : scoreAnswer(isCorrect, state.usedHint);
  state.score += points;
  state.results.push({ item, chosen: choiceIndex, isCorrect, points });

  showFeedback(item, choiceIndex, isCorrect);
}
```

```js
function renderResult() {
  const total = state.round.length;
  const correct = state.results.filter(result => result.isCorrect).length;

  $("result-title").textContent = state.isRetry ? "다시 풀기 결과" : "결과";
  const score = $("result-score");
  score.textContent = state.isRetry
    ? `${total}문제 중 ${correct}문제 맞힘 · 이번 판 점수 ${state.score} / ${QUESTIONS_PER_CATEGORY}`
    : `${state.score} / ${total}`;
  score.classList.toggle("result-score-retry", state.isRetry);
  $("result-practice-note").hidden = state.mode !== "practice";
  $("retry-button").hidden = !(state.mode === "practice" && correct < total);

  const list = $("result-list");
  list.replaceChildren();
  state.results.forEach(result => {
    const li = document.createElement("li");
    li.className = result.isCorrect ? "result-correct" : "result-wrong";
    const question = document.createElement("p");
    question.textContent = result.item.question;
    const detail = document.createElement("p");
    detail.className = "result-detail";
    const verdict = result.isCorrect ? "정답" : result.chosen === null ? "시간 초과" : "오답";
    const hintNote = result.points === 0.5 ? " (힌트 0.5점)" : "";
    detail.textContent = `${verdict}${hintNote} · 정답: ${result.item.choices[result.item.answer]}`;
    li.append(question, detail);
    list.append(li);
  });

  showScreen("screen-result");
}
```

- [ ] **Step 4: `startRetry`를 추가한다** (5. 화면 조작 구역의 `startRound` 뒤)

```js
// 방금 끝난 판(또는 다시 풀기)에서 틀린 문항만 섞어서 다시 냅니다. 점수는 그대로 둡니다.
function startRetry() {
  const items = wrongItems(state.results);
  if (items.length === 0) return;
  state.round = prepareRound(items);
  state.index = 0;
  state.results = [];
  state.isRetry = true;
  showScreen("screen-question");
  renderQuestion();
}
```

- [ ] **Step 5: `init`에 다시 풀기 버튼 연결을 추가한다** (`$("hint-button")…` 줄 아래)

```js
  $("retry-button").addEventListener("click", startRetry);
```

- [ ] **Step 6: 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `통과 15, 실패 0`, 종료 코드 0.

- [ ] **Step 7: 2단계 "브라우저에서 직접 확인할 항목"을 실행자가 먼저 확인한다**

내장 브라우저로 열 수 있으면 목록을 따라 확인하고 결과를 보고한다. 그다음 **멈추고** 사용자에게 2단계 확인을 요청한다.

---

# 3단계: 점수 저장과 순위표

**만들 것**
- 결과 화면의 이름 입력과 [기록 저장](스피드·힌트 모드만)
- 순위표 화면(모드 2개 × 카테고리 4개, 표마다 상위 5건)
- 시작 화면의 [순위표 보기]
- localStorage 읽기·쓰기와 실패 처리
- `script.js`에 `insertRecord`, `parseLeaderboard`, `isValidName` 등과 그 점검

**완료 기준**
- [ ] 스피드·힌트 모드 결과를 이름과 함께 저장한다. 연습 모드와 다시 풀기 결과에는 저장칸이 없다.
- [ ] 순위표에 모드 × 카테고리별 상위 5건이 점수 내림차순, 동점이면 먼저 세운 기록 순으로 나온다.
- [ ] 새로 고침한 뒤에도 기록이 남아 있다.
- [ ] 저장소를 쓸 수 없으면 "기록을 저장할 수 없음"이 나오고 게임은 계속 된다. 저장된 값이 깨져 있으면 빈 순위표로 시작한다.
- [ ] 점검 명령이 `실패 0`으로 끝난다.

**브라우저에서 직접 확인할 항목**
- [ ] 시작 화면에 [순위표 보기]가 있고, 처음 열면 표 8개가 모두 "기록 없음"이다.
- [ ] 연습 모드 결과 화면에는 이름 입력칸이 없다.
- [ ] 스피드 모드 결과 화면에 이름 입력칸과 [기록 저장]이 있다. 이름이 비어 있거나 공백뿐이면 [기록 저장]이 눌리지 않는다. 11자 이상은 입력되지 않는다.
- [ ] 이름을 넣고 [기록 저장]을 누르면 순위표 화면으로 가고, "스피드 · (카테고리)" 표에 순위, 이름, 점수, 오늘 날짜가 보인다.
- [ ] 힌트 모드도 같게 저장되고 "힌트 · (카테고리)" 표에 들어간다. 7.5 같은 점수가 그대로 보인다.
- [ ] 같은 표에 기록을 6번 이상 저장하면 5건만 남고, 점수가 높은 순이다. 같은 점수면 먼저 저장한 기록이 위다.
- [ ] 브라우저를 새로 고침하거나 닫았다 열어도 기록이 남아 있다.
- [ ] 개발자 도구 콘솔에서 `localStorage.setItem("quiz.leaderboard", "{깨짐")`을 실행하고 새로 고침한 뒤 순위표를 열면, 오류 없이 모든 표가 "기록 없음"이다.
- [ ] 콘솔에서 `Storage.prototype.setItem = () => { throw new Error("막힘"); }`을 실행한 뒤 스피드 모드 한 판을 끝내고 저장하면 "기록을 저장할 수 없음"이 나오고, [처음으로]로 계속 게임할 수 있다. 확인 후 새로 고침하면 원래대로 돌아간다.
- [ ] 이름에 `<b>굵게</b>`를 넣어 저장하면 순위표에 글자 그대로 보인다(굵게 바뀌지 않는다).
- [ ] 휴대폰 폭(360px)에서 순위표와 이름 입력칸이 가로 스크롤 없이 보인다.

---

### Task 14: 순위표 순수 로직

**Files:**
- Modify: `script.js` (1. 상수, 2. 순수 로직 구역 끝, 3. 자체 점검 구역 끝)

**Interfaces:**
- Consumes: 없음
- Produces:
  - 상수 `LEADERBOARD_SIZE = 5`, `NAME_MAX_LENGTH = 10`
  - `leaderboardKey(mode, category): string`: `"speed|한국사"` 꼴
  - `normalizeName(name): string`: 앞뒤 공백 제거
  - `isValidName(name): boolean`: 공백 제거 후 1~10자
  - `insertRecord(list, record): record[]`: 새 배열, 점수 내림차순·동점 시 `date` 오름차순, 상위 5건. `record`는 `{name: string, score: number, date: ISO string}`
  - `isValidRecord(record): boolean`
  - `parseLeaderboard(raw: string | null): {[key]: record[]}`: 깨진 값은 `{}`, 잘못된 기록은 버림
  - `formatDate(iso): string`: 기기 시간대 기준 `YYYY-MM-DD`, 잘못된 값은 `""`

- [ ] **Step 1: 실패하는 점검을 쓴다** (3. 자체 점검 구역 끝에 추가)

```js
selfTest("insertRecord는 점수 내림차순, 동점이면 먼저 세운 기록을 위에 둔다", check => {
  const list = [
    { name: "가", score: 7, date: "2026-09-01T00:00:00.000Z" },
    { name: "나", score: 9, date: "2026-09-02T00:00:00.000Z" }
  ];
  const result = insertRecord(list, { name: "다", score: 7, date: "2026-09-03T00:00:00.000Z" });
  check(result.map(r => r.name).join() === "나,가,다", `순서 ${result.map(r => r.name).join()}`);
  check(list.length === 2, "원본이 바뀜");
});

selfTest("insertRecord는 상위 5건만 남긴다", check => {
  let list = [];
  for (let n = 1; n <= 6; n++) {
    list = insertRecord(list, { name: `p${n}`, score: n, date: `2026-09-0${n}T00:00:00.000Z` });
  }
  check(list.length === 5, `길이 ${list.length}`);
  check(list[0].name === "p6" && list[4].name === "p2", `순서 ${list.map(r => r.name).join()}`);
  const after = insertRecord(list, { name: "low", score: 1, date: "2026-09-09T00:00:00.000Z" });
  check(!after.some(r => r.name === "low"), "5위보다 낮은 기록이 들어감");
});

selfTest("insertRecord는 0.5점 단위 점수도 정렬한다", check => {
  const result = insertRecord(
    [{ name: "a", score: 7, date: "2026-09-01T00:00:00.000Z" }],
    { name: "b", score: 7.5, date: "2026-09-02T00:00:00.000Z" }
  );
  check(result[0].name === "b", "7.5점이 7점보다 아래");
});

selfTest("parseLeaderboard는 깨진 값을 빈 순위표로 본다", check => {
  check(JSON.stringify(parseLeaderboard(null)) === "{}", "null");
  check(JSON.stringify(parseLeaderboard("{깨짐")) === "{}", "JSON 오류");
  check(JSON.stringify(parseLeaderboard("[1,2]")) === "{}", "배열");
  const parsed = parseLeaderboard(JSON.stringify({
    "speed|과학": [{ name: "a", score: 5, date: "2026-09-01T00:00:00.000Z" }, { name: 3 }],
    "hint|과학": "잘못됨"
  }));
  check(parsed["speed|과학"].length === 1, "잘못된 기록이 남음");
  check(!("hint|과학" in parsed), "배열이 아닌 값이 남음");
});

selfTest("isValidName은 앞뒤 공백을 뺀 1~10자만 허용한다", check => {
  check(!isValidName("   "), "공백만 있는 이름이 통과됨");
  check(isValidName(" 민지 "), "민지가 거부됨");
  check(isValidName("가나다라마바사아자차"), "10자가 거부됨");
  check(!isValidName("가나다라마바사아자차카"), "11자가 통과됨");
  check(normalizeName("  민지 ") === "민지", "앞뒤 공백이 남음");
});

selfTest("leaderboardKey와 formatDate", check => {
  check(leaderboardKey("speed", "한국사") === "speed|한국사", "키 형식");
  check(formatDate(new Date(2026, 8, 19, 23, 30).toISOString()) === "2026-09-19", "날짜 형식");
  check(formatDate("잘못됨") === "", "잘못된 날짜");
});
```

- [ ] **Step 2: 점검이 실패하는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: 새 점검 6개가 `예외: … is not defined`로 실패. `통과 15, 실패 6`, 종료 코드 1.

- [ ] **Step 3: 상수를 추가한다** (1. 상수 구역 끝)

```js
const LEADERBOARD_SIZE = 5;
const NAME_MAX_LENGTH = 10;
```

- [ ] **Step 4: 구현한다** (2. 순수 로직 구역 끝에 추가)

```js
function leaderboardKey(mode, category) {
  return `${mode}|${category}`;
}

function normalizeName(name) {
  return String(name).trim();
}

function isValidName(name) {
  const length = [...normalizeName(name)].length;
  return length >= 1 && length <= NAME_MAX_LENGTH;
}

// 점수 내림차순, 동점이면 먼저 세운 기록(date가 이른 쪽)이 위. 상위 LEADERBOARD_SIZE건만 남깁니다.
function insertRecord(list, record) {
  return [...list, record]
    .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date))
    .slice(0, LEADERBOARD_SIZE);
}

function isValidRecord(record) {
  return Boolean(record) && typeof record.name === "string" &&
    Number.isFinite(record.score) && typeof record.date === "string";
}

// 저장된 문자열을 순위표 객체로 바꿉니다. 깨진 값은 빈 순위표로 봅니다.
function parseLeaderboard(raw) {
  if (raw === null || raw === undefined) return {};
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return {};
  const clean = {};
  for (const [key, list] of Object.entries(data)) {
    if (!Array.isArray(list)) continue;
    clean[key] = list.filter(isValidRecord).reduce(insertRecord, []);
  }
  return clean;
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = n => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
```

- [ ] **Step 5: 점검이 통과하는지 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `통과 21, 실패 0`, 종료 코드 0.

---

### Task 15: 기록 저장과 순위표 화면

**Files:**
- Modify: `index.html` (시작 화면, 결과 화면, 새 순위표 화면)
- Modify: `style.css` (끝에 추가)
- Modify: `script.js` (상수, `renderResult`, 새 함수, `init`)

**Interfaces:**
- Consumes: `leaderboardKey`, `normalizeName`, `isValidName`, `insertRecord`, `parseLeaderboard`, `formatDate`, `MODE_LABELS`, `CATEGORIES`
- Produces: `LEADERBOARD_KEY = "quiz.leaderboard"`, `RANKED_MODES = ["speed", "hint"]`, `loadLeaderboard(): {ok: boolean, data}`, `saveLeaderboard(data): boolean`, `saveRecord(event)`, `renderLeaderboard()`. HTML id `leaderboard-button`, `record-form`, `record-name`, `save-button`, `record-error`, `screen-leaderboard`, `leaderboard-error`, `leaderboard-tables`, `leaderboard-home-button`.

- [ ] **Step 1: 시작 화면에 순위표 버튼을 추가한다** (`index.html`의 `<div id="category-buttons" class="button-list"></div>` 아래)

```html
      <button id="leaderboard-button" type="button">순위표 보기</button>
```

- [ ] **Step 2: 결과 화면에 저장 양식을 추가한다** (`index.html`의 `<ol id="result-list" class="result-list"></ol>` 바로 위)

```html
      <form id="record-form" class="record-form" hidden>
        <label for="record-name">이름 (1~10자)</label>
        <div class="record-row">
          <input id="record-name" type="text" maxlength="10" autocomplete="nickname">
          <button id="save-button" type="submit" class="primary" disabled>기록 저장</button>
        </div>
        <p id="record-error" class="notice notice-error" hidden>기록을 저장할 수 없음</p>
      </form>
```

- [ ] **Step 3: 순위표 화면을 추가한다** (`index.html`의 `screen-result` 섹션 `</section>` 바로 뒤)

```html

    <section id="screen-leaderboard" class="screen" hidden>
      <h2>순위표</h2>
      <p id="leaderboard-error" class="notice notice-error" hidden>기록을 저장할 수 없음</p>
      <div id="leaderboard-tables"></div>
      <button id="leaderboard-home-button" type="button">처음으로</button>
    </section>
```

- [ ] **Step 4: 스타일을 추가한다** (`style.css` 끝)

```css
#leaderboard-button { width: 100%; text-align: center; }

.record-form { margin: 16px 0; }
.record-form label { display: block; margin-bottom: 8px; }
.record-row { display: flex; gap: 8px; }
.record-row input {
  flex: 1;
  min-width: 0;
  font: inherit;
  min-height: 48px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
}
.record-row button { flex: 0 0 auto; }

.board { margin-bottom: 20px; }
.board h3 { font-size: 1rem; margin: 0 0 8px; }
.board table { width: 100%; border-collapse: collapse; background: var(--surface); }
.board th, .board td { border-bottom: 1px solid var(--border); padding: 8px; text-align: left; font-size: 0.95rem; }
.board td:nth-child(2) { overflow-wrap: anywhere; }
.board-empty { color: var(--muted); margin: 0; }
```

- [ ] **Step 5: 상수를 추가한다** (1. 상수 구역 끝)

```js
const LEADERBOARD_KEY = "quiz.leaderboard";
const RANKED_MODES = ["speed", "hint"];
```

- [ ] **Step 6: 저장소 함수와 화면 함수를 추가한다** (5. 화면 조작 구역의 `onCategoryChosen` 앞)

```js
// 저장소를 못 쓰면 ok: false. 값이 깨져 있으면 ok: true, 빈 순위표입니다.
function loadLeaderboard() {
  try {
    return { ok: true, data: parseLeaderboard(localStorage.getItem(LEADERBOARD_KEY)) };
  } catch (error) {
    return { ok: false, data: {} };
  }
}

function saveLeaderboard(data) {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    return false;
  }
}

function saveRecord(event) {
  event.preventDefault();
  const name = $("record-name").value;
  if (!isValidName(name)) return;

  const loaded = loadLeaderboard();
  const key = leaderboardKey(state.mode, state.category);
  const data = loaded.data;
  data[key] = insertRecord(data[key] || [], {
    name: normalizeName(name),
    score: state.score,
    date: new Date().toISOString()
  });

  if (!loaded.ok || !saveLeaderboard(data)) {
    $("record-error").hidden = false;
    return;
  }
  $("save-button").disabled = true;
  renderLeaderboard();
}

function renderLeaderboard() {
  const loaded = loadLeaderboard();
  $("leaderboard-error").hidden = loaded.ok;

  const container = $("leaderboard-tables");
  container.replaceChildren();
  for (const mode of RANKED_MODES) {
    for (const category of CATEGORIES) {
      const block = document.createElement("section");
      block.className = "board";
      const title = document.createElement("h3");
      title.textContent = `${MODE_LABELS[mode]} · ${category}`;
      block.append(title);

      const records = loaded.data[leaderboardKey(mode, category)] || [];
      if (records.length === 0) {
        const empty = document.createElement("p");
        empty.className = "board-empty";
        empty.textContent = "기록 없음";
        block.append(empty);
      } else {
        const table = document.createElement("table");
        const head = table.createTHead().insertRow();
        ["순위", "이름", "점수", "날짜"].forEach(text => {
          const th = document.createElement("th");
          th.scope = "col";
          th.textContent = text;
          head.append(th);
        });
        const body = table.createTBody();
        records.forEach((record, i) => {
          const row = body.insertRow();
          [String(i + 1), record.name, String(record.score), formatDate(record.date)].forEach(text => {
            row.insertCell().textContent = text;
          });
        });
        block.append(table);
      }
      container.append(block);
    }
  }

  showScreen("screen-leaderboard");
}
```

- [ ] **Step 7: `renderResult`를 통째로 바꾼다** (저장 양식 표시를 더합니다)

```js
function renderResult() {
  const total = state.round.length;
  const correct = state.results.filter(result => result.isCorrect).length;

  $("result-title").textContent = state.isRetry ? "다시 풀기 결과" : "결과";
  const score = $("result-score");
  score.textContent = state.isRetry
    ? `${total}문제 중 ${correct}문제 맞힘 · 이번 판 점수 ${state.score} / ${QUESTIONS_PER_CATEGORY}`
    : `${state.score} / ${total}`;
  score.classList.toggle("result-score-retry", state.isRetry);
  $("result-practice-note").hidden = state.mode !== "practice";
  $("retry-button").hidden = !(state.mode === "practice" && correct < total);

  const canRecord = !state.isRetry && RANKED_MODES.includes(state.mode);
  $("record-form").hidden = !canRecord;
  $("record-error").hidden = true;
  $("save-button").disabled = !isValidName($("record-name").value);

  const list = $("result-list");
  list.replaceChildren();
  state.results.forEach(result => {
    const li = document.createElement("li");
    li.className = result.isCorrect ? "result-correct" : "result-wrong";
    const question = document.createElement("p");
    question.textContent = result.item.question;
    const detail = document.createElement("p");
    detail.className = "result-detail";
    const verdict = result.isCorrect ? "정답" : result.chosen === null ? "시간 초과" : "오답";
    const hintNote = result.points === 0.5 ? " (힌트 0.5점)" : "";
    detail.textContent = `${verdict}${hintNote} · 정답: ${result.item.choices[result.item.answer]}`;
    li.append(question, detail);
    list.append(li);
  });

  showScreen("screen-result");
}
```

- [ ] **Step 8: `init`에 연결을 추가한다** (`$("retry-button")…` 줄 아래)

```js
  $("leaderboard-button").addEventListener("click", renderLeaderboard);
  $("leaderboard-home-button").addEventListener("click", () => showScreen("screen-start"));
  $("record-form").addEventListener("submit", saveRecord);
  $("record-name").addEventListener("input", () => {
    $("save-button").disabled = !isValidName($("record-name").value);
  });
```

- [ ] **Step 9: 확인한다**

Run:
```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console,location:{search:'?test'}});for(const f of ['questions.js','script.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c,{filename:f});process.exitCode=c.selfTestFailed?1:0"
```
Expected: `통과 21, 실패 0`, 종료 코드 0.

- [ ] **Step 10: 3단계 "브라우저에서 직접 확인할 항목"을 실행자가 먼저 확인한다**

내장 브라우저로 열 수 있으면 목록을 따라 확인하고 결과를 보고한다. 그다음 **멈추고** 사용자에게 3단계 확인을 요청한다.

---

## PRD 대응표

| PRD 항목 | 태스크 |
|---|---|
| 1.5 파일 4개, `file://`, 360px | 전역 제약, Task 8 |
| 2.1 연습(1점, 순위표 문구) | Task 8, Task 10 |
| 2.1 틀린 문제 다시 풀기 | Task 9, Task 13 |
| 2.2 스피드(15초, 멈춤, 시간 초과) | Task 11, Task 13(결과 표시) |
| 2.3 힌트(1번, 오답 2개, 0.5점) | Task 9, Task 12, Task 13(결과 표시) |
| 2.4 섞기, 틀리면 0점, 도중 이탈은 버림 | Task 2, Task 8 |
| 3.1~3.5 화면 | Task 8, 10, 13, 15 |
| 4.1 데이터 형식 | Task 1, Task 3 |
| 4.2·4.3 문항 규칙과 검수 | Task 4~7 |
| 4.4 순위표 저장 | Task 14, Task 15 |
| 5.4 데이터 오류 표시 | Task 8 |
| 7 `?test` 자체 점검 | Task 1 이후 모든 태스크 |
