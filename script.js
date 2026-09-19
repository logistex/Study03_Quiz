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
