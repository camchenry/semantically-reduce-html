import {
  DOMParser,
  Element,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { Node } from "https://deno.land/x/deno_dom@v0.1.37/src/dom/node.ts";
import { Table } from "https://deno.land/x/cliffy/table/mod.ts";

function removeNode(node: Node) {
  assertElement(node);
  if (node.parentNode) {
    node.parentNode.removeChild(node);
  }
}

function assertElement(node: Node): asserts node is Element {
  if (!(node instanceof Element)) {
    throw new Error("Node is not an element");
  }
}

function semanticallyReduceHtml(
  html: string,
  options: {
    stripAllClasses?: boolean;
    stripAllDataAttributes?: boolean;
    trimWhitespace?: boolean;
    removeLinkTags?: boolean;
    removeMetaTags?: boolean;
    removeStyleTags?: boolean;
    removeNonSemanticSvgTags?: boolean;
  } = {}
): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) {
    throw new Error("Could not parse HTML");
  }

  if (options.removeLinkTags) {
    const linkTags = doc.querySelectorAll(`
      link[rel="stylesheet"],
      link[rel="preload"],
      link[rel="icon"],
      link[rel="apple-touch-icon"],
      link[rel="manifest"],
      link[rel="mask-icon"],
      link[rel="dns-prefetch"],
      link[rel="preconnect"],
      link[rel="canonical"]
    `);
    linkTags.forEach((linkTag) => removeNode(linkTag));
  }

  if (options.removeMetaTags) {
    const metaTags = doc.querySelectorAll(`
    meta[name="viewport"],
    meta[name*="site-verification"],
    meta[name*="validate"],
    meta[name*="verify"],
    meta[name="theme-color"],
    meta[name="msapplication-TileColor"],
    meta[name="msapplication-TileImage"],
    meta[name="msapplication-config"],
    meta[property="fb:app_id"]
  `);
    metaTags.forEach((metaTag) => removeNode(metaTag));
  }

  if (options.removeStyleTags) {
    const styleTags = doc.querySelectorAll("style");
    styleTags.forEach((styleTag) => removeNode(styleTag));
  }

  // Remove non-semantic SVG elements
  if (options.removeNonSemanticSvgTags) {
    const nonSemanticSvgElements = doc.querySelectorAll(
      "svg path, svg use, svg circle"
    );
    nonSemanticSvgElements.forEach((svgElement) => removeNode(svgElement));
  }

  const scriptTags = doc.querySelectorAll("script");
  scriptTags.forEach((scriptTag) => {
    assertElement(scriptTag);
    const scriptContent = scriptTag.innerHTML;
    const lowerScriptContent = scriptContent.toLowerCase().trim();

    // Remove empty script tags
    if (scriptContent.trim().length === 0) {
      removeNode(scriptTag);
    }
  });

  // Remove non-semantic attributes from media content
  const mediaElements = doc.querySelectorAll(
    "img, video, audio, picture, source"
  );
  mediaElements.forEach((mediaElement) => {
    assertElement(mediaElement);
    mediaElement.removeAttribute("width");
    mediaElement.removeAttribute("height");
    mediaElement.removeAttribute("style");
    mediaElement.removeAttribute("class");
    mediaElement.removeAttribute("media");
  });

  // Remove class names that only represent stylistic choices, rather than semantic meaning:
  // - `aem-GridColumn`
  // - `column--12`
  // - `bodytext`
  // - `spacer-small`
  const classNameElements = doc.querySelectorAll("[class]");
  classNameElements.forEach((element) => {
    assertElement(element);
    if (options.stripAllClasses) {
      element.removeAttribute("class");
      return;
    }
    const classList = element.getAttribute("class")?.split(" ") || [];
    const newClassList = classList.filter((c) => {
      const lowercase = c.toLowerCase();
      if (lowercase.includes("grid")) return false;
      if (lowercase.includes("column")) return false;
      if (lowercase.includes("row")) return false;
      if (lowercase.includes("wrapper")) return false;
      if (lowercase.includes("container")) return false;
      if (lowercase.includes("separator")) return false;
      if (lowercase.includes("carousel")) return false;
      if (lowercase.includes("animation")) return false;
      if (lowercase.includes("spacer")) return false;
      if (lowercase.includes("small")) return false;
      if (lowercase.includes("medium")) return false;
      if (lowercase.includes("large")) return false;
      if (lowercase.includes("mobile")) return false;
      if (lowercase.includes("tablet")) return false;
      if (lowercase.includes("padding")) return false;
      if (lowercase.includes("margin")) return false;
      if (lowercase.includes("theme")) return false;
      if (lowercase.includes("loader")) return false;
      if (lowercase.includes("link")) return false;
      if (lowercase.includes("bold")) return false;
      if (lowercase.includes("background")) return false;
      if (lowercase.includes("foreground")) return false;
      return true;
    });
    // if class list is empty, remove the class attribute
    if (
      newClassList.length === 0 ||
      (newClassList.length === 1 && newClassList[0] === "")
    ) {
      element.removeAttribute("class");
    } else {
      element.setAttribute("class", newClassList.join(" "));
    }
  });

  const linkElements = doc.querySelectorAll("a");
  linkElements.forEach((linkElement) => {
    assertElement(linkElement);
    // known attributes that are probably not semantic
    linkElement.removeAttribute("target");
  });

  // Remove other attributes that are not semantic
  const allElements = doc.querySelectorAll("*");
  allElements.forEach((element) => {
    assertElement(element);
    // known attributes
    element.removeAttribute("style");
    element.removeAttribute("tabindex");
    element.removeAttribute("xmlns:xlink");
    element.removeAttribute("xlink:href");
    element.removeAttribute("viewBox");
  });

  const dataAttributeElements = Array.from(allElements).filter((element) => {
    assertElement(element);

    return Object.keys(element.attributes).some((attribute) =>
      attribute.startsWith("data-")
    );
  });
  if (options.stripAllDataAttributes) {
    dataAttributeElements.forEach((element) => removeNode(element));
  }

  let newHtml = doc.body.outerHTML;

  // remove doctype
  newHtml = newHtml.replace(/<!DOCTYPE[^>]*>/i, "");

  // remove extra whitespace
  if (options.trimWhitespace) {
    newHtml = newHtml.replace(/\s{2,}/g, " ");
  }

  // remove spaces between tags
  newHtml = newHtml.replace(
    /(<(pre|script|style|textarea)[^]+?<\/\2)|(^|>)\s+|\s+(?=<|$)/g,
    "$1$3"
  );

  return newHtml;
}

