import json
import asyncio
import subprocess
import os
import sys
import time

async def test_server(name, config):
    print(f"[{name}] Testing...")
    command = config.get("command")
    args = config.get("args", [])
    env = config.get("env", {})
    
    # Merge existing environment variables
    # Add dummy keys so servers that immediately check env won't crash before starting
    run_env = os.environ.copy()
    for k, v in env.items():
        run_env[k] = v
        # Also provide a default dummy just in case the config has empty values
        if not run_env[k]:
            run_env[k] = "dummy_key"
            
    # For Node.js packages running via npx, we force YES to prompts
    if command == "npx" and "-y" not in args:
        args.insert(0, "-y")
        
    # Windows executable resolution
    if sys.platform == 'win32':
        if command == "npx":
            command = "npx.cmd"
        elif command == "uvx":
            command = "uvx.exe"
        
    start_time = time.time()
    try:
        # Start the process
        # We need shell=True on Windows if the command is 'npx' or 'uvx' and they are .cmd files
        cmd_list = [command] + args
        process = await asyncio.create_subprocess_exec(
            *cmd_list,
            env=run_env,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        # Wait up to 15 seconds to see if it stays alive
        try:
            # We just wait for a timeout. If it exits before, it threw an error
            await asyncio.wait_for(process.wait(), timeout=15)
            # If it exits on its own within 15s, it might have crashed.
            stdout, stderr = await process.communicate()
            if process.returncode != 0:
                print(f"[{name}] FAILING (Exit {process.returncode})")
                return {"name": name, "status": "FAILING", "error": stderr.decode(errors='ignore').strip()[-200:]}
            else:
                return {"name": name, "status": "RUNNING (Exited 0)", "error": ""}
        except asyncio.TimeoutError:
            # If it's still running after 15s, it's alive and listening on stdio
            print(f"[{name}] RUNNING")
            try:
                process.terminate()
            except:
                pass
            return {"name": name, "status": "RUNNING", "error": ""}
    except Exception as e:
        print(f"[{name}] FAILING (Exception: {str(e)})")
        return {"name": name, "status": "FAILING", "error": str(e)}

async def main():
    config_path = "mcp_config.json"
    if not os.path.exists(config_path):
        print(f"Config file {config_path} not found.")
        sys.exit(1)
        
    with open(config_path, "r") as f:
        data = json.load(f)
        
    servers = data.get("mcpServers", {})
    results = []
    
    # Run tests concurrently in small batches
    batch_size = 5
    items = list(servers.items())
    
    for i in range(0, len(items), batch_size):
        batch = items[i:i+batch_size]
        tasks = [test_server(name, cfg) for name, cfg in batch]
        res = await asyncio.gather(*tasks)
        results.extend(res)
        
    # Write report
    report_content = "# MCP Servers Validation Report\n\n"
    report_content += "| Server | Status | Details |\n"
    report_content += "|--------|--------|---------|\n"
    
    running = 0
    failing = 0
    
    for r in results:
        status = r['status']
        err = r['error'].replace('\n', ' ')
        err = err[:100] + '...' if len(err) > 100 else err
        if "FAILING" in status:
            failing += 1
            report_content += f"| **{r['name']}** | ❌ {status} | `{err}` |\n"
        else:
            running += 1
            report_content += f"| **{r['name']}** | ✅ {status} | - |\n"
            
    report_content += f"\n**Summary:** {running} Running, {failing} Failing.\n"
    
    with open("analysis_report.md", "w", encoding="utf-8") as f:
        f.write(report_content)
        
    print("\nValidation complete. Report written to analysis_report.md")

if __name__ == "__main__":
    # Ensure Windows handles subprocesses correctly
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    asyncio.run(main())
