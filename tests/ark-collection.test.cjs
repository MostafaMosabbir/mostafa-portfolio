const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const context = {window:{}};
for (const file of ['ark-catalog.js', 'ark-art-sources.js', 'ark-years.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../scripts', file), 'utf8'), context);
}
const catalog = context.window.ARK_CATALOG;
const artwork = context.window.ARK_ART_SOURCES;
const years = context.window.ARK_YEARS;

test('the requested categories all have an artwork source for every entry', () => {
  assert.deepEqual([...new Set(catalog.map(item => item.category))].sort(), ['Games', 'Movies', 'Music', 'TV']);
  const missing = catalog.filter(item => !artwork[item.category + '::' + item.title]);
  assert.equal(missing.length, 0);
  for (const item of Object.values(artwork)) {
    if (item.url) assert.equal(new URL(item.url).protocol, 'https:');
    assert.equal(new URL(item.source).protocol, 'https:');
  }
});

test('the unwanted album is removed and the two Weeknd albums are separate', () => {
  const titles = catalog.filter(item => item.category === 'Music').map(item => item.title);
  assert.equal(titles.includes('Never Mind'), false);
  assert.equal(titles.includes('Dawn FM'), true);
  assert.equal(titles.includes('After Hours'), true);
  assert.notEqual(artwork['Music::Dawn FM'].url, artwork['Music::After Hours'].url);
});

test('updated favorites use the intended media and original release years', () => {
  const keys = new Set(catalog.map(item => `${item.category}::${item.title}`));
  const expected = {
    'Movies::Harry Potter Series': 2001,
    'TV::Westworld': 2016,
    'Music::ANTI': 2016,
    'Games::Destiny': 2014,
    'Games::Destiny 2': 2017,
    'Games::Star Wars: Battlefront (2004)': 2004
  };
  for (const [key, year] of Object.entries(expected)) {
    assert.ok(keys.has(key), key);
    assert.equal(years[key]?.year, year, key);
    assert.ok(artwork[key]?.url, key);
  }
  for (const key of ['Music::Coloring Book', 'Movies::Harry Potter (Prisoner of Azkaban)']) {
    assert.equal(keys.has(key), false, key);
    assert.equal(artwork[key], undefined, key);
    assert.equal(years[key], undefined, key);
  }
  assert.match(artwork['Music::ANTI'].label, /Rihanna/);
  assert.match(artwork['TV::Westworld'].label, /HBO series/);
  assert.match(years['Games::Star Wars: Battlefront (2004)'].label, /PlayStation 2/);
  assert.notEqual(artwork['Movies::Harry Potter Series'].url, artwork['Books::Harry Potter Series'].url);
});

test('the approved book and trilogy artwork is connected to dated Ark entries', () => {
  // Books are added by the reel separately from the movies, music and games catalog.
  const keys = [
    'Games::Mass Effect Trilogy',
    'Books::Enders Game',
    'Books::Harry Potter Series',
    'Books::Dune',
    'Books::Halo: The Fall of Reach',
    'Books::Song of Ice and Fire Series'
  ];
  for (const key of keys) {
    assert.ok(artwork[key], `Missing artwork mapping for ${key}`);
    assert.equal(new URL(artwork[key].url).protocol, 'https:');
    assert.equal(new URL(artwork[key].source).protocol, 'https:');
    assert.ok(artwork[key].label, `Missing alternative text for ${key}`);
    assert.ok(years[key] && Number.isInteger(years[key].year), `Missing release year for ${key}`);
  }
  assert.equal(new Set(keys.map(key => artwork[key].url)).size, keys.length);
});
