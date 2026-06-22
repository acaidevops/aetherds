import type { ReactNode } from 'react';

/**
 * Public landing page (`/`).
 *
 * Audience: prospective investors and SpotOn's partner-integration reviewers.
 * Every claim is held to the README "Non-negotiable boundaries" and the
 * provisional-status caveat — AETHER is positioned as an optional layer over
 * SpotOn, never as a POS or autonomous agent, and pilot details are flagged as
 * conditional on SpotOn approval.
 */

/** Single source of truth for outbound contact targets used across the page. */
const CONTACT_EMAIL = 'acaidevops@gmail.com';
const REPO_URL = 'https://github.com/acaidevops/aetherds';

const STEPS = [
  {
    n: '01',
    title: 'Guests explore',
    body: 'On a managed in-table iPad, guests browse the menu, ask questions, and receive bounded, grounded recommendations — no invented facts.',
  },
  {
    n: '02',
    title: 'A draft order forms',
    body: 'Guests assemble a proposed order and can request service at any moment. A human server is always one tap away.',
  },
  {
    n: '03',
    title: 'A server approves',
    body: 'Every order is reviewed and approved by an accountable human server before anything reaches the point of sale.',
  },
  {
    n: '04',
    title: 'SpotOn takes over',
    body: 'On acknowledgment, SpotOn becomes authoritative for kitchen routing, checks, tax, discounts, and payment — as it does today.',
  },
];

const BOUNDARIES = [
  {
    title: 'A human approves every order',
    body: 'No order reaches SpotOn without an accountable server’s approval. AETHER proposes; people decide.',
  },
  {
    title: 'SpotOn stays the system of record',
    body: 'After acknowledgment, SpotOn is authoritative for transactions, kitchen routing, tax, discounts, and payment.',
  },
  {
    title: 'AI operates inside fixed limits',
    body: 'The assistant cannot mutate orders, call SpotOn directly, invent menu facts, or make safety claims.',
  },
  {
    title: 'Service never depends on AETHER',
    body: 'If AETHER is unavailable, normal restaurant operation continues through SpotOn. The layer is always optional.',
  },
];

const STACK = [
  'Next.js 16',
  'React 19',
  'TypeScript',
  'Supabase / PostgreSQL',
  'Vercel',
  'OpenAI API',
  'SpotOn Centralized API',
];

