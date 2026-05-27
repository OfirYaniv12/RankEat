import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, useWindowDimensions, StatusBar, DeviceEventEmitter } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function TermsOfServiceScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const handleBack = () => {
    navigation.goBack();
    if (route.params?.fromSignUp) {
      DeviceEventEmitter.emit('openSignUp');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn} 
          onPress={handleBack} 
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>תנאי שימוש</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.contentContainer, !isMobile && styles.desktopContainer]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>תנאי שימוש – RankEat (גרסת בטא)</Text>
        <Text style={styles.lastUpdate}>עדכון אחרון: מאי 2026</Text>

        <Text style={styles.paragraph}>
          ברוכים הבאים לאפליקציית RankEat (להלן: "האפליקציה"). השימוש באפליקציה מותנה בהסכמתך לתנאים המפורטים להלן. בעצם ההרשמה והשימוש באפליקציה, הנך מצהיר/ה כי קראת, הבנת והסכמת לתנאים אלו.
        </Text>

        <Text style={styles.sectionTitle}>1. אופי השירות וגרסת בטא</Text>
        <Text style={styles.paragraph}>
          האפליקציה מספקת פלטפורמה לדירוג וביקורת של מנות ומסעדות. האפליקציה נמצאת כעת בשלב הרצה (Beta). השירות ניתן כמות שהוא ("AS IS"), וייתכנו בו תקלות, שינויים או הפסקות שירות ללא הודעה מוקדמת. הנהלת האפליקציה אינה נושאת באחריות לכל נזק, ישיר או עקיף, שייגרם כתוצאה משימוש באפליקציה.
        </Text>

        <Text style={styles.sectionTitle}>2. תוכן גולשים וביקורות (User Generated Content)</Text>
        <Text style={styles.paragraph}>
          האפליקציה מאפשרת למשתמשים להעלות דירוגים, ביקורות וטקסט חופשי (להלן: "תוכן גולשים").
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>אחריות בלעדית:</Text> המשתמש נושא באחריות הבלעדית והמלאה לכל תוכן שהוא מעלה. הנהלת האפליקציה משמשת כפלטפורמה טכנולוגית בלבד ואינה אחראית לאמיתות, דיוק או חוקיות התוכן המועלה על ידי המשתמשים.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>תוכן אסור:</Text> חל איסור מוחלט להעלות תוכן שקרי, פוגעני, גזעני, מאיים, המהווה לשון הרע (הוצאת דיבה), או שמפר זכויות יוצרים של צד שלישי.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>זכות הסרה:</Text> הנהלת האפליקציה שומרת לעצמה את הזכות המלאה (אך לא את החובה) לערוך, למחוק או להסיר כל תוכן שיימצא לנכון כי הוא מפר תנאים אלו, ללא צורך בהודעה מוקדמת.
        </Text>

        <Text style={styles.sectionTitle}>3. שימוש בתוכן (קניין רוחני)</Text>
        <Text style={styles.paragraph}>
          בעצם העלאת ביקורת או דירוג לאפליקציה, המשתמש מעניק להנהלת RankEat רישיון חינמי, בלתי חוזר וכלל-עולמי להשתמש, להציג, לשכפל ולהפיץ את התוכן בתוך האפליקציה ובאמצעי השיווק שלה.
        </Text>

        <Text style={styles.sectionTitle}>4. חסימת משתמשים</Text>
        <Text style={styles.paragraph}>
          אנו שואפים לשמור על קהילה אמינה. הנהלת האפליקציה שומרת לעצמה את הזכות להשעות או לחסום לצמיתות, על פי שיקול דעתה הבלעדי, כל משתמש שיפר תנאים אלו, יפעיל בוטים, ייצר ביקורות פיקטיביות או ינסה לחבל באלגוריתם הדירוג של האפליקציה.
        </Text>

        <Text style={styles.sectionTitle}>5. סמכות שיפוט</Text>
        <Text style={styles.paragraph}>
          על תנאי שימוש אלו יחולו דיני מדינת ישראל בלבד. סמכות השיפוט הבלעדית בכל סכסוך הנוגע לאפליקציה תהיה נתונה לבתי המשפט המוסמכים במחוז תל אביב.
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background || '#0D0F14',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl + 60,
    paddingBottom: SPACING.md,
    width: '100%',
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface || '#161922',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border || '#252A38',
  },
  backIcon: {
    fontSize: 20,
    color: COLORS.textPrimary || '#F1F5F9',
  },
  headerTitle: {
    fontSize: FONTS.h3,
    fontWeight: '700',
    color: COLORS.textPrimary || '#FFFFFF',
  },
  contentContainer: {
    padding: SPACING.xl,
    paddingBottom: 80,
  },
  desktopContainer: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary || '#FFFFFF',
    marginBottom: SPACING.sm,
    textAlign: 'right',
  },
  lastUpdate: {
    fontSize: FONTS.small,
    color: COLORS.textSecondary || '#A0AEC0',
    marginBottom: SPACING.xl,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.accent || '#FF6B35',
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    textAlign: 'right',
  },
  paragraph: {
    fontSize: 16,
    color: '#CBD5E1',
    lineHeight: 24,
    marginBottom: SPACING.md,
    textAlign: 'right',
  },
  bold: {
    fontWeight: '700',
    color: '#FFFFFF',
  }
});
