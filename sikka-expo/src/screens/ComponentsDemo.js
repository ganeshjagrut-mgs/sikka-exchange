import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import Layout from '../components/Layout';
import CryptoCard from '../components/CryptoCard';
import TransactionItem from '../components/TransactionItem';
import PortfolioChart from '../components/PortfolioChart';
import { 
  Button, 
  Input, 
  LoadingSpinner, 
  GlassContainer,
  Badge,
  Search,
  TrendingUp,
} from '../components/ui';
import { useTheme } from '../hooks/useTheme';

// Sample data for demos
const sampleCryptos = [
  {
    id: '1',
    name: 'Bitcoin',
    symbol: 'BTC',
    price: 2834567,
    change24h: 2.45,
    volume: '₹24.5B',
    marketCap: '₹1.2T',
    image: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
  },
  {
    id: '2',
    name: 'Ethereum',
    symbol: 'ETH',
    price: 167892,
    change24h: -1.23,
    volume: '₹18.2B',
    marketCap: '₹800B',
    image: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  },
  {
    id: '3',
    name: 'Cardano',
    symbol: 'ADA',
    price: 28,
    change24h: 5.67,
    volume: '₹2.1B',
    marketCap: '₹95B',
  },
];

const sampleTransactions = [
  {
    id: '1',
    type: 'buy',
    symbol: 'BTC',
    amount: 0.05,
    total: 141728,
    date: '2024-01-15T10:30:00Z',
    status: 'completed',
  },
  {
    id: '2',
    type: 'sell',
    symbol: 'ETH',
    amount: 2.5,
    total: 419730,
    date: '2024-01-14T15:45:00Z',
    status: 'pending',
  },
  {
    id: '3',
    type: 'buy',
    symbol: 'ADA',
    amount: 1000,
    total: 28000,
    date: '2024-01-13T09:15:00Z',
    status: 'completed',
  },
];

const sampleChartData = [
  { time: '00:00', value: 45000 },
  { time: '04:00', value: 46200 },
  { time: '08:00', value: 45800 },
  { time: '12:00', value: 47500 },
  { time: '16:00', value: 46900 },
  { time: '20:00', value: 47270 },
];

