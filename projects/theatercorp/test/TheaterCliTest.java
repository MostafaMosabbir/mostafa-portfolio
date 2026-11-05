import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

/** Exercises the actual menu and a second process that reloads saved data. */
public class TheaterCliTest {
    private static int checks;

    private static void check(boolean condition, String explanation) {
        checks++;
        if (!condition) throw new AssertionError(explanation);
    }

    private static final class Result {
        final int code;
        final String text;
        Result(int code, String text) { this.code = code; this.text = text; }
    }

    private static Result run(Path file, String input) throws Exception {
        String java = Path.of(System.getProperty("java.home"), "bin", "java").toString();
        Process process = new ProcessBuilder(java, "-cp", System.getProperty("java.class.path"),
                "ApplicationDriver", file.toString()).redirectErrorStream(true).start();
        try {
            process.getOutputStream().write(input.getBytes(StandardCharsets.UTF_8));
            process.getOutputStream().close();
            if (!process.waitFor(10, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                throw new AssertionError("The menu did not finish within ten seconds.");
            }
            return new Result(process.exitValue(),
                    new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8));
        } finally {
            if (process.isAlive()) process.destroyForcibly();
        }
    }

    public static void main(String[] args) throws Exception {
        Path temp = Files.createTempDirectory("theatercorp-cli-test-");
        try {
            Path catalog = temp.resolve("catalog.txt");
            Result first = run(catalog,
                    "2\nA Fictional Film\nPG\n3\nTest Hall\n4\nTest Hall\n2\nA Fictional Film\n5\n0\n");
            check(first.code == 0, "The normal interactive session should exit successfully");
            check(first.text.contains("Screen 2: A Fictional Film"),
                    "The user should be able to add and assign a fictional movie");
            check(Files.exists(catalog), "The user's changes should be saved to the chosen path");

            Result second = run(catalog, "5\n0\n");
            check(second.code == 0 && second.text.contains("Loaded your saved catalogue."),
                    "The next run should report loading the saved catalog");
            check(second.text.contains("Screen 2: A Fictional Film"),
                    "The showing should remain available after restarting the app");

            Result decline = run(catalog, "4\nTest Hall\n2\nThe Emerald Signal\nn\n5\n0\n");
            check(decline.code == 0 && decline.text.contains("Screen unchanged."),
                    "Rejecting a replacement should preserve the current showing");
            check(decline.text.contains("Screen 2: A Fictional Film"),
                    "The original showing should still be listed");
            Result accept = run(catalog, "4\nTest Hall\n2\nThe Emerald Signal\ny\n0\n");
            check(accept.code == 0 && accept.text.contains("Screen updated."),
                    "An explicit confirmation should replace an existing showing");
            Result afterReplace = run(catalog, "5\n0\n");
            check(afterReplace.text.contains("Screen 2: The Emerald Signal"),
                    "The confirmed replacement should persist after restarting");

            byte[] invalid = "not a valid catalog".getBytes(StandardCharsets.UTF_8);
            Path bad = temp.resolve("broken.txt");
            Files.write(bad, invalid);
            Result failure = run(bad, "0\n");
            check(failure.code != 0 && failure.text.contains("Could not load"),
                    "A bad existing catalog should produce an error and stop");
            check(java.util.Arrays.equals(invalid, Files.readAllBytes(bad)),
                    "An unreadable catalog must not be replaced by sample data");

            Path blank = temp.resolve("never-saved.txt");
            Result invalidScreen = run(blank, "4\nCentral\n0\n0\n");
            check(invalidScreen.code == 0 && invalidScreen.text.contains("whole number greater than zero"),
                    "The menu should reject an invalid screen and continue");
            check(!Files.exists(blank), "A failed change should not create a data file");
            System.out.println("TheaterCorp command-line checks passed: " + checks);
        } finally {
            try (Stream<Path> paths = Files.walk(temp)) {
                paths.sorted(Comparator.reverseOrder()).forEach(path -> {
                    try { Files.deleteIfExists(path); }
                    catch (IOException e) { throw new RuntimeException(e); }
                });
            }
        }
    }
}
