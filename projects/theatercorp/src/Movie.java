/** Holds the title and rating of one movie in the catalogue. */
public final class Movie {
    private final String title;
    private final Rating rating;

    public Movie(String title, Rating rating) {
        if (title == null || title.trim().isEmpty()) {
            throw new IllegalArgumentException("A movie title is required.");
        }
        if (rating == null) {
            throw new IllegalArgumentException("A rating is required.");
        }
        this.title = title.trim();
        this.rating = rating;
    }

    public String getTitle() {
        return title;
    }

    public Rating getRating() {
        return rating;
    }

    @Override
    public String toString() {
        return title + " (" + rating + ")";
    }
}
