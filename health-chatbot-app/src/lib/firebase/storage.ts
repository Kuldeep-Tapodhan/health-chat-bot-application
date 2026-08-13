import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './config';
import { v4 as uuidv4 } from 'uuid';

export const uploadFile = async (file: File, path: string = 'reports') => {
    try {
        // Create a unique filename
        const fileExtension = file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExtension}`;
        const fullPath = `${path}/${fileName}`;

        const storageRef = ref(storage, fullPath);

        // Upload file
        const snapshot = await uploadBytes(storageRef, file);

        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);

        return {
            url: downloadURL,
            path: fullPath,
            name: file.name,
            size: file.size,
            type: file.type
        };
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
};

export const deleteFile = async (path: string) => {
    try {
        const storageRef = ref(storage, path);
        await deleteObject(storageRef);
        return true;
    } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
    }
};

export const getFileUrl = async (path: string) => {
    try {
        const storageRef = ref(storage, path);
        return await getDownloadURL(storageRef);
    } catch (error) {
        console.error('Error getting file URL:', error);
        throw error;
    }
};
