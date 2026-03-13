"use client";
import { useState } from "react";
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

export const UserModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  onSubmit,
  isEditing,
}: any) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="xs"
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
          {isEditing ? "Edit Admin" : "Add New Admin"}
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
            size="small"
            sx={{
              backgroundColor: "#1e293b",
              "&:hover": { backgroundColor: "#334155" },
              textTransform: "none",
              px: 2,
            }}
          >
            {isEditing ? "Update Admin" : "Create Admin Access"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
