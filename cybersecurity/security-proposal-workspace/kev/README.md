# CISA catalog additions chart

This is public, real-world CISA data. The chart counts entries currently in the CISA Known
Exploited Vulnerabilities catalog by the month CISA added them. It is not a
count of attacks, all vulnerabilities, or a compliance or risk score.
Corrections or removals can change historical totals. The latest catalog
month is incomplete through the displayed release date.

## How the update works

1. `.github/workflows/refresh-cisa-kev.yml` runs daily at 17:17 UTC and can
   also be run manually. R downloads the public CSV and JSON directly from CISA.gov.
2. `update-kev.R` checks expected columns, unique CVE IDs, exact calendar dates,
   UTC release timestamps, the record count, and consistent catalog metadata
   before and after the download. These checks do not prove every record in
   the CSV matches the JSON.
3. R groups the records by date added and writes `snapshot.json`. It leaves
   the last good snapshot untouched if retrieval or validation fails. An
   unchanged catalog produces no new commit.
4. A changed snapshot queues the Pages deployment workflow, which includes
   it in the approved file package and scans that package before publishing.
   A manual refresh also queues this workflow so the current snapshot can
   be republished after a failed deployment.
5. The chart requests the published JSON from the portfolio when the chart
   comes into view. If that request fails, it uses `fallback.js`, the bundled
   last known snapshot, and says that it may be out of date.

The displayed timestamp is **CISA's catalog release time**, not the last
successful scheduled check. GitHub schedules can be delayed or disabled after
60 days of repository inactivity. Check the workflow run history if an
automatic refresh is late; the workflow requires repository content write
permissions. The browser displays a warning when the source release is more
than 14 days old, which does not itself establish whether an update failed.

## Reproduce it

From the repository root, install R and run:

```powershell
Rscript --vanilla cybersecurity/security-proposal-workspace/kev/update-kev.R --output cybersecurity/security-proposal-workspace/kev/snapshot.json
```

Internet access is required. The generated file is public and contains no
workplace information. To test with your own copy of the public source data,
pass both `--csv path/to/catalog.csv` and `--metadata path/to/catalog.json`.

Two checks run from the repository root:

```powershell
Rscript --vanilla tests/cisa-kev-updater.test.R
node --test tests/cisa-kev-chart.test.cjs
```

The R test builds a snapshot from synthetic inputs and confirms that malformed
dates or timestamps leave the previous snapshot in place. The refresh workflow
runs this test before downloading CISA data. The browser tests check snapshot
loading, validation, and fallback behavior.

Sources include the [CISA KEV catalog](https://www.cisa.gov/known-exploited-vulnerabilities-catalog), [GitHub Actions
schedules](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule),
and [GitHub token workflow behavior](https://docs.github.com/en/actions/concepts/security/github_token).
