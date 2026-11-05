import java.util.Map;

/**
 * Small independent checks for TheaterCorp. Run this class after compiling src
 * and test together. No testing library is needed.
 */
public class TheaterCorpTest {
    private static int checks;

    private static void check(boolean condition, String explanation) {
        checks++;
        if (!condition) {
            throw new AssertionError(explanation);
        }
    }

    private static void expectIllegalArgument(Runnable action, String explanation) {
        checks++;
        try {
            action.run();
            throw new AssertionError(explanation + " should reject invalid input");
        } catch (IllegalArgumentException expected) {
            // An explicit error helps callers understand what needs correction.
        }
    }

    private static void expectReadOnly(Runnable action, String explanation) {
        checks++;
        try {
            action.run();
            throw new AssertionError(explanation + " should not allow outside changes");
        } catch (UnsupportedOperationException expected) {
            // The public view cannot bypass the application's validation.
        }
    }

    public static void main(String[] args) {
        // Every title and location here is invented for this test.
        Movie movie = new Movie("Lantern Harbor", Rating.PG);
        Theater theater = new Theater("North Hall");
        TheaterCorp corp = new TheaterCorp("Practice Cinema");

        check(corp.addMovie(movie), "The first movie should be added");
        check(!corp.addMovie(new Movie("lAnTeRn hArBoR", Rating.G)),
                "Movie titles should not be duplicated with different capitalization");
        check(corp.findMovie("LANTERN HARBOR") == movie,
                "A movie should be found without matching capitalization");
        check(corp.findMovie("not listed") == null, "Missing movies should return null");
        check(corp.findMovie(null) == null, "A null movie lookup should be safe");

        check(corp.addTheater(theater), "The first theater should be added");
        check(!corp.addTheater(new Theater("north hall")),
                "Theater locations should not be duplicated with different capitalization");
        check(corp.findTheater("NORTH HALL") == theater,
                "A theater should be found without matching capitalization");
        check(corp.findTheater("") == null, "A blank theater lookup should be safe");

        check(corp.scheduleMovie("north hall", 1, "LANTERN HARBOR"),
                "A known movie should be assigned to a known theater screen");
        check(theater.getScreens().get(1) == movie,
                "The selected screen should point to the selected movie");
        Map<Integer, Movie> screens = theater.getScreens();
        int before = screens.size();
        check(!corp.scheduleMovie("missing theater", 2, "Lantern Harbor"),
                "An unknown theater should not produce a showing");
        check(!corp.scheduleMovie("North Hall", 2, "missing movie"),
                "An unknown movie should not produce a showing");
        check(screens.size() == before && !screens.containsKey(2),
                "Failed assignments must not change existing showings");
        expectIllegalArgument(() -> corp.scheduleMovie("North Hall", 0, "Lantern Harbor"),
                "A nonpositive screen number");
        expectIllegalArgument(() -> theater.setShowing(-1, movie), "A negative screen number");
        expectIllegalArgument(() -> theater.setShowing(2, null), "A null showing");

        expectIllegalArgument(() -> new Movie("  ", Rating.G), "A blank movie title");
        expectIllegalArgument(() -> new Movie(null, Rating.G), "A null movie title");
        expectIllegalArgument(() -> new Movie("Lantern Harbor", null), "A null rating");
        expectIllegalArgument(() -> new Theater("  "), "A blank theater location");
        expectIllegalArgument(() -> new TheaterCorp("  "), "A blank corporation name");
        check(Rating.parse("pg") == Rating.PG, "A valid rating should ignore case");
        expectIllegalArgument(() -> Rating.parse("NOT-A-RATING"), "An unknown rating");
        expectIllegalArgument(() -> Rating.parse(null), "A null rating input");

        expectReadOnly(() -> corp.getMovies().clear(), "The movie list");
        expectReadOnly(() -> corp.getTheaters().clear(), "The theater list");
        expectReadOnly(() -> screens.clear(), "The screens map");
        check(corp.findMovie("Lantern Harbor") == movie && screens.get(1) == movie,
                "Read-only views must not change underlying data");

        System.out.println("TheaterCorp checks passed: " + checks);
    }
}
