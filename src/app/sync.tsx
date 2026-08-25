/**
 * Route for the existing offline sync tools (Task 5). TEMPORARY location:
 * the root route (`src/app/index.tsx`) links here from its placeholder
 * "onboarding complete" screen so sync stays reachable pre-Task-9. Once
 * Task 9 adds a real Settings screen with a data-tools entry point, this
 * route can stay (or be pointed to from Settings instead) — see the comment
 * on `DashboardPlaceholder` in `src/app/index.tsx`.
 */
export { ConfiguredSyncScreen as default } from './index';
