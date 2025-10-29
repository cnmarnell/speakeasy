import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://jurwhwgtshyubmjaphnt.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1cndod2d0c2h5dWJtamFwaG50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzgxNDQsImV4cCI6MjA3NjY1NDE0NH0.JS4p9u3t1AsK-0ZeCGXHFA4jj5TisTY1R5B5KAnj55M'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)