import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/theme/ThemeProvider';

export default function AuthLayout() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor="transparent" translucent />
      <Stack
        screenOptions={{
          headerShown: false,
          presentation: 'card',
          animationTypeForReplace: 'push',
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="login"
          options={{
            title: 'Sign In',
          }}
        />
        <Stack.Screen
          name="signup"
          options={{
            title: 'Create Account',
          }}
        />
        <Stack.Screen
          name="verify-otp"
          options={{
            title: 'Verify OTP',
          }}
        />
        <Stack.Screen
          name="verify-phone-link"
          options={{
            title: 'Verify Phone',
            gestureEnabled: false, // Prevent back swipe
          }}
        />
        <Stack.Screen
          name="onboarding-profile"
          options={{
            title: 'Complete Profile',
            gestureEnabled: false, // Prevent back swipe during onboarding
          }}
        />
        <Stack.Screen
          name="phone-login"
          options={{
            title: 'Phone Sign In',
          }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{
            title: 'Forgot Password',
          }}
        />
      </Stack>
    </>
  );
}