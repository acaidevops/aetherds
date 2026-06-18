# Guest and Staff Experience Specification

## 1. Experience direction

AETHER should feel modern, futuristic, minimal, warm, and premium. It must not resemble a dense POS or generic chatbot.

### Visual principles

- Dark, high-contrast surfaces suited to evening dining
- Warm restrained accents
- Vivid, approved dish photography
- Editorial typography and generous spacing
- Abstract AETHER mark; no realistic human avatar
- Restrained motion and reduced-motion support
- Transparent prices, visually secondary to dish understanding
- No neon-heavy science-fiction styling

## 2. Accessibility

Target WCAG 2.2 AA:

- Large touch targets
- Text scaling
- Screen-reader semantics
- Strong contrast
- No color-only status meaning
- Reduced motion
- Keyboard support for staff apps
- Real-device manual testing on standardized iPads

## 3. Guest navigation

Persistent, restrained controls:

- Home
- Menu
- Cart count and estimated subtotal
- Call server

Home routes:

1. Guide my experience
2. Browse the menu
3. Call my server

Guidance is optional, resumable, and advances only by explicit guest action.

## 4. Guided discovery

Suggested steps:

1. Dining intent
2. Party/diner setup if desired
3. Explicit allergy question
4. Dietary preferences and protein/spice preferences
5. Optional per-person or table budget
6. Curated meal recommendation

Manager-configurable intents include:

- Quick meal
- Family dinner
- Date night
- Chef experience
- Drinks and appetizers

Chef experiences use chef-approved templates with bounded substitutions.

## 5. Menu

- Image-led category browsing
- Search/filter using verified attributes
- Item detail includes description, price, portion guidance, spice, dietary tags, relevant allergen warnings, pairings, and modifiers
- Compare up to three items
- Session-only favorites
- Quick rejection reasons improve session recommendations
- Unpublished or unavailable items never appear as orderable

## 6. Cart and order review

Cart supports:

- Optional diner/seat assignment
- Shared item participants
- SpotOn-defined modifiers
- Structured notes requiring server review
- Item-by-item replacement
- Reorder by copying into a new cart

Final review explicitly displays:

- Items, quantities, and modifiers
- Diner/shared assignments
- Allergy status and warnings
- Estimated food/drink subtotal
- Exclusions for tax/fees/discounts/tips unless SpotOn supplies them
- “Sent to your server for confirmation”

Submission is one deliberate action.

## 7. Safety UX

Every session asks:

- None
- Tell us
- Ask my server
- Skip, recorded as `not provided`

Allergy and preference controls are separate. Strict tags such as vegan, gluten-free, or dairy-free ask whether the need is preference- or allergy-related.

AETHER uses language such as:

- “This item is excluded because cross-contact may be possible.”
- “We do not have verified information for this modifier. Your server can help.”
- “Please do not consume this item until your server confirms.”

Never use “safe,” “allergy-safe,” or equivalent guarantees.

## 8. Status language

Use calm hospitality wording:

- Sent to your server
- Your server is reviewing
- Please review these changes
- Confirming your order
- Confirmed by your server
- Being prepared
- Ready soon

Only verified SpotOn states permit kitchen-progress wording.

## 9. Service requests

Persistent `Call server` opens:

- Need water
- Need napkins
- Need server
- Need manager
- Refill drink
- Need check
- Special request
- Urgent assistance

Guests see submitted/accepted/in-progress/completed state. Repeat taps merge. Urgent assistance also tells the guest to signal nearby staff; AETHER is not an emergency service.

## 10. Check and feedback

`Request check`:

- Creates a high-priority AETHER service request
- Pauses new order submissions
- Does not calculate or close the check
- Can be withdrawn before staff accepts

Feedback:

- One dismissible prompt near closure
- 1–5 rating
- Structured tags for food, service, recommendations, speed, ease
- Optional protected comment
- Severe/safety feedback discreetly alerts manager

## 11. Staff experience

### Server dashboard

- Assigned tables
- Pending order approvals
- Service requests
- Allergy and alcohol alerts
- Guest revision confirmations
- Escalations
- Concise session context
- At most one nonblocking contextual suggestion

### Manager modes

`Live Floor`:

- Tables, server sections, pending alerts
- Integration/device health
- Pause/quarantine controls
- Incident and overdue work

`Insights`:

- Satisfaction and feedback
- Response times
- Recommendation acceptance
- Average check and menu trends
- Thresholded operational cohorts

No public staff leaderboard.

## 12. Tablet states

- Pre-session: welcome and read-only menu
- Active: full session experience
- Privacy lock: hidden content with `Continue`
- Cleaning mode: staff-authenticated interaction lock
- Paused: branded read-only menu directing guests to human service
- Quarantined: unavailable, staff instruction only

