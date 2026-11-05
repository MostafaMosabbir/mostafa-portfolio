import java.util.Locale;

/** A small set of labels for the fictional movie catalogue. */
public enum Rating {
    G, PG, PG_13, R, NR;

    /** Accept common capitalization and either PG-13 or PG13. */
    public static Rating parse(String input) {
        if (input == null) {
            throw new IllegalArgumentException("Enter a rating.");
        }
        String cleaned = input.trim().toUpperCase(Locale.ROOT).replace('-', '_');
        if (cleaned.equals("PG13")) {
            cleaned = "PG_13";
        }
        try {
            return Rating.valueOf(cleaned);
        } catch (IllegalArgumentException error) {
            throw new IllegalArgumentException("Choose G, PG, PG-13, R, or NR.");
        }
    }

    @Override
    public String toString() {
        return this == PG_13 ? "PG-13" : name();
    }
}
