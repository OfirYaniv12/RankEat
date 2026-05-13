import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function HomeScreen({ navigation }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  React.useEffect(() => {
    // Pulsing glow on button
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const buttonShadowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.accent, COLORS.accentLight],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Background decorative circles */}
      <View style={[styles.circle1, isMobile && styles.circle1Mobile]} />
      <View style={[styles.circle2, isMobile && styles.circle2Mobile]} />

      {/* Logo / App Name */}
      <View style={styles.header}>
        <Text style={[styles.logoEmoji, isMobile && { fontSize: 56 }]}>🍔</Text>
        <Text style={[styles.appName, isMobile && { fontSize: 32 }]}>RankEat</Text>
        <Text style={[styles.tagline, isMobile && { fontSize: 13 }]}>הדירוגים הכי טובים, בכף ידך</Text>
      </View>

      {/* CTA Button */}
      <View style={styles.ctaWrapper}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            style={[styles.ctaButton, isMobile && { minWidth: 200, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md }]}
            onPress={() => navigation.navigate('CategorySelect')}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={1}
          >
            <Text style={[styles.ctaText, isMobile && { fontSize: 18 }]}>מה אוכלים? 🍽️</Text>
          </TouchableOpacity>
        </Animated.View>
        <Text style={[styles.ctaHint, isMobile && { fontSize: 12 }]}>בחר קטגוריה ואזור לגלות את הכי טוב</Text>
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, isMobile && { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm }]}>
        <View style={[styles.statItem, isMobile && { paddingHorizontal: SPACING.md }]}>
          <Text style={[styles.statNumber, isMobile && { fontSize: 20 }]}>8</Text>
          <Text style={[styles.statLabel, isMobile && { fontSize: 11 }]}>קטגוריות</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.statItem, isMobile && { paddingHorizontal: SPACING.md }]}>
          <Text style={[styles.statNumber, isMobile && { fontSize: 20 }]}>4</Text>
          <Text style={[styles.statLabel, isMobile && { fontSize: 11 }]}>אזורים</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.statItem, isMobile && { paddingHorizontal: SPACING.md }]}>
          <Text style={[styles.statNumber, isMobile && { fontSize: 20 }]}>∞</Text>
          <Text style={[styles.statLabel, isMobile && { fontSize: 11 }]}>מנות</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  circle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: COLORS.accent + '18',
    top: -80,
    right: -100,
  },
  circle1Mobile: {
    width: 250,
    height: 250,
    borderRadius: 125,
    top: -50,
    right: -60,
  },
  circle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: COLORS.accentSecondary + '14',
    bottom: -50,
    left: -80,
  },
  circle2Mobile: {
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: -30,
    left: -50,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoEmoji: {
    fontSize: 72,
    marginBottom: SPACING.sm,
  },
  appName: {
    fontFamily: FONTS.bold,
    fontSize: 42,
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  ctaWrapper: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.pill,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 20,
    elevation: 12,
    minWidth: 240,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: '#FFFFFF',
    writingDirection: 'rtl',
  },
  ctaHint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  statNumber: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.accent,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
});
