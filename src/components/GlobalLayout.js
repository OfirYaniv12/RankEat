import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
  TextInput,
  Modal,
  Platform,
  ActivityIndicator,
  FlatList,
  DeviceEventEmitter,
} from 'react-native';
import { navigationRef, navigate } from '../navigation/navigationRef';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import { signUpUser, getProfile, getDistricts, getCitiesByDistrict } from '../database/queries';
import { supabase } from '../database/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';

export default function GlobalLayout({ children }) {
  const { user, setUser } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

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
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    districtId: null,
    cityId: null,
    districtName: null,
    cityName: null
  });
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Custom Picker State
  const [selectionModalVisible, setSelectionModalVisible] = useState(false);
  const [selectionType, setSelectionType] = useState(''); // 'district' or 'city'
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  useEffect(() => {
    fetchDistricts();
    const listener = DeviceEventEmitter.addListener('openSignUp', () => setSignUpModalVisible(true));
    return () => {
      if (listener) listener.remove();
    };
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
    setTermsAccepted(false);
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

  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
      
      closeLoginModal();
      setSignUpModalVisible(false);
    } catch (e) {
      console.error('Google Login error:', e);
      setAuthError(e.message || 'שגיאה בהתחברות עם גוגל');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      navigate('Home');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const handleSignUp = async () => {
    setAuthError(null);
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.districtId || !formData.cityId) {
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
      const newUser = await signUpUser({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        districtId: formData.districtId,
        cityId: formData.cityId
      });

      const profile = await getProfile(newUser.id);
      setUser({ ...newUser, ...profile });
      
      setSignUpModalVisible(false);
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        districtId: null,
        cityId: null,
        districtName: null,
        cityName: null
      });
      setTermsAccepted(false);
    } catch (e) {
      console.error('Signup error:', e);
      setAuthError(e.message || 'שגיאה בתהליך ההרשמה');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={[styles.topHeader, { paddingHorizontal: width * 0.1 }]}>
        <View style={styles.headerLeft}>
          {user ? (
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
              <TouchableOpacity style={styles.authBtn} onPress={() => navigate('Profile')}>
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
      </View>

      {/* Main Content Area */}
      <View style={styles.contentWrapper}>
        {children}
      </View>

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
              <Text style={styles.inputLabel}>שם פרטי</Text>
              <TextInput 
                style={styles.authInput}
                placeholder="ישראל"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.firstName}
                onChangeText={(val) => setFormData({...formData, firstName: val})}
              />
              <Text style={styles.inputLabel}>שם משפחה</Text>
              <TextInput 
                style={styles.authInput}
                placeholder="ישראלי"
                placeholderTextColor={COLORS.textSecondary}
                value={formData.lastName}
                onChangeText={(val) => setFormData({...formData, lastName: val})}
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

              {/* Terms Checkbox */}
              <View style={styles.termsContainer}>
                <TouchableOpacity 
                  style={styles.checkboxContainer} 
                  onPress={() => setTermsAccepted(!termsAccepted)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, termsAccepted && styles.checkboxChecked]}>
                    {termsAccepted && <MaterialIcons name="check" size={16} color={COLORS.white} />}
                  </View>
                  <Text style={styles.termsText}>אני מאשר/ת את </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => {
                  setSignUpModalVisible(false); // close without wiping form
                  navigate('TermsOfService', { fromSignUp: true });
                }}>
                  <Text style={styles.termsLink}>תנאי השימוש</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={[styles.submitBtn, (isSubmittingAuth || !termsAccepted) && { opacity: 0.7 }]} 
                onPress={handleSignUp}
                disabled={isSubmittingAuth || !termsAccepted}
              >
                <Text style={styles.submitBtnText}>{isSubmittingAuth ? 'שומר...' : 'הרשמה'}</Text>
              </TouchableOpacity>

              <View style={styles.authDivider}>
                <View style={styles.authDividerLine} />
                <Text style={styles.authDividerText}>או</Text>
                <View style={styles.authDividerLine} />
              </View>

              <TouchableOpacity 
                style={[styles.googleBtn, !termsAccepted && { opacity: 0.7 }]} 
                onPress={() => {
                  if (!termsAccepted) {
                    setAuthError('יש לאשר את תנאי השימוש לפני ההרשמה עם גוגל');
                    return;
                  }
                  handleGoogleLogin();
                }}
              >
                <AntDesign name="google" size={20} style={styles.googleIcon} />
                <Text style={styles.googleBtnText}>המשך עם Google</Text>
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

              <View style={styles.authDivider}>
                <View style={styles.authDividerLine} />
                <Text style={styles.authDividerText}>או</Text>
                <View style={styles.authDividerLine} />
              </View>

              <TouchableOpacity 
                style={styles.googleBtn} 
                onPress={handleGoogleLogin}
              >
                <AntDesign name="google" size={20} style={styles.googleIcon} />
                <Text style={styles.googleBtnText}>התחבר עם Google</Text>
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
  termsContainer: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: SPACING.lg, 
    marginTop: SPACING.sm 
  },
  checkboxContainer: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center' 
  },
  checkbox: { 
    width: 22, 
    height: 22, 
    borderRadius: 6, 
    borderWidth: 2, 
    borderColor: COLORS.accent, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 8 
  },
  checkboxChecked: { 
    backgroundColor: COLORS.accent 
  },
  termsText: { 
    color: COLORS.textPrimary, 
    fontFamily: FONTS.regular,
    fontSize: 14 
  },
  termsLink: { 
    color: COLORS.accent, 
    fontFamily: FONTS.bold,
    fontSize: 14, 
    textDecorationLine: 'underline' 
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
  authDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  authDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  authDividerText: {
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.md,
    fontFamily: FONTS.regular,
    fontSize: 14,
  },
  googleBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  googleIcon: {
    marginLeft: 12,
    color: '#FFFFFF',
  },
  googleBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
});
