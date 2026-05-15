const BASE_URL =
  'http://192.168.29.222:8000';

export async function getProducts() {
  const response =
    await fetch(
      `${BASE_URL}/products`
    );

  if (!response.ok) {
    throw new Error(
      'Failed to fetch products'
    );
  }

  return response.json();
}

export async function getProductsByCategory(
  categoryId: number
) {
  const response =
    await fetch(
      `${BASE_URL}/products/category/${categoryId}`
    );

  if (!response.ok) {
    throw new Error(
      'Failed to fetch category products'
    );
  }

  return response.json();
}

export async function searchProducts(
  query: string
) {
  const response =
    await fetch(
      `${BASE_URL}/products/search?q=${query}`
    );

  if (!response.ok) {
    throw new Error(
      'Search failed'
    );
  }

  return response.json();
}

export async function getTrendingProducts() {
  const response =
    await fetch(
      `${BASE_URL}/products/trending`
    );

  return response.json();
}