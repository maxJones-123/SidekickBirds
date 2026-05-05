/**
 * UK Medication Database
 * ──────────────────────────────────────────────────────────────────────────────
 * Edit the CSV rows below — one medication per line.
 * Columns: EAN barcode, Name, Dose, Form
 *
 * Tips:
 *  • EAN-13 barcodes are the 13-digit numbers on the outer packaging.
 *  • You can find EAN codes by scanning the box in any barcode reader app.
 *  • Dose and Form are optional — leave them blank if unknown.
 *  • Lines starting with # are ignored.
 *  • Call printMedicationDatabase() in a useEffect to see all loaded entries.
 *
 * Format:
 *   EAN,Name,Dose,Form
 */

const CSV = `
EAN,Name,Dose,Form
# ── Paracetamol ──────────────────────────────────────────────────────────────
5000158070553,Paracetamol,500mg,Tablet
5000158122536,Paracetamol,500mg,Tablet
5000158124899,Paracetamol,1000mg,Tablet
5000158174313,Paracetamol,500mg,Capsule
# ── Ibuprofen ─────────────────────────────────────────────────────────────────
5000158074919,Ibuprofen,200mg,Tablet
5000158075084,Ibuprofen,400mg,Tablet
5000158170353,Ibuprofen,400mg,Tablet
5000158121836,Ibuprofen,200mg,Tablet
# ── Aspirin ───────────────────────────────────────────────────────────────────
5000158070584,Aspirin,75mg,Tablet
5000158014168,Aspirin,300mg,Tablet
# ── Antihistamines ───────────────────────────────────────────────────────────
5000158060516,Cetirizine,10mg,Tablet
5000158032773,Loratadine,10mg,Tablet
5000158124448,Chlorphenamine,4mg,Tablet
# ── Omeprazole / Antacids ─────────────────────────────────────────────────────
5000158147287,Omeprazole,20mg,Capsule
5000158147294,Omeprazole,10mg,Capsule
5000158079877,Gaviscon,,Liquid
# ── Codeine ───────────────────────────────────────────────────────────────────
5000158070591,Co-codamol,8/500mg,Tablet
# ── Vitamins & Supplements ───────────────────────────────────────────────────
5000436000124,Vitamin D,10mcg,Tablet
5000436000131,Vitamin D,25mcg,Tablet
5021265248957,Vitamin B12,1000mcg,Tablet
5000436001213,Folic Acid,400mcg,Tablet
5000436000247,Iron,14mg,Tablet
# ── Children's Medicines ─────────────────────────────────────────────────────
3574661148076,Calpol,120mg/5ml,Suspension
# ── Add your medications below ───────────────────────────────────────────────

`;

// ── EAN-13 validation ─────────────────────────────────────────────────────────

/**
 * Validates an EAN-13 barcode using the standard GS1 checksum algorithm.
 * Returns true if the code is exactly 13 digits and the check digit is correct.
 */
export function isValidEAN13(code: string): boolean {
  if (!/^\d{13}$/.test(code)) return false;

  const digits = code.split('').map(Number);
  const checkDigit = digits[12];

  // Alternate multiply by 1 and 3 for first 12 digits
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  const expected = (10 - (sum % 10)) % 10;
  return expected === checkDigit;
}

// ── Parse once at module load ─────────────────────────────────────────────────

export interface MedEntry {
  name: string;
  dose: string;
  form: string;
  ean: string;
  valid: boolean;
}

function buildDatabase(csv: string): Map<string, MedEntry> {
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

export const MEDICATION_DB = buildDatabase(CSV);

// ── Public API ────────────────────────────────────────────────────────────────

/** Look up a scanned barcode. Returns null if not in the local database. */
export function lookupLocal(barcode: string): MedEntry | null {
  return MEDICATION_DB.get(barcode.trim()) ?? null;
}

/**
 * Prints the full medication database to the console.
 * Call this from a useEffect during development to verify your entries.
 *
 * Example:
 *   useEffect(() => { printMedicationDatabase(); }, []);
 */
export function printMedicationDatabase(): void {
  const entries = [...MEDICATION_DB.values()];
  const valid   = entries.filter(e => e.valid);
  const invalid = entries.filter(e => !e.valid);

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║           MEDICATION DATABASE                        ║');
  console.log(`║  ${entries.length} entries  •  ${valid.length} valid  •  ${invalid.length} invalid EAN-13       ║`);
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  if (invalid.length > 0) {
    console.log('⚠️  INVALID EAN-13 CODES (checksum failed or wrong length):');
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
