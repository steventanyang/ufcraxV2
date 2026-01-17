import asyncio
import sys
import json
import re
from pathlib import Path
from datetime import datetime
from typing import Callable, Optional

# Global status object for SSE streaming
pipeline_status = {
    "running": False,
    "current_stage": None,
    "progress": 0,
    "error": None,
    "logs": [],
    "cancelled": False,
    "started_at": None,
    "finished_at": None,
}

# Global reference to current process for cancellation
current_process: Optional[asyncio.subprocess.Process] = None


def reset_status():
    pipeline_status["running"] = False
    pipeline_status["current_stage"] = None
    pipeline_status["progress"] = 0
    pipeline_status["error"] = None
    pipeline_status["logs"] = []
    pipeline_status["cancelled"] = False
    pipeline_status["started_at"] = None
    pipeline_status["finished_at"] = None


def log(message: str):
    timestamp = datetime.now().strftime("%H:%M:%S")
    entry = f"[{timestamp}] {message}"
    pipeline_status["logs"].append(entry)
    print(entry)


class PipelineRunner:
    def __init__(self, token: str):
        self.token = token
        self.scripts_dir = Path(__file__).parent.parent / "scripts"
        self.results_dir = Path(__file__).parent.parent / "results"
        
    async def run(self, stages: list[str], full_refresh: bool = True):
        global current_process
        reset_status()
        pipeline_status["running"] = True
        pipeline_status["started_at"] = datetime.now().isoformat()
        
        stage_map = {
            "add_fights": ("add_new_fights.py", "Adding new fights", 10),
            "remove_duplicates": ("remove_duplicates.py", "Removing duplicates", 2),
            "process_matches": ("process_matches_fast.py", "Processing matches (optimized)", 50),
            "aggregate": ("aggregate_values.py", "Aggregating values", 3),
            "get_values": ("get_fighter_values.py", "Fetching fighter values from API", 30),
        }
        
        # Calculate progress weights
        total_weight = sum(stage_map[s][2] for s in stages if s in stage_map)
        
        try:
            cumulative_progress = 0
            for i, stage_key in enumerate(stages):
                if pipeline_status["cancelled"]:
                    log("Pipeline cancelled by user")
                    pipeline_status["current_stage"] = "Cancelled"
                    break
                
                if stage_key not in stage_map:
                    log(f"Unknown stage: {stage_key}, skipping")
                    continue
                
                script_name, description, weight = stage_map[stage_key]
                pipeline_status["current_stage"] = description
                
                # Calculate base progress for this stage
                base_progress = int((cumulative_progress / total_weight) * 95)
                stage_weight = (weight / total_weight) * 95
                pipeline_status["progress"] = base_progress
                
                log(f"Starting: {description}")
                
                # Special handling for get_values - needs token
                if stage_key == "get_values":
                    success = await self._run_get_values(base_progress, stage_weight)
                else:
                    success = await self._run_script(script_name, base_progress, stage_weight)
                
                if pipeline_status["cancelled"]:
                    log("Pipeline cancelled by user")
                    pipeline_status["current_stage"] = "Cancelled"
                    break
                
                if not success:
                    pipeline_status["error"] = f"Failed at stage: {description}"
                    log(f"ERROR: {description} failed")
                    break
                
                cumulative_progress += weight
                log(f"Completed: {description}")
            
            # Run frontend processing
            if not pipeline_status["cancelled"] and not pipeline_status["error"]:
                pipeline_status["current_stage"] = "Running frontend data processing"
                pipeline_status["progress"] = 95
                log("Running npm run process...")
                success = await self._run_npm_process()
                if success:
                    log("Frontend data processing complete")
                else:
                    log("Warning: Frontend processing failed (non-critical)")
            
            pipeline_status["progress"] = 100
            log("Pipeline finished!")
            
        except Exception as e:
            pipeline_status["error"] = str(e)
            log(f"ERROR: {str(e)}")
        finally:
            pipeline_status["running"] = False
            pipeline_status["finished_at"] = datetime.now().isoformat()
            pipeline_status["current_stage"] = "Complete" if not pipeline_status["error"] else "Failed"
    
    async def _run_script(self, script_name: str, base_progress: int = 0, stage_weight: float = 100) -> bool:
        global current_process
        script_path = self.scripts_dir / script_name
        
        if not script_path.exists():
            log(f"Script not found: {script_path}")
            return False
        
        try:
            process = await asyncio.create_subprocess_exec(
                sys.executable, str(script_path),
                cwd=str(self.scripts_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
            current_process = process
            
            while True:
                if pipeline_status["cancelled"]:
                    process.terminate()
                    await process.wait()
                    current_process = None
                    return False
                
                try:
                    line = await asyncio.wait_for(process.stdout.readline(), timeout=0.5)
                except asyncio.TimeoutError:
                    continue
                    
                if not line:
                    break
                decoded = line.decode().strip()
                if decoded:
                    # Parse progress from script output like "Progress: 500/11000 (4.5%)"
                    progress_match = re.search(r'\((\d+\.?\d*)%\)', decoded)
                    if progress_match:
                        script_progress = float(progress_match.group(1))
                        pipeline_status["progress"] = base_progress + int(script_progress * stage_weight / 100)
                    
                    # Filter verbose debug output
                    if not decoded.startswith("Debug:") and not decoded.startswith("---"):
                        log(decoded)
            
            await process.wait()
            current_process = None
            return process.returncode == 0
            
        except Exception as e:
            current_process = None
            log(f"Error running {script_name}: {str(e)}")
            return False
    
    async def _run_get_values(self, base_progress: int = 0, stage_weight: float = 100) -> bool:
        """Run get_fighter_values.py with the provided token."""
        config_path = self.scripts_dir / "config.py"
        
        try:
            with open(config_path, 'r') as f:
                config_content = f.read()
            
            new_content = re.sub(
                r"'real-request-token': '[^']*'",
                f"'real-request-token': '{self.token}'",
                config_content
            )
            
            with open(config_path, 'w') as f:
                f.write(new_content)
            
            log("Updated API token in config")
            
            return await self._run_script("get_fighter_values.py", base_progress, stage_weight)
            
        except Exception as e:
            log(f"Error updating config: {str(e)}")
            return False
    
    async def _run_npm_process(self) -> bool:
        """Run npx ts-node src/index.ts in the frontend directory."""
        frontend_dir = Path(__file__).parent.parent.parent
        
        try:
            process = await asyncio.create_subprocess_exec(
                "npx", "ts-node", "src/index.ts",
                cwd=str(frontend_dir),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.STDOUT,
            )
            
            while True:
                line = await process.stdout.readline()
                if not line:
                    break
                decoded = line.decode().strip()
                if decoded:
                    log(decoded)
            
            await process.wait()
            return process.returncode == 0
            
        except Exception as e:
            log(f"Error running npm process: {str(e)}")
            return False
