import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { getRankedDishes } from '../database/queries';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDAL_EMOJIS = ['🥇', '🥈', '🥉'];

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
    const isTopThree = rank <= 3;
    const medallColor = isTopThree ? MEDAL_COLORS[rank - 1] : COLORS.border;
    const medalEmoji = isTopThree ? MEDAL_EMOJIS[rank - 1] : null;

    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        <View style={[styles.dishCard, isTopThree && styles.dishCardTop]}>
          {/* Rank Badge */}
          <View style={[styles.rankBadge, { borderColor: medallColor }]}>
            {medalEmoji ? (
              <Text style={styles.medalEmoji}>{medalEmoji}</Text>
            ) : (
              <Text style={[styles.rankNumber, { color: COLORS.textSecondary }]}>#{rank}</Text>
            )}
          </View>

          {/* Dish Info */}
          <View style={styles.dishInfo}>
            <Text style={styles.dishName}>{item.name}</Text>
            <Text style={styles.businessName}>{item.business_name}</Text>
            <Text style={styles.cityName}>{item.city_name}</Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingBlock}>
            <Text style={[styles.ratingNumber, isTopThree && { color: medallColor }]}>
              {item.avg_rating.toFixed(1)}
            </Text>
            <Text style={[styles.ratingStars, { color: medallColor }]}>
              {renderStars(item.avg_rating)}
            </Text>
            <Text style={styles.reviewCount}>{item.review_count} דירוגים</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const locationLabel = city?.name || district?.name || 'כל הארץ';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerCategory}>{category.name}</Text>
          <Text style={styles.headerLocation}>{locationLabel}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Title Banner */}
      {!loading && !error && (
        <Animated.View style={[styles.banner, { opacity: fadeAnim }]}>
          <Text style={styles.bannerTitle}>🏆 לוח הדירוגים</Text>
          {globalAvg > 0 && (
            <Text style={styles.bannerSubtitle}>
              ממוצע גלובלי: {globalAvg.toFixed(2)} | שיטת Bayesian Average
            </Text>
          )}
        </Animated.View>
      )}

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
        <FlatList
          data={dishes}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderDishItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: SPACING.sm }} />}
        />
      )}
    </View>
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
    alignItems: 'center',
  },
  headerCategory: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
  },
  headerLocation: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    writingDirection: 'rtl',
    marginTop: 2,
  },
  banner: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  bannerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
  },
  bannerSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  dishCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dishCardTop: {
    borderColor: COLORS.accent + '50',
    backgroundColor: COLORS.surface,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.md,
    flexShrink: 0,
  },
  medalEmoji: {
    fontSize: 24,
  },
  rankNumber: {
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  dishInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  dishName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  businessName: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.accent,
    writingDirection: 'rtl',
    marginTop: 2,
  },
  cityName: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    writingDirection: 'rtl',
    marginTop: 1,
  },
  ratingBlock: {
    alignItems: 'center',
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  ratingNumber: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
  },
  ratingStars: {
    fontSize: 12,
    color: '#FFD700',
    letterSpacing: 1,
  },
  reviewCount: {
    fontFamily: FONTS.regular,
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
    writingDirection: 'rtl',
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
