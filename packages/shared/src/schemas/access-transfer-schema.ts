import { z } from "zod";

export const accessTransferSchema = z.object({
  password: z.string().min(1).max(128).optional(),
});

export type AccessTransferInput = z.infer<typeof accessTransferSchema>;
