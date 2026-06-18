# Product

This file supplies strategic design context for interface work. `CONTEXT.md`
remains authoritative for domain language and authority boundaries; the MVP PRD
remains authoritative for requirements.

## Register

product

## Users

AETHER serves five operationally distinct groups:

- Seated guests using a shared, managed iPad in an active restaurant
  environment. They need fast menu understanding, trustworthy guidance, and
  immediate access to a human server.
- Servers moving between tables under time pressure. They need concise,
  prioritized approval and service work without losing hospitality context.
- Managers coordinating the live floor, devices, staff assignments,
  integration health, and incidents.
- Food-safety approvers reviewing sensitive menu facts independently and with
  complete provenance.
- Platform operators maintaining tenant configuration and reliability through
  explicit, audited access.

The primary interaction surface is a task-oriented product, not a marketing
site. Guest presentation may be editorial and image-led, but operational
clarity and familiar controls take precedence over visual novelty.

## Product Purpose

AETHER is an optional digital hospitality layer for seated dining. It reduces
waiting and repetitive service interactions, improves menu education, and
helps guests form an order while preserving the human server as the accountable
approver.

Success means guests receive better guidance and faster service without lower
satisfaction, unsafe automation, duplicate orders, or disruption to normal
SpotOn restaurant operation.

## Brand Personality

Knowledgeable, calm, and attentive.

The product should feel premium and contemporary without becoming theatrical.
Guest language is warm and hospitable. Staff language is concise,
action-oriented, and explicit about state, ownership, and recovery.

## Anti-references

- Dense POS terminals that expose implementation detail and optimize only for
  transaction throughput
- Generic chatbot interfaces that make conversation the primary navigation
  model
- Autonomous checkout or kiosk experiences that conceal human review
- Neon-heavy science-fiction styling, glowing dashboards, or novelty controls
- Realistic virtual-server avatars or anthropomorphic assistants
- Manipulative upselling, unlabeled promotions, urgency pressure, or dark
  patterns
- Analytics dashboards that rank or shame individual staff publicly
- Decorative motion, glass surfaces, or unusual controls that slow restaurant
  work

## Design Principles

1. Hospitality remains visible. Every flow makes human assistance easy to
   reach and never frames AETHER as a replacement for staff.
2. State must be earned. Show only status supported by current AETHER or
   SpotOn evidence; never imply progress, safety, or certainty.
3. Safety interrupts gracefully. Blocks explain what is unknown and provide a
   clear human escalation path without making a safety guarantee.
4. Guest calm, staff speed. Guest surfaces favor readable guidance and
   confidence; staff surfaces favor prioritization, ownership, and fast
   recovery.
5. Familiar controls beat novelty. Standard product affordances and consistent
   component behavior are preferred over stylistic reinvention.

## Accessibility & Inclusion

- WCAG 2.2 AA is the minimum target.
- Guest controls support large touch targets, text scaling, screen readers,
  strong contrast, and no color-only meaning.
- Staff workflows support keyboard operation in addition to touch.
- Every motion treatment has a reduced-motion alternative.
- Allergy, dietary, and status language avoids assumptions and guarantees.
- Critical paths receive manual validation on the standardized managed iPad
  and representative staff devices.

