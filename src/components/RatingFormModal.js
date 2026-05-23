/**
 * RatingFormModal — Unified dish rating form.
 * Used identically from both the Rankings screen and the Business Profile screen.
 *
 * Props:
 *   visible       {boolean}   - controls Modal visibility
 *   dish          {object}    - { id, name } of the dish being rated
 *   onClose       {function}  - called when the modal should close
 *   onSaveSuccess {function}  - called after a successful save (to trigger a parent refresh)
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { supabase } from '../database/supabaseClient';
import { addReview, updateReview } from '../database/queries';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

export default function RatingFormModal({ visible, dish, onClose, onSaveSuccess, initialReview = null }) {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const [ratingInput, setRatingInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [ratingError, setRatingError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form every time the modal opens for a new dish
  useEffect(() => {
    if (visible) {
      if (initialReview) {
        setRatingInput(initialReview.rating ? initialReview.rating.toString() : '');
        setCommentInput(initialReview.comment || '');
      } else {
        setRatingInput('');
        setCommentInput('');
      }
      setRatingError(false);
      setIsSubmitting(false);
    }
  }, [visible, dish?.id, initialReview]);

  const handleRatingChange = (text) => {
    let formatted = text.replace(/[^0-9.]/g, '');
    const parts = formatted.split('.');
    if (parts.length > 2) formatted = parts[0] + '.' + parts.slice(1).join('');
    if (parts.length === 2 && parts[1].length > 1) formatted = parts[0] + '.' + parts[1].slice(0, 1);
    setRatingInput(formatted);
    const val = parseFloat(formatted);
    setRatingError(formatted === '' || isNaN(val) || val < 1 || val > 10);
  };

  const handleSave = async () => {
    const val = parseFloat(ratingInput);
    if (isNaN(val) || val < 1 || val > 10) {
      const msg = 'אנא הזן ציון בין 1 ל-10';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('שגיאה', msg);
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const msg = 'אתה חייב להיות מחובר כדי לדרג! אנא הירשם או התחבר.';
        Platform.OS === 'web'
          ? window.alert(msg)
          : Alert.alert('התחברות דרושה', msg);
        setIsSubmitting(false);
        return;
      }

      if (initialReview) {
        await updateReview({ reviewId: initialReview.id, rating: val, comment: commentInput });
      } else {
        await addReview({ dishId: dish.id, rating: val, comment: commentInput });
      }
      onClose();
      if (onSaveSuccess) onSaveSuccess();
    } catch (e) {
      const errorMsg = e.message || 'לא ניתן לשמור את הדירוג כעת';
      Platform.OS === 'web'
        ? window.alert(`שגיאה: ${errorMsg}`)
        : Alert.alert('שגיאה', errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, isMobile && styles.sheetMobile]}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>נו, איך היה?</Text>

          {/* Dish name sub-label */}
          {dish?.name ? (
            <Text style={styles.dishLabel}>{dish.name}</Text>
          ) : null}

          {/* Big numeric rating input */}
          <TextInput
            style={[styles.ratingInput, ratingError && { borderColor: '#FF6B6B' }]}
            keyboardType="decimal-pad"
            inputMode="decimal"
            maxLength={4}
            placeholder="10"
            placeholderTextColor={COLORS.textSecondary}
            value={ratingInput}
            onChangeText={handleRatingChange}
            editable={!isSubmitting}
          />
          {ratingError && ratingInput.length > 0 && (
            <Text style={styles.errorText}>נא להזין ציון בין 1 ל-10</Text>
          )}

          {/* Comment */}
          <TextInput
            style={styles.commentInput}
            multiline={true}
            numberOfLines={4}
            placeholder="ספרו לנו קצת על המנה (אופציונלי)"
            placeholderTextColor={COLORS.textSecondary}
            value={commentInput}
            onChangeText={setCommentInput}
            editable={!isSubmitting}
            textAlignVertical="top"
          />

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, (!ratingInput || ratingError || isSubmitting) && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={!ratingInput || ratingError || isSubmitting}
            activeOpacity={0.8}
          >
            {isSubmitting
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.saveBtnText}>שמור דירוג</Text>
            }
          </TouchableOpacity>

          <Text style={styles.note}>רק מזכירים, הדירוג הוא למנה עצמה ולא לעסק 😉</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  sheet: {
    width: 400,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  sheetMobile: {
    width: '100%',
    padding: SPACING.lg,
  },
  closeBtn: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.pill,
    zIndex: 1,
  },
  closeBtnText: {
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  title: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  dishLabel: {
    fontFamily: FONTS.regular,
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  ratingInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: RADIUS.md,
    width: 100,
    height: 60,
    textAlign: 'center',
    fontSize: 32,
    fontFamily: FONTS.bold,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: SPACING.md,
  },
  commentInput: {
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
    borderRadius: RADIUS.md,
    width: '100%',
    height: 100,
    padding: SPACING.md,
    fontSize: 16,
    fontFamily: FONTS.regular,
    textAlign: 'right',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  saveBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    width: '100%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
    fontSize: 16,
  },
  note: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
