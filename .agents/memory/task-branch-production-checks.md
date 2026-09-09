---
name: Production checks from task branches
description: Why production publishing cannot validate code that still exists only on an assigned task branch.
---

Publishing from the main Replit deploys the main Replit branch. Changes on an isolated in-progress task branch do not reach that deployment until the supported task-completion merge occurs, even if the user clicks Publish while the task is open.

**Why:** Repeated publishes produced new deployment commits but continued serving the pre-task API because the task branch had not merged into the main Replit branch.

**How to apply:** For tasks requiring production verification, complete local and contract validation first, merge through the supported task workflow, then publish and perform the live verification. Do not treat a publish during task isolation as evidence that the task code is deployed.