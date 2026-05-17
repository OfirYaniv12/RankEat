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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { supabase } from '../database/supabaseClient';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function BusinessProfileScreen({ route, navigation }) {
  const { businessId } = route.params || {};

  const [businessData, setBusinessData] = useState(null);
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Aggregated Statistics
  const totalDishes = dishes.length;
  const totalReviews = dishes.reduce((sum, dish) => sum + (dish.review_count || 0), 0);

  const renderDishItem = ({ item }) => {
    return (
      <View style={styles.cardContainer}>
        {/* 1. Far Right (first in row-reverse): Image Placeholder */}
        <View style={styles.dishImageContainer}>
          <MaterialIcons name="lunch-dining" size={40} color="#FF7F50" />
        </View>

        {/* 2. Middle (second in row-reverse): Text Info */}
        <View style={styles.textInfo}>
          <Text style={styles.dishName}>{item.name}</Text>
          <Text style={styles.reviewCount}>דורג ע"י {item.review_count || 0} אנשים</Text>
        </View>

        {/* 3. Far Left (third in row-reverse): Rating Badge using Smart Score */}
        <View style={styles.ratingPill}>
          <Text style={styles.ratingText}>
            ★ {item.weighted_score ? item.weighted_score.toFixed(1) : '0.0'}
          </Text>
        </View>
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
      <View>
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

      <FlatList
        data={dishes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderDishItem}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        style={styles.flatList}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>טרם דורגו מנות במסעדה זו</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
  },
  cardContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    maxWidth: 800,
    alignSelf: 'center',
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
});
