# Issue tracker: GitHub

Issues and PRDs for this repository live as GitHub issues. Use the GitHub app
or `gh` CLI for issue operations.

## Conventions

- Infer the repository from the configured GitHub remote.
- Create implementation issues in dependency order so blockers can reference
  existing issue numbers.
- Every implementation issue includes acceptance criteria, blockers,
  requirement IDs from `docs/product/MVP-PRD.md`, and applicable ADRs.
- Apply `ready-for-agent` only when an issue can be implemented without
  additional human decisions.
- Apply `ready-for-human` when credentials, external approval, design
  selection, operational confirmation, or another human-only action is
  required.
- Do not close or rewrite a parent epic when publishing child issues.

## Common operations

- Create: `gh issue create --title "..." --body-file <file>`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open`
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "<label>"`
- Close: `gh issue close <number> --comment "..."`

## GitHub Project

Implementation issues are added to the repository's GitHub Project. The
project provides portfolio status; GitHub Issues remain the source of truth for
scope, acceptance criteria, dependencies, and discussion.

