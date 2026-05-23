import { supabase } from './supabaseClient';

const BAYESIAN_M = 10; // minimum votes threshold

// ─── CATEGORIES ─────────────────────────────────────────────────────────────
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true });
    
  if (error) throw new Error(`getCategories: ${error.message}`);
  return data || [];
};

// ─── DISTRICTS ──────────────────────────────────────────────────────────────
export const getDistricts = async () => {
  const { data, error } = await supabase
    .from('districts')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) throw new Error(`getDistricts: ${error.message}`);
  return data || [];
};

// ─── ALL CITIES ─────────────────────────────────────────────────────────────
export const getCities = async () => {
  const { data, error } = await supabase
    .from('cities')
    .select('id, name')
    .order('name', { ascending: true });

  if (error) throw new Error(`getCities: ${error.message}`);
  return data || [];
};

// ─── CITIES ─────────────────────────────────────────────────────────────────
export const getCitiesByDistrict = async (districtId) => {
  const { data, error } = await supabase
    .from('cities')
    .select('*')
    .eq('district_id', districtId)
    .order('name', { ascending: true });

  if (error) throw new Error(`getCitiesByDistrict: ${error.message}`);
  return data;
};

// ─── RANKED DISHES (Bayesian Average) ─────────────────────────────────────────
// W = (R * v + C * m) / (v + m)
// v = review_count, R = avg_rating, m = BAYESIAN_M, C = global average rating
export const getRankedDishes = async ({ categoryId, districtId, cityId }) => {
  // Build the businesses sub-query filter
  let businessQuery = supabase
    .from('businesses')
    .select('id');

  if (cityId) {
    businessQuery = businessQuery.eq('city_id', cityId);
  } else if (districtId) {
    businessQuery = businessQuery.eq('district_id', districtId);
  }

  const { data: businesses, error: bizError } = await businessQuery;
  
  if (bizError) throw new Error(`getRankedDishes/businesses: ${bizError.message}`);

  const businessIds = businesses.map((b) => b.id);

  if (businessIds.length === 0) {
    return { dishes: [], globalAvg: 0 };
  }

  // Fetch matching dishes with their business + city info via join
  const { data: rawDishes, error: dishError } = await supabase
    .from('dishes')
    .select(`
      id,
      name,
      avg_rating,
      review_count,
      businesses (
        id,
        name,
        address,
        cities (
          id,
          name
        )
      )
    `)
    .eq('category_id', categoryId)
    .in('business_id', businessIds);

  if (dishError) throw new Error(`getRankedDishes/dishes: ${dishError.message}`);

  if (!rawDishes || rawDishes.length === 0) {
    return { dishes: [], globalAvg: 0 };
  }

  // Compute global average rating (C) across this filtered set
  const totalRatingSum = rawDishes.reduce((sum, d) => sum + (d.avg_rating || 0), 0);
  const C = rawDishes.length > 0 ? totalRatingSum / rawDishes.length : 4.0;
  const m = BAYESIAN_M;

  // Apply Bayesian Average: W = (R * v + C * m) / (v + m)
  const dishes = rawDishes
    .map((d) => {
      const R = d.avg_rating || 0;
      const v = d.review_count || 0;
      const weighted_score = (R * v + C * m) / (v + m);

      return {
        id: d.id,
        name: d.name,
        avg_rating: R,
        review_count: v,
        weighted_score,
        business_name: d.businesses?.name || '—',
        business_id: d.businesses?.id,
        address: d.businesses?.address || '',
        city_name: d.businesses?.cities?.name || '—',
      };
    })
    .sort((a, b) => b.weighted_score - a.weighted_score);

  return { dishes, globalAvg: C };
};

// ─── BUSINESSES ──────────────────────────────────────────────────────────────
export const addBusiness = async ({ name, address, cityId, districtId }) => {
  const { data, error } = await supabase
    .from('businesses')
    .insert({ name, address, city_id: cityId, district_id: districtId })
    .select('id')
    .single();

  if (error) throw new Error(`addBusiness: ${error.message}`);
  return data.id;
};

