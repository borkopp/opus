import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DiscoverColors } from '@/constants/discover';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { api, type Id } from '@/lib/convex-api';
import {
  buildDateRail,
  formatBookingDate,
  formatDuration,
  formatPrice,
  formatSlotTime,
} from '@/lib/format';

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStep = 'service' | 'datetime' | 'details' | 'confirmed';

type Service = {
  _id: string;
  name: string;
  consumerDescription?: string;
  durationMins?: number;
  priceMinorUnits?: number;
  currency?: string;
  categoryName?: string;
  photoUrl?: string;
};

type StaffMember = {
  _id: string;
  displayName: string;
  avatarUrl?: string;
};

type SlotItem = {
  startAt: number;
  availableStaffIds: string[];
  priceMinorUnits?: number;
};

type Confirmation = {
  serviceName: string;
  staffName: string;
  startAt: number;
  priceMinorUnits: number;
  currency?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const DATE_RAIL = buildDateRail(14);
const BOOKING_STEPS: BookingStep[] = ['service', 'datetime', 'details'];

function hapticSelect() {
  void Haptics.selectionAsync();
}
function hapticSuccess() {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
}

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepBar({ step, theme }: { step: BookingStep; theme: ReturnType<typeof useTheme> }) {
  const idx = BOOKING_STEPS.indexOf(step);
  return (
    <View style={{ flexDirection: 'row', gap: 6, paddingTop: 14, paddingBottom: 2 }}>
      {BOOKING_STEPS.map((_, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: 3,
            borderRadius: 2,
            backgroundColor: i <= idx ? DiscoverColors.accent : theme.backgroundElement,
          }}
        />
      ))}
    </View>
  );
}

// ─── Service card ─────────────────────────────────────────────────────────────

function ServiceCard({
  service,
  onPress,
  theme,
}: {
  service: Service;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingHorizontal: 20,
        paddingVertical: 15,
        opacity: pressed ? 0.65 : 1,
      })}
    >
      {service.photoUrl ? (
        <Image
          source={{ uri: service.photoUrl }}
          style={{ width: 58, height: 58, borderRadius: 12, borderCurve: 'continuous' } as any}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={{
          width: 58,
          height: 58,
          borderRadius: 12,
          borderCurve: 'continuous',
          backgroundColor: DiscoverColors.accent + '18',
          alignItems: 'center',
          justifyContent: 'center',
        } as any}>
          <Text style={{ fontSize: 22, fontWeight: '700', color: DiscoverColors.accent }}>
            {service.name.charAt(0)}
          </Text>
        </View>
      )}

      <View style={{ flex: 1, gap: 3 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text }}>{service.name}</Text>
        {service.consumerDescription ? (
          <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 18 }} numberOfLines={2}>
            {service.consumerDescription}
          </Text>
        ) : null}
        {service.durationMins ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
            <Image source="sf:clock" style={{ width: 12, height: 12 }} tintColor={theme.textSecondary} contentFit="contain" />
            <Text style={{ fontSize: 12, color: theme.textSecondary }}>{formatDuration(service.durationMins)}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        {service.priceMinorUnits != null ? (
          <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text }}>
            {formatPrice(service.priceMinorUnits, service.currency)}
          </Text>
        ) : null}
        <Image source="sf:chevron.right" style={{ width: 13, height: 13 }} tintColor={theme.textSecondary} contentFit="contain" />
      </View>
    </Pressable>
  );
}

// ─── Staff chip ───────────────────────────────────────────────────────────────

function StaffChip({
  member,
  selected,
  onPress,
  theme,
}: {
  member: StaffMember | null;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  const label = member ? member.displayName.split(' ')[0] : 'Any';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        backgroundColor: selected ? DiscoverColors.accent : theme.backgroundElement,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {member?.avatarUrl ? (
        <Image
          source={{ uri: member.avatarUrl }}
          style={{ width: 24, height: 24, borderRadius: 12 }}
          contentFit="cover"
        />
      ) : (
        <View style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: selected ? 'rgba(255,255,255,0.22)' : theme.backgroundSelected,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: selected ? '#fff' : theme.textSecondary }}>
            {label.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <Text style={{ fontSize: 14, fontWeight: '600', color: selected ? '#fff' : theme.text }}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Date chip ────────────────────────────────────────────────────────────────

function DateChip({
  option,
  selected,
  onPress,
  theme,
}: {
  option: { value: string; dayLabel: string; dateNum: number };
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
        paddingVertical: 12,
        borderRadius: 16,
        borderCurve: 'continuous',
        backgroundColor: selected ? DiscoverColors.accent : theme.backgroundElement,
        gap: 4,
        opacity: pressed ? 0.7 : 1,
      } as any)}
    >
      <Text style={{ fontSize: 11, fontWeight: '600', color: selected ? 'rgba(255,255,255,0.75)' : theme.textSecondary, letterSpacing: 0.3 }}>
        {option.dayLabel}
      </Text>
      <Text style={{ fontSize: 20, fontWeight: '700', color: selected ? '#fff' : theme.text }}>
        {option.dateNum}
      </Text>
    </Pressable>
  );
}

