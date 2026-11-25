@echo off
REM ═══════════════════════════════════════════════════
REM  Logistic API — Docker Test Runner
REM ═══════════════════════════════════════════════════
REM  Usage:
REM    run-tests.bat          Build, start, test, and stop
REM    run-tests.bat down     Tear down containers + volumes
REM ═══════════════════════════════════════════════════

IF "%1"=="down" (
    echo 🧹 Tearing down containers and volumes...
    docker compose down -v --remove-orphans
    exit /b 0
)

echo.
echo ════════════════════════════════════════════════
echo  🐳  Building and starting services...
echo ════════════════════════════════════════════════
echo.

docker compose up --build --abort-on-container-exit --exit-code-from test

SET EXIT_CODE=%ERRORLEVEL%

echo.
echo ════════════════════════════════════════════════
echo  🧹  Stopping services...
echo ════════════════════════════════════════════════
echo.

docker compose down -v --remove-orphans

IF %EXIT_CODE% EQU 0 (
    echo.
    echo ✅ All API endpoint validations PASSED!
) ELSE (
    echo.
    echo ❌ Some validations FAILED. See output above.
)

exit /b %EXIT_CODE%
