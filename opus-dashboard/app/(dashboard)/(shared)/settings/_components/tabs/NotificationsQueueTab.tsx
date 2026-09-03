"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { MailCheck, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DebouncedInput } from "@/components/ui/debounced-input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { TabsContent } from "@/components/ui/tabs";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  SettingsCard,
  SettingsSection,
  SettingsToggleRow,
} from "../SettingsCard";
import { parseReminderHours } from "../validation";

type EmailRecipient = {
  userId: Id<"users">;
  staffId: Id<"staff_members">;
  name: string;
  email: string;
  role: "owner" | "manager" | "staff";
};

interface NotificationsQueueTabProps {
  orgId: Id<"orgs">;
  initialData: {
    emailEnabled: boolean;
    reminderHoursBefore: number[];
    staffNewBookingEmailEnabled: boolean;
    staffReminderEmailEnabled: boolean;
    staffReminderHoursBefore: number[];
    staffEmailRecipientUserIds: Id<"users">[];
    emailRecipients: EmailRecipient[];
    dashboardNotificationsEnabled: boolean;
    dashboardSoundEnabled: boolean;
    dashboardToastEnabled: boolean;
  };
}

const DASHBOARD_OPTIONS = [
  {
    id: "dashboard-sound-enabled",
    labelEn: "Sound",
    labelMk: "Звук",
    descriptionEn: "Play a chime when a new notification arrives.",
    descriptionMk: "Пушти звучен сигнал кога ќе пристигне ново известување.",
    key: "dashboardSoundEnabled",
  },
  {
    id: "dashboard-toast-enabled",
    labelEn: "Toast preview",
    labelMk: "Преглед на известување",
    descriptionEn: "Show a brief notification card beneath the bell.",
    descriptionMk: "Прикажи кратка картичка со известување под ѕвончето.",
    key: "dashboardToastEnabled",
  },
] as const;

const ROLE_LABELS: Record<EmailRecipient["role"], { en: string; mk: string }> =
  {
    owner: { en: "Owner", mk: "Сопственик" },
    manager: { en: "Manager", mk: "Менаџер" },
    staff: { en: "Staff", mk: "Вработен" },
  };

