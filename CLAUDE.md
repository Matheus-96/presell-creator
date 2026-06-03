# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

### Split deployment model

The repo uses a **split architecture** (`backend/` + `frontend/`). The root `package.json` scripts use `:split` / `:backend` / `:frontend` suffixes to target each. The legacy monolith (`src/`) has been removed.

