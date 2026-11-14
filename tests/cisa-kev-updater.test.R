# Exercise the real updater with synthetic inputs and an isolated output file.
test_updater <- function() {
  fixture <- tempfile('kev-test-')
  dir.create(fixture)
  on.exit(unlink(fixture, recursive=TRUE))

  updater <- 'cybersecurity/security-proposal-workspace/kev/update-kev.R'
  executable <- if (.Platform$OS.type == 'windows') 'Rscript.exe' else 'Rscript'
  rscript <- file.path(R.home('bin'), executable)
  csv <- file.path(fixture, 'catalog.csv')
  metadata <- file.path(fixture, 'catalog.json')
  snapshot <- file.path(fixture, 'snapshot.json')
  valid_dates <- c('2023-03-31', '2024-02-29', '2024-03-01', '2024-03-01')
  valid_release <- '2024-03-02T23:59:59.1234Z'

  run_updater <- function(dates=valid_dates, release=valid_release, version='2024.03.02') {
    writeLines(c('cveID,dateAdded', paste0('CVE-2024-000', seq_along(dates), ',', dates)), csv)
    writeLines(sprintf('{"catalogVersion":"%s","dateReleased":"%s","count":%d}',
                       version, release, length(dates)), metadata)
    args <- shQuote(c(updater, '--csv', csv, '--metadata', metadata, '--output', snapshot))
    log <- suppressWarnings(system2(rscript, c('--vanilla', args), stdout=TRUE, stderr=TRUE))
    status <- attr(log, 'status')
    list(status=if (is.null(status)) 0L else status, log=log)
  }

  expect_result <- function(result, status, message) {
    if (result$status != status || !any(grepl(message, result$log, fixed=TRUE))) {
      stop('Expected exit ', status, ' and message "', message, '". Output: ',
           paste(result$log, collapse='\n'))
    }
  }

  expect_result(run_updater(), 0L, 'Snapshot updated')
  lines <- readLines(snapshot)
  stopifnot(any(grepl('"catalogCount": 4', lines, fixed=TRUE)),
            any(grepl(valid_release, lines, fixed=TRUE)),
            any(grepl('{"month":"2024-02","count":1}', lines, fixed=TRUE)),
            any(grepl('{"month":"2024-03","count":2}', lines, fixed=TRUE)),
            !any(grepl('"month":"2023-03"', lines, fixed=TRUE)),
            sum(grepl('"month":', lines, fixed=TRUE)) == 12L)
  original <- tools::md5sum(snapshot)
  expect_result(run_updater(), 0L, 'Snapshot unchanged')
  stopifnot(identical(tools::md5sum(snapshot), original))

  expect_rejected <- function(result, message) {
    expect_result(result, 1L, message)
    stopifnot(identical(tools::md5sum(snapshot), original))
  }

  for (date in c('2024-02-29junk', '2024-2-29', '2023-02-29')) {
    expect_rejected(run_updater(dates=replace(valid_dates, 2L, date)), 'Invalid catalog addition date')
  }
  expect_rejected(run_updater(dates=replace(valid_dates, 2L, '2024-03-03')), 'Future catalog addition date')
  for (stamp in c('2024-03-02T99:59:59Z', '2024-03-02T12:60:00Z', '2024-03-02T12:00:60Z')) {
    expect_rejected(run_updater(release=stamp), 'Invalid catalog metadata')
  }
  expect_rejected(run_updater(release='2024-02-31T12:00:00Z'), 'Invalid catalog release date')
  expect_rejected(run_updater(version='2024.02.31'), 'Invalid catalog version date')
  message('CISA KEV updater checks passed.')
}

test_updater()
