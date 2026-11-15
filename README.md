# T3 Code sidebar fork

This fork's T3 Code lists each thread's subagents under its row in the sidebar.

- The app code is on `feat/nested-sidebar-subagents`. It is upstream `main` plus one patch.
- `.github/workflows/fork-nightly.yml` runs every 6 hours. It rebases the patch onto upstream,
  checks it, builds the Windows installer, and publishes it as a prerelease here.
- Installed copies update themselves from these releases through T3 Code's normal updater
  (Settings › Updates, nightly channel).
- If the patch conflicts with upstream, the run fails and installed apps keep the last release.
