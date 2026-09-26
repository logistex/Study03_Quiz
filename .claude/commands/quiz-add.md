---
description: 카테고리 4개에 n개씩 새 문항을 만들어 승인 후 questions.js에 넣는다
argument-hint: "[개수 n, 비우면 1]"
allowed-tools: Read, Edit, Grep, Glob, WebFetch, WebSearch, Bash(node:*), Bash(git:*)
---

# 문항 추가

카테고리 4개(`한국사`, `세계지리`, `과학`, `예술과 문화`) **모두에 같은 수로** 새 문항을 만들어, 사용자 승인을 받은 뒤 `questions.js`에 넣는다. 카테고리마다 문항 수가 같아야 `validateQuestions`를 통과한다.

**6단계에서 사용자가 승인하기 전까지 어떤 파일도 고치지 않는다.** 문항을 만들고 출처를 확인하는 동안에는 읽기만 한다.

## 개수

`$ARGUMENTS`를 개수 `n`으로 읽는다. 비어 있으면 1로 본다. 정수가 아니거나 1~5를 벗어나면 이유를 말하고 멈춘다. 만들 문항은 모두 `4 × n`개다.

## 순서

### 1. 기존 문항 파악

```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({});vm.runInContext(fs.readFileSync('questions.js','utf8')+';globalThis.Q=QUESTIONS;',c);const m={};for(const q of c.Q){(m[q.category]=m[q.category]||[]).push(q)}for(const k in m){const v=m[k];console.log('['+k+'] '+v.length+'개, 마지막 id '+v[v.length-1].id);console.log('  주제: '+v.map(q=>q.question.slice(0,24)).join(' / '))}"
```

새 id는 카테고리 접두사(`kh`, `wg`, `sc`, `ac`)에 마지막 번호 다음 수를 두 자리로 붙인다(`kh-11`). 번호가 99를 넘으면 멈추고 알린다.

### 2. 주제 선정

1단계에서 뽑은 주제와 겹치지 않게 카테고리마다 `n`개를 고른다. 주제를 따로 승인받지 않고 바로 3단계로 간다. 난이도는 대학 1학년이 "들어 본 적은 있는" 수준으로 맞춘다(IMPL-PLAN.md "문항 작성 절차").

### 3. 문항 작성

`CLAUDE.md`의 규칙 10개를 하나씩 확인하며 쓴다. 특히 자주 걸리는 것:

- 규칙 1: 정답이 유일한가. 다른 보기가 기준에 따라 정답이 될 여지가 없는가.
- 규칙 2: "가장 ~한"을 쓴다면 기준과 시점을 문제 문장에 넣는다.
- 규칙 7: 오답 3개도 정답과 같은 유형으로, 모르는 사람에게 답이 될 법하게. 연도만 한 자리 바꾼 허수 보기는 쓰지 않는다.
- 규칙 8: 보기 4개의 길이와 형식(단위, 조사, 띄어쓰기)을 맞춘다.
- 규칙 9: 문제 문장을 부정문으로 쓰지 않는다.
- 해설은 한 줄(60자 이내, PRD.md 4.2).

`answer`는 0부터 세는 번호이고, 정답 보기를 `choices[0]`에 두고 `answer: 0`으로 적는다(화면에서 보기 순서는 실행 중에 섞인다).

### 4. 출처 확인 (규칙 4)

문항마다 **WebFetch로 출처를 2곳 이상 실제로 열어** 정답이 되는 값을 대조한다. 필요하면 WebSearch로 두 번째 출처를 찾는다.

- 두 곳의 값이 다르면 그 값은 문제와 해설에 쓰지 않는다. 그 문항은 버리고 다른 주제로 다시 만든다.
- 출처가 열리지 않으면 다른 출처로 바꿔 다시 확인한다.
- `questions.js`에는 기존 형식대로 대표 출처 **1곳만** `source`에 넣는다. 대조한 두 번째 출처는 5단계 승인 화면에만 적는다.

