/* eslint-disable @next/next/no-img-element */
import { Check, Clock3, Heart } from "lucide-react";

export function BookingPreview() {
  return (
    <div className="product-mini product-mini-booking" role="img" aria-label="Sample studio booking website with a haircut service and available appointment times">
      <div className="product-mini-address">atelier.opus.mk</div>
      <div className="product-mini-cover">
        <img src="/assets/studio.jpg" alt="" width="1536" height="1024" loading="lazy" />
        <span>ATELIER</span>
      </div>
      <div className="product-mini-body">
        <div className="product-mini-service"><div><b>Cut &amp; blow-dry</b><span>60 min · 900 MKD</span></div><Check aria-hidden="true" /></div>
        <div className="product-mini-times"><span>09:00</span><span className="is-chosen">10:30</span><span>12:00</span></div>
      </div>
    </div>
  );
}

export function CalendarPreview() {
  return (
    <div className="product-mini product-mini-calendar" role="img" aria-label="Sample shared calendar showing two staff members and three scheduled appointments">
      <div className="product-mini-heading"><b>Today’s calendar</b><span>Thursday</span></div>
      <div className="product-mini-calendar-grid">
        <div className="product-mini-hours"><span /><span>09:00</span><span>10:00</span><span>11:00</span></div>
        <div className="product-mini-day"><b>Ana</b><div className="product-mini-appointment"><strong>Cut &amp; blow-dry</strong><span>09:00 — 10:00</span></div><div className="product-mini-appointment is-later"><strong>Hair treatment</strong><span>11:00 — 12:00</span></div></div>
        <div className="product-mini-day"><b>Marija</b><div className="product-mini-appointment is-offset"><strong>Gel manicure</strong><span>10:00 — 11:00</span></div></div>
      </div>
    </div>
  );
}

export function ClientPreview() {
  return (
    <div className="product-mini product-mini-client" role="img" aria-label="Sample client profile with her recent haircut and color visits">
      <div className="product-mini-profile"><span className="product-mini-avatar">EP</span><div><b>Elena Petrova</b><span>Your client, remembered.</span></div><Heart aria-hidden="true" /></div>
      <div className="product-mini-history">
        <span className="product-mini-history-label"><Clock3 aria-hidden="true" /> Recent visits</span>
        <div><span><b>Cut &amp; blow-dry</b><small>14 September</small></span><Check aria-hidden="true" /></div>
        <div><span><b>Color &amp; care</b><small>18 August</small></span><Check aria-hidden="true" /></div>
        <div><span><b>Cut &amp; blow-dry</b><small>21 July</small></span><Check aria-hidden="true" /></div>
      </div>
    </div>
  );
}
