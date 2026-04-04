import { Test, type TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import { env } from '../../../utils/env';
import { CvEmbeddingsService } from './cv-summary-embeddings.service';
import * as crypto from 'crypto';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

describe('Cv Embeddings Service integration', () => {
  const databaseUrl = `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`;
  let moduleRef: TestingModule;
  let pool: Pool;

  const cvText = `
    Ada Lovelace

    Skills:
    - TypeScript
    - NestJS
    - PostgreSQL
    - Vector search

    Experience:
    - Bright Labs - Backend Engineer: Built search features for document workflows and retrieval systems.
    - Northwind - Software Engineer: Worked on APIs, data pipelines, and PostgreSQL-backed services.
  `;

  beforeAll(async () => {
    jest.setTimeout(300000);

    pool = new Pool({
      connectionString: databaseUrl,
    });

    await pool.query(`
      DROP INDEX IF EXISTS "IDX_cv_embedding_embedding_cosine"
    `);

    await truncateCvTables(pool);

    moduleRef = await Test.createTestingModule({
      providers: [CvEmbeddingsService],
    }).compile();

    await moduleRef.init();
  });

  afterEach(async () => {
    await truncateCvTables(pool);
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }

    if (pool) {
      await pool.end();
    }
  });

  describe('Cv summarization and splitting', () => {
    const cvs = [
      {
        name: 'Short CV',
        text: `
      John Doe

      Skills:
      - TypeScript
      - NestJS
      - PostgreSQL

      Experience:
      - Acme Corp - Software Engineer: Built backend APIs and search tooling

      Projects:
      - CV Search: Implemented cosine similarity search over embeddings

      Education:
      - University of Prague - Computer Science - Bachelor's degree
    `,
      },
      {
        name: 'Long CV',
        text: `
      John Doe
      Skills:
      TypeScript, NestJS, PostgreSQL, API development, Data modeling, System design
      Experience:
      Acme Corp – Software Engineer
      Developed and maintained backend APIs and internal tooling focused on scalable search and data retrieval. Collaborated with cross-functional teams to design efficient database schemas and improve query performance. Contributed to the development of reusable service patterns and code standards across multiple projects.
      Projects:
      CV Search – Implemented a vector-based retrieval system using cosine similarity over text embeddings to improve candidate matching accuracy. Integrated the pipeline with a PostgreSQL backend and designed APIs for embedding storage, indexing, and querying.
      Education:
      University of Prague – Bachelor’s degree in Computer Science
      Completed coursework in algorithms, distributed systems, and software architecture. Focused on applying computer science principles to practical, production-level engineering challenges.`,
      },
    ];

    it.each(cvs)(
      'parses $name and returns embedding vectors from the local Ollama models',
      async ({ text }) => {
        const service = moduleRef.get(CvEmbeddingsService);

        const result = await service.createWeightedEmbeddingsForCv(text);

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
        for (const vector of result) {
          expect(Array.isArray(vector.embedding)).toBe(true);
          expect(vector.embedding.length).toBeGreaterThan(0);
          expect(typeof vector.weight).toBe('number');
          expect(vector.weight).toBeGreaterThan(0);
          for (const value of vector.embedding) {
            expect(typeof value).toBe('number');
          }
        }
      },
      180000,
    );
  });

  describe('Job scoring', () => {
    const jobDescriptions = [
      {
        name: 'Junior Business Development Representative',
        text: '<p><strong>Chceš nastartovat nebo posunout svoji obchodní kariéru v oboru, co má budoucnost? Pojď s námi měnit zdravotnictví!<br></strong></p><p>Obchod tě láká a chceš z<strong>ískat první zkušenosti</strong>, nebo už se v něm pohybuješ a hledáš <strong>novou výzvu</strong>? Pak čti dál! &nbsp;V Medeviu měníme <strong>budoucnost zdravotnictví</strong> a hledáme parťáka, který nám s tím pomůže. Žádné zbytečné fráze, jen<strong>&nbsp;</strong><strong>reálný dopad, skvělý tým a možnost naučit se obchod od profíků</strong>.&nbsp;</p><p><strong>🚀 Co tě čeká?</strong></p><ul><li><strong>Oslovování lékařů</strong> – představíš jim naši aplikaci a ukážeš, jak jim usnadní práci.</li><li><strong>Domlouvání schůzek</strong> – zajistíš online meetingy pro naše obchodníky.</li><li><strong>Práce s daty</strong> – budeš sledovat výsledky a přicházet s nápady, jak být ještě lepší.</li></ul><p>🌟 <strong>Koho hledáme?</strong> Ať už jsi na startu kariéry, nebo už máš obchodní zkušenosti, důležité je:</p><ul><li><strong>Chuť učit se a růst</strong> – zkušenosti jsou fajn, ale klíčový je drive a ambice.</li><li><strong>Skvělé komunikační schopnosti&nbsp;</strong>– umíš vést rozhovor, argumentovat a přesvědčit.</li><li><strong>Proaktivitu</strong> – nehledáš výmluvy, ale způsoby, jak uspět.</li><li><strong>Samostatnost</strong> – umíš si efektivně organizovat práci a převzít odpovědnost.</li></ul><p><strong>💪&nbsp;Co nabízíme?</strong></p><ul><li><strong>Smysluplnou práci&nbsp;</strong>– budeš součástí inovace, která usnadňuje lékařům práci a zlepšuje péči o pacienty.</li><li><strong>Tým špičkových profesionálů</strong> – pracuj po boku lidí z Alzy, Slevomatu a dalších úspěšných firem.</li><li><strong>Moderní kanceláře v Karlíně.</strong></li><li><strong>Atraktivní odměnu</strong> – fix + provize (minimálně 55k měsíčně), kde úspěch znamená vyšší výdělek.</li><li><strong>Prostor pro růst</strong> – pokud máš ambice, podpoříme tě v profesním i osobním rozvoji.</li></ul><p>Láká tě to? Pošli nám CV a ukaž, že jsi ten pravý/pravá! 🚀</p>',
      },
      {
        name: 'Senior Frontend Developer (Next.js / React)',
        text: '<p>Jsme menší tým, který vyvíjí vlastní fintech platformu pro financování faktur a postupně ji škálujeme na globální trh. Budeš pracovat na aplikaci pro klientskou zónu postavené na Next.js 14 (TypeScript) a React.js, kterou denně používají klienti v CZ, EN a PL prostředí. &nbsp;</p><p>Hledáme seniorního vývojáře(ku), který(á) vezme projekt za vlastní a bude určovat technický směr aplikace a nastaví vysokou laťku kvality a procesu vývoje.&nbsp;</p><p>Pokud se nebojíš zkoušet nové věci, máš proaktivní a samostatný přístup k práci a AI vnímáš jako nedílnou součást svojí práce tak hledáme přesně tebe.&nbsp;</p><p>&nbsp;<img></p><h3>Náplň tvojí práce</h3><ul><li><p>Určování technického směřování platformy (architektura, nastavení best practices, mentoring kolegů)&nbsp;</p></li><li><p>Technické diskuse s produktovým teamem – hledání efektivního řešení klientských požadavků&nbsp;</p></li><li><p>Vývoj, údržba a kontinuální zlepšování klientské zóny postavené na Next.js 14, App Router + TypeScript&nbsp;</p></li><li><p>Práce v monorepu (Turborepo) se sdílenými balíčky: UI komponenty (Radix UI, Headless UI), datagrid (TanStack Table), formuláře (React Hook Form + Zod), API klient (generovaný z OpenAPI)&nbsp;</p></li><li><p>Implementace nových feature modulů (faktury, smlouvy, zákazníci a další domény)&nbsp;</p></li><li><p>Správa a rozšiřování Tailwind v4 design systému s podporou partnerských brandingů &nbsp;</p></li><li><p>Spolupráce s backend vývojáři přes typovaný API klient generovaný ze Swagger&nbsp;</p></li><li><p>Spolupráce s QA (E2E testy v Cypress)&nbsp;</p></li><li><p>Code review na GitHubu (CodeRabbit + peer2peer code review)&nbsp;</p></li></ul><p>&nbsp;<img></p><h3>Co hledáme</h3><ul><li><p>Seniorní zkušenosti s vývojem frontendu produkčních aplikací&nbsp;</p></li><li><p>Zkušenosti na pozici techlead / teamlead&nbsp;</p></li><li><p>Praktické zkušenosti s využitím AI při vývoji (Claude Code, Cursor,…)&nbsp;</p></li><li><p>Zkušenost s Next.js (App Router výhodou) nebo jiným SSR/SSG frameworkem&nbsp;</p></li><li><p>Znalost monorepo nástrojů (Turborepo, pnpm workspaces)</p></li><li><p>Znalost Tailwind CSS nebo utility-first CSS přístupu&nbsp;</p></li><li><p>Zkušenost s REST API a typovanými API klienty&nbsp;</p></li><li><p>Práce s GitHubem a základy CI/CD (GitHub Actions nebo podobné)&nbsp;</p></li><li><p>Schopnost číst a psát dokumentaci v angličtině (B1+)&nbsp;</p></li><li><p>Proaktivní přístup a schopnost pracovat samostatně i v rámci týmu&nbsp;</p></li></ul><p>&nbsp;</p><h3>Co navíc oceníme&nbsp;</h3><ul><li><p>Zkušenosti s Next.js App Router, Server Actions a React Query v5</p></li><li><p>Zkušenosti s komponentovými knihovnami (Radix UI, Headless UI)&nbsp;</p></li><li><p>Orientace v i18n (next-translate nebo podobnél)&nbsp;</p></li><li><p>Zkušenosti s Cypress E2E testy&nbsp;</p></li><li><p>Cit pro UX a kvalitní UI, zkušenost s design systémy nebo Storybook&nbsp;</p></li><li><p>Portfolio projektů nebo odkaz na GitHub&nbsp;</p></li><li><p>Orientace v Keycloak / OIDC autentizaci výhodou&nbsp;</p></li><li><p>Zkušenosti s AWS&nbsp;<img></p></li></ul><h3>Technologický stack (klientská zóna)</h3><ul><li><strong>Framework</strong>: Next.js 14, React 18, TypeScript&nbsp;</li><li><strong>State management</strong>: React Query v5, Context API (migrácia zo SWR)&nbsp;</li><li><strong>UI</strong>: Headless UI, Radix UI, Tailwind CSS v4, Framer Motion 12, Storybook&nbsp;</li><li><strong>Forms</strong>: React Hook Form, Zod&nbsp;</li><li><strong>API</strong>: generovaný typovaný klient (swagger-typescript-api) + Next.js Server Actions&nbsp;</li><li><strong>Auth</strong>: Keycloak (OIDC) + NextAuth v4, JWT v HTTP-only cookies&nbsp;</li><li><strong>Testy</strong>: Cypress&nbsp;</li><li><strong>Monitoring</strong>: Sentry&nbsp;</li><li><strong>Caching</strong>: Redis (ioredis + Redlock)&nbsp;</li><li><strong>i18n</strong>: next-translate &nbsp;</li><li><strong>Tooling</strong>: ESLint, Prettier, Turborepo, pnpm workspaces, GitHub Actions, Docker + Kubernetes&nbsp;</li><li><strong>Cloud</strong>: AWS&nbsp;<img></li></ul><h3>Co nabízíme</h3><ul><li><p>Profesní růst na reálném fintech produktu s globálními ambicemi&nbsp;</p></li><li><p>Možnost výrazně ovlivnit výsledný produkt&nbsp;a řešit věci rychle bez byrokracie</p></li><li><p>Dynamické prostředí startupu s úzkým kontaktem na ostatní teamy v rámci firmy&nbsp;</p></li><li><p>Přátelský kolektiv, který rád chodí do kanceláře</p></li><li><p>Kanceláře v centru Prahy&nbsp;a Liberce</p></li><li><p>Flexibilní pracovní dobu a možnost remote spolupráce&nbsp;</p></li><li><p>Občerstvení&nbsp;v kanceláři</p></li><li><p>Společné neformální aktivity</p></li><li><p>Příspěvek na vzdělávání a konference&nbsp;</p></li></ul>',
      },
      {
        name: 'Marketing / Campaigns Specialist (MAGU)',
        text: '<p>Jsme MAGU, jeden z nejrychleji rostoucích startupů v Česku.</p><p>Podle žebříčku Deloitte Technology Fast 50 CE jsme byli v roce 2024&nbsp;<strong>druhou nejrychleji rostoucí společnosti&nbsp;</strong>ze střední a východní Evropy.&nbsp;<br><br>Začínali jsme s kombuchou. Dnes budujeme širší wellness portfolio od fermentovaných nápojů po doplňky stravy. A protože náš růst stále zrychluje, hledáme posilu do marketingového týmu, která nám pomůže posunout MAGU na další úroveň.</p><p>Kanceláře máme na Praze 9 v Čakovicích, společně s naší výrobou, ale <strong>pracovat</strong> můžeš klidně&nbsp;<strong>odkudkoliv</strong>. Osobně se potkáváme hlavně na strategických schůzkách a při důležitých přípravách.<br><br><br><strong>Co budeš dělat?</strong><br><br></p><p><strong>Marketing / kampaně<br></strong></p><ul><li><p>Správa a testování kampaní v Meta &amp; Google Ads. + &nbsp;Základní reporting výkonnosti kampaní.</p></li><li><p>Tvorba jednoduchých grafických podkladů (Canva / Figma).</p></li><li><p>Spolupráce na obsahu pro sociální sítě.<br><br></p></li></ul><p><strong>Produkt / vývoj</strong></p><ul><li><p>Podílení se na přípravě nových produktů (balení, etikety, vizuály, claimy).</p></li><li><p>Koordinace externích grafiků, fotografů a dodavatelů. Komunikace s výrobci a partnery.</p></li></ul><p><br></p><p><strong>Koho hledáme?</strong></p><ul><li><p>Máš zkušenost z e-shopu, marketingu nebo produktového oddělení.</p></li><li><p>Umíš základy grafiky (Figma / Canva).</p></li><li><p>Nebojíš se řídit operativu, tabulky a reporting.<br><br></p></li></ul><p><strong>Co nabízíme?</strong></p><ul><li><p>Prostředí malého týmu, kde budeš mít prostor přijít s vlastním nápadem.</p></li><li><p>Práci, kde uvidíš výsledky hned, žádná korporátní rutina.</p></li><li><p>Možnost pracovat na vývoji nových produktů&nbsp;</p></li></ul>',
      },
      {
        name: 'Backend Engineer (Tanganica)',
        text: '<p>Ahoj! Jsme Tanganica, český B2B SaaS pro e-shopy. Pomáháme automatizovat marketing a spolupracujeme se stovkami klientů. Jsme součástí skupiny ABUGO a stavíme moderní produkty s AI-first přístupem.</p><p><strong>Tvoje role</strong></p><p>Hledáme medior+ backend developera do malého týmu. Každý má přímý vliv na produkt. Stack: .NET 8, PostgreSQL, Docker, GCP. Možnost remote nebo kanceláře v Liberci/Brně.</p><p><strong>Tech stack</strong></p><ul><li>C# / .NET (REST API, EF)</li><li>PostgreSQL (multi-tenant)</li><li>Docker, CI/CD, GCP</li><li>Integrace: Google, Meta, Stripe, Shopify, OpenAI</li></ul><p><strong>Co budeš dělat</strong></p><ul><li>Navrhovat backend architekturu</li><li>Integrovat externí služby</li><li>Optimalizovat databáze</li><li>Podílet se na AI funkcích</li></ul><p><strong>Výběrko</strong></p><ul><li>HR call</li><li>Tech kolo</li><li>Setkání s CEO</li></ul><p><strong>Co dostaneš</strong></p><ul><li>Férovou odměnu</li><li>Startup prostředí</li><li>Multisport</li><li>Moderní kanceláře</li><li>Podporu vzdělávání</li></ul>',
      },
      {
        name: 'Backend Engineer (AI-created)',
        text: 'We are seeking a Backend Engineer with strong expertise in TypeScript and modern server-side architectures to join our growing team. In this role, you will design and implement scalable APIs and backend services using NestJS, with a strong focus on performance, maintainability, and clean architecture. You will work extensively with PostgreSQL to build efficient data models and power reliable, high-throughput systems. A key part of your work will involve developing advanced search capabilities, including vector search and intelligent document retrieval systems, enabling users to efficiently navigate and extract insights from large datasets. You will collaborate closely with cross-functional teams to design data pipelines, optimize query performance, and ensure seamless integration between services. The ideal candidate has hands-on experience building production-grade backend systems, a solid understanding of data-intensive applications, and a passion for solving complex problems related to search and data retrieval. Experience with document workflows, ranking algorithms, or semantic search is highly desirable. You should be comfortable working in a fast-paced environment, taking ownership of features from design to deployment, and continuously improving system reliability and developer experience.',
      },
    ];

    it('should return IT position as the best match for the IT person', async () => {
      const service = moduleRef.get(CvEmbeddingsService);

      const cvEmbeddings = await service.createWeightedEmbeddingsForCv(cvText);

      const cvId = await insertCv(pool, {
        path: '/tmp/primary-cv.pdf',
        rawText: cvText,
      });

      const embeddings = cvEmbeddings.map((embedding) => ({
        cvId,
        embedding: embedding.embedding,
        weight: embedding.weight,
        model: env.EMBEDDING_MODEL,
      }));

      await service.insertCvEmbeddings(embeddings);

      const results: { name: string; score: number }[] = [];
      for (const jobDescription of jobDescriptions) {
        const jobDescriptionEmbeddings =
          await service.createEmbeddingsForJobDescription(jobDescription.text);

        const score = await service.scoreJobAndCvMatching(
          cvId,
          jobDescriptionEmbeddings,
        );
        results.push({ name: jobDescription.name, score });
      }

      expect(results).toHaveLength(jobDescriptions.length);

      results.sort((a, b) => b.score - a.score);

      const names = results.map((result) => result.name);
      // We know the first one is the best match because I created the job description
      // with AI according to the CV. The others are less deterministic, but IT jobs should be before others.
      expect(names[0]).toEqual('Backend Engineer (AI-created)');
      expect([
        'Senior Frontend Developer (Next.js / React)',
        'Backend Engineer (Tanganica)',
      ]).toContain(names[1]);
      expect([
        'Senior Frontend Developer (Next.js / React)',
        'Backend Engineer (Tanganica)',
      ]).toContain(names[2]);
      expect([
        'Marketing / Campaigns Specialist (MAGU)',
        'Junior Business Development Representative',
      ]).toContain(names[3]);
      expect([
        'Marketing / Campaigns Specialist (MAGU)',
        'Junior Business Development Representative',
      ]).toContain(names[4]);
    }, 300000);
  });

  describe('Job description embedding hygiene', () => {
    it('returns no embeddings for empty or whitespace-only job descriptions', async () => {
      const service = moduleRef.get(CvEmbeddingsService);
      const createEmbeddingsSpy = jest.spyOn(service, 'createEmbeddings');

      await expect(
        service.createEmbeddingsForJobDescription('   \n\t  '),
      ).resolves.toEqual([]);

      expect(createEmbeddingsSpy).not.toHaveBeenCalled();
      createEmbeddingsSpy.mockRestore();
    });

    it('skips blank split chunks before embedding job descriptions', async () => {
      const service = moduleRef.get(CvEmbeddingsService);
      const createEmbeddingsSpy = jest
        .spyOn(service, 'createEmbeddings')
        .mockResolvedValue([1, 2, 3]);
      const splitterSpy = jest.spyOn(
        RecursiveCharacterTextSplitter,
        'fromLanguage',
      );

      splitterSpy.mockReturnValue({
        splitText: jest.fn().mockResolvedValue([
          '   ',
          '<p>Product manager with strong ops background</p>',
          '<div>\n</div>',
        ]),
      } as never);

      const jobDescription = `<div>${'role '.repeat(800)}</div>`;
      const embeddings = await service.createEmbeddingsForJobDescription(
        jobDescription,
      );

      expect(embeddings).toEqual([[1, 2, 3]]);
      expect(createEmbeddingsSpy).toHaveBeenCalledTimes(1);
      expect(createEmbeddingsSpy).toHaveBeenCalledWith(
        'Product manager with strong ops background',
      );

      splitterSpy.mockRestore();
      createEmbeddingsSpy.mockRestore();
    });
  });

  describe('CV embedding persistence guards', () => {
    it('returns early for empty embeddings and throws when the pool is missing', async () => {
      const service = new CvEmbeddingsService();

      await expect(service.insertCvEmbeddings([])).resolves.toBeUndefined();
      await expect(
        service.insertCvEmbeddings([
          {
            cvId: 1,
            embedding: [1, 2, 3],
            weight: 1,
            model: env.EMBEDDING_MODEL,
          },
        ]),
      ).rejects.toThrow('Embeddings pool not initialized');
    });
  });
});

async function insertCv(
  pool: Pool,
  input: {
    path: string;
    rawText: string;
  },
): Promise<number> {
  const cvHash = crypto.createHash('md5').update(input.rawText).digest('hex');
  const result = await pool.query<{ id: number }>(
    `
      INSERT INTO "cv" ("path", "rawText", "hash", "createdAt")
      VALUES ($1, $2, $3, $4)
      RETURNING "id"
    `,
    [input.path, input.rawText, cvHash, new Date('2026-03-28T10:00:00.000Z')],
  );

  return result.rows[0].id;
}

async function truncateCvTables(pool: Pool): Promise<void> {
  try {
    await pool.query(`
      TRUNCATE TABLE "cv_embedding", "cv" RESTART IDENTITY CASCADE
    `);
  } catch (error) {
    if (isMissingRelationError(error)) {
      return;
    }

    throw error;
  }
}

function isMissingRelationError(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '42P01'
  );
}
