(function () {
  "use strict";

  const storageKey = "color-columns:leaderboard:v1";
  const limit = 5;
  const nameLimit = 16;

  function normalizeScore(entry) {
    if (!entry || !Number.isSafeInteger(entry.score) || entry.score <= 0) return null;
    const name = typeof entry.name === "string" ? entry.name.replace(/[\p{Cc}\p{Cf}]/gu, "").trim() : "";
    const shortName = Array.from(name).slice(0, nameLimit).join("").trimEnd();
    return { name: shortName || "Player", score: entry.score };
  }

  function topScores(entries) {
    return entries.sort((first, second) => second.score - first.score).slice(0, limit);
  }

  function readStorage() {
    let storage;
    let saved;
    try {
      storage = window.localStorage;
      saved = storage.getItem(storageKey);
    } catch {
      return null;
    }

    let entries;
    try {
      entries = JSON.parse(saved);
    } catch {
      entries = [];
    }
    const valid = Array.isArray(entries) ? entries.map(normalizeScore).filter(Boolean) : [];
    return { storage, entries: topScores(valid) };
  }

  function create() {
    let scores = [];
    let unsaved = [];

    function copyScores() {
      return scores.map((entry) => ({ ...entry }));
    }

    function read() {
      const current = readStorage();
      if (current) scores = topScores([...current.entries, ...unsaved]);
      return copyScores();
    }

    function record(name, score) {
      const entry = normalizeScore({ name, score });
      if (!entry) return read();

      const current = readStorage();
      const latest = current ? [...current.entries, ...unsaved] : scores;
      scores = topScores([...latest, entry]);
      unsaved = topScores([...unsaved, entry]);

      if (current) {
        try {
          current.storage.setItem(storageKey, JSON.stringify(scores));
          unsaved = [];
        } catch {
          // Keep the scores available in this session if storage rejects the write.
        }
      }

      return copyScores();
    }

    return { read, record };
  }

  window.ColorColumnsLeaderboard = { create };
}());
