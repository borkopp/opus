/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activation from "../activation.js";
import type * as ai_agent from "../ai/agent.js";
import type * as ai_conversations from "../ai/conversations.js";
import type * as ai_gapOptimizer from "../ai/gapOptimizer.js";
import type * as ai_gapOptimizerHelpers from "../ai/gapOptimizerHelpers.js";
import type * as ai_messages from "../ai/messages.js";
import type * as auditLog from "../auditLog.js";
import type * as auth from "../auth.js";
import type * as availability from "../availability.js";
import type * as availabilityOverrides from "../availabilityOverrides.js";
import type * as betterAuth from "../betterAuth.js";
import type * as bookings from "../bookings.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as dashboard from "../dashboard.js";
import type * as dashboardNotifications from "../dashboardNotifications.js";
import type * as dev from "../dev.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as lib_activation from "../lib/activation.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_bookingEmailNotifications from "../lib/bookingEmailNotifications.js";
import type * as lib_bookingEmailSecurity from "../lib/bookingEmailSecurity.js";
import type * as lib_bookingTime from "../lib/bookingTime.js";
import type * as lib_emailTemplates from "../lib/emailTemplates.js";
import type * as lib_imageUrl from "../lib/imageUrl.js";
import type * as lib_opusUserAuth from "../lib/opusUserAuth.js";
import type * as lib_orgSettingsValidation from "../lib/orgSettingsValidation.js";
import type * as lib_productScope from "../lib/productScope.js";
import type * as lib_publicBookingRules from "../lib/publicBookingRules.js";
import type * as lib_publicProfile from "../lib/publicProfile.js";
import type * as lib_publication from "../lib/publication.js";
import type * as lib_quickBooking from "../lib/quickBooking.js";
import type * as lib_tenantSites from "../lib/tenantSites.js";
import type * as lib_tenantSlug from "../lib/tenantSlug.js";
import type * as listing from "../listing.js";
import type * as marketplace_chatMobile from "../marketplace/chatMobile.js";
import type * as marketplace_conversations from "../marketplace/conversations.js";
import type * as marketplace_embeddings from "../marketplace/embeddings.js";
import type * as marketplace_embeddingsHelpers from "../marketplace/embeddingsHelpers.js";
import type * as marketplace_messages from "../marketplace/messages.js";
import type * as marketplace_openingHours from "../marketplace/openingHours.js";
import type * as marketplace_retrieve from "../marketplace/retrieve.js";
import type * as marketplace_retrieveHelpers from "../marketplace/retrieveHelpers.js";
import type * as marketplace_scraped from "../marketplace/scraped.js";
import type * as marketplace_sourceText from "../marketplace/sourceText.js";
import type * as marketplace_timeIntent from "../marketplace/timeIntent.js";
import type * as notifications from "../notifications.js";
import type * as opusUsers from "../opusUsers.js";
import type * as orgMedia from "../orgMedia.js";
import type * as orgSettings from "../orgSettings.js";
import type * as orgs from "../orgs.js";
import type * as public_ from "../public.js";
import type * as publicBooking from "../publicBooking.js";
import type * as publicSite from "../publicSite.js";
import type * as publication from "../publication.js";
import type * as reviews from "../reviews.js";
import type * as serviceCategories from "../serviceCategories.js";
import type * as services from "../services.js";
import type * as slots from "../slots.js";
import type * as staff from "../staff.js";
import type * as users from "../users.js";
import type * as website from "../website.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activation: typeof activation;
  "ai/agent": typeof ai_agent;
  "ai/conversations": typeof ai_conversations;
  "ai/gapOptimizer": typeof ai_gapOptimizer;
  "ai/gapOptimizerHelpers": typeof ai_gapOptimizerHelpers;
  "ai/messages": typeof ai_messages;
  auditLog: typeof auditLog;
  auth: typeof auth;
  availability: typeof availability;
  availabilityOverrides: typeof availabilityOverrides;
  betterAuth: typeof betterAuth;
  bookings: typeof bookings;
  crons: typeof crons;
  customers: typeof customers;
  dashboard: typeof dashboard;
  dashboardNotifications: typeof dashboardNotifications;
  dev: typeof dev;
  files: typeof files;
  http: typeof http;
  "lib/activation": typeof lib_activation;
  "lib/auth": typeof lib_auth;
  "lib/bookingEmailNotifications": typeof lib_bookingEmailNotifications;
  "lib/bookingEmailSecurity": typeof lib_bookingEmailSecurity;
  "lib/bookingTime": typeof lib_bookingTime;
  "lib/emailTemplates": typeof lib_emailTemplates;
  "lib/imageUrl": typeof lib_imageUrl;
  "lib/opusUserAuth": typeof lib_opusUserAuth;
  "lib/orgSettingsValidation": typeof lib_orgSettingsValidation;
  "lib/productScope": typeof lib_productScope;
  "lib/publicBookingRules": typeof lib_publicBookingRules;
  "lib/publicProfile": typeof lib_publicProfile;
  "lib/publication": typeof lib_publication;
  "lib/quickBooking": typeof lib_quickBooking;
  "lib/tenantSites": typeof lib_tenantSites;
  "lib/tenantSlug": typeof lib_tenantSlug;
  listing: typeof listing;
  "marketplace/chatMobile": typeof marketplace_chatMobile;
  "marketplace/conversations": typeof marketplace_conversations;
  "marketplace/embeddings": typeof marketplace_embeddings;
  "marketplace/embeddingsHelpers": typeof marketplace_embeddingsHelpers;
  "marketplace/messages": typeof marketplace_messages;
  "marketplace/openingHours": typeof marketplace_openingHours;
  "marketplace/retrieve": typeof marketplace_retrieve;
  "marketplace/retrieveHelpers": typeof marketplace_retrieveHelpers;
  "marketplace/scraped": typeof marketplace_scraped;
  "marketplace/sourceText": typeof marketplace_sourceText;
  "marketplace/timeIntent": typeof marketplace_timeIntent;
  notifications: typeof notifications;
  opusUsers: typeof opusUsers;
  orgMedia: typeof orgMedia;
  orgSettings: typeof orgSettings;
  orgs: typeof orgs;
  public: typeof public_;
  publicBooking: typeof publicBooking;
  publicSite: typeof publicSite;
  publication: typeof publication;
  reviews: typeof reviews;
  serviceCategories: typeof serviceCategories;
  services: typeof services;
  slots: typeof slots;
  staff: typeof staff;
  users: typeof users;
  website: typeof website;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("@convex-dev/better-auth/_generated/component.js").ComponentApi<"betterAuth">;
};
