# Releasing

Releases are cut from `main` by pushing a version tag. Nothing else publishes anything.

## Steps

1. Merge the work into `main` through a pull request (CI must be green).
2. Move the `[Unreleased]` entries in `CHANGELOG.md` under a new `## [x.y.z] - yyyy-mm-dd` heading.
3. Bump the version: `npm version x.y.z --no-git-tag-version`, commit as `bump: release version x.y.z`, push.
4. Tag that commit and push the tag: `git tag -a vx.y.z -m "vx.y.z" && git push origin vx.y.z`.

## What the tag does (`.github/workflows/release.yml`)

- Builds Windows (`windows-2022`), Linux (`ubuntu-24.04`) and macOS (`macos-15`) in parallel.
  Runners are pinned so a `-latest` image migration cannot change a release.
- Each build uploads its installers as a workflow artifact. `electron-builder` runs with
  `--publish never`, so it never creates a release on its own.
- A single `publish` job runs only if **all three** built, checks that every expected file exists
  (`.exe`, `.dmg`, `.AppImage`, `latest.yml`, `latest-linux.yml`) and creates the GitHub release.
  A failed platform therefore never leaves a half-published release that auto-update could pick up.
- Only the Windows build receives the signing secrets (`CSC_LINK`, `CSC_KEY_PASSWORD`).

## Testing a change to the pipeline

A pull request that touches `release.yml` runs the three builds and keeps the output as workflow
artifacts (7 days) without publishing. Use that before tagging.

## If a release goes wrong

- Delete the release and its tag (`gh release delete vx.y.z --cleanup-tag --yes`), fix, and tag again.
  Because publishing is one atomic job, a failed build leaves nothing to clean up.
- Users who already auto-updated stay on that version; ship a new patch version rather than reusing a tag
  that was published.

## Known limits

- No Apple Developer ID: the macOS build is ad-hoc signed and not notarized (right-click, Open).
  Only Apple Silicon is built.
- The Windows installer is signed with a self-signed certificate (SmartScreen warns), and
  `verifyUpdateCodeSignature` is `false`, so updates are not signature-checked.
- Actions are pinned to commit SHAs; Dependabot (`.github/dependabot.yml`) proposes updates weekly.
