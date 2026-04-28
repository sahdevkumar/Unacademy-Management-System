import { supabase } from './supabaseClient';

export const validateMobileNumber = async (
  phone: string, 
  tableName: 'parents' | 'students' | 'registrations' = 'parents',
  currentId?: string
): Promise<{ isValid: boolean; error?: string }> => {
  if (!phone) {
    return { isValid: false, error: "Mobile number is required" };
  }

  const numericOnly = phone.replace(/\D/g, '');
  if (numericOnly.length !== 10) {
    return { isValid: false, error: "Mobile number must be exactly 10 digits" };
  }

  let dbField = 'phone';
  if (tableName === 'students') {
    dbField = 'contact_number';
  } else if (tableName === 'registrations') {
    dbField = 'phone';
  }

  let query = supabase.from(tableName).select('id').eq(dbField, phone);
  
  if (currentId) {
    query = query.neq('id', currentId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error("Failed to validate mobile number");
  }

  if (data && data.length > 0) {
    return { isValid: false, error: `Mobile number already exists in ${tableName} records` };
  }

  return { isValid: true };
};
