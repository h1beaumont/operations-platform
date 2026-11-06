import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

// Ensure upload directories exist
const ensureUploadDir = async (dirPath: string) => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
    console.log(`[Upload Config] Directory ensured: ${dirPath}`);
  } catch (error) {
    console.error(`[Upload Config] Failed to create upload directory ${dirPath}:`, error);
  }
};

// Create disk storage configuration with unique filenames
const createDiskStorage = (uploadPath: string) => {
  // Ensure directory exists on init (synchronous check)
  ensureUploadDir(uploadPath).catch(err => {
    console.error(`[Upload Config] Init directory creation failed for ${uploadPath}:`, err);
  });
  
  return multer.diskStorage({
    destination: async (req, file, cb) => {
      try {
        await ensureUploadDir(uploadPath);
        cb(null, uploadPath);
      } catch (error) {
        console.error(`[Upload Config] Destination error for ${uploadPath}:`, error);
        cb(error as Error, uploadPath);
      }
    },
    filename: (req, file, cb) => {
      try {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const basename = path.basename(file.originalname, ext);
        // Sanitize filename
        const safeName = basename.replace(/[^a-zA-Z0-9]/g, '_');
        const finalName = `${safeName}-${uniqueSuffix}${ext}`;
        console.log(`[Upload Config] Generated filename: ${finalName}`);
        cb(null, finalName);
      } catch (error) {
        console.error(`[Upload Config] Filename generation error:`, error);
        cb(error as Error, file.originalname);
      }
    }
  });
};

// Predefined upload configurations for different file types
export const uploadConfigs = {
  // Wage report PDFs
  wages: multer({
    storage: createDiskStorage('uploads/wages'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    }
  }),
  
  // AST contracts
  astContracts: multer({
    storage: createDiskStorage('uploads/ast-contracts'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    }
  }),
  
  // Maintenance photos
  maintenancePhotos: multer({
    storage: createDiskStorage('uploads/maintenance'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'image/png') {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG and PNG files are allowed'));
      }
    }
  }),
  
  // Inspection reports
  inspections: multer({
    storage: createDiskStorage('uploads/inspections'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    }
  }),
  
  // Invoice uploads
  invoices: multer({
    storage: createDiskStorage('uploads/invoices'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF and image files are allowed'));
      }
    }
  }),
  
  // Landlord statements
  statements: multer({
    storage: createDiskStorage('uploads/statements'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    }
  }),
  
  // Property onboarding documents
  propertyOnboarding: multer({
    storage: createDiskStorage('uploads/property-onboarding'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, DOCX, and text files are allowed'));
      }
    }
  }),
  
  // Management contracts
  contracts: multer({
    storage: createDiskStorage('uploads/contracts'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    }
  }),
  
  // RentCheck inspections
  rentcheck: multer({
    storage: createDiskStorage('uploads/rentcheck'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    }
  }),
  
  // Landlord imports
  landlords: multer({
    storage: createDiskStorage('uploads/landlords'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only CSV and Excel files are allowed'));
      }
    }
  }),
  
  // Equipment photos
  equipmentPhotos: multer({
    storage: createDiskStorage('uploads/equipment-photos'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  }),
  
  // Linen delivery notes
  linenDelivery: multer({
    storage: createDiskStorage('uploads/linen-delivery'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    }
  }),
  
  // Videos for training/walkthroughs
  videos: multer({
    storage: createDiskStorage('uploads/videos'),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB for videos
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only video files are allowed'));
      }
    }
  }),
  
  // Knowledge base documents
  knowledgeBase: multer({
    storage: createDiskStorage('uploads/knowledge-base'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                           'text/plain', 'image/jpeg', 'image/jpg', 'image/png'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, DOCX, text, and image files are allowed'));
      }
    }
  }),
  
  // Property documents (check-in details, etc)
  properties: multer({
    storage: createDiskStorage('uploads/properties'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
      const allowedMimes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
                           'text/plain', 'image/jpeg', 'image/jpg', 'image/png'];
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only PDF, DOCX, text, and image files are allowed'));
      }
    }
  }),
  
  // Generic file upload (for multiple file types)
  generic: multer({
    storage: createDiskStorage('uploads/general'),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  })
};

// Helper to get uploaded file info
export const getUploadedFileInfo = (file: Express.Multer.File) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    path: file.path,
    size: file.size,
    mimetype: file.mimetype,
    url: `/uploads/${file.filename}` // Relative URL for serving
  };
};