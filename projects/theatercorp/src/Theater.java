import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/** A theater has a location and a map from screen numbers to movies. */
public final class Theater {
    private final String location;
    private final Map<Integer, Movie> screens = new LinkedHashMap<>();

    public Theater(String location) {
        if (location == null || location.trim().isEmpty()) {
            throw new IllegalArgumentException("A theater location is required.");
        }
        this.location = location.trim();
    }

    public String getLocation() {
        return location;
    }

    /** The read-only view prevents callers from bypassing validation. */
    public Map<Integer, Movie> getScreens() {
        return Collections.unmodifiableMap(screens);
    }

    /** Replacing an existing screen changes its movie; it does not create a second screen. */
    public void setShowing(int screen, Movie movie) {
        if (screen <= 0) {
            throw new IllegalArgumentException("The screen number must be greater than zero.");
        }
        if (movie == null) {
            throw new IllegalArgumentException("Choose an existing movie.");
        }
        screens.put(screen, movie);
    }
}
