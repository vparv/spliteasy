import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Test the connection by getting the current user (this doesn't require any tables)
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully connected to Supabase!',
      details: 'Connection test passed. No authentication required.'
    })
  } catch (err) {
    return NextResponse.json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unexpected error occurred' 
    }, { status: 500 })
  }
} 