export function NotificationsQueueTab({
  orgId,
  initialData,
}: NotificationsQueueTabProps) {
  const { t } = useDashboardI18n();
  const isMounted = useRef(true);
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [email, setEmail] = useState({
    customerReminderEmailEnabled: initialData.emailEnabled,
    customerReminderHours: initialData.reminderHoursBefore.join(", "),
    staffNewBookingEmailEnabled: initialData.staffNewBookingEmailEnabled,
    staffReminderEmailEnabled: initialData.staffReminderEmailEnabled,
    staffReminderHours: initialData.staffReminderHoursBefore.join(", "),
    staffEmailRecipientUserIds: initialData.staffEmailRecipientUserIds,
  });
  const [dashboard, setDashboard] = useState({
    dashboardNotificationsEnabled: initialData.dashboardNotificationsEnabled,
    dashboardSoundEnabled: initialData.dashboardSoundEnabled,
    dashboardToastEnabled: initialData.dashboardToastEnabled,
  });
  const [customerReminderError, setCustomerReminderError] = useState<string>();
  const [staffReminderError, setStaffReminderError] = useState<string>();
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEmail({
      customerReminderEmailEnabled: initialData.emailEnabled,
      customerReminderHours: initialData.reminderHoursBefore.join(", "),
      staffNewBookingEmailEnabled: initialData.staffNewBookingEmailEnabled,
      staffReminderEmailEnabled: initialData.staffReminderEmailEnabled,
      staffReminderHours: initialData.staffReminderHoursBefore.join(", "),
      staffEmailRecipientUserIds: initialData.staffEmailRecipientUserIds,
    });
    setDashboard({
      dashboardNotificationsEnabled: initialData.dashboardNotificationsEnabled,
      dashboardSoundEnabled: initialData.dashboardSoundEnabled,
      dashboardToastEnabled: initialData.dashboardToastEnabled,
    });
  }, [initialData]);

  const updateEmailNotificationSettings = useMutation(
    api.orgSettings.updateEmailNotificationSettings,
  );
  const updateDashboardNotificationSettings = useMutation(
    api.orgSettings.updateDashboardNotificationSettings,
  );

  const handleSave = async () => {
    const customerReminderHours = parseReminderHours(
      email.customerReminderHours,
    );
    const staffReminderHours = parseReminderHours(email.staffReminderHours);
    let invalid = false;
    if (
      !customerReminderHours ||
      (email.customerReminderEmailEnabled && customerReminderHours.length === 0)
    ) {
      setCustomerReminderError(
        t(
          "Enter up to eight whole-hour reminders between 1 and 336, such as 24, 2.",
          "Внесете до осум потсетници во цели часови помеѓу 1 и 336, на пример 24, 2.",
        ),
      );
      invalid = true;
    } else {
      setCustomerReminderError(undefined);
    }
    if (
      !staffReminderHours ||
      (email.staffReminderEmailEnabled && staffReminderHours.length === 0)
    ) {
      setStaffReminderError(
        t(
          "Enter up to eight whole-hour reminders between 1 and 336, such as 24, 2.",
          "Внесете до осум потсетници во цели часови помеѓу 1 и 336, на пример 24, 2.",
        ),
      );
      invalid = true;
    } else {
      setStaffReminderError(undefined);
    }
    if (invalid || !customerReminderHours || !staffReminderHours) return;

    setIsSaving(true);
    try {
      await updateEmailNotificationSettings({
        orgId,
        customerReminderEmailEnabled: email.customerReminderEmailEnabled,
        customerReminderHoursBefore: customerReminderHours,
        staffNewBookingEmailEnabled: email.staffNewBookingEmailEnabled,
        staffReminderEmailEnabled: email.staffReminderEmailEnabled,
        staffReminderHoursBefore: staffReminderHours,
        staffEmailRecipientUserIds: email.staffEmailRecipientUserIds,
      });
      await updateDashboardNotificationSettings({ orgId, ...dashboard });
      if (isMounted.current) {
        toast.success(
          t(
            "Email and alert settings saved",
            "Поставките за е-пошта и известувања се зачувани",
          ),
        );
      }
    } catch (error) {
      if (isMounted.current) {
        toast.error(
          error instanceof Error
            ? error.message
            : t(
                "Failed to save email settings.",
                "Не успеа зачувувањето на поставките за е-пошта.",
              ),
        );
      }
    } finally {
      if (isMounted.current) setIsSaving(false);
    }
  };

  return (
    <TabsContent value="notifications" className="m-0">
      <SettingsCard
        title={t("Email & alerts", "Е-пошта и известувања")}
        description={t(
          "Keep clients verified and informed, then decide exactly which dashboard users hear about new and upcoming appointments.",
          "Осигурете верификација и информираност на клиентите, и изберете кои корисници на контролната табла добиваат известувања за нови и претстојни термини.",
        )}
        contentClassName="flex flex-col gap-7"
        footer={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {isSaving
              ? t("Saving…", "Се зачувува…")
              : t("Save email settings", "Зачувај поставки за е-пошта")}
          </Button>
        }
      >
        <SettingsSection
          title={t("Client journey", "Патување на клиентот")}
          description={t(
            "Verification and confirmation are transactional parts of online booking, so clients cannot switch them off.",
            "Верификацијата и потврдата се трансакциски дел од онлајн закажувањето, па клиентите не можат да ги исклучат.",
          )}
        >
          <div className="flex flex-col gap-3">
            <SettingsToggleRow
              title={t(
                "Email verification code",
                "Код за верификација на е-пошта",
              )}
              description={t(
                "Confirms that the client owns the email address before the appointment is created.",
                "Потврдува дека клиентот е сопственик на е-адресата пред да се креира терминот.",
              )}
              control={
                <Badge variant="secondary">
                  <ShieldCheck data-icon="inline-start" />
                  {t("Required", "Задолжително")}
                </Badge>
              }
            />
            <SettingsToggleRow
              title={t("Appointment confirmation", "Потврда за термин")}
              description={t(
                "Sends the appointment overview, calendar file, directions, and studio contact actions.",
                "Испраќа преглед на терминот, датотека за календар, насоки и контакт информации за студиото.",
              )}
              control={
                <Badge variant="secondary">
                  <MailCheck data-icon="inline-start" />
                  {t("Always on", "Секогаш вклучено")}
                </Badge>
              }
            />
            <SettingsToggleRow
              title={t("Client reminders", "Потсетници за клиенти")}
              description={t(
                "Email clients before confirmed appointments using the schedule below.",
                "Испраќа е-пошта на клиентите пред потврдените термини според распоредот подолу.",
              )}
              control={
                <Switch
                  id="customer-reminder-email-enabled"
                  aria-label={t(
                    "Client reminder emails",
                    "Е-пораки за потсетување на клиенти",
                  )}
                  checked={email.customerReminderEmailEnabled}
                  onCheckedChange={(checked) =>
                    setEmail((current) => ({
                      ...current,
                      customerReminderEmailEnabled: checked,
                    }))
                  }
                />
              }
            />
          </div>

          {email.customerReminderEmailEnabled && (
            <FieldGroup className="max-w-xl">
              <Field data-invalid={Boolean(customerReminderError)}>
                <FieldLabel htmlFor="customer-reminder-hours">
                  {t(
                    "Client reminder schedule (hours before)",
                    "Распоред за потсетување на клиенти (часови однапред)",
                  )}
                </FieldLabel>
                <DebouncedInput
                  id="customer-reminder-hours"
                  value={email.customerReminderHours}
                  maxLength={64}
                  aria-describedby="customer-reminder-description"
                  aria-invalid={Boolean(customerReminderError)}
                  onChange={(value) => {
                    setEmail((current) => ({
                      ...current,
                      customerReminderHours: value,
                    }));
                    setCustomerReminderError(undefined);
                  }}
                  placeholder="24, 2"
                />
                <FieldDescription id="customer-reminder-description">
                  {t(
                    "For example, 24, 2 sends one email a day before and another two hours before.",
                    "На пример, 24, 2 испраќа една порака еден ден однапред и друга два часа однапред.",
                  )}
                </FieldDescription>
                <FieldError>{customerReminderError}</FieldError>
              </Field>
            </FieldGroup>
          )}
        </SettingsSection>

        <Separator />

        <SettingsSection
          title={t("Team email", "Тимска е-пошта")}
          description={t(
            "Choose which appointment events are emailed to assigned staff and additional dashboard recipients.",
            "Изберете кои настани за термини се испраќаат по е-пошта на доделениот персонал и дополнителни корисници.",
          )}
        >
          <div className="flex flex-col gap-3">
            <SettingsToggleRow
              title={t("New appointments", "Нови термини")}
              description={t(
                "Email the assigned staff when an appointment is added. Selected dashboard recipients also receive new online bookings.",
                "Испраќа е-пошта на доделениот вработен при додавање нов термин. Избраните корисници на контролната табла исто така добиваат известувања за нови онлајн закажувања.",
              )}
              control={
                <Switch
                  id="staff-new-booking-email-enabled"
                  aria-label={t(
                    "New booking emails",
                    "Е-пораки за нови закажувања",
                  )}
                  checked={email.staffNewBookingEmailEnabled}
                  onCheckedChange={(checked) =>
                    setEmail((current) => ({
                      ...current,
                      staffNewBookingEmailEnabled: checked,
                    }))
                  }
                />
              }
            />
            <SettingsToggleRow
              title={t(
                "Upcoming appointment reminders",
                "Потсетници за претстојни термини",
              )}
              description={t(
                "Email assigned staff and selected dashboard recipients before confirmed appointments.",
                "Испраќа е-пошта на доделениот вработен и избраните корисници пред потврдените термини.",
              )}
              control={
                <Switch
                  id="staff-reminder-email-enabled"
                  aria-label={t(
                    "Team appointment reminders",
                    "Тимски потсетници за термини",
                  )}
                  checked={email.staffReminderEmailEnabled}
                  onCheckedChange={(checked) =>
                    setEmail((current) => ({
                      ...current,
                      staffReminderEmailEnabled: checked,
                    }))
                  }
                />
              }
            />
          </div>

          {email.staffReminderEmailEnabled && (
            <FieldGroup className="max-w-xl">
              <Field data-invalid={Boolean(staffReminderError)}>
                <FieldLabel htmlFor="staff-reminder-hours">
                  {t(
                    "Team reminder schedule (hours before)",
                    "Распоред за тимски потсетници (часови однапред)",
                  )}
                </FieldLabel>
                <DebouncedInput
                  id="staff-reminder-hours"
                  value={email.staffReminderHours}
                  maxLength={64}
                  aria-describedby="staff-reminder-description"
                  aria-invalid={Boolean(staffReminderError)}
                  onChange={(value) => {
                    setEmail((current) => ({
                      ...current,
                      staffReminderHours: value,
                    }));
                    setStaffReminderError(undefined);
                  }}
                  placeholder="24, 2"
                />
                <FieldDescription id="staff-reminder-description">
                  {t(
                    "This schedule is independent from the client reminder schedule.",
                    "Овој распоред е независен од распоредот за потсетување на клиенти.",
                  )}
                </FieldDescription>
                <FieldError>{staffReminderError}</FieldError>
              </Field>
            </FieldGroup>
          )}

          <FieldSet>
            <FieldLegend variant="label">
              {t(
                "Additional dashboard recipients",
                "Дополнителни примачи од контролната табла",
              )}
            </FieldLegend>
            <FieldDescription>
              {t(
                "Staff with an appointment email receive only their assigned appointments. Select dashboard users here if they should also receive studio-wide team emails.",
                "Вработените со е-пошта за термини ги добиваат само своите доделени термини. Изберете корисници тука доколку треба да добиваат е-пораки за целото студио.",
              )}
            </FieldDescription>
            <FieldGroup data-slot="checkbox-group">
              {initialData.emailRecipients.map((recipient) => {
                const id = `email-recipient-${recipient.userId}`;
                const checked = email.staffEmailRecipientUserIds.includes(
                  recipient.userId,
                );
                return (
                  <Field
                    key={recipient.userId}
                    orientation="horizontal"
                    variant="surface"
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={(nextChecked) => {
                        setEmail((current) => ({
                          ...current,
                          staffEmailRecipientUserIds: nextChecked
                            ? Array.from(
                                new Set([
                                  ...current.staffEmailRecipientUserIds,
                                  recipient.userId,
                                ]),
                              )
                            : current.staffEmailRecipientUserIds.filter(
                                (userId) => userId !== recipient.userId,
                              ),
                        }));
                      }}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor={id}>
                        {recipient.name}
                        <Badge variant="outline">
                          {t(
                            ROLE_LABELS[recipient.role].en,
                            ROLE_LABELS[recipient.role].mk,
                          )}
                        </Badge>
                      </FieldLabel>
                      <FieldDescription>{recipient.email}</FieldDescription>
                    </FieldContent>
                  </Field>
                );
              })}
            </FieldGroup>
            {initialData.emailRecipients.length === 0 && (
              <FieldDescription>
                {t(
                  "There are no active dashboard users to add. Appointment emails are linked from the Staff page.",
                  "Нема активни корисници за додавање. Е-поштата за термини се поврзува на страницата Тим.",
                )}
              </FieldDescription>
            )}
          </FieldSet>
        </SettingsSection>

        <Separator />

        <SettingsSection
          title={t("Dashboard alerts", "Известувања на контролната табла")}
          description={t(
            "Control real-time feedback for staff working inside OPUS.",
            "Контролирајте ги известувањата во реално време за персоналот во OPUS.",
          )}
        >
          <SettingsToggleRow
            title={t("In-app notifications", "Известувања во апликацијата")}
            description={t(
              "Show new bookings, cancellations, and no-shows in the notification bell.",
              "Прикажувај нови закажувања, откажувања и пропуштени термини во ѕвончето за известувања.",
            )}
            control={
              <Switch
                id="dashboard-notifications-enabled"
                aria-label={t(
                  "In-app notifications",
                  "Известувања во апликацијата",
                )}
                checked={dashboard.dashboardNotificationsEnabled}
                onCheckedChange={(checked) =>
                  setDashboard((current) => ({
                    ...current,
                    dashboardNotificationsEnabled: checked,
                  }))
                }
              />
            }
          />

          {dashboard.dashboardNotificationsEnabled && (
            <div className="flex flex-col gap-3">
              {DASHBOARD_OPTIONS.map(
                ({
                  id,
                  labelEn,
                  labelMk,
                  descriptionEn,
                  descriptionMk,
                  key,
                }) => (
                  <SettingsToggleRow
                    key={id}
                    title={t(labelEn, labelMk)}
                    description={t(descriptionEn, descriptionMk)}
                    control={
                      <Switch
                        id={id}
                        aria-label={t(labelEn, labelMk)}
                        checked={dashboard[key]}
                        onCheckedChange={(checked) =>
                          setDashboard((current) => ({
                            ...current,
                            [key]: checked,
                          }))
                        }
                      />
                    }
                  />
                ),
              )}
            </div>
          )}
        </SettingsSection>
      </SettingsCard>
    </TabsContent>
  );
}
