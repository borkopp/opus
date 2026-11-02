import type {
  MobileSubscriptionAccessState,
  TeamCapacity,
} from "../../../shared/mobile";
import type { Language } from "./theme";

export function subscriptionLabel(
  accessState: MobileSubscriptionAccessState | undefined,
  effectivePlan: "free" | "paid",
  language: Language,
) {
  // Older backends do not yet return the additive access-state field.
  const state =
    accessState ?? (effectivePlan === "paid" ? "paid" : "legacy_free");
  const labels = {
    legacy_free: language === "mk" ? "Бесплатен план" : "Free plan",
    trial: language === "mk" ? "Пробен период" : "Trial",
    expired: language === "mk" ? "Пробниот период заврши" : "Trial ended",
    paid: "OPUS Pro",
  };
  return labels[state];
}

export function teamCapacityMessage(
  capacity: TeamCapacity,
  language: Language,
) {
  const state =
    capacity.accessState ?? (capacity.isFree ? "legacy_free" : "paid");
  if (state === "expired")
    return language === "mk"
      ? "Пробниот период заврши. Можеш да ги уредуваш постоечките членови, но не можеш да додаваш активни членови."
      : "Your trial has ended. You can edit existing team members, but cannot add active members.";
  if (state === "legacy_free")
    return language === "mk"
      ? `Бесплатниот план вклучува ${capacity.ownerLimit} сопственик и ${capacity.staffLimit} вработени. Менаџерите зафаќаат место за вработен.`
      : `Free includes ${capacity.ownerLimit} owner and ${capacity.staffLimit} staff. Managers use a staff place.`;

  const members =
    language === "mk"
      ? `${capacity.totalLimit} ${capacity.totalLimit === 1 ? "активен член" : "активни членови"} на тимот`
      : `${capacity.totalLimit} active team ${capacity.totalLimit === 1 ? "member" : "members"}`;
  if (state === "trial")
    return language === "mk"
      ? `Во пробниот период можеш да имаш до ${members}.`
      : `During your trial, you can have up to ${members}.`;
  return language === "mk"
    ? `Твојот план вклучува до ${members}.`
    : `Your plan includes up to ${members}.`;
}
