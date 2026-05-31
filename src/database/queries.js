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
        lat,
        lng,
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
        latitude: d.businesses?.lat,
        longitude: d.businesses?.lng,
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
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
      }
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('Signup failed: No user returned');

  // 2. Create Profile in public.profiles
  // We use .upsert instead of .insert because Supabase often has an auth.users trigger
  // that automatically creates a blank profile row, which would cause a duplicate key error.
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: authData.user.id,
      first_name: firstName,
      last_name: lastName,
      district_id: districtId,
      city_id: cityId,
      trust_score: 1.0
    }, { onConflict: 'id' });

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
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('getHomeStats timeout')), 5000));

  const fetchPromise = Promise.all([
    supabase.from('cities').select('*', { count: 'estimated', head: true }),
    supabase.from('businesses').select('*', { count: 'estimated', head: true }),
    supabase.from('reviews').select('*', { count: 'estimated', head: true }),
  ]);

  const [citiesRes, businessesRes, reviewsRes] = await Promise.race([fetchPromise, timeout]);

  if (citiesRes?.error) throw new Error(`getHomeStats/cities: ${citiesRes.error.message}`);
  if (businessesRes?.error) throw new Error(`getHomeStats/businesses: ${businessesRes.error.message}`);
  if (reviewsRes?.error) throw new Error(`getHomeStats/reviews: ${reviewsRes.error.message}`);

  return {
    cities: citiesRes.count || 0,
    restaurants: businessesRes.count || 0,
    reviews: reviewsRes.count || 0,
  };
};


// NOTE: The canonical getRankedRestaurants is in SearchQueries.js.
// That file contains the fuzzy-search, Levenshtein distance, and structured
// location-filter logic used by both SearchScreen and RankingsScreen.

// ─── SAVED DISHES (Wishlist / "Next Time") ────────────────────────────────────

/** Returns true if the user has already saved this dish */
export const isDishSaved = async (userId, dishId) => {
  const { data, error } = await supabase
    .from('saved_dishes')
    .select('id')
    .eq('user_id', userId)
    .eq('dish_id', dishId)
    .maybeSingle();
  if (error) throw new Error(`isDishSaved: ${error.message}`);
  return !!data;
};

/** Inserts a saved_dishes row; throws on error */
export const saveDish = async (userId, dishId) => {
  const { error } = await supabase
    .from('saved_dishes')
    .insert({ user_id: userId, dish_id: dishId });
  if (error) {
    console.error("Supabase Save Error:", error);
    throw new Error(`saveDish: ${error.message}`);
  }
};

/** Deletes the saved_dishes row for this user + dish */
export const unsaveDish = async (userId, dishId) => {
  const { error } = await supabase
    .from('saved_dishes')
    .delete()
    .eq('user_id', userId)
    .eq('dish_id', dishId);
  if (error) throw new Error(`unsaveDish: ${error.message}`);
};

/**
 * Fetches all saved dishes for a user, newest first.
 * Returns dish objects shaped identically to getRankedDishes output so
 * DishCard can render them without any massaging.
 *
 * Score calculation: uses the global average of ALL dishes (not just saved ones)
 * as the Bayesian prior C, so a dish with 0 reviews shows a fair prior score
 * instead of a misleading 0.0.
 */
export const getSavedDishes = async (userId) => {
  // ── 1. Fetch global prior from ALL dishes (same as getRankedDishes does) ──
  const { data: allDishes, error: globalErr } = await supabase
    .from('dishes')
    .select('avg_rating, review_count');

  if (globalErr) {
    console.error('Fetch Saved Dishes Error (global prior):', globalErr);
  }

  const BAYESIAN_M = 10;
  const allRatings = (allDishes || []).map(d => d.avg_rating || 0);
  const C = allRatings.length > 0
    ? allRatings.reduce((s, r) => s + r, 0) / allRatings.length
    : 4.0;

  // ── 2. Fetch saved dishes with full dish + business join ──────────────────
  const { data, error } = await supabase
    .from('saved_dishes')
    .select(`
      id,
      dish_id,
      created_at,
      dishes (
        id,
        name,
        avg_rating,
        review_count,
        businesses (
          id,
          name,
          address,
          cities ( id, name )
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Fetch Saved Dishes Error:', error);
    throw new Error(`getSavedDishes: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  return data
    .filter(row => !!row.dishes)
    .map(row => {
      const d = row.dishes;
      const R = d.avg_rating || 0;
      const v = d.review_count || 0;
      // Bayesian weighted score using global prior — same formula as getRankedDishes
      const weighted_score = (R * v + C * BAYESIAN_M) / (v + BAYESIAN_M);

      return {
        id:            d.id,
        name:          d.name,
        avg_rating:    R,
        review_count:  v,
        weighted_score,
        business_id:   d.businesses?.id,
        business_name: d.businesses?.name || '—',
        address:       d.businesses?.address || '',
        city_name:     d.businesses?.cities?.name || '—',
        savedRowId:    row.id,
      };
    });
};
