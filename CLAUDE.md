# CLAUDE.md

**The project knowledge base is `AGENTS.md` (root) + the `wiki/` directory. Read `AGENTS.md` first — it's the single source of truth for both Claude Code and Codex.** This file only exists because Claude Code auto-loads `CLAUDE.md`; it intentionally holds no separate content so the two never drift.

Quick orientation before you start:

1. Read [[AGENTS]] — 2-page project brief, fast facts, and working rules.
2. Read [[index]] — catalog of all knowledge pages, then drill into the one you need.
3. After any architectural/feature/plan change, update the relevant `wiki/` page and append a line to [[log]] (see the maintenance workflow in [[AGENTS]]).

(Wiki cross-links use Obsidian `[[wikilinks]]`; open the repo root as an Obsidian vault to see the graph.)

Two things to never forget:
- **`deploy.sh` contains plaintext API keys** — never print, commit, or add secrets to tracked files.
- **There is no database** — persistence is browser `localStorage` only.
