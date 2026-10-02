<!--
Sync Impact Report
- Version change: unratified scaffold -> 1.0.0
- Modified principles: none; replaced scaffold placeholders with six initial principles
- Added sections: Additional Constraints; Development Workflow
- Removed sections: none
- Follow-up TODOs: Ratification date requires project-owner confirmation
-->

# Skewb Solver Constitution

## Core Principles

### I. Code Reuse
Existing utility functions, clients, types, and domain logic MUST be located and reused
before new implementations are created. Duplicate code is prohibited unless a documented
technical constraint makes reuse impossible and the exception is approved in review.
This keeps behavior consistent and reduces maintenance surface area.

### II. Single Deployable Architecture
The system MUST remain a single deployable by default. Microservices, external message
queues, and other distributed components MUST NOT be introduced unless the requirement
explicitly requests them and the design documents their operational and architectural
trade-offs. Simplicity is the default because unnecessary distribution increases failure
modes and operational cost.

### III. Dependency Restraint
New third-party packages MUST NOT be installed when the standard library or an existing
project dependency can satisfy the requirement. Any necessary new dependency MUST have a
documented purpose, compatibility review, and clear ownership of updates and security.

### IV. Testable Boundaries
Tests MUST mock only external HTTP services and vendor APIs. Internal modules and database
calls MUST NOT be mocked. Unit tests MUST exercise pure logic directly; integration tests
MUST cover the real internal composition and persistence boundaries needed by the behavior.
This preserves confidence in internal contracts while keeping external dependencies
deterministic.

### V. Explicit Error Handling
Every asynchronous or network operation MUST expose an explicit result wrapper or domain
error. Generic catch blocks MUST NOT swallow failures. Errors MUST retain actionable context
and callers MUST handle expected failure paths explicitly.

### VI. Strict Typing
Code MUST use strict typing throughout. Variables, parameters, return values, and public
boundaries MUST have precise types where the language supports them. Implicitly untyped
values and `any` casts are prohibited; unsafe boundaries MUST be narrowed or validated
before entering typed domain logic.

## Additional Constraints

The project MUST preserve a clear separation between domain logic, I/O, and infrastructure.
Changes MUST favor the smallest design that satisfies the requirement, avoid speculative
abstractions, and document exceptions to these principles in the relevant change review.

## Development Workflow

Every change MUST identify affected principles, reuse opportunities, dependency impact,
typing implications, and test coverage. Reviews MUST reject duplicate implementations,
unjustified architectural distribution, avoidable dependencies, improper mocks, swallowed
errors, and unsafe typing. Focused regression tests MUST be run for each behavioral change;
the production build MUST be run when deployment or runtime behavior may be affected.

## Governance
<!-- Example: Constitution supersedes all other practices; Amendments require documentation, approval, migration plan -->

This constitution is the governing engineering standard for the repository. Amendments MUST
describe the affected principles, rationale, compatibility impact, and required migration
work. A maintainer MUST review and approve amendments before they become effective.

The version follows semantic versioning: MAJOR for incompatible principle removals or
redefinitions, MINOR for new principles or materially expanded requirements, and PATCH for
clarifications or non-semantic wording changes. Reviews MUST verify compliance with this
constitution and record justified exceptions. The constitution MUST be reviewed whenever
the architecture, supported runtime, or delivery model changes materially.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): confirm original adoption date | **Last Amended**: 2026-10-02
