import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addMenuItem, createManualFood, DailyMenu, deleteMenuItem, Food, getDailyMenu, login, MenuItem, searchFoods, updateMenuItem } from './api';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const [foodProtein, setFoodProtein] = useState('');
  const [foodCarbs, setFoodCarbs] = useState('');
  const [foodFat, setFoodFat] = useState('');
  const [foodServingGrams, setFoodServingGrams] = useState('');
  const [foodError, setFoodError] = useState('');
  const [isSavingFood, setIsSavingFood] = useState(false);
  const [savedFood, setSavedFood] = useState<Food | null>(null);
  const [showAddToToday, setShowAddToToday] = useState(false);
  const [menuActionError, setMenuActionError] = useState('');
  const [isAddingToToday, setIsAddingToToday] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'food'>('today');
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
      const food = await createManualFood(token, {
        name: foodName.trim(),
        calories,
        protein,
        carbs,
        fat,
        serving_size_grams: servingSizeGrams,
      });
      setSavedFood(food);
      setShowFoodForm(false);
      setShowAddToToday(true);
    } catch (error) {
      setFoodError(error instanceof Error ? error.message : 'Unable to save food');
    } finally {
      setIsSavingFood(false);
    }
  }

  async function addSavedFoodToToday() {
    if (!token || !savedFood) {
      return;
    }

    setMenuActionError('');
    setIsAddingToToday(true);
    try {
      await addMenuItem(token, new Date().toISOString().slice(0, 10), savedFood.id, 1);
      const updatedMenu = await getDailyMenu(token, new Date().toISOString().slice(0, 10));
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
    } catch (error) {
      setMenuActionError(error instanceof Error ? error.message : 'Unable to add food to today');
    } finally {
      setIsAddingToToday(false);
    }
  }

  async function removeMenuItem(itemId: number) {
    if (!token) {
      return;
    }

    setMenuActionError('');
    try {
      await deleteMenuItem(token, itemId);
      const updatedMenu = await getDailyMenu(token, new Date().toISOString().slice(0, 10));
      setMenu(updatedMenu);
      setLoggedCalories(updatedMenu.totals.calories);
    } catch (error) {
      setMenuActionError(error instanceof Error ? error.message : 'Unable to remove food from today');
    }
  }

  async function searchFoodDatabase(query = foodQuery) {
    if (!token || !query.trim()) {
      setFoodResults([]);
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
    setSavedFood(food);
    setMenuActionError('');
    setShowAddToToday(true);
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
      const updatedMenu = await getDailyMenu(token, new Date().toISOString().slice(0, 10));
      setMenu(updatedMenu);
      setLoggedCalories(updatedMenu.totals.calories);
      setEditingItem(null);
    } catch (error) {
      setMenuActionError(error instanceof Error ? error.message : 'Unable to update meal item');
    } finally {
      setIsSavingEdit(false);
    }
  }

  const remainingCalories = Math.max(2000 - loggedCalories, 0);
  const progress = Math.min(loggedCalories / 2000, 1);

  useEffect(() => {
    if (!token) {
      return;
    }

    let isActive = true;
    setIsLoadingMenu(true);
    setMenuError('');
    const today = new Date().toISOString().slice(0, 10);

    getDailyMenu(token, today)
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
  }, [token]);

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

  async function handleLogin() {
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const accessToken = await login(email, password);
      setToken(accessToken);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Unable to sign in');
    } finally {
      setIsLoggingIn(false);
    }
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.loginScreen}>
        <StatusBar style="dark" />
        <View style={styles.loginContent}>
          <Text style={styles.loginEyebrow}>CALORIE TRACKER</Text>
          <Text style={styles.loginTitle}>Welcome back</Text>
          <Text style={styles.loginSubtitle}>Sign in to see your daily nutrition.</Text>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email"
            placeholderTextColor="#9ca49e"
            value={email}
            onChangeText={setEmail}
            style={styles.loginInput}
          />
          <TextInput
            placeholder="Password"
            placeholderTextColor="#9ca49e"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={styles.loginInput}
          />
          {loginError ? <Text style={styles.loginError}>{loginError}</Text> : null}
          <Pressable accessibilityRole="button" onPress={handleLogin} style={styles.loginButton} disabled={isLoggingIn}>
            <Text style={styles.loginButtonText}>{isLoggingIn ? 'Signing in...' : 'Sign in'}</Text>
          </Pressable>
        </View>
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
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {activeTab === 'food' ? (
            <FoodLibrary
              query={foodQuery}
              results={foodResults}
              error={foodSearchError}
              isSearching={isSearchingFoods}
              onQueryChange={setFoodQuery}
              onSearch={searchFoodDatabase}
              onAddFood={() => setShowFoodForm(true)}
              onChooseFood={chooseFoodForToday}
            />
          ) : (
            <>
              <View style={styles.header}>
                <View>
                  <Text style={styles.eyebrow}>SUNDAY, SEPTEMBER 13</Text>
                  <Text style={styles.title}>Good morning, Alex</Text>
                </View>
                <Pressable accessibilityLabel="Open profile" style={styles.avatar}>
                  <Text style={styles.avatarText}>A</Text>
                </Pressable>
              </View>

              <View style={styles.heroCard}>
                <View style={styles.heroCopy}>
                  <Text style={styles.cardEyebrow}>TODAY'S BALANCE</Text>
                  <Text style={styles.calories}>{loggedCalories.toLocaleString()}<Text style={styles.calorieUnit}> kcal</Text></Text>
                  <Text style={styles.remaining}>of 2,000 daily goal</Text>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={styles.progressLabel}>{remainingCalories} kcal remaining</Text>
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
                <Macro label="Protein" value={`${Math.round(menu?.totals.protein ?? 0)}g`} target="120g" color="#ee7b52" progress={(menu?.totals.protein ?? 0) / 120} />
                <Macro label="Carbs" value={`${Math.round(menu?.totals.carbs ?? 0)}g`} target="250g" color="#e4b64a" progress={(menu?.totals.carbs ?? 0) / 250} />
                <Macro label="Fat" value={`${Math.round(menu?.totals.fat ?? 0)}g`} target="65g" color="#5f9f8c" progress={(menu?.totals.fat ?? 0) / 65} />
              </View>

              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Today's meals</Text>
                <Pressable accessibilityRole="button"><Text style={styles.link}>View all</Text></Pressable>
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
              {!isLoadingMenu && !menuError && menu?.items.length === 0 && (
                <MealRow icon="＋" title="No meals yet" detail="Add your first food today" calories="Add meal" empty />
              )}

            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.tabBar}>
        <Tab label="Today" icon="◉" active={activeTab === 'today'} onPress={() => setActiveTab('today')} />
        <Tab label="Food" icon="⌕" active={activeTab === 'food'} onPress={() => setActiveTab('food')} />
        <Tab label="Insights" icon="▥" />
        <Tab label="Profile" icon="○" />
      </View>
      <Modal visible={showFoodForm} animationType="slide" transparent onRequestClose={() => setShowFoodForm(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalKeyboardArea}
        >
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.form} contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Add food to database</Text>
                <Pressable accessibilityLabel="Close add food form" onPress={() => setShowFoodForm(false)}>
                  <Text style={styles.closeButton}>Cancel</Text>
                </Pressable>
              </View>
              <Text style={styles.formHint}>Save the base serving first. We will ask separately whether you want to add it to today.</Text>
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
                <Text style={styles.saveButtonText}>{isSavingFood ? 'Saving...' : 'Save food'}</Text>
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={showAddToToday} animationType="fade" transparent onRequestClose={() => setShowAddToToday(false)}>
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>
      <Modal visible={editingItem !== null} animationType="fade" transparent onRequestClose={() => setEditingItem(null)}>
        <View style={styles.modalOverlay}>
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
        </View>
      </Modal>
    </SafeAreaView>
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
  onChooseFood,
}: {
  query: string;
  results: Food[];
  error: string;
  isSearching: boolean;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onAddFood: () => void;
  onChooseFood: (food: Food) => void;
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
      <Text style={styles.searchHint}>Searches saved foods. Showing up to 10 results.</Text>
      {isSearching && <Text style={styles.statusText}>Searching...</Text>}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!isSearching && query.trim() && results.length === 0 && !error && (
        <Text style={styles.emptySearch}>No saved foods found.</Text>
      )}
      {results.map((food) => (
        <Pressable key={food.id} accessibilityRole="button" onPress={() => onChooseFood(food)} style={styles.foodResult}>
          <View style={styles.foodResultInfo}>
            <Text style={styles.foodResultName}>{food.name}</Text>
            <Text style={styles.foodResultDetail}>{food.serving_size_grams} g serving · {food.protein} g protein</Text>
          </View>
          <Text style={styles.foodResultCalories}>{Math.round(food.calories)} kcal</Text>
        </Pressable>
      ))}
    </>
  );
}

