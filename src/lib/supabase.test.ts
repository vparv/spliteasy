import { supabase } from './supabase'

// Simple test function to check connection
async function testConnection() {
  try {
    const { data, error } = await supabase.from('_test').select('*').limit(1)
    
    if (error) {
      console.error('Connection error:', error.message)
      return false
    }
    
    console.log('Successfully connected to Supabase!')
    return true
  } catch (err) {
    console.error('Unexpected error:', err)
    return false
  }
}

// Run the test
testConnection() 