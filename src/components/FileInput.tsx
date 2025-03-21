import React, { useState } from "react";

interface FileInputProps {
  onFileChange: (file: File) => void;
}

const FileInput: React.FC<FileInputProps> = ({ onFileChange }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name); // Update the uploaded file name
      onFileChange(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingOver(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      setUploadedFileName(file.name); // Update the uploaded file name
      onFileChange(file);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-md p-4 text-center ${
        isDraggingOver ? "border-blue-500 bg-blue-100" : "border-gray-400"
      }`}
    >
      {uploadedFileName ? (
        <p className="text-green-600 font-semibold">
          Uploaded: {uploadedFileName}
        </p>
      ) : (
        <p className="text-gray-600">
          Drag and drop a file here, or click to select a file
        </p>
      )}
      <input
        type="file"
        accept="video/*"
        onChange={handleFileChange}
        className="hidden"
        id="file-input"
      />
      <label
        htmlFor="file-input"
        className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md mt-2 inline-block"
      >
        {uploadedFileName ? "Change File" : "Select File"}
      </label>
    </div>
  );
};

export default FileInput;
