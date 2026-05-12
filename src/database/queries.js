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
