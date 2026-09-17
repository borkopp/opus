/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BatteryFull,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Heart,
  Infinity,
  LockKeyhole,
  MessagesSquare,
  MonitorSmartphone,
  Plus,
  RotateCw,
  SignalHigh,
  Sparkle,
  Sparkles,
  Sun,
} from "lucide-react";
import { CloudShader } from "@/components/landing/cloud-shader";
import { LandingInteractions } from "@/components/landing/landing-interactions";

export default function HomePage() {
  return (
    <>
      <main id="main">
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-background" aria-hidden="true">
            <CloudShader />
          </div>
          <div className="hero-copy">
            <h1 id="hero-title">
              Your craft. Your studio.
              <br />
              <span>A little more effortless.</span>
            </h1>
            <p>
              Your own booking website, a calmer calendar, and AI on your side.
              <br className="desktop-break" /> Meet the space where your beauty
              business comes together.
            </p>
            <div className="hero-actions">
              <a
                className="button button-dark"
                href="https://studio.opus.mk/signup"
              >
                Create your free website <span><ArrowUpRight aria-hidden="true" /></span>
              </a>
              <a className="button button-light" href="#product">
                Learn more
              </a>
            </div>
            <div className="microcopy">
              <span><Check aria-hidden="true" /> Free</span>
              <span><Check aria-hidden="true" /> No credit card</span>
              <span><Check aria-hidden="true" /> Made for your studio</span>
            </div>
          </div>
          <div
            className="hero-stage"
            aria-label="OPUS booking and calendar product preview"
          >
            <div className="floating-note note-left">
              <span className="note-icon"><Check aria-hidden="true" /></span>
              <div>
                <strong>A new booking. Zero messages.</strong>
                <small>Eva booked a haircut for Friday.</small>
              </div>
              <span className="note-time">now</span>
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
                <span className="window-dots"><Ellipsis aria-hidden="true" /></span>
              </div>
              <div className="calendar-title">
                <div>
                  <h3>
                    Good morning, Ana <span><Sun aria-hidden="true" /></span>
                  </h3>
                </div>
                <span className="calendar-date">Thu, 17 Sep</span>
              </div>
              <div className="calendar-team">
                <span>Today’s calendar</span>
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
                  <div className="staff">Ana</div>
                  <div className="appointment apt-blue">
                    <b>Cut &amp; blow-dry</b>
                    <span>09:00 – 10:00 · Elena P.</span>
                  </div>
                  <div className="appointment apt-cream">
                    <b>Hair treatment</b>
                    <span>10:30 – 11:15 · Mila S.</span>
                  </div>
                </div>
                <div className="day-column">
                  <div className="staff">Marija</div>
                  <div className="appointment apt-purple">
                    <b>Gel manicure</b>
                    <span>09:30 – 10:30 · Sara K.</span>
                  </div>
                  <div className="appointment apt-green">
                    <b>Classic manicure</b>
                    <span>11:00 – 11:45 · Eva M.</span>
                  </div>
                </div>
              </div>
              <div className="calendar-footer">
                <span>
                  <i></i> Everything in its right place.
                </span>
                <span>View calendar <ArrowUpRight aria-hidden="true" /></span>
              </div>
            </div>
            <div className="phone phone-hero">
              <div className="phone-island"></div>
              <div className="phone-status">
                <span>9:41</span>
                <span className="phone-status-icons"><SignalHigh aria-hidden="true" /><BatteryFull aria-hidden="true" /></span>
              </div>
              <div className="phone-url">
                <span><LockKeyhole aria-hidden="true" /></span> atelier.opus.mk <span><RotateCw aria-hidden="true" /></span>
              </div>
              <div className="studio-cover">
                <div className="studio-cover-shade"></div>
                <span>
                  ATELIER
                  <br />
                  <small>BEAUTY STUDIO</small>
                </span>
              </div>
              <div className="phone-content">
                <div className="studio-location">
                  SKOPJE, MACEDONIA <span><ArrowUpRight aria-hidden="true" /></span>
                </div>
                <h3>A moment for you.</h3>
                <p>Good hair. Good energy. Your time.</p>
                <div className="phone-tabs">
                  <b>Services</b>
                  <span>Our team</span>
                  <span>About</span>
                </div>
                <div className="phone-service">
                  <span>
                    <b>Cut &amp; blow-dry</b>
                    <small>60 min · from 900 MKD</small>
                  </span>
                  <span className="service-plus"><Plus aria-hidden="true" /></span>
                </div>
                <div className="phone-service">
                  <span>
                    <b>Color &amp; care</b>
                    <small>90 min · from 1,800 MKD</small>
                  </span>
                  <span className="service-plus"><Plus aria-hidden="true" /></span>
                </div>
                <div className="phone-service">
                  <span>
                    <b>A little refresh</b>
                    <small>30 min · from 500 MKD</small>
                  </span>
                  <span className="service-plus"><Plus aria-hidden="true" /></span>
                </div>
                <span className="mock-button">
                  Find your moment <span><ArrowUpRight aria-hidden="true" /></span>
                </span>
                <small className="powered">
                  Made possible with{" "}
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
              <span className="note-icon ai-note-icon"><Sparkles aria-hidden="true" /></span>
              <div>
                <strong>Your next good idea, found.</strong>
                <small>Ask OPUS AI about your business.</small>
              </div>
            </div>
            <div className="stage-caption">
              <span className="caption-line"></span> LESS ADMIN. MORE YOU.{" "}
              <span className="caption-line"></span>
            </div>
          </div>
          <div className="audience-strip">
            <span>Made for the way you work</span>
            <div>
              <span>Hair salons</span>
              <i><Sparkle aria-hidden="true" /></i>
              <span>Barbershops</span>
              <i><Sparkle aria-hidden="true" /></i>
              <span>Nail studios</span>
              <i><Sparkle aria-hidden="true" /></i>
              <span>Makeup artists</span>
              <i><Sparkle aria-hidden="true" /></i>
              <span>Massage studios</span>
            </div>
          </div>
        </section>
        <section className="section product-section" id="product">
          <div className="section-heading centered reveal">
            <h2>
              From “Are you free?”
              <br />
              to “See you then.”
            </h2>
            <p>
              Let your link do the scheduling.
              <br />
              You get back to doing what you do best.
            </p>
          </div>
          <div
            className="tour-tabs"
            role="tablist"
            aria-label="Explore OPUS features"
          >
            <button
              role="tab"
              id="tab-website"
              aria-controls="tour-panel"
              aria-selected="true"
              data-tour="website"
            >
              <span><ArrowUpRight aria-hidden="true" /></span> Your booking website
            </button>
            <button
              role="tab"
              id="tab-calendar"
              aria-controls="tour-panel"
              aria-selected="false"
              tabIndex={-1}
              data-tour="calendar"
            >
              <span><CalendarDays aria-hidden="true" /></span> One team calendar
            </button>
            <button
              role="tab"
              id="tab-clients"
              aria-controls="tour-panel"
              aria-selected="false"
              tabIndex={-1}
              data-tour="clients"
            >
              <span><Heart aria-hidden="true" /></span> Every client, remembered
            </button>
          </div>
          <div className="tour-surround reveal">
            <div className="tour-browser">
              <div className="browser-chrome">
                <div className="browser-dots">
                  <i></i>
                  <i></i>
                  <i></i>
                </div>
                <span id="tour-address">atelier.opus.mk</span>
                <span className="demo-label">INTERACTIVE PREVIEW</span>
              </div>
              <div
                id="tour-panel"
                role="tabpanel"
                aria-labelledby="tab-website"
                tabIndex={0}
              ></div>
            </div>
            <div className="tour-footnote">
              <span>
                <Sparkle aria-hidden="true" /> Your name. Your services. Your little corner of the internet.
              </span>
              <span>
                Included in Free <b><ArrowUpRight aria-hidden="true" /></b>
              </span>
            </div>
          </div>
          <div className="product-bottom reveal">
            <h3>
              Easy for your clients.
              <br />
              Even easier for you.
            </h3>
            <p>
              No account. No app. Just pick a service, choose a time,
              <br className="desktop-break" /> and book. Every appointment lands
              in your calendar.
            </p>
            <a className="text-link" href="https://studio.opus.mk/signup">
              Make it yours <span><ArrowUpRight aria-hidden="true" /></span>
            </a>
          </div>
        </section>

        <section className="section features-section" id="features">
          <div className="split-heading reveal">
            <div>
              <h2>
                A beautiful business.
                <br />A beautifully simple day.
              </h2>
            </div>
            <p>
              Everything your studio needs, together in one place.
              <br />
              Less switching between apps. More being present.
            </p>
          </div>
          <div className="bento-grid">
            <article className="bento-panel bento-booking reveal">
              <img
                className="bento-art"
                src="/assets/bento-booking.jpg"
                alt="A titanium phone displaying a beauty studio booking website, rendered in a sculptural blue setting"
                width="1024"
                height="1536"
                loading="lazy"
              />
              <div className="bento-copy">
                <h3>
                  Your studio.
                  <br />
                  One beautiful link.
                </h3>
                <p>
                  A booking website that feels like you.
                  <br />
                  Ready whenever your clients are.
                </p>
              </div>
              <div className="bento-link-detail">
                <span>yourstudio.opus.mk</span>
                <span aria-hidden="true"><ArrowUpRight aria-hidden="true" /></span>
              </div>
            </article>
            <article className="bento-panel bento-calendar reveal">
              <img
                className="bento-art"
                src="/assets/bento-calendar.jpg"
                alt="A dimensional glass calendar with neatly arranged blue appointment blocks on a graphite backdrop"
                width="1536"
                height="1024"
                loading="lazy"
              />
              <div className="bento-copy">
                <h3>
                  One team.
                  <br />
                  One clear picture.
                </h3>
                <p>
                  Appointments, breaks, and days off. Beautifully in sync, with
                  protection against overlaps.
                </p>
              </div>
            </article>
            <article className="bento-panel bento-clients reveal">
              <img
                className="bento-art"
                src="/assets/bento-clients.jpg"
                alt="Frosted client profile cards with a portrait and a translucent glass heart"
                width="1254"
                height="1254"
                loading="lazy"
              />
              <div className="bento-copy">
                <h3>
                  Every client.
                  <br />A familiar face.
                </h3>
                <p>
                  Contact details and visit history.
                  <br />A more personal touch.
                </p>
              </div>
            </article>
            <article className="bento-panel bento-reminders reveal">
              <img
                className="bento-art"
                src="/assets/bento-reminders.jpg"
                alt="An open pearl envelope with a floating blue appointment card and a small confirmation seal"
                width="1254"
                height="1254"
                loading="lazy"
              />
              <div className="bento-copy">
                <h3>
                  A little reminder.
                  <br />
                  One less thing to do.
                </h3>
                <p>
                  Email confirmations and reminders.
                  <br />
                  We’ll keep your clients in the loop.
                </p>
              </div>
            </article>
          </div>
          <div className="feature-summary">
            <span><Infinity aria-hidden="true" /> Unlimited appointments</span>
            <span><Infinity aria-hidden="true" /> Unlimited services &amp; clients</span>
            <span><MonitorSmartphone aria-hidden="true" /> Works on every device</span>
          </div>
        </section>

        <section className="intelligence-section" id="intelligence">
          <div className="section-heading centered reveal">
            <h2>
              You know your craft.
              <br />
              Now, know your business.
            </h2>
            <p>
              A fresh perspective on your studio, powered by AI.
              <br />
              Less guesswork. More room to grow.
            </p>
          </div>
          <div className="intelligence-main reveal">
            <div className="intelligence-art">
              <img
                src="/assets/opus-logo-3d.jpg"
                alt="The OPUS symbol sculpted in ice-blue glass and pearl chrome"
                width="1254"
                height="1254"
                loading="lazy"
              />
              <div className="intelligence-art-copy">
                <h3>
                  A little clarity.
                  <br />A world of possibility.
                </h3>
              </div>
            </div>
            <div className="analyst">
              <div className="analyst-top">
                <span className="analyst-icon"><Sparkles aria-hidden="true" /></span>
                <div>
                  <b>Your business analyst</b>
                  <span>Good questions. Clearer decisions.</span>
                </div>
              </div>
              <div className="analyst-example">
                <span className="example-label">
                  EXPLORE A SAMPLE CONVERSATION
                </span>
                <div className="question-bubble" id="analyst-question">
                  When is my studio busiest?
                </div>
                <div className="analyst-answer">
                  <span className="blue-spark"><Sparkles aria-hidden="true" /></span>
                  <div>
                    <p id="analyst-answer">
                      In this sample week, Friday is your busiest day. Tuesday
                      has the most space for new appointments.
                    </p>
                    <div
                      className="bar-chart"
                      id="analyst-chart"
                      aria-label="Illustrative weekly occupancy chart"
                    >
                      <div>
                        <i style={{ "--bar": "48%" } as CSSProperties}></i>
                        <span>M</span>
                      </div>
                      <div>
                        <i style={{ "--bar": "30%" } as CSSProperties}></i>
                        <span>T</span>
                      </div>
                      <div>
                        <i style={{ "--bar": "65%" } as CSSProperties}></i>
                        <span>W</span>
                      </div>
                      <div>
                        <i style={{ "--bar": "56%" } as CSSProperties}></i>
                        <span>T</span>
                      </div>
                      <div className="highlight-bar">
                        <i style={{ "--bar": "92%" } as CSSProperties}></i>
                        <span>F</span>
                      </div>
                      <div>
                        <i style={{ "--bar": "76%" } as CSSProperties}></i>
                        <span>S</span>
                      </div>
                    </div>
                    <span className="sample-note">
                      Illustrative data · Your answers use your studio’s data.
                    </span>
                  </div>
                </div>
              </div>
              <div
                className="question-options"
                aria-label="Sample business analyst questions"
              >
                <button
                  className="selected"
                  data-question="busy"
                  aria-pressed="true"
                >
                  My busiest days?
                </button>
                <button data-question="cancel" aria-pressed="false">
                  Cancellation patterns?
                </button>
                <button data-question="grow" aria-pressed="false">
                  Room to grow?
                </button>
              </div>
              <div className="analyst-limit">
                <span>200 answers / month</span>
                <span>Up to 20 detailed analyses</span>
              </div>
            </div>
          </div>
          <div className="ai-features">
            <article className="ai-card reveal">
              <span className="card-icon"><MessagesSquare aria-hidden="true" /></span>
              <h3>
                Always there.
                <br />
                Even when you’re busy.
              </h3>
              <p>
                Your 24/7 AI receptionist keeps conversations moving on web
                chat, Instagram, and WhatsApp.
              </p>
              <div className="channel-chips">
                <span>Web chat</span>
                <span>Instagram</span>
                <span>WhatsApp</span>
              </div>
              <small>500 replies included per month.</small>
            </article>
            <article className="ai-card reveal">
              <span className="card-icon"><Sparkle aria-hidden="true" /></span>
              <h3>
                The next visit.
                <br />A little more personal.
              </h3>
              <p>
                AI uses previous visits to suggest thoughtful rebookings and
                relevant service upgrades for each client.
              </p>
              <div className="suggestion-chip">
                <span><Heart aria-hidden="true" /></span>
                <span>Personalized to their visit history</span>
              </div>
              <small>Suggestions to help you decide what fits.</small>
            </article>
            <article className="ai-card recovery-card reveal">
              <span className="card-icon"><RotateCw aria-hidden="true" /></span>
              <h3>
                An open slot.
                <br />A new opportunity.
              </h3>
              <p>
                Find suitable clients for an opening, review the suggestion, and
                approve each email offer yourself.
              </p>
              <div className="recovery-flow">
                <span>Find</span>
                <b><ArrowRight aria-hidden="true" /></b>
                <span>Review</span>
                <b><ArrowRight aria-hidden="true" /></b>
                <span>Approve</span>
              </div>
              <small>No AI required. No automatic bookings.</small>
            </article>
          </div>
          <p className="ai-usage-note">
            AI features are included in Pro and subject to usage limits.
          </p>
        </section>

        <section className="section studio-carousel-section" id="your-studio">
          <div className="split-heading reveal">
            <div>
              <h2>
                Your craft. Your people.
                <br />
                Your kind of studio.
              </h2>
            </div>
            <p>
              For the people who make people feel their best. Find your place in
              a simpler studio day.
            </p>
          </div>
          <div
            className="studio-carousel reveal"
            role="region"
            aria-roledescription="carousel"
            aria-label="Studios made for OPUS"
          >
            <div className="studio-carousel-stage">
              <button
                type="button"
                className="studio-slide"
                data-studio-index="0"
                data-offset="0"
                aria-label="Explore hair salons"
                aria-pressed="true"
                tabIndex={0}
              >
                <img
                  src="/assets/studio-hair.jpg"
                  alt="Silver salon scissors, a blue glass comb, and flowing hair in a sculptural beauty still life"
                  width="1024"
                  height="1536"
                  loading="lazy"
                  draggable={false}
                />
                <span className="studio-slide-copy">
                  <span className="studio-slide-title">Hair salons</span>
                  <span className="studio-slide-description">
                    From the first trim to a full transformation. Make room for
                    every kind of good hair day.
                  </span>
                  <span className="studio-slide-footer">
                    Your craft. A little more effortless.
                    <span aria-hidden="true"><ArrowUpRight aria-hidden="true" /></span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="studio-slide"
                data-studio-index="1"
                data-offset="1"
                aria-label="Explore barbershops"
                aria-pressed="false"
                tabIndex={-1}
              >
                <img
                  src="/assets/studio-barber.jpg"
                  alt="A premium chrome barber chair in a quiet ice-blue studio"
                  width="1024"
                  height="1536"
                  loading="lazy"
                  draggable={false}
                />
                <span className="studio-slide-copy">
                  <span className="studio-slide-title">Barbershops</span>
                  <span className="studio-slide-description">
                    Fresh cuts. Familiar faces. A clear schedule that keeps your
                    chair moving.
                  </span>
                  <span className="studio-slide-footer">
                    Your craft. A little more effortless.
                    <span aria-hidden="true"><ArrowUpRight aria-hidden="true" /></span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="studio-slide"
                data-studio-index="2"
                data-offset="2"
                aria-label="Explore nail studios"
                aria-pressed="false"
                tabIndex={-1}
              >
                <img
                  src="/assets/studio-nails.jpg"
                  alt="Sculptural nail polish bottles and a hand with a pearl manicure"
                  width="1024"
                  height="1536"
                  loading="lazy"
                  draggable={false}
                />
                <span className="studio-slide-copy">
                  <span className="studio-slide-title">Nail studios</span>
                  <span className="studio-slide-description">
                    For the little details that make a big difference. Every
                    appointment, beautifully organized.
                  </span>
                  <span className="studio-slide-footer">
                    Your craft. A little more effortless.
                    <span aria-hidden="true"><ArrowUpRight aria-hidden="true" /></span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="studio-slide"
                data-studio-index="3"
                data-offset="-2"
                aria-label="Explore makeup artists"
                aria-pressed="false"
                tabIndex={-1}
              >
                <img
                  src="/assets/studio-makeup.jpg"
                  alt="Silver makeup brushes and a pearl compact on a frosted blue plinth"
                  width="1024"
                  height="1536"
                  loading="lazy"
                  draggable={false}
                />
                <span className="studio-slide-copy">
                  <span className="studio-slide-title">Makeup artists</span>
                  <span className="studio-slide-description">
                    Every look starts with a little preparation. Give each
                    client their moment.
                  </span>
                  <span className="studio-slide-footer">
                    Your craft. A little more effortless.
                    <span aria-hidden="true"><ArrowUpRight aria-hidden="true" /></span>
                  </span>
                </span>
              </button>
              <button
                type="button"
                className="studio-slide"
                data-studio-index="4"
                data-offset="-1"
                aria-label="Explore massage studios"
                aria-pressed="false"
                tabIndex={-1}
              >
                <img
                  src="/assets/studio-massage.jpg"
                  alt="Pearl towels, dark spa stones, and a translucent blue vessel"
                  width="1024"
                  height="1536"
                  loading="lazy"
                  draggable={false}
                />
                <span className="studio-slide-copy">
                  <span className="studio-slide-title">Massage studios</span>
                  <span className="studio-slide-description">
                    A calmer way to manage your day. Make space for your clients
                    to slow down.
                  </span>
                  <span className="studio-slide-footer">
                    Your craft. A little more effortless.
                    <span aria-hidden="true"><ArrowUpRight aria-hidden="true" /></span>
                  </span>
                </span>
              </button>
            </div>
            <div className="studio-carousel-controls">
              <button
                className="studio-prev"
                type="button"
                aria-label="Previous studio type"
              >
                <ChevronLeft aria-hidden="true" />
              </button>
              <span className="studio-carousel-count" aria-hidden="true">
                <b>01</b> / 05
              </span>
              <button
                className="studio-next"
                type="button"
                aria-label="Next studio type"
              >
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
            <p
              className="visually-hidden studio-carousel-status"
              aria-live="polite"
              aria-atomic="true"
            >
              Hair salons, 1 of 5
            </p>
          </div>
        </section>

        <section className="section steps-section" id="how-it-works">
          <div className="section-heading centered reveal">
            <h2>
              A few details.
              <br />A whole new way to book.
            </h2>
            <p>
              No website project. No complicated setup.
              <br />
              Just your studio, ready to share.
            </p>
          </div>
          <div className="steps-grid">
            <article className="step reveal">
              <div className="step-visual generated-step">
                <img
                  src="/assets/step-setup.jpg"
                  alt="Floating glass service cards and a silver salon symbol representing studio setup"
                  width="1254"
                  height="1254"
                  loading="lazy"
                />
              </div>
              <h3>Make yourself at home.</h3>
              <p>
                Add your services, prices, team, and working hours. Set your
                breaks and days off.
              </p>
            </article>
            <article className="step reveal">
              <div className="step-visual generated-step">
                <img
                  src="/assets/step-publish.jpg"
                  alt="A glass booking website with a silver link, ready to share"
                  width="1254"
                  height="1254"
                  loading="lazy"
                />
              </div>
              <h3>Publish. Share. You’re live.</h3>
              <p>
                Publish your free website and add your link to Instagram, your
                bio, or a message.
              </p>
            </article>
            <article className="step reveal">
              <div className="step-visual generated-step">
                <img
                  src="/assets/step-booked.jpg"
                  alt="A pearl calendar with a blue appointment tile and a silver confirmation check"
                  width="1254"
                  height="1254"
                  loading="lazy"
                />
              </div>
              <h3>Let the bookings come to you.</h3>
              <p>
                Clients choose a time without an account. New bookings appear in
                your calendar.
              </p>
            </article>
          </div>
          <a
            className="button button-dark"
            href="https://studio.opus.mk/signup"
          >
            Let’s set up your studio <span><ArrowUpRight aria-hidden="true" /></span>
          </a>
        </section>

        <section className="pricing-section" id="pricing">
          <div className="section-heading centered reveal">
            <h2>
              Your ambition.
              <br />
              Your pace. Your plan.
            </h2>
            <p>
              A generous free start. A little extra when you’re ready.
              <br />
              No pressure. Just possibilities.
            </p>
          </div>
          <div className="pricing-grid">
            <article className="price-card reveal">
              <div className="plan-heading">
                <span className="plan-symbol"><Sparkle aria-hidden="true" /></span>
              </div>
              <h3>Free</h3>
              <div className="price">
                0 <span>MKD</span>
              </div>
              <p>Everything you need to welcome your next client.</p>
              <a
                className="button button-light"
                href="https://studio.opus.mk/signup"
              >
                Create your free website <span><ArrowUpRight aria-hidden="true" /></span>
              </a>
              <div className="plan-divider"></div>
              <strong className="included-label">
                A real free plan. No expiry.
              </strong>
              <ul className="plan-features">
                <li><Check aria-hidden="true" /><span>Unlimited appointments, services, and clients</span></li>
                <li><Check aria-hidden="true" /><span>Your own <b>yourstudio.opus.mk</b> website</span></li>
                <li><Check aria-hidden="true" /><span>Guest booking — no client account needed</span></li>
                <li><Check aria-hidden="true" /><span>One owner + 3 staff members</span></li>
                <li><Check aria-hidden="true" /><span>Team calendar with overlap protection</span></li>
                <li><Check aria-hidden="true" /><span>Working hours, breaks, and days off</span></li>
                <li><Check aria-hidden="true" /><span>Client details and visit history</span></li>
                <li><Check aria-hidden="true" /><span>Email confirmations and reminders</span></li>
                <li><Check aria-hidden="true" /><span>Gallery with up to 3 photos</span></li>
                <li><Check aria-hidden="true" /><span>Phone, tablet, and desktop access</span></li>
              </ul>
              <span className="plan-end">
                No credit card. No trial countdown.
              </span>
            </article>
            <article className="price-card price-pro reveal">
              <div className="plan-heading">
                <span className="plan-symbol"><Sparkles aria-hidden="true" /></span>
              </div>
              <h3>Pro</h3>
              <div className="price">
                1,190 <span>MKD / month</span>
              </div>
              <p>The everyday essentials, plus intelligence to grow.</p>
              <a
                className="button button-dark"
                href="https://studio.opus.mk/signup"
              >
                Get started with Pro <span><ArrowUpRight aria-hidden="true" /></span>
              </a>
              <div className="plan-divider"></div>
              <strong className="included-label">
                Everything in Free, plus:
              </strong>
              <ul className="plan-features">
                <li><Check aria-hidden="true" /><span>A larger team</span></li>
                <li><Check aria-hidden="true" /><span>Opening and cancellation recovery</span></li>
                <li><Check aria-hidden="true" /><span>Advanced studio analytics</span></li>
                <li><Check aria-hidden="true" /><span>More email, marketing, and notification controls</span></li>
                <li><Check aria-hidden="true" /><span>Priority support</span></li>
                <li><Check aria-hidden="true" /><span><span>
                    <b>AI business analyst</b>
                    <small>200 answers/month, up to 20 detailed</small>
                  </span></span></li>
                <li><Check aria-hidden="true" /><span><span>
                    <b>24/7 AI receptionist</b>
                    <small>
                      Web chat, Instagram, WhatsApp · 500 replies/month
                    </small>
                  </span></span></li>
                <li><Check aria-hidden="true" /><span><span>
                    <b>Personalized AI recommendations</b>
                    <small>
                      Rebooking and upsells based on previous visits
                    </small>
                  </span></span></li>
              </ul>
              <span className="plan-end">
                AI features are subject to usage limits.
              </span>
            </article>
          </div>
          <p className="pricing-note">
            Your booking website is free. Choose Pro for the tools that take you
            further.
          </p>
        </section>

        <section className="section faq-section" id="faq">
          <div className="faq-intro reveal">
            <h2>
              Good questions.
              <br />
              Simple answers.
            </h2>
            <p>
              A few things you might be wondering
              <br />
              before making yourself at home.
            </p>
            <div className="faq-mini-card">
              <span className="blue-spark"><Sparkle aria-hidden="true" /></span>
              <h3>Try a simpler studio day.</h3>
              <p>Your next chapter can start for free.</p>
              <a className="text-link" href="https://studio.opus.mk/signup">
                Get started <span><ArrowUpRight aria-hidden="true" /></span>
              </a>
            </div>
          </div>
          <div className="faq-list reveal">
            <details open>
              <summary>
                Is the Free plan really free?<span><Plus aria-hidden="true" /></span>
              </summary>
              <p>
                Yes. Free is 0 MKD, with no credit card and no trial expiry. You
                get unlimited appointments, services, and clients, your own
                booking website, and space for one owner plus three staff
                members.
              </p>
            </details>
            <details>
              <summary>
                Do my clients need to download an app?<span><Plus aria-hidden="true" /></span>
              </summary>
              <p>
                No. Clients open your booking link on their phone or computer,
                select a service and time, enter their details, and book. They
                don’t need an account or an app.
              </p>
            </details>
            <details>
              <summary>
                How do I get my own booking website?<span><Plus aria-hidden="true" /></span>
              </summary>
              <p>
                Add your services, prices, team, and working hours, then
                publish. Your website lives at yourstudio.opus.mk. Share that
                link on Instagram or in messages, and bookings appear in your
                calendar.
              </p>
            </details>
            <details>
              <summary>
                Can my team use the same calendar?<span><Plus aria-hidden="true" /></span>
              </summary>
              <p>
                Yes. The Free plan includes one owner and three staff members.
                Manage appointments, availability, breaks, and days off
                together, with protection against overlapping appointments. Pro
                supports a larger team.
              </p>
            </details>
            <details>
              <summary>
                What can I ask the AI business analyst?<span><Plus aria-hidden="true" /></span>
              </summary>
              <p>
                Ask about your bookings, occupancy, cancellations, and business
                patterns. Pro includes 200 answers per month, with up to 20
                detailed analyses, subject to usage limits. The analyst helps
                you understand your business and make decisions.
              </p>
            </details>
            <details>
              <summary>
                Does opening recovery book clients automatically?<span><Plus aria-hidden="true" /></span>
              </summary>
              <p>
                No. Opening recovery suggests suitable clients for empty
                appointments. You review and approve every email offer. This
                workflow doesn’t require AI and doesn’t automatically book
                appointments.
              </p>
            </details>
            <details>
              <summary>
                Which channels does the AI receptionist support?<span><Plus aria-hidden="true" /></span>
              </summary>
              <p>
                The Pro AI receptionist supports web chat, Instagram, and
                WhatsApp, with 500 replies per month. It gives your clients a
                way to get answers around the clock.
              </p>
            </details>
            <details>
              <summary>
                Is OPUS made for my kind of studio?<span><Plus aria-hidden="true" /></span>
              </summary>
              <p>
                OPUS is built for beauty salons, barbershops, nail studios,
                makeup artists, and massage studios in Macedonia. It works on
                phone, tablet, and desktop, for solo professionals and small
                teams.
              </p>
            </details>
          </div>
        </section>

        <section className="final-cta section reveal">
          <img
            className="cta-panorama"
            src="/assets/opus-cta-wide.jpg"
            alt="A dimensional glass and chrome OPUS logo in a wide, softly lit blue studio"
            width="2172"
            height="724"
            loading="lazy"
          />
          <div className="cta-content">
            <h2>
              Less admin.
              <br />
              More beautiful days.
            </h2>
            <p>
              Your free booking website is waiting.
              <br />
              Let’s make it feel like you.
            </p>
            <a
              className="button button-dark"
              href="https://studio.opus.mk/signup"
            >
              Create your free website <span><ArrowUpRight aria-hidden="true" /></span>
            </a>
            <small>Free. No credit card needed.</small>
          </div>
        </section>
      </main>
      <LandingInteractions />
    </>
  );
}
