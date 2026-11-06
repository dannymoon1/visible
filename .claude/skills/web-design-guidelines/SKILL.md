---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read the rules in [guidelines.md](guidelines.md) (a pinned copy of vercel-labs/web-interface-guidelines `command.md`, saved 2026-10-31, so reviews don't change under us)
2. Read the specified files (or ask the user which files to review)
3. Check against all rules in the guidelines
4. Output findings in the terse `file:line` format the guidelines describe

To refresh the rules, replace `guidelines.md` with the latest
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md after reviewing the diff.
