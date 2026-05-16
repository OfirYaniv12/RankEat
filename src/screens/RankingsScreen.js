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
  useWindowDimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { getRankedDishes, addReview } from '../database/queries';
import { supabase } from '../database/supabaseClient';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function RankingsScreen({ navigation, route }) {
  const { category, district, city } = route.params;
  const { width } = useWindowDimensions();
  
  // Responsive proportional scale: Desktop baseline is 1024px.
  // Scale down smoothly for smaller screens but clamp at 0.55 so mobile stays readable.
  const scale = width > 1024 ? 1 : Math.max(width / 1024, 0.55);
  const isMobile = width < 768;

  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [ratingInput, setRatingInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ratingError, setRatingError] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      const { dishes: data } = await getRankedDishes({
        categoryId: category.id,
        districtId: district?.id,
        cityId: city?.id,
      });
      setDishes(data);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    } catch (e) {
      console.error(e);
      setError('שגיאה בטעינת הנתונים');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (dish) => {
    setSelectedDish(dish);
    setRatingInput('');
    setRatingError(false);
    setCommentInput('');
    setModalVisible(true);
  };

  const handleRatingChange = (text) => {
    // 1. Filter characters and handle dots
    let formatted = text.replace(/[^0-9.]/g, '');
    const parts = formatted.split('.');
    if (parts.length > 2) {
      formatted = parts[0] + '.' + parts.slice(1).join('');
    }

    // 2. Prevent more than one decimal place
    if (parts.length === 2 && parts[1].length > 1) {
      formatted = parts[0] + '.' + parts[1].slice(0, 1);
    }

    setRatingInput(formatted);

    // 3. Real-time validation (1-10)
    const val = parseFloat(formatted);
    if (formatted === '' || isNaN(val) || val < 1 || val > 10) {
      setRatingError(true);
    } else {
      setRatingError(false);
    }
  };

  const handleSaveRating = async () => {
    const val = parseFloat(ratingInput);
    if (isNaN(val) || val < 1 || val > 10.1) {
      const msg = 'אנא הזן דירוג בין 1 ל-10';
      if (Platform.OS === 'web') {
        window.alert(msg);
      } else {
        Alert.alert('שגיאה', msg);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Auth Guard: Check if user is logged in
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        if (Platform.OS === 'web') {
          window.alert('אתה חייב להיות מחובר כדי לדרג! אנא הירשם או התחבר.');
        } else {
          Alert.alert('התחברות דרושה', 'אתה חייב להיות מחובר כדי לדרג! אנא הירשם או התחבר.');
        }
        // Here you would trigger setAuthModalVisible(true) once the UI is ready
        setIsSubmitting(false);
        return;
      }

      // 2. Submit Review
      await addReview({ 
        dishId: selectedDish.id, 
        rating: val, 
        comment: commentInput 
      });

      // 3. Success Flow
      setModalVisible(false);
      setRatingInput('');
      setCommentInput('');
      setLoading(true);
      await loadRankings();
      
      if (Platform.OS === 'web') {
        // window.alert('הדירוג נשמר בהצלחה!');
      } else {
        // Alert.alert('תודה!', 'הדירוג שלך נשמר בהצלחה');
      }
    } catch (e) {
      console.error('Save Rating Error:', e);
      const errorMsg = e.message || 'לא ניתן לשמור את הדירוג כעת';
      if (Platform.OS === 'web') {
        window.alert(`שגיאה: ${errorMsg}`);
      } else {
        Alert.alert('שגיאה', errorMsg);
      }
    } finally {
      setIsSubmitting(false);
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

    // Mobile specific sizing logic to ensure comfort and readability
    const mobileRankScale = isMobile ? 0.6 : scale;
    
    let rankBoxSize = 50 * mobileRankScale;
    let rankFontSize = 28 * mobileRankScale;
    if (rank === 1) {
      rankBoxSize = 75 * mobileRankScale;
      rankFontSize = 46 * mobileRankScale;
    } else if (rank === 2) {
      rankBoxSize = 65 * mobileRankScale;
      rankFontSize = 38 * mobileRankScale;
    } else if (rank === 3) {
      rankBoxSize = 55 * mobileRankScale;
      rankFontSize = 32 * mobileRankScale;
    }

    return (
      <Animated.View style={[{ opacity: fadeAnim }, styles.itemWrapper, { width: isMobile ? '98%' : '85%', transform: [{ translateX: isMobile ? 0 : 65 * scale }] }]}>
        
        {/* Rank Number Outside the Card */}
        <View style={[styles.rankOuterContainer, { width: isMobile ? 45 : 80 * scale, marginLeft: isMobile ? 4 : SPACING.lg * scale }]}>
          <View style={[styles.rankContainer, { width: rankBoxSize, height: rankBoxSize }]}>
            <Text style={[styles.rankText, { fontSize: rankFontSize }]}>{rank}</Text>
          </View>
        </View>

        <View style={[styles.squareCard, { 
          flex: 1, // Restored flex: 1 so the card fills the available width properly!
          height: isMobile ? 'auto' : 200 * scale, 
          minHeight: isMobile ? 160 : 200 * scale,
          padding: isMobile ? SPACING.lg : SPACING.md * scale 
        }]}>
          
          {/* Right Column: Photo */}
          <View style={[styles.photoPlaceholder, { 
            width: isMobile ? 90 : 160 * scale, 
            height: isMobile ? 90 : 160 * scale 
          }]}>
            <Text style={[styles.photoPlaceholderText, { fontSize: isMobile ? 14 : 16 * scale }]}>תמונה</Text>
          </View>

          {/* Center Column: Business Info */}
          <View style={[styles.centerCol, isMobile && { alignItems: 'flex-end', justifyContent: 'center', paddingLeft: 0 }]}>
            {item.city_name && item.city_name !== '—' ? (
              isMobile ? (
                <View style={{ alignItems: 'flex-end', width: '100%' }}>
                  <Text style={[styles.businessName, { textAlign: 'right', fontSize: 22 }]} numberOfLines={2} adjustsFontSizeToFit>
                    {item.business_name}
                  </Text>
                  <Text style={[styles.addressText, { textAlign: 'right', fontSize: 16, marginTop: 2, color: COLORS.accentLight }]} numberOfLines={1}>
                    {item.city_name}
                  </Text>
                </View>
              ) : (
                <View style={styles.headlineRow}>
                  <View style={styles.headlineHalf}>
                    <Text style={[styles.businessName, { textAlign: 'right', fontSize: 40 * scale, marginTop: -8 * scale }]} numberOfLines={2} adjustsFontSizeToFit>
                      {item.city_name}
                    </Text>
                  </View>
                  <Text style={[styles.businessName, { marginHorizontal: 6 * scale, fontSize: 40 * scale, marginTop: -8 * scale }]}>|</Text>
                  <View style={styles.headlineHalf}>
                    <Text style={[styles.businessName, { textAlign: 'left', fontSize: 40 * scale, marginTop: -8 * scale }]} numberOfLines={2} adjustsFontSizeToFit>
                      {item.business_name}
                    </Text>
                  </View>
                </View>
              )
            ) : (
              <Text style={[styles.businessName, { fontSize: isMobile ? 22 : 40 * scale, marginTop: isMobile ? 0 : -8 * scale, textAlign: 'right' }]} numberOfLines={2} adjustsFontSizeToFit>
                {item.business_name}
              </Text>
            )}
            
            <Text style={[styles.addressText, { fontSize: isMobile ? 14 : 18 * scale, marginTop: isMobile ? 6 : 36 * scale, textAlign: 'right' }]} numberOfLines={1}>
              {item.address || 'כתובת לא הוזנה'}
            </Text>
            
            {!isMobile && (
              <Text style={[styles.reviewCount, { fontSize: 16 * scale, marginTop: 8 * scale }]}>{item.review_count} ביקורות</Text>
            )}

            {/* Mobile-Only: Rating & Action injected under the info! */}
            {isMobile && (
              <View style={[styles.mobileActionRow, { marginTop: 16 }]}>
                <View style={styles.ratingBadge}>
                  <Text style={[styles.ratingBadgeText, { fontSize: 24 }]} numberOfLines={1}>
                    ★ {item.weighted_score.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.mobileReviewCount}>({item.review_count} דירוגים)</Text>
                <TouchableOpacity style={styles.mobileAddReviewBtn} onPress={() => handleOpenModal(item)}>
                  <Text style={styles.mobileAddReviewBtnText}>הוסף דירוג</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Left Column: Rating & Action (Desktop Only) */}
          {!isMobile && (
            <View style={[styles.leftCol, { width: 140 * scale }]}>
              <View style={[styles.ratingBadge, { marginBottom: SPACING.xl * scale }]}>
                <Text style={[styles.ratingBadgeText, { fontSize: 24 * scale }]} numberOfLines={1}>
                  ★ {item.weighted_score.toFixed(1)}
                </Text>
              </View>
              <TouchableOpacity style={[styles.addReviewBtn, { paddingVertical: 12 * scale }]} onPress={() => handleOpenModal(item)}>
                <Text style={[styles.addReviewBtnText, { fontSize: 16 * scale }]}>הוסף דירוג</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      </Animated.View>
    );
  };

  const locationLabel = city?.name || district?.name || 'כל הארץ';
  const dynamicHeadline = `מחפשים את ה${category.name} הכי טוב ב${locationLabel}`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={[styles.headlineBanner, { width: isMobile ? '95%' : '80%', transform: [{ translateX: isMobile ? 0 : 13 * scale }] }]}>
            <Text style={[styles.mainPageHeadline, { fontSize: isMobile ? 16 : 20 * scale }]}>{dynamicHeadline}</Text>

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
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={[{ paddingBottom: 100, ...styles.listContent }, isMobile && { paddingHorizontal: 4 }]}
          showsVerticalScrollIndicator={true} // Show scrollbar
        >
          {dishes.map((item, index) => (
            <React.Fragment key={item.id.toString()}>
              {renderDishItem({ item, index })}
              {index < dishes.length - 1 && <View style={{ height: SPACING.lg }} />}
            </React.Fragment>
          ))}
        </ScrollView>
      )}

      {/* Review Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isMobile && styles.modalContentMobile]}>
            {/* Close Button */}
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.modalTitle}>נו איך היה?</Text>
            
             <TextInput
              style={[styles.ratingInput, ratingError && { borderColor: '#FF6B6B' }]}
              keyboardType="decimal-pad"
              inputMode="decimal"
              maxLength={4}
              placeholder="10"
              placeholderTextColor={COLORS.textSecondary}
              value={ratingInput}
              onChangeText={handleRatingChange}
              editable={!isSubmitting}
            />
            {ratingError && ratingInput.length > 0 && (
              <Text style={styles.errorTextSmall}>נא להזין ציון בין 1 ל-10</Text>
            )}

            <TextInput
              style={styles.commentInput}
              multiline={true}
              numberOfLines={4}
              placeholder="ספרו לנו קצת על המנה (אופציונלי)"
              placeholderTextColor={COLORS.textSecondary}
              value={commentInput}
              onChangeText={setCommentInput}
              editable={!isSubmitting}
              textAlignVertical="top"
            />
            
            <TouchableOpacity 
              style={[styles.saveBtn, (!ratingInput || ratingError || isSubmitting) && { opacity: 0.5 }]} 
              onPress={handleSaveRating}
              disabled={!ratingInput || ratingError || isSubmitting}
            >
              <Text style={styles.saveBtnText}>{isSubmitting ? 'שומר...' : 'שמור דירוג'}</Text>
            </TouchableOpacity>

            <Text style={styles.modalNote}>רק מזכירים, הדירוג הוא למנה עצמה ולא לעסק 😉</Text>
          </View>
        </View>
      </Modal>
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
    paddingTop: SPACING.xl + 60, // Added space for global header
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
    width: 140, // Increased to prevent wrapping
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
  mobileActionRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: SPACING.md,
  },
  ratingBadge: {
    backgroundColor: 'rgba(255, 127, 80, 0.15)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  ratingBadgeText: {
    color: '#FF7F50',
    fontWeight: 'bold',
  },
  mobileReviewCount: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  mobileAddReviewBtn: {
    borderWidth: 1,
    borderColor: COLORS.textPrimary,
    paddingVertical: 6,
    paddingHorizontal: 12, 
    borderRadius: 6,
    backgroundColor: COLORS.surfaceHover,
  },
  mobileAddReviewBtnText: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.textPrimary,
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
    fontFamily: FONTS.bold,
    fontSize: 48,
    textAlign: 'center',
    width: 140,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  commentInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: 16,
    width: '100%',
    height: 100,
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    width: '100%',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  saveBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FFF',
  },
  modalNote: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  errorTextSmall: {
    color: '#FF6B6B',
    fontFamily: FONTS.regular,
    fontSize: 14,
    marginBottom: SPACING.md,
    marginTop: -SPACING.sm,
  },
});
