# Contributing to Kabinett

Welcome! This guide explains how to contribute to this project, covering local development, commit standards, and our release flow.

## 1. Local Development
We use Docker for consistent environment configuration.

### Setup
1. **Clone the repo**: `git clone https://github.com/manuelchascoinycom-del/kabinett.git`
2. **Build and Start**: The project uses separate Dockerfiles for frontend and backend.
   - Run `docker-compose up --build` to start all services.
3. **Environment**: Ensure your `.env` files are correctly configured (copy from `.env.example`).

## 2. Branching Strategy
We maintain a clean history using the following branch workflow:

- `main`: Protected. Contains production-ready code.
- `dev`: Integration branch. All features/fixes are merged here first.
- `feature/<name>` or `fix/<name>`: Development branches. 

**Workflow:**
1. Create a branch from `dev`: `git checkout -b feature/my-feature`
2. Develop and commit.
3. Merge into `dev` via Pull Request.
4. Deployment to production happens from `main`.

## 3. Commit Standards (Conventional Commits)
All commits must follow this format: `type(scope): description`.

- **feat**: A new feature.
- **fix**: A bug fix.
- **docs**: Documentation only changes.
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc.).
- **refactor**: A code change that neither fixes a bug nor adds a feature.
- **chore**: Update tasks, build processes, or dependencies.

**Example:**
`git commit -m "fix(ui): synchronize global document counter"`

## 4. Pull Requests
- Keep PRs small and focused on a single task.
- Ensure the `CHANGELOG.md` is updated if the change is user-facing.
- PRs must target the `dev` branch.