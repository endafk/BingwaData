// AppNavigator.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Modal,
  TextInput,
  Animated,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

/* ---------- Themes ---------- */
const lightTheme = {
  globalHeaderBackground: '#2E7D32',
  globalHeaderText: '#fff',
  containerBackground: '#F2F2F2',
  textColor: '#333',
  packageItemBackground: '#FFFFFF',
};

const darkTheme = {
  globalHeaderBackground: '#000',
  globalHeaderText: '#fff',
  containerBackground: '#121212',
  textColor: '#ccc',
  packageItemBackground: '#1E1E1E',
};

/* ---------- Error Boundary ---------- */
interface ErrorBoundaryState {
  hasError: boolean;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/* ---------- Data Arrays ---------- */
// offer_ussd is the USSD code to trigger the purchase
// You can add more packages on the array of you have additional packages
const bundlesData = [
  {
    id: 'b1',
    title: '1GB for 1hr @19',
    price: 'KES 19',
    offer_ussd: '*180*5*2*pppp*5*1#', // Replace pppp with the actual PIN(Backend) 
  },
  {
    id: 'b2',
    title: '250mb for 24hrs @20',
    price: 'KES 20',
    offer_ussd: '*180*5*2*pppp*5*2#',
  },
  {
    id: 'b3',
    title: '1GB for 1hr @22',
    price: 'KES 22',
    offer_ussd: '*180*5*2*pppp*5*3#',
  },
  {
    id: 'b4',
    title: '1.25gb till midnight @55',
    price: 'KES 55',
    offer_ussd: '*180*5*2*pppp*5*4#',
  },
];

const minutesData = [
  {
    id: 'm1',
    title: '50minutes till midnight @51',
    price: 'KES 51',
    offer_ussd: '*180*5*2*pppp*5*5#',
  },
];

const smsData = [
  {
    id: 's1',
    title: '20 SMS @5',
    price: 'KES 5',
    offer_ussd: '*180*5*2*pppp*5*6#',
  },
  {
    id: 's2',
    title: '200 sms @10',
    price: 'KES 10',
    offer_ussd: '*180*5*2*pppp*5*7#',
  },
  {
    id: 's3',
    title: '1000sms weekly @30',
    price: 'KES 30',
    offer_ussd: '*180*5*2*pppp*5*8#',
  },
];

/* ---------- PackagesScreen Component ---------- */
import { RouteProp } from '@react-navigation/native';

interface PackagesScreenProps {
  route: RouteProp<{ params: { packagesData: typeof bundlesData; title: string } }, 'params'>;
  addTransaction: (transaction: any) => void;
  theme: typeof lightTheme;
}

function PackagesScreen({ route, addTransaction, theme }: PackagesScreenProps) {
  const { packagesData, title } = route.params;

  // Purchase modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{ id: string; title: string; price: string; offer_ussd: string } | null>(null);
  const [phoneReceive, setPhoneReceive] = useState('');
  const [phonePay, setPhonePay] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Response modal states
  const [serverResponseVisible, setServerResponseVisible] = useState(false);
  const [serverResponseText, setServerResponseText] = useState('');

  // Fade-in animation(Cool, why not?)
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const openPurchaseModal = (item: typeof bundlesData[0]) => {
    setSelectedPackage(item);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedPackage(null);
    setPhoneReceive('');
    setPhonePay('');
    setIsLoading(false);
  };

  // Payment integration and transaction logging
  const handlePurchaseBundle = async () => {
    if (!selectedPackage) {
      setServerResponseText('Purchase failed: No package selected.');
      setIsLoading(false);
      return;
    }

    // Edit this payload to match your API requirements
    const offerAmount = parseInt(selectedPackage.price.replace('KES ', ''), 10);
    const payload = {
      user_id: 1798,  
      offer_amount: offerAmount,
      phone_number: phoneReceive,
      mpesa_phone: phonePay,
      offer_ussd: selectedPackage.offer_ussd,
      action: 'purchase_bundle',
    };
    // Your API goes here
    setIsLoading(true);
    try {
      const response = await fetch('https://api.bingwasokoni.lore/api/purchases.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify(payload), //Goves the user a more cleaner response by removing status, etc... lore
      });
      const jsonResponse = await response.json();
      const statusMessage = jsonResponse && jsonResponse.status ? jsonResponse.status : 'No status returned from server.';
      setServerResponseText(statusMessage);

      // Log transaction
      if (addTransaction) {
        const transaction = {
          id: new Date().toISOString(),
          packageTitle: selectedPackage ? selectedPackage.title : '',
          offer_amount: offerAmount,
          response: statusMessage,
          timestamp: new Date().toLocaleString(),
        };
        addTransaction(transaction);
      }
    } catch (error) {
      setServerResponseText('Purchase failed: Something went wrong.');
      console.error('Purchase error:', error);
    } finally {
      setIsLoading(false);
      closeModal();
      setServerResponseVisible(true);
    }
  };

