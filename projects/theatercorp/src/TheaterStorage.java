import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.AtomicMoveNotSupportedException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Save and load a local TheaterCorp catalogue using only the Java library.
 * This is new functionality adapted around Mostafa Mosabbir's 2019 class project.
 * The original class exercise did not save data between runs.
 */
public final class TheaterStorage {
    private static final String HEADER = "THEATERCORP\t1";

    private TheaterStorage() {
        // Utility class: callers use the static load and save methods.
    }

    /**
     * Read a complete file, then construct the catalogue.
     * A missing, incomplete, or malformed file throws IOException; it is never
     * silently replaced with sample data by this method.
     */
    public static TheaterCorp load(Path path) throws IOException {
        List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
        if (lines.size() < 3 || !HEADER.equals(lines.get(0))) {
            throw new IOException("Invalid TheaterCorp file header.");
        }
        if (!"END".equals(lines.get(lines.size() - 1))) {
            throw new IOException("The TheaterCorp file is incomplete or its end marker is invalid.");
        }
        String[] first = lines.get(1).split("\t", -1);
        if (first.length != 2 || !first[0].equals("CORP")) {
            throw new IOException("The catalogue name is missing or invalid.");
        }

        try {
            TheaterCorp corp = new TheaterCorp(decode(first[1]));
            List<String[]> showings = new ArrayList<>();
            for (int i = 2; i < lines.size() - 1; i++) {
                String[] fields = lines.get(i).split("\t", -1);
                switch (fields[0]) {
                    case "MOVIE":
                        requireFields(fields, 3, i + 1);
                        if (!corp.addMovie(new Movie(decode(fields[1]), Rating.parse(fields[2])))) {
                            throw new IOException("Duplicate movie on line " + (i + 1) + ".");
                        }
                        break;
                    case "THEATER":
                        requireFields(fields, 2, i + 1);
                        if (!corp.addTheater(new Theater(decode(fields[1])))) {
                            throw new IOException("Duplicate theater on line " + (i + 1) + ".");
                        }
                        break;
                    case "SHOWING":
                        requireFields(fields, 4, i + 1);
                        // Wait until every movie and theater has been loaded.
                        showings.add(fields);
                        break;
                    default:
                        throw new IOException("Unknown record on line " + (i + 1) + ".");
                }
            }
            for (String[] fields : showings) {
                String location = decode(fields[1]);
                int screen = Integer.parseInt(fields[2]);
                String title = decode(fields[3]);
                Theater theater = corp.findTheater(location);
                if (theater == null || corp.findMovie(title) == null || screen <= 0) {
                    throw new IOException("A showing refers to an unknown theater, movie, or invalid screen.");
                }
                if (theater.getScreens().containsKey(screen)) {
                    throw new IOException("Duplicate screen in saved showings.");
                }
                if (!corp.scheduleMovie(location, screen, title)) {
                    throw new IOException("Could not restore a saved showing.");
                }
            }
            return corp;
        } catch (IllegalArgumentException error) {
            throw new IOException("The TheaterCorp file contains an invalid value.", error);
        }
    }

    /**
     * Write a complete replacement to a temporary file, then move it into place.
     * Existing malformed files are rejected instead of silently overwritten.
     */
    public static void save(TheaterCorp corp, Path path) throws IOException {
        if (corp == null || path == null) {
            throw new IllegalArgumentException("A catalogue and file path are required.");
        }
        Path target = path.toAbsolutePath().normalize();
        if (Files.exists(target)) {
            load(target); // Verify that existing user data is readable before replacing it.
        } else if (!Files.notExists(target)) {
            throw new IOException("Could not determine whether the save file already exists.");
        }

        List<String> lines = new ArrayList<>();
        lines.add(HEADER);
        lines.add("CORP\t" + encode(corp.getName()));
        for (Movie movie : corp.getMovies()) {
            lines.add("MOVIE\t" + encode(movie.getTitle()) + "\t" + movie.getRating().name());
        }
        for (Theater theater : corp.getTheaters()) {
            lines.add("THEATER\t" + encode(theater.getLocation()));
        }
        for (Theater theater : corp.getTheaters()) {
            for (Map.Entry<Integer, Movie> entry : theater.getScreens().entrySet()) {
                Movie movie = entry.getValue();
                if (movie == null || corp.findMovie(movie.getTitle()) != movie || entry.getKey() <= 0) {
                    throw new IOException("A showing must refer to a movie in this catalogue and a positive screen.");
                }
                lines.add("SHOWING\t" + encode(theater.getLocation()) + "\t" + entry.getKey()
                        + "\t" + encode(movie.getTitle()));
            }
        }
        // A missing marker helps detect incomplete writes and many truncated files.
        lines.add("END");

        Path parent = target.getParent();
        Files.createDirectories(parent);
        Path temporary = Files.createTempFile(parent, ".theatercorp-", ".tmp");
        try {
            Files.write(temporary, lines, StandardCharsets.UTF_8);
            try {
                Files.move(temporary, target, StandardCopyOption.ATOMIC_MOVE,
                        StandardCopyOption.REPLACE_EXISTING);
            } catch (AtomicMoveNotSupportedException error) {
                // The fallback still uses a complete temporary file, but is not atomic.
                Files.move(temporary, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } finally {
            Files.deleteIfExists(temporary);
        }
    }

    private static void requireFields(String[] fields, int expected, int line) throws IOException {
        if (fields.length != expected) {
            throw new IOException("Wrong number of fields on line " + line + ".");
        }
    }

    // Encoding keeps tabs, newlines, and non-ASCII text inside a single field.
    // It is not encryption and does not make private information safe to publish.
    private static String encode(String text) {
        return Base64.getEncoder().encodeToString(text.getBytes(StandardCharsets.UTF_8));
    }

    private static String decode(String text) throws IOException {
        try {
            byte[] bytes = Base64.getDecoder().decode(text);
            return StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(bytes)).toString();
        } catch (IllegalArgumentException | CharacterCodingException error) {
            throw new IOException("Invalid encoded text in TheaterCorp file.", error);
        }
    }
}
