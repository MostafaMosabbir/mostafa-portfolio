#include "algorithms.hpp"

#include <iostream>
#include <string>
#include <vector>

namespace {

void showList(const std::vector<int>& values) {
    std::cout << "[";
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i != 0) std::cout << ", ";
        std::cout << values[i];
    }
    std::cout << "]";
}

void showSearch(const std::vector<int>& values, int target) {
    const auto result = explorer::linearSearch(values, target);
    for (const auto& step : result.steps) {
        std::cout << "Index " << step.index << ": " << step.value
                  << (step.matched ? " matches" : " does not match") << "\n";
    }
    if (result.foundIndex.has_value()) {
        std::cout << "First match at zero-based index " << *result.foundIndex << ".\n";
    } else {
        std::cout << "No match found.\n";
    }
    std::cout << "Comparisons: " << result.comparisons << "\n";
}

void showSort(std::vector<int>& values) {
    const auto result = explorer::selectionSort(values);
    for (const auto& pass : result.passes) {
        std::cout << "\nPass " << pass.startIndex + 1 << ": find the smallest value starting at index "
                  << pass.startIndex << ".\n";
        for (const auto& step : pass.comparisons) {
            std::cout << "Compare index " << step.candidateIndex << " (" << step.candidateValue
                      << ") with current minimum index " << step.minimumIndexBefore
                      << " (" << step.minimumValue << "). ";
            std::cout << (step.minimumIndexAfter != step.minimumIndexBefore
                ? "New minimum.\n" : "Keep current minimum.\n");
        }
        std::cout << "Place index " << pass.minimumIndex << " at index " << pass.startIndex << ": ";
        showList(pass.valuesAfter);
        std::cout << "\n";
    }
    values = result.sorted;
    std::cout << "Sorted list: ";
    showList(values);
    std::cout << "\nComparisons: " << result.comparisons << "\n";
}

} // namespace

int main() {
    // Adapted from Mostafa Mosabbir's C++ class projects.
    // The original search and selection-sort ideas are presented step by step.
    std::vector<int> values{4, 2, 7, 32, 55, 21, 90, 200, 32, 1};
    std::cout << "Algorithm Explorer\n";
    std::cout << "Adapted from Mostafa Mosabbir's class projects.\n";

    std::string input;
    while (true) {
        std::cout << "\nCurrent list: ";
        showList(values);
        std::cout << "\n1. Enter a list\n2. Linear search\n3. Selection sort\n0. Exit\nChoose: ";
        if (!std::getline(std::cin, input)) {
            std::cout << "\nInput ended.\n";
            return 0;
        }
        if (input == "0") {
            std::cout << "Goodbye.\n";
            return 0;
        }
        if (input == "1") {
            std::cout << "Enter up to 50 integers separated by spaces (blank for an empty list): ";
            if (!std::getline(std::cin, input)) return 0;
            const auto parsed = explorer::parseList(input);
            if (!parsed.ok) {
                std::cout << parsed.error << " The current list was not changed.\n";
            } else {
                values = parsed.values;
                std::cout << "List updated.\n";
            }
        } else if (input == "2") {
            std::cout << "Enter one integer to find: ";
            if (!std::getline(std::cin, input)) return 0;
            const auto parsed = explorer::parseList(input);
            if (!parsed.ok || parsed.values.size() != 1) {
                std::cout << "Enter exactly one valid integer.\n";
            } else {
                showSearch(values, parsed.values[0]);
            }
        } else if (input == "3") {
            // The algorithm sorts a copy; the menu adopts it after showing the trace.
            showSort(values);
        } else {
            std::cout << "Choose 0, 1, 2, or 3.\n";
        }
    }
}