// ─── Time slot ────────────────────────────────────────────────────────────────

function TimeSlot({
  slot,
  selected,
  onPress,
  theme,
  width,
}: {
  slot: SlotItem;
  selected: boolean;
  onPress: () => void;
  theme: ReturnType<typeof useTheme>;
  width: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 13,
        borderRadius: 14,
        borderCurve: 'continuous',
        backgroundColor: selected ? DiscoverColors.accent : theme.backgroundElement,
        opacity: pressed ? 0.7 : 1,
      } as any)}
    >
      <Text style={{ fontSize: 15, fontWeight: '600', color: selected ? '#fff' : theme.text }}>
        {formatSlotTime(slot.startAt)}
      </Text>
    </Pressable>
  );
}

// ─── Form input ───────────────────────────────────────────────────────────────

function FormInput({
  placeholder,
  value,
  onChangeText,
  multiline,
  theme,
  ...rest
}: {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  theme: ReturnType<typeof useTheme>;
  multiline?: boolean;
} & Pick<TextInputProps, 'keyboardType' | 'autoComplete' | 'returnKeyType' | 'autoCapitalize'>) {
  return (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={theme.textSecondary}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      style={{
        backgroundColor: theme.backgroundElement,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: theme.text,
        minHeight: multiline ? 80 : undefined,
        textAlignVertical: multiline ? 'top' : 'center',
      }}
      {...rest}
    />
  );
}

// ─── Confirmation card ────────────────────────────────────────────────────────

