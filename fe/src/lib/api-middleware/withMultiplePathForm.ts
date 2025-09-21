import type { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
// import FormData from 'form-data';
import fs from 'fs';
// import fetch from 'node-fetch';
import path from 'path';


interface ProcessedRequest extends NextApiRequest {
    formData?: FormData;
    parsedFiles?: formidable.File[];
    parsedFields?: formidable.Fields;
}

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


const cleanupTempFiles = (reason: 'success' | 'error' = 'success', tempFiles: formidable.File[]) => {
    console.log(`🗑️ Starting cleanup (${reason})...`);
    tempFiles.forEach(file => {
        if (file && file.filepath) {
            try {
                fs.unlinkSync(file.filepath);
            } catch (cleanupError) {
                console.warn('⚠️ Failed to cleanup temp file on error:', file.filepath);
            }
        }
    });
    console.log(`🏁 Cleanup completed. Processed ${tempFiles.length} file(s)`);
};

export const createFormDataMiddleware = async (
    req: ProcessedRequest,
    res: NextApiResponse,
    next: () => Promise<void>
): Promise<void> => {
    try {
        console.log('🔄 Starting FormData creation middleware...');

        // Parse the incoming form data
        const form = formidable();

        const [fields, files] = await form.parse(req);
        console.log('📋 Parsed fields:', Object.keys(fields));
        console.log('📁 Parsed files:', Object.keys(files));

        // Create new FormData instance
        const formData = new FormData();

        // Add all form fields to FormData
        Object.entries(fields).forEach(([key, value]) => {
            if (Array.isArray(value)) {
                // Handle multiple values for the same field
                value.forEach(val => {
                    formData.append(key, val);
                    console.log(`➕ Added field: ${key} = ${val}`);
                });
            } else if (value !== undefined) {
                formData.append(key, value);
                console.log(`➕ Added field: ${key} = ${value}`);
            }
        });

        // Add all files to FormData
        for (const [fieldName, fileArray] of Object.entries(files)) {
            const fileList = Array.isArray(fileArray) ? fileArray : [fileArray];
            for (let index = 0; index < fileList.length; index++) {
                const file = fileList[index];
                if (file && file.filepath) {
                    // const fileStream = fs.createReadStream(file.filepath);
                    const buffer = fs.readFileSync(file.filepath);

                    // Use the Web API File 
                    // const fileObject = new File([buffer], file.originalFilename || `file-${index}`, { type: file.mimetype || 'application/octet-stream' });
                    // formData.append(fieldName, fileObject);

                    // use Blob instead of File if File is not available
                    const blob = new Blob([buffer], {
                        type: file.mimetype || 'application/octet-stream'
                    });
                    formData.append(fieldName, blob, file.originalFilename || `file-${index}`);
                    console.log(`📎 Added file: ${fieldName} = ${file.originalFilename} (${file.mimetype})`);
                }
            }
        }

        // Attach processed data to request object
        req.body = formData;
        req.parsedFiles = Object.values(files).flat().filter(Boolean) as formidable.File[];
        req.parsedFields = fields;

        console.log('✅ FormData middleware completed successfully');

        // Call the next function
        await next();
        cleanupTempFiles('success', req.parsedFiles || []);

    } catch (error) {
        console.error('❌ FormData middleware erroxxxxxxxr:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process form data',
            error: error instanceof Error ? error.message : 'Unknown error'
        } as UploadResponse);
    }
};