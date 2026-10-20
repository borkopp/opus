# Automatic appointment completion

Automatic completion uses one durable Convex scheduled mutation per appointment.
It does not poll every studio every minute. The booking mutation schedules the
job atomically, converting the stored studio wall-clock end time into a real
instant with `wallClockTimestampToInstant`. The cleanup buffer is excluded.

## Default and emergency stop

Automatic completion is enabled by default for every active beauty studio,
including Free and Pro studios. It does not require a studio list or enrollment.
Only `BOOKING_AUTO_COMPLETION_ENABLED=false` disables it globally; an absent
setting leaves it enabled. Scheduling and execution both check this emergency
stop. Existing booking endpoints keep their current arguments.

The October 20 authorization enables this behavior for all studios and confirms
that there are no live mobile-app users. Mobile adoption is therefore not a
condition for activation.

Local implementation and tests do not establish production deployment.

## Appointment lifecycle

Manual, guest, authenticated client, recovery-offer and Instagram-confirmed
bookings use the shared scheduling helper. Rescheduling cancels the old
appointment's job and schedules its replacement. Manual completion,
cancellation and no-show changes cancel the outstanding job.

At execution, the worker checks the studio, tenant ownership, current booking
status, expected end time, current timezone and the emergency stop. Stale or
duplicate jobs cannot increment client value twice. A changed timezone
reschedules armed appointments, and the worker rechecks the actual end instant
before completing one. Soft-deleted studios and bookings and dormant hospitality
records are excluded.

Completion updates the appointment, the existing client completion-value
counter and the append-only audit log in the same mutation. Automatic completion
does not send customer messages or queue a review request. Existing manual
completion retains its review-request behavior. Staff may correct completed
appointments to no-shows; this reverses the recorded value and cancels pending
review requests and reminders. A completed appointment still cannot be cancelled
or rescheduled through the existing terminal-state guards.

## Existing bookings and recovery

For appointments already stored before this behavior is deployed, run the
internal mutation `bookings:setupAutomaticCompletionForAllStudios` with `{}`.
It reads bounded pages of beauty organization roots and schedules a separate
tenant-scoped setup for each active studio. The shared start cutoff remains
fixed across all studios and continuation pages. Studios created afterward use
the normal new-booking scheduling path.

The internal mutation `bookings:setupAutomaticCompletionForOrg` also accepts a
studio's `orgId` for targeted setup or recovery. It processes bounded pages of
that studio's bookings, schedules continuations when necessary and deduplicates
existing jobs. Both entrypoints are explicit operations, not a cron or an
automatic deployment migration.

By default it schedules active appointments whose end is still ahead when setup
starts. The cutoff remains fixed across pages. Untouched past appointments retain
their statuses, audit history and totals. A timezone change can move an already
armed appointment into the past; that appointment is still eligible because it
was previously scheduled. There is no automatic bulk historical completion.

Set `BOOKING_AUTO_COMPLETION_ENABLED=false` to stop automatic completion for all
studios. Already queued jobs recheck the setting before changing a booking. This
does not undo completed appointments. After removing the emergency stop, rerun
the explicit setup for all or selected studios to restore their future
schedules. Appointments that ended while disabled remain available for manual
review; they are not silently caught up.

## Cost and verification

Ordinary completion costs approximately one scheduled execution per appointment,
plus database reads/writes and any affected live subscriptions. Reschedules,
timezone repair and explicit setup add bounded work. An idle studio has no
recurring completion polling cost. Notification polling is independent and
unchanged.

Local regression coverage must verify the default-on behavior across studios,
the global emergency stop, timezone conversion, stale jobs, repeated completion,
manual completion/no-show correction, cancel/reschedule replacement, atomic
booking conflicts, existing future bookings and preservation of historical
records. Creation-path tests include guest verification, authenticated recovery
bookings and Instagram confirmation.

For production verification, inspect scheduled jobs, booking statuses and audit
entries from the deployed version, including manual correction to no-show.
Local tests do not establish production deployment or real studio behavior.
