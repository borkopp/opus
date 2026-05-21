import { useQuery } from 'convex/react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { api } from '@/lib/convex-api';
import { formatDuration, formatPrice } from '@/lib/format';
import { DiscoverColors } from '@/constants/discover';
import { Spacing } from '@/constants/theme';
import { useLocation } from '@/context/location-context';
import { priceRangeSymbol } from '@/lib/discover/feed';
import { isOpenNow } from '@/lib/discover/opening-hours';
import { venueLabel } from '@/lib/discover/venue-label';
import { resolveMediaUrl } from '@/lib/resolve-media-url';
import { useTheme } from '@/hooks/use-theme';

// ─── Constants ───────────────────────────────────────────────────────────────

const HERO_HEIGHT = 300;
const LOGO_SIZE = 72;
const LOGO_OVERLAP = 36;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mapboxStaticUrl(
  lat: number,
  lng: number,
  widthPx: number,
  dark: boolean,
): string | null {
  if (!MAPBOX_TOKEN) return null;
  const style = dark ? 'mapbox/dark-v11' : 'mapbox/streets-v12';
  const markerColor = 'E16349';
  const w = Math.round(widthPx);
  const h = 200;
  return (
    `https://api.mapbox.com/styles/v1/${style}/static/` +
    `pin-l+${markerColor}(${lng},${lat})/` +
    `${lng},${lat},14,0/` +
    `${w}x${h}@2x` +
    `?access_token=${MAPBOX_TOKEN}&logo=false&attribution=false`
  );
}

function todayDayIndex(): number {
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

type Service = {
  _id: string;
  name: string;
  consumerDescription?: string;
  highlights?: string[];
  photoUrl?: string;
  durationMins?: number;
  priceMinorUnits?: number;
  currency?: string;
  categoryName?: string;
};

type StaffMember = {
  _id: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  specialties?: string[];
};

type OpeningHoursEntry = {
  dayOfWeek: number;
  open: string;
  close: string;
  isClosed: boolean;
};

function groupByCategory(services: Service[]): [string, Service[]][] {
  const map: Record<string, Service[]> = {};
  for (const s of services) {
    const key = s.categoryName ?? 'Services';
    (map[key] ??= []).push(s);
  }
  return Object.entries(map);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label, theme }: { label: string; theme: ReturnType<typeof import('@/hooks/use-theme').useTheme> }) {
  return (
    <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
      {label}
    </Text>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  primary = false,
  theme,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
  theme: ReturnType<typeof import('@/hooks/use-theme').useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: primary ? 1 : undefined,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: primary ? 20 : 16,
        borderRadius: 14,
        borderCurve: 'continuous',
        backgroundColor: primary ? DiscoverColors.accent : theme.backgroundElement,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Image
        source={`sf:${icon}`}
        style={{ width: 16, height: 16 }}
        tintColor={primary ? '#fff' : theme.text}
        contentFit="contain"
      />
      {label ? (
        <Text style={{ fontSize: 15, fontWeight: '600', color: primary ? '#fff' : theme.text }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

function HoursRow({
  entry,
  isToday,
  theme,
}: {
  entry: OpeningHoursEntry;
  isToday: boolean;
  theme: ReturnType<typeof import('@/hooks/use-theme').useTheme>;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 }}>
      <Text style={{ fontSize: 14, fontWeight: isToday ? '600' : '400', color: isToday ? theme.text : theme.textSecondary, width: 36 }}>
        {DAY_LABELS[entry.dayOfWeek]}
      </Text>
      {entry.isClosed ? (
        <Text style={{ fontSize: 14, color: theme.textSecondary }}>Closed</Text>
      ) : (
        <Text style={{ fontSize: 14, color: isToday ? theme.text : theme.textSecondary, fontWeight: isToday ? '500' : '400' }}>
          {entry.open} – {entry.close}
        </Text>
      )}
    </View>
  );
}

function ServiceRow({ service, theme }: { service: Service; theme: ReturnType<typeof import('@/hooks/use-theme').useTheme> }) {
  const photoUri = resolveMediaUrl(service.photoUrl);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 }}>
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{ width: 56, height: 56, borderRadius: 10 }}
          contentFit="cover"
          transition={200}
        />
      ) : null}
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{service.name}</Text>
        {service.consumerDescription ? (
          <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18 }} numberOfLines={2}>
            {service.consumerDescription}
          </Text>
        ) : null}
        {service.durationMins ? (
          <Text style={{ fontSize: 12, color: theme.textSecondary }}>
            {formatDuration(service.durationMins)}
          </Text>
        ) : null}
      </View>
      {service.priceMinorUnits != null ? (
        <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>
          {formatPrice(service.priceMinorUnits, service.currency)}
        </Text>
      ) : null}
    </View>
  );
}