  const renderPackageItem = ({ item }: { item: { id: string; title: string; price: string; offer_ussd: string } }) => (
    <View style={[styles.packageItem, { backgroundColor: theme.packageItemBackground }]}>
      <View style={styles.textContainer}>
        <Text style={[styles.packageTitle, { color: theme.textColor }]}>{item.title}</Text>
        <Text style={[styles.packagePrice, { color: theme.textColor }]}>{item.price}</Text>
      </View>
      <TouchableOpacity
        style={styles.purchaseButton}
        onPress={() => openPurchaseModal(item)}
      >
        <Text style={styles.purchaseButtonText}>PURCHASE</Text>
      </TouchableOpacity>
    </View>
  );

  const isBothTenDigits = phoneReceive.length === 10 && phonePay.length === 10; // Check if both phone numbers are 10 digits if not the button is inactive

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.containerBackground }]}>
        <Text style={[styles.screenHeader, { color: theme.textColor }]}>{title}</Text>
        <FlatList
          data={packagesData}
          keyExtractor={(item) => item.id}
          renderItem={renderPackageItem}
          showsVerticalScrollIndicator={false}
        />

        {/* Purchase Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                Purchase {selectedPackage?.title}
              </Text>
              <Text style={styles.modalSubtitle}>
                You will receive the bundle once payment is confirmed.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Phone Number to receive"
                keyboardType="numeric"
                maxLength={10}
                value={phoneReceive}
                onChangeText={setPhoneReceive}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number to pay (M-Pesa)"
                keyboardType="numeric"
                maxLength={10}
                value={phonePay}
                onChangeText={setPhonePay}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.modalPurchaseButton,
                    { backgroundColor: isBothTenDigits ? '#2E7D32' : 'gray' },
                  ]}
                  disabled={!isBothTenDigits || isLoading}
                  onPress={handlePurchaseBundle}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalPurchaseButtonText}>
                      PURCHASE BUNDLE
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={closeModal}
                  disabled={isLoading}
                >
                  <Text style={styles.modalCloseButtonText}>CANCEL</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Response Modal */} // This is the modal that shows the response from the server
                              // Found it cleaner than using an alert
        <Modal
          visible={serverResponseVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setServerResponseVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Purchase Status</Text>
              <Text style={styles.modalSubtitle}>{serverResponseText}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setServerResponseVisible(false)}
              >
                <Text style={styles.modalCloseButtonText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Animated.View>
  );
}

/* ---------- Transaction History Screen ---------- */
// Working on implementing the history to be persistent
// Will be using AsyncStorage to store the transactions
// Will also be working on a way to delete transactions... Lazy
interface TransactionHistoryScreenProps {
  transactions: { id: string; packageTitle: string; offer_amount: number; response: string; timestamp: string }[];
  theme: typeof lightTheme;
}
function TransactionHistoryScreen({ transactions, theme }: TransactionHistoryScreenProps) {
  const renderItem = ({ item }: { item: { id: string; packageTitle: string; offer_amount: number; response: string; timestamp: string } }) => (
    <View style={[styles.transactionItem, { backgroundColor: theme.packageItemBackground }]}>
      <Text style={[styles.transactionText, { color: theme.textColor }]}>
        {item.timestamp} - {item.packageTitle} - {item.response}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.containerBackground }]}>
      <Text style={[styles.screenHeader, { color: theme.textColor }]}>Transaction History</Text>
      {transactions.length === 0 ? (
        <Text style={{ color: theme.textColor, textAlign: 'center', marginTop: 20 }}>
          No transactions yet.
        </Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
///////////////////////////////////


/* ---------- About Screen (without dark mode toggle) ---------- */
function AboutScreen({ theme }: { theme: typeof lightTheme }) {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.containerBackground }]}>
      <Text style={[styles.screenHeader, { color: theme.textColor }]}>About This App</Text>
      <Text style={{ marginTop: 10, color: theme.textColor }}>
        This is an app for purchasing Bingwa bundles, minutes, and SMS.
        {"\n\n"}(Made by @endafk on GitHub)
      </Text>
    </SafeAreaView>
  );
}

