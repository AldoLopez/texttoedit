
import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Database } from './helpers/database.types.ts'
let supabase: SupabaseClient<any, "public", any>;
export const supabaseClient = (req: Request, _res: Response, next: NextFunction) => {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    if (!supabaseUrl) {
      next(new Error('Supabase URL is not defined'));
      return;
    }
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseKey) {
      next(new Error('Supabase Key is not defined'));
      return;
    }
    try {
      supabase = createClient<Database>(supabaseUrl, supabaseKey)
    } catch (error) {
      next(error);
    }
    if (!supabase) {
      next(new Error('Client could not be created'));
      return;
    }
  }
  req.supabase = supabase;
  next();
  return;
};