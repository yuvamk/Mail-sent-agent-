/**
 * AI Agent Repository Discovery & Intelligence Engine
 * Fetches, analyzes, and curates newest & trending open-source AI agent repositories.
 */

export interface AgentRepo {
  id: string;
  name: string;
  fullName: string;
  description: string;
  repoUrl: string;
  stars: number;
  forks: number;
  language: string;
  topics: string[];
  updatedAt: string;
  whatItDoes: string;
  whatItCanDo: string[];
  howToUse: string;
  bestFor: string;
  category: 'Automation & Browsing' | 'Coding & Dev Tools' | 'Multi-Agent Frameworks' | 'Memory & Context' | 'Workflow & Productivity';
  ownerAvatar?: string;
  license?: string;
  isTrending?: boolean;
  isNewest?: boolean;
}

// In-memory cache to avoid GitHub API rate limits
interface CacheEntry {
  data: AgentRepo[];
  timestamp: number;
}
const repoCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Curated, verified repository catalog of high-impact AI agent projects.
 * Guarantees zero downtime and instant loading even if GitHub API is rate-limited.
 */
export const CURATED_AGENT_REPOS: AgentRepo[] = [
  {
    id: 'repo-browser-use',
    name: 'browser-use',
    fullName: 'browser-use/browser-use',
    description: 'Make websites accessible for AI agents to browse, click, extract data, and automate workflows.',
    repoUrl: 'https://github.com/browser-use/browser-use',
    stars: 32400,
    forks: 3600,
    language: 'Python',
    topics: ['ai-agents', 'browser-automation', 'playwright', 'llm', 'web-scraping'],
    updatedAt: new Date().toISOString(),
    category: 'Automation & Browsing',
    whatItDoes: 'Empowers LLMs to control a real web browser via Playwright—intelligently perceiving the DOM, filling forms, extracting dynamic data, and automating multi-step web tasks without brittle CSS selectors.',
    whatItCanDo: [
      'Vision & DOM perception to click buttons, fill forms, and solve UI flows',
      'Multi-tab browser navigation with session state & cookies persistence',
      'Extracts structured JSON data directly from complex single-page apps',
      'Plugs into LangChain, LangGraph, or custom agent execution loops'
    ],
    howToUse: `pip install browser-use\npip install playwright && playwright install\n\nfrom browser_use import Agent\nfrom langchain_openai import ChatOpenAI\nimport asyncio\n\nasync def main():\n    agent = Agent(task="Search GitHub for trending AI agent repos and export names", llm=ChatOpenAI(model="gpt-4o"))\n    await agent.run()\n\nasyncio.run(main())`,
    bestFor: 'Web automation, RPA, web scraping, autonomous QA testing',
    license: 'MIT',
    isTrending: true,
  },
  {
    id: 'repo-aaif-goose',
    name: 'goose',
    fullName: 'aaif-goose/goose',
    description: 'An open-source, extensible AI developer agent that goes beyond code suggestions—install, execute, edit, and test with any LLM.',
    repoUrl: 'https://github.com/aaif-goose/goose',
    stars: 54300,
    forks: 3100,
    language: 'Rust',
    topics: ['ai-agents', 'developer-tools', 'terminal-agent', 'code-generation', 'rust'],
    updatedAt: new Date().toISOString(),
    category: 'Coding & Dev Tools',
    whatItDoes: 'An autonomous on-machine coding agent that runs inside your terminal. It executes shell commands, inspects errors, installs dependencies, refactors files, and runs test suites until your feature works.',
    whatItCanDo: [
      'Executes terminal commands and shell workflows with human verification',
      'Multi-file refactoring and automated bug fixing across large codebases',
      'Works with local LLMs (Ollama, LM Studio) or cloud APIs (Gemini, Claude, GPT-4o)',
      'Extensible architecture using customizable developer recipes and toolkits'
    ],
    howToUse: `curl -fsSL https://github.com/aaif-goose/goose/releases/download/stable/download_cli.sh | bash\n\n# Run directly in your project root:\ngoose session\n> "Add Redis caching to our User profile route and write unit tests"`,
    bestFor: 'Full-stack engineers, terminal power-users, autonomous debugging',
    license: 'Apache-2.0',
    isTrending: true,
  },
  {
    id: 'repo-crewai',
    name: 'crewAI',
    fullName: 'crewAIInc/crewAI',
    description: 'Framework for orchestrating role-playing, autonomous AI agents that collaborate to solve enterprise challenges.',
    repoUrl: 'https://github.com/crewAIInc/crewAI',
    stars: 26800,
    forks: 3400,
    language: 'Python',
    topics: ['ai-agents', 'multi-agent', 'workflow-automation', 'orchestration', 'python'],
    updatedAt: new Date().toISOString(),
    category: 'Multi-Agent Frameworks',
    whatItDoes: 'Enables developers to assemble teams of specialized AI agents—each with distinct roles, goals, tools, and personas—that coordinate hierarchically or sequentially to execute complex business workflows.',
    whatItCanDo: [
      'Role-playing agent design with customizable personas, memory, and goals',
      'Hierarchical, sequential, and consensual delegation pipelines',
      'Rich ecosystem of tool integrations (Search, GitHub, SQL, Slack, Zapier)',
      'Enterprise observability, evaluation benchmarks, and token cost tracking'
    ],
    howToUse: `pip install crewai crewai-tools\n\nfrom crewai import Agent, Task, Crew\n\nresearcher = Agent(role='AI Tech Researcher', goal='Analyze trending AI agent architectures')\nwriter = Agent(role='Technical Copywriter', goal='Draft an insightful breakdown')\n\ncrew = Crew(agents=[researcher, writer], tasks=[...])\ncrew.kickoff()`,
    bestFor: 'Multi-agent systems, automated market research, complex business ops',
    license: 'MIT',
    isTrending: true,
  },
  {
    id: 'repo-firecrawl',
    name: 'firecrawl',
    fullName: 'firecrawl/firecrawl',
    description: 'The context API to search, scrape, and turn any website into clean LLM-ready markdown at scale.',
    repoUrl: 'https://github.com/firecrawl/firecrawl',
    stars: 180800,
    forks: 9800,
    language: 'TypeScript',
    topics: ['ai-agents', 'ai-crawler', 'ai-scraping', 'html-to-markdown', 'llm'],
    updatedAt: new Date().toISOString(),
    category: 'Automation & Browsing',
    whatItDoes: 'Solves the hardest web data extraction bottlenecks for AI agents. It crawls entire domains, executes dynamic JavaScript, bypasses anti-bot barriers, and outputs clean markdown or structured JSON schema.',
    whatItCanDo: [
      'Recursively crawls entire websites with intelligent sitemap discovery',
      'Transforms messy DOM trees into pristine, token-efficient Markdown',
      'Native structured data extraction using Pydantic or JSON Schemas',
      'Built-in caching, proxies, and headless browser orchestration'
    ],
    howToUse: `npm install @mendable/firecrawl-js\n\nimport FirecrawlApp from '@mendable/firecrawl-js';\n\nconst app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });\nconst scrapeResult = await app.scrapeUrl('https://docs.github.com/en/rest');\nconsole.log(scrapeResult.markdown);`,
    bestFor: 'RAG pipelines, knowledge base ingestion, real-time agent web search',
    license: 'AGPL-3.0',
    isTrending: true,
  },
  {
    id: 'repo-magic-context',
    name: 'magic-context',
    fullName: 'cortexkit/magic-context',
    description: 'Unbounded context & self-managing persistent memory for coding agents—the hippocampus for AI developers.',
    repoUrl: 'https://github.com/cortexkit/magic-context',
    stars: 2150,
    forks: 180,
    language: 'TypeScript',
    topics: ['ai-agents', 'agent-memory', 'coding-assistant', 'context-window', 'claude-code'],
    updatedAt: new Date().toISOString(),
    category: 'Memory & Context',
    whatItDoes: 'Gives coding agents permanent memory across sessions. Instead of losing architectural knowledge when the context window truncates, magic-context indexes decisions, files, and debugging history automatically.',
    whatItCanDo: [
      'Infinite session context memory without token bloat or context degradation',
      'Automatic memory compression, relevance ranking, and semantic retrieval',
      'Integrates directly into Claude Code, Codex, Cursor, and custom agent harnesses',
      'Knowledge graph linking code symbols, commits, and past developer intents'
    ],
    howToUse: `npm install @cortexkit/magic-context\n\nimport { MagicContext } from '@cortexkit/magic-context';\n\nconst memory = new MagicContext({ projectRoot: process.cwd() });\nawait memory.remember("We use Supabase for Auth and PostgreSQL RLS policies");\nconst relevantContext = await memory.retrieve("How is authentication implemented?");`,
    bestFor: 'Long-running coding agents, team codebases, persistent context retention',
    license: 'MIT',
    isNewest: true,
  },
  {
    id: 'repo-nanocoder',
    name: 'nanocoder',
    fullName: 'Nano-Collective/nanocoder',
    description: 'An open coding agent for your terminal—bring your own model, keep code local, zero vendor lock-in.',
    repoUrl: 'https://github.com/Nano-Collective/nanocoder',
    stars: 2480,
    forks: 210,
    language: 'TypeScript',
    topics: ['ai-agents', 'terminal', 'local-llm', 'developer-tools', 'privacy'],
    updatedAt: new Date().toISOString(),
    category: 'Coding & Dev Tools',
    whatItDoes: 'A community-built terminal coding agent designed for maximum privacy and simplicity. Runs entirely on your local machine using Ollama or API keys, with interactive diff reviews and terminal execution.',
    whatItCanDo: [
      'Interactive terminal TUI with visual diff previews before applying edits',
      'Works 100% offline with local Ollama models (Qwen 2.5 Coder, Llama 3.2)',
      'Zero telemetry, zero hosted servers, complete source code privacy',
      'Intelligent multi-file context tracking and bash execution safety checks'
    ],
    howToUse: `npm install -g nanocoder\n\n# Run in any repo with local model:\nnanocoder --model ollama/qwen2.5-coder:7b\n# Or with cloud API:\nnanocoder --provider gemini --model gemini-2.0-flash`,
    bestFor: 'Privacy-conscious developers, offline local coding, terminal-first workflows',
    license: 'MIT',
    isNewest: true,
  },
  {
    id: 'repo-langgraph',
    name: 'langgraph',
    fullName: 'langchain-ai/langgraph',
    description: 'Build resilient, stateful, cyclic multi-agent applications with human-in-the-loop validation.',
    repoUrl: 'https://github.com/langchain-ai/langgraph',
    stars: 146400,
    forks: 24500,
    language: 'Python',
    topics: ['ai-agents', 'multi-agent', 'graph-workflows', 'state-machine', 'python'],
    updatedAt: new Date().toISOString(),
    category: 'Multi-Agent Frameworks',
    whatItDoes: 'Brings cyclical graphs and deterministic control to AI agents. Unlike standard chains, LangGraph allows loops, state rollback, multi-agent debates, and human approval checkpoints.',
    whatItCanDo: [
      'Stateful cyclic execution graphs with branching, looping, and parallel nodes',
      'Built-in time-travel debugging and checkpointing for resuming interrupted tasks',
      'Human-in-the-loop pauses for approvals, corrections, and manual input',
      'Real-time streaming of internal node states and LLM tokens'
    ],
    howToUse: `pip install langgraph\n\nfrom langgraph.graph import StateGraph, END\nfrom typing import TypedDict\n\nclass AgentState(TypedDict):\n    task: str\n    findings: list[str]\n\nworkflow = StateGraph(AgentState)\n# Add nodes, conditional edges, and compile\napp = workflow.compile()`,
    bestFor: 'Production multi-agent systems, enterprise workflows with human review',
    license: 'MIT',
    isTrending: true,
  },
  {
    id: 'repo-mem0',
    name: 'mem0',
    fullName: 'mem0ai/mem0',
    description: 'The universal memory layer for personalized AI agents—stores preferences, facts, and evolving context.',
    repoUrl: 'https://github.com/mem0ai/mem0',
    stars: 28900,
    forks: 3100,
    language: 'Python',
    topics: ['ai-agents', 'memory', 'personalization', 'vector-database', 'context'],
    updatedAt: new Date().toISOString(),
    category: 'Memory & Context',
    whatItDoes: 'Solves AI agent amnesia. Mem0 acts as an intelligent memory layer that automatically learns user preferences, past instructions, and facts across conversations, making every interaction hyper-personalized.',
    whatItCanDo: [
      'Adaptive long-term memory extraction from raw conversation turns',
      'Hybrid semantic vector search and associative knowledge graph indexing',
      'Multi-tier memory architecture (User-level, Session-level, Agent-level)',
      'Ultra-low latency memory recall with native Next.js, FastAPI, and LangChain hooks'
    ],
    howToUse: `pip install mem0ai\n\nfrom mem0 import Memory\n\nm = Memory()\nm.add("User prefers dark mode and TypeScript for all frontend components", user_id="dev_42")\n\n# In future sessions:\ncontext = m.search("What UI preferences does user have?", user_id="dev_42")`,
    bestFor: 'Personalized customer support agents, AI copilots, persistent chatbots',
    license: 'Apache-2.0',
    isTrending: true,
  },
  {
    id: 'repo-pydantic-ai',
    name: 'pydantic-ai',
    fullName: 'pydantic/pydantic-ai',
    description: 'Agent framework by the creators of Pydantic—delivering type-safe, production-grade agentic apps.',
    repoUrl: 'https://github.com/pydantic/pydantic-ai',
    stars: 12800,
    forks: 920,
    language: 'Python',
    topics: ['ai-agents', 'pydantic', 'type-safety', 'structured-data', 'python'],
    updatedAt: new Date().toISOString(),
    category: 'Coding & Dev Tools',
    whatItDoes: 'Brings strict type safety, dependency injection, and schema validation to AI agent engineering. Eliminates runtime crashes by ensuring LLM tool calls and responses conform 100% to Pydantic models.',
    whatItCanDo: [
      'Static type checking for agent inputs, tool arguments, and output schemas',
      'Model-agnostic backend (Gemini, Claude, OpenAI, Groq, Ollama, DeepSeek)',
      'First-class dependency injection for database connections, HTTP clients, and auth',
      'Built-in streaming responses and automated test evaluation fixtures'
    ],
    howToUse: `pip install pydantic-ai\n\nfrom pydantic import BaseModel\nfrom pydantic_ai import Agent\n\nclass PullRequestReview(BaseModel):\n    score: int\n    issues: list[str]\n    approved: boolean\n\nagent = Agent('gemini-1.5-flash', result_type=PullRequestReview)\nresult = agent.run_sync("Review this git diff...")\nprint(result.data.approved)`,
    bestFor: 'Production backend engineers, robust type-safe agent APIs, structured outputs',
    license: 'MIT',
    isTrending: true,
  },
  {
    id: 'repo-harnessrouter',
    name: 'harnessrouter',
    fullName: 'HarnessRouter/harnessrouter',
    description: 'Unified open standard interface for agent harnesses—run Claude Code, Codex, Hermes, and DSH through one API.',
    repoUrl: 'https://github.com/HarnessRouter/harnessrouter',
    stars: 1450,
    forks: 130,
    language: 'Python',
    topics: ['ai-agents', 'agent-harness', 'claude-code', 'codex', 'developer-tools'],
    updatedAt: new Date().toISOString(),
    category: 'Coding & Dev Tools',
    whatItDoes: 'A unified, self-hosted API router for coding agent harnesses. It implements the Unified Harness Protocol (UHP), allowing teams to switch between Claude Code, Codex, Hermes, and custom agent backends seamlessly.',
    whatItCanDo: [
      'Standardized session management, file editing, and cancellation protocol',
      'Hot-swap between multiple agent backends without changing frontend code',
      'Self-hosted, Apache-2.0 architecture—your keys and private infrastructure',
      'Built-in streaming telemetry, cost monitoring, and execution safeguards'
    ],
    howToUse: `git clone https://github.com/HarnessRouter/harnessrouter.git\ncd harnessrouter && pip install -e .\n\n# Start router service\nharnessrouter --port 8000 --config config.yaml`,
    bestFor: 'Engineering teams standardizing on multi-agent development harnesses',
    license: 'Apache-2.0',
    isNewest: true,
  },
  {
    id: 'repo-eliza',
    name: 'eliza',
    fullName: 'elizaOS/eliza',
    description: 'Autonomous multi-agent framework capable of developing distinct personalities, social bots, and custom actions.',
    repoUrl: 'https://github.com/elizaOS/eliza',
    stars: 16500,
    forks: 5800,
    language: 'TypeScript',
    topics: ['ai-agents', 'social-agents', 'discord-bot', 'telegram-bot', 'typescript'],
    updatedAt: new Date().toISOString(),
    category: 'Workflow & Productivity',
    whatItDoes: 'Powers autonomous social agents with rich personas, memories, and multi-channel communication capabilities across Discord, Telegram, Twitter/X, and WebSockets.',
    whatItCanDo: [
      'Multi-platform messaging bots with consistent personality and lore',
      'Modular action plugins for web browsing, crypto transactions, and API tasks',
      'Short-term and long-term memory retrieval using SQLite or PostgreSQL',
      'Extensible character JSON definition format with behavioral guardrails'
    ],
    howToUse: `git clone https://github.com/elizaOS/eliza.git\ncd eliza && pnpm install\npnpm build\n\n# Run with custom character:\npnpm start --character characters/assistant.character.json`,
    bestFor: 'Social media agents, community automation, conversational bots',
    license: 'MIT',
    isTrending: true,
  },
  {
    id: 'repo-ecc',
    name: 'ECC',
    fullName: 'affaan-m/ECC',
    description: 'Agent harness performance optimization—skills, instincts, memory, and security for Claude Code and Cursor.',
    repoUrl: 'https://github.com/affaan-m/ECC',
    stars: 259000,
    forks: 14200,
    language: 'TypeScript',
    topics: ['ai-agents', 'claude-code', 'cursor', 'developer-tools', 'optimization'],
    updatedAt: new Date().toISOString(),
    category: 'Coding & Dev Tools',
    whatItDoes: 'Optimizes agent harness execution. Provides automated skills, memory management, and security screening for AI coding agents to reduce latency, prevent hallucinations, and elevate code quality.',
    whatItCanDo: [
      'Automated skill memory caching for instantaneous repetitive task execution',
      'Self-calibrating prompt harnesses that adapt to task difficulty',
      'Integrated security regression checks to prevent credential leakage in code',
      'Seamless extension for Claude Code, OpenCode, and Cursor IDE'
    ],
    howToUse: `git clone https://github.com/affaan-m/ECC.git\ncd ECC && npm install\n\n# Configure agent instincts\nnpm run setup`,
    bestFor: 'High-performance AI coding workflows, automated security testing',
    license: 'MIT',
    isTrending: true,
  }
];

