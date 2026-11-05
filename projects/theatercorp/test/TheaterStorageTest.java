import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Comparator;
import java.util.stream.Stream;

/** Checks the persistent catalog with temporary, invented data only. */
public class TheaterStorageTest {
    private static int checks;

    @FunctionalInterface
    interface IOAction {
        void run() throws IOException;
    }

    private static void check(boolean condition, String explanation) {
        checks++;
        if (!condition) throw new AssertionError(explanation);
    }

    private static void expectIOException(IOAction action, String explanation) {
        checks++;
        try {
            action.run();
            throw new AssertionError(explanation + " should fail clearly");
        } catch (IOException expected) {
            // A bad file must not silently become an empty catalog.
        }
    }

    private static String encoded(String value) {
        return Base64.getEncoder().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    public static void main(String[] args) throws Exception {
        Path temp = Files.createTempDirectory("theatercorp-storage-test-");
        try {
            Path file = temp.resolve("catalog.txt");
            expectIOException(() -> TheaterStorage.load(file), "A nonexistent file");

            TheaterCorp original = new TheaterCorp("Night Cinema");
            original.addMovie(new Movie("The Quiet Orbit", Rating.PG_13));
            original.addMovie(new Movie("Lantern Harbor", Rating.G));
            original.addTheater(new Theater("North Hall"));
            check(original.scheduleMovie("North Hall", 2, "The Quiet Orbit"),
                    "Sample showing should be created");
            TheaterStorage.save(original, file);
            check(Files.isRegularFile(file), "A saved catalog should exist");

            TheaterCorp restored = TheaterStorage.load(file);
            check(restored.getMovies().size() == 2, "Both movies should survive a round trip");
            check(restored.getTheaters().size() == 1, "The theater should survive a round trip");
            check(restored.findMovie("the quiet orbit").getRating() == Rating.PG_13,
                    "A movie's rating should survive a round trip");
            check(restored.findTheater("north hall").getScreens().get(2).getTitle()
                    .equals("The Quiet Orbit"), "A showing should reconnect to its movie");

            restored.addTheater(new Theater("East Hall"));
            TheaterStorage.save(restored, file);
            check(TheaterStorage.load(file).findTheater("East Hall") != null,
                    "Saving a valid catalog again should retain updates");
            check(original.findTheater("East Hall") == null,
                    "Changes to a loaded catalog must not mutate the original object");

            String[] brokenFiles = {
                "not a catalog\n",
                "THEATERCORP\t1\nCORP\t%%%\nEND\n",
                "THEATERCORP\t1\nCORP\t" + encoded("Night Cinema")
                    + "\nMOVIE\t" + encoded("Quiet Orbit") + "\tINVALID\nEND\n",
                "THEATERCORP\t1\nCORP\t" + encoded("Night Cinema")
                    + "\nMOVIE\t" + encoded("Quiet Orbit") + "\tG"
                    + "\nMOVIE\t" + encoded("quiet orbit") + "\tPG\nEND\n",
                "THEATERCORP\t1\nCORP\t" + encoded("Night Cinema")
                    + "\nTHEATER\t" + encoded("North Hall")
                    + "\nSHOWING\t" + encoded("North Hall") + "\t1\t" + encoded("Absent Film") + "\nEND\n",
                // A valid prefix without END may be an interrupted file write.
                "THEATERCORP\t1\nCORP\t" + encoded("Night Cinema") + "\n",
                "THEATERCORP\t1\nCORP\t" + encoded("Night Cinema") + "\nEND\nEXTRA\n",
                "THEATERCORP\t1\nCORP\t" + encoded("Night Cinema")
                    + "\nMOVIE\t" + encoded("Quiet Orbit") + "\tG"
                    + "\nTHEATER\t" + encoded("North Hall")
                    + "\nSHOWING\t" + encoded("North Hall") + "\t1\t" + encoded("Quiet Orbit")
                    + "\nSHOWING\t" + encoded("North Hall") + "\t1\t" + encoded("Quiet Orbit") + "\nEND\n"
            };
            for (int i = 0; i < brokenFiles.length; i++) {
                Path bad = temp.resolve("broken-" + i + ".txt");
                byte[] bytes = brokenFiles[i].getBytes(StandardCharsets.UTF_8);
                Files.write(bad, bytes);
                expectIOException(() -> TheaterStorage.load(bad), "Malformed catalog " + i);
                expectIOException(() -> TheaterStorage.save(original, bad),
                        "Saving over malformed catalog " + i);
                check(java.util.Arrays.equals(bytes, Files.readAllBytes(bad)),
                        "A rejected save must preserve the existing file");
            }

            // A public Theater can be edited independently of its corporation.
            // Saving must reject a showing that points outside the catalog.
            byte[] validBefore = Files.readAllBytes(file);
            restored.findTheater("North Hall").setShowing(3, new Movie("Outsider", Rating.G));
            expectIOException(() -> TheaterStorage.save(restored, file),
                    "A showing for a movie not registered in the catalog");
            check(java.util.Arrays.equals(validBefore, Files.readAllBytes(file)),
                    "Invalid in-memory data must not overwrite the valid catalog");
            System.out.println("TheaterCorp storage checks passed: " + checks);
        } finally {
            // Only remove the temporary directory created above and its children.
            try (Stream<Path> paths = Files.walk(temp)) {
                paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                    try { Files.deleteIfExists(path); }
                    catch (IOException e) { throw new RuntimeException(e); }
                });
            }
        }
    }
}
