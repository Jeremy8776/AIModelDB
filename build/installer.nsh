!macro customInit
  ; Check if already installed (Standard uninstall key)
  ReadRegStr $R0 SHCTX "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" "UninstallString"
  ${If} $R0 != ""
    ; Silently uninstall previous version for seamless update
    ; Copy uninstaller to temp to avoid file locking issues
    CopyFiles "$R0" "$PLUGINSDIR\uninstaller.exe"
    ExecWait '"$PLUGINSDIR\uninstaller.exe" /S _?=$INSTDIR'
  ${EndIf}
!macroend