// ─── DISHES ──────────────────────────────────────────────────────────────────
export const addDish = async ({ name, categoryId, businessId, avgRating, reviewCount }) => {
  const { data, error } = await supabase
    .from('dishes')
    .insert({
      name,
      category_id: categoryId,
      business_id: businessId,
      avg_rating: avgRating || 0,
      review_count: reviewCount || 0,
    })
    .select('id')
    .single();

  if (error) throw new Error(`addDish: ${error.message}`);
  return data.id;
};

// ─── REVIEWS & PROFILES (MOCK USER) ───────────────────────────────────────────
export const getOrCreateMockUser = async () => {
  // Try to find the mock user
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('name', 'Ofir')
    .limit(1)
    .single();

  if (data && data.id) {
    return data.id;
  }

  // Create if not exists (assuming id is auto-generated UUID or serial)
  const { data: newProfile, error: insertError } = await supabase
    .from('profiles')
    .insert({ name: 'Ofir', city: 'Tel Aviv' })
    .select('id')
    .single();

  if (insertError) throw new Error(`getOrCreateMockUser: ${insertError.message}`);
  return newProfile.id;
};

export const addReview = async ({ dishId, rating, comment }) => {
  // Fetch the real authenticated user ID
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('אתה חייב להיות מחובר כדי להוסיף דירוג');
  }

  // 1. Insert review
  // The dishes table (avg_rating, review_count) is updated automatically via DB trigger
  const { error: reviewError } = await supabase
    .from('reviews')
    .insert({
      dish_id: dishId,
      user_id: user.id, 
      rating: parseFloat(rating),
      comment: comment || '',
    });

  if (reviewError) {
    console.error('Supabase Insert Review Error:', reviewError);
    throw new Error(`addReview/insert: ${reviewError.message}`);
  }

  return true;
};

export const updateReview = async ({ reviewId, rating, comment }) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('אתה חייב להיות מחובר כדי לעדכן דירוג');
  }

  const { error: reviewError } = await supabase
    .from('reviews')
    .update({
      rating: parseFloat(rating),
      comment: comment || '',
    })
    .eq('id', reviewId)
    .eq('user_id', user.id);

  if (reviewError) {
    console.error('Supabase Update Review Error:', reviewError);
    throw new Error(`updateReview: ${reviewError.message}`);
  }

  return true;
};

// ─── AUTH & PROFILES ────────────────────────────────────────────────────────
export const signUpUser = async ({ email, password, firstName, lastName, districtId, cityId }) => {
  // 1. Supabase Auth Sign Up
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Signup failed: No user returned');

  // 2. Create Profile in public.profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user.id,
      first_name: firstName,
      last_name: lastName,
      district_id: districtId,
      city_id: cityId,
      trust_score: 1.0
    });

  if (profileError) throw profileError;
  return authData.user;
};

export const getProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data; // returns null if no row exists (new Google user)
};

export const upsertProfile = async (userId, fields) => {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...fields }, { onConflict: 'id' });

  if (error) throw error;
};

export const updateProfile = async (userId, fields) => {
  const { error } = await supabase
    .from('profiles')
    .update(fields)
    .eq('id', userId);

  if (error) throw error;
};

// ─── STATISTICS ──────────────────────────────────────────────────────────────
export const getHomeStats = async () => {
  const [citiesRes, businessesRes, reviewsRes] = await Promise.all([
    supabase.from('cities').select('*', { count: 'estimated', head: true }),
    supabase.from('businesses').select('*', { count: 'estimated', head: true }),
    supabase.from('reviews').select('*', { count: 'estimated', head: true }),
  ]);

  if (citiesRes.error) throw new Error(`getHomeStats/cities: ${citiesRes.error.message}`);
  if (businessesRes.error) throw new Error(`getHomeStats/businesses: ${businessesRes.error.message}`);
  if (reviewsRes.error) throw new Error(`getHomeStats/reviews: ${reviewsRes.error.message}`);

  return {
    cities: citiesRes.count || 0,
    restaurants: businessesRes.count || 0,
    reviews: reviewsRes.count || 0,
  };
};


// NOTE: The canonical getRankedRestaurants is in SearchQueries.js.
// That file contains the fuzzy-search, Levenshtein distance, and structured
// location-filter logic used by both SearchScreen and RankingsScreen.
