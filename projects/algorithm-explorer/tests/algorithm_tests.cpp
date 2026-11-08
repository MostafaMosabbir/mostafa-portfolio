#include "../src/algorithms.hpp"

#include <algorithm>
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

// These tests use the public functions directly and need no external library.
namespace {
int checks = 0;

void check(bool condition, const std::string& description) {
    ++checks;
    if (!condition) {
        throw std::runtime_error(description);
    }
}

void testParsing() {
    using explorer::parseList;
    auto empty = parseList("  \t  ");
    check(empty.ok && empty.values.empty(), "Whitespace should represent an empty list");
    auto numbers = parseList("-17 0 +42\t42\n9");
    check(numbers.ok && numbers.values == std::vector<int>({-17, 0, 42, 42, 9}),
          "Signed numbers, whitespace and duplicate values should be preserved");
    const auto limits = parseList(std::to_string(std::numeric_limits<int>::min()) + " "
                                  + std::to_string(std::numeric_limits<int>::max()));
    check(limits.ok && limits.values.size() == 2
          && limits.values.front() == std::numeric_limits<int>::min()
          && limits.values.back() == std::numeric_limits<int>::max(),
          "Both supported integer boundaries should parse");

    for (const std::string bad : {"1,2", "2x", "3.4", "+", "999999999999999999999999999999", "2 -x"}) {
        const auto result = parseList(bad);
        check(!result.ok && result.values.empty() && !result.error.empty(),
              "Malformed input must fail without exposing partially parsed data");
    }
    std::ostringstream input;
    for (std::size_t i = 0; i < explorer::MAX_ITEMS; ++i) input << i << ' ';
    check(parseList(input.str()).ok && parseList(input.str()).values.size() == explorer::MAX_ITEMS,
          "The maximum supported number of items should be accepted");
    input << "999";
    const auto overLimit = parseList(input.str());
    check(!overLimit.ok && overLimit.values.empty(), "Over-limit input should be rejected");
}

void testSearch() {
    using explorer::linearSearch;
    const auto empty = linearSearch({}, 1);
    check(!empty.foundIndex && empty.comparisons == 0 && empty.steps.empty(),
          "Searching an empty list should make zero comparisons");
    const auto first = linearSearch({7, 3, 7}, 7);
    check(first.foundIndex && *first.foundIndex == 0 && first.comparisons == 1,
          "Search should stop at the first duplicate rather than search further");
    check(first.steps.size() == 1 && first.steps[0].index == 0
          && first.steps[0].value == 7 && first.steps[0].matched,
          "First match trace should describe the actual comparison");
    const auto later = linearSearch({-2, 7, -2, 4}, -2);
    check(later.foundIndex && *later.foundIndex == 0 && later.comparisons == 1,
          "Negative matches should use their first position");
    const auto middleDuplicate = linearSearch({4, 7, 7}, 7);
    check(middleDuplicate.foundIndex && *middleDuplicate.foundIndex == 1
          && middleDuplicate.comparisons == 2,
          "A later duplicate must return the first matching index");
    const auto last = linearSearch({4, 1, -2}, -2);
    check(last.foundIndex && *last.foundIndex == 2 && last.comparisons == 3,
          "A last-element match should compare every element");
    check(last.steps.size() == 3 && !last.steps[0].matched && !last.steps[1].matched
          && last.steps[2].matched && last.steps[2].value == -2,
          "Search trace should mark only the comparison that matched");
    const auto missing = linearSearch({4, 1, -2}, 99);
    check(!missing.foundIndex && missing.comparisons == 3 && missing.steps.size() == 3,
          "A missing value should visit the complete list without a match");
    for (std::size_t i = 0; i < missing.steps.size(); ++i) {
        check(missing.steps[i].index == i && !missing.steps[i].matched,
              "Missing-value trace should visit each index in order");
    }
}

void testBinarySearch() {
    using explorer::binarySearchFirst;
    const std::vector<int> values{2, 4, 7, 7, 11, 15, 19, 23};

    const auto duplicate = binarySearchFirst(values, 7);
    check(duplicate.foundIndex == 2, "Return the first 7");
    check(duplicate.comparisons == 3 && duplicate.steps.size() == 3,
          "Record one step per probe");
    check(duplicate.steps[0].index == 3 && duplicate.steps[1].index == 1
          && duplicate.steps[2].index == 2, "Probe indices 3, 1, 2 in order");

    const auto missing = binarySearchFirst(values, 10);
    check(!missing.foundIndex && missing.comparisons == 3,
          "An absent target should produce no match");

    const auto empty = binarySearchFirst({}, 7);
    check(!empty.foundIndex && empty.comparisons == 0,
          "An empty list should make zero probes");

    const auto first = binarySearchFirst({7, 7, 7, 7}, 7);
    check(first.foundIndex == 0, "Index zero is a valid match");
}

void testSorting() {
    using explorer::selectionSort;
    const std::vector<std::vector<int>> examples = {
        {}, {1}, {1, 2, 3}, {3, 2, 1}, {4, -2, 4, 0, -2},
        {5, 5, 5, 5}, {std::numeric_limits<int>::max(), 0, std::numeric_limits<int>::min()}
    };
    for (auto values : examples) {
        const auto original = values;
        auto expected = values;
        std::sort(expected.begin(), expected.end());
        const auto result = selectionSort(values);
        const std::size_t n = values.size();
        const std::size_t expectedComparisons = n < 2 ? 0 : n * (n - 1) / 2;
        check(result.sorted == expected, "Selection sort should match ascending standard sort");
        check(values == original, "Selection sort should not mutate the supplied list");
        check(result.comparisons == expectedComparisons, "Selection sort comparison count is incorrect");
        check(result.passes.size() == (n == 0 ? 0 : n - 1), "Selection sort pass count is incorrect");
        std::size_t traceComparisons = 0;
        for (const auto& pass : result.passes) traceComparisons += pass.comparisons.size();
        check(traceComparisons == result.comparisons, "Trace should include every counted comparison");
    }

    const auto trace = selectionSort({3, 1, 2});
    check(trace.passes.size() == 2, "Three values should produce two passes");
    const auto& first = trace.passes[0];
    check(first.startIndex == 0 && first.minimumIndex == 1
          && first.valuesAfter == std::vector<int>({1, 3, 2}),
          "First pass should place the smallest element at the beginning");
    check(first.comparisons.size() == 2
          && first.comparisons[0].candidateIndex == 1
          && first.comparisons[0].candidateValue == 1
          && first.comparisons[0].minimumValue == 3
          && first.comparisons[0].minimumIndexAfter == 1
          && first.comparisons[1].candidateIndex == 2
          && first.comparisons[1].minimumIndexBefore == 1
          && first.comparisons[1].minimumIndexAfter == 1,
          "The trace should show how the minimum changes during the first pass");
    check(trace.passes[1].valuesAfter == std::vector<int>({1, 2, 3}),
          "Second pass should produce the final sorted list");
}
} // namespace

int main() {
    try {
        testParsing();
        testSearch();
        testBinarySearch();
        testSorting();
        std::cout << "Algorithm Explorer checks passed: " << checks << '\n';
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "Algorithm Explorer check failed: " << error.what() << '\n';
        return 1;
    }
}
