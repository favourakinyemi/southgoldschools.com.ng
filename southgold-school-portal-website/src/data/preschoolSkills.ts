export const getDetectedStage = (classId: string): 'Pre-School' | 'Primary' | 'Secondary' => {
  const norm = classId.toLowerCase();
  if (norm.includes('nursery') || norm.includes('preschool') || norm.includes('pre-school') || norm.includes('toddler') || norm.includes('creche') || norm.includes('kindergarten')) {
    return 'Pre-School';
  }
  if (norm.includes('secondary') || norm.includes('jss') || norm.includes('sss') || norm.includes('high') || norm.includes('college')) {
    return 'Secondary';
  }
  return 'Primary';
};

export const isReceptionClass = (classId?: string): boolean => {
  if (!classId) return false;
  return classId.toLowerCase().includes('reception');
};

export const isChecklistPreschoolClass = (
  classId: string, 
  classesWithSubjects?: { classId: string; stage?: 'Pre-School' | 'Primary' | 'Secondary' }[]
): boolean => {
  if (!classId) return false;
  const norm = classId.toLowerCase();
  
  // Explicitly return true for toddler, pre-school 1, pre-school 2 and similar preschool formats, excluding Reception
  const isPreschool = norm.includes('toddler') || norm.includes('pre-school') || norm.includes('preschool');
  const isReception = isReceptionClass(classId);
  
  return isPreschool && !isReception;
};
