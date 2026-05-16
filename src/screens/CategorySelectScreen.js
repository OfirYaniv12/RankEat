import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  I18nManager,
  Keyboard,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { getCategories, getDistricts, getCities } from '../database/queries';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

// Force RTL
I18nManager.forceRTL(true);

const SEARCH_MODES = [
  { id: 'עירוני', label: 'עירוני' },
  { id: 'מחוזי', label: 'מחוזי' },
  { id: 'ארצי', label: 'ארצי' },
];

export default function CategorySelectScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Category State
  const [categoryQuery, setCategoryQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  // Location State
  const [searchMode, setSearchMode] = useState('עירוני');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);

  const [locationQuery, setLocationQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  // Responsiveness
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Fetching data from Supabase...');
      const [cats, dists, cits] = await Promise.all([
        getCategories(),
        getDistricts(),
        getCities(),
      ]);
      console.log('Fetched data from Supabase:', { 
        categoriesCount: cats.length, 
        districtsCount: dists.length, 
        citiesCount: cits.length 
      });
      setCategories(cats);
      setDistricts(dists);
      setCities(cits);
    } catch (e) {
      console.error('Supabase fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // --- Helpers for Initial Dropdown State ---
  const getInitialCategories = () => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, 'he')).slice(0, 4);
  };

  const getInitialLocations = () => {
    const sourceData = searchMode === 'עירוני' ? cities : districts;
    return [...sourceData].sort((a, b) => a.name.localeCompare(b.name, 'he')).slice(0, 4);
  };

  const closeAllDropdowns = () => {
    setIsCategoryDropdownOpen(false);
    setIsModeDropdownOpen(false);
    setIsLocationDropdownOpen(false);
  };

  // --- Handlers for Category ---
  const handleCategorySearch = (text) => {
    setCategoryQuery(text);
    setSelectedCategory(null);
    if (text.length > 0) {
      setFilteredCategories(
        categories
          .filter((c) => c.name.toLowerCase().includes(text.toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name, 'he'))
          .slice(0, 4)
      );
      setIsCategoryDropdownOpen(true);
    } else {
      setFilteredCategories(getInitialCategories());
      setIsCategoryDropdownOpen(true);
    }
  };

  const handleCategoryFocus = () => {
    closeAllDropdowns();
    if (categoryQuery.length > 0) {
      handleCategorySearch(categoryQuery);
    } else {
      setFilteredCategories(getInitialCategories());
      setIsCategoryDropdownOpen(true);
    }
  };

  const selectCategory = (item) => {
    setSelectedCategory(item);
    setCategoryQuery(item.name);
    setIsCategoryDropdownOpen(false);
    Keyboard.dismiss();
  };

  // --- Handlers for Mode ---
  const selectMode = (mode) => {
    setSearchMode(mode);
    setIsModeDropdownOpen(false);
    // Reset location
    setSelectedLocation(null);
    setLocationQuery('');
    setIsLocationDropdownOpen(false);
  };

  // --- Handlers for Location ---
  const handleLocationSearch = (text) => {
    setLocationQuery(text);
    setSelectedLocation(null);
    
    if (searchMode === 'ארצי') return;

    if (text.length > 0) {
      const sourceData = searchMode === 'עירוני' ? cities : districts;
      setFilteredLocations(
        sourceData
          .filter((l) => l.name.toLowerCase().includes(text.toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name, 'he'))
          .slice(0, 4)
      );
      setIsLocationDropdownOpen(true);
    } else {
      setFilteredLocations(getInitialLocations());
      setIsLocationDropdownOpen(true);
    }
  };

  const handleLocationFocus = () => {
    if (searchMode === 'ארצי') return;
    closeAllDropdowns();
    if (locationQuery.length > 0) {
      handleLocationSearch(locationQuery);
    } else {
      setFilteredLocations(getInitialLocations());
      setIsLocationDropdownOpen(true);
    }
  };

  const selectLocation = (item) => {
    setSelectedLocation(item);
    setLocationQuery(item.name);
    setIsLocationDropdownOpen(false);
    Keyboard.dismiss();
  };

  // --- Submit ---
  const handleSearchSubmit = () => {
    if (!selectedCategory) {
      alert('יש לבחור קטגוריה');
      return;
    }
    if (searchMode !== 'ארצי' && !selectedLocation) {
      alert('יש לבחור מיקום או לשנות חיפוש לארצי');
      return;
    }

    navigation.navigate('Rankings', {
      category: selectedCategory,
      district: searchMode === 'מחוזי' ? selectedLocation : null,
      city: searchMode === 'עירוני' ? selectedLocation : null,
    });
  };

  const getLocationPlaceholder = () => {
    if (searchMode === 'ארצי') return 'כל הארץ\u200F';
    if (locationQuery.length > 0) return '';
    return searchMode === 'עירוני' ? 'הזן את שם העיר המבוקשת\u200F' : 'הזן את שם המחוז המבוקש\u200F';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>מה אוכלים?</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Row 1: Category Search */}
          <View style={[styles.inputRow, isMobile && { width: '90%' }, { zIndex: 3 }]}>
            <View style={styles.inputGroup}>
              <View style={styles.searchBox}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={categoryQuery.length > 0 ? "" : "מה אוכלים?\u200F"}
                  placeholderTextColor={COLORS.textSecondary}
                  value={categoryQuery}
                  onChangeText={handleCategorySearch}
                  onFocus={handleCategoryFocus}
                  onBlur={() => {
                    setTimeout(() => setIsCategoryDropdownOpen(false), 200);
                  }}
                  textAlign="right"
                />
              </View>

              {/* Category Dropdown */}
              {isCategoryDropdownOpen && (
                <View style={styles.dropdown}>
                  {filteredCategories.length > 0 ? (
                    filteredCategories.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.dropdownItem}
                        onPress={() => selectCategory(item)}
                        keyboardShouldPersistTaps="handled"
                      >
                        <Text style={styles.dropdownText}>{item.name}</Text>
                      </TouchableOpacity>
                    ))
                  ) : categoryQuery.length > 0 ? (
                    <View style={styles.dropdownItem}>
                      <Text style={styles.errorText}>נראה שאנחנו לא מכירים את זה עדיין :(</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          {/* Row 2: Search Mode & Location */}
          {/* On mobile, stack vertically. On desktop, keep 30/70 row. */}
          <View style={[
            styles.inputRow, 
            isMobile ? styles.row2Mobile : styles.row2, 
            isMobile && { width: '90%' },
            { zIndex: 2 }
          ]}>
            
            {/* Search Mode */}
            <View style={[
              styles.inputGroup, 
              isMobile ? { width: '100%', marginBottom: SPACING.lg, zIndex: 3 } : { flex: 0.3, zIndex: 3, marginLeft: SPACING.md }
            ]}>
              <Text style={styles.label}>איך לחפש?</Text>
              <TouchableOpacity
                style={styles.modeSelectorBox}
                onPress={() => {
                  const nextState = !isModeDropdownOpen;
                  closeAllDropdowns();
                  setIsModeDropdownOpen(nextState);
                }}
              >
                <Text style={styles.modeText}>{searchMode}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>

              {/* Mode Dropdown */}
              {isModeDropdownOpen && (
                <View style={[styles.dropdown, { top: 80 }]}>
                  {SEARCH_MODES.map((mode) => (
                    <TouchableOpacity
                      key={mode.id}
                      style={styles.dropdownItem}
                      onPress={() => selectMode(mode.id)}
                    >
                      <Text style={[styles.dropdownText, searchMode === mode.id && { color: COLORS.accent }]}>
                        {mode.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Location Input */}
            <View style={[
              styles.inputGroup, 
              isMobile ? { width: '100%', zIndex: 2 } : { flex: 0.7, zIndex: 2, justifyContent: 'flex-end' }
            ]}>
              <View style={[styles.searchBox, searchMode === 'ארצי' && styles.disabledBox]}>
                <Text style={styles.searchIcon}>📍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={getLocationPlaceholder()}
                  placeholderTextColor={COLORS.textSecondary}
                  value={searchMode === 'ארצי' ? 'כל הארץ' : locationQuery}
                  onChangeText={handleLocationSearch}
                  onFocus={handleLocationFocus}
                  onBlur={() => {
                    setTimeout(() => setIsLocationDropdownOpen(false), 200);
                  }}
                  textAlign="right"
                  editable={searchMode !== 'ארצי'}
                />
              </View>

              {/* Location Dropdown */}
              {isLocationDropdownOpen && (
                <View style={styles.dropdown}>
                  {filteredLocations.length > 0 ? (
                    filteredLocations.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.dropdownItem}
                        onPress={() => selectLocation(item)}
                        keyboardShouldPersistTaps="handled"
                      >
                        <Text style={styles.dropdownText}>{item.name}</Text>
                      </TouchableOpacity>
                    ))
                  ) : locationQuery.length > 0 ? (
                    <View style={styles.dropdownItem}>
                      <Text style={styles.errorText}>נראה שעוד לא הגענו למיקום הזה :(</Text>
                    </View>
                  ) : null}
                </View>
              )}
            </View>
          </View>

          {/* CTA Button */}
          <View style={styles.btnContainer}>
            <TouchableOpacity style={[styles.submitBtn, isMobile && { width: '70%' }]} onPress={handleSearchSubmit}>
              <Text style={styles.submitBtnText}>חפש עכשיו</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
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
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
  },
  content: {
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  inputRow: {
    width: '80%',
    alignSelf: 'center',
  },
  row2: {
    flexDirection: 'row-reverse', // Forces first item (Search Mode) to the RIGHT
    alignItems: 'flex-end',
    marginTop: SPACING.xl,
  },
  row2Mobile: {
    flexDirection: 'column', // Stack vertically on mobile
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  inputGroup: {
    position: 'relative',
    width: '100%',
  },
  label: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
    marginBottom: SPACING.xs,
  },
  searchBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 50,
  },
  modeSelectorBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 50,
  },
  disabledBox: {
    backgroundColor: COLORS.surfaceHover,
    opacity: 0.6,
  },
  searchIcon: {
    fontSize: 18,
    marginLeft: SPACING.sm,
  },
  dropdownArrow: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
    textAlign: 'right',
    height: '100%',
  },
  modeText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dropdown: {
    position: 'absolute',
    top: 58, // Always drops down immediately below the 50px input
    left: 0,
    right: 0,
    backgroundColor: COLORS.surfaceHover,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    overflow: 'hidden',
    zIndex: 999, // High z-index to float over everything
  },
  dropdownItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownText: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  btnContainer: {
    marginTop: 40,
    alignItems: 'center',
    width: '100%',
    zIndex: 1,
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 18, // Increased height visually
    width: '35%', // Decreased width by 30%
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FFFFFF',
    writingDirection: 'rtl',
  },
});
