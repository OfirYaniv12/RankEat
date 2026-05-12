import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  ActivityIndicator,
  StatusBar,
  I18nManager,
} from 'react-native';
import { getCategories } from '../database/queries';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

// Force RTL
I18nManager.forceRTL(true);

export default function CategorySelectScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
      setFiltered(data);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearch(text);
    setFiltered(
      categories.filter((c) => c.name.includes(text) || c.name.toLowerCase().includes(text.toLowerCase()))
    );
  };

  const handleSelect = (category) => {
    setSelected(category.id);
    setTimeout(() => {
      navigation.navigate('LocationFilter', { category });
    }, 150);
  };

  const CATEGORY_ICONS = {
    'המבורגר': '🍔',
    'פיצה': '🍕',
    'סושי': '🍣',
    'שווארמה': '🌯',
    'פלאפל': '🧆',
    'סטייק': '🥩',
    'פסטה': '🍝',
    'סלט': '🥗',
  };

  const renderCategory = ({ item, index }) => {
    const isSelected = selected === item.id;
    const icon = CATEGORY_ICONS[item.name] || '🍽️';
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <TouchableOpacity
          style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
          onPress={() => handleSelect(item)}
          activeOpacity={0.75}
        >
          <Text style={styles.categoryIcon}>{icon}</Text>
          <Text style={[styles.categoryName, isSelected && styles.categoryNameSelected]}>
            {item.name}
          </Text>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>בחר קטגוריה</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="חיפוש קטגוריה..."
          placeholderTextColor={COLORS.textSecondary}
          value={search}
          onChangeText={handleSearch}
          textAlign="right"
          returnKeyType="search"
        />
      </View>

      {/* Categories List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderCategory}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          ListEmptyComponent={
            <Text style={styles.emptyText}>לא נמצאו קטגוריות</Text>
          }
        />
      )}
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
    paddingTop: SPACING.xl,
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
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
  },
  searchContainer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 52,
  },
  searchIcon: {
    fontSize: 18,
    marginLeft: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  categoryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    marginHorizontal: 4,
    minHeight: 110,
    justifyContent: 'center',
  },
  categoryCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accent + '18',
  },
  categoryIcon: {
    fontSize: 36,
    marginBottom: SPACING.sm,
  },
  categoryName: {
    fontFamily: FONTS.semibold,
    fontSize: 15,
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
    textAlign: 'center',
  },
  categoryNameSelected: {
    color: COLORS.accent,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    left: 10,
    fontSize: 16,
    color: COLORS.accent,
    fontFamily: FONTS.bold,
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xxl,
    writingDirection: 'rtl',
  },
});
