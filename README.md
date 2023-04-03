# Semantic HTML reduction

This repository is an experiment in reducing the size of HTML not by conventional compression, but by removing attributes and data that do not semantically contribute to the document. This is helpful for feeding into an AI model that is scraping the document for information.

## How to use

This project uses Deno. To run it, you need to install Deno. Once you have installed Deno, you can run it with:

```bash
deno run --allow-net index.ts
```

## Results

These are the current results of reducing some popular websites, as of April 2, 2022. This is with all options enabled.

| URL                             | Original Size        | Reduced Size         | Savings           |
| ------------------------------- | -------------------- | -------------------- | ----------------- |
| <https://www.wikipedia.org/>    | 73477 B (71.75 KB)   | 37045 B (36.18 KB)   | 49.58% (36432 B)  |
| <https://www.youtube.com/>      | 713967 B (697.23 KB) | 429758 B (419.69 KB) | 39.81% (284209 B) |
| <https://www.bbc.com/>          | 234878 B (229.37 KB) | 93548 B (91.36 KB)   | 60.17% (141330 B) |
| <https://www.reddit.com/>       | 940151 B (918.12 KB) | 292545 B (285.69 KB) | 68.88% (647606 B) |
| <https://www.nytimes.com/>      | 779894 B (761.62 KB) | 554424 B (541.43 KB) | 28.91% (225470 B) |
| <https://news.ycombinator.com/> | 35925 B (35.08 KB)   | 24947 B (24.36 KB)   | 30.56% (10978 B)  |
