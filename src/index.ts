import { processFighterData } from './utils/processFighters';
import { writeFileSync } from 'fs';

const valueFilePath = './data/final_values.csv';
const historyFilePath = './data/fights.csv';

try {
    const fighterData = processFighterData(valueFilePath, historyFilePath);
    
    // Write to JSON file
    writeFileSync(
        './data/processed_fighters.json',
        JSON.stringify(fighterData, null, 2)
    );

    console.log('Fighter data processed successfully!');
} catch (error) {
    console.error('Error processing fighter data:', error);
} 