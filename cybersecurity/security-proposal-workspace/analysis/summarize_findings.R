# Project 004: summarize the fictional assessment for the findings chart.
#
# The source is the crosswalk exported by the Python assessment, not raw
# evidence. This script counts its recorded states; it does not assess
# whether a safeguard works, determine compliance, or calculate a risk score.
#
# From any directory, run:
#   Rscript path/to/summarize_findings.R
# Or choose another crosswalk and destination:
#   Rscript path/to/summarize_findings.R --input path/to/crosswalk.csv --gaps path/to/gaps.csv --as-of 2026-10-28 --output path/to/findings.json
#
# Only base R is required. We keep the JSON structure deliberately small and
# use fixed labels so there is no need for an additional JSON package.

# Locate this script so the default paths work even when the command runs from
# another directory. normalizePath also resolves relative paths on Windows.
all_args <- commandArgs(trailingOnly = FALSE)
script_arg <- grep("^--file=", all_args, value = TRUE)
if (length(script_arg) != 1L) {
  stop("Run this file with Rscript; its location could not be identified.")
}
script_path <- normalizePath(sub("^--file=", "", script_arg), mustWork = TRUE)
script_dir <- dirname(script_path)
default_input <- file.path(script_dir, "..", "reports", "crosswalk.csv")
default_gaps <- file.path(script_dir, "..", "reports", "gaps.csv")
default_output <- file.path(script_dir, "findings.json")
sample_as_of <- "2026-10-28"

# Parse only explicit, paired options. Fail instead of silently accepting a
# misspelled flag or an absent value, which could produce a misleading chart.
args <- commandArgs(trailingOnly = TRUE)
if (length(args) %% 2L != 0L) stop("Options must have a value: --input PATH --gaps PATH --as-of YYYY-MM-DD --output PATH")
input <- default_input
gaps_input <- default_gaps
output <- default_output
seen <- character()
if (length(args) > 0L) {
  for (i in seq.int(1L, length(args), by = 2L)) {
    option <- args[[i]]
    value <- args[[i + 1L]]
    if (!(option %in% c("--input", "--gaps", "--as-of", "--output")) || option %in% seen || !nzchar(value)) {
      stop("Use each option at most once: --input, --gaps, --as-of, --output.")
    }
    seen <- c(seen, option)
    if (option == "--input") input <- value else if (option == "--gaps") gaps_input <- value else if (option == "--as-of") sample_as_of <- value else output <- value
  }
}

input <- normalizePath(input, mustWork = TRUE)
gaps_input <- normalizePath(gaps_input, mustWork = TRUE)
if (!grepl("^[0-9]{4}-[0-9]{2}-[0-9]{2}$", sample_as_of) || is.na(as.Date(sample_as_of))) stop("Use a valid --as-of date in YYYY-MM-DD format.")
output_parent <- normalizePath(dirname(output), mustWork = TRUE)
output <- file.path(output_parent, basename(output))
browser_output <- file.path(output_parent, "findings-data.js")
# Windows accepts both slash styles, so normalize before testing for collisions.
path_key <- function(path) {
  normalized <- normalizePath(path, winslash = "/", mustWork = FALSE)
  if (.Platform$OS.type == "windows") tolower(normalized) else normalized
}
if (path_key(output) %in% vapply(c(input, gaps_input, browser_output), path_key, character(1)) ||
    path_key(browser_output) %in% vapply(c(input, gaps_input), path_key, character(1))) {
  stop("The output must not replace a source report or browser data file.")
}

# Keep input as text: IDs such as REQ-007 are identifiers, not numbers.
# The Python export starts with a UTF-8 byte order mark. Windows R can start
# in the C locale, which cannot decode that mark; choose its UTF-8 locale
# when available. UTF-8-BOM also accepts UTF-8 files with no mark.
if (.Platform$OS.type == "windows" && Sys.getlocale("LC_CTYPE") == "C") {
  invisible(suppressWarnings(Sys.setlocale("LC_CTYPE", ".UTF-8")))
}
# check.names = FALSE allows us to validate the actual column names.
crosswalk <- read.csv(input, colClasses = "character", check.names = FALSE,
                      fileEncoding = "UTF-8-BOM", na.strings = character())
required <- c("requirement_id", "requirement", "priority", "domain", "state", "framework", "framework_version")
missing <- setdiff(required, names(crosswalk))
if (length(missing) > 0L) stop(paste("Missing columns:", paste(missing, collapse = ", ")))
if (nrow(crosswalk) == 0L) stop("The input contains no requirements.")
if (anyDuplicated(names(crosswalk))) stop("The crosswalk has duplicate column names.")

