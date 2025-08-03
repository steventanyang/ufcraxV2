import { processFighterData } from './utils/processFighters';
import { writeFileSync } from 'fs';


// 
// first update the data file by copying the final_values from python/results into the root level data, and then copying the 
// fight_history from python/results into the root level data file called fights.csv
// 
// npx ts-node src/index.ts

const valueFilePath = './data/final_values.csv';
const historyFilePath = './data/fights.csv';

try {
    const fighterData = processFighterData(valueFilePath, historyFilePath);
    
    // Write to JSON file
    writeFileSync(
        './public/data/processed_fighters.json',
        JSON.stringify(fighterData, null, 2)
    );

    console.log('Fighter data processed successfully!');
} catch (error) {
    console.error('Error processing fighter data:', error);
} 