"use client";

import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowUpRight, Check, FlaskConical, Plus, X } from "lucide-react";
import {
  appointments as initialAppointments,
  initials,
  money,
  services,
  type Appointment,
} from "../_lib/mock-data";
import {
  PreviewContext,
  type BookingDraft,
  type PreviewContextValue,
} from "./preview-context";
import { Clarity, Focus, Studio } from "./variants";
import s from "../preview.module.css";

const variants = [
  {
    id: "clarity",
    name: "Clarity",
    number: "01",
    description: "A clear view of your studio.",
    component: Clarity,
  },
  {
    id: "focus",
    name: "Focus",
    number: "02",
    description: "A workspace for the day ahead.",
    component: Focus,
  },
  {
    id: "studio",
    name: "Studio",
    number: "03",
    description: "A little more room to breathe.",
    component: Studio,
  },
] as const;

export function DashboardPreview() {
  const [variant, setVariant] =
    useState<(typeof variants)[number]["id"]>("clarity");
  const [appointments, setAppointments] = useState(initialAppointments);
  const [day, setDay] = useState(22);
  const [period, setPeriod] = useState("week");
  const [search, setSearch] = useState("");
  const [staffFilter, setStaffFilter] = useState("Everyone");
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [draft, setDraft] = useState<BookingDraft>({});
  const [service, setService] = useState(services[0].name);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");
  const detailDialog = useRef<HTMLDialogElement>(null);
  const bookingDialog = useRef<HTMLDialogElement>(null);
  const notificationDialog = useRef<HTMLDialogElement>(null);
  const activeVariant = variants.find((item) => item.id === variant)!;
  const Variant = activeVariant.component;

  function newAppointment(values: BookingDraft = {}) {
    setDraft(values);
    setService(values.service || services[0].name);
    setFormError("");
    bookingDialog.current?.showModal();
  }

  function saveAppointment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const chosenService = services.find((item) => item.name === service)!;
    const appointmentDay = Number(form.get("day"));
    const time = String(form.get("time"));
    const name = String(form.get("name")).trim();
    if (!name) {
      setFormError("Please enter a client name.");
      return;
    }
    const minutes = (value: string) =>
      Number(value.split(":")[0]) * 60 + Number(value.split(":")[1]);
    const start = minutes(time);
    const conflict = appointments.some(
      (item) =>
        item.day === appointmentDay &&
        item.staff === chosenService.staff &&
        start < minutes(item.time) + item.duration &&
        start + chosenService.duration > minutes(item.time),
    );
    if (conflict) {
      setFormError(
        `${chosenService.staff} already has an appointment at this time. Try another slot.`,
      );
      return;
    }
    setAppointments((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        service,
        staff: chosenService.staff,
        time,
        duration: chosenService.duration,
        price: chosenService.price,
        day: appointmentDay,
        status: "Confirmed",
        tone: chosenService.tone,
        visits: 1,
      },
    ]);
    setDay(appointmentDay);
    setStaffFilter("Everyone");
    setSearch("");
    bookingDialog.current?.close();
    setNotice(`Sample appointment added for ${name}.`);
    event.currentTarget.reset();
  }

  const value: PreviewContextValue = {
    appointments,
    day,
    setDay,
    period,
    setPeriod,
    search,
    setSearch,
    staffFilter,
    setStaffFilter,
    newAppointment,
    showAppointment: (appointment) => {
      setSelected(appointment);
      detailDialog.current?.showModal();
    },
    showNotifications: () => notificationDialog.current?.showModal(),
  };

  return (
    <PreviewContext.Provider value={value}>
      <div className={s.preview} data-variant={variant} lang="en">
        <header className={s.previewBar}>
          <div className={s.previewLabel}>
            <span className={s.previewIcon}>
              <FlaskConical size={15} />
            </span>
            <strong>Design lab</strong>
            <span className={s.labelDivider} />
            <span>Dashboard exploration</span>
          </div>
          <div
            className={s.variantSwitcher}
            role="group"
            aria-label="Dashboard design variant"
          >
            {variants.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={variant === item.id}
                onClick={() => {
                  setVariant(item.id);
                  window.scrollTo({ top: 0, behavior: "instant" });
                }}
              >
                <span>{item.number}</span>
                {item.name}
              </button>
            ))}
          </div>
          <span className={s.mockLabel}>
            <i />
            Sample data only
          </span>
        </header>
        <div className={s.stage}>
          <Variant />
          <footer className={s.previewFooter}>
            <span>
              {activeVariant.number} / {activeVariant.name}
            </span>
            <span>{activeVariant.description}</span>
            <span>OPUS · Design exploration</span>
          </footer>
        </div>
        {notice && (
          <div className={s.toast} role="status">
            <Check size={17} />
            {notice}
            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <PreviewDialog dialogRef={detailDialog} title="Appointment details">
          {selected && (
            <>
              <div className={s.detailPerson}>
                <span className={s.avatar} data-tone={selected.tone}>
                  {initials(selected.name)}
                </span>
                <div>
                  <h3>{selected.name}</h3>
                  <p>
                    {selected.visits === 1
                      ? "First visit"
                      : `${selected.visits} visits to your studio`}
                  </p>
                </div>
              </div>
              <dl className={s.detailGrid}>
                <div>
                  <dt>Service</dt>
                  <dd>{selected.service}</dd>
                </div>
                <div>
                  <dt>Team member</dt>
                  <dd>{selected.staff}</dd>
                </div>
                <div>
                  <dt>When</dt>
                  <dd>
                    Sep {selected.day}, {selected.time}
                  </dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{selected.duration} minutes</dd>
                </div>
                <div>
                  <dt>Appointment value</dt>
                  <dd>{money(selected.price)} MKD</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{selected.status}</dd>
                </div>
              </dl>
              <p className={s.dialogNote}>
                Sample client data for this design preview.
              </p>
              <button
                type="button"
                className={s.primaryButton}
                disabled={selected.status === "Completed"}
                onClick={() => {
                  const updated: Appointment = {
                    ...selected,
                    status:
                      selected.status === "Confirmed" ? "Arrived" : "Completed",
                  };
                  setAppointments((current) =>
                    current.map((item) =>
                      item.id === updated.id ? updated : item,
                    ),
                  );
                  setSelected(updated);
                }}
              >
                {selected.status === "Completed"
                  ? "Appointment completed"
                  : selected.status === "Arrived"
                    ? "Mark as completed"
                    : "Mark as arrived"}
                <Check size={16} />
              </button>
            </>
          )}
        </PreviewDialog>
        <PreviewDialog dialogRef={bookingDialog} title="New appointment">
          <p className={s.dialogNote}>
            Try the flow. Changes stay in this preview until you reload.
          </p>
          <form
            onSubmit={saveAppointment}
            className={s.bookingForm}
            key={`${draft.time}-${draft.service}-${day}`}
          >
            <label>
              Client name
              <input
                name="name"
                placeholder="e.g. Ana Petrova"
                required
                maxLength={80}
              />
            </label>
            <label>
              Service
              <select
                name="service"
                value={service}
                onChange={(event) => setService(event.target.value)}
              >
                {services.map((item) => (
                  <option key={item.name}>{item.name}</option>
                ))}
              </select>
            </label>
            <div className={s.formRow}>
              <label>
                Date
                <select name="day" defaultValue={draft.day ?? day}>
                  {[21, 22, 23, 24, 25, 26, 27].map((date) => (
                    <option key={date} value={date}>
                      September {date}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Time
                <input
                  name="time"
                  type="time"
                  defaultValue={draft.time || "16:00"}
                  required
                  min="09:00"
                  max="18:00"
                />
              </label>
            </div>
            <div className={s.bookingSummary}>
              <span>
                {services.find((item) => item.name === service)?.staff} ·{" "}
                {services.find((item) => item.name === service)?.duration} min
              </span>
              <strong>
                {money(services.find((item) => item.name === service)!.price)}{" "}
                MKD
              </strong>
            </div>
            {formError && (
              <p className={s.formError} role="alert">
                {formError}
              </p>
            )}
            <button className={s.primaryButton} type="submit">
              <Plus size={17} />
              Add sample appointment
            </button>
          </form>
        </PreviewDialog>
        <PreviewDialog dialogRef={notificationDialog} title="Studio updates">
          <div className={s.updateItem}>
            <span className={s.updateDot} />
            <div>
              <strong>A new booking, a familiar face.</strong>
              <p>Iva booked a gel manicure with Sara for 13:00.</p>
              <small>12 minutes ago · sample update</small>
            </div>
          </div>
          <div className={s.updateItem}>
            <span className={s.updateDot} />
            <div>
              <strong>An opening in your afternoon.</strong>
              <p>Elena has 45 minutes available at 13:30.</p>
              <small>30 minutes ago · sample update</small>
            </div>
          </div>
          <button
            type="button"
            className={s.primaryButton}
            onClick={() => notificationDialog.current?.close()}
          >
            All caught up
            <ArrowUpRight size={17} />
          </button>
        </PreviewDialog>
      </div>
    </PreviewContext.Provider>
  );
}

function PreviewDialog({
  dialogRef,
  title,
  children,
}: {
  dialogRef: React.RefObject<HTMLDialogElement | null>;
  title: string;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={dialogRef}
      className={s.dialog}
      aria-label={title}
      onClick={(event) => {
        if (event.target === event.currentTarget) event.currentTarget.close();
      }}
    >
      <div className={s.dialogContent}>
        <div className={s.dialogHeader}>
          <h2>{title}</h2>
          <button
            type="button"
            className={s.iconButton}
            aria-label="Close dialog"
            onClick={() => dialogRef.current?.close()}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
