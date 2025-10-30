#!/usr/bin/env node

/**
 * CLI utility to replace GitHub profile URLs with repo URLs in an Excel/CSV roster.
 * Usage: node fill-github-repo-urls.js --in input.xlsx [--out output.xlsx] [--keywords "fsd,fullstack"] [--sheet Sheet1] [--repocol RepoURL] [--dry]
 */

const fs = require('fs');
const path = require('path');
const minimist = require('minimist');
const axios = require('axios');
const XLSX = require('xlsx');

const profileRegex = /^https?:\/\/github\.com\/([^\/\s]+)\/?$/i;
const repoRegex = /^https?:\/\/github\.com\/([^\/\s]+)\/([^\/\s]+)(?:\/|\.git)?$/i;

const DEFAULT_KEYWORDS = [
  'fsd',
  'fullstack',
  'full-stack',
  'full stack',
  'fsd-lab',
  'fsd-assignment',
  'fsd project',
  'csb',
  'cs-b',
  'cs b',
];

const args = minimist(process.argv.slice(2), {
  boolean: ['dry'],
  string: ['in', 'out', 'keywords', 'sheet', 'repocol'],
});

if (!args.in) {
  console.error('Error: --in <input.xlsx|csv> is required.');
  process.exit(1);
}

const inputPath = path.resolve(args.in);
if (!fs.existsSync(inputPath)) {
  console.error(`Error: Input file not found at ${inputPath}`);
  process.exit(1);
}

const outputPath = args.dry
  ? null
  : path.resolve(
      args.out ||
        (() => {
          const { dir, name } = path.parse(inputPath);
          return path.join(dir, `${name}_filled.xlsx`);
        })(),
    );

const keywords = (args.keywords ? args.keywords.split(',') : DEFAULT_KEYWORDS)
  .map((kw) => kw.trim().toLowerCase())
  .filter(Boolean);

const sheetNameOverride = args.sheet ? String(args.sheet) : null;
const repoColName = args.repocol ? String(args.repocol) : 'RepoURL';
const dryRun = Boolean(args.dry);

const axiosClient = axios.create({
  baseURL: 'https://api.github.com',
  timeout: Number(process.env.GITHUB_TIMEOUT_MS) || 20000,
  headers: process.env.GITHUB_TOKEN
    ? {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        'User-Agent': 'github-profile-repo-filler',
      }
    : { 'User-Agent': 'github-profile-repo-filler' },
});

const repoCache = new Map();

async function fetchReposForUser(username) {
  if (repoCache.has(username)) {
    return repoCache.get(username);
  }

  try {
    const response = await axiosClient.get(`/users/${username}/repos`, {
      params: {
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
      },
    });

    const repos = Array.isArray(response.data) ? response.data : [];
    repoCache.set(username, repos);
    return repos;
  } catch (error) {
    if (error.response) {
      console.warn(
        `GitHub API error for user ${username}: ${error.response.status} ${error.response.statusText}`,
      );
    } else {
      console.warn(`GitHub API error for user ${username}: ${error.message}`);
    }
    repoCache.set(username, []);
    return [];
  }
}

function matchRepoByKeywords(repos, keywordsList) {
  for (const repo of repos) {
    const haystacks = [repo.name || '', repo.description || ''].map((value) =>
      value.toLowerCase(),
    );

    for (const keyword of keywordsList) {
      if (keyword && haystacks.some((text) => text.includes(keyword))) {
        return repo;
      }
    }
  }
  return null;
}

function normaliseHeaderName(header) {
  return String(header || '').trim().toLowerCase();
}

function decodeSheet({ workbook, targetSheet }) {
  const sheetName = targetSheet || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet not found: ${sheetName}`);
  }

  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rows.length) {
    throw new Error('Sheet is empty.');
  }

  return { rows, sheetName };
}

(async () => {
  console.log(`Loading spreadsheet: ${inputPath}`);
  const workbook = XLSX.readFile(inputPath, { cellDates: true });

  let rows;
  let sheetName;
  try {
    const decoded = decodeSheet({ workbook, targetSheet: sheetNameOverride });
    rows = decoded.rows;
    sheetName = decoded.sheetName;
  } catch (error) {
    console.error(`Error reading sheet: ${error.message}`);
    process.exit(1);
  }

  const headerRow = rows[0];
  const repoColIndex = headerRow.findIndex(
    (header) => normaliseHeaderName(header) === normaliseHeaderName(repoColName),
  );

  if (repoColIndex === -1) {
    console.error(
      `Error: Column "${repoColName}" not found in sheet "${sheetName}". Available columns: ${headerRow.join(
        ', ',
      )}`,
    );
    process.exit(1);
  }

  let processed = 0;
  let updated = 0;

  for (let i = 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;

    const originalValue = String(row[repoColIndex] || '').trim();
    if (!originalValue) continue;

    if (repoRegex.test(originalValue)) {
      continue;
    }

    const profileMatch = originalValue.match(profileRegex);
    if (!profileMatch) {
      continue;
    }

    const username = profileMatch[1];
    processed += 1;

    const repos = await fetchReposForUser(username);
    const matchedRepo = matchRepoByKeywords(repos, keywords);

    if (matchedRepo) {
      const fullUrl = `https://github.com/${matchedRepo.full_name}`;
      console.log(`Row ${i + 1}: ${originalValue} -> ${fullUrl}`);
      if (!dryRun) {
        row[repoColIndex] = fullUrl;
      }
      updated += 1;
    } else {
      console.log(`Row ${i + 1}: No matching repo found for ${originalValue}`);
    }
  }

  console.log(`Processed profile URLs: ${processed}`);
  console.log(`Updated cells: ${updated}`);

  if (dryRun) {
    console.log('Dry run enabled. No file written.');
    return;
  }

  const newWorksheet = XLSX.utils.aoa_to_sheet(rows);
  const newWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, sheetName);

  XLSX.writeFile(newWorkbook, outputPath);
  console.log(`Wrote updated workbook to ${outputPath}`);
})();
