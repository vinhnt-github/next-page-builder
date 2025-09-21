// pages/index.tsx
import { useState, useRef } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import styles from './index.module.css';

interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

interface UploadResponse {
  success: boolean;
  message: string;
  files?: UploadedFile[];
  error?: string;
}

export default function UploadImage() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [message, setMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    setSelectedFiles(files);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);

    const files = event.dataTransfer.files;
    setSelectedFiles(files);

    // Update the file input
    if (fileInputRef.current) {
      fileInputRef.current.files = files;
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const uploadFiles = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      setMessage('Please select files to upload');
      return;
    }

    setUploading(true);
    setMessage('');

    try {
      const formData = new FormData();

      formData.append('title', 'upload image');

      // Add all selected files to FormData
      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('images', selectedFiles[i]);
      }

      const response = await fetch('/api/upload-multipart', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();

      if (result.success && result.files) {
        setUploadedFiles(prev => [...prev, ...result.files!]);
        setMessage(`Successfully uploaded ${result.files.length} file(s)`);
        setSelectedFiles(null);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setMessage(result.error || result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessage('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>Image Upload Platform</title>
        <meta name="description" content="Upload and manage your images" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>Image Upload Platform</h1>

        <div className={styles.uploadSection}>
          <div
            className={`${styles.dropZone} ${dragOver ? styles.dragOver : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.dropZoneContent}>
              <p>Drag and drop images here or click to select</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className={styles.hiddenInput}
              />
            </div>
          </div>

          {selectedFiles && selectedFiles.length > 0 && (
            <div className={styles.selectedFiles}>
              <h3>Selected Files:</h3>
              <ul>
                {Array.from(selectedFiles).map((file, index) => (
                  <li key={index}>
                    {file.name} ({formatFileSize(file.size)})
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={uploadFiles}
            disabled={uploading || !selectedFiles || selectedFiles.length === 0}
            className={styles.uploadButton}
          >
            {uploading ? 'Uploading...' : 'Upload Images'}
          </button>

          {message && (
            <div className={`${styles.message} ${message.includes('Success') ? styles.success : styles.error}`}>
              {message}
            </div>
          )}
        </div>

        {uploadedFiles.length > 0 && (
          <div className={styles.gallery}>
            <h2>Uploaded Images</h2>
            <div className={styles.imageGrid}>
              {uploadedFiles.map((file) => (
                <div key={file.id} className={styles.imageCard}>
                  <div className={styles.imageWrapper}>
                    <Image
                      src={file.url}
                      alt={file.originalName}
                      width={300}
                      height={200}
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                  <div className={styles.imageInfo}>
                    <p className={styles.fileName}>{file.originalName}</p>
                    <p className={styles.fileSize}>{formatFileSize(file.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}