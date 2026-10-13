"use client";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { useEffect, useState } from "react";
import { Clock3, Globe, Store, Users, CalendarOff } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldGroup } from "@/components/ui/field";
import { ReservationSettingsNotice } from "./ReservationSettingsNotice";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ReservationSectionNavigation } from "./ReservationSectionNavigation";
import { useReservationAction } from "@/hooks/use-reservation-action";
import {
  ReservationError,
  ReservationInput,
  ReservationSelect,
} from "./ReservationFields";
import { VenueResources } from "./VenueResources";
import { VenueRulesForm } from "./VenueRulesForm";
import { ReservationWebsite } from "./public/ReservationWebsite";
import { VenueTeam } from "./VenueTeam";
import { CreateVenue } from "./CreateVenue";

type Workspace = FunctionReturnType<typeof api.hospitality.getWorkspace>;
const venueTypes = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
];
export function VenueSetup() {
  const copy = useReservationCopy();
  const { t } = useDashboardI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const access = useQuery(api.hospitality.getAccess);
  const workspace = useQuery(
    api.hospitality.getWorkspace,
    access?.hasVenue ? {} : "skip",
  );
  const requestedTab = searchParams.get("tab") ?? "profile";
  useEffect(() => {
    if (requestedTab === "tables")
      router.replace("/hospitality/tables?tab=tables");
  }, [requestedTab, router]);
  if (requestedTab === "tables") return <Skeleton className="h-96" />;
  if (!access || (access.hasVenue && !workspace))
    return <Skeleton className="h-96" />;
  if (!access.available) return null;
  if (!access.hasVenue)
    return access.canCreate ? (
      <CreateVenue />
    ) : (
      <p>{copy("This account cannot create a venue.")}</p>
    );
  if (!workspace) return null;
  if (workspace.role === "staff")
    return <p>{copy("Venue setup is managed by an owner or manager.")}</p>;
  const tab = [
    "profile",
    "rules",
    "closures",
    "publish",
    ...(workspace.role === "owner" ? ["team"] : []),
  ].includes(requestedTab)
    ? requestedTab
    : "profile";
  const navigate = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.replace(`/hospitality/setup?${params.toString()}`, {
      scroll: false,
    });
  };
  const sections = [
    { value: "profile", label: copy("Venue details"), icon: Store },
    { value: "rules", label: copy("Hours & rules"), icon: Clock3 },
    { value: "closures", label: copy("Closures"), icon: CalendarOff },
    ...(workspace.role === "owner"
      ? [{ value: "team", label: copy("Team"), icon: Users }]
      : []),
    {
      value: "publish",
      label: t("Website", "Веб-страница", "Faqja e internetit"),
      icon: Globe,
    },
  ];
  return (
    <div className="flex min-h-full w-full min-w-0 flex-col gap-6 pb-12">
      <DashboardPageHeader
        title={copy("Venue setup")}
        description={t(
          "Manage venue details, reservation hours, and your public website.",
          "Уредете ги деталите за локалот, часовите за резервации и веб-страницата.",
          "Menaxhoni të dhënat e lokalit, oraret e rezervimeve dhe faqen tuaj.",
        )}
      />
      <Tabs
        key={workspace.org._id}
        orientation="vertical"
        className="dashboard-settings-tabs w-full"
        value={tab}
        onValueChange={navigate}
      >
        <ReservationSectionNavigation
          sections={sections}
          value={tab}
          onValueChange={navigate}
        />
        <div className="min-w-0">
          <TabsContent value="profile">
            <VenueProfile key={workspace.org.updatedAt} workspace={workspace} />
          </TabsContent>
          <TabsContent value="rules">
            {workspace.settings ? (
              <VenueRulesForm
                key={workspace.settings.updatedAt}
                settings={workspace.settings}
              />
            ) : (
              <ReservationSettingsNotice missing />
            )}
          </TabsContent>
          <TabsContent value="closures">
            <VenueResources workspace={workspace} closuresOnly />
          </TabsContent>
          {workspace.role === "owner" && (
            <TabsContent value="team">
              <VenueTeam />
            </TabsContent>
          )}
          <TabsContent value="publish">
            <VenuePublication workspace={workspace} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function VenueProfile({ workspace }: { workspace: Workspace }) {
  const copy = useReservationCopy();
  const save = useMutation(api.hospitality.saveProfile);
  const action = useReservationAction();
  const [profile, setProfile] = useState({
    name: workspace.org.name,
    venueType: (workspace.org.venueType === "cafe" ? "cafe" : "restaurant") as
      | "restaurant"
      | "cafe",
    address: workspace.org.address ?? "",
    city: workspace.org.city ?? "",
    phone: workspace.org.phone ?? "",
    bio: workspace.org.bio ?? "",
  });
  const owner = workspace.role === "owner";
  return (
    <Card>
      <CardHeader>
        <CardTitle>{copy("Venue details")}</CardTitle>
        <CardDescription>
          {copy(
            "Your public website and confirmations show these details. Only the owner can change them.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void action.run(() => save(profile), copy("Venue details saved"));
          }}
          className="flex flex-col gap-5"
        >
          <FieldGroup>
            <ReservationInput
              label={copy("Venue name")}
              required
              disabled={!owner}
              value={profile.name}
              onChange={(event) =>
                setProfile({ ...profile, name: event.target.value })
              }
            />
            <ReservationSelect
              label={copy("Venue type")}
              disabled={!owner}
              value={profile.venueType}
              onChange={(value) =>
                setProfile({
                  ...profile,
                  venueType: value as "restaurant" | "cafe",
                })
              }
              options={venueTypes.map((type) => ({
                ...type,
                label: copy(type.label),
              }))}
            />
            <ReservationInput
              label={copy("Street address")}
              required
              disabled={!owner}
              value={profile.address}
              onChange={(event) =>
                setProfile({ ...profile, address: event.target.value })
              }
            />
            <ReservationInput
              label={copy("City")}
              required
              disabled={!owner}
              value={profile.city}
              onChange={(event) =>
                setProfile({ ...profile, city: event.target.value })
              }
            />
            <ReservationInput
              label={copy("Contact phone")}
              type="tel"
              required
              disabled={!owner}
              value={profile.phone}
              onChange={(event) =>
                setProfile({ ...profile, phone: event.target.value })
              }
            />
            <ReservationInput
              label={copy("About your venue (optional)")}
              disabled={!owner}
              value={profile.bio}
              onChange={(event) =>
                setProfile({ ...profile, bio: event.target.value })
              }
            />
          </FieldGroup>
          <ReservationError error={action.error} />
          {owner && (
            <Button type="submit" disabled={action.busy}>
              {action.busy ? copy("Saving…") : copy("Save venue details")}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function VenuePublication({ workspace }: { workspace: Workspace }) {
  const copy = useReservationCopy();
  const publish = useMutation(api.hospitality.publish);
  const action = useReservationAction();
  const settings = workspace.settings;
  if (!settings) return <ReservationSettingsNotice missing />;
  const venue = {
    name: workspace.org.name,
    slug: workspace.org.slug,
    address: workspace.org.address,
    city: workspace.org.city,
    phone: workspace.org.phone,
    logoUrl: workspace.org.logoUrl,
    bio: workspace.org.bio,
    timezone: settings.timezone ?? "Europe/Skopje",
    acceptingReservations: false,
    settings: {
      minPartySize: settings.minPartySize,
      maxPartySize: settings.maxPartySize,
      defaultDurationMins: settings.defaultDurationMins,
      bookingWindowDays: settings.bookingWindowDays,
      cancellationWindowHours: settings.cancellationWindowHours ?? 24,
      servicePeriods: settings.servicePeriods ?? [],
    },
  };
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{copy("Publication checklist")}</CardTitle>
          <CardDescription>
            {copy(
              "Your venue appears publicly only after the owner publishes a usable reservation website.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {workspace.readiness.requirements.map((item) => (
            <div
              className="flex items-center justify-between gap-3"
              key={item.code}
            >
              <span>{copy(item.label)}</span>
              <Badge variant={item.complete ? "secondary" : "outline"}>
                {item.complete ? copy("Ready") : copy("Needed")}
              </Badge>
            </div>
          ))}
          <p role="status">
            {copy("Website:")}{" "}
            {copy(workspace.org.websiteStatus ?? "unpublished")}
          </p>
          <ReservationError error={action.error} />
          {workspace.role === "owner" && (
            <div className="flex flex-wrap gap-3">
              <Button
                disabled={action.busy || !workspace.readiness.ready}
                onClick={() =>
                  void action.run(
                    () => publish({ published: true }),
                    copy("Venue website published"),
                  )
                }
              >
                {copy("Publish venue website")}
              </Button>
              {workspace.org.websiteStatus === "published" && (
                <>
                  <Button variant="outline" asChild>
                    <a
                      href={`/reserve/${workspace.org.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {copy("Open reservation page")}
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(
                        () => publish({ published: false }),
                        copy("Online reservations paused"),
                      )
                    }
                  >
                    {copy("Pause online reservations")}
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      <ReservationWebsite venue={venue} preview />
    </div>
  );
}
