import type { ActivationRequirement } from "@/convex/lib/activation";

const actions: Record<string, [string, string, string]> = {
  business_identity: [
    "Add studio details",
    "Внесете податоци за студиото",
    "Shtoni të dhënat e studios",
  ],
  location: [
    "Confirm your address",
    "Потврдете ја адресата",
    "Konfirmoni adresën tuaj",
  ],
  provider: [
    "Enter your name",
    "Внесете го вашето име",
    "Shkruani emrin tuaj",
  ],
  service: [
    "Add your first service",
    "Додајте ја првата услуга",
    "Shtoni shërbimin tuaj të parë",
  ],
  availability: [
    "Set your working hours",
    "Поставете работно време",
    "Vendosni orarin tuaj të punës",
  ],
  booking_settings: [
    "Check booking settings",
    "Проверете ги поставките за закажување",
    "Kontrolloni cilësimet e rezervimit",
  ],
};
export function nextWebsiteAction(requirements: ActivationRequirement[]) {
  const missing = requirements.find((item) => !item.complete);
  return missing
    ? {
        href: missing.actionHref,
        label: actions[missing.code] ?? [
          missing.label,
          missing.label,
          missing.label,
        ],
      }
    : {
        href: "/onboarding?step=review",
        label: [
          "Preview and publish",
          "Прегледајте и објавете",
          "Shikoni parapamjen dhe publikoni",
        ],
      };
}
