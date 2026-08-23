export const SEED_WEEK = {
  weekNumber: 1,
  world: 1,
  theme: "JS core (execution context to event loop), DSA Arrays & Hashing (NeetCode 150 order, one problem per day), Spring Boot skeleton to full CRUD, Angular essentials start",
  days: [
    {
      dayNumber: 1,
      date: "2026-08-22",
      label: "Sat, Aug 22",
      objective: "First Arrays & Hashing problem, JS execution model, backend hello-world",
      resources: [
        {name: "Namaste JavaScript (execution context & call stack)", url: "https://www.youtube.com/results?search_query=Namaste+JavaScript+Akshay+Saini+execution+context"},
        {name: "Contains Duplicate (LeetCode)", url: "https://leetcode.com/problems/contains-duplicate/"},
        {name: "Spring Initializr", url: "https://start.spring.io/"}
      ],
      timeBudgetMinutes: 150,
      acceptanceCriteria: [
        "Contains Duplicate solved",
        "Wrote 2-3 sentences, own words: what is the call stack / execution context",
        "Spring Boot project generated, running locally, default endpoint responds"
      ],
      xp: 65
    },
    {
      dayNumber: 2,
      date: "2026-08-23",
      label: "Sun, Aug 23",
      objective: "Finish what Day 1 left open, plus the next Arrays & Hashing problem",
      resources: [
        {name: "Namaste JavaScript (execution context & call stack)", url: "https://www.youtube.com/results?search_query=Namaste+JavaScript+Akshay+Saini+execution+context"},
        {name: "Valid Anagram (LeetCode)", url: "https://leetcode.com/problems/valid-anagram/"},
        {name: "Spring Initializr", url: "https://start.spring.io/"}
      ],
      timeBudgetMinutes: 330,
      acceptanceCriteria: [
        "Wrote 2-3 sentences, own words: what is the call stack / execution context",
        "Spring Boot project generated, running locally, default endpoint responds",
        "Valid Anagram solved"
      ],
      xp: 85
    },
    {
      dayNumber: 3,
      date: "2026-08-24",
      label: "Mon, Aug 24",
      objective: "Hoisting, next problem, first backend endpoint beyond hello-world",
      resources: [
        {name: "Namaste JavaScript (hoisting & scope)", url: "https://www.youtube.com/results?search_query=Namaste+JavaScript+Akshay+Saini+hoisting"},
        {name: "Two Sum (LeetCode)", url: "https://leetcode.com/problems/two-sum/"},
        {name: "Spring: Building a RESTful Web Service", url: "https://spring.io/guides/gs/rest-service/"}
      ],
      timeBudgetMinutes: 150,
      acceptanceCriteria: [
        "Contains Duplicate re-solved cold (revisit due today)",
        "Explain hoisting with one example, unaided",
        "Two Sum solved with the O(n) hash-map approach",
        "POST endpoint added, tested via Postman"
      ],
      xp: 65
    },
    {
      dayNumber: 4,
      date: "2026-08-25",
      label: "Tue, Aug 25",
      objective: "Closures, next problem, database enters the backend",
      resources: [
        {name: "Namaste JavaScript (closures)", url: "https://www.youtube.com/results?search_query=Namaste+JavaScript+Akshay+Saini+closures"},
        {name: "Group Anagrams (LeetCode)", url: "https://leetcode.com/problems/group-anagrams/"},
        {name: "Spring Data JPA guide", url: "https://spring.io/guides/gs/accessing-data-jpa/"}
      ],
      timeBudgetMinutes: 150,
      acceptanceCriteria: [
        "Valid Anagram re-solved cold (revisit due today)",
        "Wrote a closure example unaided",
        "Group Anagrams solved",
        "JPA entity created, connects to DB"
      ],
      xp: 65
    },
    {
      dayNumber: 5,
      date: "2026-08-26",
      label: "Wed, Aug 26",
      objective: "this/prototypes, next problem, backend repository layer",
      resources: [
        {name: "Namaste JavaScript (this keyword & prototypes)", url: "https://www.youtube.com/results?search_query=Namaste+JavaScript+Akshay+Saini+this+keyword+prototype"},
        {name: "Top K Frequent Elements (LeetCode)", url: "https://leetcode.com/problems/top-k-frequent-elements/"}
      ],
      timeBudgetMinutes: 150,
      acceptanceCriteria: [
        "Two Sum re-solved cold (revisit due today)",
        "Top K Frequent Elements solved",
        "GET/POST endpoints working"
      ],
      xp: 65
    },
    {
      dayNumber: 6,
      date: "2026-08-27",
      label: "Thu, Aug 27",
      objective: "Event loop, next problem, CRUD + Angular both move",
      resources: [
        {name: "Namaste JavaScript (event loop)", url: "https://www.youtube.com/results?search_query=Namaste+JavaScript+Akshay+Saini+event+loop"},
        {name: "Product of Array Except Self (LeetCode)", url: "https://leetcode.com/problems/product-of-array-except-self/"},
        {name: "Angular.dev Essentials", url: "https://angular.dev/tutorials"}
      ],
      timeBudgetMinutes: 150,
      acceptanceCriteria: [
        "Group Anagrams re-solved cold (revisit due today)",
        "Product of Array Except Self solved",
        "All 4 CRUD endpoints working",
        "angular.dev module 1 complete"
      ],
      xp: 65
    },
    {
      dayNumber: 7,
      date: "2026-08-28",
      label: "Fri, Aug 28",
      objective: "Last Arrays & Hashing problem this week, Angular continues, light wrap-up",
      resources: [
        {name: "Longest Consecutive Sequence (LeetCode)", url: "https://leetcode.com/problems/longest-consecutive-sequence/"},
        {name: "Angular.dev Essentials", url: "https://angular.dev/tutorials"}
      ],
      timeBudgetMinutes: 150,
      acceptanceCriteria: [
        "Top K Frequent Elements re-solved cold (revisit due today)",
        "Longest Consecutive Sequence solved",
        "angular.dev module 2 complete",
        "Demoed all 4 CRUD endpoints, no notes"
      ],
      xp: 60
    }
  ],
  newProblemsSolved: [
    {problem: "Contains Duplicate", solvedDate: "2026-08-22"}
  ]
};

