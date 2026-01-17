import { processFighterData } from './utils/processFighters';
import { writeFileSync, copyFileSync, existsSync } from 'fs';

// 
// Automatically copies required files from python/results before processing
// 
// Run from project root: npm run process
// Or: npx ts-node src/index.ts (from project root)

// Copy files from python/results to data directory
const sourceFinalValues = './python/results/final_values.csv';
const sourceFightHistory = './python/results/fight_history.csv';
const destFinalValues = './data/final_values.csv';
const destFightHistory = './data/fights.csv';

console.log('Copying files from python/results...');

if (!existsSync(sourceFinalValues)) {
    throw new Error(`Source file not found: ${sourceFinalValues}`);
}
if (!existsSync(sourceFightHistory)) {
    throw new Error(`Source file not found: ${sourceFightHistory}`);
}

copyFileSync(sourceFinalValues, destFinalValues);
console.log(`✓ Copied ${sourceFinalValues} → ${destFinalValues}`);

copyFileSync(sourceFightHistory, destFightHistory);
console.log(`✓ Copied ${sourceFightHistory} → ${destFightHistory}`);

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