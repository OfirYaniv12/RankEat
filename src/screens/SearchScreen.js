import React, { useState, useEffect, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { getCategories, getDistricts, getCities, getRankedRestaurants } from '../database/SearchQueries';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useAlert } from '../context/AlertContext';

// Force RTL
I18nManager.forceRTL(true);

const SEARCH_MODES = [
  { id: 'עירוני', label: 'עירוני' },
  { id: 'אזורי', label: 'אזורי' },
  { id: 'ארצי', label: 'ארצי' },
];

export default function SearchScreen({ navigation }) {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // Active Tab: 'dish' or 'restaurant'
  const [activeTab, setActiveTab] = useState('dish');
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [toggleWidth, setToggleWidth] = useState(0);

  // Global Loaded Data
  const [categories, setCategories] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Input Focus States for premium styling glows
  const [focusedInput, setFocusedInput] = useState(null);

  // CTA Button spring animation
  const buttonScale = useRef(new Animated.Value(1)).current;

  // ─── DISH SEARCH STATE (Preserved) ──────────────────────────────────────────
  const [categoryQuery, setCategoryQuery] = useState('');
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const [searchMode, setSearchMode] = useState('עירוני');
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);

  const [locationQuery, setLocationQuery] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);

  // ─── RESTAURANT SEARCH STATE (New) ──────────────────────────────────────────
  const [restaurantNameQuery, setRestaurantNameQuery] = useState('');
  const [restaurantSearchMode, setRestaurantSearchMode] = useState('עירוני');
  const [isRestaurantModeDropdownOpen, setIsRestaurantModeDropdownOpen] = useState(false);
  const [restaurantLocationQuery, setRestaurantLocationQuery] = useState('');
  const [selectedRestaurantLocation, setSelectedRestaurantLocation] = useState(null);
  const [isRestaurantLocationDropdownOpen, setIsRestaurantLocationDropdownOpen] = useState(false);
  const [filteredRestaurantLocations, setFilteredRestaurantLocations] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('Fetching search data from Supabase...');
      const [cats, dists, cits] = await Promise.all([
        getCategories(),
        getDistricts(),
        getCities(),
      ]);
      setCategories(cats);
      setDistricts(dists);
      setCities(cits);
    } catch (e) {
      console.error('Supabase fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  // --- Toggle Switch Handler ---
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    closeAllDropdowns();
    Animated.spring(slideAnim, {
      toValue: tab === 'restaurant' ? 1 : 0,
      friction: 8,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  // --- Dish Categories Helpers ---
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
    setIsRestaurantModeDropdownOpen(false);
    setIsRestaurantLocationDropdownOpen(false);
  };

  const getInitialRestaurantLocations = () => {
    const sourceData = restaurantSearchMode === 'עירוני' ? cities : districts;
    return [...sourceData].sort((a, b) => a.name.localeCompare(b.name, 'he')).slice(0, 4);
  };

  const handleRestaurantLocationSearch = (text) => {
    setRestaurantLocationQuery(text);
    setSelectedRestaurantLocation(null);
    if (restaurantSearchMode === 'ארצי') return;

    if (text.length > 0) {
      const sourceData = restaurantSearchMode === 'עירוני' ? cities : districts;
      setFilteredRestaurantLocations(
        sourceData
          .filter((l) => l.name.toLowerCase().includes(text.toLowerCase()))
          .sort((a, b) => a.name.localeCompare(b.name, 'he'))
          .slice(0, 4)
      );
      setIsRestaurantLocationDropdownOpen(true);
    } else {
      setFilteredRestaurantLocations(getInitialRestaurantLocations());
      setIsRestaurantLocationDropdownOpen(true);
    }
  };

  const handleRestaurantLocationFocus = () => {
    if (restaurantSearchMode === 'ארצי') return;
    closeAllDropdowns();
    if (restaurantLocationQuery.length > 0) {
      handleRestaurantLocationSearch(restaurantLocationQuery);
    } else {
      setFilteredRestaurantLocations(getInitialRestaurantLocations());
      setIsRestaurantLocationDropdownOpen(true);
    }
  };

  const selectRestaurantLocation = (item) => {
    setSelectedRestaurantLocation(item);
    setRestaurantLocationQuery(item.name);
    setIsRestaurantLocationDropdownOpen(false);
    Keyboard.dismiss();
  };

  const selectRestaurantMode = (mode) => {
    setRestaurantSearchMode(mode);
    setIsRestaurantModeDropdownOpen(false);
    setSelectedRestaurantLocation(null);
    setRestaurantLocationQuery('');
    setIsRestaurantLocationDropdownOpen(false);
  };

  const getRestaurantLocationPlaceholder = () => {
    if (restaurantSearchMode === 'ארצי') return 'כל הארץ\u200F';
    if (restaurantLocationQuery.length > 0) return '';
    return restaurantSearchMode === 'עירוני' ? 'הזן את שם העיר המבוקשת\u200F' : 'הזן את שם האזור המבוקש\u200F';
  };

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

  const selectMode = (mode) => {
    setSearchMode(mode);
    setIsModeDropdownOpen(false);
    setSelectedLocation(null);
    setLocationQuery('');
    setIsLocationDropdownOpen(false);
  };

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

  const getDishLocationPlaceholder = () => {
    if (searchMode === 'ארצי') return 'כל הארץ\u200F';
    if (locationQuery.length > 0) return '';
    return searchMode === 'עירוני' ? 'הזן את שם העיר המבוקשת\u200F' : 'הזן את שם האזור המבוקש\u200F';
  };

  // --- Restaurant Categories Helpers ---
  const toggleCategorySelection = (catId) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter(id => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  // --- Spring Button Handlers ---
  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  // --- Submits ---
  const handleSearchSubmit = async () => {
    if (activeTab === 'dish') {
      // Legacy Dish Search Validation & Submit
      if (!selectedCategory) {
        showAlert({ title: 'שגיאה', message: 'יש לבחור קטגוריה', type: 'error', primaryButtonText: 'הבנתי' });
        return;
      }
      if (searchMode !== 'ארצי' && !selectedLocation) {
        showAlert({ title: 'שגיאה', message: 'יש לבחור מיקום או לשנות חיפוש לארצי', type: 'warning', primaryButtonText: 'הבנתי' });
        return;
      }

      navigation.navigate('Rankings', {
        searchType: 'dish',
        category: selectedCategory,
        district: searchMode === 'אזורי' ? selectedLocation : null,
        city: searchMode === 'עירוני' ? selectedLocation : null,
      });
    } else {
      // Restaurant Search Validation & Submit
      setLoading(true);
      try {
        const sortedRestaurants = await getRankedRestaurants({
          nameQuery: restaurantNameQuery,
          searchMode: restaurantSearchMode,
          selectedLocation: selectedRestaurantLocation,
          selectedCategoryIds,
          userCityId: user?.city_id,
          userDistrictId: user?.district_id,
        });

        navigation.navigate('Rankings', {
          searchType: 'restaurant',
          restaurants: sortedRestaurants,
          nameQuery: restaurantNameQuery,
          searchMode: restaurantSearchMode,
          selectedLocation: selectedRestaurantLocation,
          selectedCategoryIds,
        });
      } catch (e) {
        console.error('Restaurant search submit error:', e);
        showAlert({ title: 'שגיאה', message: 'שגיאה בביצוע החיפוש', type: 'error', primaryButtonText: 'הבנתי' });
      } finally {
        setLoading(false);
      }
    }
  };

  const isAnyDropdownOpen =
    isCategoryDropdownOpen ||
    isModeDropdownOpen ||
    isLocationDropdownOpen ||
    isRestaurantModeDropdownOpen ||
    isRestaurantLocationDropdownOpen;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, toggleWidth ? -(toggleWidth / 2 - 2) : 0],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Decorative premium backdrop circles */}
      <View style={[styles.circle1, isMobile && styles.circle1Mobile]} />
      <View style={[styles.circle2, isMobile && styles.circle2Mobile]} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {activeTab === 'dish' ? 'גלה מנות מעולות' : 'מצא מסעדות מובילות'}
            </Text>
          </View>
          <Text style={styles.headerTitle}>
            {activeTab === 'dish' ? 'מה ' : 'איפה '}
            <Text style={styles.headerTitleHighlight}>אוכלים?</Text>
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Static Animated Sliding Toggle Switch */}
      <View 
        style={[styles.toggleContainer, isMobile && { width: '90%' }]}
        onLayout={(e) => setToggleWidth(e.nativeEvent.layout.width)}
      >
        {toggleWidth > 0 && (
          <Animated.View 
            style={[
              styles.slidingPill, 
              { 
                width: toggleWidth / 2 - 4, 
                transform: [{ translateX }] 
              }
            ]} 
          />
        )}
        <TouchableOpacity 
          style={styles.toggleTab} 
          onPress={() => handleTabChange('dish')}
          activeOpacity={0.9}
        >
          <Text style={[styles.toggleTabText, activeTab === 'dish' && styles.toggleTabTextActive]}>חיפוש מנה</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.toggleTab} 
          onPress={() => handleTabChange('restaurant')}
          activeOpacity={0.9}
        >
          <Text style={[styles.toggleTabText, activeTab === 'restaurant' && styles.toggleTabTextActive]}>חיפוש מסעדה</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 60 }} />
      ) : (
        <ScrollView 
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'dish' ? (
            /* ────────────────────────────────────────────────────────────────
               DISH SEARCH MODULE (Preserved Legacy Panel)
               ──────────────────────────────────────────────────────────────── */
            <View style={[styles.formContainer, isAnyDropdownOpen && { zIndex: 20 }]}>
              {/* Row 1: Category Search */}
              <View style={[styles.inputRow, isMobile && { width: '100%' }, { zIndex: isCategoryDropdownOpen ? 10 : 1 }]}>
                <View style={styles.inputGroup}>
                  <View style={[styles.searchBox, focusedInput === 'category' && styles.focusedBox]}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder={categoryQuery.length > 0 ? "" : "מה אוכלים?\u200F"}
                      placeholderTextColor={COLORS.textSecondary}
                      value={categoryQuery}
                      onChangeText={handleCategorySearch}
                      onFocus={() => {
                        setFocusedInput('category');
                        handleCategoryFocus();
                      }}
                      onBlur={() => {
                        setFocusedInput(null);
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
              <View style={[
                styles.inputRow, 
                isMobile ? styles.row2Mobile : styles.row2, 
                isMobile && { width: '100%' },
                { zIndex: (isModeDropdownOpen || isLocationDropdownOpen) ? 10 : 1, marginTop: SPACING.lg }
              ]}>
                
                {/* Search Mode */}
                <View style={[
                  styles.inputGroup, 
                  isMobile ? { width: '100%', marginBottom: SPACING.md, zIndex: 3 } : { flex: 0.3, zIndex: 3, marginLeft: SPACING.md }
                ]}>
                  <TouchableOpacity
                    style={[styles.modeSelectorBox, focusedInput === 'mode' && styles.focusedBox]}
                    onPress={() => {
                      const nextState = !isModeDropdownOpen;
                      closeAllDropdowns();
                      setIsModeDropdownOpen(nextState);
                      setFocusedInput(nextState ? 'mode' : null);
                    }}
                  >
                    <Text style={styles.modeText}>{searchMode}</Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>

                  {/* Mode Dropdown */}
                  {isModeDropdownOpen && (
                    <View style={styles.dropdown}>
                      {SEARCH_MODES.map((mode) => (
                        <TouchableOpacity
                          key={mode.id}
                          style={styles.dropdownItem}
                          onPress={() => selectMode(mode.id)}
                        >
                          <Text style={[styles.dropdownText, searchMode === mode.id && { color: COLORS.accent, fontFamily: FONTS.bold }]}>
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
                  isMobile ? { width: '100%', zIndex: 2 } : { flex: 0.7, zIndex: 2 }
                ]}>
                  <View style={[
                    styles.searchBox, 
                    searchMode === 'ארצי' && styles.disabledBox,
                    focusedInput === 'location' && styles.focusedBox
                  ]}>
                    <Text style={styles.searchIcon}>📍</Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder={getDishLocationPlaceholder()}
                      placeholderTextColor={COLORS.textSecondary}
                      value={searchMode === 'ארצי' ? 'כל הארץ' : locationQuery}
                      onChangeText={handleLocationSearch}
                      onFocus={() => {
                        setFocusedInput('location');
                        handleLocationFocus();
                      }}
                      onBlur={() => {
                        setFocusedInput(null);
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
            </View>
          ) : (
            /* ────────────────────────────────────────────────────────────────
               RESTAURANT SEARCH MODULE (New Panel - Structured cascading location selection)
               ──────────────────────────────────────────────────────────────── */
            <View style={[styles.formContainer, isAnyDropdownOpen && { zIndex: 20 }]}>
              {/* Row 1: Primary Name Input */}
              <View style={[styles.inputRow, isMobile && { width: '100%' }, { zIndex: 1 }]}>
                <View style={styles.inputGroup}>
                  <View style={[styles.searchBox, focusedInput === 'restaurantName' && styles.focusedBox]}>
                    <Text style={styles.searchIcon}>🏢</Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder={restaurantNameQuery.length > 0 ? "" : "איפה אוכלים?\u200F"}
                      placeholderTextColor={COLORS.textSecondary}
                      value={restaurantNameQuery}
                      onChangeText={setRestaurantNameQuery}
                      onFocus={() => setFocusedInput('restaurantName')}
                      onBlur={() => setFocusedInput(null)}
                      textAlign="right"
                    />
                  </View>
                </View>
              </View>

              {/* Row 2: Structured Mode & Location */}
              <View style={[
                styles.inputRow, 
                isMobile ? styles.row2Mobile : styles.row2, 
                isMobile && { width: '100%' },
                { zIndex: (isRestaurantModeDropdownOpen || isRestaurantLocationDropdownOpen) ? 10 : 1, marginTop: SPACING.lg }
              ]}>
                
                {/* Search Mode */}
                <View style={[
                  styles.inputGroup, 
                  isMobile ? { width: '100%', marginBottom: SPACING.md, zIndex: 3 } : { flex: 0.3, zIndex: 3, marginLeft: SPACING.md }
                ]}>
                  <TouchableOpacity
                    style={[styles.modeSelectorBox, focusedInput === 'restaurantMode' && styles.focusedBox]}
                    onPress={() => {
                      const nextState = !isRestaurantModeDropdownOpen;
                      closeAllDropdowns();
                      setIsRestaurantModeDropdownOpen(nextState);
                      setFocusedInput(nextState ? 'restaurantMode' : null);
                    }}
                  >
                    <Text style={styles.modeText}>{restaurantSearchMode}</Text>
                    <Text style={styles.dropdownArrow}>▼</Text>
                  </TouchableOpacity>

                  {/* Mode Dropdown */}
                  {isRestaurantModeDropdownOpen && (
                    <View style={styles.dropdown}>
                      {SEARCH_MODES.map((mode) => (
                        <TouchableOpacity
                          key={mode.id}
                          style={styles.dropdownItem}
                          onPress={() => selectRestaurantMode(mode.id)}
                        >
                          <Text style={[styles.dropdownText, restaurantSearchMode === mode.id && { color: COLORS.accent, fontFamily: FONTS.bold }]}>
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
                  isMobile ? { width: '100%', zIndex: 2 } : { flex: 0.7, zIndex: 2 }
                ]}>
                  <View style={[
                    styles.searchBox, 
                    restaurantSearchMode === 'ארצי' && styles.disabledBox,
                    focusedInput === 'restaurantLocation' && styles.focusedBox
                  ]}>
                    <Text style={styles.searchIcon}>📍</Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder={getRestaurantLocationPlaceholder()}
                      placeholderTextColor={COLORS.textSecondary}
                      value={restaurantSearchMode === 'ארצי' ? 'כל הארץ' : restaurantLocationQuery}
                      onChangeText={handleRestaurantLocationSearch}
                      onFocus={() => {
                        setFocusedInput('restaurantLocation');
                        handleRestaurantLocationFocus();
                      }}
                      onBlur={() => {
                        setFocusedInput(null);
                        setTimeout(() => setIsRestaurantLocationDropdownOpen(false), 200);
                      }}
                      textAlign="right"
                      editable={restaurantSearchMode !== 'ארצי'}
                    />
                  </View>

                  {/* Location Dropdown */}
                  {isRestaurantLocationDropdownOpen && (
                    <View style={styles.dropdown}>
                      {filteredRestaurantLocations.length > 0 ? (
                        filteredRestaurantLocations.map((item) => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.dropdownItem}
                            onPress={() => selectRestaurantLocation(item)}
                            keyboardShouldPersistTaps="handled"
                          >
                            <Text style={styles.dropdownText}>{item.name}</Text>
                          </TouchableOpacity>
                        ))
                      ) : restaurantLocationQuery.length > 0 ? (
                        <View style={styles.dropdownItem}>
                          <Text style={styles.errorText}>נראה שעוד לא הגענו למיקום הזה :(</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>

              {/* Row 3: Category Multi-select Selection Chips */}
              <View style={[styles.inputRow, isMobile && { width: '100%' }, { zIndex: 1, marginTop: SPACING.lg }]}>
                <View style={styles.chipsContainer}>
                  {categories.map((item) => {
                    const isSelected = selectedCategoryIds.includes(item.id);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.chip, 
                          isSelected && styles.chipActive,
                          isSelected && {
                            shadowColor: COLORS.accent,
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.3,
                            shadowRadius: 6,
                            elevation: 3,
                          }
                        ]}
                        onPress={() => toggleCategorySelection(item.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* CTA Search Button with Spring tactile animations */}
          <View style={styles.btnContainer}>
            <Animated.View style={{ transform: [{ scale: buttonScale }], width: isMobile ? '75%' : '40%', alignItems: 'center' }}>
              <TouchableOpacity 
                style={[styles.submitBtn, { width: '100%' }]} 
                onPress={handleSearchSubmit}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                activeOpacity={1}
              >
                <Text style={styles.submitBtnText}>חפש עכשיו</Text>
              </TouchableOpacity>
            </Animated.View>
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
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 60, // Top bar spacing
    paddingBottom: SPACING.md,
    zIndex: 10,
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
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderColor: 'rgba(255, 107, 53, 0.25)',
    borderWidth: 1,
    borderRadius: RADIUS.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: SPACING.xs,
    alignSelf: 'center',
  },
  headerBadgeText: {
    fontFamily: FONTS.bold,
    fontSize: 10,
    color: COLORS.accent,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 34,
    color: '#FFFFFF',
    writingDirection: 'rtl',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  headerTitleHighlight: {
    color: COLORS.accent, // Premium orange
    textShadowColor: 'rgba(255, 107, 53, 0.45)', // Orange glow shadow
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  toggleContainer: {
    flexDirection: 'row-reverse',
    alignSelf: 'center',
    width: '60%',
    height: 46,
    backgroundColor: '#161920',
    borderRadius: RADIUS.pill,
    padding: 3,
    position: 'relative',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 10,
  },
  slidingPill: {
    position: 'absolute',
    right: 2,
    top: 2,
    bottom: 2,
    backgroundColor: COLORS.accent, // Premium orange
    borderRadius: RADIUS.pill,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  toggleTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  toggleTabText: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  toggleTabTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  content: {
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
    zIndex: 10,
  },
  formContainer: {
    width: '80%',
    alignSelf: 'center',
    position: 'relative',
    zIndex: 2,
  },
  inputRow: {
    width: '100%',
  },
  row2: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-end',
  },
  row2Mobile: {
    flexDirection: 'column',
    alignItems: 'center',
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
    textAlign: 'right',
  },
  optionalLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    width: '100%',
  },
  optionalBadge: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    backgroundColor: '#1C1F26',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
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
    transition: 'all 0.2s ease-in-out',
  },
  focusedBox: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.surfaceHover,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'right',
    height: '100%',
    outlineStyle: 'none', // Remove web outline
  },
  modeText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dropdown: {
    position: 'absolute',
    top: 58,
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
    zIndex: 999,
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
  chipsContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: SPACING.xs,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: '#1C1F26',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  chipText: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
  },
  btnContainer: {
    marginTop: 40,
    alignItems: 'center',
    width: '100%',
    zIndex: 1,
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
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
  circle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: COLORS.accent + '12',
    top: -80,
    right: -100,
    zIndex: 0,
  },
  circle1Mobile: {
    width: 250,
    height: 250,
    borderRadius: 125,
    top: -50,
    right: -60,
  },
  circle2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: COLORS.accentSecondary + '08',
    bottom: -50,
    left: -80,
    zIndex: 0,
  },
  circle2Mobile: {
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: -30,
    left: -50,
  },
});
