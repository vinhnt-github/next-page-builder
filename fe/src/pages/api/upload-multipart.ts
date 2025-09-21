import { createFormDataMiddleware } from '@/lib/api-middleware/withMultiplePathForm';
import formidable from 'formidable';
import type { NextApiRequest, NextApiResponse } from 'next';
// import fetch from 'node-fetch';
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


interface ProcessedRequest extends NextApiRequest {
    formData?: FormData;
    parsedFiles?: formidable.File[];
    parsedFields?: formidable.Fields;
}


export const config = {
    api: {
        bodyParser: false, // Disable body parsing, we'll handle it with formidable
    },
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<UploadResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'Method not allowed'
        });
    }
    const processedReq = req as ProcessedRequest;

    createFormDataMiddleware(processedReq, res, async () => {
        try {
            // Send to Express backend
            const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
            const response = await fetch(`${backendUrl}/api/upload`, {
                method: 'POST',
                body: processedReq.body,
            });

            if (!response.ok) {
                throw new Error(`Backend responded with status: ${response.status}`);
            }
            const result: UploadResponse = await response.json();
            res.status(200).json(result);


        } catch (error) {
            console.error('Upload API error:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    })
}