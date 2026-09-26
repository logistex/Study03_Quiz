"use strict";

// ===== 1. 상수 =====
const CATEGORIES = ["한국사", "세계지리", "과학", "예술과 문화"];
const CATEGORY_PREFIX = { "한국사": "kh", "세계지리": "wg", "과학": "sc", "예술과 문화": "ac" };
const QUESTIONS_PER_CATEGORY = 10;
const MODE_LABELS = { practice: "연습", speed: "스피드", hint: "힌트" };
const SPEED_SECONDS = 15;
const LEADERBOARD_SIZE = 5;
const NAME_MAX_LENGTH = 10;

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

// 힌트로 지울 오답 보기 번호 2개를 무작위로 고릅니다.
function pickHintRemovals(item, random = Math.random) {
  const wrong = [0, 1, 2, 3].filter(i => i !== item.answer);
  return shuffle(wrong, random).slice(0, 2).sort((a, b) => a - b);
}

function wrongItems(results) {
  return results.filter(result => !result.isCorrect).map(result => result.item);
}

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
  stopTimer();
  document.querySelectorAll(".screen").forEach(screen => {
    screen.hidden = screen.id !== id;
  });
  window.scrollTo(0, 0);
}

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

function renderStatus() {
  const retryLabel = state.isRetry ? " · 다시 풀기" : "";
  $("status-label").textContent = `${state.category} · ${MODE_LABELS[state.mode]}${retryLabel}`;
  $("status-progress").textContent = `${state.index + 1} / ${state.round.length}`;
  $("status-score").textContent = state.isRetry ? "채점 안 함" : `점수 ${state.score}`;
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

function onCategoryChosen(category) {
  state.category = category;
  $("mode-title").textContent = `${category} · 모드를 고르세요`;
  showScreen("screen-mode");
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
  document.querySelectorAll(".mode-button").forEach(button => {
    button.addEventListener("click", () => startRound(state.category, button.dataset.mode));
  });
  $("mode-back-button").addEventListener("click", () => showScreen("screen-start"));
  $("hint-button").addEventListener("click", useHint);
  $("retry-button").addEventListener("click", startRetry);
}

// ===== 6. 시작 =====
if (typeof location !== "undefined" && /[?&]test\b/.test(location.search)) runSelfTests();
if (typeof document !== "undefined") init();
