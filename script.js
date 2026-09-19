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

// ===== 4. 상태 =====

// ===== 5. 화면 조작 =====

// ===== 6. 시작 =====
if (typeof location !== "undefined" && /[?&]test\b/.test(location.search)) runSelfTests();
