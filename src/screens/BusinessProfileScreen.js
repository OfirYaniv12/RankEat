import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
  Modal,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../database/supabaseClient';
import { addReview } from '../database/queries';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function BusinessProfileScreen({ route, navigation }) {
  const { businessId } = route.params || {};
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [businessData, setBusinessData] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Rating Modal State
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [ratingInput, setRatingInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [ratingError, setRatingError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Home');
    }
  };

  useEffect(() => {
    if (businessId) {
      fetchBusinessAndDishes();
    } else {
      setError('לא צוין מזהה עסק');
      setLoading(false);
    }
  }, [businessId]);

  const fetchBusinessAndDishes = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch Business Details including Address (joining with cities)
      const { data: business, error: bizErr } = await supabase
        .from('businesses')
        .select(`
          name,
          address,
          cities (
            name
          )
        `)
        .eq('id', businessId)
        .single();

      if (bizErr) {
        console.error('Fetch Business Error:', bizErr);
        throw bizErr;
      }
      setBusinessData(business);

      // 2. Fetch all dishes in the database to calculate category-based global averages (C)
      const { data: allDishes, error: allDishesErr } = await supabase
        .from('dishes')
        .select('avg_rating, category_id');

      if (allDishesErr) {
        console.error('Fetch All Dishes Error:', allDishesErr);
        throw allDishesErr;
      }

      // Compute C (global average) for each category
      const categoryAverages = {};
      if (allDishes && allDishes.length > 0) {
        const categoryGroups = {};
        allDishes.forEach(d => {
          const catId = d.category_id;
          if (!categoryGroups[catId]) {
            categoryGroups[catId] = { sum: 0, count: 0 };
          }
          categoryGroups[catId].sum += (d.avg_rating || 0);
          categoryGroups[catId].count += 1;
        });

        Object.keys(categoryGroups).forEach(catId => {
          const group = categoryGroups[catId];
          categoryAverages[catId] = group.count > 0 ? group.sum / group.count : 4.0;
        });
      }

      // 3. Fetch Dishes belonging to the current business
      const { data: dishesData, error: dishesErr } = await supabase
        .from('dishes')
        .select('id, name, avg_rating, review_count, category_id')
        .eq('business_id', businessId);

      if (dishesErr) {
        console.error('Fetch Dishes Error:', dishesErr);
        throw dishesErr;
      }

      // 4. Compute Bayesian Average (Weighted Smart Score) for each dish of this restaurant
      // Formula: W = (R * v + C * m) / (v + m)
      const m = 10; // minimum votes threshold (BAYESIAN_M)
      const formattedDishes = (dishesData || []).map(d => {
        const R = d.avg_rating || 0;
        const v = d.review_count || 0;
        const C = categoryAverages[d.category_id] !== undefined ? categoryAverages[d.category_id] : 4.0;
        const weighted_score = (R * v + C * m) / (v + m);

        return {
          ...d,
          weighted_score,
        };
      });

      // Sort strictly by smart score in DESCENDING order
      formattedDishes.sort((a, b) => b.weighted_score - a.weighted_score);
      setDishes(formattedDishes);

    } catch (err) {
      console.error(err);
      setError('שגיאה בטעינת הנתונים מהשרת');
    } finally {
      setLoading(false);
    }
  };

  // ─── Rating Modal Handlers ────────────────────────────────────────────────
  const handleOpenRatingModal = (dish) => {
    setSelectedDish(dish);
    setRatingInput('');
    setCommentInput('');
    setRatingError(false);
    setRatingModalVisible(true);
  };

  const handleRatingChange = (text) => {
    let formatted = text.replace(/[^0-9.]/g, '');
    const parts = formatted.split('.');
    if (parts.length > 2) formatted = parts[0] + '.' + parts.slice(1).join('');
    if (parts.length === 2 && parts[1].length > 1) formatted = parts[0] + '.' + parts[1].slice(0, 1);
    setRatingInput(formatted);
    const val = parseFloat(formatted);
    setRatingError(formatted === '' || isNaN(val) || val < 1 || val > 10);
  };

  const handleSaveRating = async () => {
    const val = parseFloat(ratingInput);
    if (isNaN(val) || val < 1 || val > 10) {
      const msg = 'אנא הזן דירוג בין 1 ל-10';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('שגיאה', msg);
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const msg = 'אתה חייב להיות מחובר כדי לדרג!';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('התחברות דרושה', msg);
        setIsSubmitting(false);
        return;
      }
      await addReview({ dishId: selectedDish.id, rating: val, comment: commentInput });
      setRatingModalVisible(false);
      // Refresh dishes to show updated score
      fetchBusinessAndDishes();
    } catch (e) {
      const errorMsg = e.message || 'לא ניתן לשמור את הדירוג כעת';
      Platform.OS === 'web' ? window.alert(`שגיאה: ${errorMsg}`) : Alert.alert('שגיאה', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Dynamic Medal Badge Styling Helper ---
  const getRankBadgeColor = (rank) => {
    if (rank === 1) return COLORS.gold || '#FFD700';
    if (rank === 2) return COLORS.silver || '#C0C0C0';
    if (rank === 3) return COLORS.bronze || '#CD7F32';
    return 'rgba(255, 255, 255, 0.15)'; // Default subtle circle
  };

  const getRankTextColor = (rank) => {
    if (rank <= 3) return '#0D0F14';
    return '#A0A0A5';
  };

  // Aggregated Statistics
  const totalDishes = dishes.length;
  const totalReviews = dishes.reduce((sum, dish) => sum + (dish.review_count || 0), 0);

  const renderDishItem = ({ item, index }) => {
    const rank = index + 1;
    const badgeBg = getRankBadgeColor(rank);
    const badgeText = getRankTextColor(rank);

    return (
      <View style={[
        styles.cardContainer,
        rank <= 3 && {
          borderColor: badgeBg + '33',
          borderWidth: 1.5,
        }
      ]}>
        {/* Top row: Image + Text + Rating */}
        <View style={{ flexDirection: 'row-reverse', alignItems: 'center', flex: 1 }}>
          {/* Far Right: Image with Rank badge */}
          <View style={styles.dishImageWrapper}>
            <View style={styles.dishImageContainer}>
              <MaterialIcons name="lunch-dining" size={40} color="#FF7F50" />
            </View>
            <View style={[styles.dishRankOverlay, { backgroundColor: badgeBg }]}>
              <Text style={[styles.dishRankOverlayText, { color: badgeText }]}>{rank}</Text>
            </View>
          </View>

          {/* Middle: Text Info */}
          <View style={styles.textInfo}>
            <Text style={styles.dishName}>{item.name}</Text>
            <Text style={styles.reviewCount}>דורג ע"י {item.review_count || 0} אנשים</Text>
          </View>

          {/* Far Left: Rating Pill */}
          <View style={styles.ratingPill}>
            <Text style={styles.ratingText}>
              ★ {item.weighted_score ? item.weighted_score.toFixed(1) : '0.0'}
            </Text>
          </View>
        </View>

        {/* Bottom row: Rate Button */}
        <TouchableOpacity
          style={styles.rateBtn}
          onPress={() => handleOpenRatingModal(item)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="star-rate" size={16} color="#FFF" style={{ marginLeft: 6 }} />
          <Text style={styles.rateBtnText}>הוסף דירוג</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderHeader = () => {
    if (!businessData) return null;

    const firstLetter = businessData.name ? businessData.name.charAt(0) : 'B';

    // Format address and city display
    const displayAddress = businessData.address && businessData.address !== 'כתובת לא הוזנה'
      ? `${businessData.address}, ${businessData.cities?.name || ''}`
      : businessData.cities?.name || 'עיר לא ידועה';

    // Recalculate Overall Restaurant Rating based on dynamic SMART scores
    const validDishes = dishes.filter(d => d.weighted_score !== null && d.weighted_score !== undefined);
    const overallRating = validDishes.length > 0
      ? (validDishes.reduce((sum, d) => sum + d.weighted_score, 0) / validDishes.length).toFixed(1)
      : '0.0';

    return (
      <View style={{ zIndex: 10 }}>
        {/* Custom Header with Back Button */}
        <View style={styles.topHeader}>
          <TouchableOpacity 
            onPress={handleGoBack} 
            style={styles.backBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>

        {/* Sleek Dark Hero Section */}
        <View style={styles.heroSection}>
          {/* Central Avatar */}
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </View>

          {/* Titles */}
          <Text style={styles.businessTitle}>{businessData.name}</Text>
          <Text style={styles.businessSubtitle}>{displayAddress}</Text>
          
          {/* Prominent Restaurant Overall Rating Pill */}
          <View style={styles.ratingBadgeContainer}>
            <Text style={styles.ratingBadgeValue}>★ {overallRating}</Text>
            <Text style={styles.ratingBadgeText}>ציון מסעדה ממוצע</Text>
          </View>
        </View>

        {/* Stats Row with 2 pillars (Dynamic Aggregates) */}
        <View style={styles.statsPillarsRow}>
          <View style={styles.statPillar}>
            <MaterialIcons name="restaurant-menu" size={26} color="#FF7F50" />
            <Text style={styles.pillarNumber}>{totalDishes}</Text>
            <Text style={styles.pillarLabel}>מנות דורגו</Text>
          </View>

          <View style={styles.statPillar}>
            <MaterialIcons name="chat-bubble-outline" size={26} color="#FF7F50" />
            <Text style={styles.pillarNumber}>{totalReviews}</Text>
            <Text style={styles.pillarLabel}>ביקורות משתמשים</Text>
          </View>
        </View>

        {/* Leaderboard Title */}
        <Text style={styles.leaderboardTitle}>טבלת המובילים: המנות הכי אהובות</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </SafeAreaView>
    );
  }

  if (error || !businessData) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        {/* Custom Header with Back Button */}
        <View style={styles.topHeader}>
          <TouchableOpacity 
            onPress={handleGoBack} 
            style={styles.backBtn}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.errorCenter}>
          <Text style={styles.errorText}>{error || 'המסעדה לא נמצאה'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchBusinessAndDishes}>
            <Text style={styles.retryText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Decorative premium backdrop circles */}
      <View style={[styles.circle1, isMobile && styles.circle1Mobile]} />
      <View style={[styles.circle2, isMobile && styles.circle2Mobile]} />

      <FlatList
        data={dishes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => renderDishItem({ item, index })}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        style={styles.flatList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>טרם דורגו מנות במסעדה זו</Text>
          </View>
        }
      />

      {/* ─── Rating Modal ─────────────────────────────────────────── */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
                <Text style={styles.modalCloseX}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>דירוג מנה</Text>
            </View>

            {selectedDish && (
              <Text style={styles.modalDishName}>{selectedDish.name}</Text>
            )}

            <Text style={styles.modalLabel}>ציון (1–10)</Text>
            <TextInput
              style={[styles.modalInput, ratingError && styles.modalInputError]}
              value={ratingInput}
              onChangeText={handleRatingChange}
              keyboardType="decimal-pad"
              placeholder="לדוגמה: 8.5"
              placeholderTextColor={COLORS.textSecondary}
              textAlign="right"
            />
            {ratingError && (
              <Text style={styles.modalErrorText}>אנא הזן מספר בין 1 ל-10</Text>
            )}

            <Text style={styles.modalLabel}>הערה (אופציונלי)</Text>
            <TextInput
              style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
              value={commentInput}
              onChangeText={setCommentInput}
              multiline
              placeholder="ספר על החוויה שלך..."
              placeholderTextColor={COLORS.textSecondary}
              textAlign="right"
            />

            <TouchableOpacity
              style={[styles.modalSaveBtn, (isSubmitting || ratingError || !ratingInput) && { opacity: 0.6 }]}
              onPress={handleSaveRating}
              disabled={isSubmitting || ratingError || !ratingInput}
              activeOpacity={0.8}
            >
              {isSubmitting
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.modalSaveBtnText}>שמור דירוג</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  errorCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
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
  heroSection: {
    backgroundColor: '#161618',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF7F50',
    shadowColor: '#FF7F50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FF7F50',
    fontFamily: FONTS.bold,
  },
  businessTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'center',
    fontFamily: FONTS.bold,
  },
  businessSubtitle: {
    fontSize: 16,
    color: '#A0A0A5',
    textAlign: 'center',
    fontFamily: FONTS.regular,
    marginBottom: 8,
  },
  ratingBadgeContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 127, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 127, 80, 0.25)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  ratingBadgeValue: {
    color: '#FF7F50',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: FONTS.bold,
  },
  ratingBadgeText: {
    color: '#A0A0A5',
    fontSize: 13,
    fontFamily: FONTS.regular,
    marginRight: 6,
  },
  statsPillarsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
    width: '90%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  statPillar: {
    width: '47%',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  pillarNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF7F50',
    fontFamily: FONTS.bold,
    marginTop: 8,
  },
  pillarLabel: {
    fontSize: 13,
    color: '#A0A0A5',
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  leaderboardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: FONTS.bold,
  },
  flatList: {
    width: '100%',
  },
  listContent: {
    paddingBottom: 40,
    width: '100%',
    zIndex: 10,
  },
  cardContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'column',
    width: '90%',
    maxWidth: 800,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  dishImageWrapper: {
    position: 'relative',
  },
  dishImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dishRankOverlay: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  dishRankOverlayText: {
    fontFamily: FONTS.bold,
    fontSize: 12,
    fontWeight: 'bold',
  },
  textInfo: {
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  dishName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
    textAlign: 'right',
    fontFamily: FONTS.bold,
  },
  reviewCount: {
    fontSize: 14,
    color: '#A0A0A5',
    fontFamily: FONTS.regular,
  },
  ratingPill: {
    backgroundColor: 'rgba(255, 127, 80, 0.15)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingText: {
    color: '#FF7F50',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#A0A0A5',
    textAlign: 'center',
    fontFamily: FONTS.semibold,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
    fontFamily: FONTS.semibold,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  retryText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 14,
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
  rateBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    marginTop: 12,
    width: '100%',
  },
  rateBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  // ─── Rating Modal ─────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  modalCloseX: {
    fontSize: 20,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.sm,
  },
  modalDishName: {
    fontSize: 16,
    fontFamily: FONTS.semibold,
    color: COLORS.accent,
    textAlign: 'right',
    marginBottom: SPACING.lg,
  },
  modalLabel: {
    fontSize: 14,
    fontFamily: FONTS.semibold,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  modalInput: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
  },
  modalInputError: {
    borderColor: '#FF6B6B',
  },
  modalErrorText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: 'right',
    marginTop: 4,
  },
  modalSaveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
});
