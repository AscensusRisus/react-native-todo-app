import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme";

type Props = PropsWithChildren<ScrollViewProps & { scroll?: boolean }>;

export function AppScreen({ children, scroll = true, contentContainerStyle, ...props }: Props) {
  const content = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, contentContainerStyle]}
          {...props}
        >
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flexGrow: 1 },
  inner: { width: "100%", maxWidth: 720, alignSelf: "center", paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 },
});
