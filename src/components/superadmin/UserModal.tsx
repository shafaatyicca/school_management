"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Zoom,
  InputAdornment,
} from "@mui/material";
import {
  Close as CloseIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import ImageUploadWithCrop from "../ImageUploadWithCrop";

export const UserModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isEditing,
  schoolId,
}: any) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleImageDone = useCallback(
    (url: string) => {
      setFormData((prev: any) => ({ ...prev, image: url }));
    },
    [setFormData],
  );

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      disableEnforceFocus
      disableAutoFocus
      TransitionComponent={Zoom}
      transitionDuration={200}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(0, 0, 0, 0.4)",
          backdropFilter: "blur(2px)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "var(--border)",
          backgroundColor: "var(--background)",
          py: 1.5,
          px: 2,
        }}
      >
        <span className="font-bold text-foreground text-sm">
          {isEditing ? "Edit User" : "Add New User"}
        </span>
        <IconButton
          onClick={onClose}
          size="small"
          tabIndex={-1}
          sx={{
            color: "var(--muted-foreground)",
            "&:hover": { backgroundColor: "var(--muted)" },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <form onSubmit={onSubmit}>
        <DialogContent
          dividers
          sx={{ backgroundColor: "var(--background)", p: 2 }}
        >
          <div className="flex flex-col gap-4">
            <div className="flex flex-row gap-4 items-start">
              <div className="flex-shrink-0">
                <div
                  className="flex flex-col items-center justify-center p-2 border-2 border-dashed rounded-xl w-32 h-36"
                  style={{
                    borderColor: "var(--border)",
                    backgroundColor: "var(--card)",
                  }}
                >
                  {formData.image === "loading" ? (
                    <div
                      className="w-20 h-20 rounded-full flex flex-col items-center justify-center"
                      style={{ border: "4px solid var(--border)" }}
                    >
                      <svg
                        className="animate-spin w-6 h-6 text-sky-500"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                      <span className="text-[9px] mt-1 text-sky-500 font-medium">
                        Uploading...
                      </span>
                    </div>
                  ) : formData.image ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={formData.image}
                        className="w-25 h-25 rounded-full object-cover shadow-md"
                        style={{ border: "4px solid var(--border)" }}
                        alt="Profile"
                      />
                      <Button
                        type="button"
                        size="small"
                        variant="text"
                        sx={{
                          fontSize: "8px",
                          color: "#ef4444",
                          "&:hover": {
                            backgroundColor: "rgba(239, 68, 68, 0.1)",
                          },
                        }}
                        onClick={() =>
                          setFormData((prev: any) => ({ ...prev, image: "" }))
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <ImageUploadWithCrop
                      onImageCropped={handleImageDone}
                      schoolId={schoolId || ""}
                      folder="users"
                    />
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3 flex-1 min-w-0">
                <TextField
                  label="Full Name"
                  fullWidth
                  size="small"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
                <TextField
                  label="Phone Number"
                  fullWidth
                  size="small"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
                <TextField
                  select
                  label="Role"
                  fullWidth
                  size="small"
                  required
                  value={formData.role || "school_admin"}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  SelectProps={{ native: true }}
                  InputLabelProps={{ shrink: true }}
                >
                  <option value="school_admin">School Admin</option>
                  <option value="accountant">Accountant</option>
                  <option value="cashier">Cashier</option>
                  <option value="helpdesk">Helpdesk</option>
                </TextField>
              </div>
            </div>

            <TextField
              label="Email Address"
              type="email"
              fullWidth
              size="small"
              required
              disabled={isEditing}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />

            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              size="small"
              required={!isEditing}
              placeholder={
                isEditing ? "Leave blank to keep current password" : ""
              }
              helperText={
                isEditing
                  ? "Blank chhod dein agar password change nahi karna"
                  : ""
              }
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                      sx={{ color: "var(--muted-foreground)" }}
                    >
                      {showPassword ? (
                        <VisibilityOff fontSize="small" />
                      ) : (
                        <Visibility fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <div
              className="p-3 rounded-xl border border-dashed flex flex-col gap-3"
              style={{
                borderColor: "var(--border)",
                backgroundColor: "var(--card)",
              }}
            >
              <p
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: "var(--muted-foreground)" }}
              >
                Security Question
              </p>
              <TextField
                select
                label="Question"
                fullWidth
                size="small"
                value={formData.securityQuestion?.question || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    securityQuestion: {
                      ...formData.securityQuestion,
                      question: e.target.value,
                    },
                  })
                }
                SelectProps={{ native: true }}
                InputLabelProps={{ shrink: true }}
              >
                <option value="">Select a question</option>
                <option value="Aapki walida ka naam kya hai?">
                  Aapki walida ka naam kya hai?
                </option>
                <option value="Aap kis sheher mein paida hue?">
                  Aap kis sheher mein paida hue?
                </option>
                <option value="Aapke pehle school ka naam?">
                  Aapke pehle school ka naam?
                </option>
                <option value="Aapke pet ka naam kya tha?">
                  Aapke pet ka naam kya tha?
                </option>
                <option value="Aapke bachpan ke dost ka naam?">
                  Aapke bachpan ke dost ka naam?
                </option>
              </TextField>
              <TextField
                label="Answer"
                fullWidth
                size="small"
                value={formData.securityQuestion?.answer || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    securityQuestion: {
                      ...formData.securityQuestion,
                      answer: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
        </DialogContent>

        <DialogActions
          sx={{
            borderTop: "1px solid",
            borderColor: "var(--border)",
            backgroundColor: "var(--background)",
            gap: 1,
            px: 2,
            py: 1,
          }}
        >
          <Button
            onClick={onClose}
            size="small"
            sx={{
              textTransform: "none",
              color: "var(--foreground)",
              "&:hover": { backgroundColor: "var(--muted)" },
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={formData.image === "loading"}
            size="small"
            sx={{
              backgroundColor: "#1e293b",
              "&:hover": { backgroundColor: "#334155" },
              textTransform: "none",
              px: 2,
            }}
          >
            {formData.image === "loading"
              ? "Photo upload ho rahi hai..."
              : isEditing
                ? "Update User"
                : "Create User"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
