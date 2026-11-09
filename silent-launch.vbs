Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

projectDir = "C:\Users\syeds\.gemini\antigravity\scratch\timeblock-hud"
releaseExe = projectDir & "\src-tauri\target\release\timeblock-hud.exe"
debugExe = projectDir & "\src-tauri\target\debug\timeblock-hud.exe"

If fso.FileExists(releaseExe) Then
    WshShell.Run """" & releaseExe & """", 0, False
ElseIf fso.FileExists(debugExe) Then
    WshShell.Run """" & debugExe & """", 0, False
Else
    WshShell.CurrentDirectory = projectDir
    WshShell.Run "cmd.exe /c npx.cmd tauri dev", 0, False
End If
