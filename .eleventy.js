const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  const prefix = process.env.ELEVENTY_PATH_PREFIX || "/";
  // Normalized with no trailing slash, e.g. "/rustBeltDN" or "" for root
  const normalizedPrefix = prefix === "/" ? "" : prefix.replace(/\/$/, "");

  // IMPORTANT: html:false blocks raw <script>/<iframe>/etc. tags from being
  // rendered from markdown content. Since member bios are community-submitted,
  // this is the single most important security setting in this file — do not
  // remove it or set it to true.
  const md = markdownIt({
    html: false,
    linkify: true,
    breaks: true,
  });

  // Root-relative paths typed or inserted freeform inside markdown (e.g. an
  // image added via the CMS's inline "add image" button, rather than a
  // dedicated Photo field) never pass through Nunjucks' `url` filter, since
  // they're just plain text in the body. On a GitHub Pages project site
  // (served under /repo-name/), an unprefixed "/img/..." path resolves one
  // level too high and silently 404s. These two renderer overrides prefix
  // any such path automatically, so this can't happen again regardless of
  // how an image or link ends up in someone's bio or event description.
  const prefixIfRootRelative = (url) => {
    if (!normalizedPrefix) return url; // local dev: nothing to do
    if (!url.startsWith("/") || url.startsWith("//")) return url; // leave external/protocol-relative URLs alone
    if (url.startsWith(`${normalizedPrefix}/`)) return url; // already prefixed
    return normalizedPrefix + url;
  };

  const defaultImageRender =
    md.renderer.rules.image ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const srcIndex = token.attrIndex("src");
    if (srcIndex >= 0) {
      token.attrs[srcIndex][1] = prefixIfRootRelative(token.attrs[srcIndex][1]);
    }
    return defaultImageRender(tokens, idx, options, env, self);
  };

  const defaultLinkOpenRender =
    md.renderer.rules.link_open ||
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const hrefIndex = token.attrIndex("href");
    if (hrefIndex >= 0) {
      token.attrs[hrefIndex][1] = prefixIfRootRelative(token.attrs[hrefIndex][1]);
    }
    return defaultLinkOpenRender(tokens, idx, options, env, self);
  };

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