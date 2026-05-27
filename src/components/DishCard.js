/**
 * DishCard — reusable ranked dish card for Rankings, Search, and NextTimeList.
 *
 * Props:
 *   item            – dish data object
 *   index           – 0-based rank index (unused if showRank=false)
 *   navigation      – react-navigation navigation prop
 *   isMobile        – boolean
 *   fadeAnim        – optional Animated.Value for entry opacity
 *   onOpenRatingForm – (item) => void
 *   onOpenReviews    – (item) => void
 *   isSaved          – boolean, controls filled/outlined bookmark icon
 *   onToggleSave     – () => void, called when bookmark tapped
 *   titleMode        – 'default' ("Business | City") | 'wishlist' ("Dish | Business")
 *   showRank         – boolean (default true)
 */

import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
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
      ? (
          <>
            <Text>{item.name || ''}</Text>
            <Text> | </Text>
            <Text>{item.business_name || ''}</Text>
          </>
        )
      : (
          <>
            <Text>{item.business_name || ''}</Text>
            <Text> | </Text>
            <Text>{item.city_name || ''}</Text>
          </>
        );

  const scoreText = `★ ${(item.weighted_score || 0).toFixed(1)}`;

  // ─── MOBILE layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <Animated.View style={[styles.cardWrapper, { opacity: anim }]}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onOpenReviews(item)}
          style={[
            styles.premiumCard,
            {
              borderColor: rank <= 3 && showRank ? badgeBg + '44' : 'rgba(255,255,255,0.05)',
              borderWidth: rank <= 3 && showRank ? 1.5 : 1,
            },
          ]}
        >
          {/* Rank badge — absolute top-right */}
          {showRank && (
            <View style={[styles.mobileRankOverlay, { backgroundColor: badgeBg }]}>
              <Text style={[styles.mobileRankOverlayText, { color: badgeTextColor }]}>{rank}</Text>
            </View>
          )}

          {/*
            Row layout (RTL: row-reverse):
              [Photo]  [Text flex:1]  [Rating+Bookmark]
            In row-reverse rendering order:
              - First child in JSX  → visually RIGHT (photo)
              - Last child in JSX   → visually LEFT  (rating column)
            justifyContent: 'space-between' pins photo to right edge
            and rating column to left edge.
          */}
          <View style={styles.mobileRow}>
            {/* RIGHT side: photo */}
            <View style={[styles.photoPlaceholder, { width: 64, height: 64 }]}>
              <MaterialIcons name="lunch-dining" size={26} color="#FF7F50" />
            </View>

            {/* MIDDLE: text, takes all remaining space */}
            <View style={styles.mobileTextCol}>
              <Text style={styles.mobileTitle} numberOfLines={2}>{titleLine}</Text>
              <Text style={styles.mobileAddress} numberOfLines={1}>
                {item.address || 'כתובת לא הוזנה'}
              </Text>
              <Text style={styles.mobileReviews} numberOfLines={1}>
                דורג ע"י {item.review_count || 0} אנשים
              </Text>
            </View>

            {/* LEFT side: rating pill + bookmark icon — flush to left edge */}
            <View style={styles.mobileLeftCol}>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingBadgeText}>{scoreText}</Text>
              </View>
              {onToggleSave && (
                <TouchableOpacity
                  onPress={onToggleSave}
                  activeOpacity={0.7}
                  style={styles.bookmarkBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons
                    name={isSaved ? 'bookmark' : 'bookmark-border'}
                    size={24}
                    color={isSaved ? COLORS.accent : '#A0A0A5'}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.mobileActions}>
            <TouchableOpacity
              style={styles.btnAccent}
              onPress={() => onOpenRatingForm(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.btnAccentText}>הוסף דירוג</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnOutline}
              onPress={() => navigation.navigate('BusinessProfile', { businessId: item.business_id })}
              activeOpacity={0.7}
            >
              <Text style={styles.btnOutlineText}>לעמוד המסעדה</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // ─── DESKTOP layout ──────────────────────────────────────────────────────────
  return (
    <Animated.View style={[styles.cardWrapper, { opacity: anim }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onOpenReviews(item)}
      >
        {/* Outer row: rank circle + card */}
        <View style={styles.desktopOuter}>
          {showRank && (
            <View style={[styles.rankBadgeCircle, { backgroundColor: badgeBg }]}>
              <Text style={[styles.rankBadgeText, { color: badgeTextColor }]}>{rank}</Text>
            </View>
          )}

          {/*
            Desktop card inner row (RTL: row-reverse):
              [Photo] [Text flex:1] [Left column]
            justifyContent: 'space-between' guarantees Left column hugs the left edge.
          */}
          <View
            style={[
              styles.premiumCard,
              styles.desktopCard,
              {
                borderColor: rank <= 3 && showRank ? badgeBg + '44' : 'rgba(255,255,255,0.05)',
                borderWidth: rank <= 3 && showRank ? 1.5 : 1,
              },
            ]}
          >
            {/* RIGHT: photo */}
            <View style={[styles.photoPlaceholder, { width: 100, height: 100 }]}>
              <MaterialIcons name="lunch-dining" size={40} color="#FF7F50" />
            </View>

            {/* MIDDLE: text */}
            <View style={styles.desktopTextCol}>
              <Text style={styles.desktopTitle} numberOfLines={2}>{titleLine}</Text>
              <Text style={styles.desktopAddress} numberOfLines={1}>
                {item.address || 'כתובת לא הוזנה'}
              </Text>
              <Text style={styles.desktopReviews} numberOfLines={1}>
                דורג ע"י {item.review_count || 0} אנשים
              </Text>
            </View>

            {/* LEFT: rating+bookmark on top, CTA buttons below — flush to left edge */}
            <View style={styles.desktopLeftCol}>
              <View style={styles.desktopScoreRow}>
                {onToggleSave && (
                  <TouchableOpacity
                    onPress={onToggleSave}
                    activeOpacity={0.7}
                    style={styles.bookmarkBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialIcons
                      name={isSaved ? 'bookmark' : 'bookmark-border'}
                      size={24}
                      color={isSaved ? COLORS.accent : '#A0A0A5'}
                    />
                  </TouchableOpacity>
                )}
                <View style={styles.ratingBadge}>
                  <Text style={[styles.ratingBadgeText, { fontSize: 18 }]}>{scoreText}</Text>
                </View>
              </View>

              <View style={styles.desktopBtnRow}>
                <TouchableOpacity
                  style={styles.btnOutline}
                  onPress={() => navigation.navigate('BusinessProfile', { businessId: item.business_id })}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnOutlineText}>לעמוד המסעדה</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnAccent}
                  onPress={() => onOpenRatingForm(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnAccentText}>הוסף דירוג</Text>
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
  // ── Shared ────────────────────────────────────────────────────────────────
  cardWrapper: {
    width: '100%',
    alignSelf: 'center',
    marginBottom: 4,
  },
  premiumCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  photoPlaceholder: {
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    flexShrink: 0,
  },
  ratingBadge: {
    backgroundColor: 'rgba(255,127,80,0.15)',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  ratingBadgeText: {
    color: '#FF7F50',
    fontFamily: FONTS.bold,
    fontSize: 14,
  },
  bookmarkBtn: {
    padding: 4,
  },

  // ── Mobile ────────────────────────────────────────────────────────────────
  mobileRankOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mobileRankOverlayText: {
    fontFamily: FONTS.bold,
    fontSize: 13,
  },
  mobileRow: {
    flexDirection: 'row-reverse',   // RTL: photo at right, rating col at left
    alignItems: 'center',
    justifyContent: 'space-between', // pins rating col to absolute left edge
    width: '100%',
    padding: 14,
    paddingBottom: 0,
  },
  mobileTextCol: {
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  mobileTitle: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontSize: 15,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  mobileAddress: {
    fontFamily: FONTS.regular,
    color: '#A0A0A5',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 3,
  },
  mobileReviews: {
    fontFamily: FONTS.regular,
    color: '#6E6E73',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 3,
  },
  mobileLeftCol: {
    alignItems: 'flex-start',   // children start at the left edge of this col
    justifyContent: 'center',
    flexShrink: 0,
  },
  mobileActions: {
    flexDirection: 'column',
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 8,
  },

  // ── Desktop ───────────────────────────────────────────────────────────────
  desktopOuter: {
    flexDirection: 'row-reverse',   // rank circle on right, card on left
    alignItems: 'center',
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  rankBadgeCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    flexShrink: 0,
  },
  rankBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 20,
  },
  desktopCard: {
    flex: 1,
    flexDirection: 'row-reverse',   // photo right, text middle, left col left
    alignItems: 'center',
    justifyContent: 'space-between', // left col pinned to left edge
    padding: 20,
  },
  desktopTextCol: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: 16,
  },
  desktopTitle: {
    fontFamily: FONTS.bold,
    color: '#FFFFFF',
    fontSize: 20,
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  desktopAddress: {
    fontFamily: FONTS.regular,
    color: '#A0A0A5',
    fontSize: 15,
    textAlign: 'right',
    marginTop: 6,
  },
  desktopReviews: {
    fontFamily: FONTS.regular,
    color: '#6E6E73',
    fontSize: 13,
    textAlign: 'right',
    marginTop: 6,
  },
  desktopLeftCol: {
    alignItems: 'flex-start',    // content starts at visual left edge
    justifyContent: 'space-between',
    flexShrink: 0,
    height: 100,
  },
  desktopScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  desktopBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────
  btnAccent: {
    borderWidth: 1,
    borderColor: '#FF7F50',
    borderRadius: 8,
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnAccentText: {
    fontFamily: FONTS.bold,
    color: '#FF7F50',
    fontSize: 14,
    textAlign: 'center',
  },
  btnOutline: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: {
    fontFamily: FONTS.bold,
    color: '#A0A0A5',
    fontSize: 14,
    textAlign: 'center',
  },
});
