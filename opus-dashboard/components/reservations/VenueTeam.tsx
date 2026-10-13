"use client";
import { useReservationCopy } from "@/hooks/use-reservation-copy";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FieldGroup } from "@/components/ui/field";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useReservationAction } from "@/hooks/use-reservation-action";
import {
  ReservationError,
  ReservationInput,
  ReservationSelect,
} from "./ReservationFields";

export function VenueTeam() {
  const copy = useReservationCopy();
  const team = useQuery(api.hospitality.listTeam);
  const invite = useMutation(api.hospitality.inviteTeamMember);
  const update = useMutation(api.hospitality.updateTeamMember);
  const action = useReservationAction();
  const [form, setForm] = useState<{
    staffId?: Id<"staff_members">;
    name: string;
    email: string;
    role: "manager" | "staff";
  }>({ name: "", email: "", role: "staff" });
  if (!team) return <Skeleton className="h-64" />;
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{copy("Venue team")}</CardTitle>
          <CardDescription>
            {copy(
              "Hosts manage daily reservations. Managers also manage tables, closures and reservation rules. The owner controls invitations and publication.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {team.map((member) => (
            <div
              key={member._id}
              className="flex flex-wrap items-center justify-between gap-3 border-b py-3"
            >
              <div>
                <p className="font-medium">{member.displayName}</p>
                <p className="text-sm text-muted-foreground">
                  {member.role === "staff" ? copy("Host") : copy(member.role)} ·{" "}
                  {member.userId
                    ? copy("Account linked")
                    : member.invite
                      ? copy("Invitation pending: {email}", {
                          email: member.invite.email,
                        })
                      : copy("No linked account")}
                </p>
                {!member.isActive && (
                  <Badge variant="secondary">{copy("Inactive")}</Badge>
                )}
              </div>
              {member.role !== "owner" && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(
                        () =>
                          update({
                            staffId: member._id,
                            role:
                              member.role === "manager" ? "staff" : "manager",
                            isActive: member.isActive,
                          }),
                        copy("Role updated"),
                      )
                    }
                  >
                    {member.role === "manager"
                      ? copy("Make host")
                      : copy("Make manager")}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={action.busy}
                    onClick={() =>
                      void action.run(
                        () =>
                          update({
                            staffId: member._id,
                            role: member.role as "staff" | "manager",
                            isActive: !member.isActive,
                          }),
                        copy("Access updated"),
                      )
                    }
                  >
                    {member.isActive ? copy("Deactivate") : copy("Activate")}
                  </Button>
                  {!member.userId && (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setForm({
                          staffId: member._id,
                          name: member.displayName,
                          email: member.invite?.email ?? "",
                          role: member.role as "staff" | "manager",
                        })
                      }
                    >
                      {copy("New invitation")}
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>
            {form.staffId
              ? copy("Replace team invitation")
              : copy("Invite a team member")}
          </CardTitle>
          <CardDescription>
            {copy(
              "An email link lets the invited person sign in and accept access. A pending invitation does not grant account access.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-5"
            onSubmit={(event) => {
              event.preventDefault();
              void action.run(async () => {
                await invite(form);
                setForm({ name: "", email: "", role: "staff" });
              }, copy("Invitation queued"));
            }}
          >
            <FieldGroup>
              <ReservationInput
                label={copy("Team member name")}
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
              />
              <ReservationInput
                label={copy("Sign-in email")}
                type="email"
                required
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
              />
              <ReservationSelect
                label={copy("Access")}
                value={form.role}
                onChange={(value) =>
                  setForm({ ...form, role: value as "staff" | "manager" })
                }
                options={[
                  { value: "staff", label: copy("Host — daily reservations") },
                  {
                    value: "manager",
                    label: copy("Manager — operations and setup"),
                  },
                ]}
              />
            </FieldGroup>
            <ReservationError error={action.error} />
            <Button disabled={action.busy} type="submit">
              {action.busy ? copy("Sending…") : copy("Send invitation")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
