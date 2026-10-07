"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import { useDashboardI18n } from "@/components/dashboard-i18n-provider";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { SettingsSection } from "@/components/settings/SettingsCard";

export function AiStudioContext({
  value,
  onChange,
  canPreview,
  providerReady,
}: {
  value: string;
  onChange: (value: string) => void;
  canPreview: boolean;
  providerReady: boolean;
}) {
  const { t } = useDashboardI18n();
  const preview = useAction(api.ai.agent.preview);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    handoff: boolean;
  } | null>(null);
  async function testAnswer() {
    setLoading(true);
    setResult(null);
    try {
      setResult(await preview({ question }));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t(
              "Unable to test the answer.",
              "Одговорот не може да се тестира.",
              "Nuk mund të testohet përgjigja.",
            ),
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <SettingsSection
      title={t("Context for the AI", "Контекст за AI", "Konteksti për AI")}
      description={t(
        "Tell the assistant what makes your studio different.",
        "Кажете му на асистентот што треба да знае за вашето студио.",
        "Tregojini asistentit çfarë e bën studion tuaj të veçantë.",
      )}
    >
      <FieldGroup className="max-w-2xl">
        <Field>
          <FieldLabel data-replay-public htmlFor="ai-studio-context">
            {t(
              "What should the AI know about your studio?",
              "Што треба AI да знае за вашето студио?",
              "Çfarë duhet të dijë AI për studion tuaj?",
            )}
          </FieldLabel>
          <Textarea
            id="ai-studio-context"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={9}
            maxLength={12_000}
            aria-describedby="ai-context-help"
            placeholder={t(
              "Products and brands we use: …\nHow long our nail treatments usually last: …\nAftercare and maintenance: …\nRemoval, repairs and studio policies: …\nOther frequently asked questions: …",
              "Производи и брендови што ги користиме: …\nКолку обично траат нашите третмани за нокти: …\nНега и одржување по третманот: …\nОтстранување, поправки и правила во студиото: …\nДруги често поставувани прашања: …",
              "Produktet dhe markat që përdorim: …\nSa zgjasin zakonisht trajtimet tona: …\nKujdesi pas trajtimit dhe mirëmbajtja: …\nHeqja, riparimet dhe rregullat e studios: …\nPyetje të tjera të shpeshta: …",
            )}
          />
          <FieldDescription data-replay-public id="ai-context-help">
            {t(
              "Write the facts you want clients to hear, such as which gel you use or when to return for maintenance. Services, prices and availability are read from OPUS. If an answer is missing, the AI asks your team instead of guessing.",
              "Напишете ги информациите што сакате да ги знаат клиентите, на пример кој гел го користите или кога да дојдат на корекција. Услугите, цените и слободните термини се преземаат од OPUS. Ако недостасува одговор, AI го препушта прашањето на вашиот тим.",
              "Shkruani faktet që dëshironi të dëgjojnë klientët, si p.sh. cilin xhel përdorni ose kur të kthehen për mirëmbajtje. Shërbimet, çmimet dhe oraret lexohen nga OPUS. Nëse mungon një përgjigje, AI pyet ekipin tuaj në vend që të hamendësojë.",
            )}
          </FieldDescription>
          <p className="text-xs text-muted-foreground">
            {value.length.toLocaleString()} / 12,000
          </p>
        </Field>
        <Field>
          <FieldLabel data-replay-public htmlFor="ai-test-question">
            {t(
              "Try a customer question",
              "Пробајте прашање од клиент",
              "Provoni një pyetje nga klienti",
            )}
          </FieldLabel>
          <Textarea
            id="ai-test-question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={2}
            maxLength={2_000}
            placeholder={t(
              "How long will my nails last?",
              "Колку време ќе ми траат ноктите?",
              "Sa kohë do të zgjasin thonjtë e mi?",
            )}
          />
          <FieldDescription data-replay-public>
            {providerReady
              ? t(
                  "Save your settings first. This test uses saved studio context and does not send messages or create appointments.",
                  "Прво зачувајте ги поставките. Тестот го користи зачуваниот контекст и не испраќа пораки или закажува термини.",
                  "Ruani cilësimet fillimisht. Ky test përdor kontekstin e ruajtur të studios dhe nuk dërgon mesazhe ose krijon termine.",
                )
              : t(
                  "Answer testing becomes available after OPUS activates the AI service. You can save your studio context now.",
                  "Тестирањето одговори е достапно откако OPUS ќе го активира AI сервисот. Сега можете да го зачувате контекстот за студиото.",
                  "Testimi i përgjigjeve bëhet i disponueshëm pasi OPUS aktivizon shërbimin AI. Mund të ruani kontekstin e studios tani.",
                )}
          </FieldDescription>
        </Field>
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={!canPreview || !question.trim() || loading}
          onClick={testAnswer}
        >
          {loading && <Spinner />}
          {t("Test answer", "Тестирај одговор", "Testo përgjigjen")}
        </Button>
        {result && (
          <div
            className="flex flex-col gap-3 rounded-xl border p-4"
            aria-live="polite"
          >
            <Badge
              data-replay-public
              variant="secondary"
              className="self-start"
            >
              {result.handoff
                ? t(
                    "Would ask your team",
                    "Ќе го праша вашиот тим",
                    "Do të pyeste ekipin tuaj",
                  )
                : t(
                    "Ready to answer",
                    "Подготвен одговор",
                    "Gati për t'u përgjigjur",
                  )}
            </Badge>
            <p className="whitespace-pre-wrap break-words text-sm">
              {result.message}
            </p>
          </div>
        )}
      </FieldGroup>
    </SettingsSection>
  );
}
