/**
 * DishReviewsModal — Shows all reviews for a given dish.
 *
 * Sorting (dual-condition):
 *   Primary:   reviewer's trust_score (descending — highest power first)
 *   Secondary: created_at (descending — newest first, as tie-breaker)
 *
 * Props:
 *   visible        {boolean}  - controls Modal visibility
 *   dish           {object}   - { id, name, weighted_score } of the dish
 *   onClose        {function} - called to dismiss this modal
 *   onRefreshParent{function} - called after a review is saved to refresh the parent list
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../database/supabaseClient';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import RatingFormModal from './RatingFormModal';
import { getUserTitle } from '../utils/userTitle';
import { useAlert } from '../context/AlertContext';

export default function DishReviewsModal({ visible, dish, onClose, onRefreshParent }) {
  const { showConfirm } = useAlert();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Controls the nested RatingFormModal
  const [ratingFormVisible, setRatingFormVisible] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [initialReview, setInitialReview] = useState(null);

  const fetchReviews = useCallback(async () => {
    if (!dish?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id || null;
      setCurrentUserId(uid);

      const { data, error: err } = await supabase
        .from('reviews')
        .select(`
          id,
          user_id,
          rating,
          comment,
          created_at,
          profiles (
            first_name,
            last_name,
            trust_score,
            review_count
          )
        `)
        .eq('dish_id', dish.id);

      if (err) throw err;

      // ── Dual-condition sort ─────────────────────────────────────────────────
      // Primary:   ego-pinning (current user first)
      // Secondary: trust_score DESC (highest rater power first)
      // Tertiary:  created_at  DESC (newest first as tie-breaker)
      const sorted = (data || []).sort((a, b) => {
        if (uid) {
          if (a.user_id === uid && b.user_id !== uid) return -1;
          if (b.user_id === uid && a.user_id !== uid) return 1;
        }

        const powerA = a.profiles?.trust_score ?? 0;
        const powerB = b.profiles?.trust_score ?? 0;
        if (powerB !== powerA) return powerB - powerA;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      setReviews(sorted);
    } catch (e) {
      console.error('DishReviewsModal fetchReviews error:', e);
      setError('שגיאה בטעינת הביקורות');
    } finally {
      setLoading(false);
    }
  }, [dish?.id]);

  useEffect(() => {
    if (visible && dish?.id) {
      fetchReviews();
    }
  }, [visible, dish?.id]);

  const handleRatingSaved = () => {
    // Refresh reviews list and also trigger parent (rankings list) refresh
    fetchReviews();
    if (onRefreshParent) onRefreshParent();
  };

  const handleAddReviewPress = () => {
    if (!currentUserId) {
      showConfirm({
        title: 'התחברות נדרשת',
        message: 'יש להתחבר כדי לדרג מסעדות. האם ברצונך להתחבר עכשיו?',
        type: 'info',
        primaryButtonText: 'התחבר',
        secondaryButtonText: 'ביטול',
        onConfirm: () => {
          onClose(); // close the reviews modal
          // We could emit 'openLogin' here if we had it, but standard is to just close the modal. The user can click login.
        }
      });
      return;
    }

    const existingReview = reviews.find(r => r.user_id === currentUserId);
    if (existingReview) {
      showConfirm({
        title: 'כבר דירגת מנה זו',
        message: 'זו מנה שכבר דירגת, תרצה לעדכן את הביקורת שלך?',
        type: 'info',
        primaryButtonText: 'עדכן דירוג',
        secondaryButtonText: 'השאר ככה',
        onConfirm: () => {
          setInitialReview(existingReview);
          setRatingFormVisible(true);
        }
      });
    } else {
      setInitialReview(null);
      setRatingFormVisible(true);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatReviewerName = (profile) => {
    if (!profile) return 'אנונימי';
    const first = profile.first_name || '';
    const last = profile.last_name ? profile.last_name.charAt(0) + '.' : '';
    return [first, last].filter(Boolean).join(' ') || 'אנונימי';
  };

  const getRankNickname = (trustScore, reviewCount) => {
    return getUserTitle(trustScore, reviewCount);
  };

  const renderReviewItem = ({ item, index }) => {
    const name = formatReviewerName(item.profiles);
    const date = formatDate(item.created_at);
    const trustScore = item.profiles?.trust_score ?? 0;
    const reviewCount = item.profiles?.review_count ?? 0;
    const title = getUserTitle(trustScore, reviewCount);

    return (
      <View style={[styles.reviewCard, index === 0 && styles.reviewCardFirst]}>
        {/* Header row: Flexible wrapping layout */}
        <View style={styles.reviewHeader}>
          {/* Top-Right: name + user title + date underneath */}
          <View style={[styles.reviewerInfo, { flex: 1 }]}>
            <Text style={styles.reviewerName} numberOfLines={1}>{name}</Text>
            <Text style={styles.rankNickname} numberOfLines={2}>{title}</Text>
            <Text style={[styles.reviewDate, { marginHorizontal: 0, marginTop: 2 }]}>{date}</Text>
          </View>

          {/* Left: rating pill */}
          <View style={styles.ratingPill}>
            <Text style={styles.ratingPillText}>★ {item.rating.toFixed(1)}</Text>
          </View>
        </View>

        {/* Comment */}
        {item.comment ? (
          <Text style={styles.reviewComment}>{item.comment}</Text>
        ) : (
          <Text style={styles.noComment}>ללא הערה</Text>
        )}
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="rate-review" size={48} color={COLORS.textSecondary} />
      <Text style={styles.emptyText}>עדיין אין ביקורות למנה זו</Text>
      <Text style={styles.emptySubText}>היה הראשון לדרג!</Text>
    </View>
  );

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={visible}
        onRequestClose={onClose}
      >
        <View style={styles.backdrop}>
          <View style={[styles.sheet, isMobile && styles.sheetMobile]}>

            {/* ── Header ─────────────────────────────────────────────── */}
            <View style={styles.sheetHeader}>
              {/* Close button — top-left */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>

              {/* Dish and Restaurant name */}
              <Text style={styles.dishName} numberOfLines={2}>
                {dish?.name || ''}{dish?.business_name ? ` - ${dish.business_name}` : ''}
              </Text>

              {/* Overall score badge */}
              {dish?.weighted_score != null && (
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreBadgeText}>
                    ★ {typeof dish.weighted_score === 'number'
                      ? dish.weighted_score.toFixed(1)
                      : dish.weighted_score}
                  </Text>
                  <Text style={styles.scoreBadgeLabel}>ציון ממוצע</Text>
                </View>
              )}
            </View>

            {/* ── Divider ────────────────────────────────────────────── */}
            <View style={styles.divider} />

            {/* ── Reviews count ──────────────────────────────────────── */}
            {!loading && !error && (
              <Text style={styles.reviewCountLabel}>
                {reviews.length > 0
                  ? `${reviews.length} ביקורות`
                  : 'אין ביקורות עדיין'}
              </Text>
            )}

            {/* ── Body ───────────────────────────────────────────────── */}
            {loading ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.accent} />
              </View>
            ) : error ? (
              <View style={styles.centered}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity onPress={fetchReviews} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>נסה שוב</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={reviews}
                keyExtractor={(r) => r.id.toString()}
                renderItem={renderReviewItem}
                ListEmptyComponent={renderEmpty}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                style={styles.list}
              />
            )}

            {/* ── Write a Review CTA ─────────────────────────────────── */}
            <View style={styles.ctaContainer}>
              <TouchableOpacity
                style={styles.writeReviewBtn}
                onPress={handleAddReviewPress}
                activeOpacity={0.8}
              >
                <Text style={styles.writeReviewBtnText}>דרג בעצמך</Text>
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* ── Nested RatingFormModal ────────────────────────────────────── */}
      <RatingFormModal
        visible={ratingFormVisible}
        dish={dish}
        initialReview={initialReview}
        onClose={() => setRatingFormVisible(false)}
        onSaveSuccess={handleRatingSaved}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // ─── Backdrop ───────────────────────────────────────────────────────────────
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },

  // ─── Sheet ──────────────────────────────────────────────────────────────────
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    height: '85%',
    width: '100%',
    alignSelf: 'center',
    maxWidth: 680,
    paddingBottom: 0,
    overflow: 'hidden',
  },
  sheetMobile: {
    maxWidth: '100%',
    height: '90%',
  },

  // ─── Header ─────────────────────────────────────────────────────────────────
  sheetHeader: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: SPACING.lg,
    left: SPACING.lg,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 10,
  },
  closeBtnText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontFamily: FONTS.bold,
  },
  dishName: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xxl,
  },
  scoreBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  scoreBadgeText: {
    color: COLORS.accent,
    fontFamily: FONTS.bold,
    fontSize: 17,
  },
  scoreBadgeLabel: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: 13,
  },

  // ─── Divider ────────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: SPACING.xl,
  },

  reviewCountLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },

  // ─── List ────────────────────────────────────────────────────────────────────
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    flexGrow: 1,
  },

  // ─── Review Card ────────────────────────────────────────────────────────────
  reviewCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  reviewCardFirst: {
    marginTop: SPACING.sm,
  },
  reviewHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  reviewerInfo: {
    alignItems: 'flex-end',
    flexShrink: 1,
    marginLeft: SPACING.md,
  },
  reviewerName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  rankNickname: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.accent,
    textAlign: 'right',
  },
  reviewDate: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginHorizontal: SPACING.md,
  },
  ratingPill: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: RADIUS.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    flexShrink: 0,
  },
  ratingPillText: {
    color: COLORS.accent,
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
  reviewComment: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: '#D0D0D8',
    textAlign: 'right',
    lineHeight: 21,
    marginTop: SPACING.sm,
  },
  noComment: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
    fontStyle: 'italic',
    marginTop: SPACING.sm,
  },

  // ─── Empty State ─────────────────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontFamily: FONTS.bold,
    fontSize: 17,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
    textAlign: 'center',
  },
  emptySubText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },

  // ─── Error / Loading ─────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#FF6B6B',
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  retryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    paddingHorizontal: SPACING.xl,
  },
  retryBtnText: {
    color: '#FFF',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },

  // ─── CTA ────────────────────────────────────────────────────────────────────
  ctaContainer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: COLORS.surface,
  },
  writeReviewBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    height: 50,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
  },
  writeReviewBtnText: {
    color: '#FFF',
    fontFamily: FONTS.bold,
    fontSize: 17,
  },
});
