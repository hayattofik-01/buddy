import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting cleanup of expired meetups...');

    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    console.log(`Checking for meetups with end_date before: ${todayStr}`);

    // Find meetups where end_date is before today
    const { data: expiredMeetups, error: fetchError } = await supabase
      .from('meetups')
      .select('id, title, end_date')
      .lt('end_date', todayStr);

    if (fetchError) {
      console.error('Error fetching expired meetups:', fetchError);
      throw fetchError;
    }

    if (!expiredMeetups || expiredMeetups.length === 0) {
      console.log('No expired meetups found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No expired meetups to delete',
          deleted: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiredMeetups.length} expired meetups:`, expiredMeetups);

    // Delete the expired meetups
    const { error: deleteError } = await supabase
      .from('meetups')
      .delete()
      .lt('end_date', todayStr);

    if (deleteError) {
      console.error('Error deleting expired meetups:', deleteError);
      throw deleteError;
    }

    console.log(`Successfully deleted ${expiredMeetups.length} expired meetups`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Deleted ${expiredMeetups.length} expired meetup(s)`,
        deleted: expiredMeetups.length,
        meetups: expiredMeetups
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error in cleanup function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
