import { countryCodes } from "../data/catalog.js";

export function getLevel(xp = 0) {
  if (xp >= 250) return "Arena Veteran";
  if (xp >= 100) return "Policy Builder";
  if (xp >= 50) return "Calm Rebutter";
  return "Newcomer";
}

export function getCountries() {
  const display = typeof Intl !== "undefined" && Intl.DisplayNames ? new Intl.DisplayNames(["en"], { type: "region" }) : null;

  return countryCodes
    .map((code) => ({
      code,
      name: display?.of(code) || code,
      flag: code.replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0))),
    }))
    .filter((country) => country.name && country.name !== country.code)
    .sort((a, b) => a.name.localeCompare(b.name));
}
