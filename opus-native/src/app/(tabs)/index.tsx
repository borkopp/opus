import { useAction } from "convex/react";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/convex-api";
import { useSessionId } from "@/hooks/use-session-id";
import { useTheme } from "@/hooks/use-theme";
import { BottomTabInset, Spacing } from "@/constants/theme";
import { DiscoverColors } from "@/constants/discover";
import { useLocation } from "@/context/location-context";
import { beautyCategoryLabel } from "@/lib/discover/beauty-categories";

// ── Types ─────────────────────────────────────────────────────────────────────

type Recommendation = {
  orgId: string;
  slug: string;
  name: string;
  reason: string;
  availabilityHint?: string;
  averageRating: number;
  reviewCount: number;
  city?: string;
  distanceM?: number;
  isOpenNow: boolean;
  opensAt?: string;
  industry: string;
  beautyCategory?: string;
  venueType?: string;
  cuisine?: string[];
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  recommendations?: Recommendation[];
};

// ── Suggestions ───────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: "Date night 🌙", query: "date night tonight" },
  { label: "Quick haircut 💈", query: "haircut available now" },
  { label: "Relaxing spa 🧖", query: "couples spa this evening" },
  { label: "Birthday treat 🎂", query: "birthday pampering today" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2);
}

function getDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function recVenueLabel(rec: Recommendation): string {
  if (rec.industry === "hospitality") {
    const type =
      rec.venueType
        ?.replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Restaurant";
    const cuisine = rec.cuisine?.[0];
    return cuisine ? `${type} · ${cuisine}` : type;
  }
  return (
    beautyCategoryLabel(rec.beautyCategory) ??
    rec.beautyCategory
      ?.replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()) ??
    "Beauty"
  );
}

// ── Business card ─────────────────────────────────────────────────────────────

function BusinessCard({
  rec,
  theme,
}: {
  rec: Recommendation;
  theme: ReturnType<typeof useTheme>;
}) {
  const glassAvailable = isGlassEffectAPIAvailable();

  const distanceLabel =
    rec.distanceM != null
      ? rec.distanceM < 1000
        ? `${Math.round(rec.distanceM)} m away`
        : `${(rec.distanceM / 1000).toFixed(1)} km away`
      : null;

  const statusColor = rec.isOpenNow ? "#22c55e" : "#ef4444";
  const statusLabel = rec.isOpenNow
    ? "Open"
    : rec.opensAt
      ? `Opens ${rec.opensAt}`
      : "Closed";

  const inner = (
    <View style={styles.cardInner}>
      {/* Initial avatar + name + status */}
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.cardAvatar,
            { backgroundColor: DiscoverColors.accent + "1A" },
          ]}
        >
          <Text
            style={[styles.cardAvatarText, { color: DiscoverColors.accent }]}
          >
            {rec.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.cardTitleBlock}>
          <Text
            style={[styles.cardName, { color: theme.text }]}
            numberOfLines={1}
          >
            {rec.name}
          </Text>
          <Text
            style={[styles.cardIndustry, { color: theme.textSecondary }]}
            numberOfLines={1}
          >
            {recVenueLabel(rec)}
          </Text>
        </View>
      </View>

      {/* Reason / availability hint */}
      {(rec.availabilityHint ?? rec.reason) ? (
        <Text
          style={[styles.cardHint, { color: theme.textSecondary }]}
          numberOfLines={2}
        >
          {rec.availabilityHint ?? rec.reason}
        </Text>
      ) : null}

      {/* Footer: rating · distance · status · chevron */}
      <View style={styles.cardFooter}>
        <View style={styles.cardMeta}>
          {rec.averageRating > 0 && (
            <View style={styles.ratingRow}>
              <Text style={styles.star}>★</Text>
              <Text style={[styles.metaText, { color: theme.text }]}>
                {rec.averageRating.toFixed(1)}
              </Text>
              {rec.reviewCount > 0 && (
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  · {rec.reviewCount}
                </Text>
              )}
            </View>
          )}
          {distanceLabel && (
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {distanceLabel}
            </Text>
          )}
        </View>
        <View style={styles.cardFooterRight}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "18" },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
          <SymbolView
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            size={11}
            tintColor={theme.textSecondary}
          />
        </View>
      </View>
    </View>
  );

  if (Platform.OS === "ios" && glassAvailable) {
    return (
      <Pressable
        onPress={() => router.push(`/business/${rec.slug}`)}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.72 }]}
      >
        <GlassView style={StyleSheet.absoluteFill} glassEffectStyle="regular" />
        {inner}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={() => router.push(`/business/${rec.slug}`)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        pressed && { opacity: 0.72 },
      ]}
    >
      {inner}
    </Pressable>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  theme,
  isLoading,
}: {
  message: Message;
  theme: ReturnType<typeof useTheme>;
  isLoading?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.bubbleRow,
        isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAssistant,
          {
            backgroundColor: isUser
              ? theme.backgroundSelected
              : theme.backgroundElement,
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={theme.textSecondary} />
        ) : (
          <Text style={[styles.bubbleText, { color: theme.text }]}>
            {message.text}
          </Text>
        )}
      </View>

      {!isUser &&
        message.recommendations &&
        message.recommendations.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.cardScroll}
            contentContainerStyle={styles.cardScrollContent}
          >
            {message.recommendations.map((rec) => (
              <BusinessCard key={rec.slug} rec={rec} theme={theme} />
            ))}
          </ScrollView>
        )}
    </View>
  );
}

