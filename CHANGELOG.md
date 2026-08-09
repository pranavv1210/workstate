# Changelog

## 0.2.1

- Added quiet, configurable VS Code-native notifications for welcome-back context, meaningful save batches, branch changes, and handoff readiness.
- Added notification deduplication using workspace-scoped VS Code state.
- Added creator information for Pranav / pranavv1210 in package metadata, README, and the extension About section.
- Rewrote README around WorkState's context-memory direction with clear current vs future capability boundaries.
- Added tests for notification settings, deduplication, meaningful-activity thresholds, and package metadata.

## 0.2.0

- Redesigned the sidebar around context memory instead of task-management fields.
- Added automatic workspace context creation and rehydration.
- Added context reconstruction for Continue Work and Handoff using stored activity plus lightweight Git context.
- Reinterpreted existing WorkState records into context summaries without deleting old data.
- Hid the old Task / Goal / Current State / Blocker / Next Action form from the primary UX.
- Added Capture-first sidebar actions and recent activity summaries.
- Added tests for context creation, old-data interpretation, duplicate prevention, and continuation context generation.

## 0.1.4

- Fixed Create WorkState quick-input flow getting stuck after the first Enter.
- Replaced chained `showInputBox()` prompts with explicit per-step InputBox lifecycle management.
- Added regression tests for WorkState creation prompt capture and cancellation.

## 0.1.3

- Added a default keyboard shortcut for `WorkState: Quick Capture`.
- Added native VS Code keybinding contribution so users can customize the shortcut in Keyboard Shortcuts.
- Added `Ctrl/Cmd+Enter` submit behavior inside the Quick Capture panel while preserving multiline Enter input.

## 0.1.2

- Added `WorkState: Quick Update`.
- Added `WorkState: Quick Capture`.
- Added compact multiline update/capture panels with explicit developer-selected update types.
- Added Quick Update handling for completed work, current state, blockers, decisions, rejected approaches, test results, next action, and notes.
- Added Task DNA events for every Quick Update and Quick Capture.
- Added blocker add/replace behavior.
- Added test-result appending without overwriting previous test notes.
- Added tests for Quick Update behavior, persistence, Task DNA ordering, handoff integration, and invalid input.

## 0.1.1

- Improved Quick Handoff with decisions, test notes, and stronger Don't Repeat guidance.
- Added a multiline WorkState edit panel for long field values.
- Added relevant-file removal.
- Added explicit confirmations before deleting decisions or rejected approaches.
- Improved corrupted-state recovery messaging and sidebar recovery action.
- Expanded default privacy exclusions for credentials, service-account files, and token/secret text files.
- Updated tests for V1.1 handoff quality, privacy filtering, and edit/delete behavior.

## 0.1.0

- Initial WorkState V1.
- Added VS Code Activity Bar sidebar.
- Added manual WorkState creation, editing, archiving, and local persistence.
- Added Quick and Full Handoff generation with editable preview and clipboard copy.
- Added simple Task DNA history.
- Added basic Git branch, changed-file, and recent-commit awareness.
- Added privacy exclusions for sensitive-looking files.
- Added unit tests and marketplace-ready documentation.
