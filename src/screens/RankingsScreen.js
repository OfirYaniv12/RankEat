import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { getRankedDishes } from '../database/queries';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function RankingsScreen({ navigation, route }) {
  const { category, district, city } = route.params;

  const [dishes, setDishes] = useState([]);
  const [globalAvg, setGlobalAvg] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      const { dishes: data, globalAvg: avg } = await getRankedDishes({
        categoryId: category.id,
        districtId: district?.id,
        cityId: city?.id,
      });
      setDishes(data);
      setGlobalAvg(avg);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (e) {
      console.error(e);
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (hasHalf) stars += '½';
    return stars;
  };

  const renderDishItem = ({ item, index }) => {
    const rank = index + 1;

    let rankBoxSize = 50;
    let rankFontSize = 28;
    if (rank === 1) {
      rankBoxSize = 75;
      rankFontSize = 46;
    } else if (rank === 2) {
      rankBoxSize = 65;
      rankFontSize = 38;
    } else if (rank === 3) {
      rankBoxSize = 55;
      rankFontSize = 32;
    }

    return (
      <Animated.View style={[{ opacity: fadeAnim }, styles.itemWrapper]}>
        
        {/* Rank Number Outside the Card */}
        <View style={styles.rankOuterContainer}>
          <View style={[styles.rankContainer, { width: rankBoxSize, height: rankBoxSize }]}>
            <Text style={[styles.rankText, { fontSize: rankFontSize }]}>{rank}</Text>
          </View>
        </View>

        <View style={styles.squareCard}>
          
          {/* Right Column: Photo */}
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>תמונה</Text>
          </View>

          {/* Center Column: Business Info */}
          <View style={styles.centerCol}>
            {item.city_name && item.city_name !== '—' ? (
              <View style={styles.headlineRow}>
                <View style={styles.headlineHalf}>
                  <Text style={[styles.businessName, { textAlign: 'right' }]} numberOfLines={2} adjustsFontSizeToFit>
                    {item.city_name}
                  </Text>
                </View>
                <Text style={[styles.businessName, { marginHorizontal: 6 }]}>|</Text>
                <View style={styles.headlineHalf}>
                  <Text style={[styles.businessName, { textAlign: 'left' }]} numberOfLines={2} adjustsFontSizeToFit>
                    {item.business_name}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.businessName} numberOfLines={2} adjustsFontSizeToFit>
                {item.business_name}
              </Text>
            )}
            <Text style={styles.addressText} numberOfLines={1}>{item.address || 'כתובת לא הוזנה'}</Text>
            <Text style={styles.reviewCount}>{item.review_count} ביקורות</Text>
          </View>

          {/* Left Column: Rating & Action */}
          <View style={styles.leftCol}>
            <Text style={styles.ratingNumber}>★ {item.avg_rating.toFixed(1)}</Text>
            <TouchableOpacity style={styles.addReviewBtn} onPress={() => {}}>
              <Text style={styles.addReviewBtnText}>הוסף דירוג</Text>
            </TouchableOpacity>
          </View>

        </View>
      </Animated.View>
    );
  };

  const locationLabel = city?.name || district?.name || 'כל הארץ';
  const dynamicHeadline = `מחפשים את ה${category.name} הכי טוב ב${locationLabel}`;

  return (
    <ScrollView 
      style={[styles.container, Platform.OS === 'web' && { height: '100vh' }]}
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={true} // Force show scrollbar
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.headlineBanner}>
            <Text style={styles.mainPageHeadline}>{dynamicHeadline}</Text>
            {globalAvg > 0 && !loading && !error && (
              <Text style={styles.mainPageSubtitle}>
                ממוצע גלובלי: {globalAvg.toFixed(2)}
              </Text>
            )}
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>מחשב דירוגים...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : dishes.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>אין מנות עדיין</Text>
          <Text style={styles.emptyText}>
            לא נמצאו מנות בקטגוריה "{category.name}" ב{locationLabel}
          </Text>
        </View>
      ) : (
        <View style={styles.listContent}>
          {dishes.map((item, index) => (
            <React.Fragment key={item.id.toString()}>
              {renderDishItem({ item, index })}
              {index < dishes.length - 1 && <View style={{ height: SPACING.lg }} />}
            </React.Fragment>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backIcon: {
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  headlineBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill, 
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.accent, 
    width: '80%', // Slightly wider than the white bullet to create a symmetrical canopy
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center', 
    marginBottom: SPACING.md,
    transform: [{ translateX: 13 }], // Mathematically centers exactly over the white bullet!
  },
  mainPageHeadline: {
    fontFamily: FONTS.bold,
    fontSize: 20, // Adjusted to fit nicely in the box
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  mainPageSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    writingDirection: 'rtl',
    marginTop: 4,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  itemWrapper: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    alignSelf: 'center',
    width: '85%', // Less wide (was taking full width, now constrained)
    justifyContent: 'center',
    transform: [{ translateX: 65 }], // Shifts the entire block right so the center column's | aligns with the screen center
  },
  rankOuterContainer: {
    width: 80, // Fixed width prevents the card from changing width when rank scales!
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.lg, // Pushes the outer container (which holds the rank box) away from the card!
  },
  rankContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent, // Box!
    borderRadius: 14,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  rankText: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  squareCard: {
    flex: 1,
    flexDirection: 'row-reverse',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md, // Restore internal padding
    borderWidth: 1,
    borderColor: COLORS.textPrimary,
    height: 200, // Fixed height ensures all bullets are exactly the same size!
    alignItems: 'center', 
  },
  photoPlaceholder: {
    width: 160, // Perfect square
    height: 160, // A bit less than the 200 height bullet
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
  },
  photoPlaceholderText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  centerCol: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  businessName: {
    fontFamily: FONTS.bold,
    fontSize: 40, // True headline size
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: -8, // Push slightly up without breaking layout
  },
  headlineRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineHalf: {
    flex: 1,
    justifyContent: 'center',
  },
  addressText: {
    fontFamily: FONTS.regular,
    fontSize: 18, 
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 36, // Push significantly lower!
  },
  reviewCount: {
    fontFamily: FONTS.regular,
    fontSize: 16, 
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: 8, // Directly under address
  },
  leftCol: {
    alignItems: 'center',
    justifyContent: 'center', // Keep them close to the center
    width: 110, // Wider column for a bigger button
  },
  ratingNumber: {
    fontFamily: FONTS.bold,
    fontSize: 34, 
    color: '#FFD700', // Gold color for rating
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    marginBottom: SPACING.xl, // Space between rating and button
  },
  addReviewBtn: {
    borderWidth: 1,
    borderColor: COLORS.textPrimary,
    paddingVertical: 12, // Bigger button
    paddingHorizontal: 8, 
    borderRadius: 6,
    backgroundColor: COLORS.surfaceHover,
    width: '100%', 
  },
  addReviewBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: 16, // Bigger text
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    writingDirection: 'rtl',
  },
  errorText: {
    fontFamily: FONTS.semibold,
    fontSize: 16,
    color: '#FF6B6B',
    writingDirection: 'rtl',
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
});
