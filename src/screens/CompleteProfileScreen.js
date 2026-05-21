import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  FlatList,
  I18nManager,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import { getDistricts, getCitiesByDistrict, updateProfile } from '../database/queries';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';

I18nManager.forceRTL(true);

export default function CompleteProfileScreen() {
  const { user, refreshUser } = useAuth();

  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const [selectedDistrictId, setSelectedDistrictId] = useState(null);
  const [selectedDistrictName, setSelectedDistrictName] = useState('');
  const [selectedCityId, setSelectedCityId] = useState(null);
  const [selectedCityName, setSelectedCityName] = useState('');

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerType, setPickerType] = useState(null); // 'district' | 'city'
  const [pickerItems, setPickerItems] = useState([]);
  const [pickerTitle, setPickerTitle] = useState('');

  // Extract display name from Google metadata or profile
  const displayName = user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.first_name
    || user?.email?.split('@')[0]
    || 'משתמש';

  useEffect(() => {
    getDistricts()
      .then(setDistricts)
      .catch((e) => console.error('Failed to load districts:', e));
  }, []);

  const openDistrictPicker = () => {
    setPickerType('district');
    setPickerTitle('בחר אזור');
    setPickerItems(districts);
    setPickerVisible(true);
  };

  const openCityPicker = () => {
    if (!selectedDistrictId) return;
    setPickerType('city');
    setPickerTitle('בחר עיר');
    setPickerItems(cities);
    setPickerVisible(true);
  };

  const handlePickerSelect = async (item) => {
    setPickerVisible(false);

    if (pickerType === 'district') {
      setSelectedDistrictId(item.id);
      setSelectedDistrictName(item.name);
      setSelectedCityId(null);
      setSelectedCityName('');
      setCities([]);

      setIsLoadingCities(true);
      try {
        const cityList = await getCitiesByDistrict(item.id);
        setCities(cityList);
      } catch (e) {
        console.error('Failed to load cities:', e);
      } finally {
        setIsLoadingCities(false);
      }
    } else if (pickerType === 'city') {
      setSelectedCityId(item.id);
      setSelectedCityName(item.name);
    }
  };

  const handleSave = async () => {
    setError(null);

    if (!selectedDistrictId) {
      setError('אנא בחר אזור מגורים');
      return;
    }
    if (!selectedCityId) {
      setError('אנא בחר עיר מגורים');
      return;
    }

    setIsSaving(true);
    try {
      await updateProfile(user.id, {
        district_id: selectedDistrictId,
        city_id: selectedCityId,
      });

      // Re-fetch the profile so AuthContext has the updated city/district
      await refreshUser(user.id);
    } catch (e) {
      console.error('Failed to save profile:', e);
      setError('שגיאה בשמירת הפרופיל. נסה שוב.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Icon + Header */}
        <View style={styles.heroSection}>
          <View style={styles.iconRing}>
            <Text style={styles.iconEmoji}>📍</Text>
          </View>
          <Text style={styles.welcomeTitle}>ברוך הבא, {displayName}!</Text>
          <Text style={styles.welcomeSubtitle}>
            כדי שנוכל להציג לך את הדירוגים הרלוונטיים לאזורך,{'\n'}
            נצטרך לדעת איפה אתה גר.
          </Text>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>השלמת פרופיל</Text>

          <Text style={styles.fieldLabel}>אזור מגורים</Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={openDistrictPicker}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="keyboard-arrow-down"
              size={22}
              color={selectedDistrictId ? COLORS.textPrimary : COLORS.textSecondary}
              style={styles.selectArrow}
            />
            <Text style={[styles.selectText, !selectedDistrictId && styles.placeholderText]}>
              {selectedDistrictName || 'בחר אזור...'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>עיר מגורים</Text>
          <TouchableOpacity
            style={[styles.selectButton, !selectedDistrictId && styles.selectButtonDisabled]}
            onPress={openCityPicker}
            disabled={!selectedDistrictId}
            activeOpacity={0.7}
          >
            {isLoadingCities ? (
              <ActivityIndicator size="small" color={COLORS.accent} style={styles.selectArrow} />
            ) : (
              <MaterialIcons
                name="keyboard-arrow-down"
                size={22}
                color={selectedCityId ? COLORS.textPrimary : COLORS.textSecondary}
                style={styles.selectArrow}
              />
            )}
            <Text style={[styles.selectText, !selectedCityId && styles.placeholderText]}>
              {selectedCityName || (selectedDistrictId ? 'בחר עיר...' : 'בחר אזור תחילה')}
            </Text>
          </TouchableOpacity>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                <Text style={styles.saveButtonText}>שמור והמשך</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Trust note */}
        <Text style={styles.noteText}>
          🔒 המידע שלך שמור אצלנו בבטחה ומשמש רק להתאמת תוצאות חיפוש
        </Text>
      </ScrollView>

      {/* Picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>{pickerTitle}</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Text style={styles.pickerClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={pickerItems}
              keyExtractor={(item) => String(item.id)}
              style={{ maxHeight: 380 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => handlePickerSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.pickerItemText}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.pickerSeparator} />}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 64,
    paddingBottom: 48,
  },

  // ─── Hero ───────────────────────────────────────────────────
  heroSection: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,107,53,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(255,107,53,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xl,
  },
  iconEmoji: {
    fontSize: 44,
  },
  welcomeTitle: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },

  // ─── Card ───────────────────────────────────────────────────
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    marginBottom: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
    textAlign: 'right',
    marginBottom: SPACING.xl,
  },

  // ─── Fields ─────────────────────────────────────────────────
  fieldLabel: {
    fontSize: 14,
    fontFamily: FONTS.semibold,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  selectButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
  },
  selectButtonDisabled: {
    opacity: 0.45,
  },
  selectArrow: {
    marginLeft: 8,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  placeholderText: {
    color: COLORS.textSecondary,
  },

  // ─── Error ──────────────────────────────────────────────────
  errorBox: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
  },
  errorText: {
    color: '#FF6B6B',
    fontFamily: FONTS.regular,
    fontSize: 14,
    textAlign: 'center',
  },

  // ─── Save Button ─────────────────────────────────────────────
  saveButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 16,
    marginTop: SPACING.xl,
  },
  saveButtonText: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: '#FFF',
  },

  // ─── Note ────────────────────────────────────────────────────
  noteText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 20,
  },

  // ─── Picker Modal ────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  pickerTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    color: COLORS.textPrimary,
  },
  pickerClose: {
    fontSize: 18,
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.sm,
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: SPACING.xl,
  },
  pickerItemText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  pickerSeparator: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginHorizontal: SPACING.xl,
  },
});
