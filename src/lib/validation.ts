import { z } from "zod";

export const validationSchema = z
  .object({
    fullName: z.string().trim().min(1, { message: "Enter Student Full Name" }),
    dateOfBirth: z.string().trim().min(1, { message: "Enter Date of Birth" }),
    classId: z.string().min(1, { message: "Select a valid class" }),
    section: z.string().min(1, { message: "Select a valid section" }),
    status: z.string().default("active"),
    inactiveDate: z.string().optional().or(z.literal("")),
    inactiveReason: z.string().optional().or(z.literal("")),

    parentId: z.string().optional(),
    parentData: z
      .object({
        fullName: z.string().optional(),
        cnic: z.string().optional(),
        phone: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()

  .superRefine((data, ctx) => {
    if (!data.parentId || data.parentId === "") {
      if (!data.parentData?.fullName || data.parentData.fullName.length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter Parent Full Name",
          path: ["parentData", "fullName"],
        });
      }
      if (!data.parentData?.cnic || data.parentData.cnic.length < 13) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter valid CNIC number",
          path: ["parentData", "cnic"],
        });
      }
      if (!data.parentData?.phone || data.parentData.phone.length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter valid phone number",
          path: ["parentData", "phone"],
        });
      }
    }

    if (data.status === "inactive") {
      if (!data.inactiveDate || data.inactiveDate === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter Struk off date ",
          path: ["inactiveDate"],
        });
      }
      if (!data.inactiveReason || data.inactiveReason.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter Struk off reason",
          path: ["inactiveReason"],
        });
      }
    }
  });
export type ValidationSchema = z.infer<typeof validationSchema>;

export const employeeValidationSchema = z
  .object({
    fullName: z.string().trim().min(3, "Enter Full Name"),
    phone: z.string().trim().min(10, "Enter phone number"),
    inactiveDate: z.string().optional().or(z.literal("")),
    inactiveReason: z.string().optional().or(z.literal("")),
  })
  .passthrough()
  .superRefine((data, ctx) => {
    if (data.status === "inactive") {
      if (!data.inactiveDate || data.inactiveDate === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter Inactive Date",
          path: ["inactiveDate"],
        });
      }
      if (!data.inactiveReason || data.inactiveReason.trim().length < 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter Inactive Reason",
          path: ["inactiveReason"],
        });
      }
    }
  });

export type EmployeeValidationSchema = z.infer<typeof employeeValidationSchema>;

// only parent validation schema for parent form modal
export const parentSchema = z
  .object({
    fullName: z.string().trim().min(3, "Enter Parent Full Name"),
    cnic: z.string().trim().min(13, "Enter valid CNIC number"),
    phone: z.string().trim().min(11, "Enter valid phone number"),
  })
  .passthrough();

export type ParentSchemaType = z.infer<typeof parentSchema>;
