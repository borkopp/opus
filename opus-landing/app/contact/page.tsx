"use client";
/* eslint-disable @next/next/no-img-element */
import { useState } from "react";

export default function ContactPage() {
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    try {
      const response = await fetch("https://formspree.io/f/xzdyejrr", {
        method: "POST",
        body: new FormData(event.currentTarget),
        headers: { Accept: "application/json" },
      });
      setStatus(response.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  }
  return (
    <main id="main" className="contact-page">
      <div className="contact-intro">
        <h1>
          A little help.
          <br />A real conversation.
        </h1>
        <p>
          Getting started, finding your feet, or planning your next chapter?
          We’re here for your studio.
        </p>
      </div>
      <div className="contact-grid">
        <section className="contact-details">
          <h2>Let’s talk.</h2>
          <dl>
            <div>
              <dt>Email</dt>
              <dd>
                <a href="mailto:hello@opus.mk">hello@opus.mk</a>
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                <a href="tel:+38977826333">+389 77 826 333</a>
              </dd>
            </div>
            <div>
              <dt>Based in</dt>
              <dd>Skopje, North Macedonia</dd>
            </div>
          </dl>
          <img
            src="/assets/opus-cta-wide.jpg"
            alt="Glass and chrome OPUS logo"
            width="2172"
            height="724"
          />
        </section>
        {status === "success" ? (
          <div className="contact-feedback" role="status">
            <h2>Message received.</h2>
            <p>Thanks for reaching out. We’ll get back to you by email.</p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={sendMessage}>
            <label>
              Your name
              <input
                name="name"
                autoComplete="name"
                required
                disabled={status === "submitting"}
              />
            </label>
            <label>
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={status === "submitting"}
              />
            </label>
            <label>
              Studio name
              <input
                name="business"
                autoComplete="organization"
                disabled={status === "submitting"}
              />
            </label>
            <label>
              How can we help?
              <textarea
                name="message"
                required
                disabled={status === "submitting"}
              />
            </label>
            {status === "error" && (
              <p className="contact-error" role="alert">
                Your message couldn’t be sent. Please try again or email
                hello@opus.mk.
              </p>
            )}
            <button
              className="button button-dark"
              type="submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Sending…" : "Send message"}
              <span aria-hidden="true">↗</span>
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
