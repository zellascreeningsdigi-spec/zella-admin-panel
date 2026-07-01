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
