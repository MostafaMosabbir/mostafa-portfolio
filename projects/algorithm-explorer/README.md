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

The project uses comparison counts to illustrate how the algorithms work.

## Try it on the Workbench

Open [Project 010](https://mostafam.com/#project-algorithm-explorer) and select
**Highlight project**. In **Brief**, choose linear search or selection sort,
enter a list, and select **Start**. Use **Previous step** and **Next step** to
follow the trace, or **Show result** to jump to the end.

The Workbench demo implements the same algorithms in JavaScript. The C++17
command line program runs locally. You can test each implementation
independently.

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

If you use Zig, substitute `zig c++` for `g++` in both commands. The C++ test
program passed all 61 checks on Windows with Zig in C++17 mode.

## Follow the code

- `src/main.cpp` handles the menu, reads input, and prints the trace.
- `src/algorithms.hpp` defines the functions and the structures used to report
  comparisons.
- `src/algorithms.cpp` parses numbers and implements the two algorithms.
- `tests/algorithm_tests.cpp` checks input, results, counts, and traces.
- `demo/app.js` builds and displays the browser trace.
- `demo/demo.test.cjs` checks the browser demo. Run it with
  `node --test demo/demo.test.cjs` from this folder.
- `docs/PRACTICE.md` guides you through an example.
