import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Animated,
  useWindowDimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';
import { getSavedDishes, unsaveDish } from '../database/queries';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme';
import DishCard from '../components/DishCard';
import RatingFormModal from '../components/RatingFormModal';
import DishReviewsModal from '../components/DishReviewsModal';
import { supabase } from '../database/supabaseClient';

export default function NextTimeListScreen({ navigation }) {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Rating form modal
  const [ratingFormVisible, setRatingFormVisible] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [initialReview, setInitialReview] = useState(null);

  // Reviews modal
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [reviewsDish, setReviewsDish] = useState(null);

  const loadSaved = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const data = await getSavedDishes(user.id);
      setDishes(data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e) {
      console.error('NextTimeListScreen load error:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadSaved(); }, [loadSaved]);

  // ── Unsave and remove from local list immediately ─────────────────────────
  const handleUnsave = async (item) => {
    try {
      await unsaveDish(user.id, item.id);
      setDishes(prev => prev.filter(d => d.id !== item.id));
    } catch (e) {
      console.error('unsave error:', e);
      showAlert({ title: 'שגיאה', message: 'לא ניתן להסיר את המנה', type: 'error', primaryButtonText: 'הבנתי' });
    }
  };

  // ── Open rating form (same guard as RankingsScreen) ───────────────────────
  const handleOpenRatingForm = async (dish) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showAlert({ title: 'התחברות דרושה', message: 'אתה חייב להיות מחובר כדי לדרג!', type: 'warning', primaryButtonText: 'הבנתי' });
        return;
      }
      const uid = session.user.id;
      const { data: existingReview } = await supabase
        .from('reviews')
        .select('*')
        .eq('dish_id', dish.id)
        .eq('user_id', uid)
        .maybeSingle();

      if (existingReview) {
        showConfirm({
          title: 'כבר דירגת מנה זו',
          message: 'זו מנה שכבר דירגת, תרצה לעדכן את הביקורת שלך?',
          type: 'info',
          primaryButtonText: 'עדכן דירוג',
          secondaryButtonText: 'השאר ככה',
          onConfirm: () => {
            setInitialReview(existingReview);
            setSelectedDish(dish);
            setRatingFormVisible(true);
          },
        });
      } else {
        setInitialReview(null);
        setSelectedDish(dish);
        setRatingFormVisible(true);
      }
    } catch (e) {
      console.error(e);
      showAlert({ title: 'שגיאה', message: 'לא ניתן לבדוק דירוגים קודמים', type: 'error', primaryButtonText: 'הבנתי' });
    }
  };

  const handleOpenReviews = (dish) => {
    setReviewsDish(dish);
    setReviewsModalVisible(true);
  };

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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>הפעם הבאה שלי</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <FlatList
          data={dishes}
          keyExtractor={item => item.id?.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔖</Text>
              <Text style={styles.emptyTitle}>הרשימה שלך ריקה</Text>
              <Text style={styles.emptySubtitle}>
                כשתשמור מנות מתוצאות החיפוש, הן יופיעו כאן
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
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 48,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
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
    lineHeight: 22,
  },
});
