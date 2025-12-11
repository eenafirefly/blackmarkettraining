/**
 * ISO to SACC Country Code Mapping
 * SACC = Standard Australian Classification of Countries
 * Used by Axcelerate for VET compliance
 */

const ISO_TO_SACC_MAP = {
  'AF': '7201', // Afghanistan
  'AL': '3201', // Albania  
  'DZ': '4101', // Algeria
  'AR': '8201', // Argentina
  'AU': '1101', // Australia
  'AT': '2301', // Austria
  'BD': '7101', // Bangladesh
  'BE': '2302', // Belgium
  'BR': '8203', // Brazil
  'BG': '3203', // Bulgaria
  'CA': '8102', // Canada
  'CL': '8204', // Chile
  'CN': '6101', // China
  'CO': '8205', // Colombia
  'HR': '3204', // Croatia
  'CY': '3205', // Cyprus
  'CZ': '3302', // Czech Republic
  'DK': '2401', // Denmark
  'EG': '4102', // Egypt
  'EE': '3303', // Estonia
  'FJ': '1502', // Fiji
  'FI': '2403', // Finland
  'FR': '2303', // France
  'DE': '2304', // Germany
  'GR': '3207', // Greece
  'HK': '6102', // Hong Kong (SAR of China)
  'HU': '3304', // Hungary
  'IS': '2405', // Iceland
  'IN': '7103', // India
  'ID': '5202', // Indonesia
  'IR': '4203', // Iran
  'IQ': '4204', // Iraq
  'IE': '2201', // Ireland
  'IL': '4205', // Israel
  'IT': '3104', // Italy
  'JP': '6201', // Japan
  'JO': '4206', // Jordan
  'KE': '9208', // Kenya
  'KR': '6203', // Korea, South
  'LB': '4208', // Lebanon
  'MY': '5203', // Malaysia
  'MX': '8306', // Mexico
  'NP': '7105', // Nepal
  'NL': '2308', // Netherlands
  'NZ': '1201', // New Zealand
  'NG': '9124', // Nigeria
  'NO': '2406', // Norway
  'PK': '7106', // Pakistan
  'PH': '5204', // Philippines
  'PL': '3307', // Poland
  'PT': '3106', // Portugal
  'RO': '3211', // Romania
  'RU': '3308', // Russian Federation
  'SA': '4213', // Saudi Arabia
  'SG': '5205', // Singapore
  'ZA': '9225', // South Africa
  'ES': '3108', // Spain
  'LK': '7107', // Sri Lanka
  'SE': '2407', // Sweden
  'CH': '2311', // Switzerland
  'SY': '4214', // Syria
  'TW': '6105', // Taiwan
  'TH': '5104', // Thailand
  'TR': '4215', // Turkey
  'UA': '3312', // Ukraine
  'AE': '4216', // United Arab Emirates
  'GB': '2101', // United Kingdom (note: this may need special handling for England/Scotland/Wales/Northern Ireland)
  'US': '8104', // United States of America
  'VN': '6302'  // Vietnam
};

/**
 * Convert ISO Alpha-2 country code to SACC code
 * @param {string} isoCode - 2-letter ISO country code (e.g., 'AU', 'US')
 * @returns {string} 4-digit SACC code or the original value if not found
 */
function convertISOtoSACC(isoCode) {
  if (!isoCode) return isoCode;
  
  // If it's already a 4-digit code, return as-is
  if (/^\d{4}$/.test(isoCode)) {
    return isoCode;
  }
  
  // If it's a 2-letter code, convert to SACC
  if (isoCode.length === 2) {
    const saccCode = ISO_TO_SACC_MAP[isoCode.toUpperCase()];
    if (saccCode) {
      console.log(`🗺️  Converted country code: ${isoCode} → ${saccCode}`);
      return saccCode;
    } else {
      console.warn(`⚠️  No SACC mapping found for ISO code: ${isoCode}`);
      return isoCode;
    }
  }
  
  // Otherwise return as-is
  return isoCode;
}