export default function LandingPage(): ReactNode {
  return (
    <>
      <header className="mkt-nav">
        <div className="mkt-shell mkt-nav__row">
          <span className="mkt-wordmark">Aether</span>
          <nav className="mkt-nav__links">
            <a href="#how">How it works</a>
            <a href="#boundaries">Boundaries</a>
            <a href="#spoton">SpotOn</a>
            <a href="#pilot">Pilot</a>
          </nav>
          <a className="mkt-btn mkt-btn--primary mkt-nav__cta" href="#contact">
            Get in touch
          </a>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mkt-hero">
          <div className="mkt-shell mkt-hero__grid">
            <div>
              <span className="mkt-eyebrow">AI-assisted digital hospitality</span>
              <h1>The digital server that keeps people in charge.</h1>
              <p className="mkt-hero__lede">
                AETHER is an optional digital hospitality layer for seated dining. It helps guests
                discover dishes, receive trustworthy guidance, and build an order — while a human
                server approves every order and SpotOn remains the system of record.
              </p>
              <div className="mkt-hero__actions">
                <a className="mkt-btn mkt-btn--primary" href="#contact">
                  Partner &amp; investor inquiries
                </a>
                <a className="mkt-btn mkt-btn--ghost" href="#how">
                  See how it works
                </a>
              </div>
            </div>
            <dl className="mkt-hero__aside">
              <dt>Category</dt>
              <dd>Hospitality layer, not a POS</dd>
              <dt>First pilot</dt>
              <dd>AnTeNa Kitchen &amp; Bar</dd>
              <dt>Authority</dt>
              <dd>Human servers &amp; SpotOn</dd>
            </dl>
          </div>
        </section>

        {/* What it is / is not */}
        <section className="mkt-band">
          <div className="mkt-shell mkt-band__grid">
            <div className="mkt-band__cell">
              <span className="mkt-band__tag">What AETHER is</span>
              <h2>A calm, knowledgeable layer over the table.</h2>
              <p>
                It reduces waiting and repetitive service interactions, improves menu education, and
                helps guests form an order — without ever replacing the human server.
              </p>
            </div>
            <div className="mkt-band__cell mkt-band__cell--muted">
              <span className="mkt-band__tag">What AETHER is not</span>
              <h2>Not a point of sale.</h2>
              <p>
                SpotOn Restaurant remains the transactional, kitchen-routing, payment, tax, and
                check system of record. AETHER never automates checkout or hides human review.
              </p>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mkt-section" id="how">
          <div className="mkt-shell">
            <div className="mkt-section__head">
              <span className="mkt-eyebrow">How it works</span>
              <h2>From curiosity to a confirmed order — with a person in the loop.</h2>
              <p>
                AETHER guides the early, repetitive moments of a meal so servers can spend their
                attention where hospitality matters most. Authority never leaves human hands.
              </p>
            </div>
            <ol className="mkt-steps">
              {STEPS.map((s) => (
                <li className="mkt-step" key={s.n}>
                  <div className="mkt-step__n">{s.n}</div>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Boundaries */}
        <section className="mkt-section" id="boundaries">
          <div className="mkt-shell">
            <div className="mkt-section__head">
              <span className="mkt-eyebrow">Non-negotiable boundaries</span>
              <h2>Designed to be trusted by restaurants, guests, and SpotOn.</h2>
              <p>
                These constraints are architectural, not aspirational. They define what AETHER will
                and will not do, and they protect normal restaurant operation at every step.
              </p>
            </div>
            <div className="mkt-bounds">
              {BOUNDARIES.map((b, i) => (
                <div className="mkt-bound" key={b.title}>
                  <span className="mkt-bound__mark" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div>
                    <h3>{b.title}</h3>
                    <p>{b.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SpotOn */}
        <section className="mkt-section" id="spoton">
          <div className="mkt-shell mkt-spoton">
            <div className="mkt-spoton__intro">
              <span className="mkt-eyebrow">SpotOn integration</span>
              <h2 className="mkt-spoton__title">Built to respect the system of record.</h2>
              <p className="mkt-spoton__lede">
                AETHER integrates with SpotOn through its Centralized API. An order only moves
                forward after SpotOn acknowledges it, and SpotOn stays authoritative from that point
                on. If AETHER is down, the restaurant operates normally through SpotOn.
              </p>
            </div>
            <div className="mkt-flow" aria-label="Order flow from guest to SpotOn">
              <div className="mkt-flow__node">
                <strong>Guest draft</strong>
                <span>built on the table iPad</span>
              </div>
              <div className="mkt-flow__rail" aria-hidden="true" />
              <div className="mkt-flow__node mkt-flow__node--accent">
                <strong>Human server approval</strong>
                <span>accountable review</span>
              </div>
              <div className="mkt-flow__rail" aria-hidden="true" />
              <div className="mkt-flow__node">
                <strong>SpotOn acknowledgment</strong>
                <span>becomes authoritative</span>
              </div>
              <div className="mkt-flow__rail" aria-hidden="true" />
              <div className="mkt-flow__node">
                <strong>Kitchen, check &amp; payment</strong>
                <span>handled entirely by SpotOn</span>
              </div>
            </div>
          </div>
        </section>

        {/* Pilot */}
        <section className="mkt-section" id="pilot">
          <div className="mkt-shell">
            <div className="mkt-section__head">
              <span className="mkt-eyebrow">The pilot</span>
              <h2>A focused first deployment, then careful expansion.</h2>
            </div>
            <dl className="mkt-pilot__grid">
              <div className="mkt-stat">
                <dt>First customer</dt>
                <dd>
                  AnTeNa
                  <small>Kitchen &amp; Bar — a single live location</small>
                </dd>
              </div>
              <div className="mkt-stat">
                <dt>Target pilot</dt>
                <dd>
                  Jul 2026
                  <small>Conditional on SpotOn API access and launch gates</small>
                </dd>
              </div>
              <div className="mkt-stat">
                <dt>Footprint</dt>
                <dd>
                  3–5 iPads
                  <small>Managed in-table PWA, plus a ready spare</small>
                </dd>
              </div>
            </dl>
            <p className="mkt-note">
              Status: AETHER is in active development. Provider-specific endpoints, payloads, and
              capabilities remain provisional until SpotOn partner approval and sandbox contract
              testing are complete.
            </p>
          </div>
        </section>

        {/* Stack */}
        <section className="mkt-section">
          <div className="mkt-shell">
            <div className="mkt-section__head">
              <span className="mkt-eyebrow">Engineering</span>
              <h2>A modern, accountable foundation.</h2>
              <p>
                Built as a modular monolith with a durable outbox, tenant isolation, and structured
                observability — engineered so AI assistance is bounded and every action is
                attributable.
              </p>
            </div>
            <div className="mkt-stack">
              {STACK.map((s) => (
                <span className="mkt-chip" key={s}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mkt-cta" id="contact">
          <div className="mkt-shell">
            <span className="mkt-eyebrow mkt-eyebrow--center">Let’s talk</span>
            <h2>Investing, partnering, or integrating? We’d like to hear from you.</h2>
            <p>
              We’re raising to bring AETHER to its first pilot and working toward SpotOn integration
              approval. Reach out for the deck, a product walkthrough, or partnership details.
            </p>
            <div className="mkt-cta__actions">
              <a className="mkt-btn mkt-btn--primary" href={`mailto:${CONTACT_EMAIL}`}>
                Email the team
              </a>
              <a className="mkt-btn mkt-btn--ghost" href={REPO_URL} rel="noreferrer">
                View the engineering baseline
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="mkt-footer">
        <div className="mkt-shell mkt-footer__row">
          <span>
            © {new Date().getFullYear()} AETHER. An optional layer for human-led hospitality.
          </span>
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </div>
      </footer>
    </>
  );
}
