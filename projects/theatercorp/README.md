# TheaterCorp

**Learning project. Adapted from Mostafa Mosabbir's 2019 class project.**

The original coursework modeled movies, ratings, theaters, and numbered screens
in Java. This adaptation keeps those concepts and adds an interactive terminal
menu, input checks, local saving, and tests. All sample movie titles and theater
locations are fictional. It is a demonstration, not a live cinema schedule.

## Run it in VS Code on Windows

Open the `theatercorp` folder in VS Code. From **Terminal > New Terminal**, run:

```powershell
New-Item -ItemType Directory -Force out | Out-Null
javac -d out (Get-ChildItem src/*.java).FullName
java -cp out ApplicationDriver
```

You need a Java development kit with `java` and `javac` available in your
terminal. This project was tested with Java 21. No third-party libraries are
required.

The menu can list or add movies and theaters, assign an existing movie to a
screen, and list showings. Each successful change is saved locally in
`theatercorp-data.txt` in the folder where you start the program. The sample
data appears on the first run; a file is created when you make a change. Run
the program again from the same folder to reopen those changes.

If the program cannot read an existing data file, it stops without replacing
that file. If a save fails, it reports that the changes remain in memory and
offers a retry. This is a single-user learning tool, not a shared database.

To use a separate practice file instead, run:

```powershell
java -cp out ApplicationDriver practice-data.txt
```

Use invented titles and locations. Do not add confidential information or
commit locally generated files. The included `.gitignore` covers the default
data file, practice data, and compiled output.

## Run the checks

From the same folder in PowerShell:

```powershell
New-Item -ItemType Directory -Force out | Out-Null
javac -d out (Get-ChildItem src/*.java,test/*.java).FullName
java -cp out TheaterCorpTest
java -cp out TheaterStorageTest
java -cp out TheaterCliTest
```

## Follow the logic

- `Movie` keeps a title and rating. `Rating` defines the allowed values.
- `Theater` maps screen numbers to movies.
- `TheaterCorp` holds the movie catalog and theater list, and connects an
  existing movie to an existing screen.
- `ApplicationDriver` asks for input and calls the relevant methods.
- `TheaterStorage` saves and loads the local catalog.
- `test/` contains checks for the model, file storage, and terminal workflow.

See [the practice guide](docs/PRACTICE.md) to trace one showing through the
classes. The Java application is a working local prototype. The portfolio's
featured section also offers a separate JavaScript browser demo of the same
basic model. That demo keeps fictional data only for the current page session;
it does not read or update the Java program's local data file.
