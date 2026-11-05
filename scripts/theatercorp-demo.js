/* A small browser-only adaptation of TheaterCorp's Java model.
   Data is fictional, held in memory, and reset on page refresh. */
(() => {
  "use strict";
  const root = document.getElementById("theatercorp-demo");
  if (!root) return;

  // This is a fixed interface template. Visitor values are never inserted as HTML.
  root.innerHTML = `
    <section class="tc-shell" aria-label="Fictional TheaterCorp browser demo">
      <header class="tc-header">
        <div>
          <p class="tc-eyebrow">FICTIONAL BROWSER DEMO</p>
        </div>
      </header>
      <div class="tc-panel">
        <div class="tc-panel-header">
          <h4>Now showing</h4>
          <div class="tc-actions" role="group" aria-label="TheaterCorp actions">
            <button type="button" data-tc-open="movie" aria-expanded="false" aria-controls="tc-movie-form">Add movie</button>
            <button type="button" data-tc-open="theater" aria-expanded="false" aria-controls="tc-theater-form">Add theater</button>
            <button type="button" data-tc-open="assign" aria-expanded="false" aria-controls="tc-assign-form">Assign to screen</button>
          </div>
        </div>
        <p class="tc-note">Changes stay in this page until you refresh. Use fictional details.</p>
        <p id="tc-status" class="tc-status" role="status" aria-live="polite" aria-atomic="true"></p>
        <form id="tc-movie-form" class="tc-form" data-tc-form="movie" hidden novalidate>
          <h5>Add a movie</h5>
          <label for="tc-movie-title">Movie title</label>
          <input id="tc-movie-title" name="title" maxlength="100" required autocomplete="off">
          <label for="tc-rating">Rating</label>
          <select id="tc-rating" name="rating" required>
            <option value="G">G</option><option value="PG">PG</option><option value="PG-13">PG-13</option><option value="R">R</option><option value="NR">NR</option>
          </select>
          <button type="submit">Add movie</button>
        </form>
        <form id="tc-theater-form" class="tc-form" data-tc-form="theater" hidden novalidate>
          <h5>Add a theater</h5>
          <label for="tc-theater-location">Theater location</label>
          <input id="tc-theater-location" name="location" maxlength="80" required autocomplete="off">
          <button type="submit">Add theater</button>
        </form>
        <form id="tc-assign-form" class="tc-form" data-tc-form="assign" hidden novalidate>
          <h5>Assign a movie to a screen</h5>
          <label for="tc-theater-choice">Theater</label>
          <select id="tc-theater-choice" name="theater" required></select>
          <label for="tc-screen">Screen number</label>
          <input id="tc-screen" name="screen" type="number" min="1" max="2147483647" step="1" required inputmode="numeric">
          <label for="tc-movie-choice">Movie</label>
          <select id="tc-movie-choice" name="movie" required></select>
          <label class="tc-check"><input id="tc-replace" name="replace" type="checkbox"> Replace an existing screen assignment</label>
          <button type="submit">Assign to screen</button>
        </form>
        <div class="tc-table-wrap" tabindex="0" aria-label="Now showing table, scroll horizontally if needed">
          <table class="tc-table">
            <caption class="tc-sr-only">Fictional movies assigned to theater screens</caption>
            <thead><tr><th scope="col">Movie</th><th scope="col">Theater</th><th scope="col">Screen</th><th scope="col">Rating</th></tr></thead>
            <tbody id="tc-showings"></tbody>
          </table>
        </div>
        <p id="tc-empty" class="tc-note" hidden>No movies have been assigned to screens yet.</p>
        <div class="tc-inventory">
          <div><strong>Movies in catalog</strong><ul id="tc-movies"></ul></div>
          <div><strong>Theaters</strong><ul id="tc-theaters"></ul></div>
        </div>
      </div>
      <p class="tc-model"><strong>How it works:</strong> Add a movie, add a theater, and assign the movie to a numbered screen.</p>
    </section>`;

  const state = {
    movies: [{ title: "The Emerald Signal", rating: "PG" }, { title: "Midnight Transit", rating: "PG-13" }],
    theaters: [{ location: "Central", screens: new Map([[1, "The Emerald Signal"]]) }]
  };
  const $ = selector => root.querySelector(selector);
  const message = text => { $("#tc-status").textContent = text; };
  const key = value => value.trim().toLowerCase();
  const movieByName = value => state.movies.find(movie => key(movie.title) === key(value));
  const theaterByName = value => state.theaters.find(theater => key(theater.location) === key(value));

  function updateChoices(select, values) {
    const previous = select.value;
    select.replaceChildren();
    values.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    if (values.includes(previous)) select.value = previous;
  }
  function listItems(list, values) {
    list.replaceChildren();
    values.forEach(value => {
      const item = document.createElement("li");
      item.textContent = value;
      list.appendChild(item);
    });
  }
  function render() {
    const body = $("#tc-showings");
    body.replaceChildren();
    let count = 0;
    state.theaters.forEach(theater => {
      [...theater.screens.entries()].sort((a, b) => a[0] - b[0]).forEach(([screen, title]) => {
        const movie = movieByName(title);
        if (!movie) return;
        const row = document.createElement("tr");
        [movie.title, theater.location, String(screen), movie.rating].forEach(value => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
        });
        body.appendChild(row);
        count += 1;
      });
    });
    $("#tc-empty").hidden = count > 0;
    listItems($("#tc-movies"), state.movies.map(movie => movie.title + " (" + movie.rating + ")"));
    listItems($("#tc-theaters"), state.theaters.map(theater => theater.location));
    updateChoices($("#tc-theater-choice"), state.theaters.map(theater => theater.location));
    updateChoices($("#tc-movie-choice"), state.movies.map(movie => movie.title));
  }
  function openForm(name, button) {
    root.querySelectorAll("[data-tc-form]").forEach(form => { form.hidden = form.dataset.tcForm !== name; });
    root.querySelectorAll("[data-tc-open]").forEach(item => { item.setAttribute("aria-expanded", String(item === button)); });
    message("");
    const field = root.querySelector('[data-tc-form="' + name + '"] input, [data-tc-form="' + name + '"] select');
    if (field) field.focus();
  }
  root.addEventListener("click", event => {
    const button = event.target.closest("[data-tc-open]");
    if (button && root.contains(button)) openForm(button.dataset.tcOpen, button);
  });
  root.addEventListener("submit", event => {
    const form = event.target.closest("[data-tc-form]");
    if (!form || !root.contains(form)) return;
    event.preventDefault();
    const fields = new FormData(form);
    const kind = form.dataset.tcForm;
    if (kind === "movie") {
      const title = String(fields.get("title") || "").trim();
      const rating = String(fields.get("rating") || "");
      if (!title || title.length > 100) { message("Enter a movie title of up to 100 characters."); return; }
      if (!["G", "PG", "PG-13", "R", "NR"].includes(rating)) { message("Choose a listed rating."); return; }
      if (movieByName(title)) { message("A movie with that title already exists."); return; }
      state.movies.push({ title, rating });
      form.reset();
      render();
      message("Movie added: " + title + ".");
    } else if (kind === "theater") {
      const location = String(fields.get("location") || "").trim();
      if (!location || location.length > 80) { message("Enter a theater location of up to 80 characters."); return; }
      if (theaterByName(location)) { message("A theater with that location already exists."); return; }
      state.theaters.push({ location, screens: new Map() });
      form.reset();
      render();
      message("Theater added: " + location + ".");
    } else if (kind === "assign") {
      const theater = theaterByName(String(fields.get("theater") || ""));
      const movie = movieByName(String(fields.get("movie") || ""));
      const raw = String(fields.get("screen") || "").trim();
      const screen = Number(raw);
      if (!theater || !movie) { message("Choose an existing theater and movie."); return; }
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(screen) || screen < 1 || screen > 2147483647) {
        message("Enter a whole screen number between 1 and 2147483647."); return;
      }
      if (theater.screens.has(screen) && fields.get("replace") !== "on") {
        message("That screen already has a movie. Check the replacement box to confirm."); return;
      }
      theater.screens.set(screen, movie.title);
      form.reset();
      render();
      message(movie.title + " assigned to " + theater.location + ", screen " + screen + ".");
    }
  });
  render();
})();
