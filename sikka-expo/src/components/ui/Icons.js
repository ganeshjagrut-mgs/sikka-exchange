import { Platform } from 'react-native';

// Platform-specific icon imports using static imports
let icons;

try {
  if (Platform.OS === 'web') {
    // Use lucide-react for web
    const lucideReact = require('lucide-react');
    icons = {
      Menu: lucideReact.Menu,
      Bell: lucideReact.Bell,
      Search: lucideReact.Search,
      TrendingUp: lucideReact.TrendingUp,
      TrendingDown: lucideReact.TrendingDown,
      ArrowUpRight: lucideReact.ArrowUpRight,
      ArrowDownRight: lucideReact.ArrowDownRight,
      ArrowRightLeft: lucideReact.ArrowRightLeft,
      Clock: lucideReact.Clock,
      CheckCircle: lucideReact.CheckCircle,
      Sun: lucideReact.Sun,
      Moon: lucideReact.Moon,
      Home: lucideReact.Home,
      Wallet: lucideReact.Wallet,
      User: lucideReact.User,
      Shield: lucideReact.Shield,
      X: lucideReact.X,
      BarChart3: lucideReact.BarChart3,
      Settings: lucideReact.Settings,
      HelpCircle: lucideReact.HelpCircle,
      LogOut: lucideReact.LogOut,
      Eye: lucideReact.Eye,
      EyeOff: lucideReact.EyeOff,
      DollarSign: lucideReact.DollarSign,
      Plus: lucideReact.Plus,
      Minus: lucideReact.Minus,
    };
  } else {
    // Use lucide-react-native for mobile
    const lucideReactNative = require('lucide-react-native');
    icons = {
      Menu: lucideReactNative.Menu,
      Bell: lucideReactNative.Bell,
      Search: lucideReactNative.Search,
      TrendingUp: lucideReactNative.TrendingUp,
      TrendingDown: lucideReactNative.TrendingDown,
      ArrowUpRight: lucideReactNative.ArrowUpRight,
      ArrowDownRight: lucideReactNative.ArrowDownRight,
      ArrowRightLeft: lucideReactNative.ArrowRightLeft,
      Clock: lucideReactNative.Clock,
      CheckCircle: lucideReactNative.CheckCircle,
      Sun: lucideReactNative.Sun,
      Moon: lucideReactNative.Moon,
      Home: lucideReactNative.Home,
      Wallet: lucideReactNative.Wallet,
      User: lucideReactNative.User,
      Shield: lucideReactNative.Shield,
      X: lucideReactNative.X,
      BarChart3: lucideReactNative.BarChart3,
      Settings: lucideReactNative.Settings,
      HelpCircle: lucideReactNative.HelpCircle,
      LogOut: lucideReactNative.LogOut,
      Eye: lucideReactNative.Eye,
      EyeOff: lucideReactNative.EyeOff,
      DollarSign: lucideReactNative.DollarSign,
      Plus: lucideReactNative.Plus,
      Minus: lucideReactNative.Minus,
    };
  }
} catch (error) {
  console.warn('Failed to load lucide icons, using fallbacks');
  // Create fallback components
  const FallbackIcon = () => null;
  icons = {
    Menu: FallbackIcon,
    Bell: FallbackIcon,
    Search: FallbackIcon,
    TrendingUp: FallbackIcon,
    TrendingDown: FallbackIcon,
    ArrowUpRight: FallbackIcon,
    ArrowDownRight: FallbackIcon,
    ArrowRightLeft: FallbackIcon,
    Clock: FallbackIcon,
    CheckCircle: FallbackIcon,
    Sun: FallbackIcon,
    Moon: FallbackIcon,
    Home: FallbackIcon,
    Wallet: FallbackIcon,
    User: FallbackIcon,
    Shield: FallbackIcon,
    X: FallbackIcon,
    BarChart3: FallbackIcon,
    Settings: FallbackIcon,
    HelpCircle: FallbackIcon,
    LogOut: FallbackIcon,
    Eye: FallbackIcon,
    EyeOff: FallbackIcon,
    DollarSign: FallbackIcon,
    Plus: FallbackIcon,
    Minus: FallbackIcon,
  };
}

export const {
  Menu,
  Bell,
  Search,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Clock,
  CheckCircle,
  Sun,
  Moon,
  Home,
  Wallet,
  User,
  Shield,
  X,
  BarChart3,
  Settings,
  HelpCircle,
  LogOut,
  Eye,
  EyeOff,
  DollarSign,
  Plus,
  Minus,
} = icons;