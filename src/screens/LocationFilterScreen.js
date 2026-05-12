import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Animated,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { getDistricts, getCitiesByDistrict } from '../database/queries';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function LocationFilterScreen({ navigation, route }) {
  const { category } = route.params;

  const [step, setStep] = useState('district'); // 'district' | 'city'
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [loading, setLoading] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    loadDistricts();
  }, []);

  const animateIn = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const loadDistricts = async () => {
    try {
      const data = await getDistricts();
      setDistricts(data);
      animateIn();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDistrictSelect = async (district) => {
    setSelectedDistrict(district);
    setLoading(true);
    try {
      const data = await getCitiesByDistrict(district.id);
      setCities(data);
      setStep('city');
      animateIn();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCitySelect = (city) => {
    navigation.navigate('Rankings', {
      category,
      district: selectedDistrict,
      city,
    });
  };

  const handleSkipCity = () => {
    navigation.navigate('Rankings', {
      category,
      district: selectedDistrict,
      city: null,
    });
  };

  const renderDistrictItem = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => handleDistrictSelect(item)}
        activeOpacity={0.75}
      >
        <Text style={styles.listItemIcon}>📍</Text>
        <Text style={styles.listItemText}>{item.name}</Text>
        <Text style={styles.listItemArrow}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderCityItem = ({ item }) => (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => handleCitySelect(item)}
        activeOpacity={0.75}
      >
        <Text style={styles.listItemIcon}>🏙️</Text>
        <Text style={styles.listItemText}>{item.name}</Text>
        <Text style={styles.listItemArrow}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (step === 'city') {
              setStep('district');
              animateIn();
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backBtn}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerCategory}>{category.name}</Text>
          <Text style={styles.headerTitle}>
            {step === 'district' ? 'בחר אזור' : 'בחר עיר'}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Breadcrumb */}
      <View style={styles.breadcrumb}>
        <Text style={[styles.breadcrumbItem, step === 'district' && styles.breadcrumbActive]}>
          אזור
        </Text>
        <Text style={styles.breadcrumbSep}>›</Text>
        <Text style={[styles.breadcrumbItem, step === 'city' && styles.breadcrumbActive]}>
          עיר
        </Text>
        <Text style={styles.breadcrumbSep}>›</Text>
        <Text style={styles.breadcrumbItem}>תוצאות</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.accent} style={{ marginTop: 60 }} />
      ) : (
        <>
          {step === 'city' && (
            <TouchableOpacity style={styles.skipBtn} onPress={handleSkipCity}>
              <Text style={styles.skipText}>כל {selectedDistrict?.name} ›</Text>
            </TouchableOpacity>
          )}
          <FlatList
            data={step === 'district' ? districts : cities}
            keyExtractor={(item) => item.id.toString()}
            renderItem={step === 'district' ? renderDistrictItem : renderCityItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </>
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
  headerCenter: {
    alignItems: 'center',
  },
  headerCategory: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.accent,
    writingDirection: 'rtl',
    marginBottom: 2,
  },
  headerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
  },
  breadcrumb: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  breadcrumbItem: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    writingDirection: 'rtl',
  },
  breadcrumbActive: {
    color: COLORS.accent,
    fontFamily: FONTS.semibold,
  },
  breadcrumbSep: {
    color: COLORS.border,
    marginHorizontal: 6,
    fontSize: 16,
  },
  skipBtn: {
    alignSelf: 'flex-end',
    marginRight: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.accent + '20',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  skipText: {
    fontFamily: FONTS.semibold,
    fontSize: 13,
    color: COLORS.accent,
    writingDirection: 'rtl',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  listItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  listItemIcon: {
    fontSize: 22,
    marginLeft: SPACING.md,
  },
  listItemText: {
    flex: 1,
    fontFamily: FONTS.semibold,
    fontSize: 17,
    color: COLORS.textPrimary,
    writingDirection: 'rtl',
    textAlign: 'right',
  },
  listItemArrow: {
    fontSize: 22,
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  separator: {
    height: SPACING.sm,
  },
});
