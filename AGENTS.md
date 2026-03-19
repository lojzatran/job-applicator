# 🤖 AGENTS.md

Welcome, AI Coding Agent! This project is a specialized tool for job searching and application management using AI models.

## 🌟 Project Purpose

**Job Applicator** helps users:

- Find jobs from various resources.
- Evaluate skill matching for specific roles.
- Prepare tailored cover letters.

## 🛠️ Technology Stack

This project is an **Nx Monorepo** with the following core technologies:

- **Framework**: [Next.js](https://nextjs.org/) (App Router)
- **UI Library**: [React](https://react.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescript.org/)
- **State/Infrastructure**: [Nx](https://nx.dev/)
- **Testing**: [Jest](https://jestjs.io/) & [Playwright](https://playwright.dev/)

## 📂 Project Structure

- `apps/website/`: The main Next.js application.
  - `src/app/`: App router pages, layouts, and global styles.
  - `src/api/`: Backend API routes.
- `apps/website-e2e/`: Playwright end-to-end tests.
- `package.json`: Root dependencies and scripts.
- `nx.json`: Nx workspace configuration.

## 🚀 Key Commands

Use `nx` to run tasks. In case `nx` is not found, use `npx nx`.

- **Development**: `nx dev website`
- **Build**: `nx build website`
- **Linting**: `nx lint website`
- **Unit Tests**: `nx test website`
- **E2E Tests**: `nx e2e website-e2e`

## 🧩 Agent Guidelines

1. **Prefer App Router**: Documentation and new features should follow the Next.js App Router patterns.
2. **TypeScript First**: Always use strong typing. Avoid `any` where possible.
3. **Nx Integration**: When adding new libraries or apps, use `npx nx generate` to maintain workspace consistency.
4. **Consistency**: Follow the existing coding style (Prettier and ESLint are configured).
5. **Proactive Debugging**: If a task fails, check the `nx` logs or run `npx nx show project website` to understand available targets.
6. **Manual UI testing**: Whenever a task is finished, try to run the application in development mode and verify that the app is running and not failing.
7. **Keep methods short**: Keep methods short and focused on a single responsibility. If a method is too long, split it into smaller methods and give it a descriptive name.

---

_This file is intended to help AI agents understand and contribute to this repository effectively._