domains <- c("Govern", "Identify", "Protect", "Detect", "Respond", "Recover")
states <- c("supported_draft", "needs_work")
if (any(!nzchar(trimws(crosswalk$requirement_id))) || anyDuplicated(crosswalk$requirement_id)) {
  stop("Each requirement must have a unique, nonempty identifier.")
}
if (any(!(crosswalk$domain %in% domains))) stop("Unrecognized CSF domain in crosswalk.")
if (any(!(crosswalk$state %in% states))) stop("Unrecognized assessment state in crosswalk.")
if (any(crosswalk$framework != "NIST CSF") || any(crosswalk$framework_version != "2.0")) {
  stop("This chart expects the selected NIST CSF 2.0 crosswalk only.")
}

# The example shown for each domain comes from the exported gap report, not a
# fabricated finding. Prefer a high-priority gap, then the first remaining gap.
# Requirements may have several gaps; the example displays just the first.
gaps <- read.csv(gaps_input, colClasses = "character", check.names = FALSE,
                 fileEncoding = "UTF-8-BOM", na.strings = character())
if (anyDuplicated(names(gaps)) || !all(c("requirement_id", "domain", "gap") %in% names(gaps))) {
  stop("The gap report must contain unique requirement_id, domain and gap columns.")
}
if (any(!gaps$requirement_id %in% crosswalk$requirement_id)) stop("A gap refers to an unknown requirement.")
lookup <- match(gaps$requirement_id, crosswalk$requirement_id)
if (any(gaps$domain != crosswalk$domain[lookup])) stop("A gap has a mismatched domain.")
if (any(crosswalk$state[lookup] != "needs_work")) stop("A gap belongs to a requirement not marked needs work.")

# Fix factor levels to retain all six domains, including a domain that has no
# selected requirements. This avoids implying that absent data equals coverage.
counts <- table(factor(crosswalk$domain, levels = domains),
                factor(crosswalk$state, levels = states))
supported_total <- sum(counts[, "supported_draft"])
needs_total <- sum(counts[, "needs_work"])
if (supported_total + needs_total != nrow(crosswalk)) stop("Count validation failed.")

# Encode source text as JSON strings instead of treating it as executable code.
# No timestamp is inserted, so the same inputs produce byte-identical output.
json_string <- function(s) encodeString(enc2utf8(s), quote = '"', na.encode = FALSE)
example_for <- function(domain) {
  options <- which(crosswalk$domain == domain & crosswalk$state == "needs_work" & crosswalk$requirement_id %in% gaps$requirement_id)
  if (!length(options)) return("null")
  high <- options[crosswalk$priority[options] == "high"]
  chosen <- if (length(high)) high[[1]] else options[[1]]
  example_gaps <- gaps$gap[gaps$requirement_id == crosswalk$requirement_id[chosen]]
  sprintf('{"id":%s,"requirement":%s,"gaps":[%s]}', json_string(crosswalk$requirement_id[chosen]), json_string(crosswalk$requirement[chosen]), paste(vapply(example_gaps, json_string, character(1)), collapse = ","))
}
source_md5 <- unname(tools::md5sum(input))
gaps_md5 <- unname(tools::md5sum(gaps_input))
rows <- vapply(seq_along(domains), function(i) {
  sprintf('    {"domain":"%s","supported_draft":%d,"needs_work":%d,"total":%d,"example":%s}',
          domains[[i]], counts[i, "supported_draft"], counts[i, "needs_work"], sum(counts[i, ]), example_for(domains[[i]]))
}, character(1))
lines <- c(
  "{",
  '  "schema_version": 1,',
  '  "source": "fictional assessment crosswalk",',
  sprintf('  "as_of": "%s",', sample_as_of),
  sprintf('  "source_md5": "%s",', source_md5),
  sprintf('  "gaps_md5": "%s",', gaps_md5),
  '  "framework": "Selected NIST CSF 2.0 mappings",',
  '  "limitations": "Project-defined fictional requirements. Counts are not compliance scores; mappings indicate relevance, not complete coverage. Evidence files were not inspected and supported drafts require human review.",',
  sprintf('  "totals": {"supported_draft":%d,"needs_work":%d,"requirements":%d},',
          supported_total, needs_total, nrow(crosswalk)),
  '  "domains": [',
  paste0(rows, ifelse(seq_along(rows) < length(rows), ",", "")),
  "  ]",
  "}"
)
writeLines(lines, output, useBytes = TRUE)
# The static website loads the same generated data as JavaScript. This avoids
# a fetch at page load and also works when the homepage is opened from disk.
writeLines(c("// Generated by summarize_findings.R; edit the assessment, then rerun R.",
             "window.SECURITY_FINDINGS_DATA = ", lines, ";"), browser_output, useBytes = TRUE)
message("Wrote ", output, " and ", browser_output, " (", nrow(crosswalk), " fictional requirements).")
