import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, runOnJS } from "react-native-reanimated";
import * as Notifications from "expo-notifications";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/query-client";
import { AppProvider } from "@/context/AppContext";
import { DrawerProvider } from "@/context/DrawerContext";
import AppDrawer from "@/components/AppDrawer";
import Colors from "@/theme/colors";
import { setupNotificationChannel, configureNotificationHandler } from "@/lib/notifications";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false, headerBackTitle: "Back" }}>
      <Stack.Screen name="(auth)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
      <Stack.Screen name="details/[id]" />
      <Stack.Screen name="progress/[id]" />
      <Stack.Screen name="random-picker" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="watch-together" />
      <Stack.Screen name="swipe" />
      <Stack.Screen name="swipe-summary" />
      <Stack.Screen name="my-qr-code" />
      <Stack.Screen name="qr-scanner" />
    </Stack>
  );
}

function AppSplash({ onFinish }: { onFinish: () => void }) {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.85);

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 600 });
    logoScale.value = withTiming(1, { duration: 600 });

    const timeout = setTimeout(() => {
      logoOpacity.value = withDelay(0, withTiming(0, { duration: 400 }, () => {
        runOnJS(onFinish)();
      }));
      logoScale.value = withTiming(1.05, { duration: 400 });
    }, 2500);

    return () => clearTimeout(timeout);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  return (
    <View style={splashStyles.container}>
      <Animated.View style={animatedStyle}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={splashStyles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 200,
    height: 200,
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  const [showSplash, setShowSplash] = useState(true);

  // Ref to store the notification response listener so it can be cleaned up
  const notificationResponseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  useEffect(() => {
    // Set up the Android notification channel and foreground display behaviour
    setupNotificationChannel();
    configureNotificationHandler();

    // Listen for notification taps — fires when the user taps a notification
    // while the app is in the background or closed
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        // Future: navigate to a specific screen based on notification data
        // e.g. const { type, mediaId } = response.notification.request.content.data;
        // if (type === 'new_item_reminder' && mediaId) router.push(`/details/${mediaId}`);
      }
    );

    return () => {
      // Clean up the listener when the root layout unmounts
      notificationResponseListener.current?.remove();
    };
  }, []);

  if (!fontsLoaded) return null;

  if (showSplash) {
    return <AppSplash onFinish={() => setShowSplash(false)} />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardProvider>
            <AppProvider>
              <DrawerProvider>
                <RootLayoutNav />
                <AppDrawer />
              </DrawerProvider>
            </AppProvider>
          </KeyboardProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