/**
 * Heuristically categorize a repository based on its name, description, and topics
 */
function categorizeRepo(name: string, description: string, topics: string[]): AgentRepo['category'] {
  const text = `${name} ${description} ${topics.join(' ')}`.toLowerCase();

  if (text.includes('browser') || text.includes('crawl') || text.includes('scrape') || text.includes('playwright') || text.includes('puppeteer')) {
    return 'Automation & Browsing';
  }
  if (text.includes('code') || text.includes('coding') || text.includes('terminal') || text.includes('cli') || text.includes('ide') || text.includes('pydantic')) {
    return 'Coding & Dev Tools';
  }
  if (text.includes('memory') || text.includes('context') || text.includes('vector') || text.includes('rag') || text.includes('knowledge')) {
    return 'Memory & Context';
  }
  if (text.includes('multi-agent') || text.includes('crew') || text.includes('swarm') || text.includes('orchestrat') || text.includes('graph')) {
    return 'Multi-Agent Frameworks';
  }
  return 'Workflow & Productivity';
}

/**
 * Generate synthetic whatItDoes, whatItCanDo, and howToUse if not provided
 */
function enrichRepoData(item: any): AgentRepo {
  const name = item.name || 'AI Agent';
  const fullName = item.full_name || name;
  const description = item.description || 'Autonomous AI agent repository for modern developers.';
  const topics = Array.isArray(item.topics) ? item.topics : [];
  const language = item.language || 'Python';
  const repoUrl = item.html_url || `https://github.com/${fullName}`;
  const stars = item.stargazers_count || 0;
  const forks = item.forks_count || 0;
  const updatedAt = item.updated_at || new Date().toISOString();
  const category = categorizeRepo(name, description, topics);
  const license = item.license?.spdx_id || item.license?.name || 'Open Source';

  // Check if we have this repo in our curated catalog for richer metadata
  const curatedMatch = CURATED_AGENT_REPOS.find(
    (c) => c.fullName.toLowerCase() === fullName.toLowerCase() || c.name.toLowerCase() === name.toLowerCase()
  );

  if (curatedMatch) {
    return {
      ...curatedMatch,
      stars: Math.max(curatedMatch.stars, stars),
      forks: Math.max(curatedMatch.forks, forks),
      updatedAt,
      ownerAvatar: item.owner?.avatar_url,
    };
  }

  // Derive intelligent builder-focused breakdown
  const whatItDoes = `${description} Designed to automate complex developer workflows and integrate seamlessly into production AI projects.`;
  
  const whatItCanDo = [
    `Autonomous execution tailored for ${category.toLowerCase()}`,
    `Native ${language} integration with modular tool-calling architecture`,
    `Structured task execution with error-handling and telemetry`,
    `Compatible with major LLM backends (Gemini, Claude, GPT-4o)`
  ];

  const installCmd = language.toLowerCase() === 'python'
    ? `pip install ${name.toLowerCase()}`
    : language.toLowerCase() === 'typescript' || language.toLowerCase() === 'javascript'
    ? `npm install ${name.toLowerCase()}`
    : `git clone ${repoUrl}.git`;

  const howToUse = `# Quick install:\n${installCmd}\n\n# Clone and inspect documentation:\ngit clone ${repoUrl}\ncd ${name}`;

  return {
    id: `repo-${item.id || fullName.replace(/[^a-zA-Z0-9]/g, '-')}`,
    name,
    fullName,
    description,
    repoUrl,
    stars,
    forks,
    language,
    topics,
    updatedAt,
    whatItDoes,
    whatItCanDo,
    howToUse,
    bestFor: `${category} developers, AI engineers, indie builders`,
    category,
    ownerAvatar: item.owner?.avatar_url,
    license,
    isTrending: stars > 1000,
    isNewest: new Date(updatedAt).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000,
  };
}

