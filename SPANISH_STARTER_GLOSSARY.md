# Spanish starter glossary · exact source strings

This is the source-of-truth packet for [Debt World issue #3](https://github.com/rback37/debt-world/issues/3). It contains the exact 25 English strings requested by the issue, taken from the current public beta on 2026-08-06. No access to production source code or private data is required.

## Review goal

- Propose concise, neutral Spanish that is broadly understandable across Spanish-speaking regions.
- Keep the English source column unchanged.
- Use the broad-region column to note alternatives only when wording materially differs across regions.
- Flag language that may sound shaming, promise an outcome, imply legal or financial advice, or overstate anonymity.
- Keep `Debt World` and `Kian` as product names. Translate feature labels by meaning rather than word-for-word when that improves clarity.
- Submit the completed table in a pull request or an issue comment. No personal debt story or financial information is needed.

## Product-owner context

- “Anonymous account” means no legal name, email, or phone number is required; it does not mean the service stores nothing.
- “Cash-flow pressure” is an educational planning view, not a credit score or diagnosis.
- “Debt-relief advice” refers to regulated or professional advice that the product does not provide.
- “The latest principal” means the user-confirmed remaining principal after a real payment; the product never assumes that a scheduled payment happened.

## The 25 strings

| ID | Area / surface | English source string | Spanish proposal | Broad-region note | Risk or ambiguity note |
|---:|---|---|---|---|---|
| 01 | Signup · headline | See this month clearly before you sign up | Ve este mes con claridad antes de crear tu cuenta | "Crear tu cuenta" is clear in all regions; "registrarte" is also common. | Emphasizes a monthly snapshot; avoid implying prediction or financial advice. |
| 02 | Signup · guest CTA | Try it without an account | Pruébalo sin crear una cuenta | "Sin cuenta" is shorter; "sin crear una cuenta" is clearer for first-time users. | None significant. |
| 03 | Signup · tab | Create an anonymous account | Crear una cuenta anónima | "Anónima" is understood broadly; clarify in nearby copy that no legal name, email, or phone is needed. | Could imply no data is stored; explain that anonymous means no identifying contact details, not no records. |
| 04 | Signup · tab | Sign in | Iniciar sesión | "Ingresar" or "Entrar" are common in some regions, but "Iniciar sesión" is standard across web products. | Avoid "Acceso" alone, which can mean access rather than sign-in. |
| 05 | Signup · field label | Username | Nombre de usuario | "Usuario" alone is shorter but can be ambiguous; "Nombre de usuario" is clear. | None significant. |
| 06 | Signup · username hint | 3–30 characters; not your legal name | De 3 a 30 caracteres; no uses tu nombre legal | The range is expressed without ambiguity. | Reinforces the privacy boundary without explaining why; nearby signup copy should state that no legal name is needed. |
| 07 | Signup · field label | Password | Contraseña | "Clave" is common in several regions; "Contraseña" is widely understood. | None significant. |
| 08 | Signup · password hint | 10+ characters with a letter and number | 10 caracteres o más, con al menos una letra y un número | "Al menos" avoids ambiguity about whether both are required. | None significant. |
| 09 | Signup · primary action | Create and enter | Crear y acceder | "Crear y entrar" can feel informal; "acceder" is neutral. | The action creates the account and signs in; keep both steps explicit. |
| 10 | Safety · headline | Your debt should never become your identity. | Tu deuda no debería definir tu identidad | Neutral and non-shaming in most regions. | Keep a supportive tone; avoid "deudor" labels in nearby copy. |
| 11 | Safety · principle | Private by default | Privado por defecto | "Privacidad por defecto" is also clear; "Privado" keeps the principle short. | Clarify what private means in this product: not public by default, not untraceable. |
| 12 | Safety · principle | Sharing takes a second choice | Compartir es una decisión aparte | The phrase reflects that sharing requires an extra deliberate step. | Avoid "segunda opción", which can sound like a fallback or less important choice. |
| 13 | Safety · privacy boundary | Exact debts, cashflow, and private chats are not public. | Las deudas exactas, el flujo de caja y los chats privados no son públicos. | "Flujo de caja" is understood; "flujo de efectivo" is also common. | Privacy boundary only; does not claim the service stores nothing. |
| 14 | Safety · prohibited uses | No data sale, ad targeting, or personal debt leaderboard. | Sin venta de datos, publicidad dirigida ni ranking personal de deudas. | "Ranking" is common; "clasificación" is a more formal alternative. | Describe product behavior; avoid broader privacy promises beyond the stated boundary. |
| 15 | Safety · advice boundary | This is an on-page snapshot—not financial, legal, or debt-relief advice. | Esto es una vista informativa de esta página; no es asesoramiento financiero, legal ni de alivio de deudas. | "Alivio de deudas" can vary by region; keep the disclaimer educational and avoid country-specific legal terms. | Strong boundary; avoid implying a formal debt-relief service. |
| 16 | Contribute · navigation | Help build this world | Ayuda a construir este mundo | "Crear" also works; "construir" matches the contribution metaphor. | None significant. |
| 17 | Contribute · task title | Make one language feel native | Haz que un idioma se sienta natural | "Nativo" can be interpreted as native speaker; "natural" focuses on the result. | Clarify that reviewers should be comfortable with the language, not necessarily certified translators. |
| 18 | Contribute · task description | Review a small set of interface strings and flag shaming, robotic, or locally confusing language. Start with just 10–25 lines. | Revisa un conjunto pequeño de textos de la interfaz y marca lenguaje estigmatizante, robótico o confuso en tu región. Empieza con solo 10–25 líneas. | "Estigmatizante" is neutral and avoids shame; "vergonzante" would be less appropriate. | Keep the scope small and invite regional notes rather than one universal phrase. |
| 19 | Contribute · action | Claim a translation review | Toma una revisión de traducción | "Solicita una revisión" is also clear; "toma" matches claiming a task. | Clarify the process: comment first, then submit a PR or completed table. |
| 20 | Contribute · principle | Every contribution is one brick in the world. | Cada contribución es un ladrillo en este mundo. | "Aportación" is also common in several regions; "contribución" is widely used. | None significant. |
| 21 | Repayment progress · metric | Planned payments | Pagos planificados | "Pagos programados" is common in some regions; "planificados" is neutral. | Distinguish planned schedule from confirmed payments. |
| 22 | Repayment progress · metric | Nearest due date | Próxima fecha de vencimiento | "Fecha límite" is also used; "vencimiento" is standard for payments. | Make clear it is the nearest due date, not a deadline set by the product. |
| 23 | Repayment progress · metric | After living costs & debt | Después de gastos básicos y deuda | "Gastos de vida" can be ambiguous; "gastos básicos" is more universally understood. | Educational estimate, not a personal financial result. |
| 24 | Repayment progress · metric | Cash-flow pressure | Presión sobre el flujo de caja | "Presión de flujo de caja" is shorter but can sound diagnostic; "sobre el flujo de caja" reads as a planning view. | Product owner clarified this is educational; avoid implying a score or diagnosis. |
| 25 | Repayment progress · behavior note | Tasks follow real dates. Progress changes only after you confirm what happened and enter the latest principal—never pretend debt reduction. | Las tareas siguen fechas reales. El progreso solo cambia después de que confirmas lo que ocurrió e ingresas el capital pendiente más reciente; nunca se simula una reducción de deuda. | "Capital pendiente" is clearer than "principal"; "ingresas" is broadly understood, though "registras" is also possible. | Reinforces that progress is user-confirmed and never assumed. |

## Acceptance check

A complete review fills all three reviewer columns for every row, preserves the meaning and safety boundaries, and clearly marks any wording that should vary by region rather than forcing one “universal” Spanish phrase.