function ConfirmationCard({
  confirmation,
  theme,
}: {
  confirmation: Confirmation;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={{
      borderRadius: 20,
      borderCurve: 'continuous',
      backgroundColor: theme.backgroundElement,
      marginHorizontal: 20,
      padding: 20,
      gap: 16,
    } as any}>
      {/* Service + staff */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: DiscoverColors.accent + '20',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Image source="sf:scissors" style={{ width: 24, height: 24 }} tintColor={DiscoverColors.accent} contentFit="contain" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: theme.text }}>{confirmation.serviceName}</Text>
          <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 2 }}>with {confirmation.staffName}</Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: theme.background }} />

      {/* Date / time */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source="sf:calendar" style={{ width: 15, height: 15 }} tintColor={theme.textSecondary} contentFit="contain" />
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>Date & Time</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>{formatBookingDate(confirmation.startAt)}</Text>
          <Text style={{ fontSize: 13, color: theme.textSecondary }}>{formatSlotTime(confirmation.startAt)}</Text>
        </View>
      </View>

      {/* Total */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source="sf:banknote" style={{ width: 15, height: 15 }} tintColor={theme.textSecondary} contentFit="contain" />
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>Total</Text>
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text }}>
          {formatPrice(confirmation.priceMinorUnits, confirmation.currency)}
        </Text>
      </View>

      {/* Payment */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source="sf:creditcard" style={{ width: 15, height: 15 }} tintColor={theme.textSecondary} contentFit="contain" />
          <Text style={{ fontSize: 14, color: theme.textSecondary }}>Payment</Text>
        </View>
        <Text style={{ fontSize: 14, fontWeight: '500', color: theme.text }}>Pay in cash</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BookScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const createBooking = useMutation(api.publicBooking.createPublicBooking);

  const profile = useQuery(api.public.getPublicProfile, slug ? { slug } : 'skip');

  const [step, setStep] = useState<BookingStep>('service');
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SlotItem | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const selectedService = profile?.services?.find((s: any) => s._id === selectedServiceId) as Service | undefined;
  const staffList = (profile?.staff ?? []) as StaffMember[];

  // Group services by category
  const serviceGroups = useMemo<[string, Service[]][]>(() => {
    const map = new Map<string, Service[]>();
    for (const s of (profile?.services ?? []) as Service[]) {
      const key = s.categoryName ?? 'Services';
      const bucket = map.get(key) ?? [];
      bucket.push(s);
      map.set(key, bucket);
    }
    return [...map.entries()];
  }, [profile?.services]);

  const slots = useQuery(
    api.publicBooking.getPublicSlots,
    profile && selectedServiceId && selectedDate
      ? {
          orgId: profile._id as Id<'orgs'>,
          serviceId: selectedServiceId as Id<'services'>,
          staffId: selectedStaffId
            ? (selectedStaffId as Id<'staff_members'>)
            : ('any' as const),
          date: selectedDate,
        }
      : 'skip',
  );

  // 10px gap, 20px padding each side → slot width for 3-column grid
  const slotWidth = Math.floor((screenWidth - 40 - 20) / 3);

  const handleSelectService = (service: Service) => {
    hapticSelect();
    setSelectedServiceId(service._id);
    setSelectedSlot(null);
    setSelectedDate(null);
    setStep('datetime');
  };

  const handleSelectDate = (date: string) => {
    hapticSelect();
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSelectSlot = (slot: SlotItem) => {
    hapticSelect();
    setSelectedSlot(slot);
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'service') { router.back(); return; }
    if (step === 'datetime') { setStep('service'); return; }
    if (step === 'details') { setStep('datetime'); return; }
    if (step === 'confirmed') { router.dismissAll(); }
  };

  const handleSubmit = async () => {
    if (!profile || !selectedServiceId || !selectedSlot || !customerName.trim() || !customerPhone.trim()) return;
    Keyboard.dismiss();
    setIsSubmitting(true);
    try {
      const staffId = selectedStaffId ?? selectedSlot.availableStaffIds[0];
      const result = await createBooking({
        orgId: profile._id as Id<'orgs'>,
        serviceId: selectedServiceId as Id<'services'>,
        staffId: staffId as Id<'staff_members'>,
        startAt: selectedSlot.startAt,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        customerNote: customerNote.trim() || undefined,
        paymentMethod: 'cash',
      });
      hapticSuccess();
      setConfirmation(result as Confirmation);
      setStep('confirmed');
    } catch (error: any) {
      Alert.alert('Booking Failed', error.data ?? error.message ?? 'Something went wrong. Please try again.');
    }
    setIsSubmitting(false);
  };

  const canSubmit = customerName.trim().length > 0 && customerPhone.trim().length > 0 && !isSubmitting;

  // ── Loading / error ──
  if (!slug) return <View style={{ flex: 1, backgroundColor: theme.background }} />;

  if (profile === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator color={theme.textSecondary} />
      </View>
    );
  }

  if (profile === null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ color: theme.textSecondary }}>Business not found.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Back / close */}
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 4, opacity: pressed ? 0.55 : 1 })}
          >
            <Image source="sf:chevron.left" style={{ width: 14, height: 14 }} tintColor={DiscoverColors.accent} contentFit="contain" />
            <Text style={{ fontSize: 16, color: DiscoverColors.accent, fontWeight: '500' }}>
              {step === 'service' || step === 'confirmed' ? profile.name : 'Back'}
            </Text>
          </Pressable>

          {/* Step title */}
          {step !== 'confirmed' ? (
            <Text
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                textAlign: 'center',
                fontSize: 15,
                fontWeight: '600',
                color: theme.text,
                pointerEvents: 'none',
              } as any}
            >
              {step === 'service' ? 'Choose a Service' : step === 'datetime' ? 'Date & Time' : 'Your Details'}
            </Text>
          ) : null}
        </View>

        {step !== 'confirmed' ? <StepBar step={step} theme={theme} /> : null}
      </View>

      {/* ── STEP 1 — Service selection ── */}
      {step === 'service' ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 24, paddingBottom: insets.bottom + Spacing.six }}
        >
          <Text style={{ fontSize: 28, fontWeight: '800', color: theme.text, letterSpacing: -0.5, paddingHorizontal: 20, marginBottom: 24, lineHeight: 34 }}>
            What can we{'\n'}do for you?
          </Text>

          {serviceGroups.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60, gap: 10 }}>
              <Image source="sf:scissors" style={{ width: 36, height: 36 }} tintColor={theme.textSecondary} contentFit="contain" />
              <Text style={{ fontSize: 14, color: theme.textSecondary }}>No services available</Text>
            </View>
          ) : (
            serviceGroups.map(([category, items]) => (
              <View key={category}>
                <Text style={{
                  fontSize: 11,
                  fontWeight: '600',
                  color: theme.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  paddingHorizontal: 20,
                  paddingTop: 4,
                  paddingBottom: 8,
                }}>
                  {category}
                </Text>
                {items.map((service, idx) => (
                  <View key={service._id}>
                    <ServiceCard service={service} onPress={() => handleSelectService(service)} theme={theme} />
                    {idx < items.length - 1 ? (
                      <View style={{ marginLeft: 92, height: 0.5, backgroundColor: theme.backgroundElement }} />
                    ) : null}
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      ) : null}

      {/* ── STEP 2 — Date & time ── */}
      {step === 'datetime' && selectedService ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + Spacing.six }}
        >
          {/* Selected service pill */}
          <View style={{
            marginHorizontal: 20,
            marginBottom: 28,
            backgroundColor: theme.backgroundElement,
            borderRadius: 16,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '600', color: theme.text }}>{selectedService.name}</Text>
              <Text style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2 }}>
                {[
                  selectedService.durationMins ? formatDuration(selectedService.durationMins) : null,
                  selectedService.priceMinorUnits != null ? formatPrice(selectedService.priceMinorUnits, selectedService.currency) : null,
                ].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Pressable
              onPress={() => setStep('service')}
              hitSlop={8}
              style={({ pressed }) => ({
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: DiscoverColors.accent + '16',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: DiscoverColors.accent }}>Change</Text>
            </Pressable>
          </View>

          {/* Staff picker */}
          {staffList.length > 1 ? (
            <View style={{ marginBottom: 28 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 12 }}>
                With whom?
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
              >
                <StaffChip
                  member={null}
                  selected={!selectedStaffId}
                  onPress={() => { hapticSelect(); setSelectedStaffId(null); setSelectedSlot(null); }}
                  theme={theme}
                />
                {staffList.map((member) => (
                  <StaffChip
                    key={member._id}
                    member={member}
                    selected={selectedStaffId === member._id}
                    onPress={() => { hapticSelect(); setSelectedStaffId(member._id); setSelectedSlot(null); }}
                    theme={theme}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null}

          {/* Date rail */}
          <View style={{ marginBottom: 28 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 20, marginBottom: 12 }}>
              Select Date
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
            >
              {DATE_RAIL.map((option) => (
                <DateChip
                  key={option.value}
                  option={option}
                  selected={selectedDate === option.value}
                  onPress={() => handleSelectDate(option.value)}
                  theme={theme}
                />
              ))}
            </ScrollView>
          </View>

          {/* Time slots */}
          <View style={{ paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 }}>
              {selectedDate ? 'Available Times' : 'Time'}
            </Text>

            {!selectedDate ? (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
                <Image source="sf:calendar.badge.clock" style={{ width: 36, height: 36 }} tintColor={theme.textSecondary} contentFit="contain" />
                <Text style={{ fontSize: 14, color: theme.textSecondary }}>Pick a date to see available times</Text>
              </View>
            ) : slots === undefined ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <View key={i} style={{ width: slotWidth, height: 46, borderRadius: 14, backgroundColor: theme.backgroundElement }} />
                ))}
              </View>
            ) : slots.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 48, gap: 10 }}>
                <Image source="sf:calendar.badge.exclamationmark" style={{ width: 36, height: 36 }} tintColor={theme.textSecondary} contentFit="contain" />
                <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>Fully booked</Text>
                <Text style={{ fontSize: 13, color: theme.textSecondary }}>Try a different date.</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {(slots as SlotItem[]).map((slot) => (
                  <TimeSlot
                    key={slot.startAt}
                    slot={slot}
                    selected={selectedSlot?.startAt === slot.startAt}
                    onPress={() => handleSelectSlot(slot)}
                    theme={theme}
                    width={slotWidth}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      ) : null}

      {/* ── STEP 3 — Customer details ── */}
      {step === 'details' && selectedService && selectedSlot ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingTop: 20, paddingBottom: insets.bottom + 120 }}
          >
            {/* Booking summary */}
            <View style={{
              marginHorizontal: 20,
              marginBottom: 24,
              backgroundColor: theme.backgroundElement,
              borderRadius: 16,
              padding: 16,
              gap: 8,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: theme.text, flex: 1 }}>{selectedService.name}</Text>
                {selectedService.priceMinorUnits != null ? (
                  <Text style={{ fontSize: 16, fontWeight: '700', color: theme.text, marginLeft: 12 }}>
                    {formatPrice(selectedService.priceMinorUnits, selectedService.currency)}
                  </Text>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Image source="sf:calendar" style={{ width: 13, height: 13 }} tintColor={theme.textSecondary} contentFit="contain" />
                <Text style={{ fontSize: 13, color: theme.textSecondary }}>
                  {formatBookingDate(selectedSlot.startAt)} at {formatSlotTime(selectedSlot.startAt)}
                </Text>
              </View>
            </View>

            {/* Form fields */}
            <View style={{ paddingHorizontal: 20, gap: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: theme.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>
                Your Details
              </Text>
              <FormInput
                placeholder="Full name *"
                value={customerName}
                onChangeText={setCustomerName}
                autoComplete="name"
                returnKeyType="next"
                autoCapitalize="words"
                theme={theme}
              />
              <FormInput
                placeholder="Phone number *"
                value={customerPhone}
                onChangeText={setCustomerPhone}
                keyboardType="phone-pad"
                autoComplete="tel"
                returnKeyType="next"
                autoCapitalize="none"
                theme={theme}
              />
              <FormInput
                placeholder="Email (optional)"
                value={customerEmail}
                onChangeText={setCustomerEmail}
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="next"
                autoCapitalize="none"
                theme={theme}
              />
              <FormInput
                placeholder="Note for the team (optional)"
                value={customerNote}
                onChangeText={setCustomerNote}
                returnKeyType="done"
                autoCapitalize="sentences"
                theme={theme}
                multiline
              />

              {/* Payment badge */}
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: DiscoverColors.accent + '12',
                borderRadius: 14,
                padding: 14,
                marginTop: 4,
              }}>
                <Image source="sf:banknote" style={{ width: 20, height: 20 }} tintColor={DiscoverColors.accent} contentFit="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.text }}>Pay in cash</Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>Pay at the venue on the day</Text>
                </View>
                <Image source="sf:checkmark.circle.fill" style={{ width: 20, height: 20 }} tintColor={DiscoverColors.accent} contentFit="contain" />
              </View>
            </View>
          </ScrollView>

          {/* Sticky confirm button */}
          <View style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 16,
            paddingTop: 16,
            backgroundColor: theme.background,
            borderTopWidth: 0.5,
            borderTopColor: theme.backgroundElement,
          }}>
            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => ({
                backgroundColor: canSubmit ? DiscoverColors.accent : theme.backgroundElement,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                gap: 8,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: canSubmit ? '#fff' : theme.textSecondary }}>
                    Confirm Booking
                  </Text>
                  {canSubmit ? (
                    <Image source="sf:arrow.right" style={{ width: 14, height: 14 }} tintColor="#fff" contentFit="contain" />
                  ) : null}
                </>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}

      {/* ── STEP 4 — Confirmed ── */}
      {step === 'confirmed' && confirmation ? (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 48, paddingBottom: insets.bottom + Spacing.six, alignItems: 'center' }}
        >
          {/* Success icon */}
          <View style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: DiscoverColors.success + '20',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}>
            <Image
              source="sf:checkmark.circle.fill"
              style={{ width: 56, height: 56 }}
              tintColor={DiscoverColors.success}
              contentFit="contain"
            />
          </View>

          <Text style={{ fontSize: 30, fontWeight: '800', color: theme.text, letterSpacing: -0.5, textAlign: 'center', marginBottom: 10 }}>
            You're booked!
          </Text>
          <Text style={{ fontSize: 16, color: theme.textSecondary, textAlign: 'center', marginBottom: 36, paddingHorizontal: 40, lineHeight: 24 }}>
            We look forward to seeing you at {profile.name}.
          </Text>

          <ConfirmationCard confirmation={confirmation} theme={theme} />

          <Pressable
            onPress={() => router.dismissAll()}
            style={({ pressed }) => ({
              marginTop: 28,
              marginHorizontal: 20,
              alignSelf: 'stretch',
              backgroundColor: DiscoverColors.accent,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Done</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </View>
  );
}
