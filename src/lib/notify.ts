import { toast } from "sonner";

export const notify = {
  success: (message: string, description?: string) =>
    toast.success(message, {
      description,
      duration: 3000,
      style: { "--duration": "3000ms" } as React.CSSProperties,
    }),

  error: (message: string, description?: string) =>
    toast.error(message, {
      description,
      duration: 5000,
      style: { "--duration": "5000ms" } as React.CSSProperties,
    }),

  warning: (message: string, description?: string) =>
    toast.warning(message, {
      description,
      duration: 4000,
      style: { "--duration": "4000ms" } as React.CSSProperties,
    }),

  info: (message: string, description?: string) =>
    toast.info(message, {
      description,
      duration: 3000,
      style: { "--duration": "3000ms" } as React.CSSProperties,
    }),

  loading: (message: string) => toast.loading(message),

  promise: <T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string },
  ) => toast.promise(promise, messages),
};
