import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getRankedDishes } from '../database/queries';
import { getRankedRestaurants } from '../database/SearchQueries';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import { useAuth } from '../context/AuthContext';
import RatingFormModal from '../components/RatingFormModal';
import DishReviewsModal from '../components/DishReviewsModal';

export default function RankingsScreen({ navigation, route }) {
  const { user } = useAuth();
  const { searchType = 'dish', category, district, city, restaurants: initialRestaurants } = route.params || {};
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Unified rating form modal
  const [ratingFormVisible, setRatingFormVisible] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);

  // Dish reviews modal
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [reviewsDish, setReviewsDish] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      if (searchType === 'restaurant') {
        if (initialRestaurants) {
          setDishes(initialRestaurants);
        } else {
          const data = await getRankedRestaurants({
            nameQuery: route.params.nameQuery,
            searchMode: route.params.searchMode,
            selectedLocation: route.params.selectedLocation,
            selectedCategoryIds: route.params.selectedCategoryIds,
            userCityId: user?.city_id,
            userDistrictId: user?.district_id,
          });
          setDishes(data);
        }
      } else {
        const { dishes: data } = await getRankedDishes({
          categoryId: category.id,
          districtId: district?.id,
          cityId: city?.id,
        });
        setDishes(data);
      }
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (e) {
      console.error('loadRankings error:', e);
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (dish) => {
    setSelectedDish(dish);
    setRatingFormVisible(true);
  };

  const handleOpenReviews = (dish) => {
    setReviewsDish(dish);
    setReviewsModalVisible(true);
  };

  // --- Dynamic Medal Badge Styling Helper ---
  const getRankBadgeColor = (rank) => {
    if (rank === 1) return COLORS.gold || '#FFD700';
    if (rank === 2) return COLORS.silver || '#C0C0C0';
    if (rank === 3) return COLORS.bronze || '#CD7F32';
    return '#FF7F50'; // Default accent orange
  };

  const getRankTextColor = (rank) => {
    if (rank <= 3) return '#0D0F14'; // Beautiful high contrast on medals
    return '#FFFFFF';
  };

  // ─── RENDER DISH ITEM (Legacy) ─────────────────────────────────────────────
  const renderDishItem = ({ item, index }) => {
    const rank = index + 1;
    const badgeBg = getRankBadgeColor(rank);
    const badgeText = getRankTextColor(rank);

    if (isMobile) {
      return (
        <Animated.View style={[{ opacity: fadeAnim, width: '100%', maxWidth: 800, alignSelf: 'center' }, styles.cardWrapper]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleOpenReviews(item)}
          >
            <View style={[
              styles.premiumCard, 
              { 
                position: 'relative', 
                width: '100%', 
                flexDirection: 'column', 
                padding: 16, 
                marginBottom: 16,
                borderColor: rank <= 3 ? badgeBg + '44' : 'rgba(255, 255, 255, 0.05)',
                borderWidth: rank <= 3 ? 1.5 : 1,
              }
            ]}>
              {/* Rank Circle absolute overlay top-right */}
              <View style={[styles.mobileRankOverlay, { backgroundColor: badgeBg }]}>
                <Text style={[styles.mobileRankOverlayText, { color: badgeText }]}>{rank}</Text>
              </View>

              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', width: '100%' }}>
                {/* Far Right: Dish Image */}
                <View style={[styles.photoPlaceholder, { width: 70, height: 70 }]}>
                  <MaterialIcons name="lunch-dining" size={24} color="#FF7F50" />
                </View>

                {/* Middle Column: Text */}
                <View style={{ flex: 1, marginHorizontal: 12, alignItems: 'flex-end' }}>
                  <Text style={[styles.cardTitle, { fontSize: 18, color: '#FFFFFF', textAlign: 'right' }]} numberOfLines={2}>
                    {item.business_name} | {item.city_name}
                  </Text>
                  <Text style={[styles.cardAddress, { fontSize: 14, color: '#A0A0A5', textAlign: 'right', marginTop: 4 }]} numberOfLines={1}>
                    {item.address || 'כתובת לא הוזנה'}
                  </Text>
                  <Text style={[styles.cardReviews, { fontSize: 12, color: '#6E6E73', textAlign: 'right', marginTop: 4 }]} numberOfLines={1}>
                    דורג ע"י {item.review_count || 0} אנשים
                  </Text>
                </View>

                <View style={[styles.ratingBadge, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'flex-end', marginBottom: 6 }]}>
                  <Text style={[styles.ratingBadgeText, { fontSize: 15 }]}>
                    ★ {item.weighted_score.toFixed(1)}
                  </Text>
                </View>
              </View>

              {/* Stacked Action Buttons */}
              <View style={{ flexDirection: 'column', width: '100%', marginTop: 12, gap: 8 }}>
                <TouchableOpacity 
                  style={[styles.outlineBtnAccent, { width: '100%', paddingVertical: 10, borderRadius: 8 }]}
                  onPress={(e) => { e.stopPropagation(); handleOpenModal(item); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.outlineBtnAccentText, { fontSize: 14, textAlign: 'center' }]}>הוסף דירוג</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.outlineBtn, { width: '100%', paddingVertical: 10, borderRadius: 8 }]}
                  onPress={(e) => { e.stopPropagation(); navigation.navigate('BusinessProfile', { businessId: item.business_id }); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.outlineBtnText, { fontSize: 14, textAlign: 'center' }]}>לעמוד המסעדה</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={[{ opacity: fadeAnim }, styles.cardWrapper]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => handleOpenReviews(item)}
        >
          <View style={styles.outerRowContainer}>
            <View style={[styles.rankBadgeCircle, { width: 44, height: 44, borderRadius: 22, backgroundColor: badgeBg }]}>
              <Text style={[styles.rankBadgeText, { fontSize: 20, color: badgeText }]}>{rank}</Text>
            </View>

            <View style={[
              styles.premiumCard, 
              { 
                flex: 1, 
                flexDirection: 'row-reverse', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: 20,
                borderColor: rank <= 3 ? badgeBg + '44' : 'rgba(255, 255, 255, 0.05)',
                borderWidth: rank <= 3 ? 1.5 : 1,
              }
            ]}>
              <View style={[styles.photoPlaceholder, { width: 100, height: 100, flexShrink: 0 }]}>
                <MaterialIcons name="lunch-dining" size={40} color="#FF7F50" />
              </View>

              <View style={[styles.textSection, { marginHorizontal: 16, flex: 1, alignItems: 'flex-end' }]}>
                <Text style={[styles.cardTitle, { fontSize: 22 }]} numberOfLines={2}>
                  {item.business_name} | {item.city_name}
                </Text>
                <Text style={[styles.cardAddress, { fontSize: 16 }]} numberOfLines={1}>
                  {item.address || 'כתובת לא הוזנה'}
                </Text>
                <Text style={[styles.cardReviews, { fontSize: 14 }]} numberOfLines={1}>
                  דורג ע"י {item.review_count || 0} אנשים
                </Text>
              </View>

              <View style={[styles.leftSection, { height: 100 }]}>
                <View style={[styles.ratingBadge, { paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.ratingBadgeText, { fontSize: 18 }]}>
                    ★ {item.weighted_score.toFixed(1)}
                  </Text>
                </View>

                <View style={[styles.actionButtonRow, { gap: 10 }]}>
                  <TouchableOpacity 
                    style={[styles.outlineBtn, { paddingVertical: 10, paddingHorizontal: 16 }]}
                    onPress={() => navigation.navigate('BusinessProfile', { businessId: item.business_id })}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.outlineBtnText, { fontSize: 15 }]}>לעמוד המסעדה</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.outlineBtnAccent, { paddingVertical: 10, paddingHorizontal: 16 }]}
                    onPress={() => handleOpenModal(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.outlineBtnAccentText, { fontSize: 15 }]}>הוסף דירוג</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // ─── RENDER RESTAURANT ITEM (New Storefront) ───────────────────────────────
  const renderRestaurantItem = ({ item, index }) => {
    const rank = index + 1;
    const badgeBg = getRankBadgeColor(rank);
    const badgeText = getRankTextColor(rank);

    if (isMobile) {
      return (
        <Animated.View style={[{ opacity: fadeAnim, width: '100%', maxWidth: 800, alignSelf: 'center' }, styles.cardWrapper]}>
          <View style={[
            styles.premiumCard, 
            { 
              position: 'relative', 
              width: '100%', 
              flexDirection: 'column', 
              padding: 16, 
              marginBottom: 16,
              borderColor: rank <= 3 ? badgeBg + '44' : 'rgba(255, 255, 255, 0.05)',
              borderWidth: rank <= 3 ? 1.5 : 1,
            }
          ]}>
            {/* Rank Circle absolute overlay top-right */}
            <View style={[styles.mobileRankOverlay, { backgroundColor: badgeBg }]}>
              <Text style={[styles.mobileRankOverlayText, { color: badgeText }]}>{rank}</Text>
            </View>

            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', width: '100%' }}>
              {/* Far Right: Store Image Placeholder */}
              <View style={[styles.photoPlaceholder, { width: 70, height: 70, backgroundColor: '#20232B' }]}>
                <MaterialIcons name="storefront" size={28} color="#FF7F50" />
              </View>

              {/* Middle Column: Text */}
              <View style={{ flex: 1, marginHorizontal: 12, alignItems: 'flex-end' }}>
                <Text style={[styles.cardTitle, { fontSize: 18, color: '#FFFFFF', textAlign: 'right' }]} numberOfLines={2}>
                  {item.name} | {item.city_name}
                </Text>
                <Text style={[styles.cardAddress, { fontSize: 14, color: '#A0A0A5', textAlign: 'right', marginTop: 4 }]} numberOfLines={1}>
                  {item.address || 'כתובת לא הוזנה'}
                </Text>
                <Text style={[styles.cardReviews, { fontSize: 12, color: '#6E6E73', textAlign: 'right', marginTop: 4 }]} numberOfLines={1}>
                  דורג ע"י {item.review_count || 0} אנשים
                </Text>
              </View>

              <View style={[styles.ratingBadge, { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, alignSelf: 'center' }]}>
                <Text style={[styles.ratingBadgeText, { fontSize: 15 }]}>
                  ★ {item.smart_score ? item.smart_score.toFixed(1) : '0.0'}
                </Text>
              </View>
            </View>

            {/* Stacked Action Button (Go to Restaurant Page) */}
            <View style={{ flexDirection: 'column', width: '100%', marginTop: 12 }}>
              <TouchableOpacity 
                style={[styles.outlineBtnAccent, { width: '100%', paddingVertical: 12, borderRadius: 8 }]}
                onPress={() => navigation.navigate('BusinessProfile', { businessId: item.id })}
                activeOpacity={0.7}
              >
                <Text style={[styles.outlineBtnAccentText, { fontSize: 14, textAlign: 'center' }]}>לעמוד המסעדה</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      );
    }

    return (
      <Animated.View style={[{ opacity: fadeAnim }, styles.cardWrapper]}>
        <View style={styles.outerRowContainer}>
          <View style={[styles.rankBadgeCircle, { width: 44, height: 44, borderRadius: 22, backgroundColor: badgeBg }]}>
            <Text style={[styles.rankBadgeText, { fontSize: 20, color: badgeText }]}>{rank}</Text>
          </View>

          <View style={[
            styles.premiumCard, 
            { 
              flex: 1, 
              flexDirection: 'row-reverse', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: 20,
              borderColor: rank <= 3 ? badgeBg + '44' : 'rgba(255, 255, 255, 0.05)',
              borderWidth: rank <= 3 ? 1.5 : 1,
            }
          ]}>
            <View style={[styles.photoPlaceholder, { width: 100, height: 100, flexShrink: 0, backgroundColor: '#20232B' }]}>
              <MaterialIcons name="storefront" size={44} color="#FF7F50" />
            </View>

            <View style={[styles.textSection, { marginHorizontal: 16, flex: 1, alignItems: 'flex-end' }]}>
              <Text style={[styles.cardTitle, { fontSize: 22 }]} numberOfLines={2}>
                {item.name} | {item.city_name}
              </Text>
              <Text style={[styles.cardAddress, { fontSize: 16 }]} numberOfLines={1}>
                {item.address || 'כתובת לא הוזנה'}
              </Text>
              <Text style={[styles.cardReviews, { fontSize: 14 }]} numberOfLines={1}>
                דורג ע"י {item.review_count || 0} אנשים
              </Text>
            </View>

            <View style={[styles.leftSection, { height: 100, justifyContent: 'center' }]}>
              <View style={[styles.ratingBadge, { paddingVertical: 10, paddingHorizontal: 16, marginBottom: 12, alignSelf: 'flex-start' }]}>
                <Text style={[styles.ratingBadgeText, { fontSize: 18 }]}>
                  ★ {item.smart_score ? item.smart_score.toFixed(1) : '0.0'}
                </Text>
              </View>

              <TouchableOpacity 
                style={[styles.outlineBtnAccent, { paddingVertical: 10, paddingHorizontal: 24 }]}
                onPress={() => navigation.navigate('BusinessProfile', { businessId: item.id })}
                activeOpacity={0.7}
              >
                <Text style={[styles.outlineBtnAccentText, { fontSize: 15 }]}>לעמוד המסעדה</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  // --- Dynamic Header Headline ---
  const getDynamicHeadline = () => {
    if (searchType === 'restaurant') {
      const selectedLocation = route.params.selectedLocation;
      const searchMode = route.params.searchMode;

      if (selectedLocation && selectedLocation.name) {
        return `מסעדות מומלצות ב${selectedLocation.name}`;
      } else if (searchMode === 'ארצי') {
        return 'מסעדות מומלצות בכל הארץ';
      } else {
        return 'מסעדות מומלצות באיזורך';
      }
    } else {
      const locationLabel = city?.name || district?.name || 'כל הארץ';
      return `מחפשים את ה${category?.name} הכי טוב ב${locationLabel}`;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Background decorative circles */}
      <View style={[styles.circle1, isMobile && styles.circle1Mobile]} />
      <View style={[styles.circle2, isMobile && styles.circle2Mobile]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headlineBanner, { width: isMobile ? '95%' : '80%' }]}>
            <Text style={[styles.mainPageHeadline, { fontSize: isMobile ? 14 : 18 }]}>
              {getDynamicHeadline()}
            </Text>
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
          <Text style={styles.emptyTitle}>אין תוצאות</Text>
          <Text style={styles.emptyText}>
            {searchType === 'restaurant'
              ? 'לא נמצאו מסעדות העונות על תנאי הסינון'
              : `לא נמצאו מנות בקטגוריה "${category?.name || ''}"`}
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
        >
          {dishes.map((item, index) => (
            <React.Fragment key={item.id.toString()}>
              {searchType === 'restaurant' 
                ? renderRestaurantItem({ item, index })
                : renderDishItem({ item, index })
              }
              {index < dishes.length - 1 && <View style={{ height: SPACING.lg }} />}
            </React.Fragment>
          ))}
        </ScrollView>
      )}

      {/* Unified Rating Form Modal */}
      <RatingFormModal
        visible={ratingFormVisible}
        dish={selectedDish}
        onClose={() => setRatingFormVisible(false)}
        onSaveSuccess={() => { setLoading(true); loadRankings(); }}
      />

      {/* Dish Reviews Modal */}
      <DishReviewsModal
        visible={reviewsModalVisible}
        dish={reviewsDish}
        onClose={() => setReviewsModalVisible(false)}
        onRefreshParent={() => { setLoading(true); loadRankings(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 60,
    paddingBottom: SPACING.md,
    width: '100%',
    zIndex: 10,
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
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center', 
    marginBottom: SPACING.md,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  mainPageHeadline: {
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    zIndex: 10,
  },
  cardWrapper: {
    width: '100%',
    alignSelf: 'center',
  },
  outerRowContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 4,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  premiumCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  mobileRankOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF7F50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  mobileRankOverlayText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  photoPlaceholder: {
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    flexShrink: 0,
  },
  textSection: {
    flex: 1,
    flexShrink: 1,
    marginHorizontal: 12,
    alignItems: 'flex-end',
  },
  cardTitle: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    textAlign: 'right',
    flexShrink: 1,
  },
  cardAddress: {
    fontFamily: FONTS.regular,
    color: '#A0A0A5',
    textAlign: 'right',
    marginTop: 6,
    flexShrink: 1,
  },
  cardReviews: {
    fontFamily: FONTS.regular,
    color: '#6E6E73',
    textAlign: 'right',
    marginTop: 6,
    flexShrink: 1,
  },
  leftSection: {
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  ratingBadge: {
    backgroundColor: 'rgba(255, 127, 80, 0.15)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ratingBadgeText: {
    color: '#FF7F50',
    fontFamily: FONTS.bold,
  },
  actionButtonRow: {
    flexDirection: 'row',
    flexShrink: 0,
  },
  outlineBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineBtnText: {
    fontFamily: FONTS.semibold,
    color: '#A0A0A5',
    textAlign: 'center',
  },
  outlineBtnAccent: {
    borderWidth: 1,
    borderColor: '#FF7F50',
    borderRadius: 8,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineBtnAccentText: {
    fontFamily: FONTS.bold,
    color: '#FF7F50',
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    zIndex: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: 400,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  modalContentMobile: {
    width: '90%',
    padding: SPACING.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
  },
  closeBtnText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  modalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
  },
  ratingInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: RADIUS.md,
    width: 100,
    height: 60,
    textAlign: 'center',
    fontSize: 32,
    fontFamily: FONTS.bold,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorTextSmall: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: SPACING.md,
  },
  commentInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: RADIUS.md,
    width: '100%',
    height: 100,
    padding: SPACING.md,
    fontSize: 16,
    fontFamily: FONTS.regular,
    textAlign: 'right',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  modalNote: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  rankBadgeCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  rankBadgeText: {
    fontFamily: FONTS.bold,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  circle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: COLORS.accent + '10',
    top: -80,
    right: -100,
    zIndex: 0,
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
    backgroundColor: COLORS.accentSecondary + '08',
    bottom: -50,
    left: -80,
    zIndex: 0,
  },
  circle2Mobile: {
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: -30,
    left: -50,
  },
});