// ── Input dock ────────────────────────────────────────────────────────────────

function InputDock({
  value,
  onChangeText,
  onSend,
  disabled,
  theme,
}: {
  value: string;
  onChangeText: (t: string) => void;
  onSend: () => void;
  disabled: boolean;
  theme: ReturnType<typeof useTheme>;
}) {
  const glassAvailable = isGlassEffectAPIAvailable();
  const canSend = value.trim().length > 0 && !disabled;

  const inner = (
    <View style={styles.inputRow}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Ask anything…"
        placeholderTextColor={theme.textSecondary}
        style={[
          styles.textInput,
          {
            color: theme.text,
            paddingVertical: Platform.OS === "ios" ? 4 : 0,
          },
        ]}
        returnKeyType="send"
        onSubmitEditing={canSend ? onSend : undefined}
        blurOnSubmit={false}
        editable={!disabled}
        multiline={false}
      />
      <Pressable
        onPress={canSend ? onSend : undefined}
        style={[
          styles.sendButton,
          { backgroundColor: canSend ? theme.text : theme.backgroundSelected },
        ]}
        accessibilityLabel="Send message"
      >
        {disabled ? (
          <ActivityIndicator size="small" color={theme.textSecondary} />
        ) : (
          <SymbolView
            name={{
              ios: "arrow.up",
              android: "keyboard_arrow_up",
              web: "keyboard_arrow_up",
            }}
            size={16}
            tintColor={canSend ? theme.background : theme.textSecondary}
          />
        )}
      </Pressable>
    </View>
  );

  if (Platform.OS === "ios" && glassAvailable) {
    return (
      <GlassView style={styles.inputDock} glassEffectStyle="regular">
        {inner}
      </GlassView>
    );
  }

  return (
    <View
      style={[styles.inputDock, { backgroundColor: theme.backgroundElement }]}
    >
      {inner}
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AskScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const sessionId = useSessionId();
  const sendChat = useAction(api.marketplace.chatMobile.chat);
  const location = useLocation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const hasMessages = messages.length > 0;

  const locationCity = location.status === "ready" ? location.city : undefined;
  const locationCoords = location.status === "ready" ? location.coords : undefined;

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setInput("");
      setIsLoading(true);

      const userMsg: Message = { id: uid(), role: "user", text: trimmed };
      const loadingMsg: Message = { id: uid(), role: "assistant", text: "" };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);

      try {
        const result = await sendChat({
          query: trimmed,
          sessionId,
          locale: "en",
          city: locationCity,
          coords: locationCoords,
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? {
                  ...m,
                  text: result.text,
                  recommendations: result.recommendations as Recommendation[],
                }
              : m,
          ),
        );
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingMsg.id
              ? { ...m, text: "Something went wrong. Please try again." }
              : m,
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      isLoading,
      locationCity,
      locationCoords,
      sendChat,
      sessionId,
    ],
  );

  const handleSend = useCallback(() => {
    void sendMessage(input);
  }, [input, sendMessage]);

  const dockBottomPadding = keyboardVisible
    ? Spacing.two
    : insets.bottom + BottomTabInset - Spacing.three;

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={{ paddingTop: insets.top + Spacing.three }}></View>
      {/* Messages or centered hero */}
      <View style={styles.flex}>
        {hasMessages ? (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                theme={theme}
                isLoading={
                  isLoading && item.role === "assistant" && item.text === ""
                }
              />
            )}
            contentContainerStyle={styles.listContent}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        ) : (
          <>
            <View style={styles.flex} />
            <View style={styles.emptyText}>
              <Text style={[styles.greeting, { color: theme.textSecondary }]}>
                {getDayGreeting()}
              </Text>
              <Text style={[styles.headline, { color: theme.text }]}>
                {"Where do you\nwant to go?"}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Chips + input pinned together at the bottom */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View
          style={[styles.composerDock, { paddingBottom: dockBottomPadding }]}
        >
          {!hasMessages && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestions}
              style={styles.chipsScroll}
              keyboardShouldPersistTaps="handled"
            >
              {SUGGESTIONS.map((s) => (
                <Pressable
                  key={s.label}
                  onPress={() => void sendMessage(s.query)}
                  disabled={isLoading}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <Text style={[styles.chipText, { color: theme.text }]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
          <InputDock
            value={input}
            onChangeText={setInput}
            onSend={handleSend}
            disabled={isLoading}
            theme={theme}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },

  header: { paddingHorizontal: 24, paddingBottom: 8 },
  headerTitle: { fontSize: 30, fontWeight: "700", letterSpacing: -0.5 },

  emptyText: { paddingHorizontal: 24, paddingBottom: Spacing.four },
  greeting: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  headline: {
    fontSize: 34,
    fontWeight: "600",
    lineHeight: 40,
    letterSpacing: -0.5,
  },

  listContent: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12 },

  composerDock: { paddingHorizontal: 12, paddingTop: Spacing.two },
  chipsScroll: { marginBottom: Spacing.three },
  suggestions: {
    gap: Spacing.two,
    alignItems: "flex-start",
  },
  chip: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16 },
  chipText: { fontSize: 14, fontWeight: "500" },
  inputDock: { borderRadius: 16, overflow: "hidden" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  textInput: { flex: 1, fontSize: 16 },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  bubbleRow: { marginBottom: 12 },
  bubbleRowUser: { alignItems: "flex-end" },
  bubbleRowAssistant: { alignItems: "flex-start" },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleUser: { borderBottomRightRadius: 4 },
  bubbleAssistant: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22 },

  cardScroll: { marginTop: 8, marginLeft: -4 },
  cardScrollContent: { paddingLeft: 4, gap: 10, paddingRight: 12 },
  card: { width: 260, borderRadius: 18, overflow: "hidden" },
  cardInner: { padding: 14, gap: 10 },

  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  cardAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardAvatarText: { fontSize: 18, fontWeight: "700" },
  cardTitleBlock: { flex: 1, gap: 1 },
  cardName: { fontSize: 14, fontWeight: "600" },
  cardIndustry: { fontSize: 12 },

  cardHint: { fontSize: 12, lineHeight: 17 },

  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 2,
  },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  star: { fontSize: 11, color: "#FFD173" },
  metaText: { fontSize: 12 },
  cardFooterRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusDot: { width: 5, height: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: "600" },
});
