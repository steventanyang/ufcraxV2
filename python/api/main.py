import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import AsyncGenerator

from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.pipeline_runner import PipelineRunner, pipeline_status

app = FastAPI(title="UFC Rax Pipeline")
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

class PipelineRequest(BaseModel):
    token: str
    stages: list[str] = ["add_fights", "remove_duplicates", "process_matches", "aggregate", "get_values"]
    full_refresh: bool = True


@app.get("/", response_class=HTMLResponse)
@app.get("/update", response_class=HTMLResponse)
async def update_page(request: Request):
    return templates.TemplateResponse("update.html", {"request": request})


@app.post("/api/run-pipeline")
async def run_pipeline(req: PipelineRequest, background_tasks: BackgroundTasks):
    if pipeline_status["running"]:
        return {"error": "Pipeline already running", "status": "busy"}
    
    runner = PipelineRunner(token=req.token)
    background_tasks.add_task(runner.run, req.stages, req.full_refresh)
    
    return {"status": "started", "stages": req.stages}


@app.get("/api/status")
async def get_status():
    return pipeline_status


@app.get("/api/stream")
async def stream_logs() -> StreamingResponse:
    async def event_generator() -> AsyncGenerator[str, None]:
        last_log_index = 0
        
        while True:
            # Send current status
            data = {
                "running": pipeline_status["running"],
                "current_stage": pipeline_status["current_stage"],
                "progress": pipeline_status["progress"],
                "error": pipeline_status["error"],
                "logs": pipeline_status["logs"][last_log_index:],
            }
            last_log_index = len(pipeline_status["logs"])
            
            yield f"data: {json.dumps(data)}\n\n"
            
            if not pipeline_status["running"] and last_log_index == len(pipeline_status["logs"]):
                # Pipeline finished and all logs sent
                await asyncio.sleep(0.5)
                yield f"data: {json.dumps({'done': True})}\n\n"
                break
            
            await asyncio.sleep(0.3)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.post("/api/cancel")
async def cancel_pipeline():
    if pipeline_status["running"]:
        pipeline_status["cancelled"] = True
        return {"status": "cancelling"}
    return {"status": "not_running"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
