import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, Text, View } from "react-native";

const LOGO = require("../assets/AudioFlashLogo.png");

export function SplashScreen({ visible, onHidden }: { visible: boolean; onHidden: () => void }) {
  const opacity = useRef(new Animated.Value(1)).current;
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (visible) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onHidden();
    });
  }, [visible]);

  useEffect(() => {
    function pulseDot(dot: Animated.Value, delay: number) {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
          Animated.delay(Math.max(0, 600 - delay)),
        ])
      );
    }
    const a1 = pulseDot(dot1, 0);
    const a2 = pulseDot(dot2, 200);
    const a3 = pulseDot(dot3, 400);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity }]}>
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      <Text style={styles.wordmark}>AudioFlash</Text>
      <View style={styles.dots}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: dot }]} />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FF6B4A",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 96,
    height: 96,
  },
  wordmark: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "700",
    marginTop: 16,
    letterSpacing: 0.3,
  },
  dots: {
    flexDirection: "row",
    gap: 10,
    marginTop: 60,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.9)",
  },
});
