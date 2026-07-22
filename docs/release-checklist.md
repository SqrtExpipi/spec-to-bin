# Release checklist

This checklist is for maintainers publishing a stable Spec to BIN release.

## 1. Prepare the release pull request

- [ ] Start from the latest `main`.
- [ ] Confirm `package.json` and `package-lock.json` contain the intended app version.
- [ ] Confirm `CHANGELOG.md` has the release date and user-visible changes.
- [ ] Confirm the template contract version is unchanged unless a format migration is planned.
- [ ] Run the automated verification:

```powershell
npm ci
npm run test:run
npm run build
npm run build:offline
```

- [ ] Confirm `dist-offline/Spec-to-BIN-Offline.html` is generated and the offline verifier passes.
- [ ] Merge only after CI passes.

## 2. Manual smoke test

Test the production build in the latest stable Google Chrome and Microsoft Edge.

- [ ] Switch between English and Japanese.
- [ ] Switch between system, light, and dark themes.
- [ ] Open a JSON file, drop a JSON file, edit JSON directly, and save JSON.
- [ ] Edit every supported field category: integer, `bytes`, `string`, `ipv4`, and `padding`.
- [ ] Check `uint64` and `int64` values beyond JavaScript's safe integer range.
- [ ] Check ASCII, UTF-8, and Shift_JIS fixed-length strings and byte-length validation.
- [ ] Confirm invalid values and expected-offset mismatches block BIN export.
- [ ] Save a BIN and verify its filename, size, and representative bytes.
- [ ] Check Hex preview highlighting and ASCII/UTF-8/Shift_JIS text display.
- [ ] Check copy output formats and the 64 KiB copy limit.
- [ ] Compare against matching and mismatching BIN files.
- [ ] Check row add, duplicate, delete, drag, batch selection, repeat, paste, Undo, and Redo.
- [ ] Check New template and Restore saved with unsaved changes.
- [ ] Install or launch the PWA and repeat a basic JSON-to-BIN flow.
- [ ] Open the self-contained offline HTML with `file://` and repeat a basic JSON-to-BIN flow.
- [ ] Confirm no template, value, or BIN content is uploaded and no telemetry request is sent.

## 3. Publish

After the release pull request is merged, tag the exact `main` commit. Do not reuse or move an
existing public tag.

```powershell
git switch main
git pull --ff-only origin main
git tag -a v0.2.0 -m "Spec to BIN v0.2.0"
git push origin v0.2.0
```

The `Release offline ZIP` GitHub Actions workflow runs tests, builds the self-contained offline
version, creates `spec-to-bin-offline-v0.2.0.zip`, and publishes a GitHub Release.

## 4. Verify the published release

- [ ] Confirm the tag points to the intended merge commit.
- [ ] Confirm the Release workflow succeeded.
- [ ] Download and extract the release ZIP.
- [ ] Open `Spec-to-BIN-Offline.html` and complete a basic generation flow.
- [ ] Confirm the app header shows `v0.2.0`.
- [ ] Confirm GitHub Pages shows the same version after deployment.
- [ ] Confirm README release links open the new release.
- [ ] Record any release problem as an Issue. Publish a new patch version instead of moving the tag.
