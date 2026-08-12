# Nil (Frontend)

The SvelteKit frontend for [Nil](https://github.com/jdeinum/budget_backend), a
personal finance tracker. Most of the actual detail — what it does,
screenshots, the data model, running it, testing — lives in the
[backend README](https://github.com/jdeinum/budget_backend).

## Disclaimer

This frontend is almost entirely AI-written and has **not** been reviewed by
me, with one exception: the Plaid integration (link token creation, token
exchange, and anything else that touches Plaid credentials or account data),
which I wrote by hand and reviewed against
[Plaid's own docs](https://plaid.com/docs/).

Everything else — UI, data fetching, forms, whatever's rendering your
numbers — has not had a human review pass. Don't take my word that it's
safe or correct. If you're going to run this against your own financial
data, read the code first.
