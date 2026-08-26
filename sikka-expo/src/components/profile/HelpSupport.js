import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useBreakpoints } from '../../hooks/useBreakpoints';
import GlassContainer from '../ui/GlassContainer';
import Input from '../ui/Input';
import { 
  HelpCircle, 
  MessageCircle, 
  Mail, 
  Phone,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Users,
  Bug,
  Lightbulb,
  Shield,
  DollarSign,
  CreditCard,
  TrendingUp,
  Download,
  Globe,
} from 'lucide-react-native';

/**
 * HelpSupport Component
 * 
 * Comprehensive help and support center
 * Features:
 * - Categorized FAQ with expandable sections
 * - Search functionality for quick help
 * - Multiple contact options (chat, email, phone)
 * - Quick access to documentation and guides
 * - Community links and resources
 * - Bug reporting and feature requests
 * - App version and legal information
 * - Responsive design with professional UI
 */
export default function HelpSupport() {
  const { colors, typography } = useTheme();
  const { isMobile, isTablet } = useBreakpoints();

  // State for FAQ expansion and search
  const [expandedFAQ, setExpandedFAQ] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // FAQ Data organized by categories
  const faqCategories = [
    {
      id: 'account',
      title: 'Account & Verification',
      icon: Shield,
      color: colors.primary,
      questions: [
        {
          id: 'account-1',
          question: 'How do I complete KYC verification?',
          answer: 'To complete KYC verification:\n1. Go to Profile > Personal Info\n2. Upload a clear photo of your government ID\n3. Take a selfie for identity verification\n4. Verification typically completes within 24-48 hours\n5. You\'ll receive an email confirmation once approved'
        },
        {
          id: 'account-2',
          question: 'How do I enable Two-Factor Authentication?',
          answer: 'Enable 2FA for enhanced security:\n1. Go to Profile > Security\n2. Toggle "Two-Factor Authentication"\n3. Install Google Authenticator or similar app\n4. Scan the QR code provided\n5. Enter the verification code to complete setup'
        },
        {
          id: 'account-3',
          question: 'I forgot my password. How do I reset it?',
          answer: 'To reset your password:\n1. Go to the login screen\n2. Tap "Forgot Password"\n3. Enter your registered email address\n4. Check your email for reset instructions\n5. Create a new strong password\n6. Your account will be secured immediately'
        }
      ]
    },
    {
      id: 'trading',
      title: 'Trading & Orders',
      icon: TrendingUp,
      color: colors.success,
      questions: [
        {
          id: 'trading-1',
          question: 'What are the different order types?',
          answer: 'Sikkaa Exchange supports multiple order types:\n\n• Market Orders: Buy/sell immediately at current market price\n• Limit Orders: Buy/sell at specific price or better\n• Stop-Loss Orders: Automatically sell when price drops to limit losses\n• Take-Profit Orders: Automatically sell when target profit is reached\n• OCO Orders: One-Cancels-Other for advanced strategies'
        },
        {
          id: 'trading-2',
          question: 'What are the trading fees?',
          answer: 'Our competitive fee structure:\n\n• Spot Trading: 0.1% maker, 0.15% taker\n• VIP Tier 1: 0.08% maker, 0.12% taker\n• VIP Tier 2: 0.06% maker, 0.10% taker\n• INR Deposits: Free\n• INR Withdrawals: ₹10 per transaction\n• Crypto Withdrawals: Network fees apply'
        },
        {
          id: 'trading-3',
          question: 'What is the minimum order amount?',
          answer: 'Minimum order requirements:\n\n• Bitcoin (BTC): ₹100\n• Ethereum (ETH): ₹100\n• Other Cryptocurrencies: ₹50\n• INR equivalent values apply\n• No maximum order limits\n• Higher amounts may require additional verification'
        }
      ]
    },
    {
      id: 'wallet',
      title: 'Wallet & Deposits',
      icon: CreditCard,
      color: colors.warning,
      questions: [
        {
          id: 'wallet-1',
          question: 'How do I deposit INR to my wallet?',
          answer: 'Deposit INR using multiple methods:\n\n• UPI: Instant deposits, ₹1000 minimum\n• Bank Transfer: IMPS/NEFT, usually within 30 minutes\n• Net Banking: All major banks supported\n• Cards: Visa/Mastercard accepted\n• Wallet: Paytm, PhonePe, GooglePay supported\n\nAll deposits are processed securely with bank-level encryption.'
        },
        {
          id: 'wallet-2',
          question: 'How long do withdrawals take?',
          answer: 'Withdrawal processing times:\n\n• INR Withdrawals:\n  - UPI: Instant to 30 minutes\n  - Bank Transfer: 30 minutes to 2 hours\n  - Working hours: 9 AM to 9 PM\n\n• Crypto Withdrawals:\n  - Bitcoin: 30-60 minutes (3 confirmations)\n  - Ethereum: 5-15 minutes (12 confirmations)\n  - Other coins: Varies by network congestion'
        },
        {
          id: 'wallet-3',
          question: 'Are my funds safe and insured?',
          answer: 'Your fund security is our priority:\n\n• 95% of funds stored in cold storage\n• Multi-signature wallet architecture\n• Insurance coverage up to ₹5 crores\n• Regular security audits by top firms\n• Compliance with RBI guidelines\n• 24/7 security monitoring\n• Your INR is held in escrow with partner banks'
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Issues',
      icon: Bug,
      color: colors.error,
      questions: [
        {
          id: 'tech-1',
          question: 'The app is not loading properly. What should I do?',
          answer: 'Try these troubleshooting steps:\n\n1. Check your internet connection\n2. Close and restart the app\n3. Clear app cache (Android: Settings > Apps > Sikkaa > Storage)\n4. Update to the latest app version\n5. Restart your device\n6. Reinstall the app if issues persist\n\nIf problems continue, contact our support team.'
        },
        {
          id: 'tech-2',
          question: 'I\'m having trouble with face verification',
          answer: 'Face verification tips:\n\n• Ensure good lighting conditions\n• Remove glasses, masks, or hats\n• Keep your face centered in the frame\n• Don\'t move during the scan\n• Use the front camera\n• Try in a different location\n• Ensure camera permissions are granted\n\nStill having issues? Use document verification instead.'
        }
      ]
    }
  ];

  // Contact options
  const contactOptions = [
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Get instant help from our support team',
      icon: MessageCircle,
      action: () => Alert.alert('Live Chat', 'Live chat feature will open soon. Currently available in the web version.'),
      color: colors.success,
      availability: '24/7 Support'
    },
    {
      id: 'email',
      title: 'Email Support',
      description: 'Send us detailed queries and feedback',
      icon: Mail,
      action: () => Linking.openURL('mailto:support@sikkaa.exchange?subject=Sikkaa Exchange Support Request'),
      color: colors.primary,
      availability: 'Response within 4 hours'
    },
    {
      id: 'phone',
      title: 'Phone Support',
      description: 'Speak directly with our experts',
      icon: Phone,
      action: () => Linking.openURL('tel:+918800123456'),
      color: colors.warning,
      availability: '9 AM - 9 PM IST'
    }
  ];

  // Quick links
  const quickLinks = [
    {
      title: 'User Guide',
      icon: BookOpen,
      url: 'https://sikka.exchange/guide',
      description: 'Complete guide for beginners'
    },
    {
      title: 'Trading Guide',
      icon: TrendingUp,
      url: 'https://sikka.exchange/trading-guide',
      description: 'Advanced trading strategies'
    },
    {
      title: 'API Documentation',
      icon: Download,
      url: 'https://api.sikka.exchange/docs',
      description: 'For developers and traders'
    },
    {
      title: 'Community Forum',
      icon: Users,
      url: 'https://community.sikka.exchange',
      description: 'Connect with other traders'
    }
  ];

  // Responsive styling
  const getResponsiveStyles = () => {
    if (isMobile) {
      return {
        padding: 16,
        fontSize: {
          title: 20,
          subtitle: 14,
          label: 14,
          body: 14,
        },
        spacing: 12,
      };
    } else if (isTablet) {
      return {
        padding: 20,
        fontSize: {
          title: 24,
          subtitle: 16,
          label: 16,
          body: 16,
        },
        spacing: 16,
      };
    } else {
      return {
        padding: 24,
        fontSize: {
          title: 28,
          subtitle: 18,
          label: 18,
          body: 18,
        },
        spacing: 20,
      };
    }
  };

  const responsive = getResponsiveStyles();

  // Toggle FAQ expansion
  const toggleFAQ = (questionId) => {
    setExpandedFAQ(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // Filter FAQs based on search
  const filterFAQs = (questions) => {
    if (!searchQuery.trim()) return questions;
    return questions.filter(q => 
      q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.answer.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // FAQ Question Component
  const FAQQuestion = ({ question, isExpanded, onToggle }) => (
    <TouchableOpacity
      style={[styles.faqQuestion, { backgroundColor: colors.surfaceVariant + '20' }]}
      onPress={onToggle}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <Text style={[
          styles.faqQuestionText,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.fontSize.label,
            flex: 1,
          }
        ]}>
          {question.question}
        </Text>
        {isExpanded ? (
          <ChevronUp size={20} color={colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={colors.textSecondary} />
        )}
      </View>
      
      {isExpanded && (
        <View style={[styles.faqAnswer, { borderTopColor: colors.border + '30' }]}>
          <Text style={[
            styles.faqAnswerText,
            {
              color: colors.textSecondary,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.fontSize.body,
              lineHeight: responsive.fontSize.body * 1.5,
            }
          ]}>
            {question.answer}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Contact Option Component
  const ContactOption = ({ option }) => (
    <TouchableOpacity
      style={[styles.contactOption, { backgroundColor: option.color + '10' }]}
      onPress={option.action}
      activeOpacity={0.7}
    >
      <View style={[styles.contactIconContainer, { backgroundColor: option.color + '20' }]}>
        <option.icon size={28} color={option.color} strokeWidth={1.5} />
      </View>
      <View style={styles.contactInfo}>
        <Text style={[
          styles.contactTitle,
          {
            color: colors.text,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.fontSize.label,
          }
        ]}>
          {option.title}
        </Text>
        <Text style={[
          styles.contactDescription,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.fontSize.body - 2,
          }
        ]}>
          {option.description}
        </Text>
        <Text style={[
          styles.contactAvailability,
          {
            color: option.color,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.fontSize.body - 2,
          }
        ]}>
          {option.availability}
        </Text>
      </View>
      <ExternalLink size={20} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* Search Bar */}
      <GlassContainer style={[styles.searchSection, { padding: responsive.padding, marginBottom: responsive.spacing }]}>
        <Input
          placeholder="Search for help..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
          leftIcon={<Search size={20} color={colors.textSecondary} />}
        />
      </GlassContainer>

      {/* Contact Support */}
      <GlassContainer style={[styles.section, { padding: responsive.padding, marginBottom: responsive.spacing }]}>
        <View style={styles.sectionHeader}>
          <MessageCircle size={24} color={colors.success} strokeWidth={1.5} />
          <Text style={[
            styles.sectionTitle,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.fontSize.title,
            }
          ]}>
            Contact Support
          </Text>
        </View>

        {contactOptions.map(option => (
          <ContactOption key={option.id} option={option} />
        ))}
      </GlassContainer>

      {/* FAQ Categories */}
      {faqCategories.map(category => {
        const filteredQuestions = filterFAQs(category.questions);
        if (searchQuery && filteredQuestions.length === 0) return null;

        return (
          <GlassContainer key={category.id} style={[styles.section, { padding: responsive.padding, marginBottom: responsive.spacing }]}>
            <View style={styles.sectionHeader}>
              <category.icon size={24} color={category.color} strokeWidth={1.5} />
              <Text style={[
                styles.sectionTitle,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.fontSize.title,
                }
              ]}>
                {category.title}
              </Text>
            </View>

            {filteredQuestions.map(question => (
              <FAQQuestion
                key={question.id}
                question={question}
                isExpanded={expandedFAQ[question.id]}
                onToggle={() => toggleFAQ(question.id)}
              />
            ))}
          </GlassContainer>
        );
      })}

      {/* Quick Links */}
      <GlassContainer style={[styles.section, { padding: responsive.padding, marginBottom: responsive.spacing }]}>
        <View style={styles.sectionHeader}>
          <Globe size={24} color={colors.info} strokeWidth={1.5} />
          <Text style={[
            styles.sectionTitle,
            {
              color: colors.text,
              fontFamily: typography.fontFamily?.primary,
              fontSize: responsive.fontSize.title,
            }
          ]}>
            Resources & Guides
          </Text>
        </View>

        {quickLinks.map((link, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.quickLink, { backgroundColor: colors.surfaceVariant + '20' }]}
            onPress={() => Linking.openURL(link.url)}
            activeOpacity={0.7}
          >
            <View style={[styles.quickLinkIconContainer, { backgroundColor: colors.info + '20' }]}>
              <link.icon size={20} color={colors.info} strokeWidth={1.5} />
            </View>
            <View style={styles.quickLinkInfo}>
              <Text style={[
                styles.quickLinkTitle,
                {
                  color: colors.text,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.fontSize.label,
                }
              ]}>
                {link.title}
              </Text>
              <Text style={[
                styles.quickLinkDescription,
                {
                  color: colors.textSecondary,
                  fontFamily: typography.fontFamily?.primary,
                  fontSize: responsive.fontSize.body - 2,
                }
              ]}>
                {link.description}
              </Text>
            </View>
            <ExternalLink size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </GlassContainer>

      {/* App Version Info */}
      <GlassContainer style={[styles.section, { padding: responsive.padding }]}>
        <Text style={[
          styles.versionInfo,
          {
            color: colors.textSecondary,
            fontFamily: typography.fontFamily?.primary,
            fontSize: responsive.fontSize.body - 2,
            textAlign: 'center',
          }
        ]}>
          Sikkaa Exchange v1.0.0{'\n'}
          © 2024 Sikkaa Technologies. All rights reserved.
        </Text>
      </GlassContainer>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    borderRadius: 16,
  },
  searchInput: {
    borderRadius: 12,
  },
  section: {
    borderRadius: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginLeft: 8,
  },
  contactOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  contactIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  contactDescription: {
    opacity: 0.8,
    marginBottom: 4,
  },
  contactAvailability: {
    fontWeight: '500',
    fontSize: 12,
  },
  faqQuestion: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  faqQuestionText: {
    fontWeight: '500',
    marginRight: 12,
  },
  faqAnswer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  faqAnswerText: {
    opacity: 0.9,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  quickLinkIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  quickLinkInfo: {
    flex: 1,
  },
  quickLinkTitle: {
    fontWeight: '500',
    marginBottom: 2,
  },
  quickLinkDescription: {
    opacity: 0.8,
    fontSize: 12,
  },
  versionInfo: {
    opacity: 0.6,
    lineHeight: 18,
  },
});