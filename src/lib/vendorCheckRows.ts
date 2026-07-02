// Fixed "Address Check" rows a vendor verifies, matching the company report
// format. Kept in sync with backend utils/vendorCheckRows.js.
export interface VendorCheck {
  key: string;
  label: string;
  profileValue: string;
  entityStatus: 'verified' | 'disputed' | 'na';
  disputeReason: string;
}

export const VENDOR_CHECK_ROWS: { key: string; label: string }[] = [
  { key: 'candidate_address', label: 'Candidate Address' },
  { key: 'father_name', label: 'Father Name' },
  { key: 'type_of_residence', label: 'Type of Residence' },
  { key: 'period_of_stay', label: 'Period of Stay' },
  { key: 'landmark', label: 'Landmark' },
  { key: 'police_station', label: 'Police Station' },
  { key: 'date_of_verification', label: 'Date of Verification' },
];

// This row is auto-filled (today's date), read-only, and has no verify/dispute
// action — it records WHEN the verification happened, not a fact to verify.
export const AUTO_DATE_ROW_KEY = 'date_of_verification';

// Today's date as a display string (e.g. "02-Jul-2026").
export const todayDisplay = (): string =>
  new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// Build initial checks from a case, prefilling the "Profile Provided" column.
export function buildVendorChecks(verification: any): VendorCheck[] {
  const vd = verification?.verificationData || {};
  const profileFor = (key: string): string => {
    switch (key) {
      case 'candidate_address':
        return verification?.address || '';
      case 'father_name':
        return verification?.fathersName || '';
      case 'type_of_residence':
        return vd.residentialStatus || '';
      case 'period_of_stay':
        return vd.periodOfStay || '';
      case 'landmark':
        return verification?.landmark || vd.landmark || '';
      case 'date_of_verification':
        return todayDisplay();
      default:
        return '';
    }
  };
  return VENDOR_CHECK_ROWS.map((row) => ({
    key: row.key,
    label: row.label,
    profileValue: profileFor(row.key),
    entityStatus: 'na',
    disputeReason: '',
  }));
}
