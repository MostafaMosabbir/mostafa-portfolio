# Algorithm Explorer

Adapted from Mostafa Mosabbir's C++ class projects. This local learning project
revisits linear search and selection sort while showing each comparison.

## What it does

- Linear search checks values in order, returns the first matching zero-based
  index, and reports how many values it compared.
- Selection sort repeatedly finds the smallest remaining value, places it, and
  reports comparisons. The menu adopts the sorted list after displaying the trace.
- The menu accepts up to 50 space-separated integers, including negatives and
  duplicates. An empty list is allowed; invalid input leaves the old list intact.

This is an educational example, not a performance benchmark. It does not time
the algorithms or connect to the internet. The companion visual concept is a
separate JavaScript preview; it does not execute this C++ code.

## Compile with a C++17 compiler

Open this folder in VS Code and use a terminal with `g++` available:

```powershell
g++ -std=c++17 -Wall -Wextra -pedantic src/main.cpp src/algorithms.cpp -o algorithm-explorer.exe
.\algorithm-explorer.exe
```

For the independent checks:

```powershell
g++ -std=c++17 -Wall -Wextra -pedantic tests/algorithm_tests.cpp src/algorithms.cpp -o algorithm-tests.exe
.\algorithm-tests.exe
```

Compiler availability varies by computer. If `g++` is not available, install
or configure a C++17 toolchain before using these commands. A VS Code extension
alone does not necessarily provide a compiler.

## Follow the code

- `src/main.cpp` handles the menu, reads input, and prints the trace.
- `src/algorithms.hpp` defines the functions and the structures used to report
  comparisons.
- `src/algorithms.cpp` parses numbers and implements the two algorithms.
- `tests/algorithm_tests.cpp` checks input, results, counts, and traces.
- `docs/PRACTICE.md` guides you through an example.

The original coursework is kept separately. The browser concept and C++ tool
are local work and have not been added to the portfolio website.
