import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { useTheme } from '../src/hooks/useTheme';
import AuthWrapper from '../src/components/auth/AuthWrapper';

// Initialize Firebase early - this ensures Firebase is ready before any components try to use it
import '../src/config/firebase';

// ThemedStack component that uses theme context
function ThemedStack() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <AuthWrapper>
        <Stack
          screenOptions={{
            headerShown: false, // Hide default headers as we have our custom header
            contentStyle: {
              backgroundColor: 'transparent', // AuthWrapper handles layout
            },
          }}
        >
          {/* Authentication screens */}
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          
          {/* Main app screens */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          
          {/* Security screen as modal */}
          <Stack.Screen
            name="security"
            options={{
              presentation: 'modal',
              headerShown: false,
            }}
          />
        </Stack>
      </AuthWrapper>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider initialTheme="dark">
      <ThemedStack />
    </ThemeProvider>
  );
}