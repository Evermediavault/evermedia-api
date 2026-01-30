/**
 * English (US) language pack
 */
export default {
  // Common
  common: {
    confirm: "Confirm",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search",
    reset: "Reset",
    submit: "Submit",
    back: "Back",
    next: "Next",
    previous: "Previous",
    loading: "Loading...",
    noData: "No data",
    success: "Operation successful",
    failed: "Operation failed",
    error: "An error occurred",
    warning: "Warning",
    info: "Info",
  },

  // Form validation
  validation: {
    required: "This field is required",
    invalidParams: "Invalid request parameters",
    email: "Please enter a valid email address",
    url: "Please enter a valid URL",
    password: "Password must be at least 8 characters, containing uppercase, lowercase, numbers and special characters",
    minLength: "Length must be at least {min} characters",
    maxLength: "Length must not exceed {max} characters",
    length: "Length must be between {min} and {max} characters",
    number: "Please enter a valid number",
    integer: "Please enter an integer",
    positive: "Please enter a positive number",
    negative: "Please enter a negative number",
    range: "Value must be between {min} and {max}",
  },

  // Error messages
  error: {
    network: "Network error, please check your connection",
    timeout: "Request timeout, please try again later",
    server: "Server error, please try again later",
    notFound: "Resource not found",
    unauthorized: "Unauthorized, please login first",
    forbidden: "Access forbidden",
    unknown: "Unknown error",
    badRequest: "Bad request parameters",
    conflict: "Resource conflict",
    tooManyRequests: "Too many requests, please try again later",
  },

  // Success messages
  success: {
    list: "Retrieved successfully",
    saved: "Saved successfully",
    deleted: "Deleted successfully",
    updated: "Updated successfully",
    created: "Created successfully",
    login: "Login successful",
    logout: "Logout successful",
  },

  // Database related
  db: {
    init: {
      start: "Starting database initialization...",
      tableCreated: "User table created successfully",
      tableCreateFailed: "Failed to create user table",
      adminCreated: "Default admin account created successfully",
      adminExists: "Default admin account already exists, skipping creation",
      adminCreateFailed: "Failed to create default admin account",
      completed: "Database initialization completed",
      failed: "Database initialization failed",
    },
    query: {
      modelNotFound: "Model {model} not found",
      updateRequiresWhere: "Update operation requires Where conditions",
      deleteRequiresWhere: "Delete operation requires Where conditions",
    },
  },

  // Authentication related
  auth: {
    invalidCredentials: "Invalid username or password",
    tokenExpired: "Token expired",
    tokenInvalid: "Invalid token",
    tokenMissing: "Missing authentication token",
    passwordIncorrect: "Incorrect password",
    userNotFound: "User not found",
    userExists: "User already exists",
    loginRequired: "Please login first",
    permissionDenied: "Permission denied",
  },

  // User related
  user: {
    notFound: "User not found",
    exists: "User already exists",
    created: "User created successfully",
    updated: "User updated successfully",
    deleted: "User deleted successfully",
    usernameRequired: "Username is required",
    emailRequired: "Email is required",
    passwordRequired: "Password is required",
    emailInvalid: "Invalid email format",
  },

  // Server related
  server: {
    started: "Server started successfully",
    startFailed: "Server start failed",
    shutdown: "Server shutdown",
  },
};
