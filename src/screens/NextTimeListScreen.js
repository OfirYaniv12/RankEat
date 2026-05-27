import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  useWindowDimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { useAlert } from '../context/AlertContext';
import { getSavedDishes } from '../database/queries';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme';
import DishCard from '../components/DishCard';
import RatingFormModal from '../components/RatingFormModal';
import DishReviewsModal from '../components/DishReviewsModal';
import { supabase } from '../database/supabaseClient';

export default function NextTimeListScreen({ navigation }) {
  const { showAlert, showConfirm } = useAlert();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const bannerAnim = useRef(new Animated.Value(0)).current; // separate for the banner

  // Rating form modal
  const [ratingFormVisible, setRatingFormVisible] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [initialReview, setInitialReview] = useState(null);

  // Reviews modal
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [reviewsDish, setReviewsDish] = useState(null);

  // ── Load saved dishes ─────────────────────────────────────────────────────
  const loadSaved = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setDishes([]); return; }

      const data = await getSavedDishes(session.user.id);
      console.log('NextTimeList: loaded', data.length, 'saved dishes');
      setDishes(data);

      Animated.parallel([
        Animated.timing(fadeAnim,   { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(bannerAnim, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      console.error('NextTimeListScreen load error:', e);
      showAlert({ title: 'שגיאת טעינה', message: e?.message || 'לא ניתן לטעון את הרשימה', type: 'error', primaryButtonText: 'הבנתי' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  // ── Unsave a dish ─────────────────────────────────────────────────────────
  const handleUnsave = async (item) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      showAlert({ title: 'התחברות דרושה', message: 'אתה חייב להיות מחובר כדי לנהל את הרשימה', type: 'warning', primaryButtonText: 'הבנתי' });
      return;
    }
    // Optimistic remove
    setDishes(prev => prev.filter(d => d.id !== item.id));
    try {
      const { error } = await supabase
        .from('saved_dishes')
        .delete()
        .eq('user_id', session.user.id)
        .eq('dish_id', item.id);
      if (error) {
        console.error('Supabase Delete Error (NextTimeList):', error);
        setDishes(prev => [item, ...prev]); // revert
        showAlert({ title: 'שגיאה', message: 'לא ניתן להסיר את המנה', type: 'error', primaryButtonText: 'הבנתי' });
      }
    } catch (e) {
      console.error('handleUnsave failed:', e);
      setDishes(prev => [item, ...prev]);
    }
  };

  // ── Open rating form ──────────────────────────────────────────────────────
  const handleOpenRatingForm = async (dish) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showAlert({ title: 'התחברות דרושה', message: 'אתה חייב להיות מחובר כדי לדרג!', type: 'warning', primaryButtonText: 'הבנתי' });
        return;
      }
      const { data: existingReview } = await supabase
        .from('reviews').select('*')
        .eq('dish_id', dish.id).eq('user_id', session.user.id)
        .maybeSingle();
      if (existingReview) {
        showConfirm({
          title: 'כבר דירגת מנה זו',
          message: 'זו מנה שכבר דירגת, תרצה לעדכן את הביקורת שלך?',
          type: 'info',
          primaryButtonText: 'עדכן דירוג',
          secondaryButtonText: 'השאר ככה',
          onConfirm: () => { setInitialReview(existingReview); setSelectedDish(dish); setRatingFormVisible(true); },
        });
      } else {
        setInitialReview(null); setSelectedDish(dish); setRatingFormVisible(true);
      }
    } catch (e) {
      console.error(e);
      showAlert({ title: 'שגיאה', message: 'לא ניתן לבדוק דירוגים קודמים', type: 'error', primaryButtonText: 'הבנתי' });
    }
  };

  const handleOpenReviews = (dish) => { setReviewsDish(dish); setReviewsModalVisible(true); };

  // ── Render ────────────────────────────────────────────────────────────────
  const renderItem = ({ item, index }) => (
    <>
      <DishCard
        item={item}
        index={index}
        navigation={navigation}
        isMobile={isMobile}
        fadeAnim={fadeAnim}
        onOpenRatingForm={handleOpenRatingForm}
        onOpenReviews={handleOpenReviews}
        isSaved={true}
        onToggleSave={() => handleUnsave(item)}
        titleMode="wishlist"
        showRank={false}
      />
      {index < dishes.length - 1 && <View style={{ height: SPACING.lg }} />}
    </>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Decorative background glows — mirrors RankingsScreen */}
      <View style={[styles.circle1, isMobile && styles.circle1Mobile]} />
      <View style={[styles.circle2, isMobile && styles.circle2Mobile]} />

      {/* ── Header: matches RankingsScreen layout ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <Animated.View style={[styles.headerCenter, { opacity: bannerAnim }]}>
          <View style={[styles.headlineBanner, { width: isMobile ? '95%' : '80%' }]}>
            <Text style={[styles.bannerText, { fontSize: isMobile ? 15 : 20 }]}>
              🤤 מה ששמרת לפעם הבאה
            </Text>
          </View>
          <Text style={styles.bannerSub}>
            {dishes.length === 1
              ? 'שמרת מנה אחת לפעם הבאה'
              : dishes.length > 1
                ? `שמרת ${dishes.length} מנות לפעם הבאה`
                : 'שמור מנות מהדירוגים כדי שיופיעו כאן'}
          </Text>
        </Animated.View>

        <View style={{ width: 40 }} />
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>טוען את הרשימה שלך...</Text>
        </View>
      ) : (
        <FlatList
          data={dishes}
          keyExtractor={item => item.id?.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyTitle}>הרשימה שלך ריקה</Text>
              <Text style={styles.emptySubtitle}>
                לחץ על אייקון הסימנייה{'\n'}על כל מנה בדירוגים כדי לשמור אותה לכאן
              </Text>
            </View>
          }
        />
      )}

      <RatingFormModal
        visible={ratingFormVisible}
        dish={selectedDish}
        initialReview={initialReview}
        onClose={() => setRatingFormVisible(false)}
        onSaveSuccess={loadSaved}
      />
      <DishReviewsModal
        visible={reviewsModalVisible}
        dish={reviewsDish}
        onClose={() => setReviewsModalVisible(false)}
        onRefreshParent={loadSaved}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },

  // ── Decorative background (same as RankingsScreen) ──────────────────────
  circle1: {
    position: 'absolute',
    width: 350, height: 350, borderRadius: 175,
    backgroundColor: COLORS.accent + '10',
    top: -80, right: -100, zIndex: 0,
  },
  circle1Mobile: { width: 250, height: 250, borderRadius: 125, top: -50, right: -60 },
  circle2: {
    position: 'absolute',
    width: 250, height: 250, borderRadius: 125,
    backgroundColor: (COLORS.accentSecondary || COLORS.accent) + '08',
    bottom: -50, left: -80, zIndex: 0,
  },
  circle2Mobile: { width: 180, height: 180, borderRadius: 90, bottom: -30, left: -50 },

  // ── Top navigation bar / Header ──────────────────────────────────────────
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
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  backIcon: {
    fontSize: 20,
    color: COLORS.textPrimary,
  },

  // ── Headline banner — mirrors RankingsScreen headlineBanner ─────────────
  headlineBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    paddingVertical: SPACING.sm + 2,
    paddingHorizontal: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.accent,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    // web box-shadow equivalent
    elevation: 4,
  },
  bannerText: {
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  bannerSub: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },

  // ── List ─────────────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
    zIndex: 10,
  },

  // ── Empty state ──────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
