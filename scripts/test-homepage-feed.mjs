import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(file, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, URL, Date, require(name) {
    assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return loadedModule.exports;
}

const mentions = load("../lib/discord/formatMentions.ts");
const { prepareAnnouncements } = load("../lib/discord/announcements.ts", { "./formatMentions": mentions });
const { prepareEvents } = load("../lib/discord/events.ts");
const now = Date.parse("2026-10-22T12:00:00Z");
const message = (content, options = {}) => ({ id: "post", content, timestamp: "2026-10-21T12:00:00Z", ...options });
const gif = { type: "gifv", url: "https://tenor.com/view/this-is-the-way-123", title: "Book Of Boba Fett GIF - Discover & Share GIFs", description: "Repeated GIF preview text", thumbnail: { url: "https://media.tenor.com/test/preview.png" } };

test("GIF-only posts and their preview metadata are omitted, before limiting the news feed", () => {
  const result = prepareAnnouncements([
    ...Array.from({ length: 5 }, (_, i) => message(gif.url, { id: `gif-${i}`, embeds: [gif] })),
    ...Array.from({ length: 4 }, (_, i) => message(`News ${i}\n\nAn important written update.`, { id: `news-${i}` })),
  ], now);
  assert.deepEqual(Array.from(result, (item) => item.id), ["news-0", "news-1", "news-2"]);
  assert.ok(result.every((item) => !item.imageUrl));
});

test("written messages with a GIF keep their announcement text and drop the GIF", () => {
  const [result] = prepareAnnouncements([message(`Operation tonight\n\nMeet on Discord at 20:00 UTC.\n${gif.url}`, { embeds: [gif] })], now);
  assert.equal(result.title, "Operation tonight");
  assert.equal(result.content, "Meet on Discord at 20:00 UTC.");
  assert.equal(result.imageUrl, null);
  assert.equal(result.timestamp, "1 day ago");
});

test("promotion ping lines are removed without losing mentions inside the announcement", () => {
  const [result] = prepareAnnouncements([message("||<@123><@456>||\n\n**Attention Dragoons,**\n\nCongratulations to <@123> on promotion.")], now);
  assert.equal(result.title, "Attention Dragoons,");
  assert.equal(result.content, "Congratulations to @Member on promotion.");
  assert.equal(result.excerpt, "Congratulations to @Member on promotion.");
});

test("bot-authored rich embed descriptions and fields remain in the feed", () => {
  const [result] = prepareAnnouncements([message("Attention Dragoons", { embeds: [{ type: "rich", title: "Promotion", description: "A well earned advancement.", fields: [{ name: "New rank", value: "Captain" }] }] })], now);
  assert.equal(result.title, "Attention Dragoons");
  assert.match(result.content, /Promotion/);
  assert.match(result.content, /A well earned advancement/);
  assert.match(result.content, /New rank.*\nCaptain/s);
});

test("ordinary link previews never override the actual authored message", () => {
  const [result] = prepareAnnouncements([message("Read this important update: https://example.com/news", { embeds: [{ type: "link", title: "Automatic preview", description: "Unrelated preview metadata" }] })], now);
  assert.match(result.content, /important update/);
  assert.doesNotMatch(result.content, /Unrelated preview/);
});

test("GIF attachments with signed URLs are removed, while static image-only posts survive", () => {
  assert.equal(prepareAnnouncements([message("", { attachments: [{ url: "https://cdn.discordapp.com/reaction.GIF?ex=123", filename: "reaction.GIF", content_type: "image/gif" }] })], now).length, 0);
  const [result] = prepareAnnouncements([message("", { attachments: [{ url: "https://cdn.discordapp.com/team.png?ex=123", filename: "team.png", content_type: "image/png" }] })], now);
  assert.equal(result.title, "Community photo");
  assert.equal(result.imageUrl, "https://cdn.discordapp.com/team.png?ex=123");
});

test("Markdown GIF labels are removed and still-image Markdown becomes a thumbnail", () => {
  const [result] = prepareAnnouncements([message("Training\n\nBring your gear. ![GIF](https://giphy.com/gifs/example) ![Team](https://example.com/team.png)")], now);
  assert.equal(result.title, "Training");
  assert.equal(result.content, "Bring your gear.");
  assert.equal(result.imageUrl, "https://example.com/team.png");
});

test("long news gets a short plain-text excerpt and keeps the complete body", () => {
  const body = "**Our next operation** will bring the pack together. ".repeat(20);
  const [result] = prepareAnnouncements([message(`Fleet update\n\n${body}`)], now);
  assert.equal(result.content, body.trim());
  assert.ok(result.excerpt.length <= 180);
  assert.ok(result.excerpt.endsWith("…"));
  assert.doesNotMatch(result.excerpt, /\*\*/);
});

const event = (id, start, status = 1) => ({ id, name: `Operation ${id}`, description: "Join the pack.", scheduled_start_time: start, status });
test("events exclude finished, cancelled, overdue and invalid entries, retaining live operations", () => {
  const result = prepareEvents([
    event("later", "2026-10-25T20:00:00Z"), event("soon", "2026-10-22T20:00:00Z"),
    event("past", "2026-10-22T10:00:00Z"), event("finished", "2026-10-23T20:00:00Z", 3),
    event("cancelled", "2026-10-23T20:00:00Z", 4), event("invalid", "bad date"),
    event("live", "2026-10-21T20:00:00Z", 2), event("fourth", "2026-10-26T20:00:00Z"),
  ], "guild", now);
  assert.deepEqual(Array.from(result, (item) => item.id), ["live", "soon", "later"]);
  assert.equal(result[0].isLive, true);
  assert.equal(result[1].url, "https://discord.com/events/guild/soon");
});

const Hero = load("../components/layout/Hero.tsx", {
  react: require("react"), "react/jsx-runtime": require("react/jsx-runtime"),
  "lucide-react": new Proxy({}, { get: () => () => null }),
  "@/lib/discord/formatMentions": mentions,
  "../utils/SafeImage": { SafeImage: ({ src, alt }) => React.createElement("img", { src, alt }) },
  "../utils/MarkdownContent": { __esModule: true, default: ({ content }) => React.createElement("p", null, content) },
}).default;
const render = (props = {}) => renderToStaticMarkup(React.createElement(Hero, {
  events: [], announcements: [], featuredPhotos: [],
  featuredVideo: { youtubeId: "video", title: "Iron Rain", thumbnail: "https://example.com/video.jpg" }, ...props,
}));

test("the empty events section has no heading, background strip or placeholder in rendered HTML", () => {
  const html = render();
  assert.doesNotMatch(html, /events-heading|No upcoming events|Rally with the pack|SentinelWolfBoomTube/);
  assert.doesNotMatch(html, /announcements-heading/);
  assert.match(html, /All caught up/);
});

test("scheduled events render a UTC date and direct Discord event link", () => {
  const html = render({ events: prepareEvents([event("soon", "2026-10-22T20:00:00Z")], "guild", now) });
  assert.match(html, /events-heading/);
  assert.match(html, /8:00 PM.*UTC/);
  assert.match(html, /href="https:\/\/discord.com\/events\/guild\/soon"/);
});

test("events and announcements share the updates panel with counts and no separate event strip", () => {
  const html = render({
    events: prepareEvents([event("soon", "2026-10-22T20:00:00Z")], "guild", now),
    announcements: prepareAnnouncements([message("Fleet update\n\nBring your gear.")], now),
  });
  assert.match(html, /News &amp; events/i);
  assert.ok(html.indexOf('id="events-heading"') < html.indexOf('id="announcements-heading"'));
  assert.match(html, /<details open=""[^>]*group\/announcements/);
  assert.match(html, /aria-label="1 announcement"/);
  assert.match(html, /aria-label="1 event"/);
  assert.match(html, /<details[^>]*group\/announcements/);
  assert.match(html, /<details[^>]*group\/events/);
  assert.doesNotMatch(html, /Upcoming events|SentinelWolfBoomTube|Rally with the pack/);
});

test("only populated dropdowns appear and live events are visibly indicated", () => {
  const eventHtml = render({ events: prepareEvents([event("live", "2026-10-21T20:00:00Z", 2)], "guild", now) });
  assert.match(eventHtml, /events-heading/);
  assert.match(eventHtml, /Live now/);
  assert.match(eventHtml, /<details open=""[^>]*group\/events/);
  assert.doesNotMatch(eventHtml, /announcements-heading/);
  const newsHtml = render({ announcements: prepareAnnouncements([message("Fleet update\n\nBring your gear.")], now) });
  assert.match(newsHtml, /announcements-heading/);
  assert.doesNotMatch(newsHtml, /events-heading/);
});

test("news renders native expandable full text, without GIF URLs or duplicate headings", () => {
  const content = "The full promotion announcement remains readable. ".repeat(20);
  const html = render({ announcements: prepareAnnouncements([message(`Fleet update\n\n${content}\n${gif.url}`, { embeds: [gif] })], now) });
  assert.match(html, /<details/);
  assert.match(html, /<summary/);
  assert.match(html, /Read announcement/);
  assert.ok(html.includes(content.trim()));
  assert.equal((html.match(/Fleet update/g) ?? []).length, 1);
  assert.doesNotMatch(html, /tenor\.com|Discover &amp; Share/);
});


test("banner cards preserve announcement text and gallery images on the homepage", () => {
  const [result] = prepareAnnouncements([message("", { components: [{ type: 17, components: [
    { type: 12, items: [{ media: { url: "https://cdn.discordapp.com/banner.png" } }] },
    { type: 10, content: "### A NEW DRAGOON\n\nMeet **Wolf**." },
    { type: 10, content: "**STAR CITIZEN**\nBunker Running" },
  ] }] })], now);
  assert.equal(result.title, "A NEW DRAGOON");
  assert.match(result.content, /Meet \*\*Wolf\*\*/);
  assert.match(result.content, /Bunker Running/);
  assert.equal(result.imageUrl, "https://cdn.discordapp.com/banner.png");
  assert.equal(prepareAnnouncements([message("", { components: [{ type: 12, items: [{ media: { url: "https://example.com/reaction.gif" } }] }] })], now).length, 0);
});