const ComponentsDemo = () => {
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCryptoPress = (crypto) => {
    Alert.alert('Crypto Selected', `You selected ${crypto.name} (${crypto.symbol})`);
  };

  const handleTransactionPress = (transaction) => {
    Alert.alert('Transaction Details', `${transaction.type} ${transaction.amount} ${transaction.symbol}`);
  };

  const handleButtonPress = (variant) => {
    Alert.alert('Button Pressed', `${variant} button was pressed!`);
  };

  const toggleLoading = () => {
    setIsLoading(!isLoading);
  };

  const renderSection = (title, children) => (
    <View style={{ marginBottom: theme.spacing[6] }}>
      <Text 
        style={{
          color: theme.colors.text,
          fontSize: theme.typography.fontSize.xl,
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing[4],
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );

  return (
    <Layout>
      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ 
          padding: theme.spacing[4],
          paddingBottom: theme.spacing[8],
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text 
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            textAlign: 'center',
            marginBottom: theme.spacing[8],
          }}
        >
          UI Components Demo
        </Text>

        {/* CryptoCard Components */}
        {renderSection(
          'Crypto Cards',
          <View>
            <Text 
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                marginBottom: theme.spacing[4],
              }}
            >
              Full crypto cards with price info and stats:
            </Text>
            {sampleCryptos.map((crypto) => (
              <CryptoCard
                key={crypto.id}
                crypto={crypto}
                onPress={handleCryptoPress}
              />
            ))}
            
            <Text 
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                marginTop: theme.spacing[6],
                marginBottom: theme.spacing[4],
              }}
            >
              Compact crypto cards for lists:
            </Text>
            {sampleCryptos.map((crypto) => (
              <CryptoCard
                key={`compact-${crypto.id}`}
                crypto={crypto}
                compact={true}
                onPress={handleCryptoPress}
              />
            ))}
          </View>
        )}

        {/* TransactionItem Components */}
        {renderSection(
          'Transaction Items',
          <View>
            <Text 
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                marginBottom: theme.spacing[4],
              }}
            >
              Transaction history items with status indicators:
            </Text>
            {sampleTransactions.map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                onPress={handleTransactionPress}
              />
            ))}
          </View>
        )}

        {/* PortfolioChart Component */}
        {renderSection(
          'Portfolio Chart',
          <View>
            <Text 
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                marginBottom: theme.spacing[4],
              }}
            >
              Interactive portfolio chart with responsive design:
            </Text>
            <GlassContainer style={{ padding: theme.spacing[4] }}>
              <PortfolioChart
                data={sampleChartData}
                height={200}
                showGrid={true}
                bezier={true}
                withShadow={true}
              />
            </GlassContainer>
          </View>
        )}

        {/* Button Components */}
        {renderSection(
          'Button Variants',
          <View style={{ gap: theme.spacing[3] }}>
            <Text 
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                marginBottom: theme.spacing[4],
              }}
            >
              Different button styles and sizes:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
              <Button 
                onPress={() => handleButtonPress('Primary')}
                variant="primary"
              >
                Primary
              </Button>
              <Button 
                onPress={() => handleButtonPress('Secondary')}
                variant="secondary"
              >
                Secondary
              </Button>
              <Button 
                onPress={() => handleButtonPress('Outline')}
                variant="outline"
              >
                Outline
              </Button>
            </View>
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
              <Button 
                onPress={() => handleButtonPress('Small')}
                size="small"
              >
                Small
              </Button>
              <Button 
                onPress={() => handleButtonPress('Medium')}
                size="medium"
              >
                Medium
              </Button>
              <Button 
                onPress={() => handleButtonPress('Large')}
                size="large"
              >
                Large
              </Button>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing[2] }}>
              <Button 
                onPress={() => handleButtonPress('With Icon')}
                icon={<TrendingUp />}
                iconPosition="left"
              >
                With Icon
              </Button>
              <Button 
                onPress={() => {}}
                loading={true}
                variant="primary"
              >
                Loading
              </Button>
              <Button 
                onPress={() => {}}
                disabled={true}
              >
                Disabled
              </Button>
            </View>
          </View>
        )}

        {/* Input Components */}
        {renderSection(
          'Input Components',
          <View>
            <Text 
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                marginBottom: theme.spacing[4],
              }}
            >
              Form inputs with different configurations:
            </Text>
            <Input
              label="Basic Input"
              placeholder="Enter some text..."
              value={inputValue}
              onChangeText={setInputValue}
            />
            
            <Input
              label="Search Input"
              placeholder="Search cryptocurrencies..."
              leftIcon={<Search />}
            />
            
            <Input
              label="Password Input"
              placeholder="Enter password..."
              secureTextEntry={true}
            />
            
            <Input
              label="Input with Error"
              placeholder="This has an error..."
              error="This field is required"
              value="invalid value"
            />
            
            <Input
              label="Multiline Input"
              placeholder="Enter multiple lines..."
              multiline={true}
              numberOfLines={4}
            />
          </View>
        )}

        {/* Loading Components */}
        {renderSection(
          'Loading States',
          <View>
            <Text 
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                marginBottom: theme.spacing[4],
              }}
            >
              Different loading indicators and states:
            </Text>
            
            <View style={{ 
              flexDirection: 'row', 
              justifyContent: 'space-around', 
              marginBottom: theme.spacing[6],
            }}>
              <View style={{ alignItems: 'center' }}>
                <LoadingSpinner variant="spinner" size="small" />
                <Text style={{ 
                  color: theme.colors.textSecondary, 
                  fontSize: theme.typography.fontSize.sm,
                  marginTop: theme.spacing[2],
                }}>
                  Spinner
                </Text>
              </View>
              
              <View style={{ alignItems: 'center' }}>
                <LoadingSpinner variant="dots" size="medium" />
                <Text style={{ 
                  color: theme.colors.textSecondary, 
                  fontSize: theme.typography.fontSize.sm,
                  marginTop: theme.spacing[2],
                }}>
                  Dots
                </Text>
              </View>
              
              <View style={{ alignItems: 'center' }}>
                <LoadingSpinner variant="activity" size="large" />
                <Text style={{ 
                  color: theme.colors.textSecondary, 
                  fontSize: theme.typography.fontSize.sm,
                  marginTop: theme.spacing[2],
                }}>
                  Activity
                </Text>
              </View>
            </View>

            <Button onPress={toggleLoading} variant="outline">
              {isLoading ? 'Hide Loading' : 'Show Loading Example'}
            </Button>

            {isLoading && (
              <LoadingSpinner 
                variant="spinner" 
                text="Loading your portfolio data..."
                style={{ marginTop: theme.spacing[4] }}
              />
            )}
          </View>
        )}

        {/* Badge Components */}
        {renderSection(
          'Badge Components',
          <View>
            <Text 
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                marginBottom: theme.spacing[4],
              }}
            >
              Status badges and indicators:
            </Text>
            <View style={{ 
              flexDirection: 'row', 
              flexWrap: 'wrap', 
              gap: theme.spacing[2],
            }}>
              <Badge variant="success">Completed</Badge>
              <Badge variant="warning">Pending</Badge>
              <Badge variant="error">Failed</Badge>
              <Badge variant="info">Processing</Badge>
              <Badge variant="default">Draft</Badge>
            </View>
          </View>
        )}

        {/* Glass Container */}
        {renderSection(
          'Glass Container',
          <View>
            <Text 
              style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                marginBottom: theme.spacing[4],
              }}
            >
              Glass morphism container with backdrop blur:
            </Text>
            <GlassContainer style={{ padding: theme.spacing[6] }}>
              <Text style={{
                color: theme.colors.text,
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.semibold,
                textAlign: 'center',
              }}>
                This is a glass container
              </Text>
              <Text style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                textAlign: 'center',
                marginTop: theme.spacing[2],
              }}>
                With beautiful glass morphism effects and backdrop blur
              </Text>
            </GlassContainer>
          </View>
        )}

      </ScrollView>
    </Layout>
  );
};

export default ComponentsDemo;