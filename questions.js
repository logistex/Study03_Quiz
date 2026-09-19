// 상식 퀴즈 문항. 작성 규칙은 PRD.md 4.2, 형식은 IMPL-PLAN.md "문항 작성 절차"를 따릅니다.
const QUESTIONS = [
  // ----- 한국사 -----
  {
    id: "kh-01",
    category: "한국사",
    question: "광개토대왕의 업적을 기리기 위해 광개토대왕릉비를 세운 고구려의 왕은?",
    choices: ["장수왕", "소수림왕", "고국원왕", "미천왕"],
    answer: 0,
    explanation: "아들 장수왕이 414년(장수왕 3)에 세웠다.",
    source: { name: "한국민족문화대백과사전 「광개토왕릉비」", url: "https://encykorea.aks.ac.kr/Article/E0005058" }
  },
  {
    id: "kh-02",
    category: "한국사",
    question: "698년, 고구려 옛 장수 출신으로 발해를 건국한 인물은?",
    choices: ["대조영", "연개소문", "을지문덕", "대무예"],
    answer: 0,
    explanation: "대조영이 698년에 건국했고, 초기 국호는 진국이었다.",
    source: { name: "한국민족문화대백과사전 「발해」", url: "https://encykorea.aks.ac.kr/Article/E0021626" }
  },
  {
    id: "kh-03",
    category: "한국사",
    question: "918년 궁예를 몰아내고 철원의 포정전에서 즉위해 고려를 세운 인물은?",
    choices: ["왕건", "견훤", "신숭겸", "최승로"],
    answer: 0,
    explanation: "왕건은 918년 즉위해 국호를 고려, 연호를 천수라 했다.",
    source: { name: "한국민족문화대백과사전 「태조」", url: "https://encykorea.aks.ac.kr/Article/E0059032" }
  },
  {
    id: "kh-04",
    category: "한국사",
    question: "고려 고종 때 몽골의 침입을 불력으로 물리치려고 새긴 대장경판(팔만대장경)을 소장한 사찰은?",
    choices: ["해인사", "불국사", "송광사", "통도사"],
    answer: 0,
    explanation: "고종 때 대장도감에서 새긴 이 경판은 합천 해인사에 있다.",
    source: { name: "한국민족문화대백과사전 「합천 해인사 대장경판」", url: "https://encykorea.aks.ac.kr/Article/E0062711" }
  },
  {
    id: "kh-05",
    category: "한국사",
    question: "세종이 1443년에 창제한 훈민정음을 해례본으로 완성해 반포한 해는?",
    choices: ["1446년", "1444년", "1448년", "1450년"],
    answer: 0,
    explanation: "1443년 겨울 창제, 1446년 9월 상순에 해례본이 완성되었다.",
    source: { name: "한국민족문화대백과사전 「훈민정음」", url: "https://encykorea.aks.ac.kr/Article/E0065805" }
  },
  {
    id: "kh-06",
    category: "한국사",
    question: "1592년 한산도 대첩에서 이순신이 모든 전선에 짜게 하여 일본 수군을 무찌른 진법은?",
    choices: ["학익진", "장사진", "어린진", "일자진"],
    answer: 0,
    explanation: "이순신은 학익진을 펼쳐 일본 수군을 크게 무찔렀다.",
    source: { name: "한국민족문화대백과사전 「한산도대첩」", url: "https://encykorea.aks.ac.kr/Article/E0061676" }
  },
  {
    id: "kh-07",
    category: "한국사",
    question: "1776년 정조가 즉위하면서 궐내에 설치한 왕실 도서관이자 학술·정책 연구 기관은?",
    choices: ["규장각", "집현전", "홍문관", "성균관"],
    answer: 0,
    explanation: "규장각은 1776년(정조 즉위년) 3월 궐내에 설치되었다.",
    source: { name: "한국민족문화대백과사전 「규장각」", url: "https://encykorea.aks.ac.kr/Article/E0007273" }
  },
  {
    id: "kh-08",
    category: "한국사",
    question: "1876년 조선과 일본이 강화부에서 맺은 강화도 조약의 정식 명칭은?",
    choices: ["조일수호조규", "제물포 조약", "한성 조약", "을사조약"],
    answer: 0,
    explanation: "정식 명칭은 조일수호조규이며, 병자수호조약이라고도 한다.",
    source: { name: "한국민족문화대백과사전 「강화도조약」", url: "https://encykorea.aks.ac.kr/Article/E0001508" }
  },
  {
    id: "kh-09",
    category: "한국사",
    question: "1919년 3·1 운동 때 발표된 3·1 독립선언서의 초안을 작성한 인물은?",
    choices: ["최남선", "한용운", "손병희", "이광수"],
    answer: 0,
    explanation: "초안은 최남선이 썼고, 한용운은 초고가 완성된 뒤 이의를 냈다.",
    source: { name: "한국민족문화대백과사전 「3·1독립선언서」", url: "https://encykorea.aks.ac.kr/Article/E0026764" }
  },
  {
    id: "kh-10",
    category: "한국사",
    question: "1919년 4월 11일, 대한민국 임시정부가 수립된 도시는?",
    choices: ["상하이", "충칭", "블라디보스토크", "베이징"],
    answer: 0,
    explanation: "대한민국 임시정부는 1919년 4월 11일 중국 상하이에서 수립되었다.",
    source: { name: "한국민족문화대백과사전 「대한민국 임시정부」", url: "https://encykorea.aks.ac.kr/Article/E0015017" }
  },
];
