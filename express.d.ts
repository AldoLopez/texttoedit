import express from 'express';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './middlewares/helpers/database.types.ts';

declare global {
  namespace Express {
    interface Request {
      supabase: SupabaseClient<Database, 'public', any>; // Make supabase optional, as it may not always be set
    }
  }
}