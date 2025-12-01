import { z } from 'zod';

// Google Maps URL validation
const googleMapsUrlRegex = /^https?:\/\/(www\.)?(google\.com\/maps|maps\.google\.com|goo\.gl\/maps)/i;

// Sanitize text input - removes potentially dangerous characters
export const sanitizeText = (text: string): string => {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
};



// ============ PROFILE SCHEMAS ============

export const profileSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  username: z.string()
    .trim()
    .min(3, { message: "Username must be at least 3 characters" })
    .max(30, { message: "Username must be less than 30 characters" })
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Username can only contain letters, numbers, and underscores" }),
  bio: z.string()
    .max(500, { message: "Bio must be less than 500 characters" })
    .optional()
    .nullable(),
  location: z.string()
    .max(100, { message: "Location must be less than 100 characters" })
    .optional()
    .nullable(),
  instagram: z.string()
    .max(30, { message: "Instagram handle must be less than 30 characters" })
    .regex(/^@?[a-zA-Z0-9_.]*$/, { message: "Invalid Instagram handle" })
    .optional()
    .nullable(),
  date_of_birth: z.string().optional().nullable(),
  languages: z.array(z.string().max(50)).max(20, { message: "Maximum 20 languages allowed" }).optional(),
  countries_traveled: z.array(z.string().max(100)).max(200, { message: "Maximum 200 countries allowed" }).optional(),
  interests: z.array(z.string().max(50)).max(20, { message: "Maximum 20 interests allowed" }).optional(),
});

// ============ ONBOARDING SCHEMAS ============

export const onboardingSchema = z.object({
  name: z.string()
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name must be less than 100 characters" }),
  dateOfBirth: z.string()
    .min(1, { message: "Date of birth is required" })
    .refine((date) => {
      const birthDate = new Date(date);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      return age >= 13 && age <= 120;
    }, { message: "You must be at least 13 years old" }),
  interests: z.array(z.string()).max(20).optional(),
});

// ============ CHAT SCHEMAS ============

// Validation for just the message content (for text messages)
export const chatMessageContentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "Message cannot be empty" })
    .max(5000, { message: "Message must be less than 5000 characters" }),
});

// Full chat message validation (for complete message objects)
export const chatMessageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, { message: "Message cannot be empty" })
    .max(5000, { message: "Message must be less than 5000 characters" }),
  message_type: z.enum(['text', 'image', 'file', 'location']).optional(),
  file_url: z.string().url().optional(),
  file_name: z.string().max(255).optional(),
  file_size: z.number().positive().optional(),
});

// ============ MEETUP SCHEMAS ============

export const meetupSchema = z.object({
  title: z.string()
    .trim()
    .min(3, { message: "Title must be at least 3 characters" })
    .max(100, { message: "Title must be less than 100 characters" }),
  destination: z.string()
    .trim()
    .min(2, { message: "Destination is required" })
    .max(200, { message: "Destination must be less than 200 characters" }),
  startDate: z.string().min(1, { message: "Start date is required" }),
  endDate: z.string().min(1, { message: "End date is required" }),
  meetingPoint: z.string().max(300, { message: "Meeting point must be less than 300 characters" }).optional(),
  maxMembers: z.number().min(2, { message: "Must allow at least 2 members" }).max(999999),
  description: z.string().max(2000, { message: "Description must be less than 2000 characters" }).optional(),
  type: z.enum(['open', 'locked']),
  isPaid: z.boolean(),
  amount: z.number().min(0).max(100000).optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.endDate) >= new Date(data.startDate);
  }
  return true;
}, { message: "End date must be after start date", path: ["endDate"] });

export const validateMeetup = (data: unknown) => {
  return meetupSchema.safeParse(data);
};

// ============ ACTIVITY SCHEMAS ============

export const activitySchema = z.object({
  title: z.string()
    .trim()
    .min(2, { message: "Title must be at least 2 characters" })
    .max(100, { message: "Title must be less than 100 characters" }),
  description: z.string()
    .max(500, { message: "Description must be less than 500 characters" })
    .optional(),
  activity_time: z.string()
    .min(1, { message: "Date and time is required" }),
  location: z.string()
    .max(200, { message: "Location must be less than 200 characters" })
    .optional(),
});

// ============ FILE VALIDATION ============

export const fileValidation = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'],
};

export const validateFile = (file: File, allowedTypes: string[] = fileValidation.allowedFileTypes): { valid: boolean; error?: string } => {
  if (file.size > fileValidation.maxSize) {
    return { valid: false, error: "File size must be less than 10MB" };
  }
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: "File type not allowed" };
  }
  return { valid: true };
};

// ============ URL VALIDATION ============

export const linkValidation = z.string().url().refine(
  (url) => googleMapsUrlRegex.test(url),
  { message: "Only Google Maps links are allowed" }
);

export const validateGoogleMapsLink = (url: string): boolean => {
  try {
    linkValidation.parse(url);
    return true;
  } catch {
    return false;
  }
};

// Extract URLs from text
export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

// ============ LANGUAGE & COUNTRY VALIDATION ============

export const languageSchema = z.string()
  .trim()
  .min(2, { message: "Language must be at least 2 characters" })
  .max(50, { message: "Language must be less than 50 characters" })
  .regex(/^[a-zA-Z\s\-]+$/, { message: "Invalid language name" });

export const countrySchema = z.string()
  .trim()
  .min(2, { message: "Country must be at least 2 characters" })
  .max(100, { message: "Country must be less than 100 characters" });
