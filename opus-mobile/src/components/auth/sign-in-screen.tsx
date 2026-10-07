import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { Screen } from "@/components/dashboard/screen";
import { Brand } from "@/components/ui/brand";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Button, Segmented } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loading } from "@/components/ui/loading";
import { Captcha } from "./captcha";
import { LegalLinks } from "@/components/account/legal-links";
import { authClient, dashboardUrl } from "@/lib/auth-client";
import { useStudio } from "@/providers/studio-provider";
type Policy = { required: boolean; siteKey: string | null };
export function SignInScreen() {
  const { t, language, setLanguage } = useStudio();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [operation, setOperation] = useState<"sending" | "verifying" | null>(null);
  const busy = operation !== null;
  const [error, setError] = useState<string | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [challenge, setChallenge] = useState(0);
  const [retry, setRetry] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    void fetch(`${dashboardUrl}/api/auth/security`, {
      signal: controller.signal,
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (typeof data.required !== "boolean" || (data.siteKey !== null && typeof data.siteKey !== "string")) throw new Error();
        if (active) setPolicy({ required: data.required, siteKey: data.siteKey });
      })
      .catch(() => {
        if (active)
          setError(
            t(
              "Could not reach sign-in. Check your connection and try again.",
              "Најавата не е достапна. Провери ја врската и обиди се повторно.",
            ),
          );
      }).finally(() => clearTimeout(timeout));
    let active = true;
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [retry, t]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const captchaError = useCallback(() => {
    setToken(null);
    setError(t("Security check failed. Reload it and try again.", "Безбедносната проверка не успеа. Повтори ја и обиди се повторно."));
  }, [t]);
  async function send() {
    if (busy || cooldown || !policy || (policy.required && !token)) return;
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError(t("Enter a valid email address.", "Внеси валидна е-пошта."));
      return;
    }
    setOperation("sending");
    setError(null);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: address,
        type: "sign-in",
        fetchOptions: { headers: token ? { "x-captcha-response": token } : {}, timeout: 20000 },
      });
      if (result.error) throw new Error(result.error.message);
      setSentTo(address);
      setCode("");
      setCooldown(60);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("Could not send your code.", "Кодот не се испрати."),
      );
    } finally {
      setOperation(null);
      setToken(null);
      setChallenge((value) => value + 1);
    }
  }
  async function verify() {
    if (!sentTo || busy || !/^\d{6}$/.test(code)) return;
    setOperation("verifying");
    setError(null);
    try {
      const result = await authClient.signIn.emailOtp({
        email: sentTo,
        otp: code,
        fetchOptions: { timeout: 20000 },
      });
      if (result.error) throw new Error(result.error.message);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("Could not verify your code.", "Кодот не се потврди."),
      );
    } finally {
      setOperation(null);
    }
  }
  return (
    <Screen safeBottom keyboardAvoiding>
      <Brand />
      <View style={{ paddingTop: 24, gap: 8 }}>
        <Text variant="title">
          {t("Your studio, with you.", "Твоето студио, со тебе.")}
        </Text>
        <Text tone="muted">
          {t(
            "Sign in with your studio email to manage appointments.",
            "Најави се со е-поштата од студиото за да ги управуваш термините.",
          )}
        </Text>
      </View>
      <Card>
        {sentTo ? (
          <>
            <Text variant="heading">
              {t("Check your email", "Провери ја е-поштата")}
            </Text>
            <Text tone="muted">{sentTo}</Text>
            <Input
              label={t("6-digit code", "6-цифрен код")}
              value={code}
              onChangeText={(value) =>
                setCode(value.replace(/\D/g, "").slice(0, 6))
              }
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              autoFocus
              maxLength={6}
            />
            <Button
              label={
                operation === "verifying"
                  ? t("Signing in…", "Се најавува…")
                  : t("Sign in", "Најави се")
              }
              onPress={() => void verify()}
              disabled={busy || code.length !== 6}
            />
            <Button
              variant="secondary"
              label={t("Use another email", "Користи друга е-пошта")}
              disabled={busy}
              onPress={() => {
                setSentTo(null);
                setError(null);
              }}
            />
            <Button
              variant="secondary"
              label={
                operation === "sending" ? t("Sending…", "Се испраќа…") : cooldown
                  ? `${t("Resend in", "Испрати повторно за")} ${cooldown}s`
                  : t("Resend code", "Испрати повторно")
              }
              onPress={() => {
                if (policy?.required) { setSentTo(null); setError(null); }
                else void send();
              }}
              disabled={!!cooldown || busy}
            />
          </>
        ) : (
          <>
            <Input
              label={t("Email", "Е-пошта")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={() => void send()}
            />
            {!policy && !error && <Loading />}
            {policy?.required &&
              (policy.siteKey ? (
                <>
                  <Text tone="muted">
                    {t(
                      "Complete the security check to receive a code.",
                      "Заврши ја безбедносната проверка за да добиеш код.",
                    )}
                  </Text>
                  <Captcha
                    key={challenge}
                    onToken={setToken}
                    onError={captchaError}
                  />
                  <Button
                    variant="secondary"
                    label={t(
                      "Reload security check",
                      "Повтори безбедносна проверка",
                    )}
                    onPress={() => {
                      setToken(null);
                      setError(null);
                      setChallenge((value) => value + 1);
                    }}
                  />
                </>
              ) : (
                <Text tone="muted">
                  {t(
                    "Sign-in security is unavailable. Try again later.",
                    "Безбедната најава не е достапна. Обиди се подоцна.",
                  )}
                </Text>
              ))}
            <Button
              label={
                busy
                  ? t("Sending…", "Се испраќа…")
                  : t("Send sign-in code", "Испрати код за најава")
              }
              onPress={() => void send()}
              disabled={
                busy || !!cooldown || !policy || (policy.required && !token)
              }
            />
            {cooldown > 0 && (
              <Text tone="muted">
                {t(
                  "You can request another code in",
                  "Нов код може да побараш за",
                )}{" "}
                {cooldown}s
              </Text>
            )}
            {!policy && error && (
              <Button
                variant="secondary"
                label={t("Try again", "Обиди се повторно")}
                onPress={() => {
                  setError(null);
                  setPolicy(null);
                  setRetry((value) => value + 1);
                }}
              />
            )}
          </>
        )}
        {error && <Text accessibilityRole="alert">{error}</Text>}
      </Card>
      <Segmented
        value={language}
        onChange={setLanguage}
        options={[
          { value: "en", label: "English" },
          { value: "mk", label: "Македонски" },
        ]}
      />
      <LegalLinks compact />
    </Screen>
  );
}
