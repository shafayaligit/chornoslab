# Registers ChronoSlab 3D HUD in Windows Startup so it loads automatically on PC boot
$startupDir = [Environment]::GetFolderPath('Startup')
$vbsSource = "C:\Users\syeds\.gemini\antigravity\scratch\timeblock-hud\silent-launch.vbs"
$startupTarget = Join-Path $startupDir "ChronoSlab-HUD.vbs"

Copy-Item -Path $vbsSource -Destination $startupTarget -Force
Write-Host "ChronoSlab 3D HUD installed to Windows Startup: $startupTarget" -ForegroundColor Green
