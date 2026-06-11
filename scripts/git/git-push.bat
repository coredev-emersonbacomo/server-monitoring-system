@echo off
setlocal enabledelayedexpansion

:: Initialize variables
set REPO_URL=
set AMEND_FLAG=false
set FORCE_PUSH=false
set PUSH_ONLY=false

:: Loop through all parameters
echo ARGS: %*
for %%a in (%*) do (
    set "arg=%%a"

    :: Detect repo URL
    echo !arg! | findstr /i /b "https http git@" >nul
    if !errorlevel! equ 0 (
        set REPO_URL=!arg!
    )

    :: Amend (implies force push)
    if /i "!arg!"=="--amend" (
        set AMEND_FLAG=true
        set FORCE_PUSH=true
    )
    if /i "!arg!"=="amend" (
        set AMEND_FLAG=true
        set FORCE_PUSH=true
    )

    :: Force push only
    if /i "!arg!"=="--force" (
        set FORCE_PUSH=true
    )

    if /i "!arg!"=="force" (
        set FORCE_PUSH=true
    )

    :: Push only (no commit/add)
    if /i "!arg!"=="--push-only" (
        set PUSH_ONLY=true
    )

    :: Push only (no commit/add)
    if /i "!arg!"=="push-only" (
        set PUSH_ONLY=true
    )
)

:: --- Initial Setup ---
if not "!REPO_URL!"=="" (
    git init
    git branch -M main
    git remote add origin !REPO_URL!
)

:: User Identity
git config user.email "user@example.com"
git config user.name "user"
git config --global core.editor "code --wait"

:: Ensure main branch
git branch -M main


:: =========================================================
:: COMMIT LOGIC (skipped if push-only)
:: =========================================================

if "!PUSH_ONLY!"=="false" (

    :: Stage changes
    git add .

    :: Check staged changes
    git diff --cached --quiet
    set "HAS_STAGED_CHANGES=!errorlevel!"
    echo HAS_STAGED_CHANGES: !HAS_STAGED_CHANGES!

    :: Commit command setup
    set "COMMIT_CMD=git commit"
    set "AMEND_NO_EDIT=false"

    if "!AMEND_FLAG!"=="true" (
        echo Amending last commit...
        set "COMMIT_CMD=git commit --amend"
        set "AMEND_NO_EDIT=true"
    )

    :: Check commit message file
    set "USE_FILE_MSG=false"
    if exist "%~dp0git-commit-message.txt" (
        set "MSG_SIZE=0"
        for %%I in ("%~dp0git-commit-message.txt") do set "MSG_SIZE=%%~zI"
        if !MSG_SIZE! gtr 0 (
            set "USE_FILE_MSG=true"
        )
    )

    if "!USE_FILE_MSG!"=="true" (
        copy /y "%~dp0git-commit-message.txt" "%~dp0git-commit-message.txt.bak" >nul
        type nul > "%~dp0git-commit-message.txt"
        git add "%~dp0git-commit-message.txt"

        !COMMIT_CMD! -F "%~dp0git-commit-message.txt.bak"

        if !errorlevel! neq 0 (
            copy /y "%~dp0git-commit-message.txt.bak" "%~dp0git-commit-message.txt" >nul
            echo Commit failed. Message restored.
            exit /b !errorlevel!
        )

        del /q "%~dp0git-commit-message.txt.bak" 2>nul

    ) else (
        if "!AMEND_NO_EDIT!"=="true" (
            git commit --amend --no-edit
        ) else if !HAS_STAGED_CHANGES! neq 0 (
            git commit
            if !errorlevel! neq 0 exit /b !errorlevel!
        ) else (
            echo No staged changes to commit.
        )
    )
)

:: =========================================================
:: PUSH LOGIC
:: =========================================================

if not "!REPO_URL!"=="" (
    git push -u origin main
) else (
    if "!FORCE_PUSH!"=="true" (
        git push --force origin main
    ) else (
        git push origin main
    )
)

if !errorlevel! neq 0 (
    echo Push failed.
    exit /b !errorlevel!
)

endlocal