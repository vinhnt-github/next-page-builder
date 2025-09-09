// server.ts
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files
app.use('/uploads', express.static(uploadsDir));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
    // Check if file is an image
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const isPngByBytes = (buffer: Buffer): boolean => {
    if (buffer.length < PNG_SIGNATURE.length) {
        return false;
    }
    return buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

// Types
interface UploadResponse {
    success: boolean;
    message: string;
    files?: Array<{
        id: string;
        originalName: string;
        filename: string;
        path: string;
        size: number;
        mimetype: string;
        url: string;
    }>;
    error?: string;
}

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Image Upload API Server is running!' });
});

// Multiple file upload endpoint
app.post('/api/upload', upload.array('images', 10), async (req, res) => {
    try {
        const files = req.files as Express.Multer.File[];
        console.log('req :>> ', req);

        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded',
            } as UploadResponse);
        }

        const validFiles: Express.Multer.File[] = [];
        const invalidFiles: string[] = [];

        // Validate each file by checking bytes
        for (const file of files) {
            try {
                // Read the first 8 bytes of the file to check signature
                const buffer = fs.readFileSync(file.path);

                // Check if it's a PNG file by examining bytes
                if (file.mimetype === 'image/png') {
                    if (isPngByBytes(buffer)) {
                        validFiles.push(file);
                        console.log(`✅ Valid PNG file: ${file.originalname}`);
                    } else {
                        // File claims to be PNG but doesn't have PNG signature
                        invalidFiles.push(`${file.originalname} - Invalid PNG signature`);
                        // Delete the invalid file
                        fs.unlinkSync(file.path);
                        console.log(`❌ Invalid PNG signature: ${file.originalname}`);
                    }
                } else {
                    // For other image types, accept them (you can add more byte validations here)
                    validFiles.push(file);
                    console.log(`✅ Valid image file: ${file.originalname} (${file.mimetype})`);
                }
            } catch (fileError) {
                console.error(`Error validating file ${file.originalname}:`, fileError);
                invalidFiles.push(`${file.originalname} - Validation error`);
                // Clean up file on error
                try {
                    fs.unlinkSync(file.path);
                } catch (cleanupError) {
                    console.warn('Failed to cleanup invalid file:', file.path);
                }
            }
        }

        // If no valid files, return error
        if (validFiles.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid files uploaded. All files failed validation.',
                error: invalidFiles.join(', ')
            } as UploadResponse);
        }

        const fileData = validFiles.map(file => ({
            id: uuidv4(),
            originalName: file.originalname,
            filename: file.filename,
            path: file.path,
            size: file.size,
            mimetype: file.mimetype,
            url: `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
        }));

        const response: UploadResponse = {
            success: true,
            message: `Successfully uploaded ${validFiles.length} valid file(s)${invalidFiles.length > 0 ? `. ${invalidFiles.length} file(s) were rejected: ${invalidFiles.join(', ')}` : ''}`,
            files: fileData
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        } as UploadResponse);
    }
});

// Get all uploaded images
app.get('/api/images', (req, res) => {
    try {
        const files = fs.readdirSync(uploadsDir);
        const imageFiles = files
            .filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
            })
            .map(file => {
                const filePath = path.join(uploadsDir, file);
                const stats = fs.statSync(filePath);
                return {
                    id: file,
                    filename: file,
                    url: `${req.protocol}://${req.get('host')}/uploads/${file}`,
                    size: stats.size,
                    uploadDate: stats.birthtime
                };
            });

        res.json({
            success: true,
            images: imageFiles
        });
    } catch (error) {
        console.error('Error fetching images:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching images',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Delete image endpoint
app.delete('/api/images/:filename', (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path.join(uploadsDir, filename);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }

        fs.unlinkSync(filePath);

        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting file',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.'
            });
        }
    }

    res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});