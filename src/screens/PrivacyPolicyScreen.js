import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  StatusBar,
  DeviceEventEmitter,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, RADIUS } from '../theme';

// ─── Contact email — change this to update across the whole screen ────────────
const SUPPORT_EMAIL = 'ofir1519@gmail.com';

export default function PrivacyPolicyScreen() {
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

  const handleGoToTerms = () => {
    navigation.replace('TermsOfService', route.params || {});
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={handleBack}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>מדיניות פרטיות</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={styles.tabInactive} onPress={handleGoToTerms} activeOpacity={0.7}>
          <Text style={styles.tabInactiveText}>תנאי שימוש</Text>
        </TouchableOpacity>
        <View style={styles.tabActive}>
          <Text style={styles.tabActiveText}>מדיניות פרטיות</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.contentContainer, !isMobile && styles.desktopContainer]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>מדיניות פרטיות – RankEat (גרסת בטא)</Text>
        <Text style={styles.lastUpdate}>עדכון אחרון: יוני 2026</Text>

        {/* Section 1 */}
        <Text style={styles.sectionTitle}>1. איסוף מידע ונתוני שימוש</Text>
        <Text style={styles.paragraph}>
          בעת ההרשמה (לרבות דרך Google/Apple), אנו אוספים מידע בסיסי כגון שם, כתובת דוא&quot;ל ותמונת פרופיל. בנוסף, האפליקציה משתמשת בטכנולוגיות מעקב (כגון Cookies וכלים אנליטיים צד-שלישי) כדי לאסוף מידע טכני וסטטיסטי: כתובת IP, סוג מכשיר, דפדפן, זמני שימוש ונתוני אינטראקציה. השימוש בכלים אלו נועד לשיפור חוויית המשתמש, אבטחת המערכת וניתוח ביצועים. עצם השימוש באפליקציה מהווה הסכמה לשימוש בטכנולוגיות אלו.
        </Text>

        {/* Section 2 */}
        <Text style={styles.sectionTitle}>2. שימוש במידע</Text>
        <Text style={styles.paragraph}>
          המידע משמש למתן השירות, יצירת הפרופיל, הפעלת אלגוריתם הדירוג והצגת השם הפומבי לצד הביקורות. איננו מוכרים את המידע האישי שלך לצדדים שלישיים למטרות פרסום.
        </Text>

        {/* Section 3 */}
        <Text style={styles.sectionTitle}>3. העברת נתונים ואחסון בחו"ל</Text>
        <Text style={styles.paragraph}>
          המידע נשמר בצורה מאובטחת, אך עשוי להיות מאוחסן ולעבור עיבוד מחוץ לישראל באמצעות ספקי שירותי ענן (כגון Supabase) או שירותים טכנולוגיים אחרים המשמשים להפעלת האפליקציה.
        </Text>

        {/* Section 4 */}
        <Text style={styles.sectionTitle}>4. זכות להישכח ומחיקת חשבון</Text>
        <Text style={styles.paragraph}>
          משתמש רשאי לבקש את מחיקת חשבונו באמצעות פנייה לכתובת התמיכה. הנהלת האפליקציה תפעל למחיקת המידע האישי בתוך זמן סביר, בכפוף לחובות חוקיות ולצורך שמירת נתונים הדרושים להפעלת השירות ולהתגוננות מפני תביעות.
        </Text>
        <Text style={styles.contactBox}>
          {'לבקשות מחיקה: '}
          <Text style={styles.emailLink}>{SUPPORT_EMAIL}</Text>
        </Text>

        {/* Section 5 */}
        <Text style={styles.sectionTitle}>5. אבטחת מידע והגבלת גיל</Text>
        <Text style={styles.paragraph}>
          אנו משתמשים בסטנדרטים מקובלים בתעשייה לאבטחת נתונים, אך איננו יכולים להבטיח חסינות מוחלטת מפני פריצות. השימוש באפליקציה מותר אך ורק למשתמשים מעל גיל 16. בעצם ההרשמה, הנך מצהיר/ה כי גילך הוא 16 ומעלה. מערכת RankEat אינה אוספת ביודעין מידע מקטינים מתחת לגיל זה.
        </Text>

        {/* Section 6 */}
        <Text style={styles.sectionTitle}>6. יצירת קשר</Text>
        <Text style={styles.paragraph}>
          לפניות בנושאי פרטיות, מחיקת חשבון, זכויות יוצרים או דיווח על תוכן פוגעני, ניתן ליצור קשר בכתובת:
        </Text>
        <Text style={styles.contactBox}>
          <Text style={styles.emailLink}>{SUPPORT_EMAIL}</Text>
        </Text>

        <View style={{ height: 40 }} />
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
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface || '#161922',
    borderRadius: RADIUS.lg || 16,
    borderWidth: 1,
    borderColor: COLORS.border || '#252A38',
  },
  backIcon: {
    fontSize: 20,
    color: COLORS.textPrimary || '#F1F5F9',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.textPrimary || '#FFFFFF',
  },
  // ── Tab Switcher ───────────────────────────────────────────────────────────
  tabRow: {
    flexDirection: 'row-reverse',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border || '#252A38',
  },
  tabActive: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.accent || '#FF6B35',
  },
  tabActiveText: {
    fontFamily: FONTS.bold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  tabInactive: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  tabInactiveText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: COLORS.textSecondary || '#A0AEC0',
  },
  // ── Content ────────────────────────────────────────────────────────────────
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
    fontSize: 22,
    fontFamily: FONTS.bold,
    fontWeight: '800',
    color: COLORS.textPrimary || '#FFFFFF',
    marginBottom: SPACING.sm,
    textAlign: 'right',
  },
  lastUpdate: {
    fontSize: 13,
    color: COLORS.textSecondary || '#A0AEC0',
    marginBottom: SPACING.xl,
    textAlign: 'right',
    fontFamily: FONTS.regular,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    color: COLORS.accent || '#FF6B35',
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
    textAlign: 'right',
  },
  paragraph: {
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 24,
    marginBottom: SPACING.md,
    textAlign: 'right',
    fontFamily: FONTS.regular,
  },
  contactBox: {
    fontSize: 15,
    color: '#CBD5E1',
    lineHeight: 24,
    marginBottom: SPACING.md,
    textAlign: 'right',
    fontFamily: FONTS.regular,
    backgroundColor: 'rgba(255, 107, 53, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.2)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  emailLink: {
    color: COLORS.accent || '#FF6B35',
    fontFamily: FONTS.bold,
    textDecorationLine: 'underline',
  },
});
