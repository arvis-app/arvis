import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jmanxlmzvfnhpgcxsqly.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptYW54bG16dmZuaHBnY3hzcWx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODE4NDYsImV4cCI6MjA4OTE1Nzg0Nn0.O6Mjh2KRydHtCj4ZxyZaaqzcleOQOq4jC01zoSaYxws'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
