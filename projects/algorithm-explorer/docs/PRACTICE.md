# Practice: follow the comparisons

The project is adapted from Mostafa Mosabbir's C++ class projects. Start by
opening `src/algorithms.cpp` alongside this guide in VS Code.

## Linear search

Imagine searching for `7` in `[4, 2, 7, 7]`:

1. Compare index 0, value 4. It does not match.
2. Compare index 1, value 2. It does not match.
3. Compare index 2, value 7. It matches, so stop.

The answer is **index 2**, after **3 comparisons**. Although another 7 exists,
the program returns the first match. An index counts from zero, so index 2 is
the third position in the list.

Find `linearSearch` in the code. The `for` loop walks through the values,
`result.steps.push_back` records what was compared, and `break` stops the loop
when a match is found. What would change if the target were absent?

## Selection sort

For `[4, 2, 7]`, begin at index 0 and look through the remaining values:

1. Compare 2 with the current minimum, 4. The new minimum is 2.
2. Compare 7 with 2. The minimum stays 2.
3. Place 2 at the start: `[2, 4, 7]`.
4. Compare 7 with 4 and leave 4 in place. The list is sorted.

That example takes **3 comparisons**. Find `selectionSort` in the code and
identify the outer loop for each position and the inner loop that looks for a
smaller value. The function sorts a copy and returns it. The menu then uses the
returned sorted list as its current list.

## Questions for your own notes

1. Why does the search stop at the first match?
2. What happens when the list is empty?
3. What changes if a negative number is included?
4. Why is counting comparisons different from measuring elapsed time?
5. What could you add to the browser trace to explain the process better?

Try the same inputs in the Workbench's **Brief** tab. The JavaScript demo and
the local C++ program implement the algorithms separately, so check the
comparison count and result in both.
