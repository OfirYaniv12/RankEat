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
  TouchableWithoutFeedback
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../database/supabaseClient';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import RatingFormModal from './RatingFormModal';
import { getUserTitle } from '../utils/userTitle';
import { useAlert } from '../context/AlertContext';

export default function DishReviewsModal({ visible, dish, onClose, onRefreshParent }) {
  const { showConfirm, showAlert } = useAlert();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isMobile = width < 768;

  // Data states
  const [rawReviews, setRawReviews] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auth & Rating
  const [currentUserId, setCurrentUserId] = useState(null);
  const [ratingFormVisible, setRatingFormVisible] = useState(false);
  const [initialReview, setInitialReview] = useState(null);

  // Sorting
  const [sortBy, setSortBy] = useState('default');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);

  // Card Context Menu
  const [cardMenuOpenId, setCardMenuOpenId] = useState(null);

  // Reporting
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingReviewId, setReportingReviewId] = useState(null);

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
          ),
          review_likes ( user_id )
        `)
        .eq('dish_id', dish.id);

      if (err) throw err;

      // Map to include likeCount and isLikedByMe
      const mappedData = (data || []).map(r => ({
        ...r,
        likeCount: r.review_likes?.length || 0,
        isLikedByMe: uid ? r.review_likes?.some(like => like.user_id === uid) : false,
      }));

      setRawReviews(mappedData);
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
      setCardMenuOpenId(null);
      setSortMenuVisible(false);
    }
  }, [visible, dish?.id, fetchReviews]);

  // Apply sorting
  useEffect(() => {
    const sorted = [...rawReviews].sort((a, b) => {
      // Ego-pinning: Always put current user first
      if (currentUserId) {
        if (a.user_id === currentUserId && b.user_id !== currentUserId) return -1;
        if (b.user_id === currentUserId && a.user_id !== currentUserId) return 1;
      }

      if (sortBy === 'newest') {
        return new Date(b.created_at) - new Date(a.created_at);
      } else if (sortBy === 'highest') {
        if (b.rating !== a.rating) return b.rating - a.rating;
      } else if (sortBy === 'lowest') {
        if (b.rating !== a.rating) return a.rating - b.rating;
      } else if (sortBy === 'popular') {
        if (b.likeCount !== a.likeCount) return b.likeCount - a.likeCount;
      }

      // Default tie-breaker (Trust Score DESC, then Date DESC)
      const powerA = a.profiles?.trust_score ?? 0;
      const powerB = b.profiles?.trust_score ?? 0;
      if (powerB !== powerA) return powerB - powerA;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    setReviews(sorted);
  }, [rawReviews, sortBy, currentUserId]);

  const handleRatingSaved = () => {
    fetchReviews();
    if (onRefreshParent) onRefreshParent();
  };

  const requireAuth = (actionCallback) => {
    if (!currentUserId) {
      showConfirm({
        title: 'התחברות נדרשת',
        message: 'כדי לדרג, לעשות לייק או לדווח יש להתחבר למערכת',
        type: 'info',
        primaryButtonText: 'הבנתי',
        secondaryButtonText: 'ביטול',
        onConfirm: () => {}
      });
      return false;
    }
    actionCallback();
    return true;
  };

  const handleAddReviewPress = () => {
    requireAuth(() => {
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
    });
  };

  const handleToggleLike = async (reviewId, isCurrentlyLiked) => {
    if (!requireAuth(() => {})) return;

    // Optimistic UI update
    setRawReviews(prev => prev.map(r => {
      if (r.id === reviewId) {
        return {
          ...r,
          isLikedByMe: !isCurrentlyLiked,
          likeCount: r.likeCount + (isCurrentlyLiked ? -1 : 1)
        };
      }
      return r;
    }));

    try {
      if (isCurrentlyLiked) {
        await supabase
          .from('review_likes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', currentUserId);
      } else {
        await supabase
          .from('review_likes')
          .insert({ review_id: reviewId, user_id: currentUserId });
      }
    } catch (e) {
      console.error('Toggle like error:', e);
      // Revert on error
      setRawReviews(prev => prev.map(r => {
        if (r.id === reviewId) {
          return {
            ...r,
            isLikedByMe: isCurrentlyLiked,
            likeCount: r.likeCount + (isCurrentlyLiked ? 1 : -1)
          };
        }
        return r;
      }));
      showAlert({ title: 'שגיאה', message: 'פעולה זו נכשלה, נסה שוב', type: 'error' });
    }
  };

  const openReportModal = (reviewId) => {
    requireAuth(() => {
      setCardMenuOpenId(null);
      setReportingReviewId(reviewId);
      setReportModalVisible(true);
    });
  };

  const submitReport = async (reason) => {
    setReportModalVisible(false);
    if (!reportingReviewId || !currentUserId) return;

    try {
      const { error } = await supabase
        .from('review_reports')
        .insert({ review_id: reportingReviewId, user_id: currentUserId, reason });
      
      if (error) {
        if (error.code === '23505') {
          showAlert({ title: 'כבר דווח', message: 'כבר דיווחת על ביקורת זו בעבר.', type: 'info' });
        } else {
          throw error;
        }
      } else {
        showAlert({ title: 'דיווח נשלח', message: 'תודה על הדיווח, הצוות שלנו יבדוק את הנושא בהקדם.', type: 'success' });
      }
    } catch (e) {
      console.error('Report error:', e);
      showAlert({ title: 'שגיאה', message: 'הדיווח לא נשלח עקב שגיאה.', type: 'error' });
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleDateString('he-IL', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  const formatReviewerName = (profile) => {
    if (!profile) return 'אנונימי';
    const first = profile.first_name || '';
    const last = profile.last_name ? profile.last_name.charAt(0) + '.' : '';
    return [first, last].filter(Boolean).join(' ') || 'אנונימי';
  };

  const sortOptions = [
    { value: 'default', label: 'ברירת מחדל' },
    { value: 'newest', label: 'החדשות ביותר' },
    { value: 'highest', label: 'הגבוהות ביותר' },
    { value: 'lowest', label: 'הנמוכות ביותר' },
    { value: 'popular', label: 'הפופולריות ביותר' },
  ];

  const currentSortLabel = sortOptions.find(o => o.value === sortBy)?.label || 'ברירת מחדל';

  const renderReviewItem = ({ item, index }) => {
    const name = formatReviewerName(item.profiles);
    const date = formatDate(item.created_at);
    const trustScore = item.profiles?.trust_score ?? 0;
    const reviewCount = item.profiles?.review_count ?? 0;
    const title = getUserTitle(trustScore, reviewCount);

    return (
      <View style={[styles.reviewCard, index === 0 && styles.reviewCardFirst]}>
        
        {/* Absolute Top-Left Report Button */}
        <TouchableOpacity 
          style={styles.cardReportBtn} 
          onPress={() => setCardMenuOpenId(cardMenuOpenId === item.id ? null : item.id)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="more-vert" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>

        {/* Context Menu Overlay */}
        {cardMenuOpenId === item.id && (
          <View style={styles.cardContextMenu}>
            <TouchableOpacity 
              style={styles.cardContextItem} 
              onPress={() => openReportModal(item.id)}
            >
              <MaterialIcons name="flag" size={16} color={COLORS.textSecondary} />
              <Text style={styles.cardContextText}>דווח</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Header row: Name/Info on right, Stats (Score, Like) on left */}
        <View style={styles.reviewHeader}>
          {/* Right Side: Name & Title (Row-Reverse for RTL) */}
          <View style={styles.reviewerInfo}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={styles.reviewerName} numberOfLines={1}>{name}</Text>
              {title ? (
                <View style={styles.rankBadge}>
                  <Text style={styles.rankNickname} numberOfLines={1}>{title}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.reviewDate}>{date}</Text>
          </View>

          {/* Left Side: Score, and Likes */}
          <View style={styles.statsLeftStack}>
            {/* Score Pill */}
            <View style={styles.ratingPill}>
              <Text style={styles.ratingPillText}>★ {item.rating.toFixed(1)}</Text>
            </View>
            
            {/* Like Button */}
            <TouchableOpacity 
              style={styles.compactLikeBtn} 
              onPress={() => handleToggleLike(item.id, item.isLikedByMe)}
              activeOpacity={0.7}
            >
              {item.likeCount > 0 && (
                <Text style={[styles.likeCountText, item.isLikedByMe && { color: COLORS.accent }]}>
                  {item.likeCount}
                </Text>
              )}
              <MaterialIcons 
                name={item.isLikedByMe ? "favorite" : "favorite-border"} 
                size={22} 
                color={item.isLikedByMe ? COLORS.accent : COLORS.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Comment */}
        <Text style={item.comment ? styles.reviewComment : styles.noComment}>
          {item.comment ? item.comment : 'ללא הערה'}
        </Text>
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
        <TouchableWithoutFeedback onPress={() => { setSortMenuVisible(false); setCardMenuOpenId(null); }}>
          <View style={[styles.backdrop, isMobile ? styles.backdropMobile : styles.backdropDesktop]}>
            <View style={[styles.sheet, isMobile && styles.sheetMobile]}>

              {/* ── Header ─────────────────────────────────────────────── */}
              <View style={styles.sheetHeader}>
                <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>

                <Text style={[styles.dishName, { marginTop: 32 }]} numberOfLines={2}>
                  {dish?.name || ''}{dish?.business_name ? ` - ${dish.business_name}` : ''}
                </Text>

                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 12 }}>
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
                  
                  {/* Total Reviews Count next to score */}
                  {!loading && !error && (
                    <Text style={styles.headerReviewCount}>
                      {reviews.length > 0 ? `${reviews.length} ביקורות` : 'אין ביקורות'}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.divider} />

              {/* ── Dedicated Sorting Bar ──────────────────────────────── */}
              {reviews.length > 0 && !loading && !error && (
                <View style={styles.sortBar}>
                  <View style={{ position: 'relative', zIndex: 20 }}>
                    <TouchableOpacity 
                      style={styles.sortButton} 
                      onPress={(e) => { e.stopPropagation(); setSortMenuVisible(!sortMenuVisible); setCardMenuOpenId(null); }}
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="keyboard-arrow-down" size={18} color={COLORS.textSecondary} />
                      <Text style={styles.sortButtonText}>
                        מיין לפי: <Text style={{color: COLORS.textPrimary}}>{currentSortLabel}</Text>
                      </Text>
                    </TouchableOpacity>

                    {sortMenuVisible && (
                      <View style={styles.sortMenu}>
                        {sortOptions.map(option => (
                          <TouchableOpacity 
                            key={option.value} 
                            style={styles.sortMenuItem}
                            onPress={() => {
                              setSortBy(option.value);
                              setSortMenuVisible(false);
                            }}
                          >
                            <Text style={[styles.sortMenuItemText, sortBy === option.value && styles.sortMenuItemTextActive]}>
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
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
              <View style={[styles.ctaContainer, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
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
        </TouchableWithoutFeedback>
      </Modal>

      {/* ── Nested RatingFormModal ────────────────────────────────────── */}
      <RatingFormModal
        visible={ratingFormVisible}
        dish={dish}
        initialReview={initialReview}
        onClose={() => setRatingFormVisible(false)}
        onSaveSuccess={handleRatingSaved}
      />

      {/* ── Nested Report Modal ───────────────────────────────────────── */}
      <Modal
        visible={reportModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <TouchableOpacity style={styles.reportBackdrop} activeOpacity={1} onPress={() => setReportModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.reportModalBox}>
              <Text style={styles.reportModalTitle}>סיבת הדיווח</Text>
              <Text style={styles.reportModalSubtitle}>מדוע אתה מדווח על ביקורת זו?</Text>
              
              <TouchableOpacity style={styles.reportOptionBtn} onPress={() => submitReport('ספאם / תוכן פרסומי')}>
                <Text style={styles.reportOptionText}>ספאם / תוכן פרסומי</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportOptionBtn} onPress={() => submitReport('תוכן פוגעני / בלתי הולם')}>
                <Text style={styles.reportOptionText}>תוכן פוגעני / בלתי הולם</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportOptionBtn} onPress={() => submitReport('ביקורת מזויפת')}>
                <Text style={styles.reportOptionText}>ביקורת מזויפת</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.reportOptionBtn} onPress={() => submitReport('אחר')}>
                <Text style={styles.reportOptionText}>אחר</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.reportCancelBtn} onPress={() => setReportModalVisible(false)}>
                <Text style={styles.reportCancelText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  backdropMobile: {
    justifyContent: 'flex-end',
  },
  backdropDesktop: {
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    width: '100%',
    alignSelf: 'center',
    maxWidth: 680,
    overflow: 'hidden',
    height: '85%',
    maxHeight: 800,
    borderRadius: RADIUS.xl, // Applies to desktop
  },
  sheetMobile: {
    maxWidth: '100%',
    height: '90%',
    borderRadius: 0, // Override for mobile
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    position: 'relative',
    zIndex: 10,
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
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: SPACING.xl,
  },
  headerReviewCount: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    zIndex: 20,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
  },
  sortButtonText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sortMenu: {
    position: 'absolute',
    top: 36,
    left: 0,
    backgroundColor: COLORS.surfaceHover || '#22252A',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 30,
    overflow: 'hidden',
  },
  sortMenuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.03)',
  },
  sortMenuItemText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  sortMenuItemTextActive: {
    fontFamily: FONTS.bold,
    color: COLORS.accent,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.lg,
    paddingTop: SPACING.md,
    flexGrow: 1,
  },
  reviewCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'relative',
    zIndex: 1,
  },
  reviewCardFirst: {
    marginTop: SPACING.sm,
  },
  reviewHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  reviewerInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 24, // Space for 3-dots if needed, but 3-dots is on left.
    marginLeft: SPACING.md,
  },
  reviewerName: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  rankBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderRadius: RADIUS.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
  },
  rankNickname: {
    fontFamily: FONTS.semibold,
    fontSize: 12,
    color: COLORS.accent,
    textAlign: 'center',
  },
  reviewDate: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  statsLeftStack: {
    alignItems: 'center',
    width: 60,
    marginTop: 20, // Push down slightly so it's independent of absolute 3-dots
  },
  cardReportBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    padding: 8,
    zIndex: 10,
  },
  cardContextMenu: {
    position: 'absolute',
    top: 40,
    left: 12,
    backgroundColor: COLORS.surfaceHover || '#22252A',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    width: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 50,
  },
  cardContextItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  cardContextText: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  ratingPill: {
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    borderRadius: RADIUS.pill,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingPillText: {
    color: COLORS.accent,
    fontFamily: FONTS.bold,
    fontSize: 18,
  },
  compactLikeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  likeCountText: {
    fontFamily: FONTS.semibold,
    color: COLORS.textSecondary,
    fontSize: 15,
  },
  reviewComment: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: '#E0E0E8',
    textAlign: 'right',
    lineHeight: 22,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  noComment: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    fontStyle: 'italic',
  },
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
  ctaContainer: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: COLORS.surface,
    zIndex: 10,
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

  // ─── Report Modal ────────────────────────────────────────────────────────────
  reportBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  reportModalBox: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reportModalTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  reportModalSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  reportOptionBtn: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  reportOptionText: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  reportCancelBtn: {
    marginTop: SPACING.sm,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reportCancelText: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
});
