import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { Node } from "https://deno.land/x/deno_dom@v0.1.37/src/dom/node.ts";
import { Table } from "https://deno.land/x/cliffy/table/mod.ts";

function removeNode(node: Node) {
  if (node.parentNode) {
    node.parentNode.removeChild(node);
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
    removeNonSemanticSvgTags?: boolean;
    reparseJson?: boolean;
    removeNestedDivs?: boolean;
  } = {}
): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  if (!doc) {
    throw new Error("Could not parse HTML");
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

  let newHtml = doc.body.outerHTML;

  // remove doctype
  newHtml = newHtml.replace(/<!DOCTYPE[^>]*>/i, "");

  // remove extra whitespace
  if (options.trimWhitespace) {
    newHtml = newHtml.replace(/\s{2,}/g, " ");
  }

  // replace HTML entities within script tags
  newHtml = newHtml.replace(
    /<script[^>]*>([^<]+)<\/script>/g,
    (match, p1) =>
      `<script>${p1
        .replace(/&#x22;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&quot;/g, '"')}</script>`
  );

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
  "https://www.google.com/",
  "https://www.youtube.com/",
  "https://www.amazon.com/",
  "https://www.bbc.com/",
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
    reparseJson: true,
    removeNestedDivs: true,
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
      `${result.originalSize} B (${result.originalSize / 1024} KB)`,
      `${result.reducedSize} B (${result.reducedSize / 1024} KB)`,
      `${savingsPercent.toFixed(2)}% (${savings} B)`,
    ];
  })
);
console.log(table.toString());
