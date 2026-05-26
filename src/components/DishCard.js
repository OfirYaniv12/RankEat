/**
 * DishCard — reusable card for Rankings, Search results, and NextTimeList.
 *
 * Props:
 *   item            – dish data object (business_name, city_name, name, …)
 *   index           – 0-based position in the list (used for rank badge)
 *   navigation      – react-navigation prop
 *   isMobile        – boolean
 *   fadeAnim        – Animated.Value for entry fade (optional, defaults to 1)
 *   onOpenRatingForm – called when user taps "הוסף דירוג"
 *   onOpenReviews   – called when card is tapped (opens DishReviewsModal)
 *   // Bookmark / Wishlist
 *   isSaved         – boolean (filled vs outlined bookmark icon)
 *   onToggleSave    – async () => void – called on bookmark tap
 *   // Title override: 'default' = "BusinessName | CityName"
 *   //               'wishlist' = "DishName | BusinessName"
 *   titleMode       – 'default' | 'wishlist'
 *   // Rank badge: pass false to hide (e.g. wishlist screen)
 *   showRank        – boolean (default true)
 */

import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme';

export default function DishCard({
  item,
  index = 0,
  navigation,
  isMobile = false,
  fadeAnim,
  onOpenRatingForm,
  onOpenReviews,
  isSaved = false,
  onToggleSave,
  titleMode = 'default',
  showRank = true,
}) {
  const localFade = useRef(new Animated.Value(1)).current;
  const anim = fadeAnim || localFade;

  const rank = index + 1;
  const badgeBg =
    rank === 1 ? '#FFD700' :
    rank === 2 ? '#C0C0C0' :
    rank === 3 ? '#CD7F32' : '#FF7F50';
  const badgeTextColor = rank <= 3 ? '#0D0F14' : '#FFFFFF';

  const titleLine =
    titleMode === 'wishlist'
      ? `${item.name} | ${item.business_name}`
      : `${item.business_name} | ${item.city_name}`;

  // ── Bookmark button shared element ───────────────────────────────────────────
  const BookmarkBtn = () => (
    <TouchableOpacity
      onPress={onToggleSave}
      activeOpacity={0.7}
      style={styles.bookmarkBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <MaterialIcons
        name={isSaved ? 'bookmark' : 'bookmark-border'}
        size={22}
        color={isSaved ? COLORS.accent : '#A0A0A5'}
      />
    </TouchableOpacity>
  );

  // ── MOBILE layout ─────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Animated.View
        style={[{ opacity: anim, width: '100%', maxWidth: 800, alignSelf: 'center' }, styles.cardWrapper]}
      >
        <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenReviews(item)}>
          <View
            style={[
              styles.premiumCard,
              {
                position: 'relative',
                width: '100%',
                flexDirection: 'column',
                padding: 16,
                marginBottom: 16,
                borderColor: rank <= 3 ? badgeBg + '44' : 'rgba(255,255,255,0.05)',
                borderWidth: rank <= 3 ? 1.5 : 1,
              },
            ]}
          >
            {/* Rank badge — top right */}
            {showRank && (
              <View style={[styles.mobileRankOverlay, { backgroundColor: badgeBg }]}>
                <Text style={[styles.mobileRankOverlayText, { color: badgeTextColor }]}>{rank}</Text>
              </View>
            )}

            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', width: '100%' }}>
              {/* Far Right: Dish icon */}
              <View style={[styles.photoPlaceholder, { width: 64, height: 64, flexShrink: 0 }]}>
                <MaterialIcons name="lunch-dining" size={24} color="#FF7F50" />
              </View>

              {/* Middle: Text */}
              <View style={{ flex: 1, marginHorizontal: 10, alignItems: 'flex-end' }}>
                <Text style={[styles.cardTitle, { fontSize: 16, textAlign: 'right' }]} numberOfLines={2}>
                  {titleLine}
                </Text>
                <Text style={[styles.cardAddress, { fontSize: 13, textAlign: 'right', marginTop: 3 }]} numberOfLines={1}>
                  {item.address || 'כתובת לא הוזנה'}
                </Text>
                <Text style={[styles.cardReviews, { fontSize: 11, textAlign: 'right', marginTop: 3 }]} numberOfLines={1}>
                  דורג ע"י {item.review_count || 0} אנשים
                </Text>
              </View>

              {/* Far Left: Rating + Bookmark — compact column */}
              <View style={{ alignItems: 'center', flexShrink: 0, minWidth: 52 }}>
                <View style={[styles.ratingBadge, { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 16 }]}>
                  <Text style={[styles.ratingBadgeText, { fontSize: 14 }]}>
                    ★ {(item.weighted_score || 0).toFixed(1)}
                  </Text>
                </View>
                {onToggleSave && (
                  <TouchableOpacity
                    onPress={onToggleSave}
                    activeOpacity={0.7}
                    style={{ padding: 4, marginTop: 6 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <MaterialIcons
                      name={isSaved ? 'bookmark' : 'bookmark-border'}
                      size={22}
                      color={isSaved ? COLORS.accent : '#A0A0A5'}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'column', width: '100%', marginTop: 12, gap: 8 }}>
              <TouchableOpacity
                style={[styles.outlineBtnAccent, { width: '100%', paddingVertical: 10, borderRadius: 8 }]}
                onPress={(e) => { e.stopPropagation?.(); onOpenRatingForm(item); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.outlineBtnAccentText, { fontSize: 14, textAlign: 'center' }]}>הוסף דירוג</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.outlineBtn, { width: '100%', paddingVertical: 10, borderRadius: 8 }]}
                onPress={(e) => { e.stopPropagation?.(); navigation.navigate('BusinessProfile', { businessId: item.business_id }); }}
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

  // ── DESKTOP layout ────────────────────────────────────────────────────────────
  return (
    <Animated.View style={[{ opacity: anim }, styles.cardWrapper]}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => onOpenReviews(item)}>
        <View style={styles.outerRowContainer}>
          {showRank && (
            <View style={[styles.rankBadgeCircle, { width: 44, height: 44, borderRadius: 22, backgroundColor: badgeBg }]}>
              <Text style={[styles.rankBadgeText, { fontSize: 20, color: badgeTextColor }]}>{rank}</Text>
            </View>
          )}

          <View
            style={[
              styles.premiumCard,
              {
                flex: 1,
                flexDirection: 'row-reverse',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 20,
                borderColor: rank <= 3 && showRank ? badgeBg + '44' : 'rgba(255,255,255,0.05)',
                borderWidth: rank <= 3 && showRank ? 1.5 : 1,
              },
            ]}
          >
            <View style={[styles.photoPlaceholder, { width: 100, height: 100, flexShrink: 0 }]}>
              <MaterialIcons name="lunch-dining" size={40} color="#FF7F50" />
            </View>

            <View style={[styles.textSection, { marginHorizontal: 16, flex: 1, alignItems: 'flex-end' }]}>
              <Text style={[styles.cardTitle, { fontSize: 22 }]} numberOfLines={2}>
                {titleLine}
              </Text>
              <Text style={[styles.cardAddress, { fontSize: 16 }]} numberOfLines={1}>
                {item.address || 'כתובת לא הוזנה'}
              </Text>
              <Text style={[styles.cardReviews, { fontSize: 14 }]} numberOfLines={1}>
                דורג ע"י {item.review_count || 0} אנשים
              </Text>
            </View>

            {/* Left column: rating + bookmark + CTA buttons */}
            <View style={[styles.leftSection, { height: 100 }]}>
              {/* Rating + bookmark on same row */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {onToggleSave && <BookmarkBtn />}
                <View style={[styles.ratingBadge, { paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start' }]}>
                  <Text style={[styles.ratingBadgeText, { fontSize: 18 }]}>
                    ★ {(item.weighted_score || 0).toFixed(1)}
                  </Text>
                </View>
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
                  onPress={() => onOpenRatingForm(item)}
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
}

const styles = StyleSheet.create({
  cardWrapper: { width: '100%', alignSelf: 'center' },
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
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  mobileRankOverlay: {
    position: 'absolute', top: 8, right: 8, zIndex: 10,
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  mobileRankOverlayText: { fontFamily: FONTS.bold, fontSize: 14, textAlign: 'center' },
  rankBadgeCircle: { justifyContent: 'center', alignItems: 'center', marginLeft: 12 },
  rankBadgeText: { fontFamily: FONTS.bold, fontWeight: 'bold', textAlign: 'center' },
  photoPlaceholder: {
    backgroundColor: '#2C2C2E',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 8, flexShrink: 0,
  },
  textSection: { flex: 1, flexShrink: 1, marginHorizontal: 12, alignItems: 'flex-end' },
  cardTitle: { fontFamily: FONTS.bold, color: '#FFFFFF', textAlign: 'right', flexShrink: 1 },
  cardAddress: { fontFamily: FONTS.regular, color: '#A0A0A5', textAlign: 'right', marginTop: 6, flexShrink: 1 },
  cardReviews: { fontFamily: FONTS.regular, color: '#6E6E73', textAlign: 'right', marginTop: 6, flexShrink: 1 },
  leftSection: { alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  ratingBadge: {
    backgroundColor: 'rgba(255,127,80,0.15)',
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  ratingBadgeText: { color: '#FF7F50', fontFamily: FONTS.bold },
  actionButtonRow: { flexDirection: 'row', flexShrink: 0 },
  outlineBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8, backgroundColor: 'transparent',
    justifyContent: 'center', alignItems: 'center',
  },
  outlineBtnText: { fontFamily: FONTS.semibold, color: '#A0A0A5', textAlign: 'center' },
  outlineBtnAccent: {
    borderWidth: 1, borderColor: '#FF7F50',
    borderRadius: 8, backgroundColor: 'transparent',
    justifyContent: 'center', alignItems: 'center',
  },
  outlineBtnAccentText: { fontFamily: FONTS.bold, color: '#FF7F50', textAlign: 'center' },
  bookmarkBtn: { padding: 4 },
});
