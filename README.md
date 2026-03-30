# Job Applicator

Job Applicator helps you discover jobs from multiple sources, evaluate how well your CV matches a role, and generate tailored cover letters.

## Prerequisites

- Node.js and npm installed locally.
- Docker running for the supporting services used by the backend and local development workflow.
- A populated `.env` file at the workspace root with the API, database, queue, and model settings required by your environment.
- Use `.env.example` as the starting point for the workspace `.env` file.

## Required env vars

- `POSTGRES_HOST` - PostgreSQL host, usually `localhost` for local development.
- `POSTGRES_PORT` - PostgreSQL port, usually `5432`.
- `POSTGRES_USER` - Database user.
- `POSTGRES_PASSWORD` - Database password.
- `POSTGRES_DB` - Database name.
- `RABBITMQ_URL` - RabbitMQ connection string, usually `amqp://localhost` for local development.
- `RABBITMQ_QUEUE` - Queue name used for job-processing messages.
- `JOB_EVALUATOR_MODEL` - LLM model name used to evaluate whether a job matches the CV.
- `OLLAMA_BASE_URL` - Required when using Ollama-based models for cover letters and critique.
- `COVER_LETTER_GENERATOR_MODEL` - LLM model name used to generate the cover letter.
- `CRITIQUE_MODEL` - LLM model name used to critique and rewrite the cover letter.

Optional but supported:

- `GEMINI_API_KEY` - If set, the job evaluator uses Gemini instead of Ollama.
- `LANGSMITH_PROJECT` - LangSmith project name for tracing.

## Run Tasks

### Run all

Start the full workspace with:

```sh
npm run dev-all
```

This runs the Nx development targets for the website and API together.

### Run frontend website

Start only the Next.js app with:

```sh
nx dev website
```

### Run backend

Start only the NestJS API with:

```sh
nx serve api
```

The API consumes job-processing messages, executes the LangGraph workflow, and persists the generated cover letters.

### Run API tests

Run the API test suite from the workspace root with:

```sh
npm run test:api
```

This runs the Nx Jest target for `apps/api` and picks up any `*.spec.ts` or `*.test.ts` files under `apps/api/src/`.

The current API test coverage is the CV embedding integration spec, so make sure local Ollama is running and these models are available:

- `OLLAMA_BASE_URL` - should point to your local Ollama server, usually `http://localhost:11434`.
- `gemma3:12b` - model used by `CvEmbeddingsService`.
- `nomic-embed-text:latest` - embedding model used by `CvEmbeddingsService`.

## AI Evaluation

The `apps/ai-evaluation/` app contains LangSmith-based evaluation scripts for the job evaluator and graph flows.

Run them from the workspace root:

```sh
npm run ai-eval:node-job-evaluator
npm run ai-eval:graph
```

Each command seeds its dataset if needed and then runs the matching `eval.ts` file.

The eval app reads its own config from `apps/ai-evaluation/.env` and still depends on the workspace root `.env` through the shared env loader.

Required for the eval app:

- `GRADER_LLM_MODEL` - model used to score graph evaluation output.

Optional for the eval app:

- `GEMINI_API_KEY` - required when the grader model is a Gemini model.
- `OLLAMA_BASE_URL` - required when the evaluator graph uses Ollama.
- `SKIP_ENV_VALIDATION=true` - bypasses env validation for local scripting.

## Database Migrations

Run the TypeORM migration from the workspace root with:

```sh
npm run migrate
```

This uses the migration datasource at `libs/migrations/migration-data-source.cjs` and applies migrations from `libs/migrations/`.

If you need to wipe the local schema and rebuild it from migrations, run:

```sh
npm run db:reset
```

This drops every table in the `public` schema and then reruns migrations.

## Used Technologies

- **Nx** for monorepo orchestration and task execution.
- **Next.js** for the website frontend.
- **NestJS** for the API and message-driven backend workflow.
- **React** and **TypeScript** for the UI layer.
- **Tailwind CSS** for styling.
- **PostgreSQL** with **TypeORM** for persistence.
- **RabbitMQ** with `amqplib` for asynchronous job processing.
- **LangChain** and **LangGraph** for the AI agent workflow.
- **Jest** and **Playwright** for automated testing.

## Project Architecture

The repository is organized as an Nx monorepo:

- `apps/website/` contains the Next.js application.
- `apps/api/` contains the NestJS service that processes job data and runs the agent workflow.
- `apps/website-e2e/` contains Playwright end-to-end tests.
- `libs/shared/` is available for reusable workspace utilities.
- `libs/migrations/` contains TypeORM migrations and the migration datasource.

### Component Diagram

The website collects user input and triggers backend job-processing flows. The API fetches job listings, reads the candidate CV, runs the AI workflow, and stores the resulting applications back in the database.

```mermaid
flowchart LR
  User[User] --> Website[Website / Next.js]
  Website --> Api[NestJS API]
  Api --> Queue[RabbitMQ]
  Queue --> Api
  Api --> Pdf[CV PDF extraction]
  Api --> Jobs[Job sources]
  Api --> LangGraph[LangGraph agent]
  LangGraph --> LLMs[LLM providers]
  Api --> DB[(PostgreSQL)]
  Website <-->|status and results| Api
```

### Sequence Diagram

1. The website submits a CV file and processing preferences.
2. The API receives the message from RabbitMQ.
3. The API extracts text from the uploaded CV and fetches jobs from enabled sources.
4. The LangGraph agent summarizes the CV, evaluates each job, and generates cover letters for matching roles.
5. The API persists the generated cover letters and application data.

```mermaid
sequenceDiagram
  actor User
  participant Website as Website / Next.js
  participant Api as NestJS API
  participant Queue as RabbitMQ
  participant Pdf as PDF Service
  participant Jobs as Jobs Service
  participant Graph as LangGraph Agent
  participant DB as PostgreSQL

  User->>Website: Upload CV and select job sources
  Website->>Api: Submit processing request
  Api->>Queue: Publish job-processing message
  Queue-->>Api: Deliver message
  Api->>Pdf: Extract CV text
  Api->>Jobs: Fetch jobs from enabled sources
  Api->>Graph: Summarize CV and evaluate jobs
  Graph-->>Api: Return generated cover letters
  Api->>DB: Save applications and cover letters
  Api-->>Website: Return processing result
```

## AI Agents

The AI workflow is implemented with LangGraph in `apps/api/src/app/ai/langgraph/`.

![LangGraph agent diagram](docs/assets/graph.png)

The main graph works as follows:

- `cv_summarizer` reduces the uploaded CV into a compact summary optimized for downstream evaluation.
- `job_supplier` iterates through the fetched jobs one by one.
- `job_evaluator` checks whether the current job is a meaningful match for the candidate.
- `cover_letter_generator` creates a tailored cover letter for matched jobs.
- `CoverLetterGraph` adds a critique-and-rewrite loop so the generated letter is refined before it is stored.

The graph keeps track of how many jobs have already been processed and stops once it reaches the configured maximum.
