import { z } from "zod";

export const emailSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
});

export const resetPasswordSchema = z
  .object({
    email: z.string().trim().email("Enter a valid email"),
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(128),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
