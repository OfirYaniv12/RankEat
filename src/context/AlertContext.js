import React, { createContext, useContext, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState(null);
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const showAlert = ({ title, message, type = 'info', primaryButtonText = 'הבנתי', onConfirm }) => {
    setAlertConfig({
      type, // 'info', 'success', 'warning', 'error'
      title,
      message,
      primaryButtonText,
      secondaryButtonText: null,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setAlertConfig(null);
      },
      onCancel: null,
    });
  };

  const showConfirm = ({ title, message, type = 'warning', primaryButtonText = 'אישור', secondaryButtonText = 'ביטול', onConfirm, onCancel }) => {
    setAlertConfig({
      type,
      title,
      message,
      primaryButtonText,
      secondaryButtonText,
      onConfirm: () => {
        if (onConfirm) onConfirm();
        setAlertConfig(null);
      },
      onCancel: () => {
        if (onCancel) onCancel();
        setAlertConfig(null);
      },
    });
  };

  const getIconName = (type) => {
    switch (type) {
      case 'error': return 'error-outline';
      case 'warning': return 'warning-amber';
      case 'success': return 'check-circle-outline';
      case 'info':
      default: return 'info-outline';
    }
  };

  const getIconColor = (type) => {
    switch (type) {
      case 'error': return COLORS.danger || '#FF3B30';
      case 'warning': return COLORS.warning || '#FF9500';
      case 'success': return COLORS.success || '#34C759';
      case 'info':
      default: return COLORS.accent;
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {alertConfig && (
        <Modal transparent animationType="fade" visible={!!alertConfig} onRequestClose={() => alertConfig.onCancel ? alertConfig.onCancel() : alertConfig.onConfirm()}>
          <View style={styles.overlay}>
            <View style={[
              styles.modalBox, 
              isMobile && styles.modalBoxMobile,
              { borderColor: getIconColor(alertConfig.type) + '4D', shadowColor: getIconColor(alertConfig.type) }
            ]}>
              <View style={[styles.iconContainer, { backgroundColor: getIconColor(alertConfig.type) + '15' }]}>
                <MaterialIcons name={getIconName(alertConfig.type)} size={32} color={getIconColor(alertConfig.type)} />
              </View>
              
              <Text style={styles.title}>{alertConfig.title}</Text>
              {alertConfig.message && <Text style={styles.message}>{alertConfig.message}</Text>}

              <View style={styles.buttonRow}>
                {alertConfig.secondaryButtonText && (
                  <TouchableOpacity style={styles.secondaryButton} onPress={alertConfig.onCancel} activeOpacity={0.8}>
                    <Text style={styles.secondaryButtonText}>{alertConfig.secondaryButtonText}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.primaryButton, { backgroundColor: getIconColor(alertConfig.type) }]} 
                  onPress={alertConfig.onConfirm} 
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>{alertConfig.primaryButtonText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { 
    backgroundColor: '#1E1E24', 
    width: 400, 
    padding: 32, 
    borderRadius: 20, 
    alignItems: 'center', 
    shadowOpacity: 0.2, 
    shadowRadius: 16, 
    shadowOffset: { width: 0, height: 4 }, 
    borderWidth: 1, 
  },
  modalBoxMobile: { width: '85%' },
  iconContainer: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontFamily: FONTS.bold, color: '#FFFFFF', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 14, fontFamily: FONTS.regular, color: '#A0A0A5', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  buttonRow: { flexDirection: 'row-reverse', width: '100%', justifyContent: 'center', gap: 12 },
  primaryButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontFamily: FONTS.bold },
  secondaryButton: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: '#2D3748' },
  secondaryButtonText: { color: '#E2E8F0', fontSize: 16, fontFamily: FONTS.bold }
});
