-- NutriVision AI Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/rbmclkmkiijbeosshvax/sql)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  daily_calorie_goal INTEGER DEFAULT 2000,
  daily_protein_goal INTEGER DEFAULT 150,
  daily_carb_goal INTEGER DEFAULT 200,
  daily_fat_goal INTEGER DEFAULT 65,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal logs table
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  timestamp BIGINT NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  image_url TEXT,
  total_calories NUMERIC DEFAULT 0,
  total_protein NUMERIC DEFAULT 0,
  total_carbs NUMERIC DEFAULT 0,
  total_fat NUMERIC DEFAULT 0,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Food items table (linked to meal logs)
CREATE TABLE IF NOT EXISTS public.food_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meal_log_id UUID REFERENCES public.meal_logs(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  serving_size TEXT,
  calories NUMERIC DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0
);

-- Favorite foods table
CREATE TABLE IF NOT EXISTS public.favorite_foods (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  serving_size TEXT,
  calories NUMERIC DEFAULT 0,
  protein NUMERIC DEFAULT 0,
  carbs NUMERIC DEFAULT 0,
  fat NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Saved meal templates
CREATE TABLE IF NOT EXISTS public.saved_meals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  total_calories NUMERIC DEFAULT 0,
  total_protein NUMERIC DEFAULT 0,
  total_carbs NUMERIC DEFAULT 0,
  total_fat NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meal_logs_user_id ON public.meal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_timestamp ON public.meal_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_food_items_meal_log_id ON public.food_items(meal_log_id);
CREATE INDEX IF NOT EXISTS idx_favorite_foods_user_id ON public.favorite_foods(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_meals_user_id ON public.saved_meals(user_id);

-- Row Level Security (RLS) - Users can only access their own data
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_meals ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Meal logs policies
CREATE POLICY "Users can view own meal logs" ON public.meal_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meal logs" ON public.meal_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal logs" ON public.meal_logs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal logs" ON public.meal_logs
  FOR DELETE USING (auth.uid() = user_id);

-- Food items policies (access through meal_logs)
CREATE POLICY "Users can view own food items" ON public.food_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meal_logs 
      WHERE meal_logs.id = food_items.meal_log_id 
      AND meal_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own food items" ON public.food_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_logs 
      WHERE meal_logs.id = food_items.meal_log_id 
      AND meal_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own food items" ON public.food_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meal_logs 
      WHERE meal_logs.id = food_items.meal_log_id 
      AND meal_logs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own food items" ON public.food_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meal_logs 
      WHERE meal_logs.id = food_items.meal_log_id 
      AND meal_logs.user_id = auth.uid()
    )
  );

-- Favorite foods policies
CREATE POLICY "Users can view own favorites" ON public.favorite_foods
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own favorites" ON public.favorite_foods
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites" ON public.favorite_foods
  FOR DELETE USING (auth.uid() = user_id);

-- Saved meals policies
CREATE POLICY "Users can view own saved meals" ON public.saved_meals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved meals" ON public.saved_meals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved meals" ON public.saved_meals
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved meals" ON public.saved_meals
  FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for meal images
INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-images', 'meal-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload meal images" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'meal-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own meal images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'meal-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Public can view meal images" ON storage.objects
  FOR SELECT USING (bucket_id = 'meal-images');

CREATE POLICY "Users can delete own meal images" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'meal-images' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