function StaffCard({ member, theme }: { member: StaffMember; theme: ReturnType<typeof import('@/hooks/use-theme').useTheme> }) {
  const avatarUri = resolveMediaUrl(member.avatarUrl);
  return (
    <View style={{ alignItems: 'center', gap: 8, width: 88 }}>
      {avatarUri ? (
        <Image
          source={{ uri: avatarUri }}
          style={{ width: 64, height: 64, borderRadius: 32 }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.backgroundElement, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: theme.textSecondary }}>
            {member.displayName.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={{ fontSize: 13, fontWeight: '500', color: theme.text, textAlign: 'center' }} numberOfLines={2}>
        {member.displayName}
      </Text>
      {member.specialties?.length ? (
        <Text style={{ fontSize: 11, color: theme.textSecondary, textAlign: 'center' }} numberOfLines={1}>
          {member.specialties[0]}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Map card ─────────────────────────────────────────────────────────────────

type MapMode = 'walking' | 'driving';
type EtaInfo = { duration: number; distance: number };

function fmtDuration(s: number): string {
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function fmtDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`;
}

function BusinessMapCard({
  coords,
  fullAddress,
  name,
  theme,
  isDark,
  screenWidth,
}: {
  coords?: { lat: number; lng: number };
  fullAddress?: string;
  name: string;
  theme: ReturnType<typeof useTheme>;
  isDark: boolean;
  screenWidth: number;
}) {
  const location = useLocation();
  const userCoords = location.status === 'ready' ? location.coords : null;

  const [mode, setMode] = useState<MapMode>('walking');
  const [eta, setEta] = useState<EtaInfo | null>(null);

  useEffect(() => {
    if (!userCoords || !coords || !MAPBOX_TOKEN) return;
    let cancelled = false;

    void fetch(
      `https://api.mapbox.com/directions/v5/mapbox/${mode}/${userCoords.lng},${userCoords.lat};${coords.lng},${coords.lat}?overview=false&access_token=${MAPBOX_TOKEN}`,
    )
      .then((r) => r.json())
      .then((data: { routes?: Array<{ duration: number; distance: number }> }) => {
        if (cancelled || !data.routes?.[0]) return;
        const r = data.routes[0];
        setEta({ duration: r.duration, distance: r.distance });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [userCoords, mode, coords]);

  const mapUri = coords
    ? mapboxStaticUrl(coords.lat, coords.lng, screenWidth - 40, isDark)
    : null;

  const directionsUrl =
    Platform.OS === 'ios'
      ? `maps:?ll=${coords?.lat},${coords?.lng}&q=${encodeURIComponent(name)}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${coords?.lat},${coords?.lng}&travelmode=driving`;

  return (
    <View
      style={{
        borderRadius: 18,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: theme.backgroundElement,
      }}
    >
      {/* Map image */}
      <View>
        {mapUri ? (
          <Image
            source={{ uri: mapUri }}
            style={{ width: '100%', height: 200 }}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View
            style={{
              height: 120,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source="sf:map"
              style={{ width: 28, height: 28 }}
              tintColor={theme.textSecondary}
              contentFit="contain"
            />
          </View>
        )}

        {/* ETA overlay */}
        {eta ? (
          <View
            style={{
              position: 'absolute',
              bottom: 10,
              left: 12,
              right: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: 'rgba(0,0,0,0.68)',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>
                {fmtDuration(eta.duration)}
              </Text>
              <View style={{ width: 1, height: 12, backgroundColor: 'rgba(255,255,255,0.3)' }} />
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
                {fmtDistance(eta.distance)}
              </Text>
            </View>

            <View
              style={{
                flexDirection: 'row',
                backgroundColor: 'rgba(0,0,0,0.68)',
                borderRadius: 999,
                padding: 3,
                gap: 2,
              }}
            >
              <Pressable
                onPress={() => setMode('walking')}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: mode === 'walking' ? '#E16349' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 15 }}>🚶</Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('driving')}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: mode === 'driving' ? '#E16349' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 15 }}>🚗</Text>
              </Pressable>
            </View>
          </View>
        ) : userCoords && coords ? (
          <View
            style={{
              position: 'absolute',
              bottom: 10,
              left: 12,
            }}
          >
            <View
              style={{
                backgroundColor: 'rgba(0,0,0,0.68)',
                paddingHorizontal: 12,
                paddingVertical: 7,
                borderRadius: 999,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                Getting ETA…
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      {/* Address + Directions */}
      <View
        style={{
          backgroundColor: theme.background,
          paddingHorizontal: 16,
          paddingVertical: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <Image
          source="sf:mappin.circle.fill"
          style={{ width: 20, height: 20 }}
          tintColor={DiscoverColors.accent}
          contentFit="contain"
        />
        <View style={{ flex: 1 }}>
          {fullAddress ? (
            <Text
              style={{ fontSize: 14, fontWeight: '500', color: theme.text }}
              selectable
              numberOfLines={2}
            >
              {fullAddress}
            </Text>
          ) : (
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>Location</Text>
          )}
        </View>
        {coords ? (
          <Pressable
            onPress={() => void Linking.openURL(directionsUrl)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: DiscoverColors.accent + '18',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: DiscoverColors.accent }}>
              Directions
            </Text>
            <Image
              source="sf:arrow.up.right"
              style={{ width: 11, height: 11 }}
              tintColor={DiscoverColors.accent}
              contentFit="contain"
            />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BusinessProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [hoursExpanded, setHoursExpanded] = useState(false);

  const profile = useQuery(api.public.getPublicProfile, slug ? { slug } : 'skip');

  if (!slug) {
    return <CenteredMessage theme={theme} message="Missing business." />;
  }

  if (profile === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.textSecondary} />
      </View>
    );
  }

  if (profile === null) {
    return <CenteredMessage theme={theme} message="Business not found." />;
  }

  const coverUri = resolveMediaUrl(
    profile.media?.find((m: any) => m.type === 'cover')?.url ?? profile.logoUrl,
  );
  const logoUri = resolveMediaUrl(profile.logoUrl);
  const galleryMedia = profile.media?.filter((m: any) => m.type !== 'cover') ?? [];
  const isOpen = isOpenNow(profile.openingHours as OpeningHoursEntry[]);
  const price = priceRangeSymbol(profile.priceRange);
  const serviceGroups = groupByCategory(profile.services ?? []);
  const todayIdx = todayDayIndex();
  const sortedHours = [...(profile.openingHours ?? [])].sort((a: any, b: any) => a.dayOfWeek - b.dayOfWeek);
  const venueInfo = venueLabel(profile as any);

  const coords = profile.coordinates as { lat: number; lng: number } | undefined;
  const fullAddress = [profile.address, profile.city, profile.neighborhood].filter(Boolean).join(', ');

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.six }}
      >
        {/* ── Hero ─────────────────────────────────────────────── */}
        <View style={{ height: HERO_HEIGHT, position: 'relative' }}>
          {coverUri ? (
            <Image
              source={{ uri: coverUri }}
              style={{ ...absolute, borderRadius: 0 }}
              contentFit="cover"
              transition={400}
            />
          ) : (
            <View style={{ ...absolute, backgroundColor: theme.backgroundElement }} />
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0.72)', 'rgba(0,0,0,0.2)', 'transparent']}
            locations={[0, 0.4, 1]}
            style={absolute}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.55)']}
            locations={[0.5, 1]}
            style={absolute}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
          />

          {/* Back button */}
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Go back"
            style={({ pressed }) => ({
              position: 'absolute',
              top: insets.top + 8,
              left: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: 'rgba(0,0,0,0.45)',
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Image
              source="sf:chevron.left"
              style={{ width: 14, height: 14 }}
              tintColor="#fff"
              contentFit="contain"
            />
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '500' }}>Back</Text>
          </Pressable>

          {/* Rating badge */}
          {profile.averageRating > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: insets.top + 8,
                right: 16,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                backgroundColor: 'rgba(0,0,0,0.45)',
              }}
            >
              <Image source="sf:star.fill" style={{ width: 12, height: 12 }} tintColor={DiscoverColors.rating} contentFit="contain" />
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                {profile.averageRating.toFixed(1)}
              </Text>
              {profile.reviewCount > 0 ? (
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                  ({profile.reviewCount})
                </Text>
              ) : null}
            </View>
          ) : null}

          {/* Hero bottom info */}
          <View style={{ position: 'absolute', bottom: LOGO_OVERLAP + 12, left: 16, right: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <View style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: isOpen ? DiscoverColors.success + '33' : 'rgba(255,255,255,0.15)',
                borderWidth: 1,
                borderColor: isOpen ? DiscoverColors.success : 'rgba(255,255,255,0.3)',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
              }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isOpen ? DiscoverColors.success : 'rgba(255,255,255,0.6)' }} />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>
                  {isOpen ? 'Open now' : 'Closed'}
                </Text>
              </View>
              {price ? (
                <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{price}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Logo badge */}
          {logoUri ? (
            <View style={{
              position: 'absolute',
              bottom: -LOGO_OVERLAP,
              left: 20,
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              borderRadius: LOGO_SIZE / 2,
              overflow: 'hidden',
              borderWidth: 3,
              borderColor: theme.background,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            }}>
              <Image
                source={{ uri: logoUri }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
                transition={200}
              />
            </View>
          ) : (
            <View style={{
              position: 'absolute',
              bottom: -LOGO_OVERLAP,
              left: 20,
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              borderRadius: LOGO_SIZE / 2,
              backgroundColor: theme.backgroundElement,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: theme.background,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}>
              <Text style={{ fontSize: 26, fontWeight: '700', color: theme.textSecondary }}>
                {profile.name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* ── Business Identity ────────────────────────────────── */}
        <View style={{ paddingTop: LOGO_OVERLAP + 14, paddingHorizontal: 20, gap: 4 }}>
          <Text style={{ fontSize: 26, fontWeight: '700', color: theme.text, letterSpacing: -0.4 }}>
            {profile.name}
          </Text>
          <Text style={{ fontSize: 15, color: theme.textSecondary }}>{venueInfo}</Text>
          {profile.tagline ? (
            <Text style={{ fontSize: 15, color: theme.text, marginTop: 4, lineHeight: 22 }}>
              {profile.tagline}
            </Text>
          ) : null}
        </View>

        {/* ── Action Buttons ───────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginTop: 20 }}>
          <ActionButton icon="calendar.badge.plus" label="Book" onPress={() => router.push(`/book/${slug}`)} primary theme={theme} />
          {profile.phone ? (
            <ActionButton
              icon="phone.fill"
              label=""
              onPress={() => Linking.openURL(`tel:${profile.phone}`)}
              theme={theme}
            />
          ) : null}
          {profile.instagramHandle ? (
            <ActionButton
              icon="camera.fill"
              label=""
              onPress={() => Linking.openURL(`https://instagram.com/${profile.instagramHandle}`)}
              theme={theme}
            />
          ) : null}
          {profile.websiteUrl ? (
            <ActionButton
              icon="safari.fill"
              label=""
              onPress={() => Linking.openURL(profile.websiteUrl!)}
              theme={theme}
            />
          ) : null}
        </View>

        {/* ── About ────────────────────────────────────────────── */}
        {profile.bio ? (
          <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
            <SectionLabel label="About" theme={theme} />
            <Text style={{ fontSize: 15, color: theme.text, lineHeight: 24 }} selectable>
              {profile.bio}
            </Text>
          </View>
        ) : null}

        {/* ── Services ─────────────────────────────────────────── */}
        {serviceGroups.length > 0 ? (
          <View style={{ marginTop: 28 }}>
            <View style={{ paddingHorizontal: 20 }}>
              <SectionLabel label="Services" theme={theme} />
            </View>
            {serviceGroups.map(([category, services]) => (
              <View key={category}>
                <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: DiscoverColors.accent }}>
                    {category}
                  </Text>
                </View>
                {services.map((service, idx) => (
                  <View key={service._id}>
                    <View style={{ paddingHorizontal: 20 }}>
                      <ServiceRow service={service} theme={theme} />
                    </View>
                    {idx < services.length - 1 ? (
                      <View style={{ marginLeft: 20, height: 1, backgroundColor: theme.backgroundElement }} />
                    ) : null}
                  </View>
                ))}
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Opening Hours ─────────────────────────────────────── */}
        {sortedHours.length > 0 ? (
          <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
            <SectionLabel label="Hours" theme={theme} />
            <Pressable
              onPress={() => setHoursExpanded((v) => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 }}
            >
              {(() => {
                const today = sortedHours.find((h: any) => h.dayOfWeek === todayIdx);
                return (
                  <Text style={{ fontSize: 15, color: theme.text, fontWeight: '500' }}>
                    {today
                      ? today.isClosed
                        ? 'Closed today'
                        : `Today ${today.open} – ${today.close}`
                      : 'See all hours'}
                  </Text>
                );
              })()}
              <Image
                source={hoursExpanded ? 'sf:chevron.up' : 'sf:chevron.down'}
                style={{ width: 14, height: 14 }}
                tintColor={theme.textSecondary}
                contentFit="contain"
              />
            </Pressable>
            {hoursExpanded ? (
              <View style={{ marginTop: 8 }}>
                <View style={{ height: 1, backgroundColor: theme.backgroundElement, marginBottom: 4 }} />
                {sortedHours.map((h: any) => (
                  <HoursRow key={h.dayOfWeek} entry={h} isToday={h.dayOfWeek === todayIdx} theme={theme} />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Team ─────────────────────────────────────────────── */}
        {profile.staff?.length > 0 ? (
          <View style={{ marginTop: 28 }}>
            <View style={{ paddingHorizontal: 20 }}>
              <SectionLabel label="Our Team" theme={theme} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 20, paddingBottom: 4 }}
            >
              {profile.staff.map((member: any) => (
                <StaffCard key={member._id} member={member} theme={theme} />
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* ── Menu button (hospitality) ────────────────────────── */}
        {profile.menuText ? (
          <View style={{ paddingHorizontal: 20, marginTop: 28 }}>
            <SectionLabel label="Menu" theme={theme} />
            <Pressable
              onPress={() => router.push(`/menu/${slug}`)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: theme.backgroundElement,
                borderRadius: 16,
                borderCurve: 'continuous',
                padding: 16,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <View style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                borderCurve: 'continuous',
                backgroundColor: DiscoverColors.accent + '22',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Image source="sf:menucard.fill" style={{ width: 20, height: 20 }} tintColor={DiscoverColors.accent} contentFit="contain" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>View Full Menu</Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>Drinks, food & specials</Text>
              </View>
              <Image source="sf:chevron.right" style={{ width: 13, height: 13 }} tintColor={theme.textSecondary} contentFit="contain" />
            </Pressable>
          </View>
        ) : null}

        {/* ── Gallery ──────────────────────────────────────────── */}
        {galleryMedia.length > 0 ? (
          <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
            <SectionLabel label="Gallery" theme={theme} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
              {galleryMedia.slice(0, 6).map((m: any, idx: number) => {
                const galleryUri = resolveMediaUrl(m.url);
                if (!galleryUri) return null;
                return (
                <View
                  key={m._id}
                  style={{
                    width: idx === 0 ? '100%' : '48.5%',
                    height: idx === 0 ? 200 : 130,
                    borderRadius: 12,
                    borderCurve: 'continuous',
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: galleryUri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={300}
                  />
                  {m.caption ? (
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.6)']}
                      style={{ ...absolute, justifyContent: 'flex-end', padding: 10 }}
                      pointerEvents="none"
                    >
                      <Text style={{ color: '#fff', fontSize: 12 }} numberOfLines={1}>{m.caption}</Text>
                    </LinearGradient>
                  ) : null}
                </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── Location & Map ───────────────────────────────────── */}
        {(coords || fullAddress) ? (
          <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
            <SectionLabel label="Location" theme={theme} />
            <BusinessMapCard
              coords={coords}
              fullAddress={fullAddress}
              name={profile.name}
              theme={theme}
              isDark={isDark}
              screenWidth={screenWidth}
            />
          </View>
        ) : null}

        {/* ── AI Chat Hint ─────────────────────────────────────── */}
        {profile.aiWebchatEnabled ? (
          <Pressable
            style={({ pressed }) => ({
              marginHorizontal: 20,
              marginTop: 24,
              backgroundColor: theme.backgroundElement,
              borderRadius: 16,
              borderCurve: 'continuous',
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: DiscoverColors.accent + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Image source="sf:sparkles" style={{ width: 20, height: 20 }} tintColor={DiscoverColors.accent} contentFit="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>
                Chat with {profile.aiPersonaName ?? 'Aria'}
              </Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                {profile.aiGreetingMessage ?? 'Ask anything or book instantly'}
              </Text>
            </View>
            <Image source="sf:chevron.right" style={{ width: 12, height: 12 }} tintColor={theme.textSecondary} contentFit="contain" />
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

// ─── Util ─────────────────────────────────────────────────────────────────────

const absolute = { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0 };

function CenteredMessage({ theme, message }: { theme: ReturnType<typeof import('@/hooks/use-theme').useTheme>; message: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ color: theme.textSecondary }}>{message}</Text>
    </View>
  );
}
