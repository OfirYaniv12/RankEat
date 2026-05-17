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
  Platform,
  useWindowDimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getRankedDishes, addReview } from '../database/queries';
import { supabase } from '../database/supabaseClient';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function RankingsScreen({ navigation, route }) {
  const { category, district, city } = route.params;
  const { width } = useWindowDimensions();
  
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
    let formatted = text.replace(/[^0-9.]/g, '');
    const parts = formatted.split('.');
    if (parts.length > 2) {
      formatted = parts[0] + '.' + parts.slice(1).join('');
    }

    if (parts.length === 2 && parts[1].length > 1) {
      formatted = parts[0] + '.' + parts[1].slice(0, 1);
    }

    setRatingInput(formatted);

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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        if (Platform.OS === 'web') {
          window.alert('אתה חייב להיות מחובר כדי לדרג! אנא הירשם או התחבר.');
        } else {
          Alert.alert('התחברות דרושה', 'אתה חייב להיות מחובר כדי לדרג! אנא הירשם או התחבר.');
        }
        setIsSubmitting(false);
        return;
      }

      await addReview({ 
        dishId: selectedDish.id, 
        rating: val, 
        comment: commentInput 
      });

      setModalVisible(false);
      setRatingInput('');
      setCommentInput('');
      setLoading(true);
      await loadRankings();
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

  const renderDishItem = ({ item, index }) => {
    const rank = index + 1;

    // Single Row-Reverse Layout for all screens with dynamic proportional scaling
    return (
      <Animated.View style={[{ opacity: fadeAnim }, styles.cardWrapper]}>
        {/* Outer Row Container: places the extracted rank badge on the far right */}
        <View style={styles.outerRowContainer}>
          
          {/* Rank Badge Circle (Outside) */}
          <View style={[styles.rankBadgeCircle, {
            width: isMobile ? 32 : 44,
            height: isMobile ? 32 : 44,
            borderRadius: isMobile ? 16 : 22,
          }]}>
            <Text style={[styles.rankBadgeText, {
              fontSize: isMobile ? 16 : 20,
            }]}>
              {rank}
            </Text>
          </View>

          {/* Main Premium Card Body with flex: 1 */}
          <View style={[styles.premiumCard, { 
            flex: 1,
            padding: isMobile ? 12 : 20,
          }]}>
            
            {/* Right Column: Dish Image (flexShrink: 0 protects from squishing) */}
            <View style={styles.rightSection}>
              <View style={[styles.photoPlaceholder, {
                width: isMobile ? 65 : 100,
                height: isMobile ? 65 : 100,
              }]}>
                <MaterialIcons name="lunch-dining" size={isMobile ? 24 : 40} color="#FF7F50" />
              </View>
            </View>

            {/* Center Column: Text Info (flex: 1, flexShrink: 1, minWidth: 80 guarantees word wrapping) */}
            <View style={styles.textSection}>
              <Text style={[styles.cardTitle, {
                fontSize: isMobile ? 16 : 22,
              }]} numberOfLines={2}>
                {item.business_name} | {item.city_name}
              </Text>
              <Text style={[styles.cardAddress, {
                fontSize: isMobile ? 12 : 16,
              }]} numberOfLines={1}>
                {item.address || 'כתובת לא הוזנה'}
              </Text>
              <Text style={[styles.cardReviews, {
                fontSize: isMobile ? 11 : 14,
              }]} numberOfLines={1}>
                דורג ע"י {item.review_count || 0} אנשים
              </Text>
            </View>

            {/* Left Column: Rating Badge & Grouped Outline Buttons (flexShrink: 0 prevents squishing) */}
            <View style={[styles.leftSection, {
              height: isMobile ? 65 : 100, // Matches corresponding image size
            }]}>
              {/* Rating badge */}
              <View style={[styles.ratingBadge, {
                paddingVertical: isMobile ? 6 : 10,
                paddingHorizontal: isMobile ? 10 : 16,
              }]}>
                <Text style={[styles.ratingBadgeText, {
                  fontSize: isMobile ? 14 : 18,
                }]}>
                  ★ {item.weighted_score.toFixed(1)}
                </Text>
              </View>

              {/* Action Buttons row (flexDirection: 'row' strictly maintained, dynamic gap) */}
              <View style={[styles.actionButtonRow, { gap: isMobile ? 4 : 10 }]}>
                <TouchableOpacity 
                  style={[styles.outlineBtn, {
                    paddingVertical: isMobile ? 4 : 10,
                    paddingHorizontal: isMobile ? 6 : 16,
                  }]}
                  onPress={() => navigation.navigate('BusinessProfile', { businessId: item.business_id })}
                >
                  <Text style={[styles.outlineBtnText, {
                    fontSize: isMobile ? 11 : 15,
                  }]}>
                    לעמוד המסעדה
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.outlineBtnAccent, {
                    paddingVertical: isMobile ? 4 : 10,
                    paddingHorizontal: isMobile ? 6 : 16,
                  }]}
                  onPress={() => handleOpenModal(item)}
                >
                  <Text style={[styles.outlineBtnAccentText, {
                    fontSize: isMobile ? 11 : 15,
                  }]}>
                    הוסף דירוג
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>
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
          <View style={[styles.headlineBanner, { width: isMobile ? '95%' : '80%' }]}>
            <Text style={[styles.mainPageHeadline, { fontSize: isMobile ? 16 : 20 }]}>{dynamicHeadline}</Text>
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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
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
    paddingTop: SPACING.xl + 60,
    paddingBottom: SPACING.md,
    width: '100%',
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
  },
  cardWrapper: {
    width: '100%',
    alignSelf: 'center',
  },
  outerRowContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  premiumCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    flexShrink: 0, // Prevent image squishing
  },
  rankBadgeCircle: {
    backgroundColor: 'rgba(255, 127, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    flexShrink: 0, // Prevent rank squishing
  },
  rankBadgeText: {
    color: '#FF7F50',
    fontFamily: FONTS.bold,
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
    flexShrink: 0, // Prevent image squishing
  },
  textSection: {
    flex: 1,
    flexShrink: 1, // Explicit wrapping protection
    minWidth: 80, // Prevent text being squished too far
    alignItems: 'flex-end',
    paddingHorizontal: 16,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    flexShrink: 0, // Prevent score/buttons squishing
  },
  ratingBadge: {
    backgroundColor: 'rgba(255, 127, 80, 0.15)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
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
});