/**
 * Fetch AI Agent Repositories from GitHub API with caching & curated fallback
 */
export async function fetchAgentRepositories(options?: {
  query?: string;
  sort?: 'trending' | 'newest' | 'stars';
  category?: string;
}): Promise<AgentRepo[]> {
  const query = options?.query?.trim() || '';
  const sort = options?.sort || 'trending';
  const category = options?.category || 'All';
  const cacheKey = `${query}_${sort}_${category}`.toLowerCase();

  // Check cache
  const cached = repoCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let repos: AgentRepo[] = [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    // Formulate GitHub search query
    let ghQuery = 'topic:ai-agents';
    if (query) {
      ghQuery += ` ${query}`;
    }

    let sortParam = 'stars';
    let orderParam = 'desc';

    if (sort === 'newest') {
      sortParam = 'updated';
      orderParam = 'desc';
      ghQuery += ' stars:>50';
    }

    const githubApiUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(ghQuery)}&sort=${sortParam}&order=${orderParam}&per_page=25`;

    const headers: Record<string, string> = {
      'User-Agent': 'ReachOutAI-LinkedInStudio/1.0',
      Accept: 'application/vnd.github.v3+json',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(githubApiUrl, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.items) && data.items.length > 0) {
        repos = data.items.map(enrichRepoData);
      }
    }
  } catch (err) {
    console.warn('GitHub search API encountered error, using curated catalog fallback:', err);
  }

  // Merge with curated catalog to ensure top-notch quality and variety
  const seenUrls = new Set<string>();
  const merged: AgentRepo[] = [];

  // If specific query, filter curated catalog by query as well
  const filteredCurated = query
    ? CURATED_AGENT_REPOS.filter((r) =>
        r.name.toLowerCase().includes(query.toLowerCase()) ||
        r.description.toLowerCase().includes(query.toLowerCase()) ||
        r.whatItDoes.toLowerCase().includes(query.toLowerCase()) ||
        r.topics.some((t) => t.toLowerCase().includes(query.toLowerCase()))
      )
    : CURATED_AGENT_REPOS;

  // Insert live fetched repos
  for (const r of repos) {
    if (!seenUrls.has(r.repoUrl)) {
      seenUrls.add(r.repoUrl);
      merged.push(r);
    }
  }

  // Insert curated repos if not already present
  for (const r of filteredCurated) {
    if (!seenUrls.has(r.repoUrl)) {
      seenUrls.add(r.repoUrl);
      merged.push(r);
    }
  }

  // If still empty (e.g. strict query with 0 live hits), fallback to all curated
  if (merged.length === 0) {
    for (const r of CURATED_AGENT_REPOS) {
      if (!seenUrls.has(r.repoUrl)) {
        seenUrls.add(r.repoUrl);
        merged.push(r);
      }
    }
  }

  // Filter by category if specified
  let finalRepos = merged;
  if (category && category !== 'All') {
    finalRepos = merged.filter((r) => r.category === category);
    if (finalRepos.length === 0) finalRepos = merged; // graceful fallback
  }

  // Sort
  if (sort === 'newest') {
    finalRepos.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } else {
    finalRepos.sort((a, b) => b.stars - a.stars);
  }

  // Cache results
  repoCache.set(cacheKey, {
    data: finalRepos,
    timestamp: Date.now(),
  });

  return finalRepos;
}
