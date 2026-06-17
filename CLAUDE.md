## AD
    - Keep frontend files smaller than 150 lines.

## Architecture

### Split deployment model

The repo uses a **split architecture** (`backend/` + `frontend/`). The root `package.json` scripts use `:split` / `:backend` / `:frontend` suffixes to target each. The legacy monolith (`src/`) has been removed.

