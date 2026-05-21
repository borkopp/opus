import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/convex-api";
import { DiscoverColors } from "@/constants/discover";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// ─── Inline Markdown Renderer (same as business profile) ─────────────────────

function InlineMarkdown({ text, style }: { text: string; style?: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <Text style={style}>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <Text key={i} style={{ fontWeight: "700" }}>
            {part.slice(2, -2)}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

type Theme = ReturnType<typeof useTheme>;

function renderLine(line: string, i: number, theme: Theme) {
  if (line.startsWith("# ")) {
    return (
      <Text
        key={i}
        style={{
          fontSize: 22,
          fontWeight: "700",
          color: theme.text,
          marginTop: 16,
          marginBottom: 4,
          letterSpacing: -0.3,
        }}
      >
        {line.slice(2)}
      </Text>
    );
  }
  if (line.startsWith("### ")) {
    return (
      <Text
        key={i}
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: theme.textSecondary,
          marginTop: 10,
          textTransform: "uppercase",
          letterSpacing: 0.6,
        }}
      >
        {line.slice(4)}
      </Text>
    );
  }
  if (line === "---" || line === "***") {
    return (
      <View
        key={i}
        style={{
          height: 1,
          backgroundColor: theme.backgroundElement,
          marginVertical: 12,
        }}
      />
    );
  }
  if (line.startsWith("- ") || line.startsWith("* ")) {
    return (
      <View key={i} style={{ flexDirection: "row", gap: 10, paddingLeft: 4 }}>
        <Text
          style={{ color: theme.textSecondary, fontSize: 15, lineHeight: 22 }}
        >
          •
        </Text>
        <InlineMarkdown
          text={line.slice(2)}
          style={{ flex: 1, fontSize: 15, lineHeight: 22, color: theme.text }}
        />
      </View>
    );
  }
  if (line.trim() === "") {
    return <View key={i} style={{ height: 8 }} />;
  }
  return (
    <InlineMarkdown
      key={i}
      text={line}
      style={{ fontSize: 15, lineHeight: 24, color: theme.text }}
    />
  );
}

type Section = { title: string; lines: string[] };

function parseSections(source: string): {
  preamble: string[];
  sections: Section[];
} {
  const lines = source.split("\n");
  const preamble: string[] = [];
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      current = { title: line.slice(3), lines: [] };
      sections.push(current);
    } else if (current) {
      current.lines.push(line);
    } else {
      preamble.push(line);
    }
  }

  return { preamble, sections };
}

function MarkdownBlock({ source, theme }: { source: string; theme: Theme }) {
  const { preamble, sections } = parseSections(source);
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({});

  const toggle = (i: number) =>
    setOpenSections((prev) => ({ ...prev, [i]: !prev[i] }));

  if (sections.length === 0) {
    return (
      <View style={{ gap: 4 }}>
        {source.split("\n").map((line, i) => renderLine(line, i, theme))}
      </View>
    );
  }

  return (
    <View style={{ gap: 4 }}>
      {preamble.map((line, i) => renderLine(line, i, theme))}
      {sections.map((section, si) => {
        const isOpen = !!openSections[si];
        return (
          <View key={si}>
            <Pressable
              onPress={() => toggle(si)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: theme.backgroundElement,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "700",
                  color: theme.text,
                  flex: 1,
                }}
              >
                {section.title}
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  color: theme.textSecondary,
                  marginLeft: 8,
                  transform: [{ rotate: isOpen ? "90deg" : "0deg" }],
                }}
              >
                ›
              </Text>
            </Pressable>
            {isOpen && (
              <View style={{ gap: 4, paddingTop: 8, paddingBottom: 4 }}>
                {section.lines.map((line, li) => renderLine(line, li, theme))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MenuScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const profile = useQuery(
    api.public.getPublicProfile,
    slug ? { slug } : "skip",
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      {/* Handle bar area + header */}
      <View
        style={{
          paddingTop: Spacing.four,
          paddingHorizontal: 20,
          paddingBottom: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: theme.backgroundElement,
          zIndex: 1,
          backgroundColor: theme.background,
        }}
      >
        <View>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: theme.textSecondary,
              textTransform: "uppercase",
              letterSpacing: 0.8,
            }}
          >
            Menu
          </Text>
          <Text
            style={{
              fontSize: 20,
              fontWeight: "700",
              color: theme.text,
              letterSpacing: -0.3,
              marginTop: 2,
            }}
          >
            {profile?.name ?? ""}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => ({
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: theme.backgroundElement,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text style={{ fontSize: 15, fontWeight: "500", color: theme.text }}>
            Done
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      {profile === undefined ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={theme.textSecondary} />
        </View>
      ) : profile === null || !profile.menuText ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ color: theme.textSecondary }}>
            Menu not available.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: insets.bottom + Spacing.five,
            gap: 0,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Accent banner */}
          <View
            style={{
              backgroundColor: DiscoverColors.accent + "15",
              borderRadius: 12,
              borderCurve: "continuous",
              padding: 14,
              marginBottom: 8,
              marginTop: 80,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: DiscoverColors.accent,
              }}
            />
            <Text
              style={{
                fontSize: 13,
                color: DiscoverColors.accent,
                fontWeight: "500",
                flex: 1,
              }}
            >
              Prices and availability may vary.
            </Text>
          </View>

          <MarkdownBlock source={profile.menuText} theme={theme} />
        </ScrollView>
      )}
    </View>
  );
}
