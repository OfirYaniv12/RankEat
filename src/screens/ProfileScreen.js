import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  useWindowDimensions,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../database/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { getCitiesByDistrict, getDistricts } from '../database/queries';
import { COLORS, FONTS, RADIUS, SPACING } from '../theme';
import { getUserTitle } from '../utils/userTitle';
import { useAlert } from '../context/AlertContext';

export default function ProfileScreen() {
  const { showAlert, showConfirm } = useAlert();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  
  // Data State
  const [profileData, setProfileData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit Profile State
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [districtQuery, setDistrictQuery] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState(null);
  const [cityQuery, setCityQuery] = useState('');
  const [selectedCityId, setSelectedCityId] = useState(null);
  
  // Dropdown UI State
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [allDistricts, setAllDistricts] = useState([]);
  const [allCitiesForDistrict, setAllCitiesForDistrict] = useState([]);

  // Edit Review Modal State
  const [editReviewVisible, setEditReviewVisible] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [editRating, setEditRating] = useState('');
  const [editComment, setEditComment] = useState('');
  const [ratingError, setRatingError] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      const { data: profile, error: pError } = await supabase
        .from('profiles')
        .select('*, cities(name), districts(name)')
        .eq('id', authUser.id)
        .single();
      
      if (pError) throw pError;
      
      setProfileData(profile);
      applyProfileToEditState(profile);

      const { data: reviewsData, error: rError } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          dishes (
            name,
            businesses (
              id,
              name,
              cities (
                name
              )
            )
          ),
          review_likes ( user_id )
        `)
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (rError) throw rError;

      const mappedReviews = (reviewsData || []).map(r => ({
        ...r,
        likeCount: r.review_likes?.length || 0,
      }));
      setReviews(mappedReviews);
    } catch (error) {
      console.error('Profile Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    loadDistricts();
  }, []);

  const loadDistricts = async () => {
    try {
      const data = await getDistricts();
      setAllDistricts(data);
    } catch (e) {
      console.error('Districts fetch error:', e);
    }
  };

  const applyProfileToEditState = (data) => {
    if (!data) return;
    setEditFirstName(data.first_name || '');
    setEditLastName(data.last_name || '');
    setSelectedDistrictId(data.district_id);
    setDistrictQuery(data.districts?.name || '');
    setSelectedCityId(data.city_id);
    setCityQuery(data.cities?.name || '');
    if (data.district_id) fetchCities(data.district_id);
  };

  const fetchCities = async (districtId) => {
    try {
      const data = await getCitiesByDistrict(districtId);
      setAllCitiesForDistrict(data);
    } catch (e) {
      console.error('Cities fetch error:', e);
    }
  };

  const closeEditProfile = () => {
    setEditProfileVisible(false);
    applyProfileToEditState(profileData);
  };


  const handleDeleteReview = async (idToDelete) => {
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', idToDelete);
      if (error) {
        console.error('Delete review DB error:', error);
        showAlert({ title: 'שגיאה', message: error.message, type: 'error', primaryButtonText: 'הבנתי' });
      } else {
        setReviews(prev => prev.filter(r => r.id !== idToDelete));
      }
    } catch (error) {
      console.error('Delete review catch error:', error);
      showAlert({ title: 'שגיאה', message: 'מחיקת הדירוג נכשלה', type: 'error', primaryButtonText: 'הבנתי' });
    }
  };

  const handleUpdateReview = async () => {
    if (ratingError || !editRating) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ rating: parseFloat(editRating), comment: editComment })
        .eq('id', editingReview.id);
      if (error) {
        console.error('Update review error:', error);
        showAlert({ title: 'שגיאה', message: error.message, type: 'error', primaryButtonText: 'הבנתי' });
      } else {
        setReviews(prev => prev.map(r => r.id === editingReview.id ? { ...r, rating: parseFloat(editRating), comment: editComment } : r));
        setEditReviewVisible(false);
      }
    } catch (error) {
      console.error('Update review catch error:', error);
      showAlert({ title: 'שגיאה', message: 'עדכון הדירוג נכשל', type: 'error', primaryButtonText: 'הבנתי' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editFirstName.trim()) {
      showAlert({ title: 'שגיאה', message: 'אנא הזן שם פרטי', type: 'error', primaryButtonText: 'הבנתי' });
      return;
    }
    setActionLoading(true);
    try {
      const updates = {
        first_name: editFirstName,
        last_name: editLastName,
        district_id: selectedDistrictId,
        city_id: selectedCityId,
      };
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);
      if (error) throw error;
      setProfileData(prev => ({ ...prev, ...updates }));
      setEditProfileVisible(false);
    } catch (error) {
      console.error('Update profile error:', error);
      showAlert({ title: 'שגיאה', message: 'עדכון הפרופיל נכשל', type: 'error', primaryButtonText: 'הבנתי' });
    } finally {
      setActionLoading(false);
    }
  };

  const renderReviewItem = ({ item }) => (
    <View style={styles.reviewCard}>
      <View style={[styles.cardHeader, { alignItems: 'flex-start' }]}>
        {/* Right Side: Date, Business, and Dish Name */}
        <View style={{ flex: 1, alignItems: 'flex-end', marginLeft: 16 }}>
          <Text style={[styles.cardDate, { marginBottom: 4, marginTop: 0 }]}>
            {new Date(item.created_at).toLocaleDateString('he-IL')}
          </Text>
          <Text style={[styles.cardBusinessName, { textAlign: 'right' }]} numberOfLines={2}>
            {item.dishes?.businesses?.name || 'מסעדה לא ידועה'} - {item.dishes?.businesses?.cities?.name || ''}
          </Text>
          <Text style={[styles.cardDishName, { textAlign: 'right', marginTop: 2 }]} numberOfLines={2}>
            מנה: {item.dishes?.name || 'לא ידועה'}
          </Text>
        </View>

        {/* Left Side: Score & Likes */}
        <View style={{ alignItems: 'center', minWidth: 70, flexShrink: 0 }}>
          <View style={styles.ratingPillSmall}>
            <Text style={styles.ratingValueSmall}>★ {item.rating.toFixed(1)}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 6 }}>
            <Text style={{ fontFamily: FONTS.semibold, fontSize: 16, color: COLORS.textSecondary }}>
              {item.likeCount}
            </Text>
            <MaterialIcons name="favorite" size={20} color={COLORS.textSecondary} />
          </View>
        </View>
      </View>

      {item.comment ? (
        <View style={styles.cardBody}>
          <Text style={styles.cardReviewText}>{item.comment}</Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <TouchableOpacity 
          style={{ marginRight: 20 }}
          onPress={() => {
            showConfirm({
              title: 'מחיקת דירוג',
              message: 'האם אתה בטוח שברצונך למחוק את הדירוג?',
              type: 'warning',
              primaryButtonText: 'מחק דירוג',
              secondaryButtonText: 'ביטול',
              onConfirm: () => handleDeleteReview(item.id)
            });
          }}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialIcons name="delete-outline" size={22} color="#FF5252" />
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => {
            setEditingReview(item);
            setEditRating(item.rating.toString());
            setEditComment(item.comment || '');
            setRatingError(false);
            setEditReviewVisible(true);
          }}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <MaterialIcons name="edit" size={22} color="#64748B" />
        </TouchableOpacity>

        {item.dishes?.businesses?.id && (
          <TouchableOpacity
            style={styles.goToBusinessBtn}
            onPress={() => navigation.navigate('BusinessProfile', { businessId: item.dishes.businesses.id })}
            activeOpacity={0.7}
          >
            <MaterialIcons name="storefront" size={14} color={COLORS.accent} style={{ marginLeft: 4 }} />
            <Text style={styles.goToBusinessText}>לעמוד המסעדה</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#ff7f50" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderReviewItem}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.customHeader}>
              <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.backBtn}>
                <Text style={styles.backIcon}>←</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroSection}>
            <View style={styles.avatarLarge}>
              <Text style={styles.avatarTxt}>
                {(profileData?.first_name?.charAt(0) || '') + (profileData?.last_name?.charAt(0) || '')}
              </Text>
            </View>
            <Text style={styles.profileNameTxt}>{profileData?.first_name} {profileData?.last_name}</Text>
            <View style={styles.trustBadgePill}>
              <Text style={styles.trustTxt}>{getUserTitle(profileData?.trust_score, reviews.length)}</Text>
            </View>

            <TouchableOpacity style={styles.editProfileBtnOutline} onPress={() => setEditProfileVisible(true)}>
              <Text style={styles.editProfileBtnTxt}>עריכת פרופיל</Text>
            </TouchableOpacity>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{reviews.length}</Text>
                <Text style={styles.statLbl}>כמות דירוגים</Text>
              </View>
              <View style={styles.dividerV} />
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{profileData?.cities?.name || '—'}</Text>
                <Text style={styles.statLbl}>עיר מגורים נוכחית</Text>
              </View>
            </View>
            <View style={styles.dividerH} />
            <Text style={styles.historyTitle}>היסטוריית דירוגים</Text>
          </View>
        </View>
      }
        ListEmptyComponent={
          <View style={styles.emptyView}>
            <Text style={styles.emptyText}>טרם הוספת דירוגים, זה הזמן להתחיל!</Text>
          </View>
        }
      />

      <Modal visible={editProfileVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBody}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalHeading}>עריכת פרופיל</Text>
              <TouchableOpacity onPress={closeEditProfile}>
                <MaterialIcons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={{ width: '100%' }}>
              <Text style={styles.lbl}>שם פרטי</Text>
              <TextInput style={styles.inp} value={editFirstName} onChangeText={setEditFirstName} textAlign="right" />
              <Text style={styles.lbl}>שם משפחה</Text>
              <TextInput style={styles.inp} value={editLastName} onChangeText={setEditLastName} textAlign="right" />
              <Text style={styles.lbl}>אזור</Text>
              <View style={{ zIndex: 10 }}>
                <TextInput 
                  style={styles.inp} 
                  value={districtQuery} 
                  onChangeText={(t) => { setDistrictQuery(t); setSelectedDistrictId(null); setShowDistrictDropdown(true); }} 
                  textAlign="right" 
                  placeholder="חפש אזור..."
                  placeholderTextColor="#64748B"
                />
                {showDistrictDropdown && (
                  <View style={styles.dropdown}>
                    {allDistricts.filter(d => d.name.includes(districtQuery)).slice(0, 5).map(d => (
                      <TouchableOpacity key={d.id} style={styles.dropdownItem} onPress={() => {
                        setDistrictQuery(d.name);
                        setSelectedDistrictId(d.id);
                        setShowDistrictDropdown(false);
                        fetchCities(d.id);
                      }}>
                        <Text style={styles.dropdownTxt}>{d.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <Text style={styles.lbl}>עיר</Text>
              <View style={{ zIndex: 9 }}>
                <TextInput 
                  style={[styles.inp, !selectedDistrictId && { opacity: 0.5 }]} 
                  value={cityQuery} 
                  onChangeText={(t) => { setCityQuery(t); setSelectedCityId(null); setShowCityDropdown(true); }} 
                  textAlign="right" 
                  placeholder="חפש עיר..."
                  placeholderTextColor="#64748B"
                  editable={!!selectedDistrictId}
                />
                {showCityDropdown && allCitiesForDistrict.length > 0 && (
                  <View style={styles.dropdown}>
                    {allCitiesForDistrict.filter(c => c.name.includes(cityQuery)).slice(0, 5).map(c => (
                      <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => {
                        setCityQuery(c.name);
                        setSelectedCityId(c.id);
                        setShowCityDropdown(false);
                      }}>
                        <Text style={styles.dropdownTxt}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={closeEditProfile}>
                <Text style={styles.cancelBtnTxt}>ביטול</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateProfile}>
                <Text style={styles.saveBtnTxt}>שמור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={editReviewVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBody}>
            <TouchableOpacity style={styles.modalCloseX} onPress={() => setEditReviewVisible(false)}>
              <Text style={styles.modalCloseXTxt}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>עדכון דירוג</Text>
            <TextInput
              style={[styles.ratingInp, ratingError && { borderColor: '#FF6B6B' }]}
              keyboardType="decimal-pad"
              value={editRating}
              onChangeText={(t) => {
                setEditRating(t);
                const val = parseFloat(t);
                setRatingError(t.length > 0 && (isNaN(val) || val < 1 || val > 10));
              }}
              textAlign="center"
            />
            <TextInput
              style={styles.commentInp}
              multiline
              value={editComment}
              onChangeText={setEditComment}
              placeholder="ספרו לנו קצת..."
              placeholderTextColor="#64748B"
              textAlign="right"
              textAlignVertical="top"
            />
            <TouchableOpacity 
              style={[styles.saveBtn, (ratingError || !editRating) && { opacity: 0.5 }]} 
              onPress={handleUpdateReview}
              disabled={ratingError || !editRating}
            >
              <Text style={styles.saveBtnTxt}>עדכן</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {actionLoading && (
        <View style={styles.actionOverlay}>
          <ActivityIndicator size="large" color="#ff7f50" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0a' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: SPACING.xl + 60,
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
  listContent: { paddingBottom: 40, width: '100%' },
  heroSection: { alignItems: 'center', paddingTop: 60, marginBottom: 20, width: '100%', maxWidth: 800, alignSelf: 'center', paddingHorizontal: 20 },
  avatarLarge: { width: 150, height: 150, borderRadius: 75, backgroundColor: '#161618', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ff7f50' },
  avatarTxt: { fontSize: 48, fontWeight: 'bold', color: '#F1F5F9' },
  profileNameTxt: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF', marginTop: 15 },
  trustBadgePill: { backgroundColor: 'rgba(255,127,80,0.1)', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,127,80,0.2)', marginTop: 10 },
  trustTxt: { color: '#ff7f50', fontWeight: 'bold', fontSize: 14 },
  editProfileBtnOutline: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', marginTop: 30 },
  editProfileBtnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  statsRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 30, marginTop: 30 },
  statBox: { alignItems: 'center' },
  statVal: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  statLbl: { fontSize: 13, color: '#64748B', marginTop: 4 },
  dividerV: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerH: { width: '100%', height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 30 },
  historyTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF', textAlign: 'center', marginBottom: 25 },
  reviewCard: { 
    backgroundColor: '#1C1C1E', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 16,
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.05)',
    width: '90%',
    maxWidth: 800,
    alignSelf: 'center'
  },
  cardHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBusinessName: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'right',
    marginLeft: 10
  },
  ratingPillSmall: {
    backgroundColor: 'rgba(255, 127, 80, 0.15)',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingValueSmall: {
    color: '#FF7F50',
    fontWeight: 'bold',
    fontSize: 24,
  },
  cardSubHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  cardDishName: { 
    fontSize: 15, 
    color: '#A0A0A5',
    flex: 1,
    textAlign: 'right'
  },
  cardDate: { 
    fontSize: 13, 
    color: '#6E6E73' 
  },
  cardBody: {
    marginTop: 14,
  },
  cardReviewText: { 
    fontSize: 16, 
    color: '#E5E5EA', 
    lineHeight: 24, 
    textAlign: 'right' 
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  modalBody: { backgroundColor: '#161618', borderRadius: 24, padding: 25, width: '90%', maxWidth: 500, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 20 },
  modalHeading: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
  lbl: { fontSize: 14, color: '#64748B', marginBottom: 8, textAlign: 'right', width: '100%' },
  inp: { backgroundColor: '#0a0a0a', borderRadius: 12, padding: 15, color: '#FFF', fontSize: 16, marginBottom: 15, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  dropdown: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: '#1e1e20', borderRadius: 12, zIndex: 100, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  dropdownTxt: { color: '#FFF', textAlign: 'right' },
  modalActions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 10 },
  cancelBtn: { flex: 1, padding: 15, borderRadius: 12, backgroundColor: '#0a0a0a', alignItems: 'center' },
  cancelBtnTxt: { color: '#FFF', fontWeight: 'bold' },
  saveBtn: { flex: 2, backgroundColor: '#ff7f50', borderRadius: 12, padding: 15, alignItems: 'center' },
  saveBtnTxt: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  modalCloseX: { position: 'absolute', top: 15, left: 15 },
  modalCloseXTxt: { color: '#64748B', fontSize: 20, fontWeight: 'bold' },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginBottom: 20 },
  ratingInp: { backgroundColor: '#0a0a0a', borderRadius: 16, paddingVertical: 18, color: '#FFF', fontSize: 44, fontWeight: 'bold', marginBottom: 15, width: 130, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  commentInp: { backgroundColor: '#0a0a0a', borderRadius: 12, padding: 15, color: '#FFF', fontSize: 16, width: '100%', height: 120, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  actionOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, justifyContent: 'center', alignItems: 'center' },
  goToBusinessBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginLeft: 'auto',
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    borderRadius: RADIUS.pill,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  goToBusinessText: {
    color: COLORS.accent,
    fontFamily: FONTS.semibold,
    fontSize: 13,
  },
});
