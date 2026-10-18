# TODO - Consolidate legacy root docs into /docs

- [ ] Create docs subfolders:
  - [ ] docs/page-transitions/
  - [ ] docs/pull-to-refresh/
  - [ ] docs/project/
- [ ] Move legacy root markdown docs into appropriate /docs subfolders (no content loss):
  - [x] PAGE*TRANSITION*\* and TRANSITION_IMPLEMENTATION_GUIDE into docs/page-transitions/
  - [x] PULL*TO_REFRESH*\* into docs/pull-to-refresh/
  - [x] IMPLEMENTATION_SUMMARY, FILE_STRUCTURE_SUMMARY, DEAD_CODE_DETECTION, LEADERBOARD_PROVIDER_PROFILE_TESTS into docs/project/
- [ ] Handle FORCED_COLORS_GUIDELINES.md vs docs/forced-colors-guide.md:
  - [x] Moved FORCED_COLORS_GUIDELINES.md into docs/project/ as a legacy copy (no deletion; prevents silent loss)
- [x] Remove stray empty add.md
- [ ] Update README.md with “Additional documentation” section linking to the consolidated docs structure (section-level links)
- [ ] Run verification:
  - [ ] npm test
  - [ ] npm run lint
- [ ] Double-check there are no remaining legacy root-level docs (except README/LICENSE)