type ReductionResult = {
  url: string;
  originalSize: number;
  reducedSize: number;
  originalHtml: string;
  reducedHtml: string;
};

const results: Array<ReductionResult> = [];

// List of URLS that send down a nice HTML payload that
// doesn't require us to render using JavaScript (that can come later)
const urls = [
  "https://www.wikipedia.org/",
  "https://www.youtube.com/",
  "https://www.bbc.com/",
  "https://www.reddit.com/",
];
for (const url of urls) {
  const page = await fetch(url);
  const html = await page.text();

  const reducedHtml = semanticallyReduceHtml(html, {
    stripAllClasses: true,
    stripAllDataAttributes: true,
    trimWhitespace: true,
    removeLinkTags: true,
    removeMetaTags: true,
    removeNonSemanticSvgTags: true,
  });

  results.push({
    url,
    originalSize: html.length,
    reducedSize: reducedHtml.length,
    originalHtml: html,
    reducedHtml,
  });
}

// Render a markdown table of the results, using library to ensure
// that results are padded correctly
const table = new Table();
table.push(
  ["URL", "Original Size", "Reduced Size", "Savings"],
  ...results.map((result) => {
    const savings = result.originalSize - result.reducedSize;
    const savingsPercent = (savings / result.originalSize) * 100;
    return [
      result.url,
      `${result.originalSize} B (${(result.originalSize / 1024).toFixed(
        2
      )} KB)`,
      `${result.reducedSize} B (${(result.reducedSize / 1024).toFixed(2)} KB)`,
      `${savingsPercent.toFixed(2)}% (${savings} B)`,
    ];
  })
);
console.log(table.toString());

console.log(results[1].reducedHtml);
