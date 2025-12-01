import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xfrkdqpupnsolvlmfvyh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmcmtkcXB1cG5zb2x2bG1mdnloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MDI5ODksImV4cCI6MjA3ODM3ODk4OX0.ottbJcd_iCh2u-O3LeyMxDLdkqV8e4cgdphZZ-nE4tU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
