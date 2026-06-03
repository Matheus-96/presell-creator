# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

### Two deployment modes coexist on this branch

The repo contains both the **legacy monolith** (`src/`) and the **refactored split** (`backend/` + `frontend/`). The root `package.json` scripts use `:monolith` / `:split` / `:backend` / `:frontend` suffixes to target each.

