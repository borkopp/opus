import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useConvexConnectionState, useMutation, useQuery } from "convex/react";
import { Mail, Trash2 } from "lucide-react-native";
import type { MobileManagement, TeamRole } from "../../../../shared/mobile";
import { StudioModal } from "@/components/dashboard/studio-modal";
import { Avatar } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, Segmented } from "@/components/ui/button";
import { ChoicePicker } from "@/components/ui/choice-picker";
import { SelectionList } from "@/components/ui/selection-list";
import { ToggleRow } from "@/components/ui/toggle-row";
import { Loading } from "@/components/ui/loading";
import { backend, errorMessage } from "@/lib/backend";
import { roleLabel } from "@/lib/management";
import { useStudio } from "@/providers/studio-provider";
import { useStudioData } from "@/providers/session-provider";
import { WeeklyHoursEditor } from "./weekly-hours-editor";

const fallback = {
  pathname: "/management",
  params: { section: "team" },
} as const;
export function TeamEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const data = useQuery(backend.management, {});
  const { t } = useStudio();
  const staffId = id === "new" ? undefined : id;
  const title = staffId
    ? t("Team member", "Член на тимот")
    : t("New team member", "Нов член на тимот");
  if (!data)
    return (
      <StudioModal title={title} fallback={fallback} dismissToFallback>
        <Loading />
      </StudioModal>
    );
  if (!data.canManage)
    return (
      <StudioModal title={title} fallback={fallback} dismissToFallback>
        <Text>
          {t(
            "Only owners and managers can manage the team.",
            "Само сопственици и менаџери можат да управуваат со тимот.",
          )}
        </Text>
      </StudioModal>
    );
  return (
    <TeamEditor
      key={staffId ?? "new"}
      data={data}
      staffId={staffId}
      title={title}
    />
  );
}
function TeamEditor({
  data,
  staffId,
  title,
}: {
  data: MobileManagement;
  staffId?: string;
  title: string;
}) {
  const { t, language, colors } = useStudio();
  const studio = useStudioData();
  const { isWebSocketConnected } = useConvexConnectionState();
  const [initial] = useState(() =>
    staffId ? data.team.find((s) => s.id === staffId) : undefined,
  );
  const member = data.team.find((s) => s.id === staffId) ?? initial;
  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState<TeamRole>(initial?.role ?? "staff");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [specialties, setSpecialties] = useState(
    initial?.specialties.join(", ") ?? "",
  );
  const [isActive, setActive] = useState(initial?.isActive ?? true);
  const [serviceIds, setServices] = useState(() =>
    data.services
      .filter((s) => staffId && s.staffIds.includes(staffId))
      .map((s) => s.id),
  );
  const [hours, setHours] = useState(() =>
    (initial?.hours ?? data.defaultHours).map((d) => ({
      ...d,
      breaks: d.breaks.map((b) => ({ ...b })),
    })),
  );
  const [section, setSection] = useState<"profile" | "hours" | "access">(
    "profile",
  );
  const [inviteEmail, setInviteEmail] = useState(
    initial?.pendingInviteEmail ?? "",
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation(backend.saveTeamMember);
  const remove = useMutation(backend.removeTeamMember);
  const sendInvite = useMutation(backend.inviteTeamMember);
  const capacity = member?.capacity ?? data.capacity;
  const limitReached =
    isActive &&
    !(role === "owner" ? capacity.canUseOwnerRole : capacity.canUseStaffRole);
  const locked = busy || confirm;
  const limitMessage = capacity.isFree
    ? t(
        "Free includes 1 owner and 3 staff. Managers use a staff place.",
        "Бесплатниот план вклучува 1 сопственик и 3 вработени. Менаџерите зафаќаат место за вработен.",
      )
    : t(
        "Pro includes up to 12 active team members.",
        "Pro вклучува до 12 активни членови на тимот.",
      );
  async function submit(removing = false) {
    if (busy || !isWebSocketConnected) return;
    setBusy(true);
    setError(null);
    try {
      if (removing && staffId) await remove({ staffId });
      else
        await save({
          ...(staffId ? { staffId } : {}),
          ...(!staffId && inviteEmail.trim() ? { signInEmail: inviteEmail.trim() } : {}),
          displayName: name,
          role,
          bio,
          specialties: specialties
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          isActive,
          serviceIds,
          hours,
        });
      router.dismissTo(fallback);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function invite() {
    if (!staffId || busy || !isWebSocketConnected) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await sendInvite({ staffId, email: inviteEmail });
      setNotice(
        t(
          "Invitation queued for email delivery.",
          "Поканата е ставена во ред за испраќање по е-пошта.",
        ),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (staffId && !initial)
    return (
      <StudioModal title={title} fallback={fallback} dismissToFallback>
        <Text>
          {t("Team member unavailable.", "Членот на тимот не е достапен.")}
        </Text>
      </StudioModal>
    );
  if (member && !member.canEdit)
    return (
      <StudioModal title={title} fallback={fallback} dismissToFallback>
        <Text>
          {t(
            "Only an owner can edit an owner’s profile.",
            "Само сопственик може да го уреди профилот на сопственик.",
          )}
        </Text>
      </StudioModal>
    );
  const inviteNeedsSave =
    !!member &&
    (name.trim() !== member.name ||
      role !== member.role ||
      isActive !== member.isActive);
  return (
    <StudioModal
      title={title}
      busy={busy}
      fallback={fallback}
      dismissToFallback
      footer={
        <>
          {error && (
            <Text accessibilityRole="alert" style={{ color: colors.danger }}>
              {error}
            </Text>
          )}
          {limitReached && !confirm && (
            <Text
              accessibilityRole="alert"
              variant="caption"
              style={{ color: colors.danger }}
            >
              {limitMessage}
            </Text>
          )}
          <Button
            label={
              busy
                ? t("Saving…", "Се зачувува…")
                : confirm
                  ? t("Confirm removal", "Потврди отстранување")
                  : staffId
                    ? t("Save team member", "Зачувај член")
                    : t("Add team member", "Додај член на тимот")
            }
            variant={confirm ? "danger" : "primary"}
            disabled={
              busy ||
              !isWebSocketConnected ||
              (!confirm && (!name.trim() || limitReached))
            }
            onPress={() => void submit(confirm)}
          />
          {confirm && (
            <Button
              variant="secondary"
              label={t("Keep team member", "Задржи го членот")}
              disabled={busy}
              onPress={() => setConfirm(false)}
            />
          )}
        </>
      }
    >
      <View style={{ alignItems: "center", gap: 10, paddingVertical: 6 }}>
        <Avatar name={name || t("Team", "Тим")} tone="sage" size={56} />
        <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>
          {t(
            "Profile, services and availability in one place.",
            "Профил, услуги и достапност на едно место.",
          )}
        </Text>
      </View>
      <Segmented
        value={section}
        onChange={setSection}
        options={[
          { value: "profile", label: t("Profile", "Профил") },
          { value: "hours", label: t("Hours", "Часови") },
          ...(staffId ? [{ value: "access" as const, label: t("Access", "Пристап") }] : []),
        ]}
      />
      {section === "profile" && (
        <>
          <Card style={{ borderRadius: 20 }}>
            <Input
              label={t("Name", "Име")}
              value={name}
              onChangeText={setName}
              maxLength={120}
              editable={!locked}
            />
            <Text variant="label">{t("Role", "Улога")}</Text>
            <ChoicePicker
              options={(studio.profile.role === "owner"
                ? (["staff", "manager", "owner"] as const)
                : (["staff", "manager"] as const)
              ).map((value) => ({ value, label: roleLabel(value, language) }))}
              value={role}
              onChange={(value) => setRole(value as TeamRole)}
              disabled={locked || (!!member && !member.canChangeRole)}
            />
            <Text variant="caption" tone="muted">
              {member && !member.canChangeRole
                ? t(
                    "Your studio must keep an active owner.",
                    "Студиото мора да има активен сопственик.",
                  )
                : limitMessage}
            </Text>
            {!staffId && !capacity.isFree && <>
              <Input
                label={t("Sign-in email (optional)", "Е-пошта за најава (незадолжително)")}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
                editable={!locked}
              />
              <Text variant="caption" tone="muted">{t("We will send an account invitation when you save this team member. Leave empty to add them without dashboard access.", "Ќе испратиме покана за сметка кога ќе го зачуваш членот. Остави празно за да го додадеш без пристап до контролната табла.")}</Text>
            </>}
            <Input
              label={t(
                "Specialties (optional)",
                "Специјалности (незадолжително)",
              )}
              value={specialties}
              onChangeText={setSpecialties}
              placeholder={t("Hair, nails, brows", "Коса, нокти, веѓи")}
              maxLength={1600}
              editable={!locked}
            />
            <Text variant="caption" tone="muted">
              {t(
                "Separate specialties with commas.",
                "Оддели ги специјалностите со запирки.",
              )}
            </Text>
            <Input
              label={t(
                "Short bio (optional)",
                "Кратка биографија (незадолжително)",
              )}
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={1000}
              editable={!locked}
              style={{ minHeight: 90, textAlignVertical: "top" }}
            />
            {staffId && (
              <ToggleRow
                label={t("Active team member", "Активен член на тимот")}
                description={t(
                  "Inactive members cannot receive new bookings or access the dashboard.",
                  "Неактивните членови не можат да примаат нови термини или да пристапат до контролната табла.",
                )}
                value={isActive}
                onChange={setActive}
                disabled={locked || !member?.canSetInactive}
              />
            )}
          </Card>
          <Card style={{ borderRadius: 20 }}>
            <Text variant="heading">{t("Services", "Услуги")}</Text>
            {data.services.length ? (
              <SelectionList
                options={data.services.map((s) => ({
                  value: s.id,
                  label: s.name,
                  description: s.isActive
                    ? `${s.durationMins} min`
                    : t("Paused", "Паузирана"),
                }))}
                value={serviceIds}
                onChange={setServices}
                disabled={locked}
              />
            ) : (
              <Text tone="muted">
                {t(
                  "Add a service to assign it here.",
                  "Додај услуга за да ја доделиш тука.",
                )}
              </Text>
            )}
          </Card>
        </>
      )}
      {section === "hours" && (
        <>
          <Text variant="caption" tone="muted" style={{ textAlign: "center" }}>
            {t(
              `Working hours use your studio time (${studio.timezone}). Enter times as HH:MM.`,
              `Работното време е според студиото (${studio.timezone}). Внеси часови како HH:MM.`,
            )}
          </Text>
          <WeeklyHoursEditor
            value={hours}
            onChange={setHours}
            disabled={locked}
          />
        </>
      )}
      {section === "access" && (
        <Card style={{ borderRadius: 20 }}>
          <Text variant="heading">
            {t("Dashboard access", "Пристап до контролната табла")}
          </Text>
          {!staffId ? (
            <Text tone="muted">
              {t(
                "Save this team member, then open Access to invite them by email.",
                "Зачувај го членот, па отвори Пристап за покана по е-пошта.",
              )}
            </Text>
          ) : member?.hasAccess ? (
            <Text tone="muted">
              {t(
                "This member already has a linked account. Their saved role controls dashboard permissions.",
                "Членот веќе има поврзана сметка. Зачуваната улога ги одредува дозволите.",
              )}
            </Text>
          ) : (
            <>
              {member?.pendingInviteEmail && (
                <Text tone="muted">
                  {t("Pending invitation", "Покана во очекување")}:{" "}
                  {member.pendingInviteEmail}
                </Text>
              )}
              <Input
                label={t("Sign-in email", "Е-пошта за најава")}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                maxLength={254}
                editable={!locked}
              />
              <Text variant="caption" tone="muted">
                {t(
                  "Sends a sign-in invitation using the saved profile and role. Invitations expire after 72 hours.",
                  "Испраќа покана со зачуваниот профил и улога. Поканите истекуваат по 72 часа.",
                )}
              </Text>
              {(inviteNeedsSave || !member?.isActive) && (
                <Text variant="caption" tone="muted">
                  {t(
                    "Save an active profile before inviting this member.",
                    "Зачувај активен профил пред да испратиш покана.",
                  )}
                </Text>
              )}
              <Button
                icon={Mail}
                variant="secondary"
                label={t("Send invitation", "Испрати покана")}
                disabled={
                  locked ||
                  !isWebSocketConnected ||
                  !inviteEmail.trim() ||
                  inviteNeedsSave ||
                  !member?.isActive
                }
                onPress={() => void invite()}
              />
              {notice && (
                <Text
                  accessibilityRole="alert"
                  style={{ color: colors.success }}
                >
                  {notice}
                </Text>
              )}
            </>
          )}
        </Card>
      )}
      {member?.canRemove && (
        <Card style={{ borderRadius: 20 }}>
          {confirm ? (
            <Text accessibilityRole="alert">
              {t(
                "Remove this team member? Booking history stays available. Their access and new bookings will be disabled.",
                "Да се отстрани членот? Историјата на термините останува. Пристапот и новите закажувања ќе бидат оневозможени.",
              )}
            </Text>
          ) : (
            <Button
              variant="danger"
              icon={Trash2}
              label={t("Remove team member", "Отстрани член на тимот")}
              disabled={busy || !isWebSocketConnected}
              onPress={() => {
                setConfirm(true);
                setError(null);
              }}
            />
          )}
        </Card>
      )}
    </StudioModal>
  );
}
