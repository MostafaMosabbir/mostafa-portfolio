# Practice: follow a movie to a screen

This adaptation comes from Mostafa Mosabbir's 2019 TheaterCorp class project.
The first goal is to understand how the objects work together. Use only
fictional movie titles and locations during practice.

## Start with a separate practice file

Open the project in VS Code, compile it using the README instructions, then run:

```powershell
java -cp out ApplicationDriver practice-data.txt
```

If the file does not exist, the program starts with fictional sample entries.
It writes the practice file after a successful change. Keeping practice data in
its own file lets you experiment without changing the default catalog.

## Add and schedule a fictional movie

1. Choose **2** and enter a fictional title and one of the displayed ratings.
2. Choose **3** and add a fictional theater location.
3. Choose **4**. Enter the theater location, a positive screen number, and the
   movie title you just added.
4. Choose **5** and find the theater and its assigned movie.
5. Exit with **0**. Start the program again with the same practice-file command
   and choose **5**. Your showing should still be there.

The program checks that the movie and theater exist before assigning a screen.
When a screen already has a movie, it asks before replacing it.

## Trace it in Java

1. In `ApplicationDriver.java`, find the menu's `case "4"` and follow the call
   to `assignMovie`.
2. The driver reads your answers and finds the requested theater and movie.
3. Find `scheduleMovie` in `TheaterCorp.java`. It checks the screen number and
   calls `findTheater` and `findMovie`.
4. Find `setShowing` in `Theater.java`. The `screens` map connects a screen
   number to a `Movie` object. Putting a movie at an existing number replaces
   that number's previous value.
5. After a change, the driver calls `TheaterStorage.save`. On the next run,
   `TheaterStorage.load` rebuilds the objects from the local data file.

Try explaining the path in your own words:

```text
Menu choice → input → find theater and movie → assign screen → save locally
```

## Questions to explore

1. What happens if you enter a movie that isn't in the catalog?
2. Why does a screen number have to be greater than zero?
3. What does the program do if the screen already has a movie?
4. What is the difference between the data held in memory and the saved file?
5. What should happen when a saved file cannot be read?

The original coursework used fixed examples held in memory. The menu, checks,
and file saving are part of this later adaptation. Once you understand this
version, you can decide what functionality or visual style to add next.
