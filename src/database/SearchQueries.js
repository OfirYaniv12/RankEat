import { supabase } from './supabaseClient';

// ─── HAVERSINE DISTANCE (client-side, km) ────────────────────────────────────
export const haversineDistance = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};


const BAYESIAN_M = 10;

// Preprocessing logic to strip all punctuation (apostrophes, periods, hyphens) and spaces
export const normalizeText = (text) => {
  if (!text) return '';
  return text
    .replace(/['’"״`\-‐‑‒–—_.]/g, '') // remove punctuation: apostrophes, periods, hyphens, quotes
    .replace(/\s+/g, '')              // remove whitespaces for typo-tolerant compact comparison
    .toLowerCase();
};

// Levenshtein Distance implementation for fuzzy matching
export const getLevenshteinDistance = (a, b) => {
  const tmp = [];
  for (let i = 0; i <= a.length; i++) {
    tmp[i] = [i];
  }
  for (let j = 0; j <= b.length; j++) {
    tmp[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      tmp[i][j] = Math.min(
        tmp[i - 1][j] + 1,
        tmp[i][j - 1] + 1,
        tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return tmp[a.length][b.length];
};

// Calculate normalized similarity score between 0.0 and 1.0
export const getSimilarity = (s1, s2) => {
  const norm1 = normalizeText(s1);
  const norm2 = normalizeText(s2);
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 1.0;
  
  const distance = getLevenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  return 1.0 - distance / maxLength;
};

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

// ─── RANKED RESTAURANTS (Fuzzy & Structured Unified Search) ──────────────────
export const getRankedRestaurants = async ({ nameQuery, searchMode, selectedLocation, selectedCategoryIds, userCityId, userDistrictId }) => {

  // 1. Fetch all businesses, along with their city/district/dishes
  const { data: businesses, error } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      address,
      lat,
      lng,
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
      latitude: b.lat,
      longitude: b.lng,
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

  // 5. Apply Structured Location Filter
  if (selectedLocation) {
    if (searchMode === 'עירוני') {
      formattedBusinesses = formattedBusinesses.filter(b => b.city_id === selectedLocation.id);
    } else if (searchMode === 'אזורי') {
      formattedBusinesses = formattedBusinesses.filter(b => b.district_id === selectedLocation.id);
    }
  } else {
    // If no location is explicitly selected and searchMode is NOT national ('ארצי')
    if (searchMode !== 'ארצי') {
      // Apply Contextual Fallback to the User's region
      if (userDistrictId) {
        formattedBusinesses = formattedBusinesses.filter(b => b.district_id === userDistrictId);
      }
    }
  }

  // 6. Apply Fuzzy & Punctuation-tolerant Name Search Filter
  if (nameQuery && nameQuery.trim().length > 0) {
    const normQuery = normalizeText(nameQuery);
    
    formattedBusinesses = formattedBusinesses.map(b => {
      const normName = normalizeText(b.name);
      const similarity = getSimilarity(b.name, nameQuery);
      
      const isExact = normName === normQuery;
      const isSubstring = normName.includes(normQuery);
      const isFuzzy = similarity >= 0.45;
      
      let matchLevel = -1;
      if (isExact) matchLevel = 0;
      else if (isSubstring) matchLevel = 1;
      else if (isFuzzy) matchLevel = 2;

      return {
        ...b,
        matchLevel,
        similarity
      };
    }).filter(b => b.matchLevel !== -1);

    // Sort with multi-criteria priorities: proximity, matching level, then smart score
    formattedBusinesses.sort((a, b) => {
      // 1. Match Level (Exact match first, then Substring, then Fuzzy)
      if (a.matchLevel !== b.matchLevel) {
        return a.matchLevel - b.matchLevel;
      }

      // 2. City Proximity (User's specific city first)
      const inUserCityA = userCityId && a.city_id === userCityId;
      const inUserCityB = userCityId && b.city_id === userCityId;
      if (inUserCityA && !inUserCityB) return -1;
      if (!inUserCityA && inUserCityB) return 1;

      // 3. Smart Score
      return b.smart_score - a.smart_score;
    });

  } else {
    // Blind Search: Sort strictly by proximity and smart score
    formattedBusinesses.sort((a, b) => {
      const inUserCityA = userCityId && a.city_id === userCityId;
      const inUserCityB = userCityId && b.city_id === userCityId;
      if (inUserCityA && !inUserCityB) return -1;
      if (!inUserCityA && inUserCityB) return 1;

      const inRegionA = userDistrictId && a.district_id === userDistrictId;
      const inRegionB = userDistrictId && b.district_id === userDistrictId;
      if (inRegionA && !inRegionB) return -1;
      if (!inRegionA && inRegionB) return 1;

      return b.smart_score - a.smart_score;
    });
  }

  return formattedBusinesses;
};

// ─── NEARBY DISHES (Location-Based RPC) ──────────────────────────────────────
/**
 * Calls the Supabase RPC `get_nearby_businesses` and then fetches ranked
 * dishes from those businesses for the given category.
 *
 * The RPC must return rows with: { business_id, distance_km }
 */
export const getNearbyDishes = async ({ userLat, userLon, radiusKm, categoryId }) => {
  const { data: nearby, error } = await supabase.rpc('get_nearby_businesses', {
    user_lat: Number(userLat),
    user_lng: Number(userLon),
    radius_km: Number(radiusKm) || 5,
  });

  if (error) throw new Error(`getNearbyDishes/rpc: ${error.message}`);
  if (!nearby || nearby.length === 0) return { dishes: [], globalAvg: 0 };

  // Build a map of business_id -> distance_km for later enrichment
  const distanceMap = {};
  nearby.forEach(row => {
    // RPC may return either 'business_id' or 'id' — handle both
    const bizId = row.business_id ?? row.id;
    if (bizId) distanceMap[bizId] = row.distance_km ?? null;
  });

  const businessIds = nearby.map(r => r.business_id ?? r.id).filter(Boolean);

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
        cities ( id, name )
      )
    `)
    .eq('category_id', categoryId)
    .in('business_id', businessIds);

  if (dishError) throw new Error(`getNearbyDishes/dishes: ${dishError.message}`);
  if (!rawDishes || rawDishes.length === 0) return { dishes: [], globalAvg: 0 };

  const BAYESIAN_M = 10;
  const totalRatingSum = rawDishes.reduce((s, d) => s + (d.avg_rating || 0), 0);
  const C = rawDishes.length > 0 ? totalRatingSum / rawDishes.length : 4.0;

  const dishes = rawDishes
    .map(d => {
      const R = d.avg_rating || 0;
      const v = d.review_count || 0;
      const weighted_score = (R * v + C * BAYESIAN_M) / (v + BAYESIAN_M);
      const biz = d.businesses || {};
      return {
        id: d.id,
        name: d.name,
        avg_rating: R,
        review_count: v,
        weighted_score,
        business_name: biz.name || '—',
        business_id: biz.id,
        address: biz.address || '',
        city_name: biz.cities?.name || '—',
        latitude: biz.lat,
        longitude: biz.lng,
        distance_km: distanceMap[biz.id] ?? null,
      };
    })
    .sort((a, b) => {
      // Sort by distance first, then score
      if (a.distance_km != null && b.distance_km != null) return a.distance_km - b.distance_km;
      return b.weighted_score - a.weighted_score;
    });

  return { dishes, globalAvg: C };
};

// ─── NEARBY RESTAURANTS (Location-Based RPC) ──────────────────────────────────
/**
 * Calls the Supabase RPC `get_nearby_businesses` and returns ranked restaurant
 * objects enriched with distance_km.
 */
export const getNearbyRestaurants = async ({ userLat, userLon, radiusKm, nameQuery, selectedCategoryIds }) => {
  const { data: nearby, error } = await supabase.rpc('get_nearby_businesses', {
    user_lat: Number(userLat),
    user_lng: Number(userLon),
    radius_km: Number(radiusKm) || 5,
  });

  if (error) throw new Error(`getNearbyRestaurants/rpc: ${error.message}`);
  if (!nearby || nearby.length === 0) return [];

  const distanceMap = {};
  nearby.forEach(row => {
    const bizId = row.business_id ?? row.id;
    if (bizId) distanceMap[bizId] = row.distance_km ?? null;
  });

  const businessIds = nearby.map(r => r.business_id ?? r.id).filter(Boolean);

  const { data: businesses, error: bizError } = await supabase
    .from('businesses')
    .select(`
      id,
      name,
      address,
      lat,
      lng,
      city_id,
      district_id,
      cities ( id, name ),
      districts ( id, name ),
      dishes (
        id,
        name,
        avg_rating,
        review_count,
        category_id
      )
    `)
    .in('id', businessIds);

  if (bizError) throw new Error(`getNearbyRestaurants/businesses: ${bizError.message}`);
  if (!businesses || businesses.length === 0) return [];

  const BAYESIAN_M = 10;
  const allDishes = [];
  businesses.forEach(b => { if (b.dishes) allDishes.push(...b.dishes); });

  const categoryGroups = {};
  allDishes.forEach(d => {
    const catId = d.category_id;
    if (!categoryGroups[catId]) categoryGroups[catId] = { sum: 0, count: 0 };
    categoryGroups[catId].sum += (d.avg_rating || 0);
    categoryGroups[catId].count += 1;
  });
  const categoryAverages = {};
  Object.keys(categoryGroups).forEach(catId => {
    const g = categoryGroups[catId];
    categoryAverages[catId] = g.count > 0 ? g.sum / g.count : 4.0;
  });

  let results = businesses.map(b => {
    let dishScoresSum = 0, validDishesCount = 0, totalReviews = 0;
    (b.dishes || []).forEach(d => {
      const R = d.avg_rating || 0;
      const v = d.review_count || 0;
      const C = categoryAverages[d.category_id] ?? 4.0;
      dishScoresSum += (R * v + C * BAYESIAN_M) / (v + BAYESIAN_M);
      validDishesCount += 1;
      totalReviews += v;
    });
    return {
      id: b.id,
      name: b.name,
      address: b.address,
      latitude: b.lat,
      longitude: b.lng,
      city_id: b.city_id,
      district_id: b.district_id,
      city_name: b.cities?.name || '—',
      district_name: b.districts?.name || '—',
      smart_score: validDishesCount > 0 ? dishScoresSum / validDishesCount : 0,
      review_count: totalReviews,
      dishes: b.dishes || [],
      distance_km: distanceMap[b.id] ?? null,
    };
  });

  // Apply category filter
  if (selectedCategoryIds?.length > 0) {
    results = results.filter(b => b.dishes.some(d => selectedCategoryIds.includes(d.category_id)));
  }

  // Apply name fuzzy filter
  if (nameQuery?.trim().length > 0) {
    const normQ = nameQuery.trim().toLowerCase();
    results = results.filter(b => b.name.toLowerCase().includes(normQ));
  }

  // Sort by distance first, then smart_score
  results.sort((a, b) => {
    if (a.distance_km != null && b.distance_km != null) return a.distance_km - b.distance_km;
    return b.smart_score - a.smart_score;
  });

  return results;
};
