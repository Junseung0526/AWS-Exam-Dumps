'use strict';
// Concept diagrams (inline SVG, themed via CSS classes in style.css).
// `match` is tested against a question's text to auto-attach the diagram to its explanation.
const box = (x, y, w, h, cls = 'd-box', r = 8) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="${cls}"/>`;
const tx = (x, y, s, cls = 'd-t', anchor = 'middle') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${s}</text>`;
const lines = (x, y, arr, cls = 'd-s', dy = 16, anchor = 'middle') => arr.map((s, i) => tx(x, y + i * dy, s, cls, anchor)).join('');
const arrow = (x1, y1, x2, y2, cls = 'd-arrow') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}" marker-end="url(#ah)"/>`;
const svg = (w, h, body) => `<svg viewBox="0 0 ${w} ${h}" class="diagram" role="img"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" class="d-head"/></marker></defs>${body}</svg>`;

window.DIAGRAMS = [
{
  id: 'waf', module: 2, title: 'Well-Architected Framework 6가지 원칙(기둥)',
  caption: '지붕(워크로드)을 6개의 기둥이 받친다. 기둥별 설계 원칙은 시험에서 "이 시나리오는 어떤 기둥인가?" 형태로 출제된다.',
  match: /Well-Architected|원칙\(기둥\)|운영 우수성|지속 가능성|성능 효율성|비용 최적화 원칙/,
  svg: (() => {
    const P = [
      ['운영 우수성', '⚙️', ['시스템 실행·모니터링', '절차 지속 개선', '워크로드를 코드로']],
      ['보안', '🔒', ['강력한 자격 증명', '추적 가능성', '모든 계층 보안', '데이터 보호']],
      ['신뢰성', '🛟', ['빠르게 복구', '수요 동적 충족', '중단 완화']],
      ['성능 효율성', '🚀', ['효율적 리소스', '고급 기술 대중화', '최적 기술 사용']],
      ['비용 최적화', '💰', ['효율성 측정', '불필요 비용 제거', '소비 모델 채택', '관리형 서비스']],
      ['지속 가능성', '🌱', ['목표 설정', '사용률 극대화', '효율적 HW/SW', '다운스트림 축소']],
    ];
    let b = `<polygon points="40,62 460,10 880,62" class="d-acc-fill"/>` + tx(460, 50, 'AWS Well-Architected 워크로드', 'd-t d-white');
    P.forEach(([n, ic, ps], i) => {
      const x = 46 + i * 140;
      b += box(x, 74, 128, 236, 'd-box') + tx(x + 64, 102, ic, 'd-icon') + tx(x + 64, 128, n, 'd-t d-bold')
        + `<line x1="${x + 12}" y1="140" x2="${x + 116}" y2="140" class="d-line"/>` + lines(x + 64, 162, ps, 'd-s', 22);
    });
    return svg(920, 340, b + box(30, 316, 860, 16, 'd-acc-fill', 4));
  })(),
},
{
  id: 'globalinfra', module: 2, title: 'AWS 글로벌 인프라: 리전 · 가용 영역 · 엣지',
  caption: '리전 ⊃ 가용 영역(2개 이상) ⊃ 데이터 센터(1개 이상). 리전 간 자동 복제 없음. 엣지 로케이션/리전 엣지 캐시는 CloudFront 캐싱, 로컬 영역은 리전의 확장.',
  match: /리전|가용 영역\(AZ\)에 대한|가용 영역의 특성|엣지 로케이션|엣지 캐시|로컬 영역|POP/,
  svg: svg(900, 330,
    box(20, 20, 560, 290, 'd-region', 14) + tx(40, 46, '🌏 리전 (예: ap-northeast-2)', 'd-t d-bold', 'start')
    + [0, 1, 2].map(i => {
      const x = 40 + i * 180;
      return box(x, 64, 164, 200, 'd-az', 10) + tx(x + 82, 88, `가용 영역 ${'abc'[i]}`, 'd-t d-bold')
        + box(x + 16, 104, 132, 46, 'd-box', 6) + tx(x + 82, 132, '🏢 데이터 센터', 'd-s')
        + box(x + 16, 160, 132, 46, 'd-box', 6) + tx(x + 82, 188, '🏢 데이터 센터', 'd-s')
        + tx(x + 82, 236, '독립 전력·네트워크', 'd-m');
    }).join('')
    + `<line x1="204" y1="164" x2="220" y2="164" class="d-link"/><line x1="384" y1="164" x2="400" y2="164" class="d-link"/>`
    + tx(300, 290, 'AZ 간: 고속 프라이빗 링크로 연결 · 복원력을 위해 AZ 간 복제 권장', 'd-m')
    + box(610, 20, 270, 90, 'd-box') + tx(745, 48, '📍 로컬 영역', 'd-t d-bold') + lines(745, 72, ['리전의 확장, 대도시 가까이', '10ms 미만 지연(게임·미디어)'], 'd-s')
    + box(610, 125, 270, 90, 'd-box') + tx(745, 153, '⚡ 엣지 로케이션 (POP)', 'd-t d-bold') + lines(745, 177, ['인기 콘텐츠를 사용자 가까이', 'CloudFront·Route 53'], 'd-s')
    + box(610, 230, 270, 80, 'd-box') + tx(745, 256, '🗄️ 리전 엣지 캐시', 'd-t d-bold') + lines(745, 280, ['오리진 ↔ 엣지 사이', '덜 인기 있는 콘텐츠 캐싱'], 'd-s')
    + arrow(580, 65, 606, 65)),
},
{
  id: 'iameval', module: 3, title: 'IAM 정책 평가 로직',
  caption: '모든 적용 가능한 정책을 함께 평가. 명시적 거부 > 명시적 허용 > 암시적(기본) 거부.',
  match: /명시적|암시적|Deny|평가|StringNotEquals|NotIpAddress/,
  svg: svg(860, 250,
    box(20, 95, 150, 60, 'd-box') + lines(95, 120, ['요청 도착', '(모든 정책 평가)'], 'd-s')
    + arrow(170, 125, 210, 125)
    + `<polygon points="290,70 370,125 290,180 210,125" class="d-q"/>` + lines(290, 120, ['명시적', '거부?'], 'd-t d-bold')
    + arrow(290, 180, 290, 212) + box(230, 212, 120, 32, 'd-bad', 6) + tx(290, 233, '❌ 거부', 'd-t d-white') + tx(305, 200, '예', 'd-m', 'start')
    + arrow(370, 125, 420, 125) + tx(395, 116, '아니요', 'd-m')
    + `<polygon points="500,70 580,125 500,180 420,125" class="d-q"/>` + lines(500, 120, ['명시적', '허용?'], 'd-t d-bold')
    + arrow(500, 180, 500, 212) + box(440, 212, 120, 32, 'd-ok', 6) + tx(500, 233, '✅ 허용', 'd-t d-white') + tx(515, 200, '예', 'd-m', 'start')
    + arrow(580, 125, 640, 125) + tx(610, 116, '아니요', 'd-m')
    + box(640, 95, 200, 60, 'd-bad', 8) + lines(740, 120, ['❌ 암시적 거부', '(기본값 = 거부)'], 'd-t d-white')
    + tx(430, 30, '규칙: Deny 한 줄이라도 있으면 Allow를 이긴다', 'd-t d-bold')),
},
{
  id: 'iamentities', module: 3, title: 'IAM 사용자 · 그룹 · 역할 · 정책',
  caption: '정책은 그룹에 붙이고 사용자를 그룹에 넣는 것이 모범 사례. 역할은 임시 자격 증명(EC2 → S3, 크로스 계정).',
  match: /IAM 그룹|IAM 역할|IAM 사용자|크로스 계정|루트 사용자|액세스 키|자격 증명 기반|리소스 기반/,
  svg: svg(900, 300,
    box(20, 20, 420, 260, 'd-region', 12) + tx(40, 44, '장기 액세스: 사용자 + 그룹', 'd-t d-bold', 'start')
    + box(40, 64, 170, 60, 'd-acc-soft') + lines(125, 88, ['📄 IAM 정책 (JSON)', 'Effect·Action·Resource'], 'd-s')
    + arrow(125, 124, 125, 152) + tx(140, 142, '연결', 'd-m', 'start')
    + box(40, 152, 170, 50, 'd-box') + tx(125, 182, '👥 IAM 그룹 (개발팀)', 'd-t')
    + [0, 1, 2].map(i => box(240, 140 + i * 44, 180, 36, 'd-box', 6) + tx(330, 163 + i * 44, `👤 사용자 ${i + 1}`, 'd-s') + `<line x1="210" y1="177" x2="240" y2="${158 + i * 44}" class="d-line"/>`).join('')
    + tx(230, 268, '팀원이 바뀌면 그룹에서 추가/제거만', 'd-m')
    + box(460, 20, 420, 260, 'd-region', 12) + tx(480, 44, '임시 액세스: IAM 역할 (수임)', 'd-t d-bold', 'start')
    + box(480, 70, 120, 56, 'd-box') + lines(540, 94, ['🖥️ EC2 앱', '(역할 연결)'], 'd-s')
    + arrow(600, 98, 650, 98) + box(650, 66, 100, 64, 'd-acc-soft') + lines(700, 92, ['🎭 역할', '임시 자격'], 'd-s')
    + arrow(750, 98, 790, 98) + box(790, 70, 76, 56, 'd-box') + tx(828, 103, '🪣 S3', 'd-s')
    + box(480, 160, 120, 56, 'd-box') + lines(540, 184, ['👤 계정 B', '사용자'], 'd-s')
    + arrow(600, 188, 650, 188) + box(650, 156, 100, 64, 'd-acc-soft') + lines(700, 182, ['🎭 계정 A', '역할'], 'd-s')
    + arrow(750, 188, 790, 188) + box(790, 160, 76, 56, 'd-box') + tx(828, 193, '리소스', 'd-s')
    + tx(670, 254, '장기 액세스 키를 코드에 저장하지 않는다', 'd-m')),
},
{
  id: 's3classes', module: 4, title: 'S3 스토리지 등급 한눈에 보기',
  caption: '오른쪽으로 갈수록 저장 비용↓, 검색 시간·요금↑. 패턴을 모르면 Intelligent-Tiering, 재생성 가능한 데이터면 One Zone-IA.',
  match: /스토리지 등급|Standard-IA|Glacier|Intelligent-Tiering|One Zone|수명 주기/,
  svg: (() => {
    const C = [
      ['S3 Standard', '자주 액세스', '≥3 AZ', '즉시', '-'],
      ['Intelligent-Tiering', '패턴 모름 → 자동', '≥3 AZ', '즉시', '검색 요금 없음'],
      ['Standard-IA', '드물게', '≥3 AZ', '즉시(ms)', '최소 30일'],
      ['One Zone-IA', '드물게, 재생성 가능', '1 AZ', '즉시(ms)', '최소 30일'],
      ['Glacier Instant', '분기 1회 수준', '≥3 AZ', '밀리초', '최소 90일'],
      ['Glacier Flexible', '아카이브', '≥3 AZ', '분~시간', '최소 90일'],
      ['Glacier Deep Archive', '장기 보관(규정)', '≥3 AZ', '최대 12시간', '최소 180일'],
    ];
    let b = `<defs><linearGradient id="g1" x1="0" x2="1"><stop offset="0" class="d-g1"/><stop offset="1" class="d-g2"/></linearGradient></defs>`
      + `<rect x="20" y="16" width="880" height="26" rx="13" fill="url(#g1)"/>` + tx(30, 34, '자주 액세스 · 저장 비용 높음', 'd-s d-white', 'start') + tx(890, 34, '아카이브 · 저장 비용 낮음 · 검색 느림', 'd-s d-white', 'end');
    C.forEach(([n, use, az, rt, min], i) => {
      const x = 20 + i * 126;
      b += box(x, 56, 118, 190, i === 1 ? 'd-acc-soft' : 'd-box') + tx(x + 59, 82, n.split(' ')[0], 'd-t d-bold') + tx(x + 59, 100, n.split(' ').slice(1).join(' '), 'd-t d-bold')
        + lines(x + 59, 128, [use, '', '가용 영역: ' + az, '검색: ' + rt, min], 'd-s', 22);
    });
    return svg(920, 262, b);
  })(),
},
{
  id: 's3versioning', module: 4, title: 'S3 버전 관리와 수명 주기',
  caption: '버전 관리: 덮어쓰기·삭제해도 이전 버전 보존(삭제 마커). 수명 주기: 전환(등급 이동) + 만료(삭제)를 자동화.',
  match: /버전 관리|삭제 마커|덮어쓰|수명 주기|만료/,
  svg: svg(900, 300,
    box(20, 20, 400, 262, 'd-region', 12) + tx(40, 44, '버전 관리가 켜진 버킷의 photo.gif', 'd-t d-bold', 'start')
    + box(60, 64, 320, 40, 'd-bad', 6) + tx(220, 89, '🏷️ 삭제 마커 (현재 버전) → GET 시 404', 'd-s d-white')
    + box(60, 112, 320, 40, 'd-acc-soft', 6) + tx(220, 137, 'ID 121245 · 덮어쓴 새 버전', 'd-s')
    + box(60, 160, 320, 40, 'd-box', 6) + tx(220, 185, 'ID 111111 · 최초 업로드', 'd-s')
    + lines(220, 226, ['DELETE(버전 ID 없음) → 삭제 마커만 추가, 복구 가능', 'DELETE + 버전 ID → 영구 삭제 (버킷 소유자)'], 'd-m', 20)
    + box(450, 20, 430, 262, 'd-region', 12) + tx(470, 44, '수명 주기 규칙 예시 (로그)', 'd-t d-bold', 'start')
    + box(470, 80, 110, 60, 'd-box') + lines(525, 104, ['Standard', '0~30일'], 'd-s')
    + arrow(580, 110, 604, 110) + box(604, 80, 110, 60, 'd-box') + lines(659, 104, ['Standard-IA', '~1년'], 'd-s')
    + arrow(714, 110, 738, 110) + box(738, 80, 120, 60, 'd-box') + lines(798, 104, ['Glacier', '~7년'], 'd-s')
    + arrow(798, 140, 798, 180) + box(738, 180, 120, 40, 'd-bad', 6) + tx(798, 205, '🗑️ 만료(삭제)', 'd-s d-white')
    + tx(620, 172, '전환 작업 →', 'd-m') + tx(620, 250, '앱 수정 없이 자동으로 비용 절감', 'd-m')),
},
{
  id: 'ec2pricing', module: 5, title: 'EC2 요금 옵션 비교',
  caption: '꾸준한 장기 워크로드 = Savings Plans/예약 인스턴스, 중단 허용 = 스팟, 예측 불가·단기 = 온디맨드, 라이선스·규정 = 전용 호스트.',
  match: /요금 옵션|온디맨드|스팟|예약 인스턴스|Savings Plans|전용 호스트|전용 인스턴스|최저 비용/,
  svg: (() => {
    const R = [
      ['온디맨드', 100, '약정 없음 · 초 단위 과금', '단기·예측 불가·테스트'],
      ['Savings Plans', 35, '1·3년 시간당 사용 금액 약정', '꾸준한 사용, 유연성'],
      ['예약 인스턴스', 30, '1·3년 특정 구성 약정', '안정적 장기 워크로드'],
      ['스팟 인스턴스', 10, '남는 용량, 2분 전 회수 알림', '중단 허용 배치·분석'],
      ['전용 호스트', 120, '물리 서버 전체 사용', 'BYOL 라이선스·규정 준수'],
    ];
    let b = tx(20, 26, '상대 비용 (온디맨드 = 100 기준, 대략적 비교)', 'd-t d-bold', 'start');
    R.forEach(([n, v, d, u], i) => {
      const y = 44 + i * 50;
      b += tx(150, y + 22, n, 'd-t d-bold', 'end') + `<rect x="160" y="${y + 6}" width="${v * 2.6}" height="24" rx="5" class="${i === 3 ? 'd-ok' : i === 4 ? 'd-bad' : 'd-acc-fill'}"/>`
        + tx(170 + v * 2.6, y + 23, d, 'd-s', 'start') + tx(890, y + 23, '→ ' + u, 'd-m', 'end');
    });
    return svg(900, 300, b);
  })(),
},
{
  id: 'ec2storage', module: 5, title: 'EC2 스토리지: EBS · 인스턴스 스토어 · EFS',
  caption: 'EBS = 지속형 블록 볼륨(1개 AZ), 인스턴스 스토어 = 임시(중지 시 삭제), EFS = 여러 인스턴스가 공유하는 파일 시스템.',
  match: /EBS|인스턴스 스토어|EFS|볼륨|AMI/,
  svg: svg(900, 260,
    [['💽 Amazon EBS', ['블록 스토리지, 네트워크 연결', '인스턴스 중지해도 데이터 유지', '같은 AZ에서 연결, 스냅샷→S3', 'gp3/io2(부팅 가능) · st1/sc1(부팅 불가)']],
     ['⚡ 인스턴스 스토어', ['호스트에 물리적으로 붙은 디스크', '매우 빠른 I/O', '중지·종료 시 데이터 삭제(임시)', '캐시·버퍼·스크래치용']],
     ['📁 Amazon EFS', ['관리형 NFS 파일 시스템', '여러 AZ의 수천 인스턴스가 동시 공유', '자동으로 용량 확장', 'Linux 워크로드 공유 콘텐츠']]]
    .map(([t, ls], i) => box(20 + i * 296, 20, 280, 220, i === 1 ? 'd-acc-soft' : 'd-box') + tx(160 + i * 296, 54, t, 'd-t d-bold') + lines(160 + i * 296, 92, ls, 'd-s', 30)).join('')),
},
{
  id: 'rdsha', module: 6, title: 'RDS 다중 AZ vs 읽기 전용 복제본',
  caption: '다중 AZ = 동기 복제 + 자동 장애 조치(가용성). 읽기 전용 복제본 = 비동기 복제 + 읽기 분산(확장성), 수동 승격 가능. Aurora는 복제본 최대 15개.',
  match: /다중 AZ|Multi-AZ|읽기 전용 복제본|장애 조치|Aurora|RDS 프록시|연결 풀링/,
  svg: svg(900, 300,
    box(20, 20, 420, 262, 'd-region', 12) + tx(230, 46, '🛟 다중 AZ 배포 = 고가용성', 'd-t d-bold')
    + box(40, 70, 170, 70, 'd-acc-soft') + lines(125, 98, ['기본 DB (AZ-a)', '읽기 + 쓰기'], 'd-s')
    + box(250, 70, 170, 70, 'd-box') + lines(335, 98, ['대기 DB (AZ-b)', '트래픽 처리 X'], 'd-s')
    + arrow(210, 105, 248, 105, 'd-arrow d-strong') + tx(230, 160, '동기식 복제', 'd-t d-bold')
    + lines(230, 196, ['기본 장애 시 → 대기로 자동 장애 조치', '엔드포인트(DNS) 그대로 유지'], 'd-s', 22)
    + box(460, 20, 420, 262, 'd-region', 12) + tx(670, 46, '📈 읽기 전용 복제본 = 읽기 확장', 'd-t d-bold')
    + box(480, 70, 150, 70, 'd-acc-soft') + lines(555, 98, ['기본 DB', '쓰기'], 'd-s')
    + [0, 1, 2].map(i => box(700, 60 + i * 48, 160, 40, 'd-box', 6) + tx(780, 85 + i * 48, `복제본 ${i + 1} (읽기)`, 'd-s') + `<line x1="630" y1="105" x2="700" y2="${80 + i * 48}" class="d-line d-dash"/>`).join('')
    + tx(665, 220, '비동기식 복제', 'd-t d-bold') + lines(670, 248, ['읽기 트래픽 분산 · 독립 DB로 수동 승격'], 'd-s')),
},
{
  id: 'dbchoose', module: 6, title: '어떤 데이터베이스를 고를까?',
  caption: '시나리오의 데이터 형태·액세스 패턴 키워드로 고른다. 관계형/트랜잭션 → RDS·Aurora, 키-값·서버리스 → DynamoDB, 분석 → Redshift.',
  match: /DynamoDB|Neptune|Redshift|DocumentDB|Keyspaces|MemoryDB|Timestream|QLDB|목적별|관계형|NoSQL|GSI|LSI|글로벌 테이블|DMS|SCT/,
  svg: (() => {
    const D = [
      ['정형·트랜잭션·SQL', 'RDS / Aurora', 'd-acc-soft'], ['키-값·대규모·서버리스', 'DynamoDB', 'd-acc-soft'],
      ['데이터 웨어하우스·분석', 'Redshift', 'd-box'], ['관계·추천·그래프', 'Neptune', 'd-box'],
      ['JSON 문서(MongoDB)', 'DocumentDB', 'd-box'], ['와이드 컬럼(Cassandra)', 'Keyspaces', 'd-box'],
      ['초저지연 인 메모리', 'MemoryDB', 'd-box'], ['시계열(IoT·지표)', 'Timestream', 'd-box'], ['변경 불가 원장', 'QLDB', 'd-box'],
    ];
    let b = '';
    D.forEach(([k, s, c], i) => {
      const x = 20 + (i % 3) * 296, y = 16 + Math.floor(i / 3) * 84;
      b += box(x, y, 280, 72, c) + tx(x + 140, y + 30, k, 'd-s') + tx(x + 140, y + 54, s, 'd-t d-bold');
    });
    return svg(900, 270, b);
  })(),
},
{
  id: 'vpc', module: 7, title: 'VPC 기본 구조 (2개 AZ, 퍼블릭/프라이빗 서브넷)',
  caption: '퍼블릭 서브넷 라우팅: 0.0.0.0/0 → IGW. 프라이빗 서브넷 라우팅: 0.0.0.0/0 → (같은 AZ의) NAT 게이트웨이. NAT GW는 퍼블릭 서브넷에 둔다.',
  match: /VPC|서브넷|NAT|인터넷 게이트웨이|라우팅 테이블|탄력적 IP|배스천/,
  svg: svg(920, 420,
    tx(460, 22, '🌐 인터넷', 'd-t d-bold') + arrow(460, 30, 460, 54, 'd-arrow d-strong')
    + box(395, 56, 130, 34, 'd-acc-fill', 6) + tx(460, 78, '인터넷 게이트웨이', 'd-s d-white')
    + box(20, 100, 880, 304, 'd-region', 14) + tx(36, 122, 'VPC 10.0.0.0/16 (리전)', 'd-t d-bold', 'start')
    + [0, 1].map(i => {
      const x = 40 + i * 440;
      return box(x, 132, 400, 262, 'd-az', 10) + tx(x + 200, 152, `가용 영역 ${'ab'[i]}`, 'd-t d-bold')
        + box(x + 14, 162, 372, 96, 'd-pub', 8) + tx(x + 26, 182, `퍼블릭 서브넷 10.0.${i * 2}.0/24`, 'd-s d-bold', 'start')
        + box(x + 26, 194, 110, 50, 'd-box', 6) + lines(x + 81, 214, ['🔀 NAT GW', '+ 탄력적 IP'], 'd-s')
        + box(x + 150, 194, 110, 50, 'd-box', 6) + lines(x + 205, 214, ['🖥️ 웹/배스천', '퍼블릭 IP'], 'd-s')
        + tx(x + 326, 214, 'RT: 0.0.0.0/0', 'd-m') + tx(x + 326, 232, '→ IGW', 'd-m')
        + box(x + 14, 272, 372, 110, 'd-priv', 8) + tx(x + 26, 292, `프라이빗 서브넷 10.0.${i * 2 + 1}.0/24`, 'd-s d-bold', 'start')
        + box(x + 26, 304, 110, 50, 'd-box', 6) + lines(x + 81, 324, ['🖥️ 앱 서버', '사설 IP만'], 'd-s')
        + box(x + 150, 304, 110, 50, 'd-box', 6) + lines(x + 205, 324, ['🗄️ DB', '사설 IP만'], 'd-s')
        + tx(x + 326, 324, 'RT: 0.0.0.0/0', 'd-m') + tx(x + 326, 342, '→ NAT GW', 'd-m')
        + arrow(x + 81, 304, x + 81, 246, 'd-arrow d-strong');
    }).join('')
    + `<line x1="460" y1="90" x2="460" y2="132" class="d-line d-dash"/>`),
},
{
  id: 'sgnacl', module: 7, title: '보안 그룹 vs 네트워크 ACL (다중 방어 계층)',
  caption: 'NACL = 서브넷의 문지기(스테이트리스, 허용+거부, 번호 순 평가). 보안 그룹 = 인스턴스의 문지기(스테이트풀, 허용만, 전체 규칙 평가).',
  match: /보안 그룹|네트워크 ACL|NACL|스테이트|거부하는 규칙|Network Firewall/,
  svg: svg(900, 300,
    box(20, 20, 520, 262, 'd-region', 12) + tx(40, 44, 'VPC', 'd-t d-bold', 'start')
    + box(50, 60, 460, 200, 'd-pub', 10) + tx(70, 82, '서브넷', 'd-s d-bold', 'start')
    + `<rect x="50" y="60" width="460" height="200" rx="10" class="d-wall"/>` + tx(280, 76, '🧱 네트워크 ACL (서브넷 경계)', 'd-s d-bold')
    + [0, 1].map(i => `<rect x="${90 + i * 220}" y="110" width="160" height="120" rx="10" class="d-wall2"/>` + box(110 + i * 220, 140, 120, 70, 'd-box') + lines(170 + i * 220, 168, ['🖥️ EC2', '🛡️ 보안 그룹'], 'd-s', 22)).join('')
    + box(560, 20, 330, 262, 'd-box', 12)
    + tx(725, 48, '비교', 'd-t d-bold')
    + lines(640, 80, ['', '범위', '상태', '규칙', '평가'], 'd-s d-bold', 34)
    + lines(740, 80, ['보안 그룹', '인스턴스', '스테이트풀', '허용만', '모든 규칙'], 'd-s', 34)
    + lines(840, 80, ['NACL', '서브넷', '스테이트리스', '허용+거부', '번호 순'], 'd-s', 34)
    + tx(725, 262, '특정 IP 차단 = NACL 거부 규칙', 'd-m')),
},
{
  id: 'endpoints', module: 7, title: 'VPC 엔드포인트: 게이트웨이 vs 인터페이스',
  caption: '게이트웨이 엔드포인트: S3·DynamoDB 전용, 라우팅 테이블 경로, 무료. 인터페이스 엔드포인트: PrivateLink ENI, 대부분 서비스, 유료.',
  match: /엔드포인트|PrivateLink|인터넷을 거치지 않고/,
  svg: svg(900, 250,
    box(20, 20, 400, 210, 'd-region', 12) + tx(220, 46, '게이트웨이 엔드포인트', 'd-t d-bold')
    + box(40, 70, 130, 60, 'd-priv') + lines(105, 94, ['프라이빗', '서브넷 EC2'], 'd-s')
    + arrow(170, 100, 250, 100, 'd-arrow d-strong') + tx(210, 90, 'RT 경로', 'd-m')
    + box(250, 70, 150, 60, 'd-acc-soft') + lines(325, 94, ['🪣 S3 /', 'DynamoDB'], 'd-s')
    + lines(220, 168, ['S3·DynamoDB만 지원', '추가 비용 없음 · 처리량 제한 없음'], 'd-s', 22)
    + box(480, 20, 400, 210, 'd-region', 12) + tx(680, 46, '인터페이스 엔드포인트 (PrivateLink)', 'd-t d-bold')
    + box(500, 70, 130, 60, 'd-priv') + lines(565, 94, ['프라이빗', '서브넷 EC2'], 'd-s')
    + arrow(630, 100, 690, 100, 'd-arrow d-strong') + box(690, 74, 60, 52, 'd-box', 6) + tx(720, 105, 'ENI', 'd-s')
    + arrow(750, 100, 780, 100, 'd-arrow d-strong') + box(780, 70, 84, 60, 'd-acc-soft') + lines(822, 94, ['SQS·KMS', '등'], 'd-s')
    + lines(680, 168, ['대부분의 AWS 서비스 지원', '시간당·데이터 요금 발생'], 'd-s', 22)),
},
];
