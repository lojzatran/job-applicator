'use client';

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  useRef,
  useState,
} from 'react';
import { UploadResponse } from '../types/upload';

const acceptedExtensions = ['pdf', 'doc', 'docx'];

const validateFile = (file: File) => {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (!acceptedExtensions.includes(extension)) {
    return 'Upload a PDF, DOC, or DOCX resume.';
  }

  return '';
};

export const useResumeUpload = () => {
  const [linkedinEnabled, setLinkedinEnabled] = useState(false);
  const [startupJobsEnabled, setStartupJobsEnabled] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [readyMessage, setReadyMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSelectedFile = (file: File | null) => {
    if (!file) {
      return;
    }

    const error = validateFile(file);

    if (error) {
      setSelectedFile(null);
      setReadyMessage('');
      setValidationMessage(error);
      return;
    }

    setSelectedFile(file);
    setValidationMessage('');
    setReadyMessage('');
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    handleSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleDragEnter = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();

    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }

    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleSelectedFile(event.dataTransfer.files?.[0] ?? null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedFile) {
      setReadyMessage('');
      setValidationMessage('Select your resume before continuing.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('linkedinEnabled', String(linkedinEnabled));
    formData.append('startupJobsEnabled', String(startupJobsEnabled));

    setValidationMessage('');
    setReadyMessage('');
    setIsUploading(true);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const payload = (await response.json()) as
        | UploadResponse
        | { message?: string };

      if (!response.ok) {
        setValidationMessage(payload.message ?? 'Upload failed.');
        return;
      }

      const successPayload = payload as UploadResponse;
      setReadyMessage(
        `${successPayload.message} Saved as ${successPayload.file.storedName}${successPayload.linkedinEnabled ? ' with LinkedIn enabled.' : '.'}`,
      );
    } catch {
      setValidationMessage('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  return {
    linkedinEnabled,
    setLinkedinEnabled,
    startupJobsEnabled,
    setStartupJobsEnabled,
    selectedFile,
    isDragging,
    isUploading,
    validationMessage,
    readyMessage,
    fileInputRef,
    handleFileChange,
    handleDrop,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleSubmit,
    openFilePicker,
  };
};
