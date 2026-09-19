"use strict";

// ===== 1. 상수 =====
const CATEGORIES = ["한국사", "세계지리", "과학", "예술과 문화"];
const CATEGORY_PREFIX = { "한국사": "kh", "세계지리": "wg", "과학": "sc", "예술과 문화": "ac" };
const QUESTIONS_PER_CATEGORY = 10;
const MODE_LABELS = { practice: "연습" };

// ===== 2. 순수 로직 =====
// Fisher–Yates. 원본은 두고 섞은 복사본을 돌려줍니다.
function shuffle(array, random = Math.random) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

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

selfTest("실제 문항 데이터(QUESTIONS)가 규칙을 통과한다", check => {
  const errors = validateQuestions(QUESTIONS);
  check(errors.length === 0, errors.join("; "));
});

// ===== 4. 상태 =====
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

// ===== 5. 화면 조작 =====
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

// ===== 6. 시작 =====
if (typeof location !== "undefined" && /[?&]test\b/.test(location.search)) runSelfTests();
if (typeof document !== "undefined") init();
