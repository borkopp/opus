"use client";

import { ArrowUpRight, ChevronDown, Plus, Scissors } from "lucide-react";
import { usePreview } from "./preview-context";
import {
  AddWidget,
  BookingLink,
  Brand,
  DayCard,
  FocusStats,
  Greeting,
  HeaderActions,
  Metrics,
  Navigation,
  NextClient,
  OpenSlots,
  ReturningClients,
  RevenueChart,
  Schedule,
  ServicesWidget,
  StudioChecklist,
  TeamWidget,
} from "./widgets";
import s from "../preview.module.css";

export function Clarity() {
  return (
    <main className={`${s.dashboard} ${s.clarity}`} id="overview">
      <header className={s.topbar}>
        <Brand />
        <Navigation />
        <HeaderActions />
      </header>
      <div className={s.clarityBody}>
        <div className={s.clarityMain}>
          <Greeting />
          <Metrics />
          <RevenueChart />
          <div className={s.bottomPair}>
            <TeamWidget />
            <ServicesWidget />
          </div>
          <Schedule />
        </div>
        <aside className={s.clarityAside}>
          <div className={s.studioLabel}>
            <span>
              <i />
              Luna Beauty Studio
            </span>
            <Scissors size={15} />
          </div>
          <NextClient />
          <OpenSlots />
          <ReturningClients />
        </aside>
      </div>
    </main>
  );
}

export function Focus() {
  const { newAppointment, showNotifications } = usePreview();
  return (
    <main className={`${s.dashboard} ${s.focus}`} id="overview">
      <aside className={s.focusRail}>
        <Brand compact />
        <Navigation rail />
        <div className={s.railBottom}>
          <button
            type="button"
            aria-label="Create appointment"
            onClick={() => newAppointment()}
          >
            <Plus size={22} />
          </button>
          <button
            type="button"
            aria-label="View studio updates"
            onClick={showNotifications}
          >
            <span>EP</span>
          </button>
        </div>
      </aside>
      <div className={s.focusMain}>
        <header className={s.focusHeader}>
          <div>
            <span>YOUR DAILY WORKSPACE</span>
            <h1>
              A good morning, <strong>Elena.</strong>
            </h1>
          </div>
          <HeaderActions />
        </header>
        <div className={s.focusTop}>
          <DayCard />
          <FocusStats />
        </div>
        <div className={s.focusMiddle}>
          <StudioChecklist />
          <RevenueChart line />
        </div>
        <Schedule />
        <TeamWidget />
        <BookingLink />
      </div>
      <aside className={s.focusAside}>
        <div className={s.studioLabel}>
          <span>
            <i />
            Luna Beauty Studio
          </span>
          <Scissors size={15} />
        </div>
        <NextClient />
        <OpenSlots dark />
        <ServicesWidget />
        <div className={s.focusAsideFooter}>
          <span>
            Less admin.
            <br />
            More of what you love.
          </span>
          <ArrowUpRight size={23} />
        </div>
      </aside>
    </main>
  );
}

export function Studio() {
  const { newAppointment } = usePreview();
  return (
    <main className={`${s.dashboard} ${s.studio}`} id="overview">
      <header className={s.topbar}>
        <Brand />
        <Navigation />
        <HeaderActions />
      </header>
      <div className={s.studioBody}>
        <div className={s.studioMain}>
          <Greeting soft />
          <div className={s.studioMetrics}>
            <Metrics soft />
            <AddWidget />
          </div>
          <div className={s.studioMiddle}>
            <ReturningClients />
            <ServicesWidget tiles />
          </div>
          <Schedule />
          <div className={s.bottomPair}>
            <RevenueChart line />
            <TeamWidget />
          </div>
        </div>
        <aside className={s.studioAside}>
          <div className={s.studioLabel}>
            <span>
              <i />
              Luna Beauty Studio
            </span>
            <Scissors size={15} />
          </div>
          <NextClient feature />
          <OpenSlots />
          <button
            className={s.studioQuickAdd}
            type="button"
            onClick={() => newAppointment()}
          >
            <span>
              Good things
              <br />
              start with a booking.
            </span>
            <span className={s.roundIcon}>
              <Plus size={24} />
            </span>
          </button>
        </aside>
      </div>
      <footer className={s.studioFooter}>
        <span>Made for the way your studio works.</span>
        <span>
          Tuesday, 22 September
          <ChevronDown size={13} />
        </span>
      </footer>
    </main>
  );
}
