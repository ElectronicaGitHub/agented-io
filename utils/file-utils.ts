import fs from 'fs';
import path from 'path';

const DEFAULT_RESULTS_FOLDER_PATH = './results';

export const getJsonFromFileSync = (filePath: string, defaultValue = {}, folderPath = DEFAULT_RESULTS_FOLDER_PATH): any => {
  try {
    checkIfFolderExists(folderPath);
    const fpath = path.join(folderPath, filePath);
    const data = fs.readFileSync(fpath, 'utf8');
    return JSON.parse(data);
  } catch (err: any) {
    console.error('Error reading file:', err.message);
    return defaultValue;
  }
}

export const getJsonFromFileAsync = async <T = any>(filePath: string, defaultValue: any = {}, folderPath = DEFAULT_RESULTS_FOLDER_PATH): Promise<T> => {
  try {
    checkIfFolderExists(folderPath);
    const fpath = path.join(folderPath, filePath);
    const data = await fs.promises.readFile(fpath, 'utf8');
    return JSON.parse(data);
  } catch (err: any) {
    console.error('Error reading file:', err.message);
    return defaultValue as T;
  }
}

export const saveJsonToFileSync = (filePath: string, data: any, folderPath = DEFAULT_RESULTS_FOLDER_PATH): void => {
  try {
    checkIfFolderExists(folderPath);
    const fpath = path.join(folderPath, filePath);
    fs.writeFileSync(fpath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err: any) {
    console.error('Error writing file:', err.message);
  }
}

export const saveJsonToFileAsync = async <T = any>(filePath: string, data: T, folderPath = DEFAULT_RESULTS_FOLDER_PATH): Promise<void> => {
  try {
    checkIfFolderExists(folderPath);
    const fpath = path.join(folderPath, filePath);
    await fs.promises.writeFile(fpath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err: any) {
    console.error('Error writing file:', err.message);
  }
}

export const pushToJsonArrayFromFileAsync = async <T = any>(result: T[], fileP: string, folderPath = DEFAULT_RESULTS_FOLDER_PATH): Promise<void> => {  
  checkIfFolderExists(folderPath);
  let resultsArray: T[] = [];
  const fpath = path.join(folderPath, fileP);
  // Check if the file exists
  if (fs.existsSync(fpath)) {
    // Read existing data
    const existingData = await fs.promises.readFile(fpath, 'utf8');
    if (existingData) {
      resultsArray = JSON.parse(existingData);
    }
  }
  resultsArray.push(...result);

  await fs.promises.writeFile(fpath, JSON.stringify(resultsArray, null, 2), 'utf8');
};

// Read and write files asynchronously
// Text
export async function readFileAsync(filename: string, folderPath = DEFAULT_RESULTS_FOLDER_PATH): Promise<any> {
  checkIfFolderExists(folderPath);
  const filePath = path.join(folderPath, filename);
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return data;
  } catch (err) {
    console.error('Error reading file:', err);
  }
}

export async function writeFileAsync(filename: string, string: any, folderPath = DEFAULT_RESULTS_FOLDER_PATH): Promise<void> {
  checkIfFolderExists(folderPath);
  const filePath = path.join(folderPath, filename);
  try {
    await fs.promises.writeFile(filePath, string, 'utf8');
    console.log('File written successfully.');
  } catch (err) {
    console.error('Error writing file:', err);
  }
}

async function checkIfFolderExists(folderPath: string): Promise<void> {
  // Check if the folder exists, if not, create it
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

export async function saveCsvToFileAsync(fileName: string, data: Record<string, any>[], folderPath: string): Promise<void> {
  const filePath = path.join(folderPath, fileName);
  
  // Extract headers from the first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    headers.join(','), // CSV header row
    ...data.map(row => headers.map(header => row[header]).join(',')) // CSV data rows
  ].join('\n');

  try {
    await fs.promises.writeFile(filePath, csvContent, 'utf8');
    console.log(`CSV file saved successfully: ${filePath}`);
  } catch (error) {
    console.error('Error saving CSV file:', error);
    throw error;
  }
}