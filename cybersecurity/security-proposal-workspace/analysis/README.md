# Fictional security findings chart

The featured Project 004 chart summarizes the fictional assessment as of
October 28, 2026. It is a static snapshot of recorded requirement states, not a
live scan, a compliance score, or proof that evidence is valid.

The assessment engine exports `../reports/crosswalk.csv` and `../reports/gaps.csv`.
`summarize_findings.R` uses base R to count requirements in each of the six
selected NIST CSF functions. For each function it selects one recorded
requirement that needs work, preferring a high-priority item, and includes all
recorded gaps for that example. A requirement can have more than one gap, so
the number of gap items is not the same as the number of requirements needing
work.

To recreate the checked-in data from this directory:

```powershell
Rscript --vanilla summarize_findings.R
```

The script generates `findings.json` for inspection and `findings-data.js` for
the website. Both contain the same data. The browser loads the generated JS
file locally, and `scripts/security-findings.js` builds the accessible chart.
There is no live request to a backend or external plotting service.

If using refreshed fictional reports, make sure they come from the same
assessment run and pass their correct assessment date:

```powershell
Rscript --vanilla summarize_findings.R --input ../reports/crosswalk.csv --gaps ../reports/gaps.csv --as-of 2026-10-28 --output findings.json
```

Change the date to the new report's `as_of` value. Review regenerated output
and run the site's tests before publishing. The two MD5 values track source
file content for reproducibility; they are not security or compliance results.
