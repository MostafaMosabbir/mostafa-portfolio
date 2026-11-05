import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.Scanner;

/**
 * Adapted from Mostafa Mosabbir's 2019 TheaterCorp class project.
 * This command-line driver uses fictional sample data and saves changes locally.
 */
public final class ApplicationDriver {
    private ApplicationDriver() { }

    public static void main(String[] args) {
        if (args.length > 1) {
            System.err.println("Usage: java ApplicationDriver [data-file]");
            System.exit(1);
        }

        Path dataFile = args.length == 1 ? Paths.get(args[0]) : Paths.get("theatercorp-data.txt");
        TheaterCorp company;
        try {
            // A missing file is safe to initialize. An unreadable or malformed file is not.
            if (Files.notExists(dataFile)) {
                company = sampleCompany();
                System.out.println("Starting with fictional sample data.");
                System.out.println("The file will be created when you make a change.");
            } else {
                company = TheaterStorage.load(dataFile);
                System.out.println("Loaded your saved catalogue.");
            }
        } catch (IOException error) {
            System.err.println("Could not load the data file: " + error.getMessage());
            System.err.println("The existing file was not replaced. Fix it or choose another data file.");
            System.exit(1);
            return;
        }

        System.out.println("Local data file: " + dataFile.toAbsolutePath());
        System.out.println("This is a fictional learning project, not a real movie schedule.");
        boolean dirty = false;
        try (Scanner input = new Scanner(System.in)) {
            while (true) {
                printMenu();
                String choice = read(input, "Choose an option: ");
                boolean changed = false;
                try {
                    switch (choice) {
                        case "1":
                            listMovies(company);
                            break;
                        case "2":
                            changed = addMovie(input, company);
                            break;
                        case "3":
                            changed = addTheater(input, company);
                            break;
                        case "4":
                            changed = assignMovie(input, company);
                            break;
                        case "5":
                            listShowings(company);
                            break;
                        case "6":
                            if (dirty) {
                                dirty = !save(company, dataFile);
                            } else {
                                System.out.println("There are no unsaved changes.");
                            }
                            break;
                        case "0":
                            if (dirty && !read(input, "Changes are not saved. Exit anyway? (y/N): ")
                                    .equalsIgnoreCase("y")) {
                                break;
                            }
                            System.out.println("Goodbye.");
                            return;
                        default:
                            System.out.println("Choose a menu number from 0 to 6.");
                    }
                } catch (IllegalArgumentException error) {
                    System.out.println("Could not complete that action: " + error.getMessage());
                }
                if (changed) {
                    // State changes happen in memory first. Report a save failure honestly.
                    dirty = !save(company, dataFile);
                }
            }
        } catch (EndOfInput error) {
            if (dirty) {
                System.err.println("Input ended with unsaved changes.");
            } else {
                System.out.println("\nInput ended. Goodbye.");
            }
        }
    }

    private static TheaterCorp sampleCompany() {
        TheaterCorp company = new TheaterCorp("TheaterCorp");
        company.addMovie(new Movie("The Emerald Signal", Rating.PG));
        company.addMovie(new Movie("Midnight Transit", Rating.PG_13));
        company.addTheater(new Theater("Central"));
        company.scheduleMovie("Central", 1, "The Emerald Signal");
        return company;
    }

    private static void printMenu() {
        System.out.println("\nTheaterCorp");
        System.out.println("1. List movies");
        System.out.println("2. Add a movie");
        System.out.println("3. Add a theater");
        System.out.println("4. Assign a movie to a screen");
        System.out.println("5. List theaters and showings");
        System.out.println("6. Retry saving changes");
        System.out.println("0. Exit");
    }

    private static String read(Scanner input, String prompt) {
        System.out.print(prompt);
        if (!input.hasNextLine()) {
            throw new EndOfInput();
        }
        return input.nextLine().trim();
    }

    private static void listMovies(TheaterCorp company) {
        if (company.getMovies().isEmpty()) {
            System.out.println("No movies in the catalogue yet.");
            return;
        }
        for (Movie movie : company.getMovies()) {
            System.out.println("  " + movie);
        }
    }

    private static boolean addMovie(Scanner input, TheaterCorp company) {
        String title = read(input, "Fictional movie title: ");
        Rating rating = Rating.parse(read(input, "Rating (G, PG, PG-13, R, NR): "));
        boolean added = company.addMovie(new Movie(title, rating));
        System.out.println(added ? "Movie added." : "That movie title already exists.");
        return added;
    }

    private static boolean addTheater(Scanner input, TheaterCorp company) {
        Theater theater = new Theater(read(input, "Fictional theater location: "));
        boolean added = company.addTheater(theater);
        System.out.println(added ? "Theater added." : "That theater location already exists.");
        return added;
    }

    private static boolean assignMovie(Scanner input, TheaterCorp company) {
        String location = read(input, "Theater location: ");
        Theater theater = company.findTheater(location);
        if (theater == null) {
            System.out.println("No matching theater. Add it first.");
            return false;
        }
        int screen;
        try {
            screen = Integer.parseInt(read(input, "Screen number: "));
        } catch (NumberFormatException error) {
            throw new IllegalArgumentException("Enter a whole number greater than zero.");
        }
        if (screen <= 0) {
            throw new IllegalArgumentException("Enter a whole number greater than zero.");
        }
        String title = read(input, "Movie title: ");
        Movie movie = company.findMovie(title);
        if (movie == null) {
            System.out.println("No matching movie. Add it first.");
            return false;
        }
        Movie current = theater.getScreens().get(screen);
        if (current != null) {
            String answer = read(input, "Screen already shows " + current.getTitle()
                    + ". Replace it? (y/N): ");
            if (!answer.equalsIgnoreCase("y")) {
                System.out.println("Screen unchanged.");
                return false;
            }
        }
        // The company finds the existing objects and updates that screen's map entry.
        company.scheduleMovie(location, screen, title);
        System.out.println("Screen updated.");
        return true;
    }

    private static void listShowings(TheaterCorp company) {
        if (company.getTheaters().isEmpty()) {
            System.out.println("No theaters yet.");
            return;
        }
        for (Theater theater : company.getTheaters()) {
            System.out.println(theater.getLocation() + ":");
            if (theater.getScreens().isEmpty()) {
                System.out.println("  No movies assigned.");
            }
            for (Map.Entry<Integer, Movie> showing : theater.getScreens().entrySet()) {
                System.out.println("  Screen " + showing.getKey() + ": " + showing.getValue());
            }
        }
    }

    private static boolean save(TheaterCorp company, Path path) {
        try {
            TheaterStorage.save(company, path);
            System.out.println("Saved locally to " + path.toAbsolutePath());
            return true;
        } catch (IOException error) {
            System.err.println("Could not save: " + error.getMessage());
            System.err.println("The changes are still in memory. Fix the problem and choose option 6.");
            return false;
        }
    }

    /** Used to exit cleanly when terminal input closes instead of showing a stack trace. */
    private static final class EndOfInput extends RuntimeException { }
}
