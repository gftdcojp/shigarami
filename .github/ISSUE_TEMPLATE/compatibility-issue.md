---
name: Compatibility Issue Report
about: Report a dependency compatibility issue you've encountered
title: "[COMPAT] Framework@version + Library@version = Issue"
labels: compatibility, bug
assignees: ''
---

## Issue Summary
<!-- Briefly describe the compatibility issue you encountered -->

## Framework & Environment Details
<!-- Required fields -->

**Framework:**
- Name: `next` / `astro` / `remix` / `vite` / `nuxt` / etc.
- Version: `15.0.0`

**React Version:** (if applicable)
- Version: `19.0.0`

**Node.js Version:**
- Version: `20.11.0`

**Package Manager:**
- Type: `npm` / `yarn` / `pnpm`
- Version: `10.5.0`

## Additional Libraries
<!-- List any additional libraries that caused the conflict -->

- `next-auth@5.0.0-beta.3`
- `react-query@5.0.0`
- `recoil@0.7.7`

## Error Description
<!-- Provide the exact error message -->

```
ERESOLVE could not resolve peer dependencies
```

## Steps to Reproduce
<!-- How can someone else reproduce this issue? -->

1. Create a new Next.js project: `npx create-next-app@latest my-app`
2. Install dependencies: `npm install next-auth@5.0.0-beta.3`
3. Try to build: `npm run build`
4. See error

## Expected Behavior
<!-- What should happen? -->

The installation should succeed without conflicts.

## Workaround (if any)
<!-- If you found a workaround, please share it -->

Use `--legacy-peer-deps` flag:
```bash
npm install --legacy-peer-deps
```

Or downgrade React:
```bash
npm install react@18.2.0 react-dom@18.2.0
```

## Additional Context
<!-- Any other information that might be helpful -->

- OS: macOS 14.0
- Browser: Chrome 120.0
- Related issues: [link to similar issues if known]

## Verification
<!-- Help us verify this issue -->

- [ ] I have tried this with a fresh project
- [ ] I have checked existing issues for duplicates
- [ ] I am willing to help test potential fixes

---

**Thank you for helping improve dependency compatibility!** 🎉
