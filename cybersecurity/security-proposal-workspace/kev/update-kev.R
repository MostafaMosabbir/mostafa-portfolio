# CISA KEV public catalog additions, summarized using base R.
# The scheduled workflow runs this script independently of website visitors.
# Offline demo: Rscript update-kev.R --csv source/known_exploited_vulnerabilities.csv --metadata sample-catalog-metadata.json --output snapshot.json
# For a live refresh: Rscript update-kev.R --output snapshot.json
args <- commandArgs(trailingOnly = TRUE)
if (length(args) %% 2L) stop('Options must occur in flag/value pairs')
opts <- list()
if (length(args) > 0L) for (i in seq.int(1L, length(args), by = 2L)) {
  if (!(args[i] %in% c('--csv','--metadata','--output'))) stop('Unknown option: ', args[i])
  if (!is.null(opts[[args[i]]])) stop('Duplicate option: ', args[i])
  opts[[args[i]]] <- args[i+1L]
}
if (xor(is.null(opts[['--csv']]), is.null(opts[['--metadata']]))) stop('Use both --csv and --metadata, or neither')
output <- if (is.null(opts[['--output']])) 'snapshot.json' else opts[['--output']]
if (!dir.exists(dirname(output))) stop('Output folder does not exist')
tmp <- tempfile('kev-'); dir.create(tmp)
on.exit(unlink(tmp, recursive = TRUE), add = TRUE)
metadata_url <- 'https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.json'
csv_url <- 'https://raw.githubusercontent.com/cisagov/kev-data/develop/known_exploited_vulnerabilities.csv'
read_metadata <- function(file) {
  lines <- readLines(file, warn = FALSE, encoding = 'UTF-8')
  # Restrict extraction to the header before the vulnerabilities array. This
  # avoids accidentally reading a similarly named field from a record.
  text <- paste(lines, collapse = '\n'); cut <- regexpr('"vulnerabilities"[[:space:]]*:', text)
  if (cut[1] > 0) text <- substr(text, 1L, cut[1]-1L)
  extract <- function(field, pattern) {
    expr <- paste0('"',field,'"[[:space:]]*:[[:space:]]*',pattern)
    match <- gregexpr(expr, text, perl = TRUE)[[1L]]
    if (length(match) != 1L || match[1L] == -1L) stop('Missing or duplicate metadata: ', field)
    fieldval <- regmatches(text, list(match))[[1L]]
    sub(paste0('^"',field,'"[[:space:]]*:[[:space:]]*'), '', fieldval)
  }
  version <- gsub('"','',extract('catalogVersion','"[0-9.]+"'), fixed=TRUE)
  released <- gsub('"','',extract('dateReleased','"[0-9TZ:.-]+"'), fixed=TRUE)
  count <- as.integer(extract('count','[0-9]+'))
  if (!grepl('^[0-9]{4}\\.[0-9]{2}\\.[0-9]{2}$', version) ||
      !grepl('^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\\.[0-9]+)?Z$',released) || is.na(count) || count < 1L) stop('Invalid catalog metadata')
  list(version=version, released=released, count=count)
}
if (is.null(opts[['--csv']])) {
  download.file(metadata_url, file.path(tmp,'before.json'), mode='wb', quiet=TRUE)
  download.file(csv_url, file.path(tmp,'catalog.csv'), mode='wb', quiet=TRUE)
  download.file(metadata_url, file.path(tmp,'after.json'), mode='wb', quiet=TRUE)
  before <- read_metadata(file.path(tmp,'before.json')); after <- read_metadata(file.path(tmp,'after.json'))
  if (!identical(before, after)) stop('Catalog changed during download; retry later')
  meta <- after; csv <- file.path(tmp,'catalog.csv')
} else { meta <- read_metadata(opts[['--metadata']]); csv <- opts[['--csv']] }
if (.Platform$OS.type == 'windows' && Sys.getlocale('LC_CTYPE') == 'C') invisible(suppressWarnings(Sys.setlocale('LC_CTYPE','.UTF-8')))
data <- read.csv(csv, colClasses='character', check.names=FALSE, fileEncoding='UTF-8-BOM')
if (!all(c('cveID','dateAdded') %in% names(data)) || nrow(data) != meta$count) stop('CSV schema or record count does not match metadata')
if (anyNA(data$cveID) || anyDuplicated(data$cveID) || any(!grepl('^CVE-[0-9]{4}-[0-9]{4,19}$',data$cveID))) stop('Missing, duplicate or malformed CVE IDs')
dates <- as.Date(data$dateAdded, format='%Y-%m-%d'); release_date <- as.Date(substr(meta$released,1,10))
if (anyNA(dates) || any(dates > release_date)) stop('Invalid or future catalog addition date')
end_month <- as.Date(paste0(format(release_date,'%Y-%m'),'-01'))
months <- seq(end_month, by='-1 month', length.out=12L); months <- rev(months)
keys <- format(months,'%Y-%m'); date_keys <- format(dates,'%Y-%m')
counts <- vapply(keys, function(k) sum(date_keys == k), integer(1L))
rows <- vapply(seq_along(keys), function(i) sprintf('    {"month":"%s","count":%d}',keys[i],counts[i]), character(1L))
result <- c('{','  "schemaVersion": 1,',
  sprintf('  "catalogVersion": "%s",',meta$version),
  sprintf('  "catalogReleased": "%s",',meta$released),
  sprintf('  "catalogCount": %d,',meta$count),
  '  "measure": "CISA catalog additions by month, not attacks or all vulnerabilities",',
  '  "source": "https://github.com/cisagov/kev-data",',
  '  "months": [', paste0(rows,ifelse(seq_along(rows)<length(rows),',','')), '  ]','}')
text <- paste0(paste(result,collapse='\n'),'\n')
# Never replace either input; preserve the previous output if a refresh fails.
if (file.exists(output) && identical(normalizePath(output), normalizePath(csv))) stop('Output must not replace the source CSV')
if (!is.null(opts[['--metadata']]) && file.exists(output) && identical(normalizePath(output), normalizePath(opts[['--metadata']]))) stop('Output must not replace metadata')
# Do not churn commits when the catalog has not changed. The catalog release
# time is authoritative; it does not mean a refresh attempt succeeded today.
if (file.exists(output) && identical(paste0(paste(readLines(output,warn=FALSE),collapse='\n'),'\n'),text)) {
  message('Snapshot unchanged; no write required.'); quit(status=0)
}
temp_output <- tempfile('snapshot-', tmpdir=dirname(output))
writeLines(result,temp_output,useBytes=TRUE)
if (!file.rename(temp_output,output)) { unlink(temp_output); stop('Could not replace snapshot safely') }
message('Snapshot updated from catalog ',meta$version,' (',meta$count,' entries).')
