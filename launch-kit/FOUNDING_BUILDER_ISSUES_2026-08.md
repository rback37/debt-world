# Founding builder issue set · August 2026

Publication target: `rback37/debt-world`

Every issue is intentionally small enough to claim without production access. Contributors must use synthetic data and must not post exact personal finances, credentials, private conversations, or identifiable screenshots.

## 1. Contribution-page accessibility

**Title:** `[Good first issue] Audit the new contribution page for keyboard and screen-reader clarity`

**Labels:** `good first issue`, `help wanted`, `accessibility`

The new `/contribute` and `/en/contribute` pages should work without a mouse and should make every external GitHub action understandable to assistive technology.

### Small scope

- Check heading order, landmark structure, focus order, link names, visible focus, and keyboard access.
- Check both Chinese and English routes at desktop and narrow mobile widths.
- Propose or implement the smallest fixes in `app/ContributePage.tsx` and `app/globals.css`.

### Done when

- All actions can be reached and understood using keyboard navigation.
- Focus is visible against the current dark-green, acid-yellow, coral, and blue palette.
- No content is removed solely to make the audit pass.
- `npm run build` succeeds.

Claim this issue with a short comment describing the browser and assistive technology you can test. Use synthetic examples only.

## 2. Spanish public-beta review

**Title:** `[Localization] Review the first 25 Spanish public-beta strings for clarity and dignity`

**Labels:** `good first issue`, `help wanted`, `translation`

Debt World currently supports Chinese and English. Before adding Spanish routes, we need a human-reviewed starter glossary that avoids debt shaming and works across more than one Spanish-speaking region.

### Small scope

- Propose Spanish versions of 25 short public strings from signup, safety, contribution, and repayment progress.
- Flag wording that changes meaning across regions rather than forcing one universal phrase.
- Keep financial and legal language educational; do not invent country-specific legal advice.

### Deliverable

A Markdown table with source string, Spanish proposal, broad region note, and risk/ambiguity note. No code change is required for the first contribution.

Do not include a real debt story or personal financial details. Comment to claim the review before starting.

## 3. Android small-screen test

**Title:** `[Good first issue] Test signup and first world entry on one small Android screen`

**Labels:** `good first issue`, `help wanted`, `testing`, `mobile`

We need one reproducible, privacy-safe walkthrough on an Android phone with a narrow screen.

### Test path

1. Open the public site in a private/incognito session.
2. Review the registration previews and create a disposable synthetic test account.
3. Choose a country, complete or skip optional profile fields, and enter the world.
4. Check text size, horizontal overflow, action discovery, character controls, and zoom controls.
5. Delete the synthetic account when finished.

### Deliverable

- Device family, Android version, browser, viewport or screen size.
- Reproduction steps for each problem.
- Privacy-safe screenshots with usernames and any financial values removed or synthetic.

Never test another user's account or publish cookies, passwords, exact personal finances, or private conversations.

## 4. Slow-network account audit

**Title:** `[Testing] Audit signup and login recovery on a slow or high-latency connection`

**Labels:** `help wanted`, `testing`, `reliability`

Debt World is intended for global use, including slower or unstable connections. We need a focused audit of loading, timeout, retry, and duplicate-submit behavior.

### Small scope

- Test registration and login with browser network throttling or a naturally slow connection.
- Check whether the account screen appears after a timeout, error messages remain understandable, and buttons prevent duplicate submissions.
- Test one successful retry without reloading when possible.

### Done when

The report includes timing, browser, steps, expected behavior, actual behavior, and one suggested smallest fix. Use only a disposable synthetic account and never attach raw responses containing secrets or identifiers.

## 5. Brazil debt-category map

**Title:** `[Regional review] Map common debt categories in Brazil without personal data`

**Labels:** `good first issue`, `help wanted`, `research`, `translation`

The current global taxonomy needs human review before it can represent Brazil responsibly.

### Small scope

- Review the current broad categories: mortgage, credit card, education, medical, vehicle, personal, business, BNPL, family/friends, and other.
- Identify missing or misleading high-level categories used in Brazil.
- Provide neutral Portuguese labels and one reliable public source for terminology when available.
- Note which categories should stay grouped to reduce re-identification risk.

Do not submit a personal debt story, lender account, exact amount, or individualized legal/financial advice. The result is a category proposal, not an automatic production change.

## 6. Mobile zoom and action discovery

**Title:** `[Design] Improve mobile world zoom and top-action discoverability`

**Labels:** `help wanted`, `design`, `mobile`, `ux`

The shared world has several important actions—planner, community, invite, build, feedback, account, safety, and language. On narrow screens the horizontal action strip can hide important controls.

### Small scope

- Review the current mobile header and world zoom controls.
- Propose one low-complexity interaction that keeps the world visible and makes essential actions discoverable.
- Include states for first visit and returning use.

### Deliverable

A privacy-safe wireframe, annotated screenshot using synthetic content, or a small code prototype. Keep admin controls, production data, and private financial content out of the design.

Acceptance prioritizes readable labels, thumb reach, keyboard access, and no overlap with the real-life rules panel.

## 7. Privacy-copy review

**Title:** `[Privacy review] Audit contribution and public-story wording for accidental oversharing`

**Labels:** `help wanted`, `privacy`, `content`

Debt World asks users and contributors to share only what is needed. We need a wording audit that catches moments where someone might misunderstand a public field as private.

### Small scope

- Review `/contribute`, `/en/contribute`, the community story composer, and GitHub templates.
- Identify any sentence that could encourage names, exact amounts, account details, private conversations, or unauthorized stories.
- Suggest shorter, clearer alternatives in Chinese or English.

### Done when

The review lists the location, current wording, risk, and proposed wording. This is a product-language review, not legal advice. Do not include real user text or production screenshots.

## 8. Ten-minute local setup checklist

**Title:** `[Good first issue] Add a 10-minute Windows, macOS, and Linux setup checklist`

**Labels:** `good first issue`, `help wanted`, `documentation`

The README contains the commands, but a first-time contributor still needs a short path from clone to a verified local page.

### Small scope

- Document prerequisites for Node.js 22.13+ and the existing npm workflow.
- Add separate notes for PowerShell, macOS, and Linux only where commands differ.
- Explain how to use synthetic test data and which local files must never be committed.
- End with `npm run build`, `npm run lint`, and the test command.

### Done when

A new contributor can clone, install, start, verify, and stop the app without production credentials. Do not add real environment values or secrets to the documentation.
