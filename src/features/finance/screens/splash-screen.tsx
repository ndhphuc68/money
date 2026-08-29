import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';

import type { Translate } from '@/i18n/translations';
import { colors, spacing, typography } from '@/theme';

type SplashScreenProps = {
  t: Translate;
};

export function SplashScreen({ t }: SplashScreenProps) {
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);
  const loaderProgress = useRef(new Animated.Value(0)).current;
  const logoProgress = useRef(new Animated.Value(0)).current;
  const textProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion !== false) {
      return;
    }

    loaderProgress.setValue(0);
    logoProgress.setValue(0);
    textProgress.setValue(0);

    const animation = Animated.parallel([
      Animated.timing(logoProgress, {
        duration: 620,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(textProgress, {
        delay: 120,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(loaderProgress, {
            duration: 625,
            easing: Easing.inOut(Easing.cubic),
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.timing(loaderProgress, {
            duration: 625,
            easing: Easing.inOut(Easing.cubic),
            toValue: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    ]);

    animation.start();
    return () => animation.stop();
  }, [loaderProgress, logoProgress, reduceMotion, textProgress]);

  const logoAnimatedStyle =
    reduceMotion === false
      ? {
          opacity: logoProgress,
          transform: [
            { translateY: logoProgress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
            { scale: logoProgress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
          ],
        }
      : null;
  const textAnimatedStyle =
    reduceMotion === false
      ? {
          opacity: textProgress,
          transform: [
            { translateY: textProgress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) },
          ],
        }
      : null;
  const loaderAnimatedStyle =
    reduceMotion === false
      ? {
          transform: [
            {
              translateX: loaderProgress.interpolate({
                inputRange: [0, 1],
                outputRange: [-52, 122],
              }),
            },
          ],
        }
      : null;

  return (
    <View style={styles.container} testID="splash-root">
      <View style={styles.brand}>
        <Animated.View style={logoAnimatedStyle}>
          <Image
            accessibilityLabel={t('appTitle')}
            resizeMode="contain"
            source={require('../../../../assets/branding/vimo-icon.png')}
            style={styles.logo}
            testID="splash-logo"
          />
        </Animated.View>
        <Animated.View style={[styles.copyGroup, textAnimatedStyle]} testID="splash-copy-group">
          <Text style={styles.appName}>{t('appTitle')}</Text>
          <Text style={styles.tagline}>{t('splashTagline')}</Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View
          accessibilityLabel={t('splashLoading')}
          style={styles.loaderTrack}
          testID="splash-loader">
          <Animated.View style={[styles.loaderValue, loaderAnimatedStyle]}>
            <View style={styles.loaderValuePrimary} />
            <View style={styles.loaderValueAccent} />
          </Animated.View>
        </View>
        <Text style={styles.loadingText}>{t('splashLoading')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  appName: {
    color: colors.content.primary,
    fontSize: 32,
    fontWeight: typography.weights.black,
    lineHeight: 36,
    marginBottom: spacing[2],
  },
  brand: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    transform: [{ translateY: -8 }],
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: spacing[7],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[7],
  },
  footer: {
    alignItems: 'center',
    gap: spacing[4],
  },
  copyGroup: {
    alignItems: 'center',
    width: '100%',
  },
  loaderTrack: {
    backgroundColor: colors.border.strong,
    borderRadius: 999,
    height: 5,
    overflow: 'hidden',
    width: 116,
  },
  loaderValue: {
    borderRadius: 999,
    flexDirection: 'row',
    height: '100%',
    overflow: 'hidden',
    width: 46,
  },
  loaderValueAccent: {
    backgroundColor: colors.category.transport,
    flex: 1,
  },
  loaderValuePrimary: {
    backgroundColor: colors.brand.primary,
    flex: 1,
  },
  loadingText: {
    color: colors.content.muted2,
    fontSize: typography.sizes.small,
    fontWeight: typography.weights.black,
    letterSpacing: 0.8,
    lineHeight: typography.lineHeights.small,
    minHeight: 20,
    textTransform: 'uppercase',
  },
  logo: {
    height: 150,
    marginBottom: spacing[5],
    width: 150,
  },
  tagline: {
    color: colors.content.secondary,
    fontSize: 15,
    fontWeight: typography.weights.bold,
    lineHeight: 23,
    maxWidth: 250,
    textAlign: 'center',
  },
});
