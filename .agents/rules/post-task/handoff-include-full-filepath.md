# Handoff: Always Include the Full Exact Filepath

**Applies to:** Agents creating or referencing handoff files

## The Rule

Always provide the **full exact filepath** when creating and/or inlining a handoff file. When telling the user to hand it to the next session, include the exact path they should reference.

## Why

The user needs to copy-paste the path directly into the next session. Relative paths or vague references ("it's in the repo root") force them to hunt for the file.

## How to Apply

- When creating a handoff file, state the full path (e.g., `C:\Users\jager\OneDrive\Documents\GitHub\template-repo\HANDOFF.md`).
- When telling the user to hand it to the next session, include the exact path they should reference.
- No relative paths, no vague "it's in the repo root" references.