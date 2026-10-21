import { getExample } from "../../_lib/examples";
import type { AssistantTurn } from "@/components/business-assistant/ConversationPanel";
import type { Id } from "@/convex/_generated/dataModel";

export const variants = [
  {
    id: "chat",
    name: "Chat",
    number: "01",
    description:
      "A quiet, familiar space. Your conversations on the left, your next question in the centre.",
  },
  {
    id: "brief",
    name: "Brief",
    number: "02",
    description:
      "An open notebook for your studio. Start with a question, revisit a thought below.",
  },
  {
    id: "desk",
    name: "Desk",
    number: "03",
    description:
      "Think and explore side by side. Conversation tabs above, the evidence beside you.",
  },
] as const;

export type DesignVariant = (typeof variants)[number]["id"];
export function resolveVariant(value: unknown): DesignVariant {
  return value === "brief" || value === "desk" ? value : "chat";
}

export type SampleChat = {
  id: string;
  title: string;
  category: string;
  date: string;
  exampleId: string;
  turns: AssistantTurn[];
};

// Design fixtures only. Reuse the response gallery's fictional September snapshot.
const samples = [
  {
    id: "month",
    title: "September, at a glance",
    category: "Monthly review",
    date: "Today",
    exampleId: "multiple-reports",
  },
  {
    id: "clients",
    title: "Give clients a reason to return",
    category: "Client patterns",
    date: "Today",
    exampleId: "recommendations",
  },
  {
    id: "services",
    title: "Our most popular services",
    category: "Service performance",
    date: "Yesterday",
    exampleId: "completed_appointments",
  },
  {
    id: "cancellations",
    title: "A closer look at cancellations",
    category: "Booking patterns",
    date: "Yesterday",
    exampleId: "cancellations",
  },
  {
    id: "capacity",
    title: "How full was our calendar?",
    category: "Working hours",
    date: "Last 7 days",
    exampleId: "utilisation",
  },
];

export function initialChats(): SampleChat[] {
  return samples.map((sample) => ({
    ...sample,
    turns: [getExample(sample.exampleId, "en").turn],
  }));
}

export const prompts = [
  {
    label: "Review my month",
    detail: "See the bigger picture",
    exampleId: "multiple-reports",
  },
  {
    label: "Understand my clients",
    detail: "Find out who comes back",
    exampleId: "recommendations",
  },
  {
    label: "Explore my services",
    detail: "Discover what is working",
    exampleId: "completed_appointments",
  },
  {
    label: "Look into cancellations",
    detail: "Spot a pattern worth a look",
    exampleId: "cancellations",
  },
] as const;

export function sampleQuestion(exampleId: string) {
  return getExample(exampleId, "en").turn.question;
}

export function sampleTurn(question: string): AssistantTurn {
  const livePromptExamples: Record<string, string> = {
    "How did last month compare with the month before?": "multiple-reports",
    "How many of my clients returned last month?": "recommendations",
    "What was my weakest day last month?": "appointments",
    "Which services had the most cancellations last month?": "cancellations",
  };
  const exact = [...samples, ...prompts].find(
    (item) => sampleQuestion(item.exampleId) === question,
  );
  const exampleId = exact?.exampleId ?? livePromptExamples[question];
  const source = getExample(exampleId ?? "text-only", "en").turn;
  return {
    ...source,
    _id: `design-${crypto.randomUUID()}` as Id<"analyst_turns">,
    question,
    ...(!exampleId
      ? {
          answer: {
            text: "This is an interactive design preview. Choose one of the sample questions below to explore a complete answer and report using fictional studio data.",
            reportKeys: [],
            recommendations: [],
            followUps: prompts
              .slice(0, 3)
              .map((prompt) => sampleQuestion(prompt.exampleId)),
          },
        }
      : {}),
  };
}
