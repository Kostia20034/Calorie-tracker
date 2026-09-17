const API_BASE_URL = 'http://10.0.0.4:8000/v1/api';

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

export async function getDailyMenu(token: string, date: string): Promise<DailyMenu> {
  const response = await fetch(`${API_BASE_URL}/menu?date=${encodeURIComponent(date)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Unable to load today\'s menu');
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
): Promise<MenuItem> {
  const response = await fetch(`${API_BASE_URL}/menu/items`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ date, food_id: foodId, quantity }),
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
