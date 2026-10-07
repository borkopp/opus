import { View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Text } from "./text";
import { useStudio } from "@/providers/studio-provider";

export function Brand() {
  const { colors } = useStudio();
  return (
    <View
      accessible
      accessibilityLabel="OPUS"
      style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
    >
      <Svg width={28} height={34} viewBox="0 0 40 48" fill={colors.brand}>
        <Path
          d="m40 32v-16c0-6.62742-5.3726-12-12-12h-16l-12 12h22c3.3137 0 6 2.6863 6 6v22z"
          opacity={0.3}
        />
        <Path d="m.0000014 16-.0000014 16c-.00000058 6.6274 5.37258 12 12 12h16l12-12h-20c-4.4183 0-8-3.5817-8-8v-20z" />
      </Svg>
      <Text
        style={{
          fontFamily: "Audiowide_400Regular",
          fontSize: 20,
          letterSpacing: 0.4,
        }}
      >
        OPUS
      </Text>
    </View>
  );
}
