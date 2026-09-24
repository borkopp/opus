"use client";

import { StripedBarChart } from "@/components/dashboard/charts/StripedBarChart";
import { useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  Plus,
  Scissors,
  Search,
  Settings2,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import {
  initials,
  money,
  openings,
  services,
  staff,
  type Appointment,
} from "../_lib/mock-data";
import { Logo, LogoMark } from "@/components/Logo";
import { usePreview } from "./preview-context";
import s from "../preview.module.css";

export function Brand({ compact = false }: { compact?: boolean }) {
  return compact ? (
    <span className={s.brand} aria-label="OPUS">
      <LogoMark className={s.brandMark} />
    </span>
  ) : (
    <Logo className={s.brand} markClassName={s.brandMark} />
  );
}

const navItems = [
  { label: "Overview", icon: LayoutGrid, target: "overview" },
  { label: "Calendar", icon: CalendarDays, target: "schedule" },
  { label: "Clients", icon: Users, target: "schedule" },
  { label: "Insights", icon: ChartNoAxesCombined, target: "insights" },
];

export function Navigation({ rail = false }: { rail?: boolean }) {
  const [active, setActive] = useState("Overview");
  const { setSearch, setStaffFilter } = usePreview();
  return (
    <nav
      className={rail ? s.railNav : s.navigation}
      aria-label="Preview navigation"
    >
      {navItems.map(({ label, icon: Icon, target }) => (
        <a
          href={`#${target}`}
          key={label}
          title={rail ? label : undefined}
          aria-label={rail ? label : undefined}
          aria-current={active === label ? "location" : undefined}
          onClick={() => {
            setActive(label);
            if (label === "Clients") {
              setSearch("");
              setStaffFilter("Everyone");
            }
          }}
        >
          <Icon size={18} />
          {!rail && label}
        </a>
      ))}
    </nav>
  );
}

export function HeaderActions() {
  const { showNotifications } = usePreview();
  return (
    <div className={s.headerActions}>
      <button
        type="button"
        className={s.iconButton}
        aria-label="View studio updates"
        onClick={showNotifications}
      >
        <Bell size={19} />
        <i className={s.notificationDot} />
      </button>
      <span className={s.headerDivider} />
      <span className={s.avatar} data-tone="peach">
        EP
      </span>
      <div className={s.profileLabel}>
        <strong>Elena Petrova</strong>
        <span>Studio owner</span>
      </div>
    </div>
  );
}

export function Greeting({ soft = false }: { soft?: boolean }) {
  const { newAppointment, appointments } = usePreview();
  const count = appointments.filter((item) => item.day === 22).length;
  return (
    <div className={s.greeting}>
      <div>
        <div className={s.eyebrow}>
          <Sun size={15} />
          Tuesday, September 22, 2026
        </div>
        <h1>
          {soft ? (
            <>
              A good day starts
              <br />
              with a little clarity<span>.</span>
            </>
          ) : (
            <>
              Good morning, Elena<span>.</span>
            </>
          )}
        </h1>
        <p>
          {soft ? (
            <>Your studio, beautifully in sync.</>
          ) : (
            <>
              You have <strong>{count} appointments</strong> today. Let’s make
              it a good day.
            </>
          )}
        </p>
      </div>
      <button
        type="button"
        className={s.primaryButton}
        onClick={() => newAppointment()}
      >
        <Plus size={18} />
        New appointment
      </button>
    </div>
  );
}

export function PanelHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className={s.panelHeading}>
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function PeriodSelect() {
  const { period, setPeriod } = usePreview();
  return (
    <label className={s.periodSelect}>
      <span className={s.srOnly}>Analytics period</span>
      <select
        value={period}
        onChange={(event) => setPeriod(event.target.value)}
      >
        <option value="week">Last 7 days</option>
        <option value="month">Last 30 days</option>
      </select>
      <ChevronDown size={13} />
    </label>
  );
}

function Sparkline({ secondary = false }: { secondary?: boolean }) {
  return (
    <svg
      className={s.sparkline}
      viewBox="0 0 230 58"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 44C18 44 22 12 38 18S59 48 75 31 91 2 110 15 131 44 147 28 168 22 180 25 198 7 228 8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {secondary && (
        <path
          d="M2 48C22 41 35 38 55 43S88 26 110 31 136 47 160 39 198 30 228 35"
          stroke="currentColor"
          strokeOpacity=".18"
          strokeWidth="3"
        />
      )}
    </svg>
  );
}

export function Metrics({ soft = false }: { soft?: boolean }) {
  const { appointments, period } = usePreview();
  const today = appointments.filter((item) => item.day === 22);
  return (
    <div className={s.metrics}>
      <article className={s.metricCard}>
        <div className={s.metricTop}>
          <span>Today’s appointments</span>
          <CalendarDays size={18} />
        </div>
        {soft && <Sparkline secondary />}
        <div className={s.metricValue}>
          {today.length}
          <span className={s.metricBadge}>On the calendar</span>
        </div>
        {!soft && (
          <div className={s.metricFoot}>
            <span className={s.avatarStack}>
              {staff.map((item) => (
                <span
                  key={item.name}
                  className={s.avatar}
                  data-tone={item.tone}
                >
                  {item.initials}
                </span>
              ))}
            </span>
            <span>Across your 3 team members</span>
          </div>
        )}
        {soft && (
          <p className={s.metricHint}>
            {today.filter((item) => item.status === "Completed").length}{" "}
            completed · a lovely start
          </p>
        )}
      </article>
      <article className={`${s.metricCard} ${s.accentMetric}`}>
        <div className={s.metricTop}>
          <span>Completed appointment value</span>
          <ArrowUpRight size={19} />
        </div>
        <div className={s.metricValue}>
          {period === "week" ? "84,200" : "342,800"}
          <small>MKD</small>
        </div>
        <div className={s.miniBars} aria-hidden="true">
          {[33, 53, 44, 71, 51, 82, 100, 65, 89, 73, 95, 114].map(
            (height, index) => (
              <i
                key={index}
                style={{ height: `${height / (soft ? 2 : 2.2)}px` }}
              />
            ),
          )}
        </div>
        <div className={s.metricFoot}>
          <span>↗ 12.8%</span>
          <span>vs. previous {period === "week" ? "7" : "30"} days</span>
        </div>
      </article>
      <article className={s.metricCard}>
        <div className={s.metricTop}>
          <span>Calendar occupancy</span>
          <Clock3 size={18} />
        </div>
        <div className={s.metricValue}>
          78<small>%</small>
          <span className={s.metricBadge}>+8% this week</span>
        </div>
        <div className={s.occupancyBar}>
          <span />
        </div>
        <div className={s.metricFoot}>
          <span>
            <i className={s.legendDot} />
            Booked time
          </span>
          <span>22% available</span>
        </div>
      </article>
    </div>
  );
}

export function WeekPicker() {
  const { day, setDay } = usePreview();
  return (
    <div className={s.weekPicker} role="group" aria-label="Appointment date">
      {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => (
        <button
          type="button"
          key={index}
          aria-label={`September ${21 + index}`}
          aria-pressed={day === 21 + index}
          onClick={() => setDay(21 + index)}
        >
          <span>{label}</span>
          <strong>{21 + index}</strong>
          <i data-today={index === 1} />
        </button>
      ))}
    </div>
  );
}

