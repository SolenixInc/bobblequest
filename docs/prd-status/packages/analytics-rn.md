---
title: analytics-rn
type: package
status: draft
last_audited: 2026-04-27
---

## Overview

React Native analytics package wrapping PostHog with Clean Architecture
ports, DI registration, and React hooks.

## Status

- [x] Port definitions (analytics tracker interface)
- [x] NoOpAnalyticsTracker implementation
- [x] PostHogRnAnalyticsTracker implementation
- [x] DI registration (registerAnalyticsRnDI)
- [x] React hooks (useAnalytics, useIdentify, useScreen)
- [x] Unit tests (71 tests, colocated)
- [ ] PostHog self-hosted deployment guide
- [ ] E2E test with real PostHog instance
