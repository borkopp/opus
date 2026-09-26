import type { ActivationRequirement } from "@/convex/lib/activation";

const actions: Record<string, [string, string]> = {
  business_identity: ["Add studio details", "Внесете податоци за студиото"],
  location: ["Confirm your address", "Потврдете ја адресата"],
  provider: ["Activate your provider", "Активирајте член на тимот"],
  service: ["Add your first service", "Додајте ја првата услуга"],
  availability: ["Set your working hours", "Поставете работно време"],
  booking_settings: [
    "Check booking settings",
    "Проверете ги поставките за закажување",
  ],
};
export function nextWebsiteAction(requirements: ActivationRequirement[]) {
  const missing = requirements.find((item) => !item.complete);
  return missing
    ? {
        href: missing.actionHref,
        label: actions[missing.code] ?? [missing.label, missing.label],
      }
    : {
        href: "/onboarding?step=review",
        label: ["Preview and publish", "Прегледајте и објавете"],
      };
}
