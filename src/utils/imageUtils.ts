// src/utils/imageUtils.ts
import toast from 'react-hot-toast';

export const convertImageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Límite de tamaño: 300 KB para asegurar que cabe holgadamente en Firestore
    const MAX_SIZE_KB = 300;
    if (file.size > MAX_SIZE_KB * 1024) {
      toast.error(`La imagen es demasiado grande. El tamaño máximo permitido es de ${MAX_SIZE_KB} KB.`);
      reject(new Error("FILE_TOO_LARGE"));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};