import { supabase } from './supabaseClient';

const BAYESIAN_M = 10; // minimum votes threshold

// ─── CATEGORIES ─────────────────────────────────────────────────────────────
export const getCategories = async () => {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true });
    
  console.log('Fetched Categories from Supabase:', data);
  if (error) throw new Error(`getCategories: ${error.message}`);
  return data || [];
};

// ─── DISTRICTS ──────────────────────────────────────────────────────────────
export const getDistricts = async () => {
  const { data, error } = await supabase
    .from('districts')
    .select('id, name')
    .order('name', { ascending: true });

  console.log('Fetched Districts from Supabase:', data);
  if (error) throw new Error(`getDistricts: ${error.message}`);
  return data || [];
};

// ─── ALL CITIES ─────────────────────────────────────────────────────────────
export const getCities = async () => {
  const { data, error } = await supabase
    .from('cities')
    .select('id, name')
    .order('name', { ascending: true });

  console.log('Fetched Cities from Supabase:', data);
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
  console.log('getRankedDishes - matching businesses:', businesses);
  
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

  console.log('getRankedDishes - rawDishes fetched:', rawDishes, 'Error:', dishError);

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
    .single();

  if (error) throw error;
  return data;
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

// ─── RANKED RESTAURANTS (Unified Restaurant Search) ──────────────────────────
export const getRankedRestaurants = async ({ nameQuery, locationQuery, selectedCategoryIds, userCityId, userDistrictId }) => {
  console.log('getRankedRestaurants inputs:', { nameQuery, locationQuery, selectedCategoryIds, userCityId, userDistrictId });

  // 1. Fetch all businesses, along with their city/district/dishes
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      address,
      city_id,
      district_id,
      cities (
        id,
        name
      ),
      districts (
        id,
        name
      ),
      dishes (
        id,
        name,
        avg_rating,
        review_count,
        category_id
      )
    `);

  if (error) {
    console.error('getRankedRestaurants fetch error:', error);
    throw new Error(`getRankedRestaurants: ${error.message}`);
  }
  
  if (!businesses || businesses.length === 0) return [];

  // 2. Gather all dishes in the database to calculate category averages (C)
  const allDishes = [];
  businesses.forEach(b => {
    if (b.dishes) {
      b.dishes.forEach(d => {
        allDishes.push(d);
      });
    }
  });

  const categoryAverages = {};
  const categoryGroups = {};
  allDishes.forEach(d => {
    const catId = d.category_id;
    if (!categoryGroups[catId]) {
      categoryGroups[catId] = { sum: 0, count: 0 };
    }
    categoryGroups[catId].sum += (d.avg_rating || 0);
    categoryGroups[catId].count += 1;
  });

  Object.keys(categoryGroups).forEach(catId => {
    const group = categoryGroups[catId];
    categoryAverages[catId] = group.count > 0 ? group.sum / group.count : 4.0;
  });

  const m = BAYESIAN_M;

  // 3. Compute dynamic Smart Score for each business
  let formattedBusinesses = businesses.map(b => {
    let dishScoresSum = 0;
    let validDishesCount = 0;
    let totalReviews = 0;

    if (b.dishes && b.dishes.length > 0) {
      b.dishes.forEach(d => {
        const R = d.avg_rating || 0;
        const v = d.review_count || 0;
        const C = categoryAverages[d.category_id] !== undefined ? categoryAverages[d.category_id] : 4.0;
        const weighted_score = (R * v + C * m) / (v + m);
        
        dishScoresSum += weighted_score;
        validDishesCount += 1;
        totalReviews += v;
      });
    }

    const smartScore = validDishesCount > 0 ? (dishScoresSum / validDishesCount) : 0.0;

    return {
      id: b.id,
      name: b.name,
      address: b.address,
      city_id: b.city_id,
      district_id: b.district_id,
      city_name: b.cities?.name || '—',
      district_name: b.districts?.name || '—',
      smart_score: smartScore,
      review_count: totalReviews,
      dishes: b.dishes || [],
    };
  });

  // 4. Apply Category Multi-select Filter
  if (selectedCategoryIds && selectedCategoryIds.length > 0) {
    formattedBusinesses = formattedBusinesses.filter(b => {
      return b.dishes.some(d => selectedCategoryIds.includes(d.category_id));
    });
  }

  // 5. Apply Name Search Filter (Only keep partial/exact name matches if name query is filled)
  if (nameQuery && nameQuery.trim().length > 0) {
    const nameLower = nameQuery.trim().toLowerCase();
    formattedBusinesses = formattedBusinesses.filter(b => b.name?.toLowerCase().includes(nameLower));
  }

  // 6. Apply Location Filter and Sorting Scenarios
  const hasTypedLocation = locationQuery && locationQuery.trim().length > 0;
  const nameQueryTrimmed = nameQuery ? nameQuery.trim().toLowerCase() : '';

  if (hasTypedLocation) {
    // --- SCENARIO A: Location is manually typed ---
    const locLower = locationQuery.trim().toLowerCase();
    
    // Filter strictly by the typed location
    formattedBusinesses = formattedBusinesses.filter(b => {
      const cityMatch = b.city_name?.toLowerCase().includes(locLower);
      const addressMatch = b.address?.toLowerCase().includes(locLower);
      return cityMatch || addressMatch;
    });

    // Sort order: 1. Exact Name match -> 2. Partial Name match -> 3. Highest Smart Score
    formattedBusinesses.sort((a, b) => {
      const nameA = a.name.trim().toLowerCase();
      const nameB = b.name.trim().toLowerCase();

      if (nameQueryTrimmed) {
        const isExactA = nameA === nameQueryTrimmed;
        const isExactB = nameB === nameQueryTrimmed;
        if (isExactA && !isExactB) return -1;
        if (!isExactA && isExactB) return 1;

        const isPartialA = nameA.includes(nameQueryTrimmed);
        const isPartialB = nameB.includes(nameQueryTrimmed);
        if (isPartialA && !isPartialB) return -1;
        if (!isPartialA && isPartialB) return 1;
      }

      return b.smart_score - a.smart_score;
    });

  } else {
    // --- SCENARIOS B & C: Location is empty ---
    if (userDistrictId) {
      // Filter strictly by user region (district_id)
      formattedBusinesses = formattedBusinesses.filter(b => b.district_id === userDistrictId);
    }

    if (nameQueryTrimmed) {
      // --- SCENARIO B: Contextual Fallback with Name ---
      const getPriority = (item) => {
        const inUserCity = userCityId && item.city_id === userCityId;
        const inRegion = userDistrictId && item.district_id === userDistrictId;
        const restaurantName = item.name.trim().toLowerCase();
        
        const isExact = restaurantName === nameQueryTrimmed;
        const isPartial = restaurantName.includes(nameQueryTrimmed) && !isExact;

        if (inUserCity) {
          if (isExact) return 1;
          if (isPartial) return 2;
          return 3;
        } else if (inRegion) {
          if (isExact) return 4;
          if (isPartial) return 5;
          return 6;
        }
        return 7;
      };

      formattedBusinesses.sort((a, b) => {
        const priorityA = getPriority(a);
        const priorityB = getPriority(b);
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
        return b.smart_score - a.smart_score;
      });

    } else {
      // --- SCENARIO C: Completely Blind Search (No Name, No Location) ---
      // Sort strictly by Highest Smart Score, prioritizing restaurants in the User's specific City first, followed by the rest of the Region.
      formattedBusinesses.sort((a, b) => {
        const inUserCityA = userCityId && a.city_id === userCityId;
        const inUserCityB = userCityId && b.city_id === userCityId;

        if (inUserCityA && !inUserCityB) return -1;
        if (!inUserCityA && inUserCityB) return 1;

        return b.smart_score - a.smart_score;
      });
    }
  }

  console.log(`getRankedRestaurants returning ${formattedBusinesses.length} results`);
  return formattedBusinesses;
};