export function AppointmentRow({
  appointment,
  compact = false,
}: {
  appointment: Appointment;
  compact?: boolean;
}) {
  const { showAppointment } = usePreview();
  return (
    <button
      type="button"
      className={s.appointmentRow}
      data-compact={compact}
      onClick={() => showAppointment(appointment)}
    >
      <span className={s.appointmentTime}>
        {appointment.time}
        <small>{appointment.duration} min</small>
      </span>
      <span className={s.avatar} data-tone={appointment.tone}>
        {initials(appointment.name)}
      </span>
      <span className={s.appointmentPerson}>
        <strong>{appointment.name}</strong>
        <span>
          {appointment.service}
          {!compact && ` · ${appointment.staff}`}
        </span>
      </span>
      {!compact && (
        <span className={s.appointmentStatus} data-status={appointment.status}>
          <i />
          {appointment.status}
        </span>
      )}
      <span className={s.rowArrow}>
        {appointment.status === "Completed" ? (
          <Check size={15} />
        ) : (
          <ArrowUpRight size={16} />
        )}
      </span>
    </button>
  );
}

export function Schedule({ compact = false }: { compact?: boolean }) {
  const {
    appointments,
    day,
    setDay,
    search,
    setSearch,
    staffFilter,
    setStaffFilter,
  } = usePreview();
  const filtered = appointments
    .filter(
      (item) =>
        item.day === day &&
        (staffFilter === "Everyone" || item.staff === staffFilter) &&
        `${item.name} ${item.service}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => a.time.localeCompare(b.time));
  return (
    <section className={`${s.panel} ${s.schedule}`} id="schedule">
      <PanelHeading
        title={compact ? "Your schedule" : "Your appointment schedule"}
        subtitle="One appointment at a time."
      >
        <span className={s.countPill}>
          {appointments.filter((item) => item.day === day).length} appointments
        </span>
      </PanelHeading>
      <div className={s.scheduleMonth}>
        <span>September 2026</span>
        <div>
          <button
            type="button"
            className={s.smallIcon}
            aria-label="Previous day"
            disabled={day === 21}
            onClick={() => setDay(day - 1)}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className={s.smallIcon}
            aria-label="Next day"
            disabled={day === 27}
            onClick={() => setDay(day + 1)}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <WeekPicker />
      {!compact && (
        <div className={s.scheduleFilters}>
          <label className={s.searchField}>
            <Search size={15} />
            <input
              aria-label="Search appointments"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Find a client or service"
            />
          </label>
          <label className={s.staffSelect}>
            <Users size={14} />
            <span className={s.srOnly}>Filter by team member</span>
            <select
              value={staffFilter}
              onChange={(event) => setStaffFilter(event.target.value)}
            >
              {["Everyone", ...staff.map((item) => item.name)].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
            <ChevronDown size={12} />
          </label>
        </div>
      )}
      <div className={s.appointmentList}>
        {filtered.map((item) => (
          <AppointmentRow key={item.id} appointment={item} compact={compact} />
        ))}
        {filtered.length === 0 && (
          <div className={s.emptySchedule}>
            <CalendarDays size={25} />
            <strong>A little breathing room.</strong>
            <p>
              {search || staffFilter !== "Everyone"
                ? "No appointments match these filters."
                : "No appointments on this day yet."}
            </p>
          </div>
        )}
      </div>
      <div className={s.scheduleFooter}>
        <span>
          <i />
          {day === 22 ? "Today" : `Sep ${day}`} · Studio hours 09:00–19:00
        </span>
        <span>{filtered.length} shown</span>
      </div>
    </section>
  );
}

export function RevenueChart({ line = false }: { line?: boolean }) {
  const { period } = usePreview();
  const values =
    period === "week" ? [6, 9, 7, 11, 8, 13, 10] : [8, 11, 9, 13, 10, 14, 12];
  return (
    <section className={`${s.panel} ${s.revenue}`} id="insights">
      <PanelHeading
        title="Appointment value"
        subtitle="Value of completed appointments"
      >
        <PeriodSelect />
      </PanelHeading>
      <div className={s.chartSummary}>
        <strong>
          {period === "week" ? "84,200" : "342,800"}
          <small>MKD</small>
        </strong>
        <span>
          <ArrowUpRight size={14} />
          12.8%<small>vs. previous period</small>
        </span>
      </div>
      {line ? (
        <div className={s.lineChart}>
          <div className={s.chartAxis}>
            <span>20k</span>
            <span>15k</span>
            <span>10k</span>
            <span>5k</span>
          </div>
          <div className={s.linePlot}>
            <div className={s.chartGrid}>
              <i />
              <i />
              <i />
              <i />
            </div>
            <svg
              viewBox="0 0 560 160"
              preserveAspectRatio="none"
              aria-label={
                period === "week"
                  ? "Completed appointment value increased over the last 7 days"
                  : "Completed appointment value increased over the last 30 days"
              }
              role="img"
            >
              <path
                d={
                  period === "week"
                    ? "M0 118C35 118 32 55 70 65S113 124 151 96 189 10 232 38 266 100 300 84 344 8 382 29 421 85 450 60 515 25 560 15"
                    : "M0 125C35 122 40 95 70 100S115 40 151 70 191 75 232 54 275 13 300 39 344 83 382 60 423 12 450 30 515 18 560 5"
                }
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      ) : (
        <StripedBarChart
          label="Completed appointment value by period"
          maximum={period === "week" ? 20000 : 70000}
          axisLabels={
            period === "week" ? ["20k", "10k", "0"] : ["70k", "35k", "0"]
          }
          points={values.map((value, index) => {
            const total = period === "week" ? 84200 : 342800;
            const sum = values.reduce((a, b) => a + b, 0);
            const before = values.slice(0, index).reduce((a, b) => a + b, 0);
            const amount =
              Math.round((total * (before + value)) / sum) -
              Math.round((total * before) / sum);
            const label = (
              period === "week"
                ? ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"]
                : [
                    "Aug 24–27",
                    "Aug 28–31",
                    "Sep 1–4",
                    "Sep 5–9",
                    "Sep 10–13",
                    "Sep 14–17",
                    "Sep 18–22",
                  ]
            )[index];
            return {
              label,
              value: amount,
              detail: `${label}: ${amount.toLocaleString("en-US")} MKD`,
            };
          })}
        />
      )}
      {line && (
        <div className={s.chartLabels}>
          {(period === "week"
            ? ["Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"]
            : ["Aug 24", "29", "Sep 3", "8", "13", "18", "22"]
          ).map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      )}
    </section>
  );
}

export function OpenSlots({ dark = false }: { dark?: boolean }) {
  const { newAppointment, appointments } = usePreview();
  const available = openings.filter(
    (slot) =>
      !appointments.some(
        (item) =>
          item.day === 22 &&
          item.time === slot.time &&
          item.staff === slot.staff,
      ),
  );
  return (
    <section className={`${s.panel} ${s.openSlots}`} data-dark={dark}>
      <div className={s.openSlotsTitle}>
        <span className={s.roundIcon}>
          <ArrowDownLeft size={20} />
        </span>
        <span>AVAILABLE TODAY</span>
      </div>
      <h2>
        {available.length
          ? `${available.length} ${available.length === 1 ? "opening" : "openings"}.`
          : "All filled."}
        <br />
        {available.length ? "Make room for more." : "A fuller day."}
      </h2>
      <p>
        {available.length
          ? "Book a client into an available slot."
          : "Your sample openings have been booked."}
      </p>
      <div className={s.openingList}>
        {available.map((slot) => (
          <button
            type="button"
            key={slot.time}
            onClick={() => newAppointment({ ...slot, day: 22 })}
          >
            <strong>{slot.time}</strong>
            <span>
              {slot.duration} min · {slot.staff}
            </span>
            <ArrowUpRight size={17} />
          </button>
        ))}
      </div>
      <span className={s.openSlotsFooter}>Tuesday, Sep 22 · Book manually</span>
    </section>
  );
}

export function NextClient({ feature = false }: { feature?: boolean }) {
  const { appointments, showAppointment } = usePreview();
  const next = appointments
    .filter((item) => item.day === 22 && item.status !== "Completed")
    .sort((a, b) => a.time.localeCompare(b.time))[0];
  if (!next)
    return (
      <section className={s.panel}>
        <PanelHeading
          title="All done for today"
          subtitle="Time for a well-earned pause."
        />
      </section>
    );
  return (
    <section className={`${s.panel} ${s.nextClient}`} data-feature={feature}>
      <PanelHeading title="Up next">
        <span className={s.livePill}>
          <i />
          {next.status === "Arrived" ? "Client arrived" : next.time}
        </span>
      </PanelHeading>
      {feature && (
        <div className={s.clientArtwork}>
          <div className={s.artPetals} aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className={s.clientMonogram}>{initials(next.name)}</span>
          <span className={s.artCaption}>
            A familiar face.
            <br />A little me-time.
          </span>
          <span className={s.artTag}>
            {next.visits} {next.visits === 1 ? "visit" : "visits"}
          </span>
        </div>
      )}
      <div className={s.clientIdentity}>
        {!feature && (
          <span className={s.avatar} data-tone={next.tone}>
            {initials(next.name)}
          </span>
        )}
        <div>
          <h3>{next.name}</h3>
          <p>{next.service}</p>
        </div>
      </div>
      <div className={s.clientFacts}>
        <div>
          <Clock3 size={15} />
          <strong>{next.time}</strong>
          <span>{next.duration} min</span>
        </div>
        <div>
          <Scissors size={15} />
          <strong>{next.staff}</strong>
          <span>Your team</span>
        </div>
        <div>
          <Wallet size={15} />
          <strong>{money(next.price)}</strong>
          <span>MKD</span>
        </div>
      </div>
      <div className={s.clientNote}>
        <span>GOOD TO KNOW</span>
        <p>Prefers a natural finish. Loves a quiet appointment.</p>
      </div>
      <button
        type="button"
        className={s.clientButton}
        onClick={() => showAppointment(next)}
      >
        View appointment
        <ArrowUpRight size={17} />
      </button>
    </section>
  );
}

export function TeamWidget() {
  const { appointments } = usePreview();
  return (
    <section className={`${s.panel} ${s.teamWidget}`} id="team">
      <PanelHeading
        title="Team availability"
        subtitle="Today’s bookings and working hours"
      >
        <span className={s.countPill}>3 on shift</span>
      </PanelHeading>
      <div className={s.teamMembers}>
        {staff.map((person) => (
          <div className={s.teamMember} key={person.name}>
            <span className={s.avatar} data-tone={person.tone}>
              {person.initials}
            </span>
            <div className={s.teamInfo}>
              <strong>{person.name}</strong>
              <span>{person.role}</span>
              <div className={s.teamProgress}>
                <i style={{ width: `${person.load}%` }} />
              </div>
            </div>
            <div className={s.teamCount}>
              <strong>
                {
                  appointments.filter(
                    (item) => item.day === 22 && item.staff === person.name,
                  ).length
                }
              </strong>
              <span>bookings</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ServicesWidget({ tiles = false }: { tiles?: boolean }) {
  const { newAppointment } = usePreview();
  return (
    <section className={`${s.panel} ${s.servicesWidget}`}>
      <PanelHeading
        title={tiles ? "Popular services" : "Popular services"}
        subtitle="Completed appointments · last 7 days"
      />
      <div className={tiles ? s.serviceTiles : s.serviceBars}>
        {services.slice(0, 4).map((service, index) =>
          tiles ? (
            <button
              type="button"
              className={s.serviceTile}
              key={service.name}
              onClick={() => newAppointment({ service: service.name })}
            >
              <span className={s.serviceTileArt} data-tone={service.tone}>
                <span className={s.serviceSculpture} data-shape={index} />
                <span className={s.serviceNumber}>0{index + 1}</span>
                <ArrowUpRight size={16} />
              </span>
              <strong>{service.name}</strong>
              <span>
                {service.count} bookings <i />
                {money(service.price)} MKD
              </span>
            </button>
          ) : (
            <div className={s.serviceBar} key={service.name}>
              <div>
                <span>{service.name}</span>
                <strong>
                  {service.count}
                  <small> bookings</small>
                </strong>
              </div>
              <div className={s.serviceTrack}>
                <i
                  data-tone={service.tone}
                  style={{ width: `${(service.count / 32) * 100}%` }}
                />
              </div>
            </div>
          ),
        )}
      </div>
    </section>
  );
}

export function DayCard() {
  return (
    <article className={s.dayCard}>
      <Sun size={30} strokeWidth={1.5} />
      <span>TUESDAY</span>
      <strong>
        22<span>September</span>
      </strong>
      <small>A fresh start. A full calendar.</small>
    </article>
  );
}

export function FocusStats() {
  const { appointments } = usePreview();
  const today = appointments.filter((item) => item.day === 22);
  return (
    <div className={s.focusStats}>
      <article className={s.focusStat}>
        <span>
          <CalendarDays size={18} />
          Appointments
        </span>
        <strong>{today.length}</strong>
        <Sparkline />
        <small>
          {today.filter((item) => item.status === "Completed").length} completed
          today
        </small>
      </article>
      <article className={s.focusStat}>
        <span>
          <Wallet size={18} />
          Today’s booked value
        </span>
        <strong>
          {money(today.reduce((total, item) => total + item.price, 0))}
          <small> MKD</small>
        </strong>
        <span className={s.statBottom}>
          Scheduled appointment value
          <ArrowUpRight size={15} />
        </span>
      </article>
    </div>
  );
}

export function StudioChecklist() {
  const [checked, setChecked] = useState([true, false, false]);
  return (
    <section className={`${s.panel} ${s.checklist}`}>
      <PanelHeading
        title="Studio checklist"
        subtitle={`${checked.filter(Boolean).length} of 3 done`}
      />
      <div>
        {[
          "Set up the stations",
          "Review tomorrow’s hours",
          "Update service photos",
        ].map((task, index) => (
          <label key={task}>
            <input
              type="checkbox"
              checked={checked[index]}
              onChange={() =>
                setChecked((current) =>
                  current.map((value, i) => (i === index ? !value : value)),
                )
              }
            />
            <span className={s.customCheck}>
              {checked[index] && <Check size={12} />}
            </span>
            <span>{task}</span>
          </label>
        ))}
      </div>
      <span className={s.checklistNote}>Your daily essentials</span>
    </section>
  );
}

export function AddWidget() {
  const [added, setAdded] = useState(false);
  return added ? (
    <section className={s.noteWidget}>
      <div>
        <span>STUDIO NOTE</span>
        <button
          type="button"
          aria-label="Remove note widget"
          onClick={() => setAdded(false)}
        >
          <Settings2 size={16} />
        </button>
      </div>
      <textarea
        aria-label="Studio note"
        defaultValue="Fresh towels, good coffee, a lovely day ahead."
      />
      <small>Editable demo note</small>
    </section>
  ) : (
    <button
      type="button"
      className={s.addWidget}
      onClick={() => setAdded(true)}
    >
      <span>
        <Plus size={24} />
      </span>
      Add a note widget
    </button>
  );
}

export function ReturningClients() {
  return (
    <section className={`${s.panel} ${s.returning}`}>
      <PanelHeading
        title="Returning clients"
        subtitle="Clients who keep coming back"
      />
      <div className={s.returningBody}>
        <div
          className={s.returningRing}
          style={{ "--progress": "72%" } as CSSProperties}
        >
          <span>
            72<small>%</small>
          </span>
        </div>
        <div>
          <strong>
            Strong relationships,
            <br />
            built over time.
          </strong>
          <p>
            36 of 50 clients returned
            <br />
            in the last 30 days.
          </p>
          <span>
            <ArrowUpRight size={14} />
            8% more than last month
          </span>
        </div>
      </div>
    </section>
  );
}

export function BookingLink() {
  const { newAppointment } = usePreview();
  return (
    <div className={s.bookingLink}>
      <span className={s.bookingLinkMark}>
        <CalendarDays size={19} />
      </span>
      <div>
        <strong>Add your next appointment</strong>
        <span>Find a time that works for your client.</span>
      </div>
      <button
        type="button"
        onClick={() => newAppointment()}
        aria-label="Create a new appointment"
      >
        <ArrowRight size={20} />
      </button>
    </div>
  );
}
