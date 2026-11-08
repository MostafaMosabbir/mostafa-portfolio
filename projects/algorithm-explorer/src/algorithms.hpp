#ifndef ALGORITHM_EXPLORER_ALGORITHMS_HPP
#define ALGORITHM_EXPLORER_ALGORITHMS_HPP

// Adapted from Mostafa Mosabbir's C++ class projects.
// This version records each comparison so a reader can follow the algorithms.

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

namespace explorer {

// A small bound makes the printed selection-sort trace manageable.
constexpr std::size_t MAX_ITEMS = 50;

struct ParseResult {
    bool ok;
    std::vector<int> values;
    std::string error;
};

// Read whitespace-separated whole numbers. An empty line is an empty list.
// If any token is invalid, no partial result should be used.
ParseResult parseList(const std::string& input);

struct SearchStep {
    std::size_t index;
    int value;
    bool matched;
};

struct SearchResult {
    std::vector<SearchStep> steps;
    std::optional<std::size_t> foundIndex;
    std::size_t comparisons;
};

// Find the first match, using zero-based positions, or return no match.
SearchResult linearSearch(const std::vector<int>& values, int target);

struct SortComparison {
    std::size_t candidateIndex;
    std::size_t minimumIndexBefore;
    int candidateValue;
    int minimumValue;
    std::size_t minimumIndexAfter;
};

struct SortPass {
    std::size_t startIndex;
    std::size_t minimumIndex;
    std::vector<SortComparison> comparisons;
    std::vector<int> valuesAfter;
};

struct SortResult {
    std::vector<int> sorted;
    std::size_t comparisons;
    std::vector<SortPass> passes;
};

// Sort a copy in ascending order, leaving the caller's list unchanged.
SortResult selectionSort(const std::vector<int>& values);

} // namespace explorer

#endif
