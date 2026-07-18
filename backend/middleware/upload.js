const multer = require("multer");
const path = require("path");
const config = require("../config/config");
const { error } = require("../utils/responseHandler");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/proofs"));
  },

  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().slice(1);

  if (config.upload.allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `File type not allowed. Allowed types: ${config.upload.allowedTypes.join(", ")}`,
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxSize,
  },
  fileFilter,
});

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return error(res, "File too large. Maximum size is 5MB.", 400);
    }
    return error(res, err.message, 400);
  } else if (err) {
    return error(res, err.message, 400);
  }

  next();
};

module.exports = { upload, handleUploadError };
