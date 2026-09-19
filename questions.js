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

  // ----- 세계지리 -----
  {
    id: "wg-01",
    category: "세계지리",
    question: "몽골의 수도는?",
    choices: ["울란바토르", "아스타나", "비슈케크", "타슈켄트"],
    answer: 0,
    explanation: "몽골의 수도는 울란바토르(울란바타르)이다.",
    source: { name: "한국민족문화대백과사전 「몽골」", url: "https://encykorea.aks.ac.kr/Article/E0018778" }
  },
  {
    id: "wg-02",
    category: "세계지리",
    question: "티베트 고원에서 시작해 중국, 라오스, 캄보디아 등을 지나 베트남에서 남중국해로 흘러드는 강은?",
    choices: ["메콩강", "양쯔강", "이라와디강", "짜오프라야강"],
    answer: 0,
    explanation: "메콩강은 티베트 고원에서 발원해 베트남 삼각주를 거쳐 남중국해로 흐른다.",
    source: { name: "National Geographic, “The Mekong Delta is in danger as waters dry up”", url: "https://www.nationalgeographic.com/science/article/southeast-asia-most-critical-river-enters-uncharted-waters" }
  },
  {
    id: "wg-03",
    category: "세계지리",
    question: "빙하가 깎아 낸 깊은 골짜기에 바닷물이 들어와 생긴, 노르웨이 해안에 많은 좁고 긴 만은?",
    choices: ["피오르", "리아스", "석호", "삼각주"],
    answer: 0,
    explanation: "피오르는 마지막 빙하기에 빙하가 깎은 골짜기로 이루어진 좁고 깊은 만이다.",
    source: { name: "National Geographic Education 「Fjord」", url: "https://education.nationalgeographic.org/resource/fjord/" }
  },
  {
    id: "wg-04",
    category: "세계지리",
    question: "유럽은 서쪽 아이슬란드에서 동쪽 러시아의 어느 산맥까지 펼쳐져 있는가?",
    choices: ["우랄산맥", "알프스산맥", "카르파티아산맥", "피레네산맥"],
    answer: 0,
    explanation: "유럽은 서쪽 아이슬란드에서 동쪽 러시아의 우랄산맥까지 이어진다.",
    source: { name: "National Geographic Education 「Europe: Physical Geography」", url: "https://education.nationalgeographic.org/resource/europe-physical-geography/" }
  },
  {
    id: "wg-05",
    category: "세계지리",
    question: "키보, 마웬지, 시라 세 화산체로 이루어진 킬리만자로산이 있는 나라는?",
    choices: ["탄자니아", "케냐", "우간다", "에티오피아"],
    answer: 0,
    explanation: "킬리만자로산은 탄자니아에 있으며 키보·마웬지·시라 세 화산체로 이루어져 있다.",
    source: { name: "National Geographic Education 「Kilimanjaro」", url: "https://education.nationalgeographic.org/resource/kilimanjaro/" }
  },
  {
    id: "wg-06",
    category: "세계지리",
    question: "아프리카에서 북쪽의 사하라 사막과 남쪽의 사바나 사이에 띠 모양으로 펼쳐진 반건조 전이 지대는?",
    choices: ["사헬", "마그레브", "칼라하리", "세렝게티"],
    answer: 0,
    explanation: "사헬은 사하라와 사바나 사이에 좁고 길게 이어진 반건조 전이 지대이다.",
    source: { name: "National Geographic Education 「Africa: Physical Geography」", url: "https://education.nationalgeographic.org/resource/africa-physical-geography/" }
  },
  {
    id: "wg-07",
    category: "세계지리",
    question: "안데스산맥의 빙하에서 흘러내린 지류들이 모이는 아마존강이 민물을 쏟아 내는 대양은?",
    choices: ["대서양", "태평양", "인도양", "북극해"],
    answer: 0,
    explanation: "아마존강은 매초 약 20만 9천 ㎥의 민물을 대서양으로 쏟아 낸다.",
    source: { name: "National Geographic Education 「South America: Physical Geography」", url: "https://education.nationalgeographic.org/resource/south-america-physical-geography/" }
  },
  {
    id: "wg-08",
    category: "세계지리",
    question: "1857년 빅토리아 여왕이 캐나다주(Province of Canada)의 정부 소재지로 고른 도시는?",
    choices: ["오타와", "토론토", "몬트리올", "밴쿠버"],
    answer: 0,
    explanation: "1857년 빅토리아 여왕이 오타와를 캐나다주의 정부 소재지로 골랐다.",
    source: { name: "House of Commons of Canada, 「Ottawa as the Seat of Government」", url: "https://www.ourcommons.ca/procedure/procedure-and-practice-3/ch_06_1-e.html" }
  },
  {
    id: "wg-09",
    category: "세계지리",
    question: "1908년 오스트레일리아 의회가 「정부 소재지법」으로 수도를 세울 곳으로 공식 선정한 지역은?",
    choices: ["야스-캔버라", "시드니", "멜버른", "애들레이드"],
    answer: 0,
    explanation: "1908년 정부 소재지법으로 야스-캔버라 지역이 수도 건설지로 정해졌다.",
    source: { name: "Parliamentary Education Office (Australia), 「Seat of Government Act 1908」", url: "https://peo.gov.au/understand-our-parliament/history-of-parliament/history-milestones/australian-parliament-history-timeline/events/seat-of-government-act-1908" }
  },
  {
    id: "wg-10",
    category: "세계지리",
    question: "국제지구물리관측년(1957~58)에 남극에서 활동한 12개국이 워싱턴에서 남극 조약에 서명한 해는?",
    choices: ["1959년", "1945년", "1972년", "1991년"],
    answer: 0,
    explanation: "남극 조약은 1959년 12월 1일 워싱턴에서 12개국이 서명했다.",
    source: { name: "Secretariat of the Antarctic Treaty, 「The Antarctic Treaty」", url: "https://www.ats.aq/e/antarctictreaty.html" }
  },
];
