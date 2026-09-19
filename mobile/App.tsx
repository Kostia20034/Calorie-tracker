import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addImageMealToToday, addMenuItem, createFoodFromDescription, createManualFood, DailyMenu, deleteFood, deleteMenuItem, Food, getCurrentUser, getDailyMenu, getInsights, Insights, login, MealCategory, MenuItem, register, searchFoods, updateFood, updateGoals, updateMenuItem } from './api';

const tabOrder = ['today', 'food', 'insights', 'profile'] as const;
type AppTab = typeof tabOrder[number];
type SelectedAiImage = { uri: string; fileName: string; mimeType: string };
type GoalValues = { calorie_goal: number; protein_goal: number; carbs_goal: number; fat_goal: number };
const defaultGoals: GoalValues = { calorie_goal: 2000, protein_goal: 120, carbs_goal: 250, fat_goal: 65 };

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

function ModalSurface({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <Pressable onPress={(event) => event.stopPropagation()} style={styles.modalContent}>
        {children}
      </Pressable>
    </Pressable>
  );
}

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [goals, setGoals] = useState<GoalValues>(defaultGoals);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [goalsError, setGoalsError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [showFoodActionModal, setShowFoodActionModal] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const [foodProtein, setFoodProtein] = useState('');
  const [foodCarbs, setFoodCarbs] = useState('');
  const [foodFat, setFoodFat] = useState('');
  const [foodServingGrams, setFoodServingGrams] = useState('');
  const [foodError, setFoodError] = useState('');
  const [isSavingFood, setIsSavingFood] = useState(false);
  const [editingFood, setEditingFood] = useState<Food | null>(null);
  const [deletingFoodId, setDeletingFoodId] = useState<number | null>(null);
  const [savedFood, setSavedFood] = useState<Food | null>(null);
  const [showAiFoodModal, setShowAiFoodModal] = useState(false);
  const [aiFoodDescription, setAiFoodDescription] = useState('');
  const [aiFoodError, setAiFoodError] = useState('');
  const [isSavingAiFood, setIsSavingAiFood] = useState(false);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [selectedAiImage, setSelectedAiImage] = useState<SelectedAiImage | null>(null);
  const [showAddToToday, setShowAddToToday] = useState(false);
  const [menuActionError, setMenuActionError] = useState('');
  const [isAddingToToday, setIsAddingToToday] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [selectedMealCategory, setSelectedMealCategory] = useState<MealCategory>('lunch');
  const [selectedDateIso, setSelectedDateIso] = useState(toIsoDate(new Date()));
  const [foodQuery, setFoodQuery] = useState('');
  const [foodResults, setFoodResults] = useState<Food[]>([]);
  const [foodSearchError, setFoodSearchError] = useState('');
  const [isSearchingFoods, setIsSearchingFoods] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editQuantity, setEditQuantity] = useState('1');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [loggedCalories, setLoggedCalories] = useState(0);
  const [menu, setMenu] = useState<DailyMenu | null>(null);
  const [menuError, setMenuError] = useState('');
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [insightsError, setInsightsError] = useState('');
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const todayIso = toIsoDate(new Date());
  const isToday = selectedDateIso === todayIso;
  const todayDisplayLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${selectedDateIso}T12:00:00`)).toUpperCase();

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('calorie-tracker-token'),
      AsyncStorage.getItem('calorie-tracker-profile-image'),
    ])
      .then(async ([savedToken, savedProfileImage]) => {
        setProfileImageUri(savedProfileImage);
        if (!savedToken) {
          return;
        }
        try {
          const user = await getCurrentUser(savedToken);
          setToken(savedToken);
          setAccountEmail(user.email);
          setGoals(user);
        } catch {
          await AsyncStorage.removeItem('calorie-tracker-token');
        }
      })
      .finally(() => setIsRestoringSession(false));
  }, []);

  async function handleProfileImageChange(uri: string) {
    setProfileImageUri(uri);
    await AsyncStorage.setItem('calorie-tracker-profile-image', uri);
  }

  async function saveFood() {
    if (!token) {
      return;
    }

    const calories = Number(foodCalories);
    const protein = Number(foodProtein);
    const carbs = Number(foodCarbs);
    const fat = Number(foodFat);
    const servingSizeGrams = Number(foodServingGrams);
    if (
      !foodName.trim() ||
      !Number.isFinite(calories) || calories < 0 ||
      !Number.isFinite(protein) || protein < 0 ||
      !Number.isFinite(carbs) || carbs < 0 ||
      !Number.isFinite(fat) || fat < 0 ||
      !Number.isFinite(servingSizeGrams) || servingSizeGrams <= 0
    ) {
      setFoodError('Enter a name and valid nutrition values for one serving.');
      return;
    }

    setFoodError('');
    setIsSavingFood(true);
    try {
      const foodPayload = {
        name: foodName.trim(),
        calories,
        protein,
        carbs,
        fat,
        serving_size_grams: servingSizeGrams,
      };
      const food = editingFood
        ? await updateFood(token, { id: editingFood.id, ...foodPayload })
        : await createManualFood(token, foodPayload);
      if (editingFood) {
        setEditingFood(null);
        setShowFoodForm(false);
        setFoodQuery(food.name);
        return;
      }
      setSavedFood(food);
      setShowFoodForm(false);
      setShowAddToToday(true);
    } catch (error) {
      setFoodError(error instanceof Error ? error.message : 'Unable to save food');
    } finally {
      setIsSavingFood(false);
    }
  }

  function openFoodEditor(food: Food) {
    setEditingFood(food);
    setFoodName(food.name);
    setFoodCalories(String(food.calories));
    setFoodProtein(String(food.protein));
    setFoodCarbs(String(food.carbs));
    setFoodFat(String(food.fat));
    setFoodServingGrams(String(food.serving_size_grams));
    setFoodError('');
    setShowFoodForm(true);
  }

  async function removeSavedFood(food: Food) {
    if (!token || deletingFoodId !== null) {
      return;
    }
    if (Platform.OS !== 'web') {
      Alert.alert('Delete saved food?', `Remove ${food.name} from your food database?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void deleteSavedFood(food) },
      ]);
      return;
    }

    if (!globalThis.confirm?.(`Delete ${food.name} from your saved foods?`)) {
      return;
    }
    await deleteSavedFood(food);
  }

  async function deleteSavedFood(food: Food) {
    if (!token) {
      return;
    }
    setDeletingFoodId(food.id);
    setFoodSearchError('');
    try {
      await deleteFood(token, food.id);
      setFoodResults((current) => current.filter((item) => item.id !== food.id));
    } catch (error) {
      setFoodSearchError(error instanceof Error ? error.message : 'Unable to delete food');
    } finally {
      setDeletingFoodId(null);
    }
  }

  async function addMenuItemToToday(food: Food, category = selectedMealCategory) {
    if (!token) {
      return;
    }

    setMenuActionError('');
    setIsAddingToToday(true);
    try {
      await addMenuItem(token, selectedDateIso, food.id, 1, category);
      const updatedMenu = await getDailyMenu(token, selectedDateIso);
      setMenu(updatedMenu);
      setLoggedCalories(updatedMenu.totals.calories);
      setShowAddToToday(false);
      setSavedFood(null);
      setFoodName('');
      setFoodCalories('');
      setFoodProtein('');
      setFoodCarbs('');
      setFoodFat('');
      setFoodServingGrams('');
      setActiveTab('today');
    } catch (error) {
      setMenuActionError(error instanceof Error ? error.message : 'Unable to add food to today');
    } finally {
      setIsAddingToToday(false);
    }
  }

  async function addSavedFoodToToday() {
    if (!token || !savedFood) {
      return;
    }

    await addMenuItemToToday(savedFood);
  }

  async function saveAiFood() {
    if (!token) {
      return;
    }

    const description = aiFoodDescription.trim();
    if (!description) {
      setAiFoodError('Describe the food so the AI can estimate the nutrition values.');
      return;
    }

    setAiFoodError('');
    setIsSavingAiFood(true);
    try {
      const food = await createFoodFromDescription(token, description);
      setSavedFood(food);
      setShowAiFoodModal(false);
      setAiFoodDescription('');
      setShowAddToToday(true);
    } catch (error) {
      setAiFoodError(error instanceof Error ? error.message : 'Unable to save AI food');
    } finally {
      setIsSavingAiFood(false);
    }
  }

  async function pickAiFoodImage(source: 'camera' | 'library') {
    if (!token) {
      return;
    }

    const permissionResult = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      setAiFoodError('Camera or photo access is required to use AI food recognition.');
      return;
    }

    const pickerResult = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      })
      : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

    if (pickerResult.canceled || !pickerResult.assets?.[0]?.uri) {
      return;
    }

    const asset = pickerResult.assets[0];
    setSelectedAiImage({
      uri: asset.uri,
      fileName: asset.fileName || `meal-${Date.now()}.jpg`,
      mimeType: asset.mimeType || 'image/jpeg',
    });
    setAiFoodError('');
  }

  async function analyzeAiFoodImage() {
    if (!token || !selectedAiImage) {
      return;
    }

    setIsPickingImage(true);
    setAiFoodError('');
    try {
      const result = await addImageMealToToday(
        token,
        selectedDateIso,
        selectedAiImage.uri,
        selectedAiImage.fileName,
        selectedAiImage.mimeType,
        selectedMealCategory,
      );
      setMenu(result);
      setLoggedCalories(result.totals.calories);
      setShowAiFoodModal(false);
      setSelectedAiImage(null);
      setAiFoodDescription('');
      setActiveTab('today');
    } catch (error) {
      setAiFoodError(error instanceof Error ? error.message : 'Unable to analyze food image');
    } finally {
      setIsPickingImage(false);
    }
  }

  async function removeMenuItem(itemId: number) {
    if (!token) {
      return;
    }

    setMenuActionError('');
    try {
      await deleteMenuItem(token, itemId);
      const updatedMenu = await getDailyMenu(token, selectedDateIso);
      setMenu(updatedMenu);
      setLoggedCalories(updatedMenu.totals.calories);
    } catch (error) {
      setMenuActionError(error instanceof Error ? error.message : 'Unable to remove food from today');
    }
  }

  async function searchFoodDatabase(query = foodQuery) {
    if (!token || !query.trim()) {
      setFoodResults([]);
      setFoodSearchError('');
      return;
    }

    setFoodSearchError('');
    setIsSearchingFoods(true);
    try {
      setFoodResults(await searchFoods(token, query.trim()));
    } catch (error) {
      setFoodSearchError(error instanceof Error ? error.message : 'Unable to search foods');
    } finally {
      setIsSearchingFoods(false);
    }
  }

  function chooseFoodForToday(food: Food) {
    setMenuActionError('');
    void addMenuItemToToday(food);
  }

  function openEditMenuItem(item: MenuItem) {
    setEditingItem(item);
    setEditQuantity(String(item.quantity));
    setMenuActionError('');
  }

  async function saveMealEdit() {
    if (!token || !editingItem) {
      return;
    }

    const quantity = Number(editQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setMenuActionError('Enter a quantity greater than zero.');
      return;
    }

    setIsSavingEdit(true);
    setMenuActionError('');
    try {
      await updateMenuItem(token, editingItem.id, quantity);
      const updatedMenu = await getDailyMenu(token, selectedDateIso);
      setMenu(updatedMenu);
      setLoggedCalories(updatedMenu.totals.calories);
      setEditingItem(null);
    } catch (error) {
      setMenuActionError(error instanceof Error ? error.message : 'Unable to update meal item');
    } finally {
      setIsSavingEdit(false);
    }
  }

  const remainingCalories = Math.max(goals.calorie_goal - loggedCalories, 0);
  const progress = Math.min(loggedCalories / goals.calorie_goal, 1);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.72, duration: 120, useNativeDriver }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver }),
    ]).start();
  }, [activeTab]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isActive = true;
    setIsLoadingMenu(true);
    setMenuError('');
    getDailyMenu(token, selectedDateIso)
      .then((dailyMenu) => {
        if (isActive) {
          setMenu(dailyMenu);
          setLoggedCalories(dailyMenu.totals.calories);
        }
      })
      .catch((error) => {
        if (isActive) {
          setMenuError(error instanceof Error ? error.message : 'Unable to load menu');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingMenu(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [selectedDateIso, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const query = foodQuery.trim();
    if (!query) {
      setFoodResults([]);
      setFoodSearchError('');
      return;
    }

    const timer = setTimeout(() => {
      searchFoodDatabase(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [foodQuery, token]);

  useEffect(() => {
    if (!token || activeTab !== 'insights') {
      return;
    }

    let isActive = true;
    setIsLoadingInsights(true);
    setInsightsError('');
    getInsights(token)
      .then((result) => {
        if (isActive) {
          setInsights(result);
        }
      })
      .catch((error) => {
        if (isActive) {
          setInsightsError(error instanceof Error ? error.message : 'Unable to load insights');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoadingInsights(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [activeTab, token]);

  async function handleLogin() {
    Keyboard.dismiss();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const accessToken = await login(email, password);
      const user = await getCurrentUser(accessToken);
      setToken(accessToken);
      setAccountEmail(user.email);
      setGoals(user);
      await AsyncStorage.setItem('calorie-tracker-token', accessToken);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleRegister() {
    Keyboard.dismiss();
    setLoginError('');
    if (password.length < 8) {
      setLoginError('Password must be at least 8 characters.');
      return;
    }

    setIsLoggingIn(true);
    try {
      await register(email.trim(), password);
      await handleLogin();
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to create account');
      setIsLoggingIn(false);
    }
  }

  async function handleSignOut() {
    await AsyncStorage.removeItem('calorie-tracker-token');
    await AsyncStorage.removeItem('calorie-tracker-profile-image');
    setToken(null);
    setAccountEmail('');
    setProfileImageUri(null);
    setPassword('');
    setActiveTab('today');
  }

  async function handleSaveGoals(nextGoals: GoalValues) {
    if (!token) {
      return;
    }

    setIsSavingGoals(true);
    setGoalsError('');
    try {
      const user = await updateGoals(token, nextGoals);
      setGoals(user);
    } catch (error) {
      setGoalsError(error instanceof Error ? error.message : 'Unable to save goals');
    } finally {
      setIsSavingGoals(false);
    }
  }

  if (isRestoringSession) {
    return <SafeAreaView style={styles.loginScreen} />;
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.loginScreen}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.loginKeyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 30 : 0}
        >
          <ScrollView
            contentContainerStyle={styles.loginScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.loginContent}>
              <Text style={styles.loginEyebrow}>CALORIE TRACKER</Text>
              <Text style={styles.loginTitle}>{isRegistering ? 'Start tracking' : 'Welcome back'}</Text>
              <Text style={styles.loginSubtitle}>{isRegistering ? 'Create an account to begin your nutrition journey.' : 'Sign in to see your daily nutrition.'}</Text>
              <TextInput
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="Email"
                placeholderTextColor="#9ca49e"
                value={email}
                onChangeText={setEmail}
                returnKeyType="next"
                style={styles.loginInput}
              />
              <TextInput
                placeholder="Password"
                placeholderTextColor="#9ca49e"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={styles.loginInput}
              />
              {loginError ? <Text style={styles.loginError}>{loginError}</Text> : null}
              <Pressable accessibilityRole="button" onPress={isRegistering ? handleRegister : handleLogin} style={styles.loginButton} disabled={isLoggingIn}>
                <Text style={styles.loginButtonText}>{isLoggingIn ? (isRegistering ? 'Creating account...' : 'Signing in...') : (isRegistering ? 'Create account' : 'Sign in')}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => { setIsRegistering(!isRegistering); setLoginError(''); }} style={styles.authSwitchButton}>
                <Text style={styles.authSwitchText}>{isRegistering ? 'Already have an account? Sign in' : 'New here? Create an account'}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardArea}
      >
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            {activeTab === 'food' ? (
              <FoodLibrary
                query={foodQuery}
                results={foodResults}
                error={foodSearchError}
                isSearching={isSearchingFoods}
                onQueryChange={setFoodQuery}
                onSearch={searchFoodDatabase}
                onAddFood={() => setShowFoodActionModal(true)}
                onAddAiFood={() => setShowAiFoodModal(true)}
                onChooseFood={chooseFoodForToday}
                selectedCategory={selectedMealCategory}
                onCategoryChange={setSelectedMealCategory}
                onEditFood={openFoodEditor}
                onDeleteFood={removeSavedFood}
              />
            ) : activeTab === 'today' ? (
              <>
                <View style={styles.dateNavigator}>
                  <Pressable accessibilityLabel="Previous day" onPress={() => setSelectedDateIso(shiftDate(selectedDateIso, -1))} style={styles.dateButton}>
                    <Text style={styles.dateButtonText}>‹</Text>
                  </Pressable>
                  <View style={styles.dateNavigatorCenter}>
                    <Text style={styles.dateNavigatorLabel}>{isToday ? 'TODAY' : 'MEAL HISTORY'}</Text>
                    <Text style={styles.dateNavigatorDate}>{todayDisplayLabel}</Text>
                  </View>
                  <Pressable accessibilityLabel="Next day" disabled={isToday} onPress={() => setSelectedDateIso(shiftDate(selectedDateIso, 1))} style={[styles.dateButton, isToday && styles.dateButtonDisabled]}>
                    <Text style={styles.dateButtonText}>›</Text>
                  </Pressable>
                </View>
                <View style={styles.header}>
                  <View>
                    <Text style={styles.eyebrow}>{isToday ? 'TODAY' : 'HISTORY'}</Text>
                    <Text style={styles.title}>{isToday ? 'Good morning, Alex' : 'Your meals'}</Text>
                  </View>
                  <Pressable accessibilityLabel="Open profile" style={styles.avatar}>
                    {profileImageUri ? <Image source={{ uri: profileImageUri }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{accountEmail.charAt(0).toUpperCase()}</Text>}
                  </Pressable>
                </View>

                <View style={styles.heroCard}>
                  <View style={styles.heroCopy}>
                    <Text style={styles.cardEyebrow}>{isToday ? "TODAY'S BALANCE" : 'DAILY BALANCE'}</Text>
                    <Text style={styles.calories}>{Math.round(loggedCalories).toLocaleString()}<Text style={styles.calorieUnit}> kcal</Text></Text>
                    <Text style={styles.remaining}>of {Math.round(goals.calorie_goal).toLocaleString()} daily goal</Text>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    </View>
                    <Text style={styles.progressLabel}>{Math.round(remainingCalories).toLocaleString()} kcal remaining</Text>
                  </View>
                  <View style={styles.ring}>
                    <View style={styles.ringInner}>
                      <Text style={styles.ringValue}>{Math.round(progress * 100)}%</Text>
                      <Text style={styles.ringLabel}>tracked</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Macros</Text>
                  <Text style={styles.sectionMeta}>Daily target</Text>
                </View>
                <View style={styles.macroRow}>
                  <Macro label="Protein" value={`${Math.round(menu?.totals.protein ?? 0)}g`} target={`${Math.round(goals.protein_goal)}g`} color="#ee7b52" progress={(menu?.totals.protein ?? 0) / goals.protein_goal} />
                  <Macro label="Carbs" value={`${Math.round(menu?.totals.carbs ?? 0)}g`} target={`${Math.round(goals.carbs_goal)}g`} color="#e4b64a" progress={(menu?.totals.carbs ?? 0) / goals.carbs_goal} />
                  <Macro label="Fat" value={`${Math.round(menu?.totals.fat ?? 0)}g`} target={`${Math.round(goals.fat_goal)}g`} color="#5f9f8c" progress={(menu?.totals.fat ?? 0) / goals.fat_goal} />
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>{isToday ? "Today's meals" : 'Meals for this day'}</Text>
                </View>
                {isLoadingMenu && <Text style={styles.statusText}>Loading today&apos;s menu...</Text>}
                {menuError ? <Text style={styles.errorText}>{menuError}</Text> : null}
                {menu?.items.map((item) => (
                  <MealRow
                    key={item.id}
                    icon={item.category === 'breakfast' ? '☀' : item.category === 'lunch' ? '◒' : '◐'}
                    title={item.food_name}
                    detail={`${item.category} · ${item.quantity} serving`}
                    calories={`${Math.round(item.calories)} kcal`}
                    onEdit={() => openEditMenuItem(item)}
                    onRemove={() => removeMenuItem(item.id)}
                  />
                ))}
                {!isLoadingMenu && !menuError && menu && menu.items.length > 0 && (
                  <Pressable accessibilityRole="button" onPress={() => setActiveTab('food')} style={styles.addMoreButton}>
                    <Text style={styles.addMoreButtonText}>＋ Add more food</Text>
                  </Pressable>
                )}
                {!isLoadingMenu && !menuError && menu?.items.length === 0 && (
                  <Pressable accessibilityRole="button" onPress={() => setActiveTab('food')}>
                    <MealRow icon="＋" title="No meals yet" detail="Add your first food today" calories="Add meal" empty />
                  </Pressable>
                )}

              </>
            ) : activeTab === 'insights' ? (
              <InsightsScreen insights={insights} error={insightsError} isLoading={isLoadingInsights} />
            ) : (
              <ProfileScreen email={accountEmail} profileImageUri={profileImageUri} onProfileImageChange={handleProfileImageChange} goals={goals} error={goalsError} isSaving={isSavingGoals} onSaveGoals={handleSaveGoals} onSignOut={handleSignOut} />
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
      <View style={styles.tabBar}>
        <Tab label="Today" icon="◉" active={activeTab === 'today'} onPress={() => setActiveTab('today')} />
        <Tab label="Food" icon="⌕" active={activeTab === 'food'} onPress={() => setActiveTab('food')} />
        <Tab label="Insights" icon="▥" active={activeTab === 'insights'} onPress={() => setActiveTab('insights')} />
        <Tab label="Profile" icon="○" active={activeTab === 'profile'} onPress={() => setActiveTab('profile')} />
      </View>
      <Modal visible={showFoodActionModal} animationType="fade" transparent onRequestClose={() => setShowFoodActionModal(false)}>
        <ModalSurface onClose={() => setShowFoodActionModal(false)}>
          <View style={styles.confirmCard}>
            <Text style={styles.formTitle}>Add food</Text>
            <Text style={styles.formHint}>Choose how you want to add this food.</Text>
            <Pressable accessibilityRole="button" onPress={() => { setShowFoodActionModal(false); setShowFoodForm(true); }} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Manual entry</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setShowFoodActionModal(false); setShowAiFoodModal(true); }} style={[styles.skipButton, { marginTop: 12 }]}>
              <Text style={styles.skipButtonText}>AI photo entry</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setShowFoodActionModal(false)} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </ModalSurface>
      </Modal>
      <Modal visible={showAiFoodModal} animationType="slide" transparent onRequestClose={() => setShowAiFoodModal(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardArea}
        >
          <ModalSurface onClose={() => setShowAiFoodModal(false)}>
            <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Add food with AI</Text>
                <Pressable accessibilityLabel="Close AI food form" onPress={() => setShowAiFoodModal(false)}>
                  <Text style={styles.closeButton}>Cancel</Text>
                </Pressable>
              </View>
              <Text style={styles.formHint}>Describe the food, or take a real photo to let AI estimate the nutrition.</Text>
              <Pressable accessibilityRole="button" onPress={() => pickAiFoodImage('camera')} style={styles.saveButton} disabled={isPickingImage}>
                <Text style={styles.saveButtonText}>{isPickingImage ? 'Opening camera...' : 'Take a photo'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => pickAiFoodImage('library')} style={[styles.skipButton, { marginTop: 12 }]} disabled={isPickingImage}>
                <Text style={styles.skipButtonText}>{isPickingImage ? 'Loading image...' : 'Choose from gallery'}</Text>
              </Pressable>
              {selectedAiImage ? (
                <View style={styles.selectedImagePanel}>
                  <Image source={{ uri: selectedAiImage.uri }} style={styles.selectedImage} />
                  <Text style={styles.selectedImageName} numberOfLines={1}>{selectedAiImage.fileName}</Text>
                  <Pressable accessibilityRole="button" onPress={analyzeAiFoodImage} style={styles.saveButton} disabled={isPickingImage}>
                    <Text style={styles.saveButtonText}>{isPickingImage ? 'Analyzing photo...' : 'Analyze selected photo'}</Text>
                  </Pressable>
                </View>
              ) : null}
              <Text style={styles.inputLabel}>Or type a description</Text>
              <TextInput
                autoFocus
                multiline
                placeholder="e.g. 200 g grilled chicken breast with rice and vegetables"
                placeholderTextColor="#9ca49e"
                value={aiFoodDescription}
                onChangeText={setAiFoodDescription}
                textAlignVertical="top"
                style={[styles.input, styles.aiTextInput]}
              />
              {aiFoodError ? <Text style={styles.errorText}>{aiFoodError}</Text> : null}
              <Pressable accessibilityRole="button" onPress={saveAiFood} style={styles.saveButton} disabled={isSavingAiFood}>
                <Text style={styles.saveButtonText}>{isSavingAiFood ? 'Saving...' : 'Save AI food'}</Text>
              </Pressable>
            </ScrollView>
          </ModalSurface>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={showFoodForm} animationType="slide" transparent onRequestClose={() => setShowFoodForm(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardArea}
        >
          <ModalSurface onClose={() => setShowFoodForm(false)}>
            <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>{editingFood ? 'Edit saved food' : 'Add food to database'}</Text>
                <Pressable accessibilityLabel="Close food form" onPress={() => { setEditingFood(null); setShowFoodForm(false); }}>
                  <Text style={styles.closeButton}>Cancel</Text>
                </Pressable>
              </View>
              <Text style={styles.formHint}>{editingFood ? 'Update the nutrition values for this saved food.' : 'Save the base serving first. We will ask separately whether you want to add it to the selected day.'}</Text>
              <Text style={styles.inputLabel}>Food name</Text>
              <TextInput
                autoFocus
                returnKeyType="next"
                placeholder="e.g. Chicken salad"
                placeholderTextColor="#9ca49e"
                value={foodName}
                onChangeText={setFoodName}
                style={styles.input}
              />
              <Text style={styles.inputLabel}>Calories for this serving</Text>
              <TextInput
                placeholder="e.g. 420 kcal"
                placeholderTextColor="#9ca49e"
                value={foodCalories}
                onChangeText={setFoodCalories}
                keyboardType="numeric"
                returnKeyType="next"
                style={styles.input}
              />
              <Text style={styles.inputLabel}>Serving size (grams)</Text>
              <TextInput placeholder="e.g. 118" placeholderTextColor="#9ca49e" value={foodServingGrams} onChangeText={setFoodServingGrams} keyboardType="numeric" style={styles.input} />
              <Text style={styles.inputLabel}>Protein (grams)</Text>
              <TextInput placeholder="e.g. 1.3" placeholderTextColor="#9ca49e" value={foodProtein} onChangeText={setFoodProtein} keyboardType="numeric" style={styles.input} />
              <Text style={styles.inputLabel}>Carbs (grams)</Text>
              <TextInput placeholder="e.g. 27" placeholderTextColor="#9ca49e" value={foodCarbs} onChangeText={setFoodCarbs} keyboardType="numeric" style={styles.input} />
              <Text style={styles.inputLabel}>Fat (grams)</Text>
              <TextInput placeholder="e.g. 0.3" placeholderTextColor="#9ca49e" value={foodFat} onChangeText={setFoodFat} keyboardType="numeric" returnKeyType="done" onSubmitEditing={saveFood} style={styles.input} />
              {foodError ? <Text style={styles.errorText}>{foodError}</Text> : null}
              <Pressable accessibilityRole="button" onPress={saveFood} style={styles.saveButton} disabled={isSavingFood}>
                <Text style={styles.saveButtonText}>{isSavingFood ? 'Saving...' : (editingFood ? 'Save changes' : 'Save food')}</Text>
              </Pressable>
            </ScrollView>
          </ModalSurface>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={showAddToToday} animationType="fade" transparent onRequestClose={() => setShowAddToToday(false)}>
        <ModalSurface onClose={() => setShowAddToToday(false)}>
          <View style={styles.confirmCard}>
            <Text style={styles.formTitle}>Add to today?</Text>
            <Text style={styles.formHint}>{savedFood?.name} is saved with a base serving of {savedFood?.serving_size_grams} g and {savedFood?.calories} kcal.</Text>
            <Text style={styles.confirmText}>Add one base serving to your current meal?</Text>
            {menuActionError ? <Text style={styles.errorText}>{menuActionError}</Text> : null}
            <Pressable accessibilityRole="button" onPress={addSavedFoodToToday} style={styles.saveButton} disabled={isAddingToToday}>
              <Text style={styles.saveButtonText}>{isAddingToToday ? 'Adding...' : 'Yes, add to today'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => { setShowAddToToday(false); setSavedFood(null); }} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>No, not today</Text>
            </Pressable>
          </View>
        </ModalSurface>
      </Modal>
      <Modal visible={editingItem !== null} animationType="fade" transparent onRequestClose={() => setEditingItem(null)}>
        <ModalSurface onClose={() => setEditingItem(null)}>
          <View style={styles.confirmCard}>
            <Text style={styles.formTitle}>Edit meal item</Text>
            <Text style={styles.formHint}>{editingItem?.food_name}</Text>
            <Text style={styles.inputLabel}>How many servings?</Text>
            <TextInput
              autoFocus
              value={editQuantity}
              onChangeText={setEditQuantity}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={saveMealEdit}
              style={styles.input}
            />
            {menuActionError ? <Text style={styles.errorText}>{menuActionError}</Text> : null}
            <Pressable accessibilityRole="button" onPress={saveMealEdit} style={styles.saveButton} disabled={isSavingEdit}>
              <Text style={styles.saveButtonText}>{isSavingEdit ? 'Saving...' : 'Save changes'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setEditingItem(null)} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </ModalSurface>
      </Modal>
    </SafeAreaView>
  );
}

function PlaceholderScreen({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.placeholderCard}>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderSubtitle}>{subtitle}</Text>
    </View>
  );
}

function InsightsScreen({ insights, error, isLoading }: { insights: Insights | null; error: string; isLoading: boolean }) {
  const maxCalories = Math.max(...(insights?.days.map((day) => day.calories) ?? [2000]), 1);
  return (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>LAST 7 DAYS</Text>
          <Text style={styles.title}>Your insights</Text>
        </View>
      </View>
      {isLoading ? <Text style={styles.statusText}>Loading your trends...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!isLoading && !error && !insights ? (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>No insights yet</Text>
          <Text style={styles.placeholderSubtitle}>Log a meal today and your seven-day nutrition trends will appear here.</Text>
        </View>
      ) : null}
      {insights ? (
        <>
          <View style={styles.insightHero}>
            <Text style={styles.cardEyebrow}>AVERAGE DAILY CALORIES</Text>
            <Text style={styles.insightCalories}>{Math.round(insights.average_calories)}<Text style={styles.calorieUnit}> kcal</Text></Text>
            <Text style={styles.remaining}>{insights.logged_days} of 7 days logged</Text>
          </View>
          <View style={styles.insightMacroRow}>
            <InsightMetric label="Protein" value={`${Math.round(insights.average_protein)}g`} />
            <InsightMetric label="Carbs" value={`${Math.round(insights.average_carbs)}g`} />
            <InsightMetric label="Fat" value={`${Math.round(insights.average_fat)}g`} />
          </View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Calories by day</Text>
            <Text style={styles.sectionMeta}>kcal</Text>
          </View>
          <View style={styles.chartCard}>
            {insights.days.map((day) => (
              <View key={day.date} style={styles.chartColumn}>
                <Text style={styles.chartValue}>{day.calories ? Math.round(day.calories) : '-'}</Text>
                <View style={styles.chartTrack}>
                  <View style={[styles.chartBar, { height: `${Math.max((day.calories / maxCalories) * 100, day.calories ? 8 : 2)}%` }]} />
                </View>
                <Text style={styles.chartLabel}>{new Date(`${day.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </>
  );
}

function ProfileScreen({ email, profileImageUri, onProfileImageChange, goals, error, isSaving, onSaveGoals, onSignOut }: { email: string; profileImageUri: string | null; onProfileImageChange: (uri: string) => Promise<void>; goals: GoalValues; error: string; isSaving: boolean; onSaveGoals: (goals: GoalValues) => void; onSignOut: () => void }) {
  const [calorieGoal, setCalorieGoal] = useState(String(goals.calorie_goal));
  const [bodyWeightLb, setBodyWeightLb] = useState('');
  const [proteinGoal, setProteinGoal] = useState(String(goals.protein_goal));
  const [carbsGoal, setCarbsGoal] = useState(String(goals.carbs_goal));
  const [fatGoal, setFatGoal] = useState(String(goals.fat_goal));
  const [calculatorError, setCalculatorError] = useState('');
  const [isEditingGoals, setIsEditingGoals] = useState(false);

  function saveGoals() {
    const weightLb = Number(bodyWeightLb);
    const carbs = Number(carbsGoal);
    const calculatedProtein = weightLb;
    const calculatedFat = (weightLb / 2.20462) * 0.9;
    const calculatedCalories = calculatedProtein * 4 + carbs * 4 + calculatedFat * 9;
    const nextGoals = {
      calorie_goal: isEditingGoals ? Number(calorieGoal) : calculatedCalories,
      protein_goal: isEditingGoals ? Number(proteinGoal) : calculatedProtein,
      carbs_goal: carbs,
      fat_goal: isEditingGoals ? Number(fatGoal) : calculatedFat,
    };
    if (Object.values(nextGoals).some((value) => !Number.isFinite(value) || value <= 0)) {
      setCalculatorError('Enter a positive body weight and carb target.');
      return;
    }
    setCalculatorError('');
    onSaveGoals(nextGoals);
  }

  async function chooseProfileImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    const uri = result.assets?.[0]?.uri;
    if (!result.canceled && uri) {
      await onProfileImageChange(uri);
    }
  }

  return (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>ACCOUNT</Text>
          <Text style={styles.title}>Your profile</Text>
        </View>
      </View>
      <View style={styles.profileCard}>
        <Pressable accessibilityLabel="Change profile picture" onPress={chooseProfileImage} style={styles.profileAvatar}>
          {profileImageUri ? <Image source={{ uri: profileImageUri }} style={styles.profileAvatarImage} /> : <Text style={styles.profileAvatarText}>{email.charAt(0).toUpperCase()}</Text>}
        </Pressable>
        <Text style={styles.profileEmail}>{email}</Text>
        <Pressable accessibilityRole="button" onPress={chooseProfileImage}><Text style={styles.changePhotoText}>Change profile picture</Text></Pressable>
        <Text style={styles.profileHint}>Your nutrition data is linked to this account.</Text>
      </View>
      <View style={styles.goalsCard}>
        <Text style={styles.sectionTitle}>Daily goals</Text>
        <Text style={styles.formHint}>Enter your weight and carb target. Protein, fat, and total calories update automatically.</Text>
        <Text style={styles.inputLabel}>Body weight (lb)</Text>
        <TextInput value={bodyWeightLb} onChangeText={setBodyWeightLb} keyboardType="numeric" placeholder="e.g. 180" placeholderTextColor="#9ca49e" style={styles.input} />
        <Text style={styles.inputLabel}>Carbs (g)</Text>
        <TextInput value={carbsGoal} onChangeText={setCarbsGoal} keyboardType="numeric" placeholder="e.g. 220" placeholderTextColor="#9ca49e" style={styles.input} />
        {calculatorError ? <Text style={styles.errorText}>{calculatorError}</Text> : null}
        {(() => {
          const weightLb = Number(bodyWeightLb);
          const carbs = Number(carbsGoal);
          const protein = weightLb;
          const fat = (weightLb / 2.20462) * 0.9;
          const calories = protein * 4 + carbs * 4 + fat * 9;
          const valid = Number.isFinite(weightLb) && weightLb > 0 && Number.isFinite(carbs) && carbs > 0;
          return (
            <>
              <View style={styles.calculatedGoalsRow}>
                <GoalValue label="Calories" value={valid ? `${Math.round(calories)} kcal` : '--'} />
                <GoalValue label="Protein" value={valid ? `${Math.round(protein)} g` : '--'} />
                <GoalValue label="Carbs" value={valid ? `${Math.round(carbs)} g` : '--'} />
                <GoalValue label="Fat" value={valid ? `${Math.round(fat)} g` : '--'} />
              </View>
              {!isEditingGoals ? (
                <Pressable accessibilityRole="button" onPress={() => onSaveGoals({ calorie_goal: calories, protein_goal: protein, carbs_goal: carbs, fat_goal: fat })} style={styles.saveButton} disabled={isSaving || !valid}>
                  <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save calculated goals'}</Text>
                </Pressable>
              ) : null}
            </>
          );
        })()}
        <Pressable accessibilityRole="button" onPress={() => setIsEditingGoals(!isEditingGoals)} style={styles.modifyGoalsButton}>
          <Text style={styles.modifyGoalsText}>{isEditingGoals ? 'Hide manual editing' : '+ Modify goals manually'}</Text>
        </Pressable>
        {isEditingGoals ? (
          <>
            <Text style={styles.inputLabel}>Calories</Text>
            <TextInput value={calorieGoal} onChangeText={setCalorieGoal} keyboardType="numeric" style={styles.input} />
            <Text style={styles.inputLabel}>Protein (g)</Text>
            <TextInput value={proteinGoal} onChangeText={setProteinGoal} keyboardType="numeric" style={styles.input} />
            <Text style={styles.inputLabel}>Carbs (g)</Text>
            <TextInput value={carbsGoal} onChangeText={setCarbsGoal} keyboardType="numeric" style={styles.input} />
            <Text style={styles.inputLabel}>Fat (g)</Text>
            <TextInput value={fatGoal} onChangeText={setFatGoal} keyboardType="numeric" style={styles.input} />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <Pressable accessibilityRole="button" onPress={saveGoals} style={styles.saveButton} disabled={isSaving}>
              <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save manual goals'}</Text>
            </Pressable>
          </>
        ) : null}
      </View>
      <Pressable accessibilityRole="button" onPress={onSignOut} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </>
  );
}

function GoalValue({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.calculatedGoal}>
      <Text style={styles.calculatedGoalLabel}>{label}</Text>
      <Text style={styles.calculatedGoalValue}>{value}</Text>
    </View>
  );
}

function InsightMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.insightMetric}>
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroTarget}>daily average</Text>
    </View>
  );
}

function Macro({ label, value, target, color, progress }: { label: string; value: string; target: string; color: string; progress: number }) {
  return (
    <View style={styles.macroCard}>
      <View style={[styles.macroDot, { backgroundColor: color }]} />
      <Text style={styles.macroLabel}>{label}</Text>
      <Text style={styles.macroValue}>{value}</Text>
      <Text style={styles.macroTarget}>of {target}</Text>
      <View style={styles.macroTrack}><View style={[styles.macroFill, { backgroundColor: color, width: `${progress * 100}%` }]} /></View>
    </View>
  );
}

function MealRow({ icon, title, detail, calories, empty = false, onEdit, onRemove }: { icon: string; title: string; detail: string; calories: string; empty?: boolean; onEdit?: () => void; onRemove?: () => void }) {
  return (
    <View style={[styles.mealRow, empty && styles.emptyMeal]}>
      <View style={styles.mealIcon}><Text style={styles.mealIconText}>{icon}</Text></View>
      <View style={styles.mealInfo}><Text style={styles.mealTitle}>{title}</Text><Text style={styles.mealDetail}>{detail}</Text></View>
      <View style={styles.mealActions}>
        <Text style={[styles.mealCalories, empty && styles.emptyCalories]}>{calories}</Text>
        {onEdit ? <Pressable accessibilityLabel={`Edit ${title}`} onPress={onEdit} style={styles.editButton}><Text style={styles.editButtonText}>Edit</Text></Pressable> : null}
        {onRemove ? <Pressable accessibilityLabel={`Remove ${title}`} onPress={onRemove} style={styles.removeButton}><Text style={styles.removeButtonText}>Remove</Text></Pressable> : null}
      </View>
    </View>
  );
}

function FoodLibrary({
  query,
  results,
  error,
  isSearching,
  onQueryChange,
  onSearch,
  onAddFood,
  onAddAiFood,
  onChooseFood,
  selectedCategory,
  onCategoryChange,
  onEditFood,
  onDeleteFood,
}: {
  query: string;
  results: Food[];
  error: string;
  isSearching: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onAddFood: () => void;
  onAddAiFood: () => void;
  onChooseFood: (food: Food) => void;
  selectedCategory: MealCategory;
  onCategoryChange: (category: MealCategory) => void;
  onEditFood: (food: Food) => void;
  onDeleteFood: (food: Food) => void;
}) {
  return (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>FOOD DATABASE</Text>
          <Text style={styles.title}>Find your food</Text>
        </View>
      </View>
      <View style={styles.searchRow}>
        <TextInput
          autoCapitalize="none"
          placeholder="Search banana, chicken..."
          placeholderTextColor="#9ca49e"
          value={query}
          onChangeText={onQueryChange}
          onSubmitEditing={onSearch}
          returnKeyType="search"
          style={styles.searchInput}
        />
        <Pressable accessibilityLabel="Add a new food" onPress={onAddFood} style={styles.plusButton}>
          <Text style={styles.plusButtonText}>+</Text>
        </Pressable>
      </View>
      <Pressable accessibilityRole="button" onPress={onAddAiFood} style={styles.aiAddButton}>
        <Text style={styles.aiAddButtonText}>⚡ Add food with AI</Text>
      </Pressable>
      <Text style={styles.inputLabel}>Add to meal</Text>
      <View style={styles.categoryRow}>
        {(['breakfast', 'lunch', 'dinner'] as MealCategory[]).map((category) => (
          <Pressable key={category} accessibilityRole="button" onPress={() => onCategoryChange(category)} style={[styles.categoryButton, selectedCategory === category && styles.categoryButtonActive]}>
            <Text style={[styles.categoryButtonText, selectedCategory === category && styles.categoryButtonTextActive]}>{category.charAt(0).toUpperCase() + category.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.searchHint}>Searches saved foods. Showing up to 10 results.</Text>
      {isSearching && <Text style={styles.statusText}>Searching...</Text>}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!isSearching && query.trim() && results.length === 0 && !error && (
        <Text style={styles.emptySearch}>No saved foods found.</Text>
      )}
      {results.map((food) => (
        <View key={food.id} style={styles.foodResult}>
          <View style={styles.foodResultInfo}>
            <Text style={styles.foodResultName}>{food.name}</Text>
            <Text style={styles.foodResultDetail}>{food.serving_size_grams} g serving · {food.protein} g protein</Text>
          </View>
          <Text style={styles.foodResultCalories}>{Math.round(food.calories)} kcal</Text>
          <View style={styles.foodResultActions}>
            <Pressable accessibilityLabel={`Add ${food.name}`} onPress={() => onChooseFood(food)} style={styles.foodActionButton}><Text style={styles.foodActionText}>Add</Text></Pressable>
            <Pressable accessibilityLabel={`Edit ${food.name}`} onPress={() => onEditFood(food)} style={styles.foodActionButton}><Text style={styles.foodActionText}>Edit</Text></Pressable>
            <Pressable accessibilityLabel={`Delete ${food.name}`} onPress={() => onDeleteFood(food)} style={styles.foodActionButton}><Text style={styles.foodDeleteText}>Delete</Text></Pressable>
          </View>
        </View>
      ))}
    </>
  );
}

function Tab({ label, icon, active = false, onPress }: { label: string; icon: string; active?: boolean; onPress?: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.tab}><Text style={[styles.tabIcon, active && styles.activeTab]}>{icon}</Text><Text style={[styles.tabLabel, active && styles.activeTab]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  loginScreen: { flex: 1, backgroundColor: '#f8f7f2' },
  loginKeyboardView: { flex: 1 },
  loginScrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26, paddingVertical: 28 },
  loginContent: { justifyContent: 'center' },
  loginEyebrow: { color: '#bd6649', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  loginTitle: { color: '#1e302b', fontSize: 34, fontWeight: '700', marginTop: 10 },
  loginSubtitle: { color: '#69736d', fontSize: 15, marginTop: 8, marginBottom: 28 },
  loginInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce2da', borderRadius: 12, color: '#1e302b', paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12 },
  loginError: { color: '#bd493f', fontSize: 13, marginBottom: 12 },
  loginButton: { backgroundColor: '#1f3a33', borderRadius: 12, alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  loginButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  authSwitchButton: { alignItems: 'center', paddingVertical: 16 },
  authSwitchText: { color: '#bd6649', fontSize: 13, fontWeight: '700' },
  safeArea: { flex: 1, backgroundColor: '#f8f7f2' },
  keyboardArea: { flex: 1 },
  container: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 120,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  dateNavigator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  dateNavigatorCenter: { alignItems: 'center', flex: 1 },
  dateNavigatorLabel: { color: '#bd6649', fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  dateNavigatorDate: { color: '#1e302b', fontSize: 14, fontWeight: '700', marginTop: 4 },
  dateButton: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dateButtonDisabled: { opacity: 0.35 },
  dateButtonText: { color: '#1f3a33', fontSize: 28, lineHeight: 30 },
  eyebrow: { color: '#7e857f', fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  title: { color: '#1e302b', fontSize: 26, fontWeight: '700', marginTop: 7 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dcebe1', justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 44, height: 44, borderRadius: 22 },
  avatarText: { color: '#32604f', fontSize: 17, fontWeight: '700' },
  heroCard: { backgroundColor: '#1f3a33', borderRadius: 24, padding: 22, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroCopy: { flex: 1 },
  cardEyebrow: { color: '#a6c1af', fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  calories: { color: '#f8f7f2', fontSize: 35, fontWeight: '700', marginTop: 9 },
  calorieUnit: { fontSize: 15, fontWeight: '500', color: '#b8c9bf' },
  remaining: { color: '#b8c9bf', fontSize: 13, marginTop: 2 },
  progressTrack: { height: 7, backgroundColor: '#466359', borderRadius: 5, marginTop: 18, marginRight: 22 },
  progressFill: { height: 7, width: '64%', backgroundColor: '#ef9a67', borderRadius: 5 },
  progressLabel: { color: '#e2eee5', fontSize: 12, marginTop: 8 },
  ring: { width: 92, height: 92, borderRadius: 46, borderWidth: 8, borderColor: '#ef9a67', justifyContent: 'center', alignItems: 'center' },
  ringInner: { alignItems: 'center' },
  ringValue: { color: '#f8f7f2', fontSize: 17, fontWeight: '700' },
  ringLabel: { color: '#b8c9bf', fontSize: 10, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12 },
  sectionTitle: { color: '#1e302b', fontSize: 18, fontWeight: '700' },
  sectionMeta: { color: '#89928c', fontSize: 12 },
  link: { color: '#bd6649', fontSize: 13, fontWeight: '700' },
  macroRow: { flexDirection: 'row', gap: 9 },
  macroCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 13, minHeight: 116 },
  macroDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 10 },
  macroLabel: { color: '#69736d', fontSize: 12 },
  macroValue: { color: '#1e302b', fontSize: 19, fontWeight: '700', marginTop: 5 },
  macroTarget: { color: '#a0a7a1', fontSize: 11, marginTop: 2 },
  macroTrack: { height: 4, backgroundColor: '#edf0ea', borderRadius: 3, marginTop: 12 },
  macroFill: { height: 4, borderRadius: 3 },
  mealRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 9 },
  emptyMeal: { backgroundColor: '#f1f2ed', borderWidth: 1, borderColor: '#dce2da', borderStyle: 'dashed' },
  mealIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#f8e8dc', justifyContent: 'center', alignItems: 'center' },
  mealIconText: { color: '#c66d4e', fontSize: 18 },
  mealInfo: { flex: 1, marginLeft: 12 },
  mealActions: { alignItems: 'flex-end', marginLeft: 8 },
  editButton: { paddingTop: 7 },
  editButtonText: { color: '#32604f', fontSize: 11, fontWeight: '700' },
  mealTitle: { color: '#263831', fontSize: 14, fontWeight: '700' },
  mealDetail: { color: '#88928b', fontSize: 12, marginTop: 4 },
  mealCalories: { color: '#53645a', fontSize: 12, fontWeight: '700' },
  emptyCalories: { color: '#bd6649' },
  removeButton: { paddingTop: 7 },
  removeButtonText: { color: '#bd493f', fontSize: 11, fontWeight: '700' },
  addButton: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, backgroundColor: '#ef9a67', padding: 16, marginTop: 10 },
  addIcon: { color: '#fff', fontSize: 25, marginRight: 12 },
  addTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  addSubtitle: { color: '#fff4ed', fontSize: 11, marginTop: 3 },
  addMoreButton: { backgroundColor: '#1f3a33', borderRadius: 12, paddingVertical: 12, marginTop: 12, alignItems: 'center' },
  addMoreButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  placeholderCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, marginTop: 32, alignItems: 'center' },
  placeholderTitle: { color: '#1e302b', fontSize: 24, fontWeight: '700' },
  placeholderSubtitle: { color: '#69736d', fontSize: 14, marginTop: 8, textAlign: 'center' },
  profileCard: { backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center' },
  profileAvatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#dcebe1', alignItems: 'center', justifyContent: 'center' },
  profileAvatarImage: { width: 68, height: 68, borderRadius: 34 },
  profileAvatarText: { color: '#32604f', fontSize: 26, fontWeight: '700' },
  profileEmail: { color: '#1e302b', fontSize: 17, fontWeight: '700', marginTop: 14 },
  changePhotoText: { color: '#bd6649', fontSize: 12, fontWeight: '700', marginTop: 7 },
  profileHint: { color: '#69736d', fontSize: 13, marginTop: 7, textAlign: 'center' },
  goalsCard: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginTop: 14 },
  calculateButton: { backgroundColor: '#e9f4ef', borderRadius: 10, alignItems: 'center', paddingVertical: 11, marginBottom: 14 },
  calculateButtonText: { color: '#1f3a33', fontSize: 13, fontWeight: '700' },
  calculatedGoalsRow: { gap: 8 },
  calculatedGoal: { backgroundColor: '#f1f5ef', borderRadius: 10, padding: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calculatedGoalLabel: { color: '#69736d', fontSize: 13 },
  calculatedGoalValue: { color: '#1e302b', fontSize: 14, fontWeight: '700' },
  modifyGoalsButton: { alignItems: 'center', paddingVertical: 13 },
  modifyGoalsText: { color: '#bd6649', fontSize: 13, fontWeight: '700' },
  signOutButton: { borderWidth: 1, borderColor: '#bd493f', borderRadius: 12, alignItems: 'center', paddingVertical: 13, marginTop: 16 },
  signOutText: { color: '#bd493f', fontSize: 14, fontWeight: '700' },
  insightHero: { backgroundColor: '#1f3a33', borderRadius: 20, padding: 20 },
  insightCalories: { color: '#f8f7f2', fontSize: 34, fontWeight: '700', marginTop: 8 },
  insightMacroRow: { flexDirection: 'row', gap: 9, marginTop: 12 },
  insightMetric: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 13, minHeight: 92 },
  chartCard: { height: 230, backgroundColor: '#fff', borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  chartColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  chartValue: { color: '#69736d', fontSize: 10, marginBottom: 6 },
  chartTrack: { width: 18, height: 150, backgroundColor: '#edf0ea', borderRadius: 9, justifyContent: 'flex-end', overflow: 'hidden' },
  chartBar: { width: '100%', backgroundColor: '#ef9a67', borderRadius: 9 },
  chartLabel: { color: '#89928c', fontSize: 11, marginTop: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  searchInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce2da', borderRadius: 12, color: '#1e302b', fontSize: 16, paddingHorizontal: 14, paddingVertical: 14 },
  plusButton: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#ef9a67', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  aiAddButton: { backgroundColor: '#e9f4ef', borderRadius: 12, paddingVertical: 12, marginTop: 12, alignItems: 'center' },
  aiAddButtonText: { color: '#1f3a33', fontSize: 14, fontWeight: '700' },
  categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  categoryButton: { flex: 1, borderWidth: 1, borderColor: '#dce2da', borderRadius: 10, alignItems: 'center', paddingVertical: 10 },
  categoryButtonActive: { backgroundColor: '#1f3a33', borderColor: '#1f3a33' },
  categoryButtonText: { color: '#53645a', fontSize: 12, fontWeight: '700' },
  categoryButtonTextActive: { color: '#fff' },
  plusButtonText: { color: '#fff', fontSize: 30, fontWeight: '400', lineHeight: 32 },
  searchHint: { color: '#89928c', fontSize: 12, marginTop: 10, marginBottom: 16 },
  emptySearch: { color: '#69736d', fontSize: 14, marginTop: 22, textAlign: 'center' },
  foodResult: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 9 },
  foodResultInfo: { flex: 1 },
  foodResultName: { color: '#263831', fontSize: 15, fontWeight: '700' },
  foodResultDetail: { color: '#88928b', fontSize: 12, marginTop: 5 },
  foodResultCalories: { color: '#53645a', fontSize: 13, fontWeight: '700', marginLeft: 10 },
  foodResultActions: { flexDirection: 'row', gap: 6, marginLeft: 8 },
  foodActionButton: { paddingHorizontal: 5, paddingVertical: 4 },
  foodActionText: { color: '#32604f', fontSize: 11, fontWeight: '700' },
  foodDeleteText: { color: '#bd493f', fontSize: 11, fontWeight: '700' },
  form: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 12 },
  modalKeyboardArea: { flex: 1 },
  modalContent: { width: '100%' },
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(30, 48, 43, 0.35)', padding: 18 },
  formHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  formContent: { paddingBottom: 8 },
  confirmCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18 },
  confirmText: { color: '#53645a', fontSize: 15, lineHeight: 22, marginBottom: 14 },
  formTitle: { color: '#1e302b', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  closeButton: { color: '#bd6649', fontSize: 14, fontWeight: '700' },
  formHint: { color: '#69736d', fontSize: 12, lineHeight: 18, marginBottom: 14 },
  inputLabel: { color: '#53645a', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#dce2da', borderRadius: 10, color: '#1e302b', fontSize: 16, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 14 },
  aiTextInput: { minHeight: 120, textAlignVertical: 'top', paddingTop: 14 },
  selectedImagePanel: { backgroundColor: '#f1f5ef', borderRadius: 12, padding: 10, marginBottom: 14 },
  selectedImage: { width: '100%', height: 180, borderRadius: 10, backgroundColor: '#dce2da' },
  selectedImageName: { color: '#53645a', fontSize: 12, marginVertical: 8 },
  saveButton: { backgroundColor: '#1f3a33', borderRadius: 10, alignItems: 'center', paddingVertical: 12 },
  saveButtonText: { color: '#fff', fontWeight: '700' },
  skipButton: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  skipButtonText: { color: '#bd6649', fontWeight: '700' },
  statusText: { color: '#69736d', fontSize: 13, marginBottom: 10 },
  errorText: { color: '#bd493f', fontSize: 13, marginBottom: 10 },
  tabBar: { height: 76, borderTopWidth: 1, borderTopColor: '#e8e9e2', backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12 },
  tab: { alignItems: 'center', minWidth: 60 },
  tabIcon: { color: '#9ca49e', fontSize: 21, height: 27 },
  tabLabel: { color: '#9ca49e', fontSize: 11, marginTop: 3 },
  activeTab: { color: '#bd6649', fontWeight: '700' },
});
