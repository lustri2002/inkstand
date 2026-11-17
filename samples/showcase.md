---
title: Release checklist
owner: Platform team
tags: [release, process]
---

# Release checklist

This is the checklist we follow before every **production release**. Keep it short, keep it *honest*, and update it when something surprises us.

> A release is boring when the checklist did its job.

## Before the freeze

Make sure the branch is green and the changelog is readable by humans.

- [x] All CI checks pass on `main`
- [x] Changelog reviewed by a second person
- [ ] Feature flags for unfinished work are **off**
- [ ] Migration dry-run completed on staging

### Owners

| Area        | Owner   | Backup  |
|-------------|---------|---------|
| Backend     | Marta   | Luca    |
| Web client  | Sofia   | Giulia  |
| Mobile      | Davide  | Marta   |

## Release day

Tag the release and let the pipeline do the rest:

```bash
git tag -a v2.4.0 -m "Release 2.4.0"
git push origin v2.4.0
```

### Smoke tests

Run the smoke suite against production as soon as the deploy finishes:

```ts
const checks = ['login', 'checkout', 'search'];
for (const name of checks) {
  await runSmokeTest(name, { env: 'production', retries: 2 });
}
```

### Rollback plan

1. Revert the release tag.
2. Redeploy the previous version from the pipeline.
3. Post a short note in the incident channel.

## After the release

Write down what went well and what did not, while it is still fresh. Link the notes from the [team handbook](https://example.com/handbook).

### Metrics to watch

- Error rate in the first hour
- p95 latency of the checkout API
- Support tickets mentioning the new features
