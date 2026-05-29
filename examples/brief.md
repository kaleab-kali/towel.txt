---
title: Launch Readiness Brief
subtitle: Decision memo for a package milestone
author: Towel.txt contributors
date: 2026-05-29
---

# Launch Readiness Brief

## Decision

Proceed with package-readiness work after the documentation examples are merged.

## Context

Towel.txt now supports the core document workflow: HTML output, PDF export,
custom CSS, config files, strict mode, and package smoke testing. The remaining
work is mostly release discipline and documentation polish.

## Recommendation

- Keep the next change focused on package metadata and publishable file lists.
- Keep release automation behind the package-readiness milestone.
- Continue requiring CI and local smoke checks for each PR.

## Non-Goals

- Do not publish the package from this brief.
- Do not add release automation before package metadata is reviewed.
- Do not change the public CLI surface in this documentation-only milestone.
