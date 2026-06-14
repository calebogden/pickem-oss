#!/usr/bin/env node

import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/\/$/, "");
const DIST = join(ROOT, "dist");

const STRIP_PATTERNS = [".DS_Store", "Thumbs.db"];
const STRIP_SUFFIXES = [".test.js", ".spec.js", ".test.d.ts", ".spec.d.ts"];

function log(msg) {
  console.log(`  ${msg}`);
}

function heading(msg) {
  console.log(`\n▸ ${msg}`);
}

/** Recursively walk a directory, yielding file paths */
function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else {
      yield full;
    }
  }
}

/** Wipe and recreate dist/ */
function clean() {
  heading("Cleaning dist/");
  if (existsSync(DIST)) {
    rmSync(DIST, { recursive: true, force: true });
  }
  mkdirSync(DIST, { recursive: true });
  log("done");
}

/** Run tsc to compile TypeScript */
function compile() {
  heading("Compiling TypeScript");
  execSync("npx tsc", { cwd: ROOT, stdio: "inherit" });
  log("done");
}

/** Copy README.md, LICENSE, CHANGELOG.md into dist/ */
function copyAssets() {
  heading("Copying assets");
  for (const file of ["README.md", "LICENSE", "CHANGELOG.md"]) {
    const src = join(ROOT, file);
    if (existsSync(src)) {
      cpSync(src, join(DIST, file));
      log(`copied ${file}`);
    } else {
      console.warn(`  ⚠ ${file} not found, skipping`);
    }
  }
}

/** Write a clean package.json into dist/ */
function writePackageJson() {
  heading("Writing dist/package.json");
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

  const distPkg = {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    type: pkg.type,
    main: "./index.js",
    types: "./index.d.ts",
    exports: {
      ".": {
        // `types` must come first — export conditions are order-sensitive.
        types: "./index.d.ts",
        import: "./index.js",
      },
    },
    sideEffects: false,
    keywords: pkg.keywords,
    // The published package points at the PUBLIC code repo (pickem-oss) so npm
    // renders live Repository/Issues/Homepage links and provenance can verify
    // the source. These must resolve to a public repo — never a private one.
    repository: pkg.repository,
    bugs: pkg.bugs,
    homepage: pkg.homepage,
    author: pkg.author,
    license: pkg.license,
    engines: pkg.engines,
    publishConfig: pkg.publishConfig,
    dependencies: pkg.dependencies,
  };

  writeFileSync(join(DIST, "package.json"), JSON.stringify(distPkg, null, 2) + "\n");
  log("done");
}

/** Remove OS artifacts and test files from dist/ */
function stripUnwanted() {
  heading("Stripping unwanted files");
  let removed = 0;
  for (const file of walk(DIST)) {
    const name = file.split("/").pop();
    const shouldStrip =
      STRIP_PATTERNS.includes(name) ||
      STRIP_SUFFIXES.some((s) => name.endsWith(s));
    if (shouldStrip) {
      rmSync(file);
      log(`removed ${relative(DIST, file)}`);
      removed++;
    }
  }
  if (removed === 0) log("nothing to strip");
}

/** Print manifest with file sizes */
function printManifest() {
  heading("Manifest");
  const files = [...walk(DIST)].sort();
  let total = 0;
  for (const file of files) {
    const size = statSync(file).size;
    total += size;
    const sizeStr = size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
    log(`${relative(DIST, file).padEnd(40)} ${sizeStr.padStart(10)}`);
  }
  const totalStr = total < 1024 ? `${total} B` : `${(total / 1024).toFixed(1)} KB`;
  console.log(`\n  Total: ${files.length} files, ${totalStr}`);
}

// --- Main ---
try {
  console.log("pickem build");
  clean();
  compile();
  copyAssets();
  writePackageJson();
  stripUnwanted();
  printManifest();
  console.log("\n✓ Build complete\n");
} catch (err) {
  console.error(`\n✗ Build failed: ${err.message}\n`);
  process.exit(1);
}