export const WORLDS = [
  {
    world: 1,
    name: "The Fundamentals Dungeon",
    dateRange: "Aug 21 – Sep 30",
    theme: "JS fundamentals, DSA hashing/two-pointer/sliding-window/trees, Spring Boot CRUD+JPA+auth, Angular refresh, Dutch It rebuild.",
    milestones: [
      "Can explain closures/event loop unaided",
      "~40–50 DSA problems with revisit discipline",
      "Dutch It backend live in Spring Boot with auth",
      "Angular frontend rebuild underway"
    ]
  },
  {
    world: 2,
    name: "The Builder's Forge",
    dateRange: "Sep 29 – Nov 9",
    theme: "DSA graphs/DP/backtracking, System Design fundamentals + classic problems, Node/Express, Docker, Python+FastAPI, AI microservice (RAG), warm-up applications begin.",
    milestones: [
      "System design framework internalized",
      "AI microservice MVP working end-to-end",
      "Resume/LinkedIn live",
      "Warm-up applications sent"
    ]
  },
  {
    world: 3,
    name: "The Gauntlet",
    dateRange: "Nov 10 – Dec 7",
    theme: "DSA + system design mocks, OA practice, full-scale applications, interview loops likely starting.",
    milestones: [
      "All projects portfolio-ready and deployed",
      "~120–150 DSA problems total",
      "2+ system design mocks done",
      "Applications in full swing"
    ]
  },
  {
    world: 4,
    name: "The Boss Fight",
    dateRange: "Dec – Jan",
    theme: "Live interviews, negotiation, closing.",
    milestones: [
      "Offer(s) in hand or in final stages"
    ]
  }
];

export const WEEK_THEMES = [
  {week: 1, theme: "JS core, DSA Arrays & Hashing (NeetCode 150 order), Spring Boot skeleton, Angular start"},
  {week: 2, theme: "JS async, DSA two-pointer/sliding window, Spring Boot JPA relationships, Angular standalone components"},
  {week: 3, theme: "JS prototypes/OOP, DSA sliding window + stacks/queues, Spring Boot JWT start, Angular routing"},
  {week: 4, theme: "DSA linked lists + binary search, Spring Boot JWT complete, Angular reactive forms, Dutch It backend integration"},
  {week: 5, theme: "DSA trees intro, Dutch It Angular rebuild in full swing, Spring Boot validation/exceptions"},
  {week: 6, theme: "DSA trees (BST), Dutch It polish, World 1 Boss Battle"},
  {week: 7, theme: "DSA graphs (BFS/DFS), System design fundamentals, Node/Express crash course"},
  {week: 8, theme: "DSA graphs continued, System design (caching/indexing), Docker basics"},
  {week: 9, theme: "DSA intro DP, System design problem 1 (URL shortener), Python basics, warm-up applications begin"},
  {week: 10, theme: "DSA backtracking, System design problem 2 (rate limiter), FastAPI basics, AI microservice architecture"},
  {week: 11, theme: "DSA revisit-heavy week, System design problem 3, AI microservice embeddings + Chroma"},
  {week: 12, theme: "AI microservice full RAG pipeline, Docker Compose, World 2 Boss Battle"},
  {week: 13, theme: "DSA timed mocks, System design mock 1, resume/GitHub polish, applications ramp"},
  {week: 14, theme: "DSA timed mocks, System design mock 2, OA platform practice"},
  {week: 15, theme: "Interview loops live, light maintenance only"},
  {week: 16, theme: "Interview loops continue, negotiation prep"}
];
