// capabilities.ts
// Source of truth for the six fields and the graph + /field/[slug] pages.
// Voice inherits from EN CV v2.7: material-honest construction language,
// but the register shifts here from credentialing → teaching. Each field
// is a discipline a learner could choose to enter. Theses are publishable
// as essay framings; essays themselves expand in the dedicated page route.
// Numbers and sanitization rules inherit from Brand Spine v1.4.

export interface Artifact {
  title: string;
  detail: string;
}

export interface Capability {
  id: string;            // node id in cytoscape + route slug under /field/:id
  label: string;         // short display label (lowercase rendered)
  labelZh: string;       // CN short label, used on /zh/ routes
  number: string;        // small index (01..06) for visual rhythm
  eyebrow: string;       // mono micro-label — the angle on this field
  eyebrowZh: string;     // CN eyebrow
  thesis: string;        // the framing sentence — appears as subtitle / lede
  thesisZh: string;      // CN thesis sentence
  essay: string;         // short panel essay (80–150 words) — long form lives on /field/:id
  artifacts: Artifact[]; // 2–3 anchored work items
  reinforces: string[];  // edges (ids it reinforces)
}

export const CENTER_ID = 'center';

export const CAPABILITIES: Capability[] = [
  {
    id: 'design',
    label: 'Design',
    labelZh: '设计',
    number: '01',
    eyebrow: 'On Role and Technique',
    eyebrowZh: '关于角色与手艺',
    thesis:
      'On what design is actually for — and how it operates across abstract, physics, chemistry, and people.',
    thesisZh:
      '设计不是视觉，是判断的延后。同时在抽象、物理、化学、人四层上运作。',
    essay:
      'Design is not styling. It is the discipline of arranging — material, structure, system, behaviour — toward an objective written down before the styling begins. DFX runs underneath every product. CMF operates as problem-solving, not as the styling layer. Pattern as engineering. Garment construction as graphic logic.\n\nThe domains craft operates in are not interchangeable. Abstract reasoning gives you the brief. Physics tells you what the material will and will not do. Chemistry tells you what the dye and the bond and the wash will do over time. People tell you what the object has to mean.\n\nThe role of design is to hold all four at once.',
    artifacts: [
      {
        title: 'AERLYTE — 110-gram waterproof jacket',
        detail:
          'Fabric third-party certified at UTS Jiangsu against GB/T 32614-2023 Class I — the highest grade of the Chinese hardshell standard. ≥20,000 mm hydrostatic head. 16,800 g/m²/24h MVTR. ILAC-MRA recognised.',
      },
      {
        title: 'Beneunder — structural hats',
        detail:
          '2020–2021. Approximately 70% of company hat-category GSV during tenure. Becker, Skyline (天際), Trajectory (軌跡), Double-Sided (雙面) — category leads since.',
      },
      {
        title: 'Yimeng Technology — pattern as engineering',
        detail:
          '2017–2018. 30 direct reports. 3D garment construction, 3D pattern engineering, automated cutting, smart-fit mirror integration.',
      },
    ],
    reinforces: ['aesthetic', 'innovation'],
  },
  {
    id: 'innovation',
    label: 'Innovation',
    labelZh: '创新',
    number: '02',
    eyebrow: 'On Implementation',
    eyebrowZh: '关于落地实施',
    thesis: 'What innovation actually is. How it actually gets implemented.',
    thesisZh: '创新是站得住的判断，加上按节奏发货的系统，加上熬得住的耐心。',
    essay:
      'Innovation is not novelty. Novelty is performance — a new shape, a new feature, a press release. Innovation is durable new value: a thing the market did not have, that the market keeps wanting once it appears.\n\nImplementation is the hard part. Most innovation programmes fail at the implementation seam — the gap between an interesting idea and a production system that ships it on cadence. The Cool Skin breakout at Banana-IN was not a clever product alone; it was a defended thesis, a re-engineered decision framework, and a development calendar with a 10–18 month lead over competitors.\n\nIf you cannot ship it on rhythm, you have not innovated. You have demonstrated.',
    artifacts: [
      {
        title: 'Banana-IN — Cool Skin / [-°C] line',
        detail:
          '~¥600M RMB omnichannel GMV in twelve months, +80% over plan. ¥2.5B → ¥13B valuation lift at Banana-IN over the same period (consistent with publicly reported funding-round disclosures, 36Kr, 2021). 10–18 month dev lead over competitors.',
      },
      {
        title: 'AERLYTE — customer-funded brand model',
        detail:
          'A breakout in a category an authoritative competitive survey identified as currently unoccupied. 50% lifetime repeat on zero advertising spend. Demand outran small-team production capacity; customers refused refunds and waited for the next run.',
      },
    ],
    reinforces: ['design', 'ai'],
  },
  {
    id: 'unspoken-rules',
    label: 'Unspoken Rules',
    labelZh: '不成文规则',
    number: '03',
    eyebrow: 'On Culture and Latent Expectations',
    eyebrowZh: '关于文化与隐性期待',
    thesis:
      'Culture, latent expectations, habitual concepts. The unwritten operating layer everyone navigates by.',
    thesisZh:
      '合同上没写、地面上全在的那层规则。三个市场频道同时拎住，谁也不压扁谁。',
    essay:
      'Every market runs on rules nobody writes down. What time a meeting actually starts. Who speaks first. Which compromise reads as gracious and which reads as weak. What a price says about a brand. What a colour says about a season. What it means when a supplier nods.\n\nThe unspoken layer is not a soft skill. It is a substrate. Misread it and your perfectly engineered product fails for reasons your spreadsheet cannot explain.\n\nThree operating registers held without flattening any of them — US fashion-tech, Chinese DTC, Southeast Asian growth markets. Trilingual at native fluency, in registers that carry different decision cadences. The work is to read the room you actually walked into, not the room you expected.',
    artifacts: [
      {
        title: 'Three-market operating arc',
        detail:
          'Hong Kong. Shenzhen. Shanghai. Tokyo. Paris. A decade of senior product, merchandising, and founder work — instantiated on the corporate side, and on the founder side at AERLYTE.',
      },
      {
        title: 'AELFRIC EDEN — US + DE markets',
        detail:
          'Cross-border DTC operated from Shenzhen. 900+ SKUs per season under direct strategic oversight. Different cultural registers held in one merchandising calendar.',
      },
    ],
    reinforces: ['aesthetic', 'infrastructure'],
  },
  {
    id: 'ai',
    label: 'AI',
    labelZh: 'AI',
    number: '04',
    eyebrow: 'On the Shift Below Us',
    eyebrowZh: '关于脚下正在发生的变化',
    thesis:
      'The world is moving below us. How the industry is shifting. Why we need what we need. How to approach it.',
    thesisZh:
      'AI 不是功能，是基础设施。智能变便宜之后，你的钟表会换一种走法。',
    essay:
      'AI is not a feature to add. It is the substrate the next decade of operating work will run on. The shift is happening underneath the floor — in how decisions get made, how trends get read, how categories get composed, how customers get reached. The companies that treat it as a tool will be priced by the companies that treat it as infrastructure.\n\nThe approach is not to import a templated framework. Every company\'s clockwork is different. Off-the-shelf trend tools, BI templates, and merchandising playbooks do not survive contact with a real operating environment. The portable capability is diagnostic and constructive: read what a specific organisation needs, then build the system that fits its clockwork.\n\nClosed-loop. Research feeds assortment. Assortment feeds performance. Performance feeds back into research. Linear systems fail quietly; closed-loop systems surface failure by design.',
    artifacts: [
      {
        title: '18% paid-media CPC reduction',
        detail:
          'BI-led launch targeting and bespoke trend system built at DIER. ~13.6% reduction in paid-traffic dependency on new launches by Q1 2025.',
      },
      {
        title: '84% / 54% launch success rate',
        detail:
          'November and December 2024 at DIER. 50+ units sold within 30 days of launch. 15–30% improvement in launch success rates by Q1 2025.',
      },
    ],
    reinforces: ['innovation', 'infrastructure'],
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure',
    labelZh: '基础设施',
    number: '05',
    eyebrow: 'On Rules and Measuring Success',
    eyebrowZh: '关于规则与衡量成功',
    thesis:
      'Why rules matter. Why knowing success is more important than the path forward.',
    thesisZh:
      '没写下成功定义的职能是一台跑步机。先写终点线，再开始跑。',
    essay:
      'Rules are not bureaucracy. Rules are the load-bearing structure that lets a team operate at scale without re-deciding every question. The function — five teams, a reporting cadence, a decision pipeline — is what lets creative, data, and operations stop hand-waving at one another.\n\nThe more important discipline is measurement. Most organisations cannot tell you what success looks like in advance. They can tell you what they want; they cannot tell you what would prove they got it. A path forward without a definition of success is a treadmill.\n\nKnow what success looks like before you start. Wire the measurement before you build the function. The function will adapt; the measurement will hold.',
    artifacts: [
      {
        title: 'Research and analytics function, built from scratch',
        detail:
          'The organisation had no formal research, analytics, or trend infrastructure. Department-wide data governance → restructured BI layer for real-time reporting and cross-functional visibility → closed-loop trend system.',
      },
      {
        title: 'Excess inventory cut to 2%',
        detail:
          'Tiered dynamic markdown system, indexed to aging, historical conversion, and inventory holding cost. End-of-Q4 excess: 12% total — 10% safety stock, 2% actual unsold.',
      },
      {
        title: 'Five functional teams stood up',
        detail:
          'Merchandising. Research and analytics. Trend R&D. Product development. Product engineering. 30–35 direct reports.',
      },
    ],
    reinforces: ['ai', 'unspoken-rules'],
  },
  {
    id: 'aesthetic',
    label: 'Aesthetic',
    labelZh: '审美',
    number: '06',
    eyebrow: 'On Sovereignty of Taste',
    eyebrowZh: '关于品味的不可转让',
    thesis:
      'Senses and curation are what we have for ourselves. Individuality matters to every person and to no one.',
    thesisZh:
      '审美是第六感。数据稀薄那一刻替你下手的那层判断。个性对个人成立，对群体不成立。',
    essay:
      'Aesthetic is the one operating layer you cannot outsource. The market will tell you what to make. The customer will tell you what they want. The brief will tell you the objective. None of them will tell you whether a thing is right. That is yours.\n\nIndividuality is a paradox. It matters to every person — each one believes their taste is theirs. It matters to no one in the aggregate — every individual taste is, statistically, common. The work is to honour both truths. Build for the person who thinks they are alone; price the run for the cohort that turns out to share the same sense.\n\nAERLYTE — ultralight technical apparel built for Asian weather, Asian body, Asian everyday. Restraint over spectacle. Material-honest construction. The brand reads more like friendship than like e-commerce. Life Unbound.',
    artifacts: [
      {
        title: 'AERLYTE — 365-day active customer base',
        detail:
          '50% lifetime repeat on zero advertising spend. ¥509 new-buyer AOV. 67.6% T1 / NT1 buyers. Demand outran small-team production capacity; customers refused refunds and waited for the next run.',
      },
      {
        title: 'BEYOND International Tech Expo (Macau)',
        detail:
          'Asian Startup Award Shortlist, 2024. KAIREN Design / AERLYTE.',
      },
    ],
    reinforces: ['design', 'unspoken-rules'],
  },
];

// Edges expressed once (we dedupe in the graph script).
export interface EdgeSeed {
  from: string;
  to: string;
}
export const EDGE_SEEDS: EdgeSeed[] = CAPABILITIES.flatMap((c) =>
  c.reinforces.map((to) => ({ from: c.id, to })),
);

// Center node text — small, no portrait, no emphasis. The centre is not the subject.
export const CENTER = {
  id: CENTER_ID,
  label: 'Caelan H.C.Y',
  eyebrow: 'Malaysian · Shenzhen',
};
