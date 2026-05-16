import React, { useState, useRef, useEffect } from 'react';
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
import { getHomeStats } from '../database/queries';

export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({ cities: 0, restaurants: 0, reviews: 0 });

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => {
    fetchStats();
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

  const fetchStats = async () => {
    try {
      const data = await getHomeStats();
      setStats(data);
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const formatNumber = (num, isExact = false) => {
    if (isExact || num < 1000) return num.toLocaleString();
    return Math.floor(num / 1000) + 'K+';
  };

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

      {/* Main Content Area (Centered) */}
      <View style={styles.mainContent}>
        {/* Logo / App Name */}
        <View style={styles.logoHero}>
          <Text style={[styles.logoEmoji, isMobile && { fontSize: 80 }]}>🍔</Text>
          <Text style={[styles.appName, isMobile && { fontSize: 48 }]}>RankEat</Text>
          <Text style={[styles.tagline, isMobile && { fontSize: 18 }]}>הדירוגים הכי טובים, בכף ידך</Text>
        </View>

        {/* CTA Button */}
        <View style={styles.ctaWrapper}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.ctaButton, isMobile && { minWidth: 280, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg }]}
              onPress={() => navigation.navigate('CategorySelect')}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={1}
            >
              <Text style={[styles.ctaText, isMobile && { fontSize: 24 }]}>מה אוכלים? 🍽️</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Stats row (Bottom) */}
      <View style={[styles.statsRow, isMobile && { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, marginBottom: SPACING.xl }]}>
        <View style={[styles.statItem, isMobile && { paddingHorizontal: SPACING.md }]}>
          <Text style={[styles.statNumber, isMobile && { fontSize: 22 }]}>{formatNumber(stats.cities, true)}</Text>
          <Text style={[styles.statLabel, isMobile && { fontSize: 13 }]}>ערים</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.statItem, isMobile && { paddingHorizontal: SPACING.md }]}>
          <Text style={[styles.statNumber, isMobile && { fontSize: 22 }]}>{formatNumber(stats.restaurants)}</Text>
          <Text style={[styles.statLabel, isMobile && { fontSize: 13 }]}>מסעדות</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.statItem, isMobile && { paddingHorizontal: SPACING.md }]}>
          <Text style={[styles.statNumber, isMobile && { fontSize: 22 }]}>{formatNumber(stats.reviews)}</Text>
          <Text style={[styles.statLabel, isMobile && { fontSize: 13 }]}>דירוגים</Text>
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
    overflow: 'hidden',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  logoHero: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoEmoji: {
    fontSize: 120,
    marginBottom: SPACING.md,
  },
  appName: {
    fontFamily: FONTS.bold,
    fontSize: 64,
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 22,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  ctaWrapper: {
    marginTop: SPACING.xl,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    borderRadius: RADIUS.pill, // Fix the weird rectangle shadow!
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 48,
    paddingVertical: 20,
    borderRadius: RADIUS.pill,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: '#FFF',
  },
  statsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  statNumber: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
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
});
