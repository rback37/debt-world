# Ten-minute documentation contribution checklist

This repository is the public product-and-community home for Debt World. It
currently contains documentation and launch assets, not the production source.
That means Git is enough to contribute here: there are no Node.js, npm, build,
lint, or test commands on `main`.

## Before you start

- Install [Git](https://git-scm.com/downloads).
- Have a browser available if you want an optional Markdown preview. A plain
  text editor is enough for a small wording change.
- Work with synthetic examples only. Never paste a real password, token,
  environment value, bank detail, identity document, exact personal debt or
  income, private AI conversation, or screenshot showing personal browser or
  account information.

## 1. Clone or update the repository

Run this once:

```sh
git clone https://github.com/rback37/debt-world.git
cd debt-world
```

Before every new contribution, update your local copy:

```sh
git switch main
git pull origin main
```

Windows note: PowerShell uses these same Git commands. If your system cannot run
a command from a cloned script, use `Get-Content .\README.md` instead of opening
or running it blindly; do not execute files just because they came from a clone.

macOS/Linux note: the same commands work in Terminal. On macOS, Git may offer to
install the Command Line Tools the first time it is used.

## 2. Preview the documentation

Open one of the existing Markdown pages in your editor's preview, or view a file
in GitHub:

```sh
open README.md        # macOS
xdg-open README.md    # Linux with XDG
start README.md       # Windows PowerShell
```

If no opener is available, read the Markdown directly in your editor. Previewing
is optional; reviewing the source text is what matters most.

Check relative links and images by looking at their targets in the repository.
For example, confirm that a link such as `[Roadmap](ROADMAP.md)` points to a file
at the root of the repository. If an image path starts with `./`, verify the
file exists at that exact location.

To list all local Markdown files:

```sh
find . -name '*.md' -not -path './.git/*'   # macOS/Linux
Get-ChildItem -Recurse -Filter *.md         # Windows PowerShell
```

## 3. Make one small privacy-safe edit

Create a descriptive branch:

```sh
git switch -c docs/glossary-wording
```

Edit only one idea or section. For example, open `SPANISH_STARTER_GLOSSARY.md`,
clarify one synthetic example, or fix one typo in `README.md`. Keep formatting
consistent with the surrounding lines.

Save the file, then review exactly what changed:

```sh
git status
git diff
```

The diff should contain only intended text changes. Do not add editor settings,
screenshots, exports, logs, credentials, or generated files.

## 4. Review the privacy boundary

Look line-by-line through your proposed changes and ask:

- Could this reveal real money amounts, income, debts, accounts, contacts, or
  identity documents?
- Does any example contain a real-looking token, password, recovery code, email,
  phone number, or address?
- Does it expose another person or include a private AI conversation?
- Is every example clearly fictional?

If any answer is uncertain, remove the content before continuing.

## 5. Commit and open a focused pull request

Commit with a short, specific message:

```sh
git add SPANISH_STARTER_GLOSSARY.md
git commit -m "docs: clarify glossary example"
git push origin docs/glossary-wording
```

Then open the pull request link printed by Git, or choose **Compare & pull
request** on GitHub. Use the repository's pull-request template and explain:

1. What documentation problem you fixed.
2. How you checked links, images, and the rendered wording.
3. Confirmation that your examples and diff contain no personal data.

Keep the PR focused on one documentation change so it can be reviewed quickly.
