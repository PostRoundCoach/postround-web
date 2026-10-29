---
name: Apple review release scope
description: Keep the website identity and signup-name release separate from unrelated uploaded-reference cleanup.
---

During preparation for Apple review and the app release, push only the website business-identity and signup-name feature updates; exclude the unrelated cleanup removing uploaded reference files.

**Why:** The user explicitly said, “We don't want unrelated asset cleanup mixed into the website identity and signup-name changes while preparing for the Apple review and app release.”

**How to apply:** A generic request to push later workspace updates is not approval to include that declined cleanup. Check outgoing changes and preserve existing remote reference files unless the user separately approves their removal. Use scoped commits rather than a wholesale merge when needed.
