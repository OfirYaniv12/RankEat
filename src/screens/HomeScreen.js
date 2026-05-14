import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  StatusBar,
  useWindowDimensions,
  Dimensions,
  ScrollView,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import { getHomeStats, signUpUser, getProfile, getDistricts, getCitiesByDistrict } from '../database/queries';
import { supabase } from '../database/supabaseClient';
export default function HomeScreen({ navigation }) {
  const [stats, setStats] = useState({ cities: 0, restaurants: 0, reviews: 0 });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sign Up Modal State
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [signUpModalVisible, setSignUpModalVisible] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const [districts, setDistricts] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    districtId: null,
    cityId: null,
    districtName: null,
    cityName: null
  });

  // Custom Picker State
  const [selectionModalVisible, setSelectionModalVisible] = useState(false);
  const [selectionType, setSelectionType] = useState(''); // 'district' or 'city'
  const [selectionData, setSelectionData] = useState([]);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const drawerAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current; 

  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const isWeb = Platform.OS === 'web';
  useEffect(() => {
    fetchStats();
    fetchDistricts();
    checkSession();
    // Pulsing glow on button
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const fetchStats = async () => {
    try {
      const data = await getHomeStats();
      setStats(data);
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  };

  const checkSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        setUser({ ...session.user, ...profile });
      }
    } catch (e) {
      console.error('Session check error:', e);
    }
  };

  const fetchDistricts = async () => {
    try {
      const data = await getDistricts();
      setDistricts(data);
    } catch (e) {
      console.error('Error fetching districts:', e);
    }
  };

  const handleDistrictChange = async (districtId) => {
    const district = districts.find(d => d.id === districtId);
    setFormData(prev => ({ ...prev, districtId, districtName: district?.name, cityId: null, cityName: null }));
    try {
      const data = await getCitiesByDistrict(districtId);
      setFilteredCities(data);
    } catch (e) {
      console.error('Error fetching cities:', e);
    }
  };

  const openSelection = (type) => {
    if (type === 'city' && !formData.districtId) return;
    setSelectionType(type);
    setSelectionData(type === 'district' ? districts : filteredCities);
    setSelectionModalVisible(true);
  };

  const handleSelectItem = (item) => {
    if (selectionType === 'district') {
      handleDistrictChange(item.id);
    } else {
      setFormData(prev => ({ ...prev, cityId: item.id, cityName: item.name }));
    }
    setSelectionModalVisible(false);
  };

  const closeSignUpModal = () => {
    setSignUpModalVisible(false);
    setAuthError(null);
    setFormData({
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      districtId: null,
      cityId: null,
      districtName: null,
      cityName: null
    });
  };

  const handleSignUp = async () => {
    setAuthError(null);
    
    // 1. Validation
    if (!formData.fullName || !formData.email || !formData.password || !formData.districtId || !formData.cityId) {
      setAuthError('אנא מלא את כל השדות');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setAuthError('הסיסמאות אינן תואמות');
      return;
    }

    if (formData.password.length < 6) {
      setAuthError('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      // Split name
      const nameParts = formData.fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '—';

      const newUser = await signUpUser({
        email: formData.email,
        password: formData.password,
        firstName,
        lastName,
        districtId: formData.districtId,
        cityId: formData.cityId
      });

      // Fetch full profile for local state
      const profile = await getProfile(newUser.id);
      setUser({ ...newUser, ...profile });
      
      setSignUpModalVisible(false);
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        districtId: null,
        cityId: null,
        districtName: null,
        cityName: null
      });
    } catch (e) {
      console.error('Signup error:', e);
      setAuthError(e.message || 'שגיאה בתהליך ההרשמה');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const formatNumber = (num, isExact = false) => {
    if (isExact || num < 1000) return num.toLocaleString();
    return Math.floor(num / 1000) + 'K+';
  };

  const toggleDrawer = () => {
    const nextState = !isDrawerOpen;
    if (nextState) {
      setIsDrawerOpen(true);
      Animated.timing(drawerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(drawerAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsDrawerOpen(false));
    }
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const buttonShadowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.accent, COLORS.accentLight],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Fixed Header */}
      <View style={[styles.topHeader, { paddingHorizontal: width * 0.1 }]}>
        <View style={styles.headerLeft}>
          {user ? (
            <Text style={styles.authText}>היי, {user.first_name}</Text>
          ) : (
            <>
              <TouchableOpacity style={styles.authBtn} onPress={() => setSignUpModalVisible(true)}>
                <Text style={styles.authText}>הרשמה</Text>
              </TouchableOpacity>
              <View style={{ width: SPACING.md }} />
              <TouchableOpacity style={styles.authBtn} onPress={() => {}}>
                <Text style={styles.authText}>התחברות</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={styles.headerCenter}>
        </View>

        <TouchableOpacity style={styles.headerRight} onPress={toggleDrawer}>
          <View style={styles.hamburger}>
            <View style={styles.hamburgerLine} />
            <View style={[styles.hamburgerLine, { marginVertical: 5 }]} />
            <View style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Side Drawer Modal */}
      {isDrawerOpen && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity 
            activeOpacity={1} 
            style={styles.drawerOverlay} 
            onPress={toggleDrawer} 
          />
          <Animated.View style={[
            styles.drawerContent, 
            { width: isMobile ? '35%' : 300, transform: [{ translateX: drawerAnim }] }
          ]}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>תפריט</Text>
            </View>
            <View style={styles.drawerBody}>
              {/* Future menu items will go here */}
              <Text style={styles.emptyDrawerText}>בקרוב...</Text>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Sign Up Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={signUpModalVisible}
        onRequestClose={() => setSignUpModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.signUpContent, isMobile ? styles.mobileSignUp : styles.desktopSignUp]}>
            <View style={styles.signUpHeader}>
              <TouchableOpacity onPress={closeSignUpModal}>
                <Text style={styles.closeModalX}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.signUpTitle}>הצטרפות ל-RankEat</Text>
            </View>

            <ScrollView contentContainerStyle={styles.signUpForm}>
              <Text style={styles.inputLabel}>שם מלא</Text>
              <TextInput 
                style={styles.authInput}
                placeholder="ישראל ישראלי"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.fullName}
                onChangeText={(val) => setFormData({...formData, fullName: val})}
              />

              <Text style={styles.inputLabel}>אימייל</Text>
              <TextInput 
                style={styles.authInput}
                keyboardType="email-address"
                placeholder="example@mail.com"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.email}
                onChangeText={(val) => setFormData({...formData, email: val})}
              />

              <Text style={styles.inputLabel}>סיסמה</Text>
              <TextInput 
                style={styles.authInput}
                secureTextEntry
                placeholder="********"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.password}
                onChangeText={(val) => setFormData({...formData, password: val})}
              />

              <Text style={styles.inputLabel}>אימות סיסמה</Text>
              <TextInput 
                style={styles.authInput}
                secureTextEntry
                placeholder="********"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.confirmPassword}
                onChangeText={(val) => setFormData({...formData, confirmPassword: val})}
              />

              <Text style={styles.inputLabel}>אזור (מחוז)</Text>
              <TouchableOpacity 
                style={styles.authInput} 
                onPress={() => openSelection('district')}
              >
                <Text style={[styles.authInputText, !formData.districtId && { color: COLORS.textSecondary }]}>
                  {formData.districtName || 'בחר אזור...'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>עיר</Text>
              <TouchableOpacity 
                style={[styles.authInput, !formData.districtId && { opacity: 0.5 }]} 
                onPress={() => openSelection('city')}
                disabled={!formData.districtId}
              >
                <Text style={[styles.authInputText, !formData.cityId && { color: COLORS.textSecondary }]}>
                  {formData.cityName || 'בחר עיר...'}
                </Text>
              </TouchableOpacity>

              {authError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.submitBtn, isSubmittingAuth && { opacity: 0.7 }]} 
                onPress={handleSignUp}
                disabled={isSubmittingAuth}
              >
                <Text style={styles.submitBtnText}>{isSubmittingAuth ? 'שומר...' : 'הרשמה'}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.switchAuth} onPress={() => {}}>
                <Text style={styles.switchAuthText}>כבר יש לך חשבון? להתחברות</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Item Selection Modal (Custom Picker) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={selectionModalVisible}
        onRequestClose={() => setSelectionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.selectionContent}>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>
                {selectionType === 'district' ? 'בחר אזור' : 'בחר עיר'}
              </Text>
              <TouchableOpacity onPress={() => setSelectionModalVisible(false)}>
                <Text style={styles.closeSelection}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={{ maxHeight: 400 }}>
              <ScrollView>
                {selectionData.map((item) => (
                  <TouchableOpacity 
                    key={item.id} 
                    style={styles.selectionItem}
                    onPress={() => handleSelectItem(item)}
                  >
                    <Text style={styles.selectionItemText}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Background decorative circles */}
      <View style={[styles.circle1, isMobile && styles.circle1Mobile]} />
      <View style={[styles.circle2, isMobile && styles.circle2Mobile]} />

      {/* Main Content Area (Centered) */}
      <View style={styles.mainContent}>
        {/* Logo / App Name */}
        <View style={styles.logoHero}>
          <Text style={[styles.logoEmoji, isMobile && { fontSize: 80 }]}>🍔</Text>
          <Text style={[styles.appName, isMobile && { fontSize: 48 }]}>RankEat</Text>
          <Text style={[styles.tagline, isMobile && { fontSize: 18 }]}>הדירוגים הכי טובים, בכף ידך</Text>
        </View>

        {/* CTA Button */}
        <View style={styles.ctaWrapper}>
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={[styles.ctaButton, isMobile && { minWidth: 280, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg }]}
              onPress={() => navigation.navigate('CategorySelect')}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={1}
            >
              <Text style={[styles.ctaText, isMobile && { fontSize: 24 }]}>מה אוכלים? 🍽️</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Stats row (Bottom) */}
      <View style={[styles.statsRow, isMobile && { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, marginBottom: SPACING.xl }]}>
        <View style={[styles.statItem, isMobile && { paddingHorizontal: SPACING.md }]}>
          <Text style={[styles.statNumber, isMobile && { fontSize: 22 }]}>{formatNumber(stats.reviews)}</Text>
          <Text style={[styles.statLabel, isMobile && { fontSize: 13 }]}>דירוגים</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.statItem, isMobile && { paddingHorizontal: SPACING.md }]}>
          <Text style={[styles.statNumber, isMobile && { fontSize: 22 }]}>{formatNumber(stats.restaurants)}</Text>
          <Text style={[styles.statLabel, isMobile && { fontSize: 13 }]}>מסעדות</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={[styles.statItem, isMobile && { paddingHorizontal: SPACING.md }]}>
          <Text style={[styles.statNumber, isMobile && { fontSize: 22 }]}>{formatNumber(stats.cities, true)}</Text>
          <Text style={[styles.statLabel, isMobile && { fontSize: 13 }]}>ערים</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpContent: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  mobileSignUp: {
    width: '95%',
    height: '90%',
  },
  desktopSignUp: {
    width: 500,
    maxHeight: '85%',
  },
  signUpHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  signUpTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.textPrimary,
  },
  closeModalX: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  signUpForm: {
    padding: SPACING.xl,
  },
  inputLabel: {
    fontFamily: FONTS.semibold,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textAlign: 'right',
  },
  authInput: {
    backgroundColor: COLORS.bg,
    color: '#FFFFFF',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
    justifyContent: 'center',
    textAlign: 'right',
  },
  authInputText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: 16,
    textAlign: 'right',
  },
  selectionContent: {
    backgroundColor: COLORS.surface,
    width: '80%',
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.bg,
  },
  selectionTitle: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: COLORS.textPrimary,
  },
  closeSelection: {
    fontSize: 20,
    color: COLORS.textSecondary,
  },
  selectionItem: {
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  selectionItemText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  selectWrapper: {
    marginBottom: SPACING.lg,
  },
  webSelect: {
    backgroundColor: COLORS.bg,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: 16,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
    outlineWidth: 0,
  },
  mobileSelectPlaceholder: {
    backgroundColor: COLORS.bg,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    fontSize: 16,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
  },
  submitBtn: {
    backgroundColor: COLORS.accent,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  submitBtnText: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: '#FFF',
  },
  errorContainer: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  errorText: {
    color: '#FF6B6B',
    fontFamily: FONTS.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  switchAuth: {
    marginTop: SPACING.xl,
    alignItems: 'center',
  },
  switchAuthText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    textDecorationLine: 'underline',
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
    backgroundColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authBtn: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  authText: {
    fontFamily: FONTS.semibold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  headerCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: -1,
  },
  headerLogo: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: COLORS.textPrimary,
  },
  headerRight: {
    width: 40,
    height: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  hamburger: {
    width: 24,
    height: 20,
    justifyContent: 'center',
  },
  hamburgerLine: {
    width: 24,
    height: 2,
    backgroundColor: COLORS.textPrimary,
    borderRadius: 2,
  },
  drawerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawerContent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: SPACING.xl,
  },
  drawerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  closeDrawer: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  drawerBody: {
    flex: 1,
  },
  emptyDrawerText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'right',
    marginTop: SPACING.md,
  },
  circle1: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: COLORS.accent + '18',
    top: -80,
    right: -100,
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
    backgroundColor: COLORS.accentSecondary + '14',
    bottom: -50,
    left: -80,
  },
  circle2Mobile: {
    width: 180,
    height: 180,
    borderRadius: 90,
    bottom: -30,
    left: -50,
  },
  logoHero: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoEmoji: {
    fontSize: 100,
    marginBottom: SPACING.md,
  },
  appName: {
    fontFamily: FONTS.bold,
    fontSize: 56,
    color: COLORS.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    fontFamily: FONTS.regular,
    fontSize: 20,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  ctaWrapper: {
    alignItems: 'center',
    marginTop: SPACING.xl,
  },
  ctaButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.xl,
    borderRadius: RADIUS.pill,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 15,
    minWidth: 320,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: '#FFFFFF',
    writingDirection: 'rtl',
  },
  ctaHint: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  statNumber: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: COLORS.accent,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
    writingDirection: 'rtl',
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: COLORS.border,
  },
});