/* ---------- Screen Wrappers for Bundles, Minutes, SMS ---------- */
function BundlesScreenWrapper({ addTransaction, theme }: { addTransaction: (transaction: any) => void; theme: typeof lightTheme }) {
  return (
    <PackagesScreen
      route={{ key: 'bundles', name: 'params', params: { packagesData: bundlesData, title: 'Bundles' } }}
      addTransaction={addTransaction}
      theme={theme}
    />
  );
}
function MinutesScreenWrapper({ addTransaction, theme }: { addTransaction: (transaction: any) => void; theme: typeof lightTheme }) {
  return (
    <PackagesScreen
      route={{ key: 'minutes', name: 'params', params: { packagesData: minutesData, title: 'Minutes' } }}
      addTransaction={addTransaction}
      theme={theme}
    />
  );
}
function SMSScreenWrapper({ addTransaction, theme }: { addTransaction: (transaction: any) => void; theme: typeof lightTheme }) {
  return (
    <PackagesScreen
      route={{ key: 'sms', name: 'params', params: { packagesData: smsData, title: 'SMS' } }}
      addTransaction={addTransaction}
      theme={theme}
    />
  );
}

/* ---------- Main Navigator Component ---------- */
function MainNavigator() {
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = () => setIsDark(!isDark);
  const theme = isDark ? darkTheme : lightTheme;

  // Transactions state for history
  interface Transaction {
    id: string;
    packageTitle: string;
    offer_amount: number;
    response: string;
    timestamp: string;
  }
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const addTransaction = (transaction: Transaction) => {
    setTransactions((prev) => [transaction, ...prev]);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Global header with dark mode switch */}
      <View style={[styles.globalHeader, { backgroundColor: theme.globalHeaderBackground, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15 }]}>
        <Text style={[styles.globalHeaderText, { color: theme.globalHeaderText }]}>Bingwa Data</Text>
        <Switch value={isDark} onValueChange={toggleTheme} />
      </View>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: '#C8E6C9',
          tabBarStyle: {
            backgroundColor: '#2E7D32',
            height: 70,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            position: 'absolute',
            left: 10,
            right: 10,
            bottom: 10,
          },
          tabBarLabelStyle: { marginBottom: 10, fontSize: 14 },
        }}
      >
        <Tab.Screen
          name="Bundles"
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'basket' : 'basket-outline'} size={size} color={color} />
            ),
          }}
        >
          {() => <BundlesScreenWrapper addTransaction={addTransaction} theme={theme} />}
        </Tab.Screen>
        <Tab.Screen
          name="Minutes"
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'time' : 'time-outline'} size={size} color={color} />
            ),
          }}
        >
          {() => <MinutesScreenWrapper addTransaction={addTransaction} theme={theme} />}
        </Tab.Screen>
        <Tab.Screen
          name="SMS"
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'chatbubble' : 'chatbubble-outline'} size={size} color={color} />
            ),
          }}
        >
          {() => <SMSScreenWrapper addTransaction={addTransaction} theme={theme} />}
        </Tab.Screen>
        <Tab.Screen
          name="History"
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'list' : 'list-outline'} size={size} color={color} />
            ),
          }}
        >
          {() => <TransactionHistoryScreen transactions={transactions} theme={theme} />}
        </Tab.Screen>
        <Tab.Screen
          name="About"
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons name={focused ? 'information-circle' : 'information-circle-outline'} size={size} color={color} />
            ),
          }}
        >
          {() => <AboutScreen theme={theme} />}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
}

/* ---------- Wrap MainNavigator with ErrorBoundary ---------- */
export default function AppNavigator() {
  return (
    <ErrorBoundary>
      <MainNavigator />
    </ErrorBoundary>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  globalHeader: {
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  globalHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  screenHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  packageItem: {
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  textContainer: {
    flexShrink: 1,
    marginRight: 10,
  },
  packageTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  packagePrice: {
    fontSize: 14,
  },
  purchaseButton: {
    backgroundColor: '#D4EDDA',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  purchaseButtonText: {
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    color: '#666',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCC',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalPurchaseButton: {
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  modalPurchaseButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    backgroundColor: '#DDD',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  modalCloseButtonText: {
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  customTabBarButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    margin: 5,
    paddingVertical: 10,
  },
  customTabBarButtonActive: {
    backgroundColor: '#1B5E20',
  },
  transactionItem: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transactionText: {
    fontSize: 14,
  },
  themeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: 'red',
    textAlign: 'center',
  },
});
