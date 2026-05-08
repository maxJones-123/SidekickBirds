/**
 * UK Medication Database
 * ──────────────────────────────────────────────────────────────────────────────
 * Edit medications in:  assets/medications.csv
 *
 * CSV format (columns in this order):
 *   Medication Name, Dosage, Form, EAN-13 Barcode, Common Use, Funny Bird Name
 *
 * Rules:
 *  • EAN must be a valid 13-digit EAN-13 barcode
 *  • Wrap fields containing commas in double quotes
 *  • Lines starting with # are ignored
 *  • The header row (Medication Name,...) is ignored automatically
 */

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MedEntry {
  ean: string;
  name: string;
  dose: string;
  form: string;
  commonUse: string;
  funnyBirdName: string;
  valid: boolean;
}

// ── EAN-13 validation ─────────────────────────────────────────────────────────

export function isValidEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;
  const digits = code.split('').map(Number);
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10 === digits[12];
}

// ── CSV parser ────────────────────────────────────────────────────────────────

/** Splits a single CSV line respecting double-quoted fields. */
function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Normalise non-breaking hyphens (U+2011) and similar to a plain hyphen. */
function normalise(s: string): string {
  return s.replace(/[‑‒–—]/g, '-').trim();
}

function parseCSV(csv: string): Map<string, MedEntry> {
  const map = new Map<string, MedEntry>();
  let lineNumber = 0;

  for (const rawLine of csv.split('\n')) {
    lineNumber++;
    const line = rawLine.trim();

    // Skip blank lines, comments, and the header row
    if (!line || line.startsWith('#')) continue;
    const lower = line.toLowerCase();
    if (lower.startsWith('medication name') || lower.startsWith('ean')) continue;

    const parts = splitCSVLine(line);

    // Expected columns: Name, Dosage, Form, EAN, Common Use, Funny Bird Name
    const name          = normalise(parts[0] ?? '');
    const dose          = normalise(parts[1] ?? '');
    const form          = normalise(parts[2] ?? '');
    const ean           = normalise(parts[3] ?? '').replace(/\s/g, '');
    const commonUse     = normalise(parts[4] ?? '');
    const funnyBirdName = normalise(parts[5] ?? '');

    if (!ean || !name) continue;

    const valid = isValidEAN13(ean);
    if (!valid) {
      console.warn(
        `[MedicationDB] ⚠️  Invalid EAN-13 on line ${lineNumber}: "${ean}" (${name})` +
        (ean.length !== 13 ? ` — expected 13 digits, got ${ean.length}` : ' — checksum mismatch')
      );
    }

    map.set(ean, { ean, name, dose, form, commonUse, funnyBirdName, valid });
  }

  return map;
}

// ── Database state ────────────────────────────────────────────────────────────

let db = new Map<string, MedEntry>();
let loaded = false;

/**
 * Loads assets/medications.csv into memory.
 * Call once at app startup (already wired up in App.tsx).
 */
export async function loadMedicationDatabase(): Promise<void> {
  if (loaded) return;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const asset = Asset.fromModule(require('../../assets/medications.csv'));
    await asset.downloadAsync();

    const uri = asset.localUri;
    if (!uri) throw new Error('Could not resolve local URI for medications.csv');

    const csv = await FileSystem.readAsStringAsync(uri);
    db = parseCSV(csv);
    loaded = true;

    const valid   = [...db.values()].filter(e => e.valid).length;
    const invalid = db.size - valid;
    console.log(`[MedicationDB] Loaded ${db.size} entries (${valid} valid, ${invalid} invalid EAN-13)`);
  } catch (err) {
    console.error(
      '[MedicationDB] Failed to load medications.csv.\n' +
      'If this is the first run after setup, restart Metro with:\n' +
      '  npx expo start --clear\n',
      err
    );
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Look up a scanned barcode. Returns null if not found or DB not yet loaded. */
export function lookupLocal(barcode: string): MedEntry | null {
  return db.get(barcode.trim()) ?? null;
}

/** Print the full database to the console (development use). */
export function printMedicationDatabase(): void {
  if (!loaded) {
    console.warn('[MedicationDB] Not loaded yet — call loadMedicationDatabase() first.');
    return;
  }

  const entries = [...db.values()];
  const valid   = entries.filter(e => e.valid);
  const invalid = entries.filter(e => !e.valid);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║           MEDICATION DATABASE                        ║');
  console.log(`║  ${entries.length} entries  •  ${valid.length} valid  •  ${invalid.length} invalid EAN-13       ║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  if (invalid.length > 0) {
    console.log('⚠️  INVALID EAN-13 CODES:');
    for (const e of invalid) {
      console.log(`   ✕  ${e.ean.padEnd(14)}  ${e.name}${e.dose ? ' ' + e.dose : ''}`);
    }
    console.log('');
  }

  console.log('✅ VALID ENTRIES:');
  for (const e of valid) {
    const label = [e.name, e.dose, e.form].filter(Boolean).join(' ');
    console.log(`   ${e.ean}  ${label}${e.funnyBirdName ? '  🐦 ' + e.funnyBirdName : ''}`);
  }
  console.log('');
}
