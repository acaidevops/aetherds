# ADR 0007: Bounded and Non-Authoritative AI

Status: Accepted
Date documented: 2026-06-18
Decision owners: Avinash (product/technical), Anusha (food safety)
Supersedes: None
Superseded by: None

## Context

Generative output can improve explanation and discovery, but it is
nondeterministic and cannot be trusted with menu truth, safety, or mutation.

## Decision drivers

- Deterministic safety and availability
- Graceful fallback
- Auditable recommendation behavior
- Prompt-injection containment

## Considered alternatives

- Autonomous ordering agent: rejected because it grants nondeterministic
  software transactional authority.
- No AI: retained as the deterministic fallback, but rejected as the only
  experience because bounded explanations add product value.

## Decision

AI may explain or choose among deterministically validated candidates, but cannot mutate state, call SpotOn, invent facts, or make safety decisions.

## Consequences

- Structured data is the source of truth.
- Invalid/slow AI output falls back deterministically.
- Core ordering does not depend on OpenAI.
- Prompts and models are versioned, evaluated, and feature-flagged.

## Verification

- Candidate allowlist and schema validation reject invented items or fields.
- Ordering and recommendations remain usable when OpenAI is unavailable.
