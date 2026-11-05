import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Adapted from Mostafa Mosabbir's 2019 TheaterCorp class project.
 * The newer version retains movies, theaters and numbered screens while adding
 * validation and an interactive driver. It is a learning project.
 */
public final class TheaterCorp {
    private final String name;
    private final List<Movie> movies = new ArrayList<>();
    private final List<Theater> theaters = new ArrayList<>();

    public TheaterCorp(String name) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("A name is required.");
        }
        this.name = name.trim();
    }

    public String getName() {
        return name;
    }

    public List<Movie> getMovies() {
        return Collections.unmodifiableList(movies);
    }

    public List<Theater> getTheaters() {
        return Collections.unmodifiableList(theaters);
    }

    /** Return null when there is no match. Ignore case and surrounding spaces. */
    public Movie findMovie(String title) {
        if (title == null || title.trim().isEmpty()) {
            return null;
        }
        for (Movie movie : movies) {
            if (movie.getTitle().equalsIgnoreCase(title.trim())) {
                return movie;
            }
        }
        return null;
    }

    public Theater findTheater(String location) {
        if (location == null || location.trim().isEmpty()) {
            return null;
        }
        for (Theater theater : theaters) {
            if (theater.getLocation().equalsIgnoreCase(location.trim())) {
                return theater;
            }
        }
        return null;
    }

    /** A boolean tells the caller whether a new movie was added. */
    public boolean addMovie(Movie movie) {
        if (movie == null) {
            throw new IllegalArgumentException("A movie is required.");
        }
        if (findMovie(movie.getTitle()) != null) {
            return false;
        }
        movies.add(movie);
        return true;
    }

    public boolean addTheater(Theater theater) {
        if (theater == null) {
            throw new IllegalArgumentException("A theater is required.");
        }
        if (findTheater(theater.getLocation()) != null) {
            return false;
        }
        theaters.add(theater);
        return true;
    }

    /** Find both objects before changing a screen; false means one was not found. */
    public boolean scheduleMovie(String location, int screen, String title) {
        if (screen <= 0) {
            throw new IllegalArgumentException("The screen number must be greater than zero.");
        }
        Theater theater = findTheater(location);
        Movie movie = findMovie(title);
        if (theater == null || movie == null) {
            return false;
        }
        theater.setShowing(screen, movie);
        return true;
    }
}
