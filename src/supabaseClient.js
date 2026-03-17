import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jmanxlmzvfnhpgcxsqly.supabase.co'
const SUPABASE_KEY = 'sb_publishable_DtXnt43MsZidSw6bRZb8qg_G06fLPh-'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
