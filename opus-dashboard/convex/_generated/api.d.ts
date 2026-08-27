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
import type * as bookings from "../bookings.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as dashboard from "../dashboard.js";
import type * as dashboardNotifications from "../dashboardNotifications.js";
import type * as files from "../files.js";
import type * as hospitality_findBestTable from "../hospitality/findBestTable.js";
import type * as hospitality_floorPlans from "../hospitality/floorPlans.js";
import type * as hospitality_onboarding from "../hospitality/onboarding.js";
import type * as hospitality_reservationSettings from "../hospitality/reservationSettings.js";
import type * as hospitality_reservations from "../hospitality/reservations.js";
import type * as hospitality_tables from "../hospitality/tables.js";
import type * as lib_activation from "../lib/activation.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_braintree from "../lib/braintree.js";
import type * as lib_productScope from "../lib/productScope.js";
import type * as lib_publicProfile from "../lib/publicProfile.js";
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
import type * as payments_getClientToken from "../payments/getClientToken.js";
import type * as payments_getPaymentIntent from "../payments/getPaymentIntent.js";
import type * as payments_handleTransactionFailed from "../payments/handleTransactionFailed.js";
import type * as payments_handleTransactionSettled from "../payments/handleTransactionSettled.js";
import type * as payments_initiateDeposit from "../payments/initiateDeposit.js";
import type * as payments_recordPaymentIntent from "../payments/recordPaymentIntent.js";
import type * as payments_updatePaymentIntentStatus from "../payments/updatePaymentIntentStatus.js";
import type * as payouts_getPayoutSummary from "../payouts/getPayoutSummary.js";
import type * as payouts_getSplitConfig from "../payouts/getSplitConfig.js";
import type * as payouts_listPayouts from "../payouts/listPayouts.js";
import type * as payouts_listPayoutsByStaff from "../payouts/listPayoutsByStaff.js";
import type * as payouts_listSplitConfigs from "../payouts/listSplitConfigs.js";
import type * as payouts_recordPayout from "../payouts/recordPayout.js";
import type * as payouts_setSplitConfig from "../payouts/setSplitConfig.js";
import type * as public_ from "../public.js";
import type * as publicBooking from "../publicBooking.js";
import type * as reviews from "../reviews.js";
import type * as serviceCategories from "../serviceCategories.js";
import type * as services from "../services.js";
import type * as slots from "../slots.js";
import type * as staff from "../staff.js";
import type * as users from "../users.js";

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
  bookings: typeof bookings;
  crons: typeof crons;
  customers: typeof customers;
  dashboard: typeof dashboard;
  dashboardNotifications: typeof dashboardNotifications;
  files: typeof files;
  "hospitality/findBestTable": typeof hospitality_findBestTable;
  "hospitality/floorPlans": typeof hospitality_floorPlans;
  "hospitality/onboarding": typeof hospitality_onboarding;
  "hospitality/reservationSettings": typeof hospitality_reservationSettings;
  "hospitality/reservations": typeof hospitality_reservations;
  "hospitality/tables": typeof hospitality_tables;
  "lib/activation": typeof lib_activation;
  "lib/auth": typeof lib_auth;
  "lib/braintree": typeof lib_braintree;
  "lib/productScope": typeof lib_productScope;
  "lib/publicProfile": typeof lib_publicProfile;
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
  "payments/getClientToken": typeof payments_getClientToken;
  "payments/getPaymentIntent": typeof payments_getPaymentIntent;
  "payments/handleTransactionFailed": typeof payments_handleTransactionFailed;
  "payments/handleTransactionSettled": typeof payments_handleTransactionSettled;
  "payments/initiateDeposit": typeof payments_initiateDeposit;
  "payments/recordPaymentIntent": typeof payments_recordPaymentIntent;
  "payments/updatePaymentIntentStatus": typeof payments_updatePaymentIntentStatus;
  "payouts/getPayoutSummary": typeof payouts_getPayoutSummary;
  "payouts/getSplitConfig": typeof payouts_getSplitConfig;
  "payouts/listPayouts": typeof payouts_listPayouts;
  "payouts/listPayoutsByStaff": typeof payouts_listPayoutsByStaff;
  "payouts/listSplitConfigs": typeof payouts_listSplitConfigs;
  "payouts/recordPayout": typeof payouts_recordPayout;
  "payouts/setSplitConfig": typeof payouts_setSplitConfig;
  public: typeof public_;
  publicBooking: typeof publicBooking;
  reviews: typeof reviews;
  serviceCategories: typeof serviceCategories;
  services: typeof services;
  slots: typeof slots;
  staff: typeof staff;
  users: typeof users;
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

export declare const components: {};
