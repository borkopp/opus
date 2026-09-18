"use client";

/* eslint-disable @next/next/no-img-element */
import {
  ArrowUpRight,
  BatteryFull,
  CalendarDays,
  Check,
  Ellipsis,
  LayoutDashboard,
  LockKeyhole,
  Plus,
  RotateCw,
  Scissors,
  Settings2,
  SignalHigh,
  Sparkles,
  Sun,
  UsersRound,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";

export function HeroShowcase() {
  const { t } = useI18n();

  return (
  <div
    className="hero-stage hero-showcase"
    role="img"
    aria-label={t.hero.previewLabel}
  >
    <div className="hero-showcase-canvas" aria-hidden="true">
      <div className="floating-note note-left">
        <span className="note-icon">
          <Check aria-hidden="true" />
        </span>
        <div>
          <strong>{t.hero.noteBookingTitle}</strong>
          <small>{t.hero.noteBookingDesc}</small>
        </div>
        <span className="note-time">{t.hero.noteBookingTime}</span>
      </div>
      <div className="mock-window calendar-window">
        <div className="window-toolbar">
          <span className="mini-brand" aria-label="OPUS">
            <img
              className="opus-mark"
              src="/assets/opus-mark.svg"
              alt=""
              width="40"
              height="48"
            />
            <span className="opus-wordmark">OPUS</span>
          </span>
          <span className="window-dots">
            <Ellipsis aria-hidden="true" />
          </span>
        </div>
        <div className="showcase-sidebar">
          <span><LayoutDashboard /></span>
          <span className="showcase-sidebar-active"><CalendarDays /></span>
          <span><UsersRound /></span>
          <span><Scissors /></span>
          <span className="showcase-sidebar-bottom"><Settings2 /></span>
        </div>
        <div className="showcase-calendar-content">
        <div className="calendar-title">
          <div>
            <h3>
              {t.hero.calendarGreeting}{" "}
              <span>
                <Sun aria-hidden="true" />
              </span>
            </h3>
          </div>
          <span className="calendar-date">{t.hero.calendarDate}</span>
        </div>
        <div className="calendar-team">
          <span>{t.hero.calendarTitle}</span>
          <span className="avatars">
            <i>A</i>
            <i>M</i>
            <i>E</i>
          </span>
        </div>
        <div className="calendar-grid">
          <div className="time-column">
            <span>09:00</span>
            <span>10:00</span>
            <span>11:00</span>
            <span>12:00</span>
          </div>
          <div className="day-column">
            <div className="staff">{t.hero.calendarStaffAna}</div>
            <div className="appointment apt-blue">
              <b>{t.hero.apt1Title}</b>
              <span>{t.hero.apt1Time}</span>
            </div>
            <div className="appointment apt-cream">
              <b>{t.hero.apt2Title}</b>
              <span>{t.hero.apt2Time}</span>
            </div>
          </div>
          <div className="day-column">
            <div className="staff">{t.hero.calendarStaffMarija}</div>
            <div className="appointment apt-purple">
              <b>{t.hero.apt3Title}</b>
              <span>{t.hero.apt3Time}</span>
            </div>
            <div className="appointment apt-green">
              <b>{t.hero.apt4Title}</b>
              <span>{t.hero.apt4Time}</span>
            </div>
          </div>
        </div>
        <div className="calendar-footer">
          <span>
            <i></i> {t.hero.calendarFooterText}
          </span>
          <span>
            {t.hero.calendarView} <ArrowUpRight aria-hidden="true" />
          </span>
        </div>
      </div>
      </div>
      <div className="phone phone-hero">
        <div className="phone-island"></div>
        <div className="phone-status">
          <span>9:41</span>
          <span className="phone-status-icons">
            <SignalHigh aria-hidden="true" />
            <BatteryFull aria-hidden="true" />
          </span>
        </div>
        <div className="phone-url">
          <span>
            <LockKeyhole aria-hidden="true" />
          </span>{" "}
          atelier.opus.mk{" "}
          <span>
            <RotateCw aria-hidden="true" />
          </span>
        </div>
        <div className="studio-cover">
          <div className="studio-cover-shade"></div>
          <span>
            {t.hero.phoneStudioName}
            <br />
            <small>{t.hero.phoneStudioType}</small>
          </span>
        </div>
        <div className="phone-content">
          <div className="studio-location">
            {t.hero.phoneLocation}{" "}
            <span>
              <ArrowUpRight aria-hidden="true" />
            </span>
          </div>
          <h3>{t.hero.phoneHeading}</h3>
          <p>{t.hero.phoneSubheading}</p>
          <div className="phone-tabs">
            <b>{t.hero.phoneTabServices}</b>
            <span>{t.hero.phoneTabTeam}</span>
            <span>{t.hero.phoneTabAbout}</span>
          </div>
          <div className="phone-service">
            <span>
              <b>{t.hero.phoneService1}</b>
              <small>{t.hero.phoneService1Sub}</small>
            </span>
            <span className="service-plus">
              <Plus aria-hidden="true" />
            </span>
          </div>
          <div className="phone-service">
            <span>
              <b>{t.hero.phoneService2}</b>
              <small>{t.hero.phoneService2Sub}</small>
            </span>
            <span className="service-plus">
              <Plus aria-hidden="true" />
            </span>
          </div>
          <span className="mock-button">
            {t.hero.phoneButton}{" "}
            <span>
              <ArrowUpRight aria-hidden="true" />
            </span>
          </span>
          <small className="powered">
            {t.hero.phonePowered}{" "}
            <b className="mini-brand" aria-label="OPUS">
              <img
                className="opus-mark"
                src="/assets/opus-mark.svg"
                alt=""
                width="40"
                height="48"
              />
              <span className="opus-wordmark">OPUS</span>
            </b>
          </small>
        </div>
        <div className="phone-home"></div>
      </div>
      <div className="floating-note note-right">
        <span className="note-icon ai-note-icon">
          <Sparkles aria-hidden="true" />
        </span>
        <div>
          <strong>{t.hero.noteAiTitle}</strong>
          <small>{t.hero.noteAiDesc}</small>
        </div>
      </div>
    </div>
  
  </div>
  );
}
