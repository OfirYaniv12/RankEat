import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import { getHomeStats } from '../database/queries';

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [stats, setStats] = useState({ cities: 0, restaurants: 0, reviews: 0 });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const drawerAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current; 

  React.useEffect(() => {
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

  const toggleDrawer = () => {
    const nextState = !isDrawerOpen;
    if (nextState) {
      setIsDrawerOpen(true);
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsDrawerOpen(false));
    }
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

      {/* Fixed Header */}
      <View style={[styles.topHeader, { paddingHorizontal: width * 0.1 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.authBtn} onPress={() => {}}>
            <Text style={styles.authText}>הרשמה</Text>
          </TouchableOpacity>
          <View style={{ width: SPACING.md }} />
          <TouchableOpacity style={styles.authBtn} onPress={() => {}}>
            <Text style={styles.authText}>התחברות</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.headerCenter}>
          <Text style={styles.headerLogo}>🍔 RankEat</Text>
        </View>

        <TouchableOpacity style={styles.headerRight} onPress={toggleDrawer}>
          <View style={styles.hamburger}>
            <View style={styles.hamburgerLine} />
            <View style={[styles.hamburgerLine, { marginVertical: 5 }]} />
            <View style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Side Drawer Modal */}
      {isDrawerOpen && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.drawerOverlay} 
            onPress={toggleDrawer} 
          />
          <Animated.View style={[
            styles.drawerContent, 
            { width: isMobile ? '70%' : 300, transform: [{ translateX: drawerAnim }] }
          ]}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>תפריט</Text>
            </View>
            <View style={styles.drawerBody}>
              {/* Future menu items will go here */}
              <Text style={styles.emptyDrawerText}>בקרוב...</Text>
            </View>
          </Animated.View>
        </View>
      )}

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
          <Text style={[styles.statNumber, isMobile && { fontSize: 22 }]}>{formatNumber(stats.reviews)}</Text>
          <Text style={[styles.statLabel, isMobile && { fontSize: 13 }]}>דירוגים</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.statItem, isMobile && { paddingHorizontal: SPACING.md }]}>
          <Text style={[styles.statNumber, isMobile && { fontSize: 22 }]}>{formatNumber(stats.restaurants)}</Text>
          <Text style={[styles.statLabel, isMobile && { fontSize: 13 }]}>מסעדות</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.statItem, isMobile && { paddingHorizontal: SPACING.md }]}>
          <Text style={[styles.statNumber, isMobile && { fontSize: 22 }]}>{formatNumber(stats.cities, true)}</Text>
          <Text style={[styles.statLabel, isMobile && { fontSize: 13 }]}>ערים</Text>
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
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authBtn: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  authText: {
    fontFamily: FONTS.semibold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: -1,
  },
  headerLogo: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  hamburger: {
    width: 24,
    height: 20,
    justifyContent: 'center',
  },
  hamburgerLine: {
    width: 24,
    height: 2,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 2,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: SPACING.xl,
  },
  drawerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  closeDrawer: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  drawerBody: {
    flex: 1,
  },
  emptyDrawerText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.md,
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
  logoHero: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoEmoji: {
    fontSize: 100,
    marginBottom: SPACING.md,
  },
  appName: {
    fontFamily: FONTS.bold,
    fontSize: 56,
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  ctaWrapper: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xl,
    borderRadius: RADIUS.pill,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 15,
    minWidth: 320,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FONTS.bold,
    fontSize: 28,
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
    fontSize: 28,
    color: COLORS.accent,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
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
