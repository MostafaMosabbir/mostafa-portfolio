# Publishing the portfolio

The Pages workflow builds a fresh package from [approved-files.txt](approved-files.txt). Each entry names one tracked file. Review the contents and browser dependencies of a new file before adding its path. GitHub publishes the scanned package from the main branch after the inventory checks and Gitleaks scan pass.

To test the package locally, use Python 3.9 or newer and choose an output directory outside this checkout that does not yet exist.

```sh
python -B -m unittest discover -s .github/pages -p 'test_*.py'
python .github/pages/package.py build ../pages-preview
python .github/pages/package.py verify ../pages-preview
gitleaks dir --redact=100 --no-banner --max-archive-depth=2 --max-decode-depth=2 ../pages-preview
```

In GitHub Actions, select **Publish approved Pages files** and leave **Deploy after the artifact passes all checks** unchecked for a validation run. A failed check blocks publication and the last successful deployment stays live.

For an ordinary release, push the reviewed changes to `main`. GitHub Pages must use **GitHub Actions** as its publishing source. The scheduled R workflow calls the same gate after a changed CISA snapshot is committed. A manual run of **Refresh CISA KEV snapshot** also requests publication of the current snapshot for recovery and testing. The chart loads the published snapshot from the portfolio and uses the approved fallback if the request fails.

This gate controls files served by GitHub Pages. The repository has its own visibility and Git history. Keep credentials and private files out of Git.
