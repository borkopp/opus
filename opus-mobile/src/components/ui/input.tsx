import { TextInput, View, type TextInputProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { Text } from "./text";
import { useStudio } from "@/providers/studio-provider";
export function Input({
  label,
  icon: Icon,
  ...props
}: TextInputProps & { label?: string; icon?: LucideIcon }) {
  const { colors, font } = useStudio();
  return (
    <View style={{ gap: 8 }}>
      {label && <Text variant="label">{label}</Text>}
      <View>
        <TextInput
          accessibilityLabel={label ?? props.placeholder}
          placeholderTextColor={colors.muted}
          {...props}
          style={[
            {
              minHeight: 50,
              borderRadius: 14,
              padding: 14,
              paddingLeft: Icon ? 44 : 14,
              color: colors.foreground,
              backgroundColor: colors.secondary,
              fontFamily: font,
              fontSize: 16,
            },
            props.style,
          ]}
        />
        {Icon && (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              position: "absolute",
              left: 14,
              top: 0,
              bottom: 0,
              justifyContent: "center",
            }}
          >
            <Icon size={19} color={colors.muted} strokeWidth={1.8} />
          </View>
        )}
      </View>
    </View>
  );
}