### 5. 승인 요청

만든 문항 `4 × n`개를 문항마다 아래 형식으로 전부 보여 준다.

```
kh-11 | 한국사
문제: (문제 문장)
보기: 1) (정답) ← 정답  2) …  3) …  4) …
해설: (한 줄 해설, N자)
출처: (대표 출처 이름, URL)
대조: (두 번째 출처 이름, URL) — 값 일치 확인
```

표 뒤에 다음을 덧붙인다.

- 버린 주제가 있으면 주제와 버린 이유(출처 불일치, 출처 접근 불가 등)
- 카테고리마다 몇 개씩 늘어 전체가 몇 개가 되는지
- 아직 파일을 고치지 않았다는 확인과, 승인하면 반영하겠다는 안내

사용자가 승인할 때까지 멈춘다. 고쳐 달라고 하면 고쳐서 다시 승인을 받는다.

### 6. 반영 (승인 뒤에만)

1. `content-quiz-add-<YYYYMMDD>` 브랜치를 만든다(`git checkout -b`). 같은 이름이 있으면 뒤에 `-2`를 붙인다.
2. `questions.js`의 카테고리 주석 블록(`// ----- 한국사 -----` 꼴) 안, 그 카테고리 마지막 문항 뒤에 새 문항을 넣는다. 들여쓰기와 속성 순서(`id`, `category`, `question`, `choices`, `answer`, `explanation`, `source`)를 기존 문항과 똑같이 맞춘다.

### 7. 점검

```bash
node -e "const fs=require('fs'),vm=require('vm');const c=vm.createContext({console});vm.runInContext(fs.readFileSync('questions.js','utf8'),c);vm.runInContext(fs.readFileSync('script.js','utf8'),c);console.log('검사:',vm.runInContext('validateQuestions(QUESTIONS).join(\" / \")||\"오류 없음\"',c));const r=vm.runInContext('runSelfTests()',c);if(r.failed>0)process.exit(1)"
```

`/quiz-validate`의 2단계 기계 점검도 함께 돌려 새 문항이 규칙 2·3·8·9·10과 해설 길이에 걸리지 않는지 본다.

하나라도 실패하면 **되돌리고**(`git checkout -- questions.js`) 무엇이 왜 실패했는지 보고한다. 커밋하지 않는다.

### 8. 문서의 현재 수치 갱신

문항 수를 적어 둔 줄을 새 값으로 고친다. 줄 번호가 아니라 문구로 찾는다.

숫자가 든 채로 찾으면 다음 실행 때 못 찾는다. 아래 표의 `…` 자리에는 그때의 숫자가 들어 있으니, 숫자를 뺀 부분으로 grep한다.

| 파일 | 찾을 문구 (`…`는 숫자 자리) |
|---|---|
| `PRD.md` | "지금은 카테고리마다 …문제, 총 …문제입니다." |
| `PRD.md` | "연습 모드 …문제가 섞여서 나온다" |
| `IMPL-PLAN.md` | "카테고리마다 …문항, 총 …문항입니다. 한 판은 한 카테고리의 …문항 전부입니다." |
| `IMPL-PLAN.md` | "…문항(카테고리별 …문항, 출처 확인 완료)" |
| `IMPL-PLAN.md` | "연습 모드 …문제가 섞여서 나온다" |

"카테고리마다 문항 수가 같습니다"처럼 규칙을 적은 문장은 그대로 두고, 숫자만 바꾼다.

### 9. 커밋

브랜치에 커밋한다. 제목은 `content: <카테고리마다 n개> 문항 추가 (총 N문항)` 꼴로 쓰고, 본문에 새 문항 id와 주제를 한 줄씩 적는다.

**master 병합과 푸시는 하지 않는다.** 커밋까지 끝났다고 알리고, 병합과 푸시는 사용자가 따로 지시하도록 남긴다.
