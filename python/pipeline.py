# this pipeline doesn't work yet, follow these steps:
# 
# 
#  add_new_fights.py
# remove_duplicates.py
# process_matches.py
# aggregate_values.py
# get_fighter_values.py # we need to get api key from real 

# load files into root data folder and then run index.ts in our fe

import subprocess
import os
import sys
from pathlib import Path

def run_script(script_name):
    """Run a Python script and check for errors."""
    print(f"\n{'='*50}")
    print(f"Running {script_name}...")
    print(f"{'='*50}\n")
    
    # Get the directory of the current script
    current_dir = Path(__file__).parent
    script_path = current_dir / "scripts" / script_name
    
    try:
        # Run the script and capture output
        result = subprocess.run([sys.executable, str(script_path)], 
                              check=True,
                              capture_output=True,
                              text=True)
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running {script_name}:")
        print(f"Exit code: {e.returncode}")
        print(f"Output: {e.output}")
        print(f"Error: {e.stderr}")
        return False

def main():
    # List of scripts to run in order
    scripts = [
        # "add_new_fights.py",
        # "remove_duplicates.py",
        "process_matches.py",
        "aggregate_values.py",
        "get_fighter_values.py"
    ]
    
    # Run each script in sequence
    for script in scripts:
        success = run_script(script)
        if not success:
            print(f"\nPipeline failed at {script}")
            sys.exit(1)
    
    print("\nPipeline completed successfully!")

if __name__ == "__main__":
    main()