function Tab({ label, icon, active = false, onPress }: { label: string; icon: string; active?: boolean; onPress?: () => void }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={styles.tab}><Text style={[styles.tabIcon, active && styles.activeTab]}>{icon}</Text><Text style={[styles.tabLabel, active && styles.activeTab]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  loginScreen: { flex: 1, backgroundColor: '#f8f7f2' },
  loginContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 26 },
  loginEyebrow: { color: '#bd6649', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  loginTitle: { color: '#1e302b', fontSize: 34, fontWeight: '700', marginTop: 10 },
  loginSubtitle: { color: '#69736d', fontSize: 15, marginTop: 8, marginBottom: 28 },
  loginInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce2da', borderRadius: 12, color: '#1e302b', paddingHorizontal: 14, paddingVertical: 13, marginBottom: 12 },
  loginError: { color: '#bd493f', fontSize: 13, marginBottom: 12 },
  loginButton: { backgroundColor: '#1f3a33', borderRadius: 12, alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  loginButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  safeArea: { flex: 1, backgroundColor: '#f8f7f2' },
  keyboardArea: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 30,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  eyebrow: { color: '#7e857f', fontSize: 11, fontWeight: '700', letterSpacing: 1.4 },
  title: { color: '#1e302b', fontSize: 26, fontWeight: '700', marginTop: 7 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#dcebe1', justifyContent: 'center', alignItems: 'center' },
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
  searchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  searchInput: { flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dce2da', borderRadius: 12, color: '#1e302b', fontSize: 16, paddingHorizontal: 14, paddingVertical: 14 },
  plusButton: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#ef9a67', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  plusButtonText: { color: '#fff', fontSize: 30, fontWeight: '400', lineHeight: 32 },
  searchHint: { color: '#89928c', fontSize: 12, marginTop: 10, marginBottom: 16 },
  emptySearch: { color: '#69736d', fontSize: 14, marginTop: 22, textAlign: 'center' },
  foodResult: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, padding: 15, marginBottom: 9 },
  foodResultInfo: { flex: 1 },
  foodResultName: { color: '#263831', fontSize: 15, fontWeight: '700' },
  foodResultDetail: { color: '#88928b', fontSize: 12, marginTop: 5 },
  foodResultCalories: { color: '#53645a', fontSize: 13, fontWeight: '700', marginLeft: 10 },
  form: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginTop: 12 },
  modalKeyboardArea: { flex: 1 },
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
