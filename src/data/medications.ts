/**
 * UK Medication Database
 * ──────────────────────────────────────────────────────────────────────────────
 * Edit medications in:  assets/medications.csv
 *
 * CSV format:  EAN,Name,Dose,Form
 * Rules:
 *  • EAN must be a valid 13-digit EAN-13 barcode
 *  • Lines starting with # are comments and are ignored
 *  • Dose and Form are optional — leave blank if unknown
 */

import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MedEntry {
  ean: string;
  name: string;
  dose: string;
  form: string;
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

function parseCSV(csv: string): Map<string, MedEntry> {
  const map = new Map<string, MedEntry>();
  let lineNumber = 0;

  for (const rawLine of csv.split('\n')) {
    lineNumber++;
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.toUpperCase().startsWith('EAN')) continue;

    const parts = line.split(',');
    if (parts.length < 2) continue;

    const ean  = parts[0].trim();
    const name = parts[1]?.trim() ?? '';
    const dose = parts[2]?.trim() ?? '';
    const form = parts[3]?.trim() ?? '';

    if (!ean || !name) continue;

    const valid = isValidEAN13(ean);
    if (!valid) {
      console.warn(
        `[MedicationDB] ⚠️  Invalid EAN-13 on line ${lineNumber}: "${ean}" (${name})` +
        (ean.length !== 13 ? ` — expected 13 digits, got ${ean.length}` : ' — checksum mismatch')
      );
    }

    map.set(ean, { ean, name, dose, form, valid });
  }

  return map;
}

// ── Database state ────────────────────────────────────────────────────────────

let db = new Map<string, MedEntry>();
let loaded = false;

/**
 * Loads assets/medications.csv into memory.
 * Call once at app startup (e.g. in App.tsx useEffect).
 * Safe to call multiple times — only loads once.
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
    // Most common cause: Metro cache not cleared after adding metro.config.js.
    // Fix: stop the server and run  npx expo start --clear
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

/**
 * Prints the full database to the console.
 * Useful during development to verify your EAN entries.
 */
export function printMedicationDatabase(): void {
  if (!loaded) {
    console.warn('[MedicationDB] Database not loaded yet — call loadMedicationDatabase() first.');
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
      console.log(`   ✕  ${e.ean.padEnd(14)}  ${e.name}${e.dose ? ' ' + e.dose : ''}${e.form ? ' ' + e.form : ''}`);
    }
    console.log('');
  }

  console.log('✅ VALID ENTRIES:');
  for (const e of valid) {
    const label = [e.name, e.dose, e.form].filter(Boolean).join(' ');
    console.log(`   ${e.ean}  ${label}`);
  }
  console.log('');
}
