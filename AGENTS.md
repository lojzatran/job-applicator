# 🤖 AGENTS.md

Welcome, AI Coding Agent! This project is a specialized tool for job searching and application management using AI models.

## 🌟 Project Purpose

**Job Applicator** helps users:

- Find jobs from various resources.
- Evaluate skill matching for specific roles.
- Prepare tailored cover letters.

## 🛠️ Technology Stack

This project is an **Nx Monorepo** with the following core technologies:

- **Frontend Framework**: [Next.js](https://nextjs.org/) (App Router)
- **Frontend Library**: [React](https://react.dev/)
- **Backend Framework**: [NestJS](https://nestjs.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescript.org/)
- **State/Infrastructure**: [Nx](https://nx.dev/)
- **Queue / Messaging**: [RabbitMQ](https://www.rabbitmq.com/) via `amqplib`
- **Database**: [PostgreSQL](https://www.postgresql.org/) via [TypeORM](https://typeorm.io/)
- **AI Orchestration**: [LangChain](https://www.langchain.com/) / [LangGraph](https://langchain-ai.github.io/langgraph/)
- **Testing**: [Jest](https://jestjs.io/) & [Playwright](https://playwright.dev/)

## 📂 Project Structure

- `apps/website/`: The main Next.js application.
- `apps/api/`: The NestJS API that consumes RabbitMQ messages, runs LangGraph, and persists job applications.
  - `src/app/`: API modules, services, controllers, and persistence.
- `apps/website-e2e/`: Playwright end-to-end tests.
- `apps/ai-evaluation/`: The AI evaluation application. This application is used to evaluate langgraph and should mostly import other packages to test them.
- `libs/shared/`: Shared workspace code, if/when common utilities are extracted.
- `libs/migrations/`: TypeORM migration scripts, datasource, and reset helpers.
- `docs/`: Project documentation assets and helper scripts.
  - `docs/assets/`: Generated diagrams and other static documentation images.
  - `docs/scripts/`: Scripts used to generate documentation assets such as the LangGraph diagram.
- `package.json`: Root dependencies and scripts.
- `nx.json`: Nx workspace configuration.

## 🚀 Key Commands

Use `nx` to run tasks. In case `nx` is not found, use `npx nx`.

- **Website Dev**: `nx dev website`
- **Website Build**: `nx build website`
- **Website Lint**: `nx lint website`
- **Website Unit Tests**: `nx test website`
- **Website E2E Tests**: `nx e2e website-e2e`
- **API Dev**: `nx serve api`
- **API Build**: `nx build api`
- **API Lint**: `nx lint api`
- **API Type Check**: `nx typecheck api`
- **Run Everything**: `nx dev-all` or `npm run dev-all`
- **Database Migration**: `npm run migrate`
- **Reset Local DB**: `npm run db:reset`
- **Export LangGraph Diagram**: `npm run export-graph`

## ⚙️ Environment

- Keep the root `.env` file aligned with `.env.example`.
- Required infrastructure variables include PostgreSQL and RabbitMQ connection settings.
- AI model configuration is split between the job evaluator and the cover letter/critique Ollama models.
- `GEMINI_API_KEY` can be used for the job evaluator; `GEMINI_LLM_KEY` is supported as a legacy alias.
- `SKIP_ENV_VALIDATION=true` is available for local scripts that need to bypass validation. Usually this is necessary only when building docker images.

## 🧩 Agent Guidelines

1. **Prefer App Router**: Documentation and new features should follow the Next.js App Router patterns.
2. **TypeScript First**: Always use strong typing. Avoid `any` where possible.
3. **Nx Integration**: When adding new libraries or apps, use `npx nx generate` to maintain workspace consistency.
4. **Consistency**: Follow the existing coding style (Prettier and ESLint are configured).
5. **Proactive Debugging**: If a task fails, check the Nx logs or run `npx nx show project website` to understand available targets.
6. **Manual UI testing**: Whenever a task is finished, try to run the application in development mode and verify that the app is running and not failing.
7. **Keep methods short**: Keep methods short and focused on a single responsibility. If a method is too long, split it into smaller methods and give it a descriptive name.
8. **Use the current year**: Always use the current year by default if not explicitly written otherwise.

## Typescript usage

1. **Use interface**: Default to `interface`, use `type` when you need what interfaces can’t do (unions, tuples, advanced mapped/conditional types).

## React guidelines

1. **Use functional components**: Default to functional components, use class components only when necessary.
2. **Split long JSX into smaller logical components**: If a JSX part of a component be named and grouped together logically, it should be extracted into a separate component. Put these new components in a `components` folder next to the original component.

---

_This file is intended to help AI agents understand and contribute to this repository effectively._
