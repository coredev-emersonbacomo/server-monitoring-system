package main

import (
	"os/exec"
	"strings"
	"time"
)

func executeCommand(cmd AgentCommand) CommandResult {
	result := CommandResult{
		CommandId: cmd.Id,
		Status:    "completed",
	}

	start := time.Now()

	switch cmd.Type {
	case "shell":
		cmdStr, _ := cmd.Payload["command"].(string)
		if cmdStr == "" {
			result.Output = ""
		} else {
			var shell, flag string
			shell = "sh"
			flag = "-c"
			out, err := exec.Command(shell, flag, cmdStr).CombinedOutput()
			output := strings.TrimSpace(string(out))
			if err != nil {
				result.Error = err.Error()
				result.Output = output
				result.Status = "failed"
			} else {
				result.Output = output
			}
		}
	case "update_config":
		result.Output = "Configuration update acknowledged"
	default:
		result.Output = "Command type not supported: " + cmd.Type
	}

	result.ExecutionTimeMs = int(time.Since(start).Milliseconds())
	return result
}
