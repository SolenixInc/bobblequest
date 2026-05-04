# Skill Installation Security

**Applies to:** Agents installing skills (`npx skills add`)

## Rule

Skills run with full agent permissions — a compromised skill = a compromised agent. Verify every install.

## Required Verification

1. **Source authenticity.** Install from the original author/org. Be suspicious of wrapper repos with nested paths (e.g., `someone/something@obra/superpowers@skill` is typosquatting).
2. **Install count threshold.** ≥1,000 installs = install. <1,000 = flag to user. <100 = treat as untrusted, warn about supply chain risk.
3. **Security audit.** Check `https://skills.sh/<owner>/<repo>/<skill>`. No audit + low installs = don't install without confirmation.
4. **Repo check.** Owner matches expectation (`obra` for superpowers, `anthropics` for Anthropic, `vercel-labs` for Vercel). Meaningful stars and activity.

## Red Flags

- Another author's name/repo as a path segment
- Install count <1% of the original
- No stars, no README, recently created
- Description copied from a known skill, different author

## Verify Checklist

```
1. npx skills find "<query>"     # compare install counts
2. Visit skills.sh/<owner>/<repo> # audit status, installs, source
3. Confirm owner = expected      # obra NOT randomuser
4. Flag anything suspicious      # never silently install
```