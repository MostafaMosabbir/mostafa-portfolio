#include "algorithms.hpp"

#include <limits>
#include <sstream>
#include <stdexcept>
#include <utility>

namespace explorer {

ParseResult parseList(const std::string& input) {
    std::istringstream words(input);
    std::vector<int> values;
    std::string token;

    while (words >> token) {
        if (values.size() == MAX_ITEMS) {
            return {false, {}, "Enter at most 50 numbers."};
        }
        try {
            std::size_t consumed = 0;
            // Parse to a wider type before checking the range of an int.
            long long value = std::stoll(token, &consumed, 10);
            if (consumed != token.size() || value < std::numeric_limits<int>::min()
                || value > std::numeric_limits<int>::max()) {
                return {false, {}, "Use whole numbers within the supported integer range, separated by spaces."};
            }
            values.push_back(static_cast<int>(value));
        } catch (const std::invalid_argument&) {
            return {false, {}, "Use whole numbers separated by spaces."};
        } catch (const std::out_of_range&) {
            return {false, {}, "A number is outside the supported integer range."};
        }
    }
    return {true, values, ""};
}

SearchResult linearSearch(const std::vector<int>& values, int target) {
    SearchResult result{{}, std::nullopt, 0};
    // Linear search checks entries in their original order and stops on the
    // first match. Repeated values later in the list are not searched.
    for (std::size_t i = 0; i < values.size(); ++i) {
        const bool matched = values[i] == target;
        result.steps.push_back({i, values[i], matched});
        ++result.comparisons;
        if (matched) {
            result.foundIndex = i;
            break;
        }
    }
    return result;
}

SortResult selectionSort(const std::vector<int>& values) {
    SortResult result{values, 0, {}};
    // i + 1 < size avoids subtracting 1 from an empty unsigned size.
    for (std::size_t i = 0; i + 1 < result.sorted.size(); ++i) {
        std::size_t minimum = i;
        SortPass pass{i, i, {}, {}};
        for (std::size_t candidate = i + 1; candidate < result.sorted.size(); ++candidate) {
            const std::size_t before = minimum;
            const int candidateValue = result.sorted[candidate];
            const int minimumValue = result.sorted[minimum];
            ++result.comparisons;
            if (candidateValue < minimumValue) {
                minimum = candidate;
            }
            pass.comparisons.push_back({candidate, before, candidateValue, minimumValue, minimum});
        }
        // One placement concludes each pass, including when no swap is needed.
        std::swap(result.sorted[i], result.sorted[minimum]);
        pass.minimumIndex = minimum;
        pass.valuesAfter = result.sorted;
        result.passes.push_back(std::move(pass));
    }
    return result;
}

} // namespace explorer
