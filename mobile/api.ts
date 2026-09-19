import { Platform } from 'react-native';

const API_BASE_URL = `${Platform.OS === 'web' ? 'http://localhost:8001' : 'http://10.0.0.4:8001'}/v1/api`;

async function getApiError(response: Response, fallback: string): Promise<string> {
  try {
    const body: { detail?: string } = await response.json();
    return body.detail || fallback;
  } catch {
    return fallback;
  }
}

export type MealCategory = 'breakfast' | 'lunch' | 'dinner';

export type MenuItem = {
  id: number;
  category: 'breakfast' | 'lunch' | 'dinner';
  quantity: number;
  food_name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DailyMenu = {
  date: string;
  items: MenuItem[];
  totals: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

export type DailyInsight = {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Insights = {
  start_date: string;
  end_date: string;
  logged_days: number;
  average_calories: number;
  average_protein: number;
  average_carbs: number;
  average_fat: number;
  days: DailyInsight[];
};

export type User = {
  id: number;
  email: string;
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
};

export type Food = {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size_grams: number;
};

export async function login(email: string, password: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
  });

  if (!response.ok) {
    throw new Error('Invalid email or password');
  }

  const data: { access_token: string } = await response.json();
  return data.access_token;
}

export async function register(email: string, password: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new Error('That email is already registered');
    }
    throw new Error('Unable to create account');
  }

  return response.json();
}

export async function getCurrentUser(token: string): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Session expired');
  }

  return response.json();
}

export async function updateGoals(token: string, goals: Omit<User, 'id' | 'email'>): Promise<User> {
  const response = await fetch(`${API_BASE_URL}/auth/goals`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(goals),
  });

  if (!response.ok) {
    throw new Error('Unable to save goals');
  }

  return response.json();
}

export async function getDailyMenu(token: string, date: string): Promise<DailyMenu> {
  const response = await fetch(`${API_BASE_URL}/menu?date=${encodeURIComponent(date)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Unable to load today\'s menu');
  }

  return response.json();
}

export async function getInsights(token: string): Promise<Insights> {
  const response = await fetch(`${API_BASE_URL}/insights`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Unable to load insights');
  }

  return response.json();
}

export async function createManualFood(
  token: string,
  food: Omit<Food, 'id'>,
): Promise<Food> {
  const response = await fetch(`${API_BASE_URL}/foods/manual`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(food),
  });

  if (!response.ok) {
    throw new Error('Unable to save food');
  }

  return response.json();
}

export async function updateFood(token: string, food: Food): Promise<Food> {
  const response = await fetch(`${API_BASE_URL}/foods/${food.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(food),
  });

  if (!response.ok) {
    throw new Error('Unable to update food');
  }

  return response.json();
}

export async function deleteFood(token: string, foodId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/foods/${foodId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Unable to delete food');
  }
}

export async function addImageMealToToday(
  token: string,
  date: string,
  imageUri: string,
  imageName: string,
  imageType = 'image/jpeg',
  category: MealCategory = 'lunch',
): Promise<DailyMenu> {
  const imageResponse = await fetch(imageUri);
  if (!imageResponse.ok) {
    throw new Error('Unable to read selected image');
  }

  const imageBlob = await imageResponse.blob();
  const formData = new FormData();
  formData.append('image', imageBlob, imageName);

  const response = await fetch(`${API_BASE_URL}/menu/from-image?date=${encodeURIComponent(date)}&category=${encodeURIComponent(category)}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await getApiError(response, 'Unable to save photo meal'));
  }

  const result = await response.json();
  return {
    date: result.date,
    items: result.items,
    totals: result.totals,
  };
}

export async function createFoodFromDescription(
  token: string,
  description: string,
): Promise<Food> {
  const response = await fetch(`${API_BASE_URL}/foods/from-description`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ description }),
  });

  if (!response.ok) {
    throw new Error(await getApiError(response, 'Unable to save food from description'));
  }

  return response.json();
}

export async function searchFoods(token: string, name: string): Promise<Food[]> {
  const response = await fetch(`${API_BASE_URL}/foods/search?name=${encodeURIComponent(name)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Unable to search foods');
  }

  const foods: Food[] = await response.json();
  return foods.slice(0, 10);
}

export async function addMenuItem(
  token: string,
  date: string,
  foodId: number,
  quantity: number,
  category: MealCategory,
): Promise<MenuItem> {
  const response = await fetch(`${API_BASE_URL}/menu/items`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date, food_id: foodId, quantity, category }),
  });

  if (!response.ok) {
    throw new Error('Unable to add food to today');
  }

  return response.json();
}

export async function updateMenuItem(
  token: string,
  itemId: number,
  quantity: number,
): Promise<MenuItem> {
  const response = await fetch(`${API_BASE_URL}/menu/items/${itemId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quantity }),
  });

  if (!response.ok) {
    throw new Error('Unable to update meal item');
  }

  return response.json();
}

export async function deleteMenuItem(token: string, itemId: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/menu/items/${itemId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Unable to remove food from today');
  }
}