/**
 * Convert SACC code back to ISO (for display purposes)
 * @param {string} saccCode - 4-digit SACC code
 * @returns {string} 2-letter ISO code or the original value if not found
 */
function convertSACCtoISO(saccCode) {
  if (!saccCode) return saccCode;
  
  // Find the ISO code for this SACC code
  for (const [iso, sacc] of Object.entries(ISO_TO_SACC_MAP)) {
    if (sacc === saccCode) {
      return iso;
    }
  }
  
  return saccCode;
}

/**
 * Country name to SACC code mapping (for reverse lookup)
 */
const NAME_TO_SACC_MAP = {
  'Afghanistan': '7201',
  'Albania': '3201',
  'Algeria': '4101',
  'Argentina': '8201',
  'Australia': '1101',
  'Austria': '2301',
  'Bangladesh': '7101',
  'Belgium': '2302',
  'Brazil': '8203',
  'Bulgaria': '3203',
  'Canada': '8102',
  'Chile': '8204',
  'China': '6101',
  'Colombia': '8205',
  'Croatia': '3204',
  'Cyprus': '3205',
  'Czech Republic': '3302',
  'Denmark': '2401',
  'Egypt': '4102',
  'Estonia': '3303',
  'Fiji': '1502',
  'Finland': '2403',
  'France': '2303',
  'Germany': '2304',
  'Greece': '3207',
  'Hong Kong': '6102',
  'Hungary': '3304',
  'Iceland': '2405',
  'India': '7103',
  'Indonesia': '5202',
  'Iran': '4203',
  'Iraq': '4204',
  'Ireland': '2201',
  'Israel': '4205',
  'Italy': '3104',
  'Japan': '6201',
  'Jordan': '4206',
  'Kenya': '9208',
  'Korea, South': '6203',
  'Lebanon': '4208',
  'Malaysia': '5203',
  'Mexico': '8306',
  'Nepal': '7105',
  'Netherlands': '2308',
  'New Zealand': '1201',
  'Nigeria': '9124',
  'Norway': '2406',
  'Pakistan': '7106',
  'Philippines': '5204',
  'Poland': '3307',
  'Portugal': '3106',
  'Romania': '3211',
  'Russia': '3308',
  'Russian Federation': '3308',
  'Saudi Arabia': '4213',
  'Singapore': '5205',
  'South Africa': '9225',
  'Spain': '3108',
  'Sri Lanka': '7107',
  'Sweden': '2407',
  'Switzerland': '2311',
  'Syria': '4214',
  'Taiwan': '6105',
  'Thailand': '5104',
  'Turkey': '4215',
  'Ukraine': '3312',
  'United Arab Emirates': '4216',
  'United Kingdom': '2101',
  'England': '2102',
  'Scotland': '2105',
  'Wales': '2106',
  'Northern Ireland': '2104',
  'United States': '8104',
  'USA': '8104',
  'United States of America': '8104',
  'Vietnam': '6302'
};

/**
 * Convert country name to SACC code
 * @param {string} countryName - Full country name
 * @returns {string} 4-digit SACC code or the original value if not found
 */
function convertNametoSACC(countryName) {
  if (!countryName) return countryName;
  
  // If it's already a 4-digit code, return as-is
  if (/^\d{4}$/.test(countryName)) {
    return countryName;
  }
  
  // Look up the SACC code for this country name
  const saccCode = NAME_TO_SACC_MAP[countryName];
  if (saccCode) {
    console.log(`🗺️  Converted country name to SACC: ${countryName} → ${saccCode}`);
    return saccCode;
  }
  
  console.warn(`⚠️  No SACC mapping found for country name: ${countryName}`);
  return countryName;
}

export {
  ISO_TO_SACC_MAP,
  NAME_TO_SACC_MAP,
  convertISOtoSACC,
  convertSACCtoISO,
  convertNametoSACC
};

