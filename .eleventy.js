const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  // IMPORTANT: html:false blocks raw <script>/<iframe>/etc. tags from being
  // rendered from markdown content. Since member bios are community-submitted,
  // this is the single most important security setting in this file — do not
  // remove it or set it to true.
  const md = markdownIt({
    html: false,
    linkify: true,
    breaks: true,
  });
  eleventyConfig.setLibrary("md", md);

  eleventyConfig.addPassthroughCopy("src/css");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("admin");

  // Every markdown file in src/who/ becomes part of the "who" collection
  eleventyConfig.addCollection("who", (collectionApi) => {
    return collectionApi.getFilteredByGlob("src/who/*.md").sort((a, b) => {
      const nameA = (a.data.name || "").toLowerCase();
      const nameB = (b.data.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  });

  // Events are split into upcoming/past HERE, at build time, by comparing
  // each event's `when` date to the moment the site is built. Because the
  // GitHub Action rebuilds the site on every push, this split re-evaluates
  // itself automatically every time anyone submits a profile or event —
  // no extra code needed for that part.
  eleventyConfig.addCollection("upcomingEvents", (collectionApi) => {
    const today = new Date();
    return collectionApi
      .getFilteredByGlob("src/events/*.md")
      .filter((event) => new Date(event.data.when) >= today)
      .sort((a, b) => new Date(a.data.when) - new Date(b.data.when)); // soonest first
  });

  eleventyConfig.addCollection("pastEvents", (collectionApi) => {
    const today = new Date();
    return collectionApi
      .getFilteredByGlob("src/events/*.md")
      .filter((event) => new Date(event.data.when) < today)
      .sort((a, b) => new Date(b.data.when) - new Date(a.data.when)); // most recent past first
  });

  return {
    pathPrefix: process.env.ELEVENTY_PATH_PREFIX || "/",
    dir: {
      input: "src",
      output: "dist",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
