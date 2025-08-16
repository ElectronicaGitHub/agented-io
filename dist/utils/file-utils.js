"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushToJsonArrayFromFileAsync = exports.saveJsonToFileAsync = exports.saveJsonToFileSync = exports.getJsonFromFileAsync = exports.getJsonFromFileSync = void 0;
exports.readFileAsync = readFileAsync;
exports.writeFileAsync = writeFileAsync;
exports.saveCsvToFileAsync = saveCsvToFileAsync;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const DEFAULT_RESULTS_FOLDER_PATH = './results';
const getJsonFromFileSync = (filePath, defaultValue = {}, folderPath = DEFAULT_RESULTS_FOLDER_PATH) => {
    try {
        checkIfFolderExists(folderPath);
        const fpath = path_1.default.join(folderPath, filePath);
        const data = fs_1.default.readFileSync(fpath, 'utf8');
        return JSON.parse(data);
    }
    catch (err) {
        console.error('Error reading file:', err.message);
        return defaultValue;
    }
};
exports.getJsonFromFileSync = getJsonFromFileSync;
const getJsonFromFileAsync = async (filePath, defaultValue = {}, folderPath = DEFAULT_RESULTS_FOLDER_PATH) => {
    try {
        checkIfFolderExists(folderPath);
        const fpath = path_1.default.join(folderPath, filePath);
        const data = await fs_1.default.promises.readFile(fpath, 'utf8');
        return JSON.parse(data);
    }
    catch (err) {
        console.error('Error reading file:', err.message);
        return defaultValue;
    }
};
exports.getJsonFromFileAsync = getJsonFromFileAsync;
const saveJsonToFileSync = (filePath, data, folderPath = DEFAULT_RESULTS_FOLDER_PATH) => {
    try {
        checkIfFolderExists(folderPath);
        const fpath = path_1.default.join(folderPath, filePath);
        fs_1.default.writeFileSync(fpath, JSON.stringify(data, null, 2), 'utf8');
    }
    catch (err) {
        console.error('Error writing file:', err.message);
    }
};
exports.saveJsonToFileSync = saveJsonToFileSync;
const saveJsonToFileAsync = async (filePath, data, folderPath = DEFAULT_RESULTS_FOLDER_PATH) => {
    try {
        checkIfFolderExists(folderPath);
        const fpath = path_1.default.join(folderPath, filePath);
        await fs_1.default.promises.writeFile(fpath, JSON.stringify(data, null, 2), 'utf8');
    }
    catch (err) {
        console.error('Error writing file:', err.message);
    }
};
exports.saveJsonToFileAsync = saveJsonToFileAsync;
const pushToJsonArrayFromFileAsync = async (result, fileP, folderPath = DEFAULT_RESULTS_FOLDER_PATH) => {
    checkIfFolderExists(folderPath);
    let resultsArray = [];
    const fpath = path_1.default.join(folderPath, fileP);
    // Check if the file exists
    if (fs_1.default.existsSync(fpath)) {
        // Read existing data
        const existingData = await fs_1.default.promises.readFile(fpath, 'utf8');
        if (existingData) {
            resultsArray = JSON.parse(existingData);
        }
    }
    resultsArray.push(...result);
    await fs_1.default.promises.writeFile(fpath, JSON.stringify(resultsArray, null, 2), 'utf8');
};
exports.pushToJsonArrayFromFileAsync = pushToJsonArrayFromFileAsync;
// Read and write files asynchronously
// Text
async function readFileAsync(filename, folderPath = DEFAULT_RESULTS_FOLDER_PATH) {
    checkIfFolderExists(folderPath);
    const filePath = path_1.default.join(folderPath, filename);
    try {
        const data = await fs_1.default.promises.readFile(filePath, 'utf8');
        return data;
    }
    catch (err) {
        console.error('Error reading file:', err);
    }
}
async function writeFileAsync(filename, string, folderPath = DEFAULT_RESULTS_FOLDER_PATH) {
    checkIfFolderExists(folderPath);
    const filePath = path_1.default.join(folderPath, filename);
    try {
        await fs_1.default.promises.writeFile(filePath, string, 'utf8');
        console.log('File written successfully.');
    }
    catch (err) {
        console.error('Error writing file:', err);
    }
}
async function checkIfFolderExists(folderPath) {
    // Check if the folder exists, if not, create it
    if (!fs_1.default.existsSync(folderPath)) {
        fs_1.default.mkdirSync(folderPath, { recursive: true });
    }
}
async function saveCsvToFileAsync(fileName, data, folderPath) {
    const filePath = path_1.default.join(folderPath, fileName);
    // Extract headers from the first object
    const headers = Object.keys(data[0]);
    // Create CSV content
    const csvContent = [
        headers.join(','), // CSV header row
        ...data.map(row => headers.map(header => row[header]).join(',')) // CSV data rows
    ].join('\n');
    try {
        await fs_1.default.promises.writeFile(filePath, csvContent, 'utf8');
        console.log(`CSV file saved successfully: ${filePath}`);
    }
    catch (error) {
        console.error('Error saving CSV file:', error);
        throw error;
    }
}
