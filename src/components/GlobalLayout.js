import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
  Dimensions,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import { signUpUser, getProfile, getDistricts, getCitiesByDistrict } from '../database/queries';
import { supabase } from '../database/supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function GlobalLayout({ children }) {
  const { user, setUser } = useAuth();
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const isMobile = width < 768;

  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(Dimensions.get('window').width)).current; 

  // Auth State
  const [authError, setAuthError] = useState(null);
  const [signUpModalVisible, setSignUpModalVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const [loginFormData, setLoginFormData] = useState({
    email: '',
    password: ''
  });

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
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  useEffect(() => {
    fetchDistricts();
  }, []);

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
    setFilteredCities([]); // Clear old cities
    setIsLoadingCities(true);
    try {
      const data = await getCitiesByDistrict(districtId);
      setFilteredCities(data);
    } catch (e) {
      console.error('Error fetching cities:', e);
    } finally {
      setIsLoadingCities(false);
    }
  };

  const openSelection = (type) => {
    if (type === 'city' && !formData.districtId) return;
    setSelectionType(type);
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

  const closeLoginModal = () => {
    setLoginModalVisible(false);
    setAuthError(null);
    setLoginFormData({
      email: '',
      password: ''
    });
  };

  const switchToSignUp = () => {
    closeLoginModal();
    setSignUpModalVisible(true);
  };

  const switchToLogin = () => {
    closeSignUpModal();
    setLoginModalVisible(true);
  };

  const handleLogin = async () => {
    setAuthError(null);
    if (!loginFormData.email || !loginFormData.password) {
      setAuthError('אנא הזן אימייל וסיסמה');
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginFormData.email,
        password: loginFormData.password,
      });

      if (error) {
        if (error.message === 'Invalid login credentials') {
          throw new Error('אימייל או סיסמה לא נכונים');
        }
        throw error;
      }

      const profile = await getProfile(data.user.id);
      setUser({ ...data.user, ...profile });
      closeLoginModal();
    } catch (e) {
      console.error('Login error:', e);
      setAuthError(e.message || 'שגיאה בתהליך ההתחברות');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const handleSignUp = async () => {
    setAuthError(null);
    
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

      const profile = await getProfile(newUser.id);
      setUser({ ...newUser, ...profile });
      
      setSignUpModalVisible(false);
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

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={[styles.topHeader, { paddingHorizontal: width * 0.1 }]}>
        <View style={styles.headerLeft}>
          {user ? (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
              <TouchableOpacity style={styles.authBtn} onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.authText}>הפרופיל שלי</Text>
              </TouchableOpacity>
              <View style={{ width: SPACING.md }} />
              <TouchableOpacity style={styles.authBtn} onPress={handleLogout}>
                <Text style={styles.authText}>התנתקות</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity style={styles.authBtn} onPress={() => setSignUpModalVisible(true)}>
                <Text style={styles.authText}>הרשמה</Text>
              </TouchableOpacity>
              <View style={{ width: SPACING.md }} />
              <TouchableOpacity style={styles.authBtn} onPress={() => setLoginModalVisible(true)}>
                <Text style={styles.authText}>התחברות</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
        <View style={styles.headerCenter}></View>
        <TouchableOpacity style={styles.headerRight} onPress={toggleDrawer}>
          <View style={styles.hamburger}>
            <View style={styles.hamburgerLine} />
            <View style={[styles.hamburgerLine, { marginVertical: 5 }]} />
            <View style={styles.hamburgerLine} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={styles.contentWrapper}>
        {children}
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
            { width: isMobile ? '80%' : 300, transform: [{ translateX: drawerAnim }] }
          ]}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>תפריט</Text>
            </View>
            <View style={styles.drawerBody}>
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
              <Text style={styles.inputLabel}>אזור</Text>
              <TouchableOpacity style={styles.authInput} onPress={() => openSelection('district')}>
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
              <TouchableOpacity style={styles.switchAuth} onPress={switchToLogin}>
                <Text style={styles.switchAuthText}>כבר יש לך חשבון? להתחברות</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Login Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={loginModalVisible}
        onRequestClose={closeLoginModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.signUpContent, isMobile ? styles.mobileSignUp : styles.desktopSignUp]}>
            <View style={styles.signUpHeader}>
              <TouchableOpacity onPress={closeLoginModal}>
                <Text style={styles.closeModalX}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.signUpTitle}>התחברות ל-RankEat</Text>
            </View>
            <ScrollView contentContainerStyle={styles.signUpForm}>
              <Text style={styles.inputLabel}>אימייל</Text>
              <TextInput 
                style={styles.authInput}
                keyboardType="email-address"
                placeholder="example@mail.com"
                placeholderTextColor={COLORS.textSecondary}
                value={loginFormData.email}
                onChangeText={(val) => setLoginFormData({...loginFormData, email: val})}
              />
              <Text style={styles.inputLabel}>סיסמה</Text>
              <TextInput 
                style={styles.authInput}
                secureTextEntry
                placeholder="********"
                placeholderTextColor={COLORS.textSecondary}
                value={loginFormData.password}
                onChangeText={(val) => setLoginFormData({...loginFormData, password: val})}
              />
              {authError && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{authError}</Text>
                </View>
              )}
              <TouchableOpacity 
                style={[styles.submitBtn, isSubmittingAuth && { opacity: 0.7 }]} 
                onPress={handleLogin}
                disabled={isSubmittingAuth}
              >
                <Text style={styles.submitBtnText}>{isSubmittingAuth ? 'מתחבר...' : 'התחברות'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.switchAuth} onPress={switchToSignUp}>
                <Text style={styles.switchAuthText}>עדיין לא רשום? להרשמה</Text>
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
              {selectionType === 'city' && isLoadingCities ? (
                <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
                  <ActivityIndicator color={COLORS.accent} />
                  <Text style={[styles.selectionItemText, { textAlign: 'center', marginTop: 10 }]}>טוען ערים...</Text>
                </View>
              ) : (
                <ScrollView>
                  {(selectionType === 'district' ? districts : filteredCities).map((item) => (
                    <TouchableOpacity 
                      key={item.id} 
                      style={styles.selectionItem}
                      onPress={() => handleSelectItem(item)}
                    >
                      <Text style={styles.selectionItemText}>{item.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1000,
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
    borderRadius: 12,
  },
  authText: {
    fontFamily: FONTS.semibold,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  headerCenter: {
    flex: 1,
  },
  headerRight: {},
  hamburger: {
    padding: SPACING.sm,
  },
  hamburgerLine: {
    width: 24,
    height: 3,
    backgroundColor: COLORS.textPrimary,
    borderRadius: RADIUS.sm,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1001,
  },
  drawerContent: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.surface,
    zIndex: 1002,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    padding: SPACING.lg,
  },
  drawerHeader: {
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  drawerTitle: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  drawerBody: {
    flex: 1,
  },
  emptyDrawerText: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'right',
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
});
