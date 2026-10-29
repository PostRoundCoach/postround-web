---
name: Web signup name scope
description: Owner clarification separating the example app-created name from creator-referred web signup.
---

Focus the display-name investigation on creator-referred web signup. The owner
confirmed that the connected Supabase project is correct and that the example's
email-valued profile name was populated by the app signup flow in a completely
different codebase. Do not treat that value as incorrect or as evidence of a web
mapping defect, and do not investigate or repair that example.

**Why:** The owner explicitly corrected the investigation's focus; the example
illustrates the destination field, not a demonstrated web email-substitution bug.

**How to apply:** Trace the chosen web name from signup metadata to the
UUID-matched profile using actual initializer evidence. Keep native behavior
outside scope and do not infer a defect from the example's contents.

For this display-name fix, use the existing Post Round environment. Do not
create a local or remote test environment or require a separate Supabase
project. Prepare and validate the minimal function-only migration with existing
tooling, then request explicit approval before applying it to production.
Future signup/account tests require separate authorization.

**Why:** The owner explicitly narrowed this fix to avoid blocking it on separate
test projects or account creation.

**How to apply:** Do not restore the earlier clone/test-project acceptance gate
for this fix. Report source/static checks separately from deployed verification
and actual future signup evidence.
