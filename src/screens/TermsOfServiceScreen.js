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

  const handleGoToPrivacy = () => {
    navigation.replace('PrivacyPolicy', route.params || {});
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
        <Text style={styles.headerTitle}>תנאי שימוש</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={styles.tabInactive} onPress={handleGoToPrivacy} activeOpacity={0.7}>
          <Text style={styles.tabInactiveText}>מדיניות פרטיות</Text>
        </TouchableOpacity>
        <View style={styles.tabActive}>
          <Text style={styles.tabActiveText}>תנאי שימוש</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.contentContainer, !isMobile && styles.desktopContainer]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>תנאי שימוש – RankEat (גרסת בטא)</Text>
        <Text style={styles.lastUpdate}>עדכון אחרון: יוני 2026</Text>

        <Text style={styles.paragraph}>
          ברוכים הבאים לאפליקציית RankEat (להלן: "האפליקציה"). השימוש באפליקציה מותנה בהסכמתך לתנאים המפורטים להלן. בעצם ההרשמה והשימוש באפליקציה, הנך מצהיר/ה כי קראת, הבנת והסכמת לתנאים אלו.
        </Text>

        {/* Section 1 */}
        <Text style={styles.sectionTitle}>1. אופי השירות וגרסת בטא</Text>
        <Text style={styles.paragraph}>
          האפליקציה מספקת פלטפורמה לדירוג וביקורת של מנות ומסעדות. האפליקציה נמצאת כעת בשלב הרצה (Beta). השירות ניתן כמות שהוא ("AS IS"), וייתכנו בו תקלות, שינויים או הפסקות שירות ללא הודעה מוקדמת. ככל שהדבר מותר על פי דין, RankEat לא תישא באחריות לנזקים עקיפים, תוצאתיים או לאובדן רווחים הנובעים מהשימוש בשירות.
        </Text>

        {/* Section 2 */}
        <Text style={styles.sectionTitle}>2. העדר קשר מסחרי והגבלת אחריות על דירוגים</Text>
        <Text style={styles.paragraph}>
          RankEat היא פלטפורמה עצמאית. הדירוגים, הביקורות והציונים המופיעים באפליקציה משקפים את דעתם האישית של המשתמשים בלבד ואינם מהווים המלצה, חוות דעת מקצועית או קביעה עובדתית מצד RankEat. איננו מקושרים או נתמכים על ידי המסעדות, ושמות המותגים מוצגים לצורך תיאור ונוחות בלבד.
        </Text>

        {/* Section 3 */}
        <Text style={styles.sectionTitle}>3. תוכן גולשים, תמונות וביקורות</Text>
        <Text style={styles.paragraph}>
          המשתמש נושא באחריות הבלעדית לכל תוכן ותמונה שהוא מעלה.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>זכויות יוצרים: </Text>
          המשתמש מצהיר כי הוא בעל הזכויות בתמונות ובתכנים שהוא מעלה, או שיש בידו הרשאה מתאימה לפרסמם.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>תוכן אסור: </Text>
          חל איסור מוחלט להעלות תוכן שקרי, פוגעני, גזעני, המהווה לשון הרע, או מפר זכויות צד שלישי. הנהלת האפליקציה שומרת לעצמה את הזכות המלאה לערוך או להסיר כל תוכן מפר ללא הודעה מוקדמת.
        </Text>

        {/* Section 4 */}
        <Text style={styles.sectionTitle}>4. רישיון השימוש בתוכן המשתמש</Text>
        <Text style={styles.paragraph}>
          המשתמש שומר על מלוא זכויות הקניין הרוחני בתוכן שהעלה. עם זאת, בעצם העלאת התוכן, המשתמש מעניק ל-RankEat רישיון עולמי, לא בלעדי וללא תמלוגים להשתמש בתוכן (לרבות תמונות וביקורות) לצורך הפעלת השירות, הצגתו, שיווקו ושיפורו.
        </Text>

        {/* Section 5 */}
        <Text style={styles.sectionTitle}>5. נוהל דיווח והסרה (Notice and Takedown)</Text>
        <Text style={styles.paragraph}>
          אם גורם כלשהו סבור שתוכן מסוים מפר זכויות, מהווה לשון הרע או שקרי מובהק, ניתן לפנות אלינו לכתובת:
        </Text>
        <Text style={styles.contactBox}>
          {'📧 '}
          <Text style={styles.emailLink}>ofir1519@gmail.com</Text>
        </Text>
        <Text style={styles.paragraph}>
          אנו נבדוק כל פנייה ונפעל להסרת תוכן פוגעני בהתאם לחוק.
        </Text>

        {/* Section 6 */}
        <Text style={styles.sectionTitle}>6. השעיית חשבונות ואיסור על מניפולציות</Text>
        <Text style={styles.paragraph}>
          חל איסור מוחלט על שימוש באמצעים אוטומטיים, בינה מלאכותית, הפעלת בוטים, יצירת חשבונות מרובים או כל שיטה אחרת שנועדה להשפיע באופן מלאכותי ופיקטיבי על דירוגי המנות והמסעדות. מעבר לכך, הנהלת האפליקציה שומרת לעצמה את הזכות המלאה להשעות או לסגור כל חשבון משתמש, בכל עת ועל פי שיקול דעתה הבלעדי, ללא צורך בנימוק. סגירת חשבון לא תוביל בהכרח למחיקת התוכן שהמשתמש העלה, אלא אם התבקש אחרת בהתאם למדיניות הפרטיות.
        </Text>

        {/* Section 7 */}
        <Text style={styles.sectionTitle}>7. שיפוי</Text>
        <Text style={styles.paragraph}>
          המשתמש מתחייב לשפות את הנהלת האפליקציה בגין כל נזק, הפסד או הוצאה, לרבות שכר טרחת עורך דין והוצאות משפט, שייגרמו לה כתוצאה מתביעה של צד שלישי בגין תוכן שהמשתמש העלה בניגוד לתנאים אלו.
        </Text>

        {/* Section 8 */}
        <Text style={styles.sectionTitle}>8. שינוי התנאים</Text>
        <Text style={styles.paragraph}>
          RankEat רשאית לעדכן מעת לעת את תנאי השימוש ומדיניות הפרטיות. במקרה של שינויים מהותיים, תינתן התראה של לפחות 14 ימים מראש בתוך האפליקציה. המשך השימוש בשירות לאחר פרסום העדכון וכניסתו לתוקף ייחשב כהסכמה לתנאים המעודכנים.
        </Text>

        {/* Section 9 */}
        <Text style={styles.sectionTitle}>9. סמכות שיפוט</Text>
        <Text style={styles.paragraph}>
          על תנאי שימוש אלו יחולו דיני מדינת ישראל בלבד. סמכות השיפוט הבלעדית נתונה לבתי המשפט המוסמכים במחוז תל אביב.
        </Text>

        {/* Privacy Policy link */}
        <TouchableOpacity style={styles.privacyBanner} onPress={handleGoToPrivacy} activeOpacity={0.8}>
          <Text style={styles.privacyBannerText}>
            לקריאת מדיניות הפרטיות שלנו ←
          </Text>
        </TouchableOpacity>

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
    alignSelf: 'flex-start',
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
    fontFamily: FONTS.regular,
    color: COLORS.textSecondary || '#A0AEC0',
    marginBottom: SPACING.xl,
    textAlign: 'right',
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
  bold: {
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: FONTS.bold,
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
  privacyBanner: {
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.accent || '#FF6B35',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.06)',
  },
  privacyBannerText: {
    color: COLORS.accent || '#FF6B35',
    fontFamily: FONTS.bold,
    fontSize: 15,
  },
});
