import { Client } from 'langsmith';
import { DATASET_NAME } from './constants';
import { ensureDataset } from '../utils/langsmith-utils';

async function main() {
  const client = new Client();

  // Define examples
  const inputs = [
    {
      cvText:
        "Lam Tran\nSoftware Developer\n\nAbout me\n\nI am a software developer with over 10\nyears of experience in the software\ndevelopment industry. I am currently\nfocused on the backend technologies,\nbut in the past I've worked as a full\nstack developer as well. I have\nexperiences with lots of different\ntechnologies around Java and Node.js\nweb ecosystems. Outside of my work\nas a developer, I also teach various IT\ncourses for a Czech NGO Czechitas\n(e.g. JavaScript, React, testing, SQL).\n\nI've studied the University of\nEconomics in Prague and therefore I\nhave background in economics and\nfinance as well. I speak fluently Czech,\nEnglish and Vietnamese. I also have\nbasic knowledge of German as I lived\nin Munich, Germany for 6 years.\n\nSkills\n\nJava Javascript Node.js\n\nSpring kubernetes Docker\n\nOpenTelemetry\n\nContact\n\n lojzatran@gmail.com\n\n 00 420 775 096 467\n\n lojzatran\n\n lojzatran\n\n Experience\n\nCareer break\nJanuary 2026 - Present\n\nI took a career break to explore the AI field. I learnt about RAG and\n\nLangchain/LangGraph and built a small AI agent application that helps me\n\nfinding the right job. In the process, I also strengthened my skills in Next.js,\n\nReact, Nest.js and RabbitMQ.\n\nSenior Backend Developer\nIP Fabric, Inc.\nApril 2025 - December 2025\n\nI helped the team implement new customer-requested features and\n\ncontributed to resolving security issues that enabled the company to\n\nacquire new clients. Besides programming, I also communicated with other\n\nteams to complete my tasks effectively.\n\nSoftware Developer\ncommercetools GmbH\nSeptember 2015 - April 2025\n\nI participated in the development of e-commerce systems for various\n\ncustomers (e.g. AUDI, Carhartt), mainly as a backend developer. Later I\n\nmoved to a new team that develops tooling for the platform. My main focus\n\nwas Java and JavaScript SDKs and a new observability tool. I also\n\ninterviewed and helped new developers with their tasks.\n\nSoftware Developer\nTradesports.com\nDecember 2013 - July 2015\n\nI helped deveveloping and maintaining a new trading platform Database꞉\n\nMySQL Java꞉ Java 8, Spring 4, Spring Security, Spring Data, Spring Boot,\n\nSpring Batch, Spring Integration, RabbitMQ, Protobuf, Hibernate, JSP,\n\nSTOMP Testing꞉ JUnit, Spock, Selenium, Jasmine Javascript꞉ VanillaJS,\n\nJQuery, AngularJS, d3js, RequireJS, stomp.js CSS꞉ Bootstrap, responsive\n\ndesign, Mobile Angular UI, LESS Integration꞉ Zendesk, PayPal, IPS Forum,\n\nSportsData, Freshdesk, Firstdata Other꞉ Git, TeamCity, IntelliJ IDEA, Unix,\n\nWordPress, Scrum, Kanban\n\n Education\n\nUniversity of Economics in Prague\n2008 - 2014\n\nMaster degree in Informational systems and technologies\n\nUniversity of Queensland, Brisbane\n2013\n\nExchange student for one semester\n\n Projects\n\ncommercetools\n\nadyen integration\nnode.js\nIntegration between\ncommercetools platform\nand adyen payment\nplatform\n\ncommercetools\n\ntypescript SDK\nnode.js\nTypeScript SDK for\ncommercetools platform\n\nara.cz\nGrails\nWeb page for travellers",
      maxAppliedJobs: 1,
      jobs: [
        {
          id: '44f70ae7-3a88-4d2a-9018-0d5f8d1c1859',
          url: 'https://www.startupjobs.cz/nabidka/102285/full-stack-product-engineer-typescript-ai-telemetry',
          title: 'Full-Stack Product Engineer — TypeScript, AI, Telemetry',
          source: 'startupjobs',
          company: 'RACEMAKE',
          description:
            "<p><strong>🏁 Take a Seat on the Pit Wall</strong></p><p>At RACEMAKE, we aren't just building another AI analytics dashboard. We are revolutionizing how sim racers and real-world drivers spend their off-track time. Our mission is clear: Turn data into on-track speed.</p><p>We are looking for an engineer who isn't afraid to look \"under the hood.\" Our stack runs on modern TypeScript — from a Next.js web app to a Bun/Hono API powering AI coaching — with telemetry flowing in from simulators like Le Mans Ultimate, iRacing, and Assetto Corsa Competizione.</p><p>Our small team designed the core architecture — the data pipeline, the native agent, the telemetry stack. We need someone to take the architecture and build on it. Fast.</p><p><strong>🎯 Your Mission</strong></p><p>Your job won't be changing button colors in React. Your playground is telemetry pipelines, AI coaching prompts, and full-stack features that make drivers faster.</p><p>• Feature Development: You ship across the entire stack — lap analysis UI in React, new API endpoints in Bun/Hono, coaching logic powered by LLMs.<br>• AI Coaching: You tune system prompts and tool-use patterns so PitGPT gives better corner-by-corner advice for GT3 and LMdh cars.<br>• Sim Integration: When a game update changes telemetry formats overnight, you trace the issue and ship the fix before anyone notices.<br>• Debugging: Something breaks in production — you check logs, find the cause, fix it. Not a thread about it.</p><p><strong>🛠️ Tech Stack &amp; Skills</strong></p><p>We are looking for a mid-level or senior engineer who can ship on our existing stack from day one.</p><p>• TypeScript / React / Next.js: You build UI and API without switching gears. You're fast.<br>• Bun, Hono, ClickHouse, Protobuf, Zod: Our backend isn't Express + Postgres. You're comfortable picking up unfamiliar tools.<br>• Passive Rust: You don't need to write our Tauri agent from scratch, but you can read our CTO's code and extend it with AI assistance.<br>• AI-Native: Cursor, Claude, Copilot — you use AI to move fast, but you catch it when it hallucinates. The fundamentals matter.</p><p><strong>🚀 What We Offer</strong></p><p>We are not a bank or a corporation. We are a startup with the ambition to move from virtual tracks to real ones. We are demanding, we push for results and communication, and we want drive and ownership from you. In return, we offer:</p><p>• Maximum Freedom: No micromanagement. We care about working, optimized code, not hours logged.<br>• Access to Motorsport: Opportunities to participate in tests and real-world races. • Equity: Available for top candidates — milestone-based, earned through impact.<br>• Contract or Full-Time: Up to €60/hr. We pay for speed and autonomy.<br>• Remote-First: Work from your home office or our office in Prague.</p><p><strong>🎮 The Engineering Challenge: Choose Your Pace</strong></p><p>CVs are cool, but show us you can ship. We don’t review applications without a completed challenge.</p><p>🏁 BASIC CHALLENGE - <a>https://gist.github.com/743milan/7ba8bf205cd4c8df67dcf493d4865864</a></p><p>🏆 HARD CHALLENGE - <a>https://gist.github.com/743milan/90a461d9b8ac3ec080f50de926590f15</a></p><p>Do one. Do both. The more we see, the faster we move.</p><p>Include your code + output in your reply. If we see the signal, we’ll be in touch within 48 hours.</p>",
        },
      ],
    },
  ];

  await ensureDataset(client, {
    name: DATASET_NAME,
    description: 'Dataset for testing job-applicator graph.',
    examples: inputs.map((example) => ({
      inputs: example,
    })),
  });
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
