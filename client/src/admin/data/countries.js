// Standard ISO 3166-1 alpha-2 countries with flags
export const WORLD_COUNTRIES = [
  { code: "US", name: "United States", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "FR", name: "France", flag: "🇫🇷" },
  { code: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "AE", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "IN", name: "India", flag: "🇮🇳" },
  { code: "MC", name: "Monaco", flag: "🇲🇨" },
  { code: "CA", name: "Canada", flag: "🇨🇦" },
  { code: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "OM", name: "Oman", flag: "🇴🇲" }
];

export function getCountryByCode(code) {
  if (!code) return null;
  const upper = String(code).trim().toUpperCase();
  return WORLD_COUNTRIES.find((c) => c.code === upper) || null;
}

export function getFlagEmoji(code) {
  const country = getCountryByCode(code);
  if (country?.flag) return country.flag;
  if (!code || code.length !== 2) return "🌐";
  // Generate emoji flag from 2-letter ISO code
  const codePoints = [...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
