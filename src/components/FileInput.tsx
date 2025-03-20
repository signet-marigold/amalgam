import React from "react";

interface FileInputProps {
  onFileChange: (file: File) => void;
}

const FileInput: React.FC<FileInputProps> = ({ onFileChange }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileChange(file);
    }
  };

  return (
    <input
      type="file"
      accept="video/*"
      onChange={handleFileChange}
      className="bg-muted text-skin-base px-4 py-2 rounded-md"
    />
  );
};

export default FileInput;